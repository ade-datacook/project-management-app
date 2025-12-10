# Tableau de Bord Data Science

Application web pour le suivi hebdomadaire et annuel du temps de travail et de la charge des ressources internes en data science.

## Fonctionnalités principales

### Vue Hebdomadaire

L'interface principale permet de gérer les tâches semaine par semaine avec les fonctionnalités suivantes :

- **Navigation entre semaines** : Boutons précédent/suivant pour naviguer entre les semaines (S46, S47, etc.)
- **Gestion des tâches** : Chaque tâche comprend :
  - Case à cocher pour marquer comme terminée
  - Nom de la tâche (éditable en ligne)
  - Bulle de commentaire pour ajouter des notes
  - Assignation à une ressource (liste déroulante)
  - Client associé (liste déroulante)
  - Date limite (calendrier pop-up)
  - Charge de travail en jours (boutons +/- pour ajuster par pas de 0.5 jour)
  - Badge indiquant le type de tâche (R = Récurrente, OS = One Shot)
  - Bouton de suppression

- **Types de tâches** :
  - **One Shot** : Réapparaît la semaine suivante sans charge pré-enregistrée
  - **Récurrente** : Réapparaît avec le nombre de jours de la semaine précédente

- **Totaux par ressource** : Footer sticky affichant les totaux hebdomadaires pour chaque membre de l'équipe avec leur avatar et nom

- **Duplication de semaine** : Bouton pour dupliquer automatiquement les tâches de la semaine précédente (apparaît quand la semaine est vide)

### Vue Annuelle

Tableau récapitulatif mensuel par client avec :

- Agrégation des données par mois et par client
- Affichage alphabétique des clients
- Totaux mensuels et annuels
- Navigation entre années

## Ressources

L'équipe comprend 7 membres :

- Baptiste (violet)
- Lucas (bleu)
- Victor (gris)
- Elodie (jaune)
- Alexandre (rose)
- Quentin (cyan)
- Rafael (violet)

## Clients pré-configurés

- Aesio
- Affelou
- Autolist
- Alice Del
- BestList
- Equin Group
- PSG
- Relais Cla
- Spot Floso
- Cosmo
- Veligo
- Avanci

## Persistance des données

Toutes les données sont sauvegardées en temps réel dans la base de données MySQL/TiDB. Aucune perte de données lors de l'actualisation de la page.

## Architecture technique

- **Frontend** : React 19 + Tailwind CSS 4
- **Backend** : Express 4 + tRPC 11
- **Base de données** : MySQL/TiDB avec Drizzle ORM
- **Authentification** : Manus OAuth

## Utilisation

1. **Ajouter une tâche** : Cliquez sur "Ajouter élément" et choisissez le type (One Shot ou Récurrente)
2. **Modifier une tâche** : Cliquez directement sur les champs pour les éditer
3. **Ajuster la charge** : Utilisez les boutons +/- pour augmenter ou diminuer la charge de travail
4. **Ajouter des notes** : Cliquez sur l'icône de bulle de commentaire
5. **Naviguer entre semaines** : Utilisez les flèches < et > en haut de la page
6. **Voir la vue annuelle** : Cliquez sur "Vue Annuelle →"
7. **Dupliquer une semaine** : Si la semaine est vide, cliquez sur "Dupliquer semaine précédente"

## Développement

```bash
# Installer les dépendances
pnpm install

# Pousser le schéma vers la base de données
pnpm db:push

# Initialiser les données de base (ressources et clients)
pnpm exec tsx seed.mjs

# Lancer le serveur de développement
pnpm dev
```

L'application sera accessible sur http://localhost:3000

## Déploiement EX2 / Passenger

Sur l'hébergement mutualisé EX2, il ne faut **pas** utiliser le module "Node.js App" de cPanel (il attend une appli qui ouvre un port). L'exécution se fait via Passenger qui charge le bundle Node publié dans `public_html/app/dist/app.js`.

Déploiement recommandé :

```bash
pnpm install
pnpm run build:passenger   # build + copie vers public_html/app/dist
git add public_html/app/dist
git commit -m "Build Passenger"
git push
# puis, dans cPanel : Git™ Version Control → Pull
```

Passenger lira automatiquement `public_html/.htaccess`, dont la racine est déjà configurée sur `/home/planning/public_html/app`.
