# TODO - Tableau de Bord Data Science

## Phase 1: Base de données
- [x] Définir le schéma pour les tâches (tasks)
- [x] Définir le schéma pour les ressources (resources)
- [x] Définir le schéma pour les clients (clients)
- [x] Définir le schéma pour les totaux hebdomadaires (weekly_totals)
- [x] Pousser les migrations vers la base de données

## Phase 2: Backend tRPC
- [x] Créer les procédures pour lister les tâches par semaine
- [x] Créer les procédures pour ajouter/modifier/supprimer des tâches
- [x] Créer les procédures pour gérer les ressources
- [x] Créer les procédures pour gérer les clients
- [x] Créer les procédures pour calculer les totaux hebdomadaires
- [x] Créer les procédures pour la vue annuelle (agrégation mensuelle)

## Phase 3: Vue hebdomadaire
- [x] Créer la navigation entre semaines (S46, S47, etc.)
- [x] Créer le header sticky avec navigation et bascule de vue
- [x] Créer le tableau des tâches avec colonnes (Done, Livrable, Assignation, Deadline, Temps)
- [x] Implémenter la bulle de commentaire cliquable
- [x] Implémenter les listes déroulantes (Assignation, Client)
- [x] Implémenter le calendrier pop-up pour la deadline
- [x] Implémenter la molette pour la charge de travail
- [x] Créer le footer sticky avec totaux par ressource (photos + noms)

## Phase 4: Vue annuelle
- [x] Créer le tableau mensuel par client
- [x] Implémenter l'agrégation des données par mois et par client
- [x] Afficher les clients par ordre alphabétique
- [x] Afficher les totaux mensuels et annuels

## Phase 5: Fonctionnalités avancées
- [x] Implémenter le bouton "+" pour ajouter des tâches
- [x] Implémenter les types de tâches (One Shot vs Récurrente)
- [x] Implémenter la réinitialisation hebdomadaire (chaque lundi)
- [x] Implémenter la sauvegarde de l'historique hebdomadaire
- [x] Implémenter la case à cocher pour marquer les tâches terminées
- [x] Implémenter la persistance en temps réel (pas de perte à l'actualisation)

## Phase 6: Tests et finalisation
- [x] Tester la navigation entre semaines
- [x] Tester l'ajout/modification/suppression de tâches
- [x] Tester les calculs de totaux
- [x] Tester la bascule entre vues
- [x] Tester la réinitialisation hebdomadaire
- [x] Créer un checkpoint

## Corrections demandées

- [x] Améliorer la réactivité des inputs (problème d'actualisation)
- [x] Réorganiser l'interface avec clients en colonnes avec bordures colorées
- [x] Mettre à jour la liste des clients avec les vrais noms
- [x] Limiter les totaux du footer à Baptiste, Lucas et Victor uniquement
- [x] Corriger la logique de duplication : ne dupliquer que les tâches non terminées
- [x] Réinitialiser la charge des One Shot lors de la duplication

## Refonte interface en liste

- [x] Réorganiser l'interface en présentation liste (non Kanban)
- [x] Créer des sections par client avec titre coloré
- [x] Créer un tableau pour chaque client avec les colonnes : Livrable, Assignation, Priorité, Estimated Time, Work time, Due Date
- [x] Ajouter la colonne Priorité avec sélection (Demande Client, Proposition Didactool, etc.)
- [x] Ajouter la colonne Estimated Time (temps estimé en jours)
- [x] Ajouter la colonne Work time (temps de travail réel avec slider)
- [x] Appliquer les styles graphiques de l'ancien code (couleurs pastels pour assignation, rouge/vert pour priorité)
- [x] Garder le footer sticky avec les totaux Baptiste/Lucas/Victor

## Simplification interface

- [x] Supprimer la colonne Priorité
- [x] Supprimer les colonnes Estimated Time et Work time
- [x] Revenir au système de temps original avec boutons +/- et badge R (récurrent) / OS (one shot)
- [x] Relier les totaux du footer à la colonne Temps(j)
- [x] Ajuster la couleur d'assignation pour remplir toute la cellule comme une bulle
- [x] Ajouter un champ isActive aux clients dans le schéma
- [x] Créer une interface de gestion des clients (activer/désactiver)
- [x] Supprimer Z_CARTO TEMPLATE de la liste des clients
- [x] Filtrer l'affichage pour ne montrer que les clients actifs

## Nouvelles fonctionnalités demandées

### 1. Suppression de "Récurrente" + ajout d'une estimation
- [x] Retirer totalement le champ "Type de tâche / Récurrente" de la fenêtre de création
- [x] Ajouter un champ "Estimation du temps" dans la fenêtre de création
- [x] Ne pas afficher cette estimation dans la ligne de tâche
- [x] Stocker automatiquement cette estimation dans les commentaires de la tâche

### 2. Mettre toute l'UI en français
- [x] Traduire tous les labels, boutons, tooltips, placeholders
- [x] Traduire tous les messages et notifications
- [x] Standardiser toute la terminologie en français

### 3. Ajouter "Archiver" dans Actions
- [x] Conserver "Supprimer"
- [x] Ajouter une action "Archiver" pour déplacer la tâche dans les archives
- [x] Créer une section d'archives visibles au besoin
- [x] L'archivage retire l'élément des vues opérationnelles sans suppression

### 4. Ajouter Annuler / Rétablir (Undo / Redo)
- [ ] Enregistrer chaque action utilisateur modifiant les tâches
- [ ] Permettre d'annuler une action récente
- [ ] Permettre de rétablir une action annulée
- [ ] Couvrir : ajout, suppression, modification du temps, date, assignation

### 5. Export XLSX mensuel automatique
- [ ] Générer un fichier XLSX le dernier jour de chaque mois
- [ ] Structurer l'export : vue par client, vue par personne assignée, totaux mensuels
- [ ] Permettre téléchargement ou envoi automatique

### 6. Ajouter un client + changer sa couleur
- [x] Ajouter la possibilité de créer un nouveau client (nom + couleur)
- [x] Permettre de modifier la couleur des clients existants
- [x] Appliquer automatiquement la couleur du client à toutes les vues

### 7. Corriger le bug du footer (temps = 0 à tort)
- [x] Corriger l'agrégation des temps par personne dans le footer
- [x] S'assurer que les tâches visibles dans la semaine sont comptées correctement
- [x] Vérifier que les filtres et l'archivage n'annulent pas les totaux

### 8. Vue annuelle : afficher uniquement les clients ayant un total annuel > 0
- [x] Calculer le total annuel par client
- [x] Masquer les clients dont le total = 0
- [ ] Optionnel : ajouter un bouton pour afficher tous les clients

### 9. Ajouter des KPIs en footer (Estimation vs Réalité)
- [x] Ajouter au footer un module KPI affichant : total des estimations, total du réalisé, écart
- [x] Ces KPI doivent se mettre à jour automatiquement selon les tâches présentes dans la semaine

## Corrections urgentes V2

### Bug critique vue annuelle
- [x] Corriger le calcul des totaux mensuels par client (somme simple des heures par client par mois)
- [x] Vérifier la conversion semaine → mois
- [x] S'assurer que chaque tâche est comptée une seule fois

### Duplication des tâches
- [x] Corriger : les tâches marquées "done" ne doivent PAS réapparaître la semaine suivante (déjà implémenté)
- [ ] Corriger : le bouton "dupliquer semaine précédente" doit apparaître systématiquement (actuellement n'apparaît que si tasks.length === 0)

### Module KPI footer (à retirer)
- [x] Retirer complètement le module KPI du footer (non demandé initialement)
- [x] Garder uniquement les totaux par ressource (Baptiste, Lucas, Victor)

### Modale d'ajout de tâche
- [x] Vérifier que le champ "Type de tâche / Récurrente" est bien retiré
- [x] Ajouter un champ "Estimation initiale (jours)" dans la modale
- [x] Stocker cette estimation dans le champ estimatedDays (pas dans les commentaires)

### Vue annuelle par data scientist (nouvelle fonctionnalité)
- [x] Créer une section grise en dessous de la vue par client dans la vue annuelle
- [x] Agréger le temps RÉEL par data scientist par mois
- [x] Agréger le temps ESTIMÉ par data scientist par mois
- [x] Afficher en opposition (réel vs estimé) pour chaque data scientist
- [x] Cette donnée n'apparaît nulle part en vision désagrégée, uniquement agrégée

## Bug critique d'agrégation (CORRIGÉ)

- [x] Les totaux du footer affichent 0.0j alors que des tâches existent avec du temps assigné
- [x] La vue annuelle n'affiche aucune donnée alors que des tâches existent
- [x] Vérifier la requête weeklyTotals dans db.ts
- [x] Vérifier la requête annualData dans db.ts
- [x] Vérifier que les noms de colonnes retournés correspondent à ce qui est attendu dans le frontend

**Solution** : MySQL retourne les valeurs DECIMAL comme des strings. Ajout de `parseFloat()` dans toutes les fonctions d'agrégation + correction des alias SQL dans les requêtes GROUP BY.

## Nouvelles fonctionnalités (Phase 7)

### Bouton "Dupliquer semaine" toujours visible
- [x] Modifier la condition pour que le bouton apparaisse systématiquement
- [x] Ajouter une confirmation avant duplication si des tâches existent déjà
- [x] Tester le comportement avec une semaine vide et une semaine remplie

### Export XLSX mensuel
- [x] Créer un bouton d'export dans la vue annuelle
- [x] Générer un fichier XLSX avec feuille "Par Client" (colonnes: Client, Jan, Fév, ..., Total)
- [x] Générer une feuille "Par Data Scientist" (colonnes: DS, Jan, Fév, ..., Total Réel, Total Estimé, Écart)
- [x] Permettre le téléchargement du fichier généré
- [x] Tester l'export avec des données réelles

### Système Undo/Redo
- [x] Créer un contexte React pour gérer l'historique des actions
- [x] Enregistrer chaque action: ajout, suppression, modification (temps, date, assignation, client, livrable)
- [x] Implémenter la fonction undo() pour annuler la dernière action
- [x] Implémenter la fonction redo() pour rétablir une action annulée
- [x] Ajouter des raccourcis clavier Ctrl+Z (undo) et Ctrl+Y (redo)
- [x] Ajouter des boutons visuels dans le header pour undo/redo
- [x] Limiter l'historique à 50 actions pour éviter la surcharge mémoire
- [x] Tester avec différents types d'actions

**Note** : Le système Undo/Redo est implémenté avec un contexte React, des raccourcis clavier (Ctrl+Z / Ctrl+Y) et des boutons dans le header. L'historique est limité à 50 actions. Les actions sont enregistrées lors de la création, modification et suppression de tâches.

## Corrections Phase 8

### Bouton afficher/masquer tous les clients
- [x] Ajouter un toggle dans la vue annuelle pour afficher tous les clients (même ceux avec total = 0)
- [x] Par défaut, afficher uniquement les clients avec total > 0
- [ ] Sauvegarder la préférence de l'utilisateur (optionnel)

### Largeur responsive vue data scientist
- [x] Réduire la largeur des colonnes pour que tous les mois (Jan-Déc) + Total soient visibles sans scroll horizontal
- [x] Utiliser des abréviations pour les noms de mois si nécessaire
- [ ] Tester sur un écran 1920x1080

### Structure identique des tableaux
- [x] Appliquer le même style/structure au tableau par data scientist qu'au tableau par client
- [x] Aligner les en-têtes, bordures, couleurs de fond
- [x] Assurer la cohérence visuelle

### Options d'export Excel
- [x] Ajouter un menu déroulant pour choisir le type d'export : "Par Client" ou "Par Data Scientist"
- [x] Ajouter un choix de période : "Année entière" ou sélection d'un mois spécifique
- [ ] Pour l'export mensuel détaillé : inclure toutes les tâches du mois avec détails (TODO)
- [x] Pour l'export annuel : garder l'agrégation actuelle

### Correction Undo/Redo
- [x] Tester le système Undo/Redo avec des actions réelles (ajout, modification, suppression)
- [x] Vérifier que les événements sont bien écoutés dans Home.tsx
- [x] Corriger la logique de restauration des états précédents
- [x] S'assurer que les mutations tRPC sont bien déclenchées lors du undo/redo

**Solution** : Ajout d'écouteurs d'événements dans Home.tsx pour gérer les actions undo/redo. La mutation createTask récupère maintenant le taskId après création pour l'enregistrer dans l'historique.

## Corrections d'erreurs Phase 9

### Erreur Undo/Redo
- [x] Corriger "Cannot read properties of null (reading 'type')" dans handleUndoEvent
- [x] Ajouter une vérification de l'existence de e.detail avant d'accéder à ses propriétés

### Erreur deadline
- [x] Corriger "Invalid input: expected date, received null" dans les mutations
- [x] Rendre le champ deadline nullable avec z.date().nullable().optional()
