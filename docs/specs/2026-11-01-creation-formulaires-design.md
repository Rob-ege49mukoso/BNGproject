
Conception — Formulaires intelligents et catalogue IA d'Elema API

1. Objectif

Simplifier la création d'API, d'agents IA et d'applications, même pour les débutants, tout en donnant aux utilisateurs expérimentés accès aux réglages avancés.

2. Principes communs

- Nom et description obligatoires pour les trois formulaires.
- Tous les autres paramètres facultatifs.
- Configuration automatique à partir du nom et de la description.
- Valeurs par défaut adaptées aux débutants.
- Réglages avancés accessibles aux utilisateurs expérimentés.
- Conservation des fichiers, données et fonctionnalités existants.

3. Formulaire API

Champs obligatoires :

- Nom
- Description

Champs facultatifs :

- Méthode HTTP (GET par défaut)
- Route (/ par défaut)
- Réponse JSON
- Paramètres avancés

4. Formulaire Agent IA

Champs obligatoires :

- Nom
- Description

Champs facultatifs :

- Instructions personnalisées
- Fournisseur IA
- Modèle IA
- Configuration avancée

5. Formulaire Application

Champs obligatoires :

- Nom
- Description

Champs facultatifs :

- Cahier des charges
- Images et fichiers de référence
- Technologies souhaitées
- Paramètres avancés

6. Fournisseurs IA

Conserver les deux intégrations existantes :

OpenRouter

- Accès à plusieurs fournisseurs et modèles.
- Récupération dynamique du catalogue disponible.
- Identification des modèles et de leurs capacités.
- Consultation des tarifs disponibles.

Google Gemini API

- Accès direct aux modèles Gemini.
- Conservation de l'intégration existante.
- Identification des modèles disponibles.
- Consultation des capacités et tarifs disponibles.

Les deux fournisseurs doivent fonctionner indépendamment.

7. Catalogue des modèles IA

Catégories souhaitées :

- Généralistes
- Code et développement
- Raisonnement avancé
- Analyse de documents
- Multimédia

Fonctionnalités :

- Récupération dynamique des modèles.
- Affichage du fournisseur et de l'identifiant.
- Affichage des capacités et tarifs lorsqu'ils sont disponibles.
- Détection des modèles indisponibles.
- Gestion des doublons entre fournisseurs.
- Choix manuel du modèle.
- Recommandation automatique du modèle adapté à la tâche.

La catégorie Code et développement doit privilégier les modèles spécialisés en programmation.

8. Configuration automatique

Elema doit pouvoir proposer une configuration initiale à partir du nom et de la description.

L'utilisateur pourra ensuite modifier les paramètres facultatifs.

9. Contraintes techniques

- Ne pas réintégrer OpenRouter ni Gemini.
- Inspecter les fichiers avant toute modification.
- Ne pas remplacer aveuglément les fichiers existants.
- Ne pas modifier le schéma Supabase sans autorisation.
- Préserver les tables, données et règles RLS.
- Ne pas exposer les clés API côté client.
- Ne pas présenter une fiche API comme un endpoint opérationnel avant sa génération et son déploiement réels.
- Privilégier les solutions gratuites lorsque possible.

10. Ordre de réalisation

1. Formulaire API.
2. Formulaire Agent IA.
3. Formulaire Application.
4. Catalogue dynamique OpenRouter et Gemini.
5. Catégories et recommandations de modèles.
6. Tests et vérifications.
