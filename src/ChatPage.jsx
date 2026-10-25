
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Bot,
  Send,
  LogIn,
  LogOut,
  LoaderCircle,
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export default function ChatPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [provider, setProvider] = useState('groq');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setNotice(error.message);
      setSession(data?.session ?? null);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setNotice('');

    if (!supabase) {
      setNotice(
        'Configuration Supabase manquante. Vérifie les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setNotice(error.message);
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = prompt.trim();

    if (!text || busy || !supabase) return;

    setPrompt('');
    setNotice('');
    setMessages((current) => [
      ...current,
      { role: 'user', content: text },
    ]);
    setBusy(true);

    try {
      const { data, error } =
        await supabase.functions.invoke('ai-gateway', {
          body: {
            prompt: text,
            provider,
            model,
          },
        });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            data?.answer || 'Aucune réponse reçue du service IA.',
          quota: data?.quota,
        },
      ]);
    } catch (error) {
      setNotice(
        error?.message ||
          'Impossible de contacter la passerelle IA.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setMessages([]);
  }

  return (
    <section className="content-panel ai-chat-page">
      <div className="panel-heading ai-chat-heading">
        <div>
          <span className="eyebrow">
            <Bot size={14} /> ELEMA IA
          </span>
          <h2>Chat IA</h2>
          <p>
            Discute avec les modèles accessibles par la passerelle Elema.
          </p>
        </div>

        {session && (
          <button
            className="secondary-button"
            onClick={signOut}
          >
            <LogOut size={15} /> Déconnexion
          </button>
        )}
      </div>

      {!session ? (
        <form className="ai-login-form" onSubmit={signIn}>
          <p>
            Connecte-toi avec un compte Elema existant pour utiliser
            le service IA.
          </p>

          <label htmlFor="ai-email">Adresse e-mail</label>
          <input
            id="ai-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="ai-password">Mot de passe</label>
          <input
            id="ai-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button className="primary-button" type="submit">
            <LogIn size={16} /> Se connecter
          </button>

          <small>
            Cette page utilise l’authentification Supabase existante.
          </small>
        </form>
      ) : (
        <>
          <div className="ai-controls">
            <label>
              Fournisseur
              <select
                value={provider}
                onChange={(event) => {
                  const next = event.target.value;
                  setProvider(next);
                  setModel(
                    next === 'groq'
                      ? 'llama-3.3-70b-versatile'
                      : 'gemini-2.5-flash'
                  );
                }}
              >
                <option value="groq">Groq</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </label>

            <label>
              Identifiant du modèle
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                maxLength={120}
                required
              />
            </label>
          </div>

          <div className="ai-messages" aria-live="polite">
            {messages.length === 0 && (
              <div className="ai-empty">
                <Bot size={27} />
                <strong>Que veux-tu demander à Elema ?</strong>
                <p>
                  Choisis ton fournisseur et écris ton premier message.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                className={`ai-message ai-message-${message.role}`}
                key={index}
              >
                <strong>
                  {message.role === 'user' ? 'Toi' : 'Elema IA'}
                </strong>
                <p>{message.content}</p>

                {message.quota && (
                  <small>
                    Requêtes utilisées : {message.quota.used ?? '—'}
                    {' / '}
                    {message.quota.limit ?? '—'}
                  </small>
                )}
              </div>
            ))}

            {busy && (
              <div className="ai-loading">
                <LoaderCircle size={17} />
                Elema prépare une réponse…
              </div>
            )}
          </div>

          <form className="ai-composer" onSubmit={sendMessage}>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Écris ton message…"
              maxLength={12000}
              rows={3}
              disabled={busy}
              required
            />

            <button
              className="primary-button"
              type="submit"
              disabled={busy || !prompt.trim()}
            >
              <Send size={16} /> Envoyer
            </button>
          </form>
        </>
      )}

      {notice && (
        <p className="ai-notice" role="alert">
          {notice}
        </p>
      )}
    </section>
  );
}
