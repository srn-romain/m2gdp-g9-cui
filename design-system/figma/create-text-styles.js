/**
 * La Bonne Tablée — création des 15 styles de texte.
 *
 * Idempotent : les styles déjà présents sont ignorés, aucun nœud n'est modifié.
 * Écrit pour l'API Plugin Figma (console de développement ou MCP use_figma).
 *
 * Exécution via MCP : appeler use_figma avec fileKey "fVYXAhxZyWABEMTclscifi"
 * et ce code comme corps de script.
 */

const STYLES = [
  // nom,                     famille,  graisse,  taille, interligne, interlettrage, variable CSS, description
  ['Titre/Display XL',        'Chewy',  'Regular', 32, 38, -0.5, '--lbt-display-xl',     'Titre plein écran'],
  ['Titre/Display LG',        'Chewy',  'Regular', 28, 34, -0.4, '--lbt-display-lg',     "Titre d'écran"],
  ['Titre/Section',           'Chewy',  'Regular', 24, 30, -0.3, '--lbt-title-lg',       'Titre de section ou de fiche'],
  ['Titre/Carte',             'Chewy',  'Regular', 20, 26, -0.2, '--lbt-title-md',       'Nom de tablée sur carte'],
  ['Titre/Carte compacte',    'Chewy',  'Regular', 18, 24, -0.2, '--lbt-title-sm',       'Liste compacte, minimum absolu pour Chewy'],
  ['Corps/Large',             'DM Sans', 'Regular', 17, 25, -0.2, '--lbt-body-lg',       'Descriptions'],
  ['Corps/Large gras',        'DM Sans', 'Bold',    17, 25, -0.2, '--lbt-body-lg-strong', "Libellés de bloc"],
  ['Corps/Base',              'DM Sans', 'Regular', 15, 22,  0,   '--lbt-body-md',       'Lignes de liste, champs, valeurs'],
  ['Corps/Petit',             'DM Sans', 'Regular', 14, 20,  0,   '--lbt-body-sm',       'Mentions, aide de champ'],
  ['Étiquette/Base',          'DM Sans', 'Medium',  15, 20,  0,   '--lbt-label-md',      'Chips de filtre, onglets'],
  ['Étiquette/Petite',        'DM Sans', 'Medium',  13, 18,  0.1, '--lbt-label-sm',      'Badges, compteurs'],
  ['Bouton/Large',            'DM Sans', 'Bold',    18, 24,  0,   '--lbt-button-lg',     'CTA pleine largeur'],
  ['Bouton/Moyen',            'DM Sans', 'Medium',  16, 22,  0,   '--lbt-button-md',     'Boutons secondaires'],
  ['Navigation/Onglet',       'DM Sans', 'Medium',  12, 16,  0.1, '--lbt-nav-label',     "Barre d'onglets"],
  ['Micro',                   'DM Sans', 'Regular', 12, 16,  0.1, '--lbt-micro',         "Durées, distances, numéros d'étape"],
];

// 1. Charger les polices avant toute écriture, c'est une règle de l'API Plugin.
const fontKeys = [...new Set(STYLES.map(([, family, weight]) => `${family}|${weight}`))];
await Promise.all(
  fontKeys.map((key) => {
    const [family, style] = key.split('|');
    return figma.loadFontAsync({ family, style });
  })
);

// 2. Créer les styles manquants.
const existing = new Set((await figma.getLocalTextStylesAsync()).map((s) => s.name));
const created = [];
const skipped = [];

for (const [name, family, style, size, lineHeight, letterSpacing, cssVar, description] of STYLES) {
  if (existing.has(name)) {
    skipped.push(name);
    continue;
  }
  const textStyle = figma.createTextStyle();
  textStyle.name = name;
  textStyle.fontName = { family, style };
  textStyle.fontSize = size;
  textStyle.lineHeight = { unit: 'PIXELS', value: lineHeight };
  textStyle.letterSpacing = { unit: 'PIXELS', value: letterSpacing };
  textStyle.description = `CSS: var(${cssVar}) — ${description}`;
  created.push(name);
}

return {
  created,
  skipped,
  createdCount: created.length,
  skippedCount: skipped.length,
  totalStyles: (await figma.getLocalTextStylesAsync()).length,
};
