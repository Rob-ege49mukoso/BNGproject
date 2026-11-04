
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
 import "./app.css";
 import { supabase } from "./lib/supabase.js";

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
  const [settingsTab, setSettingsTab] = useState("general");
  const [menuOpen, setMenuOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState("");
  const [chatProvider, setChatProvider] = useState("groq");
  const [chatModel, setChatModel] = useState("llama-3.3-70b-versatile");
  const [sendingMessage, setSendingMessage] = useState(false);
 const modelsByProvider = {
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant"
  ],
  gemini: [
    "gemini-2.5-flash",
    "gemini-2.5-pro"
  ],
  openrouter: [
    "openrouter/auto"
  ]
};
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
const [apiMethod, setApiMethod] = useState("GET");
const [apiRoute, setApiRoute] = useState("/");
const [apiResponseJson, setApiResponseJson] = useState("{}");
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

  async function sendMessage() {
  const text = prompt.trim();
  if (!text || sendingMessage) return;

  setMessages(previous => [
    ...previous,
    { role: "user", content: text }
  ]);

  setPrompt("");
  setNotice("");
  setSendingMessage(true);

    try {
    // Vérifier la session Supabase
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session?.access_token) {
      throw new Error(
        "Aucune session Supabase active. Reconnecte-toi."
      );
    }

    // Appeler le moteur IA
    const { data, error } = await supabase.functions.invoke(
      "ai-gateway",
      {
        body: {
          prompt: text,
          provider: chatProvider,
          model: chatModel
        }
      }
    );
   

    if (error) {
      throw new Error(error.message || "Erreur du service IA.");
    }

    if (!data?.success || typeof data.answer !== "string") {
      throw new Error(data?.error || "Réponse IA invalide.");
    }

    setMessages(previous => [
      ...previous,
      {
        role: "assistant",
        content: data.answer,
        provider: data.provider,
        model: data.model
      }
    ]);

    setNotice(
      `Modèle : ${data.model} · Requêtes restantes : ${data.quota?.remaining ?? "inconnues"}`
    );

  } catch (error) {
    setMessages(previous => [
      ...previous,
      {
        role: "assistant",
        content: `Erreur : ${error.message}`,
        isError: true
      }
    ]);
  } finally {
    setSendingMessage(false);
  }
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

         let parsedResponseJson = {};

  if (type === "api" && apiResponseJson.trim()) {
    try {
      parsedResponseJson = JSON.parse(apiResponseJson);
    } catch {
      setProjectsError("La réponse JSON est invalide. Vérifie sa syntaxe.");
      return;
    }
  }
    
    try {
    setSavingProject(true);
    setProjectsError("");

    const createdProject = await createProject({
  name: suggestedName,
  description,
  type,
  config: type === "api" ? {
    method: apiMethod,
    route: apiRoute.trim() || "/",
    response_json: parsedResponseJson
  } : {}
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
  
  async function handleDeleteProject(project) {
  const confirmed = window.confirm(
    `Voulez-vous vraiment supprimer "${project.name}" ? Cette action est irréversible.`
  );

  if (!confirmed) return;

  try {
    setProjectsError("");

    await deleteProject(project.id);

    setProjects(previous =>
      previous.filter(item => item.id !== project.id)
    );

    setNotice("Projet supprimé avec succès.");
  } catch (error) {
    setProjectsError(
      error.message || "Impossible de supprimer ce projet."
    );
  }
  }
  
  const isChat = active === "Chat IA";

  const isSettings = active === "Paramètres";

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

              {(active === "API" ||
        (active === "Mes projets" && projectType === "api")) && (
        <>
          <label>Méthode HTTP</label>
          <select
            value={apiMethod}
            onChange={e => setApiMethod(e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <label>Route de l'API</label>
          <input
            value={apiRoute}
            onChange={e => setApiRoute(e.target.value)}
            placeholder="/"
          />

          <label>Réponse JSON</label>
          <textarea
            value={apiResponseJson}
            onChange={e => setApiResponseJson(e.target.value)}
            placeholder="{}"
          />
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
          {isSettings ? (
  <section className="workspace-dashboard">
    <div className="eyebrow">
      <Settings2 size={16} /> CONFIGURATION
    </div>

    <h1>Paramètres <span>Elema</span></h1>
    <p className="welcome-description">
      Personnalise ton espace de travail.
    </p>

    <div className="settings-panel">
      <h2>Apparence</h2>
      <p>Choisis le thème de ton interface.</p>

      <div className="settings-actions">
        <button onClick={() => setTheme("dark")}>
          <Moon size={17} /> Mode sombre
        </button>

        <button onClick={() => setTheme("light")}>
          <Sun size={17} /> Mode clair
        </button>
      </div>
    </div>

    <div className="settings-panel">
      <h2>Compte</h2>
      <p>Gère ta session Elema.</p>

      <button
        className="secondary-button"
        onClick={onSignOut}
      >
        <LogOut size={17} /> Se déconnecter
      </button>
    </div>
  </section>
  ) : isChat ? (
  <section className="workspace-dashboard">  
              <div className="eyebrow"><Sparkles size={15} /> ELEMA INTELLIGENCE</div>
              <h1>Ton idée. <span>Son potentiel.</span></h1>
              <p className="welcome-description">
                Prépare tes questions et construis avec l'aide de l'IA.
              </p>

              <div className="chat-panel">
                <div className="chat-header">
                  <span className="chat-avatar"><Bot size={24} /></span>
                  <div><strong>Assistant Elema</strong>
                     <small>Chat IA · Connecté au moteur IA</small></div>
                </div>
                <div className="chat-model-controls">
  <label>
    Fournisseur IA
    <select
      value={chatProvider}
      disabled={sendingMessage}
      onChange={e => {
        const provider = e.target.value;
        setChatProvider(provider);
        setChatModel(modelsByProvider[provider][0]);
      }}
    >
      <option value="groq">Groq</option>
      <option value="gemini">Google Gemini</option>
      <option value="openrouter">OpenRouter</option>
    </select>
  </label>

  <label>
    Modèle IA
    <select
      value={chatModel}
      disabled={sendingMessage}
      onChange={e => setChatModel(e.target.value)}
    >
      {modelsByProvider[chatProvider].map(model => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  </label>
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
  <div
    className={
      message.role === "assistant"
        ? "message-assistant"
        : "message-user"
    }
    key={index}
  >
    <span>
      {message.role === "assistant" ? "Elema IA" : "Toi"}
    </span>
    <p>{message.content}</p>
    {message.provider && (
      <small>{message.provider} · {message.model}</small>
    )}
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
                   <button
  className="send-button"
  type="submit"
  aria-label="Envoyer le message"
  disabled={sendingMessage || !prompt.trim()}
>
  {sendingMessage ? "…" : <Send size={19} />}
</button>
                </form>
                <p className="chat-disclaimer">
                   Elema IA utilise ses fournisseurs de modèles connectés.
                </p>
              </div>
</section>
) : active === "API" ? (
  <section className="workspace-dashboard">
    <div className="eyebrow">
      <Code2 size={16} /> ESPACE API
    </div>

    <h1>Gestion de tes <span>API</span></h1>
    <p className="welcome-description">
      Crée, configure et gère tes interfaces de programmation.
    </p>

    <button
      className="primary-button"
      onClick={() => setShowCreateForm(true)}
    >
      <Plus size={18} /> Créer une API
    </button>

    <section className="section-heading">
      <div>
        <h2>Mes API</h2>
        <p>Gère les API enregistrées dans ton espace.</p>
      </div>
    </section>

    {loadingProjects ? (
      <p>Chargement...</p>
    ) : apiProjects.length === 0 ? (
      <p>Aucune API créée pour le moment.</p>
    ) : (
      <div className="projects-grid">
        {apiProjects.map(project => (
          <article className="project-card" key={project.id}>
            <Code2 size={22} />
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <span>{project.status || "Brouillon"}</span>

            <button
              type="button"
              onClick={() => handleDeleteProject(project)}
            >
              Supprimer
            </button>
          </article>
        ))}
      </div>
    )}
         </section>
) : active === "Agents IA" ? (
  <section className="workspace-dashboard">
    <div className="eyebrow">
      <Bot size={16} /> ESPACE AGENTS IA
    </div>

    <h1>Crée tes <span>agents intelligents</span></h1>

    <p className="welcome-description">
      Configure des assistants IA adaptés à tes besoins.
    </p>

    <button
      className="primary-button"
      onClick={() => setShowCreateForm(true)}
    >
      <Plus size={18} /> Créer un agent
    </button>

    <section className="section-heading">
      <div>
        <h2>Mes agents IA</h2>
        <p>Tes assistants enregistrés.</p>
      </div>
    </section>

    {loadingProjects ? (
      <p>Chargement...</p>
    ) : aiAgents.length === 0 ? (
      <p>Aucun agent créé pour le moment.</p>
    ) : (
      <div className="projects-grid">
        {aiAgents.map(project => (
          <article className="project-card" key={project.id}>
            <Bot size={22} />
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <span>{project.model || "Modèle IA"}</span>

            <button
              type="button"
              onClick={() => handleDeleteProject(project)}
            >
              Supprimer
            </button>
          </article>
        ))}
      </div>
    )}
         </section>
) : active === "Applications" ? (
  <section className="workspace-dashboard">
    <div className="eyebrow">
      <Activity size={16} /> ESPACE APPLICATIONS
    </div>

    <h1>Crée tes <span>applications</span></h1>

    <p className="welcome-description">
      Imagine, construis et organise tes applications.
    </p>

    <button
      className="primary-button"
      onClick={() => setShowCreateForm(true)}
    >
      <Plus size={18} /> Créer une application
    </button>

    <section className="section-heading">
      <div>
        <h2>Mes applications</h2>
        <p>Tes applications enregistrées.</p>
      </div>
    </section>

    {loadingProjects ? (
      <p>Chargement...</p>
    ) : appProjects.length === 0 ? (
      <p>Aucune application créée pour le moment.</p>
    ) : (
      <div className="projects-grid">
        {appProjects.map(project => (
          <article className="project-card" key={project.id}>
            <Activity size={22} />
            <h3>{project.name}</h3>
            <p>{project.description}</p>
            <span>{project.status || "Brouillon"}</span>

            <button
              type="button"
              onClick={() => handleDeleteProject(project)}
            >
              Supprimer
            </button>
          </article>
        ))}
      </div>
    )}
         </section>
) : active === "Mes projets" ? (
  <section className="workspace-dashboard">
    <div className="eyebrow">
      <FolderKanban size={16} /> ESPACE PROJETS
    </div>

    <h1>Tous tes <span>projets</span></h1>

    <p className="welcome-description">
      Retrouve et organise toutes tes créations au même endroit.
    </p>

    <button
      className="primary-button"
      onClick={() => setShowCreateForm(true)}
    >
      <Plus size={18} /> Nouveau projet
    </button>

    <section className="section-heading">
      <div>
        <h2>Mes créations</h2>
        <p>{projects.length} projet(s) enregistré(s).</p>
      </div>
    </section>

    {projectsError && (
      <p className="error-message">{projectsError}</p>
    )}

    {loadingProjects ? (
      <p>Chargement des projets...</p>
    ) : projects.length === 0 ? (
      <p>Aucun projet pour le moment. Commence par en créer un !</p>
    ) : (
      <div className="projects-grid">
        {projects.map(project => {
          const Icon = project.type === "api"
            ? Code2
            : project.type === "agent"
              ? Bot
              : Activity;

          const typeLabel = project.type === "api"
            ? "API"
            : project.type === "agent"
              ? "Agent IA"
              : "Application";

          return (
            <article className="project-card" key={project.id}>
              <Icon size={22} />
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <span>{typeLabel}</span>

              <button
                type="button"
                onClick={() => handleDeleteProject(project)}
              >
                Supprimer
              </button>
            </article>
          );
        })}
      </div>
    )}
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
            
