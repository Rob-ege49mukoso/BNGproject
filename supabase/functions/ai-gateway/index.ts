
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

type Provider = "gemini" | "groq";

class ProviderError extends Error {
  constructor(
    message: string,
    public status: number,
    public temporary: boolean,
  ) {
    super(message);
  }
}

function getPublishableKey(): string | null {
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");

  if (keys) {
    try {
      const parsed = JSON.parse(keys);
      if (parsed.default) return parsed.default;
    } catch {
      // Try the legacy environment variable.
    }
  }

  return Deno.env.get("SUPABASE_ANON_KEY") ?? null;
}

function isTemporaryStatus(status: number): boolean {
  return [408, 425, 429, 500, 502, 503, 504].includes(status);
}

function getProvider(model: string): Provider {
  return model.toLowerCase().startsWith("gemini")
    ? "gemini"
    : "groq";
}

async function callGemini(
  prompt: string,
  model: string,
): Promise<{ answer: string; usage: unknown }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    throw new ProviderError(
      "Configuration Gemini manquante.",
      500,
      false,
    );
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    throw new ProviderError(
      "Le fournisseur Gemini a rencontré une erreur.",
      response.status,
      isTemporaryStatus(response.status),
    );
  }

  const data = await response.json();

  const answer = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();

  if (!answer) {
    throw new ProviderError(
      "Gemini n'a retourné aucune réponse exploitable.",
      502,
      true,
    );
  }

  return {
    answer,
    usage: data.usageMetadata ?? null,
  };
}

async function callGroq(
  prompt: string,
  model: string,
): Promise<{ answer: string; usage: unknown }> {
  const apiKey = Deno.env.get("GROQ_API_KEY");

  if (!apiKey) {
    throw new ProviderError(
      "Configuration Groq manquante.",
      500,
      false,
    );
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(25000),
    },
  );

  if (!response.ok) {
    throw new ProviderError(
      "Le fournisseur Groq a rencontré une erreur.",
      response.status,
      isTemporaryStatus(response.status),
    );
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    throw new ProviderError(
      "Groq n'a retourné aucune réponse exploitable.",
      502,
      true,
    );
  }

  return {
    answer,
    usage: data.usage ?? null,
  };
}

async function callProvider(
  provider: Provider,
  prompt: string,
  model: string,
) {
  return provider === "gemini"
    ? await callGemini(prompt, model)
    : await callGroq(prompt, model);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Méthode non autorisée." },
      405,
    );
  }

  try {
    // 1. Vérifier la session de l'utilisateur.
    const authorization = req.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Authentification requise." },
        401,
      );
    }

    const token = authorization.slice(7);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = getPublishableKey();

    if (!supabaseUrl || !publishableKey) {
      return jsonResponse(
        { error: "Configuration Supabase incomplète." },
        500,
      );
    }

    const supabase = createClient(
      supabaseUrl,
      publishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return jsonResponse(
        { error: "Session invalide ou expirée." },
        401,
      );
    }

    // 2. Vérifier la demande.
    let body: { prompt?: unknown; model?: unknown };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Format JSON invalide." },
        400,
      );
    }

    const prompt =
      typeof body.prompt === "string" ? body.prompt.trim() : "";

    const model =
      typeof body.model === "string" ? body.model.trim() : "";

    if (!prompt || !model) {
      return jsonResponse(
        { error: "Le prompt et le modèle sont obligatoires." },
        400,
      );
    }

    if (prompt.length > 12000 || model.length > 120) {
      return jsonResponse(
        { error: "La demande dépasse les limites autorisées." },
        400,
      );
    }

    // 3. Choisir le fournisseur principal.
    const primaryProvider = getProvider(model);

    try {
      const result = await callProvider(
        primaryProvider,
        prompt,
        model,
      );

      return jsonResponse({
        answer: result.answer,
        provider: primaryProvider,
        model,
        usage: result.usage,
        fallback: false,
        quota: null,
      });
    } catch (primaryError) {
      // Ne pas contourner une erreur d'authentification,
      // une demande invalide ou une mauvaise configuration.
      if (
        !(primaryError instanceof ProviderError) ||
        !primaryError.temporary
      ) {
        throw primaryError;
      }

      // 4. Essayer le fournisseur de secours.
      const fallbackProvider: Provider =
        primaryProvider === "gemini" ? "groq" : "gemini";

      const fallbackModel =
        fallbackProvider === "gemini"
          ? Deno.env.get("GEMINI_FALLBACK_MODEL")
          : Deno.env.get("GROQ_FALLBACK_MODEL");

      if (!fallbackModel) {
        throw primaryError;
      }

      const result = await callProvider(
        fallbackProvider,
        prompt,
        fallbackModel,
      );

      return jsonResponse({
        answer: result.answer,
        provider: fallbackProvider,
        model: fallbackModel,
        usage: result.usage,
        fallback: true,
        quota: null,
      });
    }
  } catch (error) {
    console.error(
      "AI Gateway error:",
      error instanceof Error ? error.message : "Unknown error",
    );

    const status =
      error instanceof ProviderError &&
      [400, 401, 403, 429].includes(error.status)
        ? error.status
        : 502;

    return jsonResponse(
      { error: "Le service IA est temporairement indisponible." },
      status,
    );
  }
});
