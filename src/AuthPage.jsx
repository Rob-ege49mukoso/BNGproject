
import { useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./auth.css";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [method, setMethod] = useState("email");
  const [identifier, setIdentifier] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const resetMessages = () => {
    setNotice("");
    setError("");
  };

  const validEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validPhone = (value) =>
    /^\+?[0-9\s()-]{8,20}$/.test(value);

  const handleAuth = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!identifier.trim()) {
      setError("Entre ton adresse e-mail ou ton numéro.");
      return;
    }

    if (method === "email" && !validEmail(identifier)) {
      setError("Adresse e-mail invalide.");
      return;
    }

    if (method === "phone" && !validPhone(identifier)) {
      setError("Numéro de téléphone invalide. Utilise l'indicatif international.");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (mode === "signup" && method === "phone") {
      if (!validEmail(recoveryEmail)) {
        setError("Entre une adresse e-mail valide pour la récupération.");
        return;
      }
    }

    setBusy(true);

    try {
      let result;

      if (mode === "signup") {
        const credentials = {
          password,
          options: {
            data: {
              recovery_email:
                method === "phone" ? recoveryEmail.trim() : identifier.trim(),
              login_method: method,
            },
          },
        };

        if (method === "email") {
          credentials.email = identifier.trim();
        } else {
          credentials.phone = identifier.replace(/\s/g, "");
        }

        result = await supabase.auth.signUp(credentials);

        if (result.error) throw result.error;

        setNotice(
          method === "email"
            ? "Compte créé. Vérifie ton adresse e-mail pour confirmer ton inscription."
            : "Inscription envoyée. La vérification du numéro doit être configurée."
        );
      } else {
        const credentials = {
          password,
          [method]: identifier.trim(),
        };

        result = await supabase.auth.signInWithPassword(credentials);

        if (result.error) throw result.error;

        setNotice("Connexion réussie.");
      }
    } catch (err) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    resetMessages();

    if (!validEmail(identifier)) {
      setError(
        "Entre l'adresse e-mail associée à ton compte pour recevoir le lien de récupération."
      );
      return;
    }

    setBusy(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(identifier.trim());

      if (error) throw error;

      setNotice("Un lien de récupération a été envoyé à ton adresse e-mail.");
    } catch (err) {
      setError(err.message || "Impossible d'envoyer le lien.");
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    resetMessages();
    setPassword("");
  };

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <Sparkles size={25} />
          </div>
          <h1>ELEMA<span>API</span></h1>
          <p>Build. Create. Automate.</p>
        </div>

        {mode === "reset" ? (
          <>
            <button
              type="button"
              className="auth-back"
              onClick={() => changeMode("login")}
            >
              <ArrowLeft size={17} />
              Retour à la connexion
            </button>

            <h2>Récupérer ton compte</h2>
            <p className="auth-description">
              Entre ton adresse e-mail pour recevoir un lien de récupération.
            </p>

            <form onSubmit={handleReset}>
              <label>Adresse e-mail</label>
              <div className="auth-input">
                <Mail size={18} />
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="exemple@email.com"
                  required
                />
              </div>

              {error && <p className="auth-error">{error}</p>}
              {notice && <p className="auth-notice">{notice}</p>}

              <button className="auth-submit" disabled={busy}>
                {busy ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2>
              {mode === "login" ? "Bienvenue" : "Créer un compte"}
            </h2>

            <p className="auth-description">
              {mode === "login"
                ? "Connecte-toi pour accéder à ton espace de création."
                : "Rejoins Elema API et donne vie à tes projets."}
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={method === "email" ? "active" : ""}
                onClick={() => {
                  setMethod("email");
                  resetMessages();
                }}
              >
                <Mail size={16} /> E-mail
              </button>

              <button
                type="button"
                className={method === "phone" ? "active" : ""}
                onClick={() => {
                  setMethod("phone");
                  resetMessages();
                }}
              >
                <Phone size={16} /> Téléphone
              </button>
            </div>

            <form onSubmit={handleAuth}>
              <label>
                {method === "email" ? "Adresse e-mail" : "Numéro de téléphone"}
              </label>

              <div className="auth-input">
                {method === "email" ? (
                  <Mail size={18} />
                ) : (
                  <Phone size={18} />
                )}

                <input
                  type={method === "email" ? "email" : "tel"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    method === "email"
                      ? "exemple@email.com"
                      : "+243..."
                  }
                  required
                />
              </div>

              {mode === "signup" && method === "phone" && (
                <>
                  <label>E-mail de récupération</label>
                  <div className="auth-input">
                    <ShieldCheck size={18} />
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="Adresse e-mail de secours"
                      required
                    />
                  </div>
                  <p className="auth-hint">
                    Cette adresse sera enregistrée pour la récupération du compte.
                  </p>
                </>
              )}

              <label>Mot de passe</label>
              <div className="auth-input">
                <ShieldCheck size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Afficher ou masquer le mot de passe"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {mode === "login" && (
                <button
                  type="button"
                  className="auth-forgot"
                  onClick={() => changeMode("reset")}
                >
                  Mot de passe oublié ?
                </button>
              )}

              {error && <p className="auth-error">{error}</p>}
              {notice && <p className="auth-notice">{notice}</p>}

              <button className="auth-submit" disabled={busy}>
                {busy
                  ? "Patiente..."
                  : mode === "login"
                    ? "Se connecter"
                    : "Créer mon compte"}
              </button>
            </form>

            <div className="auth-switch">
              {mode === "login" ? (
                <>
                  Pas encore de compte ?
                  <button onClick={() => changeMode("signup")}>
                    S'inscrire
                  </button>
                </>
              ) : (
                <>
                  Déjà inscrit ?
                  <button onClick={() => changeMode("login")}>
                    Se connecter
                  </button>
                </>
              )}
            </div>
          </>
        )}

        <p className="auth-footer">
          Sécurisé par Elema API <span>•</span> Quantum Neon
        </p>
      </section>
    </main>
  );
}
