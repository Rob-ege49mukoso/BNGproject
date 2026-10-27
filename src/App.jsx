
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Boxes,
  Check,
  ChevronRight,
  Code2,
  Command,
  CreditCard,
  Database,
  Globe,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Plus,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import ChatPage from './ChatPage';
import AuthPage from './AuthPage';
import { supabase } from './lib/supabase';

const navigation = [
  { id: 'overview', label: 'Vue générale', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat IA', icon: MessageSquare },
  { id: 'apis', label: 'Mes API', icon: Code2 },
  { id: 'agents', label: 'Agents IA', icon: Bot },
  { id: 'apps', label: 'Applications', icon: Boxes },
];

const initialProjects = {
  apis: [],
  agents: [],
  apps: [],
};

const projectConfig = {
  apis: {
    title: 'Mes API',
    subtitle: 'Crée et organise tes interfaces de programmation.',
    singular: 'API',
    description: 'Décris ce que ton API doit faire.',
    placeholder: 'Ex. : une API pour gérer les produits d’une boutique',
    icon: Code2,
  },
  agents: {
    title: 'Agents IA',
    subtitle: 'Prépare des agents pour automatiser tes tâches.',
    singular: 'agent IA',
    description: 'Quel travail ton agent doit-il accomplir ?',
    placeholder: 'Ex. : un agent qui classe et résume les documents',
    icon: Bot,
  },
  apps: {
    title: 'Applications',
    subtitle: 'Organise les applications que tu veux construire.',
    singular: 'application',
    description: 'Décris ton idée d’application.',
    placeholder: 'Ex. : une application de gestion de stock',
    icon: Boxes,
  },
};

function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Accueil Elema API">
      <span className="brand-icon"><Command size={21} /></span>
      <span>elema<span className="brand-light"> API</span></span>
    </button>
  );
}

function Sidebar({ page, setPage, open, close }) {
  return (
    <>
      {open && <button className="mobile-overlay" onClick={close} aria-label="Fermer le menu" />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Brand onClick={() => { setPage('overview'); close(); }} />
          <button className="icon-button mobile-close" onClick={close} aria-label="Fermer le menu">
            <X size={20} />
          </button>
        </div>

        <div className="workspace">
          <span className="workspace-mark">E</span>
          <span className="workspace-text">
            <strong>Mon espace</strong>
            <small>Offre gratuite</small>
          </span>
          <ChevronRight size={16} className="muted-icon" />
        </div>

        <p className="nav-heading">ESPACE DE TRAVAIL</p>
        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'nav-active' : ''}`}
                onClick={() => { setPage(item.id); close(); }}
              >
                <Icon size={19} />
                <span>{item.label}</span>
                {page === item.id && <span className="nav-indicator" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="usage-card">
            <div className="usage-heading"><Sparkles size={16} /> Plan de départ</div>
            <p>Construis ton espace avant de connecter tes services.</p>
            <div className="usage-track"><span /></div>
            <small>Prototype local — aucune consommation API mesurée</small>
          </div>
          <button className="nav-item settings-link" onClick={() => { setPage('settings'); close(); }}>
            <Settings size={19} /><span>Paramètres</span>
          </button>
          <div className="user-row">
            <div className="avatar">E</div>
            <div className="user-info"><strong>Utilisateur</strong><small>Mode prototype</small></div>
            <ShieldCheck size={17} className="muted-icon" />
          </div>
        </div>
      </aside>
    </>
  );
}

function Header({ page, onMenu, onCreate }) {
  const titles = {
    chat: 'Chat IA',
    overview: 'Vue générale',
    apis: 'Mes API',
    agents: 'Agents IA',
    apps: 'Applications',
    settings: 'Paramètres',
  };

  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu} aria-label="Ouvrir le menu">
        <Menu size={21} />
      </button>
      <div className="breadcrumb"><span>Elema API</span><ChevronRight size={15} /><strong>{titles[page] || 'Vue générale'}</strong></div>
      <button className="primary-button header-create" onClick={onCreate}>
        <Plus size={17} /><span>Créer</span>
      </button>
    </header>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-icon"><Icon size={20} /></span>
        <span className="stat-detail">{detail}</span>
      </div>
      <p className="stat-label">{label}</p>
      <strong className="stat-value">{value}</strong>
    </div>
  );
}

function EmptyProjects({ type, onCreate }) {
  const config = projectConfig[type];
  const Icon = config.icon;

  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={27} /></div>
      <h3>Aucun élément pour le moment</h3>
      <p>Commence par décrire ton projet. Tu pourras ensuite préparer sa configuration.</p>
      <button className="primary-button" onClick={onCreate}><Plus size={17} /> Créer {config.singular}</button>
    </div>
  );
}

function ProjectList({ projects, onOpen }) {
  if (!projects.length) return null;

  return (
    <div className="project-list">
      {projects.map((project) => {
        const Icon = projectConfig[project.type].icon;
        return (
          <button className="project-row" key={project.id} onClick={() => onOpen(project)}>
            <span className="project-icon"><Icon size={20} /></span>
            <span className="project-info">
              <strong>{project.name}</strong>
              <small>{project.description}</small>
            </span>
            <span className="project-status">Brouillon</span>
            <ChevronRight size={17} className="muted-icon" />
          </button>
        );
      })}
    </div>
  );
}

function Overview({ projects, setPage, onCreate }) {
  const total = projects.apis.length + projects.agents.length + projects.apps.length;
  const recent = [...projects.apis, ...projects.agents, ...projects.apps].slice(-4).reverse();

  return (
    <>
      <section className="welcome-panel">
        <div className="welcome-content">
          <span className="eyebrow"><Sparkles size={14} /> TON ESPACE DE CRÉATION</span>
          <h1>Tout commence par <span>une idée.</span></h1>
          <p>Prépare tes API, tes agents IA et tes applications depuis un seul espace de travail.</p>
          <button className="welcome-button" onClick={onCreate}><Plus size={18} /> Nouveau projet</button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-core"><Command size={42} /></div>
          <div className="art-node node-one"><Code2 size={21} /></div>
          <div className="art-node node-two"><Bot size={21} /></div>
          <div className="art-node node-three"><Boxes size={21} /></div>
        </div>
      </section>

      <div className="section-heading">
        <div><h2>Vue d’ensemble</h2><p>Les éléments de ce prototype sur cet appareil.</p></div>
      </div>

      <section className="stats-grid">
        <StatCard icon={Code2} label="API créées" value={projects.apis.length} detail="Brouillons" />
        <StatCard icon={Bot} label="Agents IA" value={projects.agents.length} detail="Brouillons" />
        <StatCard icon={Boxes} label="Applications" value={projects.apps.length} detail="Brouillons" />
        <StatCard icon={Activity} label="Projets au total" value={total} detail="Sur cet appareil" />
      </section>

      <section className="content-panel">
        <div className="panel-heading">
          <div><h2>Accès rapide</h2><p>Choisis ce que tu veux préparer.</p></div>
        </div>
        <div className="quick-grid">
          {navigation.slice(1).map((item) => {
            const Icon = item.icon;
            return (
              <button className="quick-card" key={item.id} onClick={() => setPage(item.id)}>
                <span className="quick-icon"><Icon size={22} /></span>
                <strong>{item.label}</strong>
                <small>{item.id === 'apis' ? 'Préparer une interface API' : item.id === 'agents' ? 'Définir une mission IA' : 'Organiser une idée d’application'}</small>
                <ChevronRight size={17} className="quick-arrow" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="content-panel">
        <div className="panel-heading">
          <div><h2>Projets récents</h2><p>Retrouve les éléments que tu as préparés.</p></div>
        </div>
        {recent.length ? (
          <ProjectList projects={recent} onOpen={(project) => setPage(project.type)} />
        ) : (
          <div className="recent-empty"><span className="recent-icon"><Rocket size={21} /></span><div><strong>Ton espace est prêt à démarrer</strong><p>Les projets que tu créeras apparaîtront ici.</p></div></div>
        )}
      </section>
    </>
  );
}

function ProjectsPage({ type, projects, onCreate, onOpen }) {
  const config = projectConfig[type];
  return (
    <>
      <div className="page-intro">
        <div><span className="eyebrow"><Sparkles size={14} /> ELEMA API</span><h1>{config.title}</h1><p>{config.subtitle}</p></div>
        <button className="primary-button" onClick={onCreate}><Plus size={17} /> Créer</button>
      </div>
      <section className="content-panel">
        <div className="panel-heading">
          <div><h2>Ton espace</h2><p>{projects[type].length} élément(s) enregistré(s) dans ce prototype.</p></div>
        </div>
        {projects[type].length ? <ProjectList projects={projects[type]} onOpen={onOpen} /> : <EmptyProjects type={type} onCreate={onCreate} />}
      </section>
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <div className="page-intro"><div><span className="eyebrow">CONFIGURATION</span><h1>Paramètres</h1><p>Informations sur la version actuelle.</p></div></div>
      <section className="content-panel settings-panel">
        <div className="setting-row"><span className="setting-icon"><Database size={19} /></span><div><strong>Base de données</strong><p>Supabase n’est pas encore relié à cette interface.</p></div><span className="status-pill">À configurer</span></div>
        <div className="setting-row"><span className="setting-icon"><Bot size={19} /></span><div><strong>Fournisseur IA</strong><p>Aucun modèle IA n’est encore connecté.</p></div><span className="status-pill">À configurer</span></div>
        <div className="setting-row"><span className="setting-icon"><Globe size={19} /></span><div><strong>Publication</strong><p>Cette interface doit encore être compilée et déployée.</p></div><span className="status-pill">À faire</span></div>
        <div className="setting-row"><span className="setting-icon"><CreditCard size={19} /></span><div><strong>Abonnements</strong><p>Le système de paiement n’est pas encore activé.</p></div><span className="status-pill">À configurer</span></div>
      </section>
    </>
  );
}

function CreateModal({ type, onTypeChange, onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const config = projectConfig[type];

  function submit(event) {
    event.preventDefault();
    if (!name.trim() || !description.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), type });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="create-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><div><span className="eyebrow">NOUVEAU PROJET</span><h2 id="modal-title">Que veux-tu créer ?</h2></div><button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div>
        <div className="type-selector">
          {Object.entries(projectConfig).map(([id, item]) => {
            const Icon = item.icon;
            return <button key={id} className={`type-option ${type === id ? 'type-selected' : ''}`} onClick={() => onTypeChange(id)}><Icon size={20} /><span>{item.singular}</span>{type === id && <Check size={15} />}</button>;
          })}
        </div>
        <form onSubmit={submit}>
          <label htmlFor="project-name">Nom du projet</label>
          <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex. : Mon premier projet" maxLength={80} required autoFocus />
          <label htmlFor="project-description">{config.description}</label>
          <textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={config.placeholder} maxLength={1000} rows={4} required />
          <p className="form-note">Prototype uniquement : ce projet sera enregistré dans la mémoire de cette page, pas dans un compte en ligne.</p>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button"><Plus size={17} /> Préparer le projet</button></div>
        </form>
      </section>
    </div>
  );
}

function ProjectDetail({ project, onBack }) {
  const config = projectConfig[project.type];
  const Icon = config.icon;
  return (
    <section className="content-panel detail-panel">
      <button className="back-link" onClick={onBack}>← Retour à la liste</button>
      <span className="detail-icon"><Icon size={27} /></span>
      <span className="status-pill">Brouillon local</span>
      <h1>{project.name}</h1>
      <p>{project.description}</p>
      <div className="notice-box"><Sparkles size={18} /><div><strong>Prochaine étape</strong><p>La configuration réelle, la génération et la publication seront ajoutées dans les prochaines étapes du développement.</p></div></div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Erreur de session :', error.message);
      }
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [page, setPage] = useState('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('apis');
  const [projects, setProjects] = useState(initialProjects);
  const [selectedProject, setSelectedProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function openCreate(type = null) {
    setModalType(type || (page in projectConfig ? page : 'apis'));
    setModalOpen(true);
  }

  function saveProject(data) {
    const project = { ...data, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
    setProjects((current) => ({ ...current, [data.type]: [...current[data.type], project] }));
    setModalOpen(false);
    setSelectedProject(project);
    setPage(data.type);
  }  
  
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement de votre session Elema...</p>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p>
          Configuration Supabase manquante. Vérifiez les variables
          VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY.
        </p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onAuthenticated={setSession} />;
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} open={menuOpen} close={() => setMenuOpen(false)} />
      <main className="main-area">
        <Header page={page} onMenu={() => setMenuOpen(true)} onCreate={() => openCreate()} />
        <div className="page-content">
          {selectedProject ? (
            <ProjectDetail project={selectedProject} onBack={() => setSelectedProject(null)} />
          ) : page === 'overview' ? (
            <Overview projects={projects} setPage={setPage} onCreate={() => openCreate()} />
          ) : page in projectConfig ? (
            <ProjectsPage type={page} projects={projects} onCreate={() => openCreate(page)} onOpen={setSelectedProject} />
          ) : page === 'chat' ? (
            <ChatPage />
          ) : (
            <SettingsPage />
          )}
          <footer className="app-footer"><span>Elema API <span className="footer-dot">•</span> Prototype v0.1</span><span>Conçu pour évoluer</span></footer>
        </div>
      </main>
      {modalOpen && <CreateModal type={modalType} onTypeChange={setModalType} onClose={() => setModalOpen(false)} onSave={saveProject} />}
    </div>
  );
}
