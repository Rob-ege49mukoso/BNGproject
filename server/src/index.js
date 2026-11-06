
import "dotenv/config";
import express from "express";
import cors from "cors";
import { checkDatabaseConnection, pool } from "./db.js";

const app = express();

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

// Vérification du serveur et de la base Neon
app.get("/health", async (_req, res) => {
  try {
    const database = await checkDatabaseConnection();

    res.status(200).json({
      status: "ok",
      service: "elema-api-server",
      database: "connected",
      databaseTime: database.databaseTime,
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

// Route inconnue
app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// Démarrage uniquement si Neon est accessible
async function startServer() {
  try {
    await checkDatabaseConnection();

    console.log("Neon PostgreSQL connection verified.");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Elema API server listening on port ${PORT}`);
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
  
