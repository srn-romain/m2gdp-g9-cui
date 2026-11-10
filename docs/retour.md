# Retours post-démo — La Bonne Tablée

Ce document formalise les retours avant implémentation. Rien n'est modifié tant
que les points ne sont pas validés. Statut : **À spécifier** (questions ouvertes),
puis **À implémenter** une fois tranché.

Priorités : P1 = bloquant, P2 = important, P3 = confort.

---

## 1. Baliser le parcours d'inscription

**Objectif** : rendre explicite la finalisation de l'inscription. Aujourd'hui un
utilisateur peut arriver avec un profil incomplet.

**Comportement attendu** :
- Afficher un état clair « profil incomplet » avec les champs manquants
  (nom, prénom, adresse).
- Bloquer la création et la participation tant que le profil n'est pas finalisé
  (déjà en partie en place via `requiresOnboarded`).
- Proposer un écran de complétion guidé, par étapes.

**Impact** : `ProfileView`, gardes du routeur, `me.isOnboarded`.

**Priorité** : P1. **Statut** : À implémenter.

**Décision** : les champs obligatoires sont le **nom**, le **prénom** et
**l'adresse** (quartier + ville + coordonnées). Ambiance et description de l'hôte
ne bloquent pas les actions.

---

## 2. Ambiance de la tablée

**Objectif** : ajouter une « ambiance » au repas (convivial, festif, calme, en
famille…) avec une description libre.

**Comportement attendu** :
- Champ `ambiance` en **texte libre multiligne** sur la création de tablée.
- Suggestion (placeholder) : « Ambiance chaleureuse attendue chez l'hôte »,
  avec possibilité de saut de ligne.
- L'ambiance est aussi **générée par l'IA** : le prompt de génération propose
  une description qui inclut l'ambiance, avec des sauts de ligne.
- Affichage sur la fiche de tablée.
- Optionnel.

**Impact** : migration `tables`, modèle/route, `CreateTableView`, `TableDetailView`.

**Priorité** : P2. **Statut** : À implémenter.

**Décision** : texte libre uniquement, avec saut de ligne et la suggestion
ci-dessus en placeholder.

---

## 3. Description de l'hôte

**Objectif** : permettre à l'hôte de se présenter en quelques mots.

**Comportement attendu** :
- Champ `about` (ou `description`) dans le profil.
- Affiché sur la fiche de tablée à côté du nom de l'hôte.

**Impact** : migration `users`, `PATCH /me`, `ProfileView`, `TableDetailView`.

**Priorité** : P2. **Statut** : À spécifier.

---

## 4. « Qui apporte quoi » dans la liste des ingrédients

**Objectif** : sur la liste des ingrédients, afficher la personne qui s'est
engagée à apporter chaque ingrédient.

**Comportement attendu** :
- Un ingrédient proposé par l'hôte, une fois choisi par un participant, affiche
  le prénom de celui qui l'apporte.
- Les ingrédients non choisis restent « à pourvoir ».

**Impact** : modèle de contribution, route `tables` (jointure), `TableDetailView`,
`ContributionView`.

**Priorité** : P1. **Statut** : À spécifier.

---

## 5. L'hôte peut indiquer ce qu'il apporte

**Objectif** : en tant qu'hôte, marquer explicitement les ingrédients qu'il
apporte lui-même, visible dans le design.

**Comportement attendu** :
- Sur la liste de courses, l'hôte peut cocher/associer « apporté par l'hôte ».
- Rendu distinct (badge hôte).

**Impact** : modèle de contribution (l'hôte = participation HOST), UI.

**Priorité** : P1. **Statut** : À spécifier.

---

## 6. Modifier les ingrédients à apporter (hôte et invité)

**Objectif** : permettre à l'hôte d'éditer/supprimer les ingrédients proposés,
et à chaque invité de modifier ce qu'il s'engage à apporter.

**Comportement attendu** :
- Hôte : ajouter / renommer / supprimer / ajuster quantité et unité.
- Invité : changer ou retirer son apport choisi.
- Refléter immédiatement sur la fiche et dans le fil.

**Impact** : nouvelle route (PATCH `wantedContributions` et contribution), UI d'édition.

**Priorité** : P2. **Statut** : À spécifier.

---

## 7. Rappel en haut du tchat de la tablée

**Objectif** : ajouter un rappel permanent en haut du fil de discussion de la
tablée.

**Comportement attendu** :
- Bandeau fixe en haut du tchat affichant la date/lieu et les **trois premiers**
  ingrédients de la liste « à apporter ».
- Un clic sur ce bandeau ramène à la vue détails de la tablée.
- Reste visible sans enfouir les messages.

**Impact** : `MessagesView`, navigation vers `/tables/:id`.

**Priorité** : P2. **Statut** : À spécifier.

---

## 8. Vue « tout » dédiée

**Objectif** : une page qui regroupe toutes les informations d'une tablée :
ambiance, description de l'hôte, qui apporte quoi, apports, date/lieu.

**Comportement attendu** :
- Remplacer ou compléter la fiche actuelle par une vue complète.
- Pas de contenu caché dans des tiroirs quand tout est demandé.

**Impact** : refonte `TableDetailView` ou nouvelle route.

**Priorité** : P2. **Statut** : À spécifier.

---

## 9. Retirer « Envie » de l'explorer, en faire un fallback de recherche

**Objectif** : supprimer la fonctionnalité IA « Envie » et la remplacer par un
simple repli de recherche quand aucune tablée ne correspond.

**Comportement attendu** :
- Pas de bouton « Envie » / saisie IA.
- Si la recherche texte ne renvoie rien, proposer un repli (plats proches ou
  message « aucun résultat »).

**Impact** : `ExplorerView`, route `/ai/table-suggestions` (désactivation).

**Priorité** : P1. **Statut** : À spécifier.

**Questions** : le repli doit-il rester lexical (mots-clés sur le catalogue) ou
simplement afficher « aucun résultat » ?

---

## 10. Zoom de la carte persistant

**Objectif** : corriger le zoom de la carte dans l'explorer, qui ne se comporte
pas correctement, et le rendre persistant.

**Comportement attendu** :
- Le niveau de zoom choisi reste appliqué lors des interactions (sélection d'une
  tablée, recentrage, filtres).
- Le zoom ne « saute » pas ou ne se réinitialise pas de façon inattendue.

**Impact** : `ExplorerView` (état du zoom de la carte), lib de carte utilisée.

**Priorité** : P1. **Statut** : À implémenter.

---

## 11. Marqueurs de la carte avec l'image du plat

**Objectif** : sur la carte de l'explorer, remplacer les numéros des marqueurs
par l'image du plat correspondant.

**Comportement attendu** :
- Chaque marqueur affiche la vignette du plat (`dishImageUrl`), avec un repli sur
  l'illustration générique si l'image est absente.
- Le marqueur sélectionné reste mis en avant (taille/bordure).

**Impact** : `ExplorerView` (rendu des marqueurs), `dishImageUrl` déjà exposé par l'API.

**Priorité** : P2. **Statut** : À implémenter.

---

## État actuel (rappel)

- Auth par code OTP (Supabase) en place.
- Garde `requiresOnboarded` sur la création et la participation.
- Profil : prénom, nom, quartier, adresse, préférences alimentaires.
- Tablée : plat, description, date/heure, places, ingrédients (apports),
  régimes, image du plat.

À valider avant implémentation : les questions ouvertes des sections ci-dessus.
