
import "dotenv/config";
import { betterAuth } from "better-auth";
import { pool } from "./db.js";
import { sendEmail } from "./sendliberty.js";

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
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,

    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe Elema",
        html: `
          <h2>Réinitialisation du mot de passe</h2>
          <p>Une demande de réinitialisation a été effectuée pour votre compte Elema.</p>
          <p><a href="${url}">Réinitialiser mon mot de passe</a></p>
          <p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
        `,
        text: `Pour réinitialiser votre mot de passe Elema, ouvrez ce lien : ${url}`,
      }).catch((error) => {
        console.error("Password reset email failed:", error.message);
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 3600,

    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Vérifiez votre adresse e-mail — Elema",
        html: `
          <h2>Bienvenue sur Elema</h2>
          <p>Confirmez votre adresse e-mail pour activer votre compte.</p>
          <p><a href="${url}">Vérifier mon adresse e-mail</a></p>
          <p>Ce lien expire dans une heure.</p>
        `,
        text: `Bienvenue sur Elema. Vérifiez votre adresse e-mail avec ce lien : ${url}`,
      }).catch((error) => {
        console.error("Verification email failed:", error.message);
      });
    },
  },
});
                                   
