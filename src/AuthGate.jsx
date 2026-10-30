
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import App from "./App.jsx";
import AuthPage from "./AuthPage.jsx";

export default function AuthGate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;

      setSession(newSession);
      setError("");
      setLoading(false);
    });

    const loadSession = async () => {
      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (!active) return;

        if (sessionError) {
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        setSession(data.session);
        setLoading(false);
      } catch (err) {
        if (!active) return;

        setError(
          err.message || "Impossible de vérifier la session."
        );
        setLoading(false);
      }
    };

    loadSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
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

  if (error) {
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
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return session ? <App /> : <AuthPage />;
}
