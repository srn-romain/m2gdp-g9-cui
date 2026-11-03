# Synthèse des use cases — La Bonne Tablée

État de l'implémentation, de la clôture GitHub et de la couverture e2e, au 3 novembre 2026.

## Légende

- ✅ **Done** : fonctionnalité implémentée dans le code.
- 🔒 **Clôturée** : issue fermée sur GitHub.
- 🧪 **Testée** : parcours e2e automatisé présent.
- ⚠️ **Partiel / à trancher** : présent mais critères incomplets ou à décider.
- 📝 **À faire** : reste à implémenter ou à finaliser.
- ➖ **Hors e2e** : livrable non testable par un parcours navigateur.

## Tableau de synthèse

| # | Issue | Statut GitHub | Implémentation | E2E |
|---|---|---|---|---|
| 1 | Consulter la liste des repas sur l'accueil | 🔒 CLOSED | ✅ Done | 🧪 Testée |
| 2 | Compléter le profil (prénom, photo, bio) | OPEN | ⚠️ Partiel (prénom/photo OK, bio absente, photo non obligatoire) | 🧪 Testée (photo) |
| 3 | Authentification & Profil | 🔒 CLOSED | ✅ Done | 🧪 Testée (via #4) |
| 4 | Lien magique par email | 🔒 CLOSED | ✅ Done (Supabase, durée 1 h) | 🧪 Testée |
| 5 | Accueil & Découverte | OPEN | ⚠️ Partiel (accueil + explorateur OK) | 🧪 Testée |
| 6 | Publication d'un repas (Hôte) | 🔒 CLOSED | ✅ Done | 🧪 Testée (via #9) |
| 7 | Recherche & Filtres | OPEN | ✅ Done | 🧪 Testée (via #10) |
| 8 | Réservation & Organisation | OPEN | ✅ Done | 🧪 Testée (via #11) |
| 9 | Publier un repas | 🔒 CLOSED | ✅ Done | 🧪 Testée |
| 10 | Filtrer par date et régimes | 🔒 CLOSED | ✅ Done | 🧪 Testée |
| 11 | Réserver et proposer sa contribution | OPEN | ⚠️ Partiel (réservation OK, notification hôte absente) | 🧪 Testée |
| 12 | Identité visuelle & Design System | 🔒 CLOSED | ✅ Done | ➖ Hors e2e |
| 13 | Identité et charte graphique | 🔒 CLOSED | ✅ Done | ➖ Hors e2e |
| 14 | Maquettes UI | 🔒 CLOSED | ✅ Done | ➖ Hors e2e |
| 15 | Géolocalisation | OPEN | ⚠️ Partiel | ➖ Hors e2e |
| 16 | Autocomplétion et carte hôte | OPEN | ✅ Done (API Adresse au lieu de Google Places) | ➖ Hors e2e |
| 17 | Carte interactive | OPEN | ⚠️ Partiel (pins et rayon OK, mise à jour au déplacement à vérifier) | ➖ Hors e2e |
| 18 | Gérer et apporter les ingrédients | 🔒 CLOSED | ✅ Done | ➖ Hors e2e |
| 19 | Météo locale | 🔒 CLOSED | ✅ Done | ➖ Hors e2e (réseau) |
| 20 | Messagerie & Échanges | 🔒 CLOSED | ✅ Done | 🧪 Testée (via #21) |
| 21 | Messages et photos | 🔒 CLOSED | ✅ Done (texte, photo, audio) | 🧪 Testée |
| 22 | Architecture & Socle PWA | OPEN | ✅ Done | ➖ Hors e2e (validé par CI/build) |
| 23 | API REST et infra Cloud | OPEN | ✅ Done (Workers, D1, R2) | 🧪 Testée (smoke API) |
| 24 | PWA installable et CI/CD | 🔒 CLOSED | ✅ Done | ➖ Hors e2e (validé par CI/build) |

## Décisions à trancher

- `#2` : rendre la photo obligatoire et ajouter une bio, ou reformuler l'issue.
- `#11` : ajouter la notification à l'hôte, ou la sortir du périmètre.
- `#16` : conserver l'API Adresse française ou revenir à Google Places.
- `#17` : confirmer le comportement de la liste lors du déplacement de la carte.
- `#23` : mettre à jour le corps de l'issue, qui mentionne encore « règles Firebase ».

## Couverture e2e ajoutée

- `tests/playwright.config.ts` : serveur Vite en mode démo.
- `tests/e2e/usecases.spec.ts` : parcours UI des use cases 1, 2, 4, 9, 10, 11 et 21.
- `.github/workflows/ci.yml` : job `e2e` qui installe Chromium et lance les tests UI.
- `tests/package.json` : scripts `e2e:ui` et `e2e:smoke`.
