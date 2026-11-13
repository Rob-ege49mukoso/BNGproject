import assert from "node:assert/strict";
import test from "node:test";
import {
  createProjectsHandler,
  generateSlug,
  normalizeProject,
} from "./projects.js";

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
  };
}

function makeRequest(method, path, body = undefined) {
  return {
    method,
    baseUrl: "/api/projects",
    originalUrl: `/api/projects${path}`,
    headers: { origin: "https://elema-api.onrender.com" },
    body,
  };
}

const trustedOrigin = "https://elema-api.onrender.com";

test("generateSlug normalizes accents and punctuation", () => {
  assert.equal(generateSlug("École & API"), "ecole-api");
});

test("normalizeProject does not expose its owner id", () => {
  const project = normalizeProject({
    id: "project-1",
    user_id: "private-user-id",
    type: "api",
    name: "Test",
    description: "",
    status: "published",
    slug: "test",
    config: { method: "POST", route: "/items", response_json: { ok: true } },
  });

  assert.equal(project.status, "published");
  assert.equal(project.method, "POST");
  assert.equal(Object.hasOwn(project, "user_id"), false);
});

test("unauthenticated requests are rejected before database access", async () => {
  let queries = 0;
  const handler = createProjectsHandler({
    pool: { query: async () => { queries += 1; return { rows: [] }; } },
    getSession: async () => null,
    trustedOrigin,
    logger: { error() {} },
  });
  const response = makeResponse();

  await handler(makeRequest("GET", ""), response, () => {
    throw new Error("Unexpected fallthrough");
  });

  assert.equal(response.statusCode, 401);
  assert.equal(queries, 0);
});

test("project creation uses the session owner, not a client-supplied id", async () => {
  let queryText = "";
  let queryValues = [];
  const handler = createProjectsHandler({
    pool: {
      query: async (text, values) => {
        queryText = text;
        queryValues = values;
        return {
          rows: [{
            id: values[0],
            user_id: values[1],
            type: values[2],
            name: values[3],
            description: values[4],
            status: values[5],
            slug: values[6],
            config: values[7],
            instructions: values[8],
            model: values[9],
          }],
        };
      },
    },
    getSession: async () => ({ user: { id: "session-owner" } }),
    trustedOrigin,
    logger: { error() {} },
  });
  const response = makeResponse();

  await handler(
    makeRequest("POST", "", {
      userId: "forged-owner",
      user_id: "forged-owner",
      name: "Projet sûr",
      type: "api",
      config: { method: "GET", route: "/" },
    }),
    response,
    () => {
      throw new Error("Unexpected fallthrough");
    }
  );

  assert.equal(response.statusCode, 201);
  assert.equal(queryValues[1], "session-owner");
  assert.equal(response.body.user_id, undefined);
  assert.match(queryText, /INSERT INTO public\.elema_projects/);
});

test("resource lookups are scoped to the authenticated owner", async () => {
  let queryValues = [];
  const handler = createProjectsHandler({
    pool: {
      query: async (_text, values) => {
        queryValues = values;
        return { rows: [] };
      },
    },
    getSession: async () => ({ user: { id: "session-owner" } }),
    trustedOrigin,
    logger: { error() {} },
  });
  const response = makeResponse();

  await handler(makeRequest("GET", "/another-users-project"), response, () => {
    throw new Error("Unexpected fallthrough");
  });

  assert.equal(response.statusCode, 404);
  assert.deepEqual(queryValues, ["another-users-project", "session-owner"]);
});

test("mutations reject requests from an untrusted origin", async () => {
  let queries = 0;
  const handler = createProjectsHandler({
    pool: { query: async () => { queries += 1; return { rows: [] }; } },
    getSession: async () => ({ user: { id: "session-owner" } }),
    trustedOrigin,
    logger: { error() {} },
  });
  const request = makeRequest("POST", "", { name: "Test" });
  request.headers.origin = "https://attacker.invalid";
  const response = makeResponse();

  await handler(request, response, () => {
    throw new Error("Unexpected fallthrough");
  });

  assert.equal(response.statusCode, 403);
  assert.equal(queries, 0);
});
