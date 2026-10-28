
export const PROJECT_TABLES = {
  apis: "api_projects",
  agents: "ai_agents",
  apps: "app_projects",
};

export function emptyProjects() {
  return {
    apis: [],
    agents: [],
    apps: [],
  };
}

export function mapProjectRow(type, row) {
  return {
    ...row,
    type,
  };
}

export function buildProjectRecord(data, userId) {
  const name = String(data.name || "").trim();
  const description = String(data.description || "").trim();

  if (!name) {
    throw new Error("Le nom du projet est obligatoire.");
  }

  if (!userId) {
    throw new Error("Tu dois être connecté pour enregistrer un projet.");
  }

  if (data.type === "apis") {
    const slug =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now().toString(36);

    return {
      user_id: userId,
      name,
      description,
      slug,
      method: "GET",
      route: "/",
      response_json: {},
      is_published: false,
    };
  }

  if (data.type === "agents") {
    return {
      user_id: userId,
      name,
      description,
      instructions: description,
      model: "gemini-2.5-flash",
      config: {},
    };
  }

  if (data.type === "apps") {
    return {
      user_id: userId,
      name,
      description,
      specification: {
        prompt: description,
      },
      status: "draft",
    };
  }

  throw new Error("Type de projet inconnu.");
}

export async function loadProjects(client, userId) {
  if (!client || !userId) {
    return emptyProjects();
  }

  const types = Object.keys(PROJECT_TABLES);

  const results = await Promise.all(
    types.map(async (type) => {
      const { data, error } = await client
        .from(PROJECT_TABLES[type])
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(
          `Chargement des ${type} impossible : ${error.message}`
        );
      }

      return [
        type,
        (data || []).map((row) => mapProjectRow(type, row)),
      ];
    })
  );

  return Object.fromEntries(results);
}

export async function saveProjectToSupabase(client, project, userId) {
  if (!client) {
    throw new Error("La connexion à Supabase est indisponible.");
  }

  const record = buildProjectRecord(project, userId);
  const table = PROJECT_TABLES[project.type];

  const { data, error } = await client
    .from(table)
    .insert(record)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Enregistrement impossible : ${error.message}`);
  }

  return mapProjectRow(project.type, data);
}
