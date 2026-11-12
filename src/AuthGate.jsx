
import { useState } from "react";
import { authClient } from "./lib/auth-client";
import App from "./App.jsx";
import AuthPage from "./AuthPage.jsx";

export default function AuthGate() {
  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession();

  const [signOutError, setSignOutError] = useState("");

  const handleSignOut = async () => {
    setSignOutError("");

    try {
      const { error } = await authClient.signOut();

      if (error) {
        setSignOutError(error.message || "Échec de la déconnexion.");
      }
    } catch (err) {
      setSignOutError(
        err.message || "Impossible de se déconnecter."
      );
    }
  };

  const errorMessage =
    signOutError || sessionError?.message || "";

  if (isPending) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#101410",
        color: "#b6ff5c",
        fontFamily: "sans-serif"
      }}>
        Vérification de ta session Elema...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#101410",
        color: "#ffffff",
        fontFamily: "sans-serif",
        padding: "24px",
        textAlign: "center"
      }}>
        <div>
          <h2>Connexion indisponible</h2>
          <p>{errorMessage}</p>
          <button onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return session
    ? <App onSignOut={handleSignOut} />
    : <AuthPage />;
}
