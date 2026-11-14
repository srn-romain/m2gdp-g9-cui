/**
 * Moteur déterministe d'inférence des régimes alimentaires.
 * Entrées : nom du plat + libellés des ingrédients (liste de courses).
 * Sortie : tableau de tags (ordre fixe) ou null quand rien n'est concluant.
 *
 * Principes (prudence) :
 * - on ne tague VEG* que sur mention explicite ou plat/légumes manifestement
 *   sans viande, jamais sur simple absence d'indice ;
 * - le moindre mot de viande/poisson (nom + ingrédients) bloque tout tag VEG ;
 * - NO_PORK n'est ajouté que quand il est logiquement certain (veg, halal,
 *   casher, mention explicite), jamais deviné sur un plat carné.
 */

const ACCENTS = [
  [/[éèêë]/g, 'e'],
  [/[àâ]/g, 'a'],
  [/[îï]/g, 'i'],
  [/[ô]/g, 'o'],
  [/[ùû]/g, 'u'],
  [/[ç]/g, 'c'],
  [/œ/g, 'oe'],
  [/æ/g, 'ae'],
];

export function normalizeTexte(texte) {
  // NFD + suppression des diacritiques : « bœuf » -> « boeuf » via Œ, « rôti » -> « roti ».
  // String() absorbe les donnees sales (nombres, null) de facon deterministe.
  let s = String(texte ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const [re, par] of ACCENTS) s = s.replace(re, par);
  return s;
}

// Racines insensibles au pluriel en « s » (mot entier uniquement).
const MOTS = (...racines) => new RegExp(`\\b(?:${racines.join('|')})s?\\b`);
const PHRASES = (...morceaux) =>
  new RegExp(`\\b(?:${morceaux.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`);

const VIANDES = MOTS(
  'poulet', 'dinde', 'canard', 'oie', 'pintade', 'pigeon', 'lapin', 'porc', 'cochon',
  'jambon', 'bacon', 'lardon', 'lard', 'saucisse', 'saucisson', 'merguez', 'chorizo',
  'andouille', 'boudin', 'rillettes', 'terrine', 'boeuf', 'bourguignon', 'veau', 'agneau',
  'mouton', 'cabri', 'chevreau', 'gibier', 'sanglier', 'chevreuil', 'biche', 'faisan',
  'perdreau', 'grenouille', 'escargot', 'cuisse', 'escalope', 'paupiette', 'blanquette',
  'carbonade', 'carbonnade', 'hochepot', 'hachis', 'hache', 'steak', 'burger', 'kefta',
  'kofta', 'kebab', 'doner', 'chawarma', 'moussaka', 'pastilla', 'welsh', 'croque',
  'matelote', 'waterzoi', 'potjevleesch', 'feijoada', 'gumbo', 'jambalaya', 'tripes',
  'tripou', 'rognon', 'foie', 'paleron', 'macreuse', 'jarret', 'pancetta', 'prosciutto',
  'coppa', 'bresaola', 'mortadelle', 'speck', 'guanciale', 'chipolata', 'diot', 'cervelas',
  'salami', 'pepperoni', 'godiveau', 'viande', 'tartare', 'carpaccio', 'tataki', 'gravlax',
  'fish', 'sushi', 'sashimi', 'maki', 'ceviche', 'accra', 'tarama', 'paella', 'fideua',
  'tacos', 'nuggets', 'mignon', 'bavette', 'onglet', 'daube', 'navarin', 'blaff',
  'matoutou', 'tiebdienne', 'thieboudienne', 'tourteau', 'tartiflette', 'croziflette',
  'magret', 'aiguillette', 'gesier', 'pilon', 'gyoza', 'nems', 'nem', 'volaille', 'abats',
  'chapon', 'poularde', 'gigot', 'echine', 'poitrine', 'entrecote', 'chateaubriand',
  'tournedos', 'pave', 'coq', 'flambee', 'reine', 'bisque', 'canette', 'caneton',
  'marcassin', 'lievre', 'alouette', 'hampe', 'coquille', 'coquilles', 'coquelet',
  'shawarma', 'cumberland', 'rappie', 'sancocho', 'matambre', 'tafelspitz', 'prego',
  'stamppot', 'truite', 'kabanos', 'wonton', 'toad in the hole', 'smoked meat',
);
const VIANDES_PHRASES = PHRASES(
  'pot au feu', 'langue de', 'joue de', 'petit sale', 'pata negra',
  'faux-filet', 'faux filet', 'court-bouillon', 'court bouillon', 'hot-dog', 'hot dog',
  'cordon bleu', 'confit',
);
const POISSONS = MOTS(
  'poisson', 'saumon', 'thon', 'sardine', 'anchois', 'maquereau', 'hareng', 'morue',
  'cabillaud', 'colin', 'lieu', 'merlu', 'lotte', 'baudroie', 'loup', 'daurade', 'dorade',
  'rouget', 'grondin', 'turbot', 'sole', 'limande', 'plie', 'carrelet', 'raie', 'espadon',
  'bonite', 'haddock', 'eglefin', 'merlan', 'crevette', 'gambas', 'langoustine', 'homard',
  'langouste', 'crabe', 'araignee', 'etrille', 'moule', 'huitre', 'coque', 'palourde',
  'praire', 'petoncle', 'encornet', 'calamar', 'calmar', 'poulpe', 'pieuvre', 'seiche',
  'chipiron', 'surimi', 'brandade', 'poutargue', 'boutargue', 'fumet', 'bouillabaisse',
  'bourride', 'coquillage', 'bar', 'napolitaine',
  'nuoc',
);
const POISSONS_PHRASES = PHRASES('fruits de mer', 'fruit de mer', 'saint-jacques', 'saint jacques', 'st-jacques');

function contientViande(texte) {
  // Exceptions : faux positifs végétariens connus (le reste du texte reste scruté).
  const neutre = texte
    .replace(/terrine de legumes/g, '___')
    .replace(/pate aux pommes/g, '___')
    .replace(/sin carne/g, '___');
  if (VIANDES.test(neutre) || VIANDES_PHRASES.test(neutre)) return true;
  if (POISSONS.test(neutre) || POISSONS_PHRASES.test(neutre)) return true;
  if (/\bcarne\b/.test(neutre)) return true;
  if (/\bcaviar\b/.test(neutre) && !/aubergine/.test(texte)) return true;
  if (/\bpate\b/.test(neutre) && !/pomme/.test(texte)) return true;
  return false;
}

// Marqueurs salés manifestement végétariens (fromages, œufs, légumes, féculents...).
const MARQUEURS_SALES = MOTS(
  'fromage', 'chevre', 'mozzarella', 'parmesan', 'ricotta', 'feta', 'halloumi', 'paneer',
  'tome', 'tomme', 'yaourt', 'yogourt', 'raita', 'tzatziki', 'tofu', 'tempeh', 'seitan',
  'champignon', 'cepe', 'girolle', 'morille', 'pleurote', 'courgette', 'aubergine',
  'poireau', 'legume', 'lentille', 'quinoa', 'boulgour', 'ble', 'houmous', 'falafel',
  'taboule', 'dahl', 'dal', 'gaspacho', 'ratatouille', 'aioli', 'pesto', 'aligot',
  'truffade', 'raclette', 'fondue', 'gratin', 'tian', 'parmigiana', 'socca', 'panisse',
  'brik', 'brick', 'omelette', 'souffle', 'polenta', 'gnocchi', 'focaccia',
  'chakchouka', 'chakchuka', 'faina', 'naan', 'sopaipilla', 'banitsa', 'ugali',
  'sesame', 'plantain', 'igname', 'epeautre', 'arachide',
  'crosne', 'cresson', 'mache', 'roquette', 'pissenlit', 'ortie', 'dhal',
  'bruschetta', 'pizza', 'flamiche', 'pates', 'pasta', 'penne', 'spaghetti', 'tagliatelle',
  'linguine', 'macaroni', 'semoule', 'patate', 'carotte', 'potiron', 'potimarron', 'courge',
  'citrouille', 'brocoli', 'epinard', 'blette', 'bette', 'celeri', 'fenouil', 'artichaut',
  'asperge', 'endive', 'crudite', 'avocat', 'betterave', 'radis', 'concombre', 'tomate',
  'poivron', 'oignon', 'creme', 'manioc', 'topinambour', 'salsifis', 'beurre',
  'miel',
);

// Plats typiquement sucrés (végétariens, sans label NO_PORK par prudence gélatine).
const MARQUEURS_SUCRES = MOTS(
  'gateau', 'cake', 'brioche', 'viennoiserie', 'croissant', 'chocolat', 'cacao', 'caramel',
  'vanille', 'cannelle', 'glace', 'sorbet', 'flan', 'clafoutis', 'clafouti', 'crumble',
  'brownie', 'cookie', 'biscuit', 'sable', 'financier', 'macaron', 'meringue', 'charlotte',
  'tiramisu', 'compote', 'confiture', 'beignet', 'churros', 'gaufre', 'crepe', 'pancake',
  'kouign', 'kouglof', 'kugelhopf', 'stollen', 'panettone', 'pandoro', 'donut', 'doughnut',
  'baba', 'savarin', 'baklava', 'loukoum', 'nougat', 'calisson', 'marron', 'chataigne',
  'pistache', 'cajou', 'cacahuete', 'poire', 'fraise', 'framboise', 'myrtille',
  'pistache', 'cajou', 'cacahuete', 'poire', 'fraise', 'framboise', 'myrtille',
  'cassis', 'groseille', 'cerise', 'abricot', 'peche', 'brugnon', 'nectarine', 'prune',
  'pruneau', 'mirabelle', 'quetsche', 'coing', 'figue', 'datte', 'raisin', 'banane',
  'ananas', 'mangue', 'papaye', 'goyave', 'litchi', 'agrume', 'citron', 'orange',
  'pamplemousse', 'clementine', 'mandarine', 'kiwi', 'melon', 'pasteque', 'rhubarbe',
  'mure', 'praline', 'nougatine', 'mousse', 'brulee', 'flottante', 'profiterole',
  'noisette',
  'eclair', 'religieuse', 'millefeuille', 'fraisier', 'opera', 'pavlova', 'dacquoise',
  'succes', 'pithiviers', 'moka',
);

// Plats ambigus : jamais de verdict sur le seul nom, seuls les ingrédients tranchent.
const NOMS_AMBIGUS = MOTS('tajine', 'couscous', 'pastilla', 'tourte', 'paella', 'moussaka', 'boulette');

function saladeVegetarienne(texte) {
  if (!/salade/.test(texte)) return false;
  if (/nicoise|liegeoise|cesar/.test(texte)) return false;
  return /verte|chevre|crudite|avocat|houmous|falafel|quinoa|lentille|boulgour/.test(texte);
}

function soupeVegetarienne(texte) {
  if (!/soupe|potage|veloute|minestrone/.test(texte)) return false;
  return /lentille|legume|oignon|potiron|miso|tomate|carotte|poireau|courge|champignon|aubergine/.test(texte);
}

function fritesVegetariennes(texte) {
  return /frites/.test(texte) && /four|patate|douce|manioc/.test(texte);
}

function marqueurSale(texte) {
  if (MARQUEURS_SALES.test(texte)) return true;
  if (/quiche/.test(texte) && !/lorraine/.test(texte)) return true;
  if (/tarte/.test(texte) && !/flambee/.test(texte)) return true;
  if (/terrine de legumes/.test(texte)) return true;
  if (saladeVegetarienne(texte)) return true;
  if (soupeVegetarienne(texte)) return true;
  if (fritesVegetariennes(texte)) return true;
  if (/riz/.test(texte) && !/canton|au gras/.test(texte)) return true;
  if (/oeuf/.test(texte) && !/gelee/.test(texte)) return true;
  if (/pommes? de terre/.test(texte) && !/boulette|kefta|viande|hach/.test(texte)) return true;
  if (/chou/.test(texte) && !/farci|choucroute/.test(texte)) return true;
  if (/pain tandoori/.test(texte)) return true;
  return false;
}

function marqueurSucre(texte) {
  if (MARQUEURS_SUCRES.test(texte)) return true;
  // « aux noix » = fruits à coque ; « noix » seule reste ambigüe (noix de veau...).
  if (/aux noix/.test(texte)) return true;
  // « pomme » sauf « pommes de terre » (salé, traité à part) et boulettes.
  if (/pomme/.test(texte) && !/pomme de terre|boulette/.test(texte)) return true;
  return false;
}

/**
 * @param {string} dishName nom du plat
 * @param {string[]} labels libellés des ingrédients attendus
 * @param {{ isVegetarian?: boolean }} [flags] drapeau legacy éventuel
 * @returns {string[] | null} tags dans un ordre fixe, ou null sans verdict
 */
export function computeTags(dishName, labels = [], { isVegetarian = false } = {}) {
  const nom = normalizeTexte(dishName);
  const texte = `${nom} | ${(labels ?? []).map(normalizeTexte).join(' | ')}`;
  if (isVegetarian && !contientViande(texte)) return ['VEGETARIAN', 'NO_PORK'];
  if (contientViande(texte)) return null;
  if (/vegan/.test(nom)) return ['VEGAN', 'VEGETARIAN', 'NO_PORK'];
  if (/vegetarien|veggie|sans viande|sin carne/.test(nom)) return ['VEGETARIAN', 'NO_PORK'];
  if (/halal/.test(nom)) return ['HALAL', 'NO_PORK'];
  if (/casher|kosher/.test(nom)) return ['KOSHER', 'NO_PORK'];
  if (marqueurSale(nom)) return ['VEGETARIAN', 'NO_PORK'];
  if (marqueurSucre(nom)) return ['VEGETARIAN'];
  // Dernier filet : nom muet mais ingrédients tous végétariens et explicites.
  const etiquettes = (labels ?? []).map(normalizeTexte).filter(Boolean);
  if (
    etiquettes.length > 0 &&
    !NOMS_AMBIGUS.test(nom) &&
    !/(soupe|potage|veloute|bouillon|fond|jus|wok|poelee)\b/.test(nom) &&
    etiquettes.every((l) => !contientViande(l)) &&
    etiquettes.some((l) => marqueurSale(l) || marqueurSucre(l))
  ) {
    return ['VEGETARIAN'];
  }
  return null;
}
