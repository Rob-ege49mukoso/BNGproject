Elema API — Interface responsive et gestion des thèmes

Objectif

Conserver l'interface actuelle d'Elema API et son identité Quantum Neon, tout en l'adaptant aux smartphones, tablettes, ordinateurs et grands écrans.

Ajouter également un bouton fonctionnel pour basculer entre le mode sombre et le mode clair.

1. Navigation mobile

- Conserver la barre latérale actuelle sur ordinateur.
- Ajouter un bouton de menu sur smartphone.
- Permettre d'ouvrir et de fermer le menu.
- Fermer le menu après sélection d'une destination.
- Ne supprimer aucune destination existante.

2. Adaptation des écrans

- Adapter la barre supérieure, les cartes, les formulaires et les tableaux.
- Ajuster les colonnes, marges et espacements.
- Éviter les débordements horizontaux.
- Conserver les fonctionnalités actuelles.
- Adapter les commandes aux écrans tactiles.

3. Mode sombre et mode clair

- Ajouter un bouton de changement de thème.
- Réutiliser les thèmes existants si disponibles.
- Appliquer le changement immédiatement, sans rechargement.
- Conserver le choix de l'utilisateur après actualisation.
- Garantir une bonne lisibilité dans les deux modes.

4. Animations et accessibilité

- Préserver les animations existantes.
- Éviter les effets trop coûteux sur les smartphones.
- Garder des commandes accessibles et faciles à utiliser.

5. Contraintes

- Aucune refonte complète.
- Aucun remplacement aveugle de fichiers.
- Aucune suppression de fonctionnalités.
- Aucune modification de Supabase ou des données.
- Aucun changement du système d'authentification ou du backend.
- Travailler exclusivement sur "Elema-api".
- Conserver "main" comme sauvegarde.

6. Tests

Vérifier les largeurs suivantes :

- 320 px
- 375 px
- 430 px
- 768 px
- 1024 px
- 1440 px

Tester les modes sombre et clair sur les petits et grands écrans.

7. Conditions de validation

1. L'interface fonctionne sur les différentes tailles d'écran.
2. Le menu mobile s'ouvre et se ferme correctement.
3. Les tableaux et formulaires restent utilisables.
4. Le bouton de thème fonctionne immédiatement.
5. Le thème choisi est conservé après actualisation.
6. Le design actuel sur ordinateur reste intact.
7. Aucun changement non prévu n'est apporté au backend ou aux données.

Approche technique

Inspecter d'abord les composants JSX, les feuilles CSS actives, la navigation et le système de thèmes. Appliquer ensuite des modifications ciblées et vérifier le résultat avec une compilation de production.
