# Conception — Quota partagé et basculement IA

- **Projet :** Elema API
- **Branche cible :** `elema-api-starter`
- **Date :** 2026-10-28
- **Statut :** conception à relire — aucune implémentation autorisée par ce document
- **Périmètre :** quota quotidien des requêtes IA, basculement entre fournisseurs et extensibilité de l’architecture.

## 1. Objectifs

1. Conserver un quota partagé entre les fournisseurs IA, notamment Groq et Gemini.
2. Compter une seule requête consommée lorsqu’un basculement de fournisseur réussit.
3. Ne pas consommer de quota si tous les fournisseurs essayés échouent.
4. Éviter qu’un grand nombre de requêtes simultanées dépasse le quota autorisé.
5. Faciliter l’ajout futur de fournisseurs, de modèles, de règles de secours et de forfaits.
6. Préserver les forfaits et limites existants sans modification non approuvée.

## 2. Principes de conception

- **Modules à responsabilités distinctes :** validation de la requête, lecture du forfait et du quota, réservation atomique, appel au fournisseur, décision de basculement, finalisation de la consommation et réponse à l’interface.
- **Configuration centralisée :** maintenir les modèles par défaut et les règles de secours dans un emplacement clair et documenté, plutôt que de les disperser dans plusieurs composants.
- **Adaptateurs de fournisseurs :** isoler les différences entre Groq, Gemini et tout fournisseur futur derrière une interface commune.
- **Évolution compatible :** ajouter un fournisseur sans devoir réécrire la logique de quota ou l’interface entière.
- **Changements contrôlés :** migrations SQL préparées dans le dépôt, mais jamais exécutées sans autorisation distincte ; aucun déploiement sans approbation explicite.

## 3. Flux prévu d’une requête

1. Vérifier la session, le contenu de la requête et le fournisseur/modèle demandé.
2. Déterminer le forfait actif et sa limite quotidienne.
3. Réserver atomiquement une unité de quota afin que deux requêtes simultanées ne puissent pas réserver la dernière unité en double.
4. Appeler le fournisseur et le modèle choisis par l’utilisateur.
5. Si la réponse est valide, confirmer la consommation d’une unité.
6. Si l’échec est temporaire et admissible au basculement, essayer le fournisseur de secours configuré avec son modèle par défaut.
7. Si le secours réussit, confirmer une seule unité consommée au total.
8. Si tous les fournisseurs admissibles échouent, libérer la réservation et ne compter aucune requête réussie.
9. Retourner à l’interface le résultat, le modèle réellement utilisé, l’état du basculement et les informations de quota disponibles.

La réservation doit avoir un état et une stratégie de nettoyage en cas d’interruption afin qu’une requête abandonnée ne bloque pas indéfiniment une unité de quota. Les détails de cette stratégie seront fixés dans le plan technique.

## 4. Règles de basculement

### Échecs pouvant déclencher un secours

- limitation temporaire du fournisseur (HTTP 429) ;
- panne temporaire ou erreur serveur (HTTP 5xx) ;
- délai d’attente dépassé ;
- réponse vide ou inutilisable, après validation.

### Échecs qui ne doivent pas déclencher automatiquement un secours

- session ou authentification invalide ;
- requête invalide ou prompt trop long ;
- quota épuisé ;
- identifiant de modèle invalide ;
- configuration ou clé d’API manquante ou invalide, sauf décision technique ultérieure documentée.

Le secours ne doit pas être déclenché simplement parce qu’un autre modèle existe. Il est réservé aux erreurs admissibles. Le fournisseur de secours doit être configuré et disponible ; son modèle par défaut doit être défini dans la configuration.

## 5. Quotas et forfaits

Le quota reste exprimé en **nombre de requêtes réussies par jour**, sans pondération selon le modèle ou le nombre de tokens.

Les valeurs actuelles à préserver sont :

| Forfait | Limite quotidienne |
|---|---:|
| Free | 100 requêtes |
| Premium Launch | 1 000 requêtes |
| Premium | 2 000 requêtes |
| Premium Plus | 5 000 requêtes |

Ces limites sont des valeurs existantes à conserver, et non une autorisation de modifier les données de production. Le changement manuel de modèle ne réinitialise pas le quota.

## 6. Architecture prévue

### Fonction Edge ai-gateway

Elle orchestre l’authentification, la validation, la réservation atomique, les appels aux fournisseurs, le basculement et la finalisation de la consommation. Elle ne doit pas contenir une logique différente du quota pour chaque fournisseur.

### Couche d’adaptation des fournisseurs

Chaque fournisseur expose une interface commune pour envoyer une requête et normaliser la réponse ou l’erreur. Les règles de secours utilisent les catégories d’erreurs normalisées plutôt que des vérifications dispersées dans le code.

### Interface src/ChatPage.jsx

L’interface doit afficher le résultat, le fournisseur/modèle réellement utilisé, un message clair lorsque le secours a été activé, ainsi que les informations de quota retournées par le serveur. Le serveur reste l’autorité pour le calcul et l’application du quota.

### Migration SQL proposée

Une migration versionnée ajoutera le mécanisme nécessaire à la réservation atomique et à sa finalisation/libération. Elle sera préparée comme fichier dans le dépôt, mais ne sera **pas exécutée dans Supabase** dans le cadre de cette étape.

## 7. Fichiers envisagés

- `supabase/functions/ai-gateway/index.ts` — orchestration du flux et des erreurs.
- `supabase/migrations/20261028_atomic_ai_quota.sql` — mécanisme SQL de réservation atomique, à adapter à la structure finale du dépôt.
- `src/ChatPage.jsx` — affichage du modèle réellement utilisé, du secours et du quota.
- Éventuels modules dédiés aux adaptateurs et à la configuration des fournisseurs, uniquement si la structure actuelle les justifie.

Le dépôt ne contient actuellement pas de dossier `supabase/` ; la structure exacte devra donc être vérifiée avant d’ajouter les fichiers d’implémentation.

## 8. Vérifications à prévoir

- Le quota est partagé entre Groq et Gemini.
- Changer manuellement de modèle ne réinitialise pas le quota.
- Un secours réussi compte une seule requête.
- L’échec de tous les fournisseurs ne consomme aucune requête.
- Des requêtes simultanées ne peuvent pas dépasser la limite.
- Les erreurs d’authentification, de validation et de quota ne déclenchent pas de secours inapproprié.
- Les limites actuelles des forfaits restent inchangées.
- L’interface identifie correctement le modèle utilisé et le recours au secours.
- Les erreurs de réservation, les interruptions et les réservations expirées sont gérées sans fuite permanente de quota.

## 9. Hors périmètre et garde-fous

- Aucun changement de schéma ou de données Supabase n’est exécuté à cette étape.
- Aucune fonction Edge n’est déployée à cette étape.
- Aucune modification de la branche main.
- Aucun système de crédits pondérés par tokens ou par modèle.
- Aucun basculement automatique uniquement parce qu’un autre modèle est disponible.
- Aucun changement de forfait, de facturation ou d’abonnement.

## 10. Étape suivante

Relire ce document et confirmer les éventuelles corrections. Après validation du document, préparer un plan d’implémentation détaillé avec l’ordre des changements, les interfaces entre modules, les migrations et les tests. L’implémentation et tout changement externe nécessiteront une autorisation distincte.
