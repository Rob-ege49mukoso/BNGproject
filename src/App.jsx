
import { useEffect, useState } from "react";
import {
  Activity, Bot, ChevronRight, Code2, Command, FolderKanban,
  LayoutDashboard, LogOut, Menu, MessageSquare, Moon, Plus, Send,
  Settings2, Sparkles, Sun, X
} from "lucide-react";
import {
  getProjects,
  createProject,
  deleteProject
} from "./lib/projectStorage.js";

const navItems = [
  { label: "Vue d'ensemble", icon: LayoutDashboard },
  { label: "Mes projets", icon: FolderKanban },
  { label: "API", icon: Code2 },
  { label: "Agents IA", icon: Bot },
  { label: "Applications", icon: Activity },
  { label: "Chat IA", icon: MessageSquare }
];

export default function App({ onSignOut }) {
  const [theme, setTheme] = useState("dark");
  const [active, setActive] = useState("Vue d'ensemble");
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState("");

  // Données réelles des projets
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  // Formulaire de création de projet
const [showCreateForm, setShowCreateForm] = useState(false);
const [projectName, setProjectName] = useState("");
const [projectDescription, setProjectDescription] = useState("");
const [projectType, setProjectType] = useState("api");
const [savingProject, setSavingProject] = useState(false);
  useEffect(() => {
    let activeRequest = true;

    async function loadProjects() {
      try {
        setLoadingProjects(true);
        setProjectsError("");

        const data = await getProjects();

        if (activeRequest) {
          setProjects(data || []);
        }
      } catch (error) {
        if (activeRequest) {
          setProjectsError(
            error.message || "Impossible de charger les projets."
          );
        }
      } finally {
        if (activeRequest) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      activeRequest = false;
    };
  }, []);

  const apiProjects = projects.filter(project => project.type === "api");
  const aiAgents = projects.filter(project => project.type === "agent");
  const appProjects = projects.filter(
    project => project.type === "application"
  );

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

  async function handleCreateProject(e) {
  e.preventDefault();

  const description = projectDescription.trim();

  if (!description) {
    setProjectsError("La description du projet est obligatoire.");
    return;
  }

  const suggestedName = projectName.trim() ||
    description.split(/\s+/).slice(0, 5).join(" ");

  const type =
    active === "API" ? "api" :
    active === "Agents IA" ? "agent" :
    active === "Applications" ? "application" :
    projectType;

  try {
    setSavingProject(true);
    setProjectsError("");

    const createdProject = await createProject({
      name: suggestedName,
      description,
      type
    });

    setProjects(previous => [createdProject, ...previous]);

    setProjectName("");
    setProjectDescription("");
    setShowCreateForm(false);
    setNotice("Projet créé avec succès.");

  } catch (error) {
    setProjectsError(
      error.message || "Impossible de créer le projet."
    );
  } finally {
    setSavingProject(false);
  }
  }
  const isChat = active === "Chat IA";

  const displayedProjects = active === "API"
    ? apiProjects
    : active === "Agents IA"
      ? aiAgents
      : active === "Applications"
        ? appProjects
        : projects;

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
          {showCreateForm && (
  <section className="create-project-panel">
    <div className="section-heading">
      <div>
        <span className="eyebrow">NOUVEAU PROJET</span>
        <h2>Donnez vie à votre idée</h2>
        <p>Décrivez ce que vous souhaitez construire.</p>
      </div>

      <button
        className="icon-button"
        onClick={() => setShowCreateForm(false)}
      >
        <X size={20} />
      </button>
    </div>

    <form onSubmit={handleCreateProject}>
      <label>Nom du projet (facultatif)</label>
      <input
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Ex. Mon application..."
      />

      <label>Description du projet</label>
      <textarea
        value={projectDescription}
        onChange={e => setProjectDescription(e.target.value)}
        placeholder="Décrivez ce que vous voulez créer..."
        required
      />

      {active === "Mes projets" && (
        <>
          <label>Type de projet</label>
          <select
            value={projectType}
            onChange={e => setProjectType(e.target.value)}
          >
            <option value="api">API</option>
            <option value="agent">Agent IA</option>
            <option value="application">Application</option>
          </select>
        </>
      )}

      {projectsError && (
        <p className="error-message">{projectsError}</p>
      )}

      <button type="submit" disabled={savingProject}>
        {savingProject ? "Création..." : "Créer mon projet"}
      </button>
    </form>
  </section>
)}
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
                  onClick={() => {
                    setActive("Mes projets");
                     setShowCreateForm(true);
                    }}>
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

              {projectsError && (
                <p className="chat-notice" role="alert">
                  Erreur de chargement : {projectsError}
                </p>
              )}

              <section className="stats-grid">
                {[
                  { title: "Projets", value: loadingProjects ? "…" : String(projects.length), detail: "Projets enregistrés", icon: FolderKanban, color: "blue" },
                  { title: "API créées", value: loadingProjects ? "…" : String(apiProjects.length), detail: "API enregistrées", icon: Code2, color: "teal" },
                  { title: "Agents IA", value: loadingProjects ? "…" : String(aiAgents.length), detail: "Agents enregistrés", icon: Bot, color: "violet" },
                  { title: "Applications", value: loadingProjects ? "…" : String(appProjects.length), detail: "Applications enregistrées", icon: Activity, color: "amber" }
                ].map(({ title, value, detail, icon: Icon, color }) => (
                  <article className="stat-card" key={title}>
                    <span className={`stat-icon stat-${color}`}><Icon size={20} /></span>
                    <span className="stat-label">{title}</span>
                    <strong>{value}</strong><small>{detail}</small>
                  </article>
                ))}
              </section>

              <section className="section-heading projects-heading">
                <div><h2>{active === "Vue d'ensemble" ? "Tes projets récents" : active}</h2>
                  <p>Les projets enregistrés dans ton espace.</p></div>
                <button className="text-button"
                  onClick={() => setActive("Mes projets")}>
                  Voir les projets <ChevronRight size={16} />
                </button>
              </section>

              {loadingProjects ? (
                <p>Chargement de tes projets...</p>
              ) : (
                <section className="projects-grid">
                  {displayedProjects.length > 0 ? (
                    displayedProjects.map(project => {
                      const Icon = project.type === "api"
                        ? Code2
                        : project.type === "agent"
                          ? Bot
                          : LayoutDashboard;

                      return (
                        <button className="project-card" key={project.id}
                          onClick={() => setActive(
                            project.type === "api"
                              ? "API"
                              : project.type === "agent"
                                ? "Agents IA"
                                : "Applications"
                          )}>
                          <span className={`project-icon project-${project.type === "api" ? "blue" : project.type === "agent" ? "teal" : "violet"}`}>
                            <Icon size={22} />
                          </span>
                          <span className="project-title">{project.name}</span>
                          <span className="project-type">{project.type}</span>
                          <span className="project-footer">
                            {project.status || "En préparation"}
                            <ChevronRight size={17} />
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p>Aucun projet enregistré pour le moment.</p>
                  )}
                </section>
              )}
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
            
