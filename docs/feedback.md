# Retours et spécifications — La Bonne Tablée

Ce document regroupe les remarques de la présentation, transformées en
spécifications d'implémentation. Chaque section décrit un périmètre fonctionnel
complet : objectif, comportement attendu, interface, impacts techniques, cas
limites et critères d'acceptation.

Statut global : les specs 1, 4, 5 et 6 sont implémentées dans `main` ; les specs
2, 3 et 7 sont implémentées sur leurs branches dédiées
(`feature/spec-2-suggestions-saison`, `feature/spec-3-ia-creation`,
`feature/spec-7-ia-assistants`).

Décision IA : **Cloudflare Workers AI**, binding `AI`, modèle
`@cf/meta/llama-3.2-3b-instruct`, avec repli déterministe si l'appel échoue.
Ce choix évite toute clé externe et garde l'ensemble dans Cloudflare.

Conventions de lecture :

- **Priorité** : P1 = bloquant pour la démo, P2 = important, P3 = confort.
- **Statut** : À spécifier, Spécifié, En cours, Terminé.
- Les questions ouvertes sont listées en fin de section et doivent être
  tranchées avant le développement.

---

## 1. Carte plein écran avec fiches superposées

### Objectif

Rendre la vue « carte » immersive : la carte occupe tout l'écran et les fiches
des tablées se superposent par-dessus, avec une barre de recherche fixe.

### Périmètre

- Concerné : écran Explorer, vue « carte ».
- Hors périmètre : la vue « liste » existante reste inchangée.

### Comportement attendu

- La carte occupe 100 % de la hauteur disponible sous la barre de recherche.
- Les fiches des tablées sont affichées en surimpression sur la carte (carrousel
  horizontal ou panneau flottant en bas).
- La barre de recherche reste visible et fixe : elle ne défile pas avec le
  contenu.
- La sélection d'une fiche centre la carte sur la tablée correspondante.

### Interface

- Barre de recherche : position sticky en haut de l'écran.
- Fiches : superposition en bas de l'écran, avec défilement horizontal.
- La fiche sélectionnée reste en évidence ; les autres restent accessibles.

### Impact technique

- Réorganisation du gabarit de `ExplorerView` (hauteur de la carte).
- Aucun changement de modèle de données ni de l'API attendu.

### Cas limites

- Aucune tablée trouvée : afficher l'état vide sans masquer la carte.
- Erreur de géolocalisation : la carte reste utilisable avec un centre par
  défaut.

### Critères d'acceptation

- La carte occupe tout l'écran en vue carte.
- Les fiches se superposent à la carte sans réduire sa surface.
- La barre de recherche ne défile pas.
- La sélection d'une fiche recentre la carte.

### Priorité et statut

- Priorité : P2.
- Statut : Spécifié.

---

## 6. Parcours et recommandations de fluidité

Cette section spécifie les correctifs issus de l'analyse des parcours invité et
hôte. Chaque recommandation a ses critères d'acceptation.

### 6.1 Orienter le nouveau venu vers l'Explorer

**Objectif.** Après la création du compte, amener immédiatement l'utilisateur à
trouver une tablée.

**Comportement attendu.** Un nouveau compte est redirigé vers `/explorer` au lieu
de l'accueil « Mes tablées » (vide). Un message de bienvenue invite à rejoindre
une première tablée. Un compte existant reste redirigé vers l'accueil.

**Critères d'acceptation.**

- Nouveau compte → redirection vers `/explorer`.
- Compte existant → redirection vers `/`.
- Message de bienvenue affiché une seule fois.

### 6.2 Contribution inline sur la fiche d'une tablée

**Objectif.** Réduire le nombre d'écrans pour rejoindre une tablée.

**Comportement attendu.** Le choix de contribution s'effectue dans une bottom
sheet ouverte depuis la fiche de la tablée, sans passer par un écran séparé.

**Critères d'acceptation.**

- Le bouton « Rejoindre » ouvre la sélection de contribution sur la fiche.
- L'utilisateur choisit un apport ou « rien ».
- La participation est confirmée, puis l'écran de confirmation s'affiche.

### 6.3 Création d'une tablée en deux étapes

**Objectif.** Réduire la charge cognitive du formulaire de création.

**Comportement attendu.** Le formulaire est découpé : étape 1 « le plat »
(titre, description, date, heure), étape 2 « la logistique » (lieu, places,
régimes, apports).

**Critères d'acceptation.**

- Deux étapes avec progression visible.
- Étape 1 valide avant de passer à l'étape 2.
- L'utilisateur peut revenir en arrière.
- La publication reste en une action.

### 6.4 Explorer sans géolocalisation

**Objectif.** Ne jamais afficher un Explorer vide à cause du rayon par défaut.

**Comportement attendu.** Sans position connue, la liste est triée par date et
le rayon n'est pas appliqué.

**Critères d'acceptation.**

- Sans position, les tablées sont affichées par date.
- Le rayon n'est appliqué que lorsqu'une position est connue.

### 6.5 Confirmation hôte avec partage

**Objectif.** Donner à l'hôte un retour clair après publication et un moyen de
partager sa tablée.

**Comportement attendu.** Après publication, l'hôte voit une confirmation avec
un bouton « Partager » (lien copiable) et un accès à la discussion.

**Critères d'acceptation.**

- Confirmation visible après publication.
- Bouton de partage copie le lien de la tablée.
- Accès direct à la discussion.

---

## 7. Assistants IA (à spécifier)

Ces fonctionnalités nécessitent de choisir un fournisseur avant implémentation.

### 7.1 IA à la création d'une tablée

À partir d'une description libre, préremplir titre, description, apports,
places et durée. L'utilisateur valide avant publication.

**Critères d'acceptation.**

- Une description libre déclenche l'enrichissement.
- Les champs proposés sont modifiables.
- Le parcours manuel reste disponible.

### 7.2 IA pour l'invité

Proposer des tablées selon la période, l'humeur ou une envie exprimée.

**Critères d'acceptation.**

- Une requête libre propose des tablées pertinentes.
- Les suggestions s'affichent dans l'Explorer.

### 7.3 Suggestions à l'accueil

Une section dédiée de l'accueil affiche des suggestions de tablées.

**Critères d'acceptation.**

- Section visible sur l'accueil.
- Les suggestions sont pertinentes et rafraîchissables.

---

## 2. Suggestions selon la saison

### Objectif

Proposer à l'utilisateur des plats ou des tablées pertinents selon la saison.

### Périmètre

- Concerné : point d'affichage à définir (accueil, recherche ou création).
- Hors périmètre : la personnalisation par profil utilisateur dans un premier
  temps.

### Comportement attendu

- Une suggestion saisonnière est présentée à l'utilisateur.
- La suggestion évolue selon la période de l'année (produits et plats de
  saison).

### Interface

- Bloc ou pastille dédié, sans perturber le parcours principal.
- La suggestion doit être ignorable par l'utilisateur.

### Impact technique

- Source de données à définir : règle calendaire, catalogue de plats saisonniers
  ou génération par IA.

### Cas limites

- Saison inconnue ou donnée manquante : ne pas afficher de suggestion erronée.

### Critères d'acceptation

- Une suggestion saisonnière est visible.
- La suggestion change selon la saison.
- L'utilisateur peut l'ignorer sans conséquence.

### Questions ouvertes

- Où afficher la suggestion : accueil, recherche ou création ?
- La suggestion est-elle basée sur un calendrier, un catalogue ou une IA ?
- Faut-il un paramètre de configuration pour activer/désactiver la fonction ?

### Priorité et statut

- Priorité : P3.
- Statut : À spécifier (questions ouvertes à trancher).

---

## 3. Assistant IA à la création d'une tablée

### Objectif

Faciliter la création d'une tablée : l'utilisateur saisit une description libre
et l'IA préremplit les champs du formulaire.

### Périmètre

- Concerné : formulaire de création d'une tablée.
- Hors périmètre : la génération automatique d'images, la validation métier par
  l'IA.

### Comportement attendu

- Un champ de description libre est disponible dans le formulaire.
- À partir de cette description, l'IA propose des valeurs pour les champs
  concernés : titre du plat, description, apports souhaités, durée, places,
  etc.
- Les valeurs proposées sont préremplies mais restent modifiables.
- Aucune tablée n'est créée sans validation explicite de l'utilisateur.

### Interface

- Champ de description avec un bouton d'action « Enrichir ».
- Indicateur de chargement pendant le traitement.
- Les champs proposés sont mis en évidence et modifiables.
- Message d'erreur clair si le service IA est indisponible.

### Impact technique

- Appel à un service d'IA (à définir : Workers AI, API externe, etc.).
- Contrat de réponse : liste de champs et de valeurs proposés.
- Pas de persistance des propositions tant que l'utilisateur n'a pas validé.

### Cas limites

- Description vide ou trop courte : ne pas appeler le service.
- Réponse partielle de l'IA : préremplir uniquement les champs fournis.
- Service indisponible : l'utilisateur peut remplir le formulaire manuellement.

### Critères d'acceptation

- Une description libre déclenche l'enrichissement.
- Les champs proposés sont préremplis et modifiables.
- Le parcours manuel reste disponible en cas d'échec.
- La publication nécessite une validation explicite.

### Questions ouvertes

- Quel fournisseur d'IA utiliser ?
- Faut-il limiter le nombre d'appels par utilisateur (rate limit) ?

### Priorité et statut

- Priorité : P1 (fonctionnalité attendue).
- Statut : À spécifier (fournisseur et contrat à fixer).

---

## 4. Autocomplétion de la recherche

### Objectif

Afficher des suggestions pendant la saisie de la recherche.

### Périmètre

- Concerné : champ de recherche de l'Explorer.
- Hors périmètre : la recherche sémantique ou par similarité.

### Comportement attendu

- Les suggestions apparaissent pendant la saisie, à partir de 2 caractères.
- Les suggestions portent sur les plats, les quartiers et les villes.
- La sélection d'une suggestion met à jour la recherche.

### Interface

- Liste de suggestions sous le champ de recherche.
- Navigation au clavier (flèches, Entrée) et au tactile.
- Bouton ou geste pour fermer les suggestions.

### Impact technique

- Appel avec debounce (ex. 300 ms) pour limiter les requêtes.
- Endpoint dédié ou réutilisation de l'endpoint de recherche existant avec un
  mode « suggestion ».

### Cas limites

- Moins de 2 caractères : aucune suggestion.
- Aucun résultat : ne pas afficher de liste vide.
- Requête en cours annulée : ignorer les réponses obsolètes.

### Critères d'acceptation

- Les suggestions apparaissent pendant la saisie.
- La sélection complète la recherche.
- La navigation clavier et tactile fonctionne.
- Les appels sont limités par debounce.

### Priorité et statut

- Priorité : P2.
- Statut : Spécifié.

---

## 5. Contributions de la discussion en modal

### Objectif

Afficher les contributions d'une tablée dans une modal, au lieu de les figer
dans le fil de discussion.

### Périmètre

- Concerné : écran de messagerie d'une tablée.
- Hors périmètre : la modification des contributions depuis la modal.

### Comportement attendu

- Un déclencheur ouvre la modal des contributions.
- La modal affiche la liste des contributions des participants.
- La modal peut être fermée : bouton de fermeture, touche Échap, clic sur
  l'overlay ou geste de fermeture.
- Le fil de discussion reste lisible et n'affiche plus les contributions en
  permanence.

### Interface

- Réutilisation du composant Drawer/Modal existant.
- Titre explicite et bouton de fermeture accessible.

### Impact technique

- Déplacement de l'affichage des contributions hors du fil.
- Aucun changement de modèle de données attendu.

### Cas limites

- Aucune contribution : la modal affiche un état vide.
- Modal ouverte pendant l'arrivée d'un nouveau message : ne pas casser le fil.

### Critères d'acceptation

- Les contributions s'ouvrent dans une modal.
- La modal est affichable et dismissible.
- Le fil de discussion reste dégagé.

### Priorité et statut

- Priorité : P2.
- Statut : Spécifié.
