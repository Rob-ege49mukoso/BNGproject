
import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Mail, Phone, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';
import './auth.css';

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [method, setMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';
  const isReset = mode === 'reset';

  function switchMode(nextMode) {
    setMode(nextMode);
    setNotice('');
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    setBusy(true);

    try {
      if (!supabase) {
        throw new Error('Configuration Supabase absente. Vérifie les variables VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY.');
      }

      if (isReset) {
        if (method !== 'email') {
          throw new Error('La récupération par téléphone n’est pas encore activée.');
        }

        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(identifier.trim(), {
            redirectTo: window.location.origin,
          });

        if (resetError) throw resetError;

        setNotice('Si un compte correspond à cette adresse, un e-mail de récupération sera envoyé.');
        return;
      }

      if (isSignup) {
        if (method === 'phone') {
          if (!recoveryEmail.trim()) {
            throw new Error('L’e-mail de récupération est obligatoire.');
          }

          throw new Error('L’inscription par téléphone et l’envoi du code de récupération ne sont pas encore activés côté serveur. Utilise temporairement l’inscription par e-mail.');
        }

        const { data, error: signupError } = await supabase.auth.signUp({
          email: identifier.trim(),
          password,
        });

        if (signupError) throw signupError;

        setNotice(
          data?.session
            ? 'Compte créé. Tu es connecté.'
            : 'Compte créé. Vérifie ta boîte e-mail pour confirmer ton adresse.'
        );

        if (data?.session && onAuthenticated) {
          onAuthenticated(data.session);
        }
        return;
      }

      const credentials =
        method === 'phone'
          ? { phone: identifier.trim(), password }
          : { email: identifier.trim(), password };

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword(credentials);

      if (loginError) throw loginError;

      if (onAuthenticated) onAuthenticated(data.session);
      setNotice('Connexion réussie.');
    } catch (err) {
      setError(err?.message || 'Une erreur est survenue. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="auth-brand" href="/" aria-label="Accueil Elema API">
          <span className="auth-brand-mark">E</span>
          <span>elema <span>API</span></span>
        </a>

        <div className="auth-heading">
          <span className="auth-kicker">
            <ShieldCheck size={15} /> TON ESPACE ELEMA
          </span>
          <h1 id="auth-title">
            {isReset ? 'Récupérer le compte' : isSignup ? 'Créer ton compte' : 'Bon retour'}
          </h1>
          <p>
            {isReset
              ? 'Indique ton adresse e-mail pour recevoir les instructions.'
              : isSignup
                ? 'Crée un compte pour retrouver tes projets.'
                : 'Connecte-toi pour accéder à ton espace de travail.'}
          </p>
        </div>

        {!isReset && (
          <div className="auth-mode-tabs">
            <button type="button" className={!isSignup ? 'active' : ''} onClick={() => switchMode('login')}>
              Connexion
            </button>
            <button type="button" className={isSignup ? 'active' : ''} onClick={() => switchMode('signup')}>
              Inscription
            </button>
          </div>
        )}

        <div className="auth-method-tabs">
          <button type="button" className={method === 'email' ? 'active' : ''} onClick={() => { setMethod('email'); setNotice(''); setError(''); }}>
            <Mail size={16} /> E-mail
          </button>
          <button type="button" className={method === 'phone' ? 'active' : ''} onClick={() => { setMethod('phone'); setNotice(''); setError(''); }} disabled={isReset}>
            <Phone size={16} /> Téléphone
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-identifier">
            {method === 'email' ? 'Adresse e-mail' : 'Numéro de téléphone'}
          </label>
          <input
            id="auth-identifier"
            type={method === 'email' ? 'email' : 'tel'}
            autoComplete={method === 'email' ? 'email' : 'tel'}
            placeholder={method === 'email' ? 'nom@exemple.com' : '+243…'}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />

          {isSignup && method === 'phone' && (
            <>
              <label htmlFor="auth-recovery-email">E-mail de récupération</label>
              <input
                id="auth-recovery-email"
                type="email"
                autoComplete="email"
                placeholder="Adresse e-mail accessible"
                value={recoveryEmail}
                onChange={(event) => setRecoveryEmail(event.target.value)}
                required
              />
              <p className="auth-help">
                Cette adresse sera utilisée pour sécuriser la récupération du compte.
              </p>
            </>
          )}

          {!isReset && (
            <>
              <label htmlFor="auth-password">Mot de passe</label>
              <div className="auth-password-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  placeholder={isSignup ? 'Choisis un mot de passe' : 'Ton mot de passe'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </>
          )}

          {!isSignup && !isReset && method === 'email' && (
            <button type="button" className="auth-forgot" onClick={() => switchMode('reset')}>
              Mot de passe oublié ?
            </button>
          )}

          {error && <p className="auth-message auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-message auth-success" role="status">{notice}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy ? 'Patiente…' : isReset ? 'Envoyer les instructions' : isSignup ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>

        {isReset && (
          <button type="button" className="auth-back" onClick={() => switchMode('login')}>
            <ArrowLeft size={16} /> Retour à la connexion
          </button>
        )}

        <p className="auth-legal">
          En continuant, tu acceptes d’utiliser Elema conformément à ses règles de sécurité.
        </p>
      </section>
    </main>
  );
}
