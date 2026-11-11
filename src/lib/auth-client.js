import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "https://bngproject.onrender.com",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    usernameClient({
      displayUsername: false,
    }),
  ],
});
