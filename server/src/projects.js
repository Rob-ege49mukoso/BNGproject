import { randomUUID } from "node:crypto";

const PROJECT_TYPES = new Set(["api", "agent", "application"]);
const HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const API_SLUG_CONSTRAINT = "elema_projects_api_user_slug_unique";

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label, { max = 2000, allowEmpty = true } = {}) {
  if (typeof value !== "string") {
    throw new RequestError(400, `${label} doit être du texte.`);
  }

  const normalized = value.trim();
  if (!allowEmpty && !normalized) {
    throw new RequestError(400, `${label} est obligatoire.`);
  }
  if (normalized.length > max) {
    throw new RequestError(400, `${label} est trop long.`);
  }
  return normalized;
}

export function generateSlug(value) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "api"
  );
}

export function normalizeProject(row) {
  const base = {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  const config = isPlainObject(row.config) ? row.config : {};

  if (row.type === "api") {
    const published = row.status === "published";
    return {
      ...base,
      type: "api",
      status: published ? "published" : "draft",
      slug: row.slug,
      is_published: published,
      method: config.method || "GET",
      route: config.route || "/",
      response_json: config.response_json ?? {},
      config: {
        method: config.method || "GET",
        route: config.route || "/",
        response_json: config.response_json ?? {},
      },
    };
  }

  if (row.type === "agent") {
    return {
      ...base,
      type: "agent",
      status: "active",
      instructions: row.instructions || "",
      model: row.model || "gemini-2.5-flash",
      config,
    };
  }

  return {
    ...base,
    type: "application",
    status: row.status || "draft",
    specification: config,
    config,
  };
}

function validateConfig(type, value) {
  if (!isPlainObject(value)) {
    throw new RequestError(400, "La configuration doit être un objet JSON.");
  }

  if (type !== "api") return value;

  const method = value.method === undefined ? "GET" : value.method;
  if (typeof method !== "string" || !HTTP_METHODS.has(method.toUpperCase())) {
    throw new RequestError(400, "Méthode HTTP invalide.");
  }

  const route = value.route === undefined ? "/" : value.route;
  if (
    typeof route !== "string" ||
    !route.startsWith("/") ||
    route.length > 200
  ) {
    throw new RequestError(400, "La route doit commencer par /.");
  }

  let responseJson = value.response_json ?? {};
  try {
    responseJson = JSON.parse(JSON.stringify(responseJson));
  } catch {
    throw new RequestError(400, "La réponse JSON est invalide.");
  }

  return {
    method: method.toUpperCase(),
    route,
    response_json: responseJson,
  };
}

function validateCreateInput(body) {
  if (!isPlainObject(body)) {
    throw new RequestError(400, "Le projet doit être un objet JSON.");
  }

  const type = body.type || "api";
  if (!PROJECT_TYPES.has(type)) {
    throw new RequestError(400, "Type de projet invalide.");
  }

  const name = requireString(body.name, "Le nom", {
    max: 160,
    allowEmpty: false,
  });
  const description =
    body.description === undefined
      ? ""
      : requireString(body.description, "La description", { max: 4000 });
  const config = validateConfig(
    type,
    body.config === undefined ? {} : body.config
  );

  const instructions =
    type === "agent" && body.instructions !== undefined
      ? requireString(body.instructions, "Les instructions", { max: 20000 })
      : "";
  const model =
    type === "agent" && body.model !== undefined
      ? requireString(body.model, "Le modèle", { max: 160, allowEmpty: false })
      : type === "agent"
        ? "gemini-2.5-flash"
        : null;

  return { type, name, description, config, instructions, model };
}

function validateUpdateInput(body) {
  if (!isPlainObject(body)) {
    throw new RequestError(400, "Les modifications doivent être un objet JSON.");
  }

  const updates = {};
  if (Object.hasOwn(body, "name")) {
    updates.name = requireString(body.name, "Le nom", {
      max: 160,
      allowEmpty: false,
    });
  }
  if (Object.hasOwn(body, "description")) {
    updates.description = requireString(body.description, "La description", {
      max: 4000,
    });
  }
  if (Object.hasOwn(body, "config")) {
    if (!isPlainObject(body.config)) {
      throw new RequestError(400, "La configuration doit être un objet JSON.");
    }
    updates.config = body.config;
  }
  if (Object.hasOwn(body, "instructions")) {
    updates.instructions = requireString(body.instructions, "Les instructions", {
      max: 20000,
    });
  }
  if (Object.hasOwn(body, "model")) {
    updates.model = requireString(body.model, "Le modèle", {
      max: 160,
      allowEmpty: false,
    });
  }
  if (Object.hasOwn(body, "status")) {
    updates.status = requireString(body.status, "Le statut", {
      max: 40,
      allowEmpty: false,
    });
  }
  return updates;
}

function relativePath(req) {
  const originalUrl = req.originalUrl || req.url || "/";
  const pathname = new URL(originalUrl, "http://localhost").pathname;
  const baseUrl = req.baseUrl || "/api/projects";
  const path = pathname.startsWith(baseUrl)
    ? pathname.slice(baseUrl.length)
    : pathname.replace(/^\/api\/projects/, "");
  return path.replace(/\/+$/, "") || "/";
}

function json(res, status, value) {
  return res.status(status).json(value);
}

async function createProject(pool, userId, body) {
  const input = validateCreateInput(body);
  const status =
    input.type === "agent" ? "active" : "draft";
  const baseSlug = input.type === "api" ? generateSlug(input.name) : null;

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const slug =
      baseSlug === null
        ? null
        : attempt === 1
          ? baseSlug
          : `${baseSlug}-${attempt}`;
    try {
      const result = await pool.query(
        `INSERT INTO public.elema_projects
          (id, user_id, type, name, description, status, slug, config, instructions, model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          randomUUID(),
          userId,
          input.type,
          input.name,
          input.description,
          status,
          slug,
          input.config,
          input.instructions,
          input.model,
        ]
      );
      return normalizeProject(result.rows[0]);
    } catch (error) {
      if (
        input.type === "api" &&
        error.code === "23505" &&
        error.constraint === API_SLUG_CONSTRAINT
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new RequestError(409, "Impossible de générer un identifiant unique.");
}

async function getProject(pool, userId, projectId) {
  const result = await pool.query(
    `SELECT * FROM public.elema_projects
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [projectId, userId]
  );
  if (!result.rows[0]) {
    throw new RequestError(404, "Projet introuvable.");
  }
  return result.rows[0];
}

async function updateProject(pool, userId, projectId, body) {
  const existing = await getProject(pool, userId, projectId);
  const updates = validateUpdateInput(body);
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  };

  if (Object.hasOwn(updates, "name")) addField("name", updates.name);
  if (Object.hasOwn(updates, "description")) {
    addField("description", updates.description);
  }

  if (Object.hasOwn(updates, "config")) {
    if (existing.type === "api") {
      const existingConfig = isPlainObject(existing.config) ? existing.config : {};
      const mergedConfig = { ...existingConfig, ...updates.config };
      addField("config", validateConfig("api", mergedConfig));
    } else {
      addField("config", updates.config);
    }
  }

  if (existing.type === "agent") {
    if (Object.hasOwn(updates, "instructions")) {
      addField("instructions", updates.instructions);
    }
    if (Object.hasOwn(updates, "model")) addField("model", updates.model);
  } else if (existing.type === "application") {
    if (
      Object.hasOwn(updates, "status") &&
      ["draft", "building", "ready", "archived"].includes(updates.status)
    ) {
      addField("status", updates.status);
    }
  } else if (existing.type === "api" && Object.hasOwn(updates, "status")) {
    if (!["draft", "published", "deployed"].includes(updates.status)) {
      throw new RequestError(400, "Statut API invalide.");
    }
    addField(
      "status",
      updates.status === "draft" ? "draft" : "published"
    );
  }

  if (fields.length === 0) return normalizeProject(existing);

  values.push(projectId, userId);
  const result = await pool.query(
    `UPDATE public.elema_projects
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND user_id = $${values.length}
     RETURNING *`,
    values
  );
  if (!result.rows[0]) {
    throw new RequestError(404, "Projet introuvable.");
  }
  return normalizeProject(result.rows[0]);
}

export function createProjectsHandler({
  pool,
  getSession,
  trustedOrigin,
  logger = console,
}) {
  if (!pool || typeof pool.query !== "function") {
    throw new TypeError("A database pool is required.");
  }
  if (typeof getSession !== "function") {
    throw new TypeError("A Better Auth session resolver is required.");
  }
  if (typeof trustedOrigin !== "string" || !trustedOrigin) {
    throw new TypeError("A trusted frontend origin is required.");
  }

  return async function projectsHandler(req, res, next) {
    let path;
    try {
      path = relativePath(req);
    } catch {
      return json(res, 400, { error: "Route invalide." });
    }

    const segments = path.split("/").filter(Boolean);
    if (segments.length > 1) return next();
    const projectId = segments[0];
    const method = (req.method || "GET").toUpperCase();
    const isCollection = !projectId;
    const allowed =
      (isCollection && ["GET", "POST"].includes(method)) ||
      (!isCollection && ["GET", "PATCH", "DELETE"].includes(method));
    if (!allowed) {
      res.set?.("Allow", isCollection ? "GET, POST" : "GET, PATCH, DELETE");
      return json(res, 405, { error: "Méthode non autorisée." });
    }

    if (
      method !== "GET" &&
      req.headers?.origin !== trustedOrigin
    ) {
      return json(res, 403, { error: "Origine non autorisée." });
    }

    let session;
    try {
      session = await getSession(req);
    } catch {
      logger.error?.("Project authentication check failed.");
      return json(res, 503, { error: "Authentification indisponible." });
    }

    const userId = session?.user?.id;
    if (typeof userId !== "string" || !userId) {
      return json(res, 401, { error: "Authentification requise." });
    }

    try {
      if (isCollection && method === "GET") {
        const result = await pool.query(
          `SELECT * FROM public.elema_projects
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [userId]
        );
        return json(res, 200, result.rows.map(normalizeProject));
      }
      if (isCollection && method === "POST") {
        const created = await createProject(pool, userId, req.body);
        return json(res, 201, created);
      }
      if (method === "GET") {
        const project = await getProject(pool, userId, projectId);
        return json(res, 200, normalizeProject(project));
      }
      if (method === "PATCH") {
        const project = await updateProject(
          pool,
          userId,
          projectId,
          req.body
        );
        return json(res, 200, project);
      }

      const deleted = await pool.query(
        `DELETE FROM public.elema_projects
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [projectId, userId]
      );
      if (!deleted.rows[0]) {
        return json(res, 404, { error: "Projet introuvable." });
      }
      return res.status(204).end();
    } catch (error) {
      if (error instanceof RequestError) {
        return json(res, error.status, { error: error.message });
      }
      logger.error?.("Project request failed.", {
        code: typeof error?.code === "string" ? error.code : "unknown",
      });
      return json(res, 500, { error: "Opération sur le projet impossible." });
    }
  };
}
