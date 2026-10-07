# La Bonne Tablée — charte typographique

Version 1.0 — octobre 2026

Périmètre : typographie et couleurs de texte. Les couleurs d'interface (fonds, boutons,
icônes) suivent la charte existante et sont rappelées ici.

Source : maquette Figma « La Bonne Tablée » (nœud `4301:2`), relevée nœud par nœud.
Le fichier contenait 8 familles de polices, 14 couleurs de texte et aucun style de texte :
ce dossier fige une échelle unique.

---

## 1. Les deux polices

| Police | Rôle | Graisses disponibles | À utiliser pour | À ne jamais utiliser pour |
|---|---|---|---|---|
| **Chewy** | La voix de la marque | **Regular 400 uniquement** | Titres d'écran, titres de section, noms de tablées, bulles de la mascotte | Corps de texte, boutons, libellés d'onglets, texte de moins de 18 px, texte de plus d'une ligne et demie |
| **DM Sans** | L'interface | **Regular 400 / Medium 500 / Bold 700** | Tout le reste : corps, champs, chips, badges, boutons, navigation, horodatages | Titres d'écran |

### Les quatre règles

1. **Chewy, c'est ce qui porte un nom.** Si l'élément nomme quelque chose (un écran, une
   section, une tablée), il est en Chewy. S'il se lit ou s'actionne, il est en DM Sans.
2. **Jamais de Chewy sous 18 px**, jamais en majuscules, jamais en italique.
3. **Jamais de faux gras sur Chewy** : la police n'existe qu'en une graisse. La hiérarchie
   se fait par la taille, la couleur et l'interlettrage.
4. **DM Sans n'utilise que trois graisses** : Regular, Medium, Bold. Le SemiBold présent
   dans le fichier est supprimé, la charte ne le prévoit pas.

### Avertissements techniques

- Sélectionner la famille **`DM Sans`**, jamais `DM Sans 9pt` (variante optique distincte
  dans Figma, qui casse les styles) ni les italiques.
- Chewy ne possède ni gras ni italique : ne pas simuler.
- Les deux polices sont sous licence SIL Open Font License, usage commercial autorisé.

---

## 2. L'échelle typographique

Base 375 px (`1 px` de maquette = `1 dp`). 15 styles.

### Chewy — titres

| Style | Taille / interligne | Interlettrage | Où |
|---|---|---|---|
| `display/xl` | 32 / 38 | −0,5 px | « Bienvenue ! », « Bon retour ! » |
| `display/lg` | 28 / 34 | −0,4 px | « Bonjour bernard ! », « Créez une tablée », « Messages », « Ma tablée », « Mes recettes », « Votre contribution », « C'est confirmé ! » |
| `title/lg` | 24 / 30 | −0,3 px | « À venir », « Passées », « Les contributions », titre de la fiche « Gratin dauphinois chez Léonie » |
| `title/md` | 20 / 26 | −0,2 px | « Gratin chez Léonie » (cartes), « 12 tablées autour de vous », bulles de la mascotte |
| `title/sm` | 18 / 24 | −0,2 px | « Soupe de lentilles chez Sarah » (liste compacte), « Mes recettes sauvegardées », « Que peux-tu apporter ? » |

### DM Sans — texte et interface

| Style | Graisse | Taille / interligne | Interlettrage | Où |
|---|---|---|---|---|
| `body/lg` | Regular | 17 / 25 | −0,2 px | Descriptions, résumés de tablée |
| `body/lg-strong` | Bold | 17 / 25 | −0,2 px | Libellés de bloc : « Ce que chacun apporte », « Contributions » |
| `body/md` | Regular | 15 / 22 | 0 | Lignes de liste, champs, valeurs « Aujourd'hui / 12 h 30 » |
| `body/sm` | Regular | 14 / 20 | 0 | « Pas de mot de passe à retenir. », aide sous les champs, horodatages |
| `label/md` | Medium | 15 / 20 | 0 | Chips de filtre « Végétarien », « Ce soir », onglets « Toutes / Mes tablées » |
| `label/sm` | Medium | 13 / 18 | +0,1 px | Badges « Végétarien », « Allergènes indiqués », « Voir tout (2) », « 3 places disponibles » |
| `button/lg` | Bold | 18 / 24 | 0 | CTA pleine largeur : « Participer à la tablée », « Explorer les tablées », « Créer mon compte » |
| `button/md` | Medium | 16 / 22 | 0 | Boutons secondaires : « Ajouter un ingrédient », « Modifier la tablée », « Écrire à Léonie » |
| `nav/label` | Medium | 12 / 16 | +0,1 px | Barre d'onglets : « Accueil », « Explorer », « Créer », « Messages », « Profil » |
| `micro` | Regular | 12 / 16 | +0,1 px | « 12 h 30 », « 700 m », numéros d'étape, compteurs |

---

## 3. Les couleurs

### Charte

| Jeton | Valeur | Usage |
|---|---|---|
| `couleur.terracotta` | `#DB5A3B` | Actions principales, accents décoratifs |
| `couleur.creme` | `#FAF7F2` | **Fond de tous les écrans**, texte sur fond coloré |
| `couleur.sauge` | `#5B8266` | Titres Chewy de 24 px et plus, icônes |
| `couleur.ardoise` | `#2B2B2B` | Texte de lecture |

### Extension (à valider)

| Jeton | Valeur | Pourquoi |
|---|---|---|
| `couleur.sauge-fonce` | `#3F5A48` | Même teinte que le vert sauge, assez sombre pour les titres Chewy de 18 à 20 px et les petites étiquettes vertes. Sans elle, `#5B8266` plafonne à 4,07:1 et échoue au contraste AA en dessous de 24 px. |

### Contrastes mesurés (sur fond crème `#FAF7F2`)

| Combinaison | Ratio | Verdict |
|---|---|---|
| Ardoise sur crème | 13,3:1 | AAA |
| Ardoise 70 % sur crème | 5,2:1 | AA, pour tout texte secondaire |
| Vert sauge sur crème | 4,07:1 | AA **uniquement** à partir de 24 px |
| Vert sauge foncé sur crème | 7,1:1 | AAA, pour les titres de 18 à 20 px |
| Crème sur terracotta | 3,55:1 | AA **uniquement** si le libellé fait 18 px gras ou plus |
| Crème sur vert sauge | 4,07:1 | AA à partir de 24 px |

### Conséquences pratiques

- Le CTA est en `button/lg` (18 px **Bold**) précisément pour que crème sur terracotta passe.
  Si un bouton doit descendre sous 18 px gras, assombrir le fond à `#B8442A` (5,0:1).
- Tout le texte secondaire est de l'**ardoise à 70 %**, jamais un gris inventé.
- Le fond est **toujours** `#FAF7F2` : pas de blanc pur, pas de blanc cassé intermédiaire.

---

## 4. Mapping maquette vers style

| Élément de la maquette | Aujourd'hui dans Figma | Style cible | Couleur |
|---|---|---|---|
| « Bienvenue ! », « Bon retour ! » | Gurajada 128 px | `display/xl` | Ardoise |
| « Bonjour bernard ! » | Lilita One 30/36 **et** Chewy 30/36 (2 nœuds superposés) | `display/lg` | Vert sauge |
| « À venir », « Passées » | Lilita One 30/36, interlettrage incohérent (+2 / −0,75) | `title/lg` | Vert sauge |
| « Gratin dauphinois chez Léonie » | — | `title/lg` | Vert sauge |
| « Gratin chez Léonie » (carte) | — | `title/md` | Vert sauge foncé |
| Bulles de la mascotte | — | `title/md` | Vert sauge |
| « Soupe de lentilles chez Sarah » | Outfit / Plus Jakarta Sans SemiBold | `title/sm` | Vert sauge foncé |
| « Végétarien », « Ce soir » (chips) | Plus Jakarta Sans / Outfit | `label/md` | Ardoise |
| « Allergènes indiqués », « Voir tout (2) » | Plus Jakarta Sans SemiBold 14 | `label/sm` | Ardoise 70 % |
| « Ce que chacun apporte » | — | `body/lg-strong` | Ardoise |
| « Un gratin maison à partager entre voisins. » | — | `body/lg` | Ardoise |
| « Aujourd'hui / 12 h 30 », « Lyon 7e / 700 m » | Outfit SemiBold | `body/md` | Ardoise |
| « Pas de mot de passe à retenir. » | Liberation Sans 14 | `body/sm` | Ardoise 70 % |
| « Participer à la tablée », « Explorer les tablées » | Liberation Sans 17 / DM Sans 19 Medium | `button/lg` | Crème sur terracotta |
| « Ajouter un ingrédient », « Modifier la tablée » | Plus Jakarta Sans | `button/md` | Terracotta ou Ardoise |
| Barre d'onglets | — | `nav/label` | Ardoise, actif en terracotta |

---

## 5. Contenu du dossier

```
design-system/
├── README.md                        ← ce document
├── tokens/
│   ├── tokens.json                  ← source de vérité (format Design Tokens W3C)
│   ├── tokens.css                   ← variables CSS + classes .text-*
│   ├── tokens.tailwind.js           ← thème Tailwind v3 (theme.extend)
│   └── tokens.tailwind-v4.css       ← bloc @theme Tailwind v4
├── fonts/
│   └── fonts.css                    ← @font-face (Google Fonts ou auto-hébergement)
├── figma/
│   ├── text-styles.md               ← tableau de création des 15 styles
│   └── create-text-styles.js        ← script Plugin API à exécuter dans le fichier
└── preview/
    └── index.html                   ← aperçu visuel de toute l'échelle
```

Le fichier `tokens.json` est la source : les autres artefacts en découlent. Pour ajouter une
cible (Compose, Flutter, SwiftUI, React Native), on écrit un générateur qui le lit.

---

## 6. À faire dans Figma

1. Créer les 15 styles de texte, script prêt dans `figma/create-text-styles.js`.
2. Remplacer les 3 nœuds **Lilita One** par **Chewy** et supprimer le doublon
   « Bonjour bernard ! ».
3. Basculer les 25 nœuds **Plus Jakarta Sans / Outfit / Liberation Sans** en **DM Sans**,
   et convertir les SemiBold en Medium ou Bold.
4. Unifier l'interlettrage des titres sur les valeurs du tableau.
5. Recaler les fonds sur `#FAF7F2` (aujourd'hui : `#FFFAF2`, `#FDFCF9`, `#FFFFFF`, `#FCFAF6`).
6. Recaler les terracottas : `#E64A24`, `#D45129`, `#D44C27`, `#D14D2A` vers `#DB5A3B`.
7. Réduire les 8 verts du fichier (`#0B3C29`, `#0F4735`, `#195036`, `#134E35`, `#293C34`,
   `#24332D`, `#8B978F`, `#6D7D76`) à trois valeurs : sauge, sauge foncée, ardoise.
8. Archiver les 15 cadres de wireframe (`1 intro_0.1` à `11 tri_2`, en Gurajada) dans une
   page séparée : ils polluent la liste des polices.
