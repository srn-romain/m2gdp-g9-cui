# Styles de texte à créer dans Figma

15 styles. Nommage `Famille/Style`, descriptions alignées sur les variables CSS du dossier
`tokens/`. Le fichier Figma ne contient aujourd'hui **aucun style local** : tout est posé à
la main.

## Titres, Chewy, graisse 400 uniquement

| Nom du style | Police | Graisse | Taille | Interligne | Interlettrage | Description à coller |
|---|---|---|---|---|---|---|
| `Titre/Display XL` | Chewy | Regular | 32 | 38 | −0,5 px | `CSS: var(--lbt-display-xl)` — Titre plein écran |
| `Titre/Display LG` | Chewy | Regular | 28 | 34 | −0,4 px | `CSS: var(--lbt-display-lg)` — Titre d'écran |
| `Titre/Section` | Chewy | Regular | 24 | 30 | −0,3 px | `CSS: var(--lbt-title-lg)` — Titre de section ou de fiche |
| `Titre/Carte` | Chewy | Regular | 20 | 26 | −0,2 px | `CSS: var(--lbt-title-md)` — Nom de tablée sur carte, bulles mascotte |
| `Titre/Carte compacte` | Chewy | Regular | 18 | 24 | −0,2 px | `CSS: var(--lbt-title-sm)` — Liste compacte. Minimum absolu pour Chewy |

## Texte et interface, DM Sans, 400 / 500 / 700

| Nom du style | Police | Graisse | Taille | Interligne | Interlettrage | Description à coller |
|---|---|---|---|---|---|---|
| `Corps/Large` | DM Sans | Regular | 17 | 25 | −0,2 px | `CSS: var(--lbt-body-lg)` — Descriptions |
| `Corps/Large gras` | DM Sans | Bold | 17 | 25 | −0,2 px | `CSS: var(--lbt-body-lg-strong)` — Libellés de bloc |
| `Corps/Base` | DM Sans | Regular | 15 | 22 | 0 | `CSS: var(--lbt-body-md)` — Lignes de liste, champs, valeurs |
| `Corps/Petit` | DM Sans | Regular | 14 | 20 | 0 | `CSS: var(--lbt-body-sm)` — Mentions, aide de champ |
| `Étiquette/Base` | DM Sans | Medium | 15 | 20 | 0 | `CSS: var(--lbt-label-md)` — Chips de filtre, onglets |
| `Étiquette/Petite` | DM Sans | Medium | 13 | 18 | +0,1 px | `CSS: var(--lbt-label-sm)` — Badges, compteurs |
| `Bouton/Large` | DM Sans | Bold | 18 | 24 | 0 | `CSS: var(--lbt-button-lg)` — CTA pleine largeur, 18 gras requis pour le contraste |
| `Bouton/Moyen` | DM Sans | Medium | 16 | 22 | 0 | `CSS: var(--lbt-button-md)` — Boutons secondaires |
| `Navigation/Onglet` | DM Sans | Medium | 12 | 16 | +0,1 px | `CSS: var(--lbt-nav-label)` — Barre d'onglets |
| `Micro` | DM Sans | Regular | 12 | 16 | +0,1 px | `CSS: var(--lbt-micro)` — Durées, distances, numéros d'étape |

## Couleur de texte par style

| Style | Couleur |
|---|---|
| `Titre/Display XL`, `Titre/Display LG` | `couleur.ardoise` #2B2B2B ou `couleur.sauge` #5B8266 |
| `Titre/Section` | `couleur.sauge` #5B8266 |
| `Titre/Carte`, `Titre/Carte compacte` | `couleur.sauge-fonce` #3F5A48 |
| `Corps/Large`, `Corps/Large gras`, `Corps/Base`, `Étiquette/Base` | `couleur.ardoise` #2B2B2B |
| `Corps/Petit`, `Étiquette/Petite`, `Micro` | `couleur.texte-secondaire`, ardoise 70 % |
| `Bouton/Large` | `couleur.texte-sur-accent`, crème sur fond terracotta |
| `Bouton/Moyen` | `couleur.terracotta` #DB5A3B |
| `Navigation/Onglet` | ardoise, état actif en terracotta |

## Création automatique

Le script `create-text-styles.js` crée les 15 styles. Il est idempotent : il ignore les
styles déjà présents et ne touche à aucun nœud.

1. **Depuis ce projet** : demander à l'agent Codex de l'exécuter via le MCP Figma.
2. **À la main** : Figma Desktop, menu principal, *Plugins → Development → Open console*,
   puis coller le contenu du script.

Les noms de styles sont volontairement en français, pour être lisibles dans le panneau
Figma ; les jetons techniques (`--lbt-*`) restent en anglais dans les descriptions.
