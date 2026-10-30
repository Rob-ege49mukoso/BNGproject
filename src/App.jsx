

import { useState } from "react";
import {
  Activity, Bot, ChevronRight, Code2, Command, FolderKanban,
  LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Plus, Send,
  Settings2, Sparkles, Sun, X
} from "lucide-react";
import "./app.css";

const navItems = [
  { label: "Vue d'ensemble", icon: LayoutDashboard },
  { label: "Mes projets", icon: FolderKanban },
  { label: "API", icon: Code2 },
  { label: "Agents IA", icon: Bot },
  { label: "Chat IA", icon: MessageSquare }
];

export default function App({ onSignOut }) {
  const [theme, setTheme] = useState("dark");
  const [active, setActive] = useState("Vue d'ensemble");
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState("");

  function sendMessage() {
    const text = prompt.trim();
    if (!text) return;

    setMessages(previous => [
      ...previous,
      { role: "user", content: text }
    ]);
    setPrompt("");
    setNotice(
      "Ton message est prêt. La connexion au fournisseur IA sera configurée dans l'étape backend."
    );
  }

  const isChat = active === "Chat IA";

  return (
    <div className="elema-app" data-theme={theme}>
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={e => {
          e.preventDefault();
          setActive("Vue d'ensemble");
        }}>
          <span className="brand-mark"><Command size={23} /></span>
          <span>elema<span className="brand-dot">.</span><small>API PLATFORM</small></span>
          <button className="mobile-close icon-button"
            aria-label="Fermer le menu"
            onClick={e => { e.preventDefault(); setMenuOpen(false); }}>
            <X size={20} />
          </button>
        </a>

        <p className="nav-label">ESPACE DE TRAVAIL</p>
        <div className="workspace-switch">
          <span className="workspace-avatar">E</span>
          <span className="workspace-copy">Mon espace<small>Offre gratuite</small></span>
          <ChevronRight size={16} />
        </div>

        <p className="nav-label">PLATEFORME</p>
        <nav className="navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label}
              className={`nav-item ${active === label ? "nav-active" : ""}`}
              onClick={() => { setActive(label); setMenuOpen(false); }}>
              <Icon size={19} />
              <span>{label}</span>
              {label === "Chat IA" && <span className="nav-new">IA</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <Sparkles size={20} />
            <strong>Une idée en tête ?</strong>
            <p>Transforme ton idée en projet.</p>
            <button onClick={() => setActive("Agents IA")}>
              Découvrir l'IA <ChevronRight size={15} />
            </button>
          </div>
          <button className="nav-item"
            onClick={() => setActive("Paramètres")}>
            <Settings2 size={19} /><span>Paramètres</span>
          </button>
          <button className="nav-item" type="button"
            onClick={onSignOut}>
            <LogOut size={19} /><span>Se déconnecter</span>
          </button>
          <div className="profile">
            <span className="profile-avatar">E</span>
            <span className="profile-copy">Mon compte<small>Bienvenue sur Elema</small></span>
          </div>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-backdrop"
        aria-label="Fermer la navigation"
        onClick={() => setMenuOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-toggle"
            aria-label="Ouvrir le menu"
            onClick={() => setMenuOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumbs">
            Elema <ChevronRight size={15} /> <strong>{active}</strong>
          </div>
          <div className="topbar-actions">
            <span className="status-pill"><span /> Interface active</span>
            <button className="theme-toggle icon-button"
              aria-label="Changer de thème"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </header>

        <div className="page-content">
          {isChat ? (
            <section className="chat-page">
              <div className="eyebrow"><Sparkles size={15} /> ELEMA INTELLIGENCE</div>
              <h1>Ton idée. <span>Son potentiel.</span></h1>
              <p className="welcome-description">
                Prépare tes questions et construis avec l'aide de l'IA.
              </p>

              <div className="chat-panel">
                <div className="chat-header">
                  <span className="chat-avatar"><Bot size={24} /></span>
                  <div><strong>Assistant Elema</strong>
                    <small>Chat IA · Connexion à configurer</small></div>
                </div>
                <div className="chat-messages">
                  {messages.length === 0 ? (
                    <div className="chat-empty">
                      <Sparkles size={30} />
                      <h2>Que veux-tu construire ?</h2>
                      <p>Une API, un agent intelligent ou une application ?</p>
                      <div className="suggestion-list">
                        {["Créer une API REST", "Concevoir un agent IA",
                          "Développer une application"].map(item => (
                          <button key={item} onClick={() => setPrompt(item)}>
                            <Plus size={16} /> {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : messages.map((message, index) => (
                    <div className="message-user" key={index}>
                      <span>Toi</span><p>{message.content}</p>
                    </div>
                  ))}
                  {notice && <p className="chat-notice">{notice}</p>}
                </div>
                <form className="chat-composer" onSubmit={e => {
                  e.preventDefault();
                  sendMessage();
                }}>
                  <textarea value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Décris ton idée ou pose ta question..."
                    aria-label="Message à l'assistant"
                    rows={2}
                  />
                  <button className="send-button" type="submit"
                    aria-label="Envoyer le message">
                    <Send size={19} />
                  </button>
                </form>
                <p className="chat-disclaimer">
                  Le véritable moteur IA sera connecté à l'étape backend.
                </p>
              </div>
            </section>
          ) : (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow"><Sparkles size={15} /> TON ESPACE DE CRÉATION</div>
                  <h1>Imagine. Construis. <span>Déploie.</span></h1>
                  <p className="welcome-description">
                    Tes API, tes agents IA et tes applications dans un seul espace.
                  </p>
                </div>
                <button className="primary-button"
                  onClick={() => setActive("Mes projets")}>
                  <Plus size={18} /> Nouveau projet
                </button>
              </section>

              <section className="hero-panel">
                <div className="hero-copy">
                  <span className="hero-tag"><Sparkles size={14} /> QUANTUM NEON</span>
                  <h2>Le prochain grand projet<br />commence <span>ici.</span></h2>
                  <p>Imagine, crée et fais évoluer tes idées depuis une plateforme unique.</p>
                  <button className="hero-button"
                    onClick={() => setActive("Chat IA")}>
                    Parler à l'IA <ChevronRight size={17} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="hero-core"><Command size={42} /></div>
                  <span className="float-icon float-code"><Code2 size={21} /></span>
                  <span className="float-icon float-bot"><Bot size={22} /></span>
                  <span className="float-icon float-spark"><Sparkles size={20} /></span>
                </div>
              </section>

              <section className="section-heading">
                <div><h2>Ton espace de travail</h2>
                  <p>Tout est prêt pour commencer.</p></div>
              </section>

              <section className="stats-grid">
                {[
                  { title: "Projets", value: "0", detail: "Commence ton premier projet", icon: FolderKanban, color: "blue" },
                  { title: "API créées", value: "0", detail: "Construis tes API", icon: Code2, color: "teal" },
                  { title: "Agents IA", value: "0", detail: "Donne vie à tes idées", icon: Bot, color: "violet" },
                  { title: "Activité", value: "Prêt", detail: "Interface initialisée", icon: Activity, color: "amber" }
                ].map(({ title, value, detail, icon: Icon, color }) => (
                  <article className="stat-card" key={title}>
                    <span className={`stat-icon stat-${color}`}><Icon size={20} /></span>
                    <span className="stat-label">{title}</span>
                    <strong>{value}</strong><small>{detail}</small>
                  </article>
                ))}
              </section>

              <section className="section-heading projects-heading">
                <div><h2>Explore les possibilités</h2>
                  <p>Choisis ce que tu veux construire.</p></div>
                <button className="text-button"
                  onClick={() => setActive("Mes projets")}>
                  Voir les projets <ChevronRight size={16} />
                </button>
              </section>

              <section className="projects-grid">
                {[
                  { name: "Mon premier projet", type: "API REST", icon: Code2, color: "blue" },
                  { name: "Assistant intelligent", type: "Agent IA", icon: Bot, color: "teal" },
                  { name: "Application web", type: "Application", icon: LayoutDashboard, color: "violet" }
                ].map(({ name, type, icon: Icon, color }) => (
                  <button className="project-card" key={name}
                    onClick={() => setActive(type === "Agent IA" ? "Agents IA" : "Mes projets")}>
                    <span className={`project-icon project-${color}`}><Icon size={22} /></span>
                    <span className="project-title">{name}</span>
                    <span className="project-type">{type}</span>
                    <span className="project-footer">En préparation <ChevronRight size={17} /></span>
                  </button>
                ))}
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>elema API <span className="brand-dot">●</span> Construis sans limites.</span>
            <span>Une plateforme en évolution.</span>
          </footer>
        </div>
      </main>
    </div>
  );
                }
                  
