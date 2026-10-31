
import { supabase } from "./supabase";

const TABLES = {
  api: "api_projects",
  agent: "ai_agents",
  application: "app_projects",
};

const PROJECT_TYPES = Object.keys(TABLES);

/**
 * Vérifie que l'utilisateur possède une session active.
 */
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  if (!data.user) {
    throw new Error("Vous devez être connecté pour continuer.");
  }

  return data.user;
}

/**
 * Vérifie le type de projet demandé.
 */
function normalizeType(type) {
  const normalized = type || "api";

  if (!PROJECT_TYPES.includes(normalized)) {
    throw new Error(
      "Type de projet invalide. Utilisez api, agent ou application."
    );
  }

  return normalized;
}

/**
 * Convertit une ligne Supabase en projet commun à Elema.
 */
function normalizeProject(row, type) {
  if (type === "api") {
    return {
      ...row,
      type: "api",
      status: row.is_published ? "published" : "draft",
      config: {
        method: row.method,
        route: row.route,
        response_json: row.response_json,
      },
    };
  }

  if (type === "agent") {
    return {
      ...row,
      type: "agent",
      status: "active",
      config: row.config || {},
    };
  }

  return {
    ...row,
    type: "application",
    status: row.status || "draft",
    config: row.specification || {},
  };
}

/**
 * Récupère les projets de l'utilisateur dans les trois tables.
 */
export async function getProjects() {
  const user = await getCurrentUser();

  const results = await Promise.all(
    PROJECT_TYPES.map(async (type) => {
      const { data, error } = await supabase
        .from(TABLES[type])
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row) => normalizeProject(row, type));
    })
  );

  return results
    .flat()
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
}

/**
 * Crée un projet dans la table correspondant à son type.
 */
export async function createProject(project) {
  const user = await getCurrentUser();

  if (!project?.name?.trim()) {
    throw new Error("Le nom du projet est obligatoire.");
  }

  const type = normalizeType(project.type);
  const name = project.name.trim();
  const description = project.description || "";
  const config = project.config || {};

  let payload;

  if (type === "api") {
    payload = {
      user_id: user.id,
      name,
      description,
      method: config.method || "GET",
      route: config.route || "/",
      response_json: config.response_json || {},
      is_published: false,
    };
  } else if (type === "agent") {
    payload = {
      user_id: user.id,
      name,
      description,
      instructions: project.instructions || "",
      model: project.model || "gemini-2.5-flash",
      config,
    };
  } else {
    payload = {
      user_id: user.id,
      name,
      description,
      specification: config,
      status: "draft",
    };
  }

  const { data, error } = await supabase
    .from(TABLES[type])
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return normalizeProject(data, type);
}

/**
 * Recherche un projet dans les trois tables.
 */
async function findProjectRecord(projectId, userId) {
  for (const type of PROJECT_TYPES) {
    const { data, error } = await supabase
      .from(TABLES[type])
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return { data, type };
    }
  }

  throw new Error("Projet introuvable ou accès non autorisé.");
}

/**
 * Met à jour un projet sans modifier son propriétaire.
 */
export async function updateProject(projectId, updates) {
  const user = await getCurrentUser();
  const { data: existing, type } = await findProjectRecord(
    projectId,
    user.id
  );

  const safeUpdates = {};

  if (Object.prototype.hasOwnProperty.call(updates, "name")) {
    if (!updates.name?.trim()) {
      throw new Error("Le nom du projet ne peut pas être vide.");
    }

    safeUpdates.name = updates.name.trim();
  }

  if (Object.prototype.hasOwnProperty.call(updates, "description")) {
    safeUpdates.description = updates.description || "";
  }

  if (type === "api") {
    if (updates.config) {
      if (Object.prototype.hasOwnProperty.call(updates.config, "method")) {
        safeUpdates.method = updates.config.method;
      }

      if (Object.prototype.hasOwnProperty.call(updates.config, "route")) {
        safeUpdates.route = updates.config.route;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          updates.config,
          "response_json"
        )
      ) {
        safeUpdates.response_json = updates.config.response_json;
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "status")) {
      safeUpdates.is_published =
        updates.status === "published" || updates.status === "deployed";
    }
  } else if (type === "agent") {
    if (Object.prototype.hasOwnProperty.call(updates, "instructions")) {
      safeUpdates.instructions = updates.instructions;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "model")) {
      safeUpdates.model = updates.model;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "config")) {
      safeUpdates.config = updates.config;
    }
  } else {
    if (Object.prototype.hasOwnProperty.call(updates, "config")) {
      safeUpdates.specification = updates.config;
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "status") &&
      ["draft", "building", "ready", "archived"].includes(updates.status)
    ) {
      safeUpdates.status = updates.status;
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return normalizeProject(existing, type);
  }

  const { data, error } = await supabase
    .from(TABLES[type])
    .update(safeUpdates)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return normalizeProject(data, type);
}

/**
 * Supprime uniquement le projet appartenant à l'utilisateur connecté.
 */
export async function deleteProject(projectId) {
  const user = await getCurrentUser();
  const { type } = await findProjectRecord(projectId, user.id);

  const { error } = await supabase
    .from(TABLES[type])
    .delete()
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) throw error;

  return true;
}

/**
 * Récupère un projet précis.
 */
export async function getProjectById(projectId) {
  const user = await getCurrentUser();
  const { data, type } = await findProjectRecord(projectId, user.id);

  return normalizeProject(data, type);
        }
