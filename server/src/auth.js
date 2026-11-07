
import "dotenv/config";
import { betterAuth } from "better-auth";
import { pool } from "./db.js";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required.");
}

if (!process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL is required.");
}

if (!process.env.CLIENT_ORIGIN) {
  throw new Error("CLIENT_ORIGIN is required.");
}

export const auth = betterAuth({
  database: pool,

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [process.env.CLIENT_ORIGIN],

  emailAndPassword: {
    enabled: true,
  },
});
