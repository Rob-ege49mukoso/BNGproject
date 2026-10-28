import { createSupabaseContext } from "npm:@supabase/server";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PROVIDERS = {
  groq: { defaultModel: "llama-3.3-70b-versatile", env: ["GROQ_API_KEY"] },
  gemini: { defaultModel: "gemini-2.5-flash", env: ["GEMINI_API_KEY", "GOOGLE_API_KEY"] },
} as const;
type ProviderName = keyof typeof PROVIDERS;
const FALLBACK: Record<ProviderName, ProviderName> = { groq: "gemini", gemini: "groq" };
const TIMEOUT_MS = 25_000;
const RESERVATION_TTL_SECONDS = 120;

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function validModel(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{1,160}$/.test(value);
}
function isProvider(value: unknown): value is ProviderName {
  return value === "groq" || value === "gemini";
}
function isTemporaryStatus(status: number) {
  return status === 429 || (status >= 500 && status <= 599);
}
class ProviderFailure extends Error {
  constructor(message: string, readonly retryable: boolean, readonly status?: number) { super(message); }
}
type ProviderResult = { answer: string; usage: Record<string, unknown> };

async function callProvider(provider: ProviderName, model: string, prompt: string, temperature: number): Promise<ProviderResult> {
  const config = PROVIDERS[provider];
  const key = config.env.map((name) => Deno.env.get(name)).find(Boolean);
  if (!key) throw new ProviderFailure(`La configuration du modèle ${model} est indisponible.`, false);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let url: string;
    let headers: Record<string, string>;
    let payload: unknown;
    if (provider === "groq") {
      url = "https://api.groq.com/openai/v1/chat/completions";
      headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
      payload = { model, messages: [{ role: "user", content: prompt }], temperature };
    } else {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      headers = { "Content-Type": "application/json" };
      payload = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature } };
    }

    let response: Response;
    try {
      response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) throw new ProviderFailure("Le délai de réponse du modèle est dépassé.", true);
      throw new ProviderFailure("Connexion temporairement impossible au modèle.", true);
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const retryable = isTemporaryStatus(response.status);
      throw new ProviderFailure(
        retryable ? `Le modèle est temporairement indisponible (HTTP ${response.status}).` : `La requête au modèle a été refusée (HTTP ${response.status}).`,
        retryable, response.status
      );
    }
    const answer = provider === "groq"
      ? result?.choices?.[0]?.message?.content ?? ""
      : (result?.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text ?? "").join("");
    if (typeof answer !== "string" || !answer.trim()) throw new ProviderFailure("Le modèle n'a retourné aucun texte utilisable.", true);
    return { answer, usage: result?.usage ?? result?.usageMetadata ?? {} };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Méthode non autorisée. Utilise POST." }, 405);

  const { data: ctx, error: authError } = await createSupabaseContext(req, { auth: "user" });
  if (authError || !ctx?.userClaims?.id) return respond({ error: "Session invalide ou expirée." }, authError?.status ?? 401);

  let body: { prompt?: unknown; provider?: unknown; model?: unknown; temperature?: unknown };
  try { body = await req.json(); } catch { return respond({ error: "Corps JSON invalide." }, 400); }
  if (typeof body.prompt !== "string" || !body.prompt.trim()) return respond({ error: "Le champ prompt est obligatoire." }, 400);
  if (body.prompt.length > 12000) return respond({ error: "Prompt trop long (maximum 12000 caractères)." }, 413);

  const requestedProvider: ProviderName = isProvider(body.provider) ? body.provider : "groq";
  if (body.provider !== undefined && !isProvider(body.provider)) return respond({ error: "Modèle non pris en charge." }, 400);
  const requestedModel = body.model === undefined ? PROVIDERS[requestedProvider].defaultModel : body.model;
  if (!validModel(requestedModel)) return respond({ error: "Identifiant de modèle invalide." }, 400);
  const temperature = typeof body.temperature === "number" ? Math.min(1.5, Math.max(0, body.temperature)) : 0.7;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!supabaseUrl || !secretKeysRaw) return respond({ error: "Configuration serveur Supabase incomplète." }, 500);
  let adminKey = "";
  try {
    const keys = JSON.parse(secretKeysRaw);
    adminKey = keys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  } catch { adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""; }
  if (!adminKey) return respond({ error: "Clé serveur Supabase indisponible." }, 500);

  const admin = createClient(supabaseUrl, adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const userId = ctx.userClaims.id as string;
  const now = new Date();
  let reservationId: string | null = null;
  try {
    const { data: subscription, error: subError } = await admin.from("subscriptions")
      .select("plan_code,status,current_period_end").eq("user_id", userId).eq("status", "active")
      .gt("current_period_end", now.toISOString()).order("current_period_end", { ascending: false }).limit(1).maybeSingle();
    if (subError) return respond({ error: "Impossible de vérifier l'abonnement." }, 500);
    const planCode = subscription?.plan_code ?? "free";
    const { data: plan, error: planError } = await admin.from("subscription_plans").select("daily_limits").eq("code", planCode).maybeSingle();
    if (planError) return respond({ error: "Impossible de vérifier le forfait." }, 500);
    const dailyLimit = Number(plan?.daily_limits?.requests ?? 100);
    const { data: reservationRows, error: reserveError } = await admin.rpc("reserve_ai_quota", {
      p_user_id: userId, p_daily_limit: dailyLimit, p_plan_code: planCode, p_ttl_seconds: RESERVATION_TTL_SECONDS,
    });
    if (reserveError || !reservationRows?.[0]) {
      console.error("AI quota reservation failed", reserveError?.message ?? "empty reservation result");
      return respond({ error: "Le service de quota est indisponible. Réessaie plus tard.", code: "QUOTA_SERVICE_UNAVAILABLE" }, 503);
    }
    const reservation = reservationRows[0];
    if (!reservation.allowed) {
      return respond({ error: "Quota journalier atteint.", code: "DAILY_QUOTA_EXCEEDED", plan: planCode, limit: dailyLimit, used: reservation.used }, 429);
    }
    reservationId = reservation.reservation_id;

    let actualProvider = requestedProvider;
    let actualModel = requestedModel;
    let result: ProviderResult;
    let fallbackUsed = false;
    try {
      result = await callProvider(actualProvider, actualModel, body.prompt, temperature);
    } catch (error) {
      if (!(error instanceof ProviderFailure) || !error.retryable) throw error;
      actualProvider = FALLBACK[requestedProvider];
      actualModel = PROVIDERS[actualProvider].defaultModel;
      fallbackUsed = true;
      result = await callProvider(actualProvider, actualModel, body.prompt, temperature);
    }

    const { data: finalized, error: finalizeError } = await admin.rpc("finalize_ai_quota", {
      p_reservation_id: reservationId, p_user_id: userId, p_provider: actualProvider,
      p_model: actualModel, p_plan_code: planCode, p_usage: result.usage,
    });
    if (finalizeError || finalized !== true) {
      console.error("AI quota finalization failed", finalizeError?.message ?? "reservation expired");
      await admin.rpc("release_ai_quota", { p_reservation_id: reservationId, p_user_id: userId });
      reservationId = null;
      return respond({ error: "Impossible de confirmer le quota. Réessaie plus tard.", code: "QUOTA_FINALIZATION_FAILED" }, 503);
    }
    reservationId = null;

    return respond({
      success: true, provider: actualProvider, model: actualModel, answer: result.answer, usage: result.usage,
      fallback_used: fallbackUsed,
      quota: {
        plan: planCode, limit: dailyLimit, used: Number(reservation.used),
        remaining: Math.max(0, dailyLimit - Number(reservation.used)),
        reset_at: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString(),
      },
    });
  } catch (error) {
    if (reservationId) {
      const { error: releaseError } = await admin.rpc("release_ai_quota", { p_reservation_id: reservationId, p_user_id: userId });
      if (releaseError) console.error("AI quota release failed", releaseError.message);
    }
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    const status = error instanceof ProviderFailure && error.status ? error.status : 502;
    return respond({ error: message, code: error instanceof ProviderFailure ? "MODEL_REQUEST_FAILED" : "AI_GATEWAY_ERROR" }, status);
  }
});
