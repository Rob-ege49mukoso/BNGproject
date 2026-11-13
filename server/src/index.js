
import "dotenv/config";
import express from "express";
import cors from "cors";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import {
  checkDatabaseConnection,
  pool,
} from "./db.js";
import { createProjectsHandler } from "./projects.js";

const app = express();

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

// Better Auth doit être monté AVANT express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

// Les autres routes peuvent utiliser JSON
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    const database = await checkDatabaseConnection();

    res.status(200).json({
      status: "ok",
      service: "elema-api-server",
      database: "connected",
      databaseTime: database.databaseTime,
      authentication: "configured",
    });
  } catch (error) {
    console.error("Health check failed:", error.message);

    res.status(503).json({
      status: "error",
      service: "elema-api-server",
      database: "unavailable",
    });
  }
});

if (process.env.ENABLE_PROJECT_API === "true") {
  app.use(
    "/api/projects",
    createProjectsHandler({
      pool,
      trustedOrigin: CLIENT_ORIGIN,
      getSession: (req) =>
        auth.api.getSession({ headers: fromNodeHeaders(req.headers) }),
    })
  );
}

app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

async function startServer() {
  try {
    await checkDatabaseConnection();
    console.log("Neon PostgreSQL connection verified.");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Elema API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      "Startup failed: Neon PostgreSQL is unavailable.",
      error.message
    );

    await pool.end();
    process.exit(1);
  }
}

startServer();
      
