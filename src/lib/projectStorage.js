
import { supabase } from "./supabase";

const TABLE = "projects";

/**
 * Vérifie la session de l'utilisateur.
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
 * Récupère tous les projets de l'utilisateur.
 */
export async function getProjects() {
  const user = await getCurrentUser();

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Crée un nouveau projet.
 */
export async function createProject(project) {
  const user = await getCurrentUser();

  if (!project?.name?.trim()) {
    throw new Error("Le nom du projet est obligatoire.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: user.id,
      name: project.name.trim(),
      description: project.description || "",
      type: project.type || "api",
      status: "active",
      config: project.config || {},
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Met à jour un projet existant.
 */
export async function updateProject(projectId, updates) {
  const user = await getCurrentUser();

  const allowedFields = [
    "name",
    "description",
    "type",
    "status",
    "config",
  ];

  const safeUpdates = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      safeUpdates[field] = updates[field];
    }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(safeUpdates)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Supprime un projet.
 */
export async function deleteProject(projectId) {
  const user = await getCurrentUser();

  const { error } = await supabase
    .from(TABLE)
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

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (error) throw error;

  return data;
}
