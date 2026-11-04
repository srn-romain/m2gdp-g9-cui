# Dossier de projet — La Bonne Tablée

Site statique du **dossier de rendu** (M2CIM 2026) : cadrage, recherche utilisateur,
conception, prototype et pilotage produit.

Publié par Cloudflare Pages via le projet `labonnetablee-depot` :
<https://labonnetablee-depot.pages.dev>

## Pages

| Fichier | Titre | Contenu |
|---|---|---|
| `index.html` | Dossier de projet | accueil, vidéo de présentation, liens vers les livrables |
| `projet.html` | Projet & équipe | cadrage, périmètre, équipe |
| `lean.html` | Lean Canvas | proposition de valeur et modèle |
| `vpc.html` | Value Proposition Canvas | douleurs, gains, produits/services |
| `documentation.html` | Personas & storyboard | recherche utilisateur |
| `parcours.html` | User Journey Mapping | parcours et points de friction |
| `design.html` | Maquettes & design system | charte, jetons, écrans |
| `produit.html` | Démo | accès au prototype et aux scénarios |
| `pilotage.html` | Roadmap & scénarios | EPICs, priorisation, roadmap GitHub |

## Fonctionnement

- **Aucune étape de build** : HTML/CSS/JS statiques, pas de dépendance npm, pas de bundler.
  Les chemins sont **relatifs** (`style.css`, `assets/…`) et les polices viennent de Google Fonts.
- **Menu** : injecté dans `<nav class="nav">` par un script. Chaque page embarque celui qui la
  concerne — `site-nav.js` (index, projet, lean, vpc, produit, pilotage), `script.js` (design),
  `documentation.js` (documentation), `journey.js` (parcours).
- **Styles par page** : chargés à l'exécution par leur script (`lean.js → lean.css`,
  `vpc.js → vpc.css + vpc-grouped.css + vpc-visual.css`, `journey.js → journey.css`,
  `backlog.js → backlog.css + uml.js → uml.css + uml-schema.css + api.js → api.css`).
  Seuls `style.css` et `docs.css` sont liés directement dans le HTML.
- **Médias** : `assets/` contient 28 fichiers, dont la vidéo de présentation
  (`presentation-bonne-tablee.mp4`, 26 Mo) et l'animation de la page Démo (`presentation.mp4`, 6 Mo).

## Aperçu en local

```sh
# Depuis la racine du dépôt
npx wrangler pages dev landing --port 8788   # http://localhost:8788
```

## Déploiement

```sh
npx wrangler pages deploy landing --project-name labonnetablee-depot
```

Rappel des prérequis : `wrangler login` et un compte Cloudflare.

## Liens publiés

- Application (bouton « Voir la démo ») : <https://labonnetablee.pages.dev>
- Site vitrine : <https://labonnetablee-landing.pages.dev>
- Roadmap GitHub : <https://github.com/users/srn-romain/projects/2/views/1>
- Dépôt : <https://github.com/srn-romain/m2gdp-g9-cui>

## Reste à faire

- 7 images ne sont plus référencées par aucune page (~6 Mo) : `assets/charte.png`,
  `mascotte.png`, `mijote-icon.png`, `persona-bernard.png`, `persona-camille.png`,
  `persona-yanis.png`, `storyboard.png`.
