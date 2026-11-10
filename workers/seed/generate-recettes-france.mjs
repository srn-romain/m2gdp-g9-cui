// Génère seed/recettes-france.sql : enrichit les 500 tablées synthétiques avec
// TOUTES les recettes TheMealDB (nom, description et image réels) pour une vraie
// variété, sans doublons côte à côte. Usage : node generate-recettes-france.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PREFIX = '5eede100-0000-4000-8000-';
const TOTAL = 500;

const FR = {
  '52904': ['Bœuf bourguignon', 'Bœuf mijoté au vin rouge, lardons, champignons et carottes.'],
  '52914': ['Pommes boulangère', 'Pommes de terre fondantes cuites au four avec oignons et bouillon.'],
  '52913': ['Brie en croûte de brioche', 'Brie fondant enveloppé de brioche et jambon cru.'],
  '52934': ['Poulet basquaise', 'Poulet mijoté aux poivrons, tomates et piment doux.'],
  '52920': ['Poulet Marengo', 'Poulet sauté aux tomates, vin blanc et champignons.'],
  '52879': ['Parmentier de poulet', 'Hachis de poulet gratiné sous une purée maison.'],
  '52910': ['Tartelettes aux pommes de Chinon', 'Petites tartes fines aux pommes caramélisées.'],
  '52776': ['Gâteau au chocolat', 'Gâteau moelleux et intense au chocolat noir.'],
  '52905': ['Soufflé au chocolat', 'Soufflé aérien au cœur coulant de chocolat.'],
  '52832': ['Coq au vin', 'Coq mijoté au vin rouge, champignons et oignons grelots.'],
  '52907': ['Confit de canard', 'Cuisse de canard confite, pommes de terre dorées.'],
  '52919': ['Gratin dauphinois au fenouil', 'Gratin crémeux de pommes de terre et fenouil.'],
  '52918': ['Soupe de poisson à la rouille', 'Bouillon de poisson parfumé, croûtons et rouille.'],
  '52906': ['Flamiche aux poireaux', 'Tarte généreuse aux poireaux fondants et crème.'],
  '52815': ['Lentilles à l’ail et au thym', 'Lentilles mijotées, ail confit et thym frais.'],
  '52915': ['Omelette française', 'Omelette baveuse aux fines herbes.'],
  '52903': ['Soupe à l’oignon', 'Soupe gratinée aux oignons caramélisés et croûtons.'],
  '52916': ['Tarte tatin aux poires', 'Poires caramélisées sous une pâte croustillante.'],
  '52847': ['Cassoulet', 'Haricots blancs mijotés, saucisse et confit de canard.'],
  '52922': ['Bisque de crevettes au fenouil', 'Velouté de crevettes parfumé au fenouil.'],
  '52921': ['Omelette provençale', 'Omelette épaisse aux légumes du soleil et herbes.'],
  '52908': ['Ratatouille', 'Légumes du soleil mijotés à l’huile d’olive.'],
  '52935': ['Steak Diane', 'Steak poêlé, sauce au cognac et champignons.'],
  '52911': ['Soupe au pistou', 'Soupe de légumes d’été au basilic et ail.'],
  '52909': ['Tarte Tatin', 'Pommes caramélisées, pâte feuilletée croustillante.'],
  '52912': ['Soufflés aux trois fromages', 'Soufflés légers et gratinés aux trois fromages.'],
  '52852': ['Salade niçoise au thon', 'Thon, œufs, haricots verts, olives et tomates.'],
  '52917': ['Crème brûlée au chocolat blanc', 'Crème onctueuse au chocolat blanc et caramel croquant.'],
};

const VEGETARIEN = new Set([
  '52914', '52910', '52776', '52905', '52919', '52906', '52815', '52915', '52903',
  '52916', '52921', '52908', '52911', '52909', '52912', '52917',
]);

const CATEGORIE_FR = {
  Beef: 'au bœuf',
  Chicken: 'au poulet',
  Pork: 'au porc',
  Lamb: 'à l’agneau',
  Seafood: 'aux fruits de mer',
  Vegetarian: 'végétarienne',
  Vegan: 'vegan',
  Pasta: 'aux pâtes',
  Dessert: 'sucrée',
  Side: 'en accompagnement',
  Starter: 'en entrée',
  Breakfast: 'pour le petit-déjeuner',
  Goat: 'au fromage de chèvre',
};

const CATALOGUE_INGREDIENTS = [
  { re: /gratin|dauphinois|parmentier|boulangère|boulangere|aligot|potato/i, ingredients: [{ label: 'Pommes de terre', quantity: 1, unit: 'KG' }, { label: 'Crème fraîche', quantity: 20, unit: 'CL' }, { label: 'Fromage râpé', quantity: 200, unit: 'G' }, { label: 'Ail', quantity: 2, unit: 'UNIT' }] },
  { re: /pasta|spaghetti|tagliatelle|gnocchi|carbonara|lasagn|macaroni|linguine/i, ingredients: [{ label: 'Pâtes', quantity: 500, unit: 'G' }, { label: 'Sauce tomate', quantity: 40, unit: 'CL' }, { label: 'Parmesan', quantity: 100, unit: 'G' }, { label: 'Basilic frais', quantity: 1, unit: 'UNIT' }] },
  { re: /risotto|rice/i, ingredients: [{ label: 'Riz arborio', quantity: 300, unit: 'G' }, { label: 'Champignons', quantity: 250, unit: 'G' }, { label: 'Parmesan', quantity: 100, unit: 'G' }, { label: 'Bouillon de légumes', quantity: 1, unit: 'L' }] },
  { re: /soup|potage|velout|minestrone|bisque|stew|chowder|onion/i, ingredients: [{ label: 'Légumes de saison', quantity: 800, unit: 'G' }, { label: 'Bouillon', quantity: 1, unit: 'L' }, { label: 'Pain de campagne', quantity: 1, unit: 'UNIT' }, { label: 'Crème fraîche', quantity: 20, unit: 'CL' }] },
  { re: /tarte|tart|quiche|tourte|flamiche|tatin|dessert|gâteau|gateau|soufflé|souffle|crème brûlée|creme brulee|chocolate|cake|pie|pudding|crumble/i, ingredients: [{ label: 'Farine', quantity: 200, unit: 'G' }, { label: 'Beurre', quantity: 125, unit: 'G' }, { label: 'Œufs', quantity: 4, unit: 'UNIT' }, { label: 'Sucre', quantity: 150, unit: 'G' }] },
  { re: /chicken|poulet|volaille|coq|canard|duck|coquelet|turkey/i, ingredients: [{ label: 'Poulet entier', quantity: 1, unit: 'UNIT' }, { label: 'Pommes de terre', quantity: 800, unit: 'G' }, { label: 'Herbes de Provence', quantity: 1, unit: 'UNIT' }, { label: 'Citron', quantity: 2, unit: 'UNIT' }] },
  { re: /beef|boeuf|bœuf|bourguignon|steak|diane|meatball|burger/i, ingredients: [{ label: 'Bœuf à mijoter', quantity: 800, unit: 'G' }, { label: 'Carottes', quantity: 400, unit: 'G' }, { label: 'Oignons', quantity: 3, unit: 'UNIT' }, { label: 'Vin rouge', quantity: 50, unit: 'CL' }] },
  { re: /fish|poisson|saumon|salmon|cabillaud|cod|tuna|thon|crevette|prawn|shrimp|moule|mussel|sardine|seafood|niçoise|nicoise/i, ingredients: [{ label: 'Poisson', quantity: 600, unit: 'G' }, { label: 'Fenouil', quantity: 1, unit: 'UNIT' }, { label: 'Citron', quantity: 2, unit: 'UNIT' }, { label: 'Aneth', quantity: 1, unit: 'UNIT' }] },
  { re: /pork|porc|cassoulet|saucisse|sausage|confit|bacon|ham/i, ingredients: [{ label: 'Porc', quantity: 800, unit: 'G' }, { label: 'Haricots blancs', quantity: 400, unit: 'G' }, { label: 'Carottes', quantity: 300, unit: 'G' }, { label: 'Bouquet garni', quantity: 1, unit: 'UNIT' }] },
  { re: /ratatouille|provençal|provencal|tian|légume|legume|aubergine|eggplant|courgette|zucchini|poivron|pepper/i, ingredients: [{ label: 'Aubergines', quantity: 2, unit: 'UNIT' }, { label: 'Courgettes', quantity: 3, unit: 'UNIT' }, { label: 'Poivrons', quantity: 3, unit: 'UNIT' }, { label: 'Tomates', quantity: 500, unit: 'G' }] },
  { re: /lentil|salad|salade|crudit|taboul/i, ingredients: [{ label: 'Lentilles vertes', quantity: 300, unit: 'G' }, { label: 'Carottes', quantity: 250, unit: 'G' }, { label: 'Ail', quantity: 3, unit: 'UNIT' }, { label: 'Thym', quantity: 1, unit: 'UNIT' }] },
  { re: /omelette|œuf|oeuf|egg/i, ingredients: [{ label: 'Œufs', quantity: 6, unit: 'UNIT' }, { label: 'Fines herbes', quantity: 1, unit: 'UNIT' }, { label: 'Salade verte', quantity: 2, unit: 'UNIT' }, { label: 'Pain de campagne', quantity: 1, unit: 'UNIT' }] },
  { re: /cheese|fromage|brie/i, ingredients: [{ label: 'Fromage affiné', quantity: 300, unit: 'G' }, { label: 'Pain', quantity: 1, unit: 'UNIT' }, { label: 'Beurre', quantity: 50, unit: 'G' }, { label: 'Salade verte', quantity: 2, unit: 'UNIT' }] },
  { re: /curry|spicy|tikka|massala|korma/i, ingredients: [{ label: 'Lait de coco', quantity: 40, unit: 'CL' }, { label: 'Pois chiches', quantity: 400, unit: 'G' }, { label: 'Riz basmati', quantity: 300, unit: 'G' }, { label: 'Pâte de curry', quantity: 2, unit: 'UNIT' }] },
  { re: /sushi|maki|ramen|pho|noodle|pad thai|biryani/i, ingredients: [{ label: 'Riz à sushi', quantity: 400, unit: 'G' }, { label: 'Nori', quantity: 10, unit: 'UNIT' }, { label: 'Sauce soja', quantity: 15, unit: 'CL' }, { label: 'Gingembre', quantity: 1, unit: 'UNIT' }] },
  { re: /falafel|houmous|hummus|mezze/i, ingredients: [{ label: 'Pois chiches', quantity: 400, unit: 'G' }, { label: 'Tahini', quantity: 150, unit: 'G' }, { label: 'Menthe fraîche', quantity: 1, unit: 'UNIT' }, { label: 'Pain pita', quantity: 6, unit: 'UNIT' }] },
  { re: /pizza|focaccia|calzone/i, ingredients: [{ label: 'Pâte à pizza', quantity: 2, unit: 'UNIT' }, { label: 'Sauce tomate', quantity: 30, unit: 'CL' }, { label: 'Mozzarella', quantity: 250, unit: 'G' }, { label: 'Roquette', quantity: 100, unit: 'G' }] },
];

function suggestionsLocales(texte) {
  const hit = CATALOGUE_INGREDIENTS.find((e) => e.re.test(texte));
  if (hit) return hit.ingredients;
  return [
    { label: 'Ingrédient de saison', quantity: 1, unit: 'UNIT' },
    { label: 'Boisson à partager', quantity: 1, unit: 'UNIT' },
    { label: 'Dessert à partager', quantity: 1, unit: 'UNIT' },
  ];
}

function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function esc(s) {
  return s.replace(/'/g, "''");
}

async function call(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function main() {
  const parId = new Map();
  for (let code = 97; code <= 122; code++) {
    const lettre = String.fromCharCode(code);
    const res = await call(`https://www.themealdb.com/api/json/v1/1/search.php?f=${lettre}`);
    for (const m of res.meals ?? []) {
      if (!parId.has(m.idMeal)) parId.set(m.idMeal, m);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const tous = [...parId.values()];
  tous.sort((a, b) => a.strMeal.localeCompare(b.strMeal));
  const repas = tous.map((m) => {
    const fr = FR[m.idMeal];
    const nom = fr?.[0] ?? m.strMeal;
    const description = fr?.[1] ?? `Recette ${CATEGORIE_FR[m.strCategory] ?? 'maison'} à partager entre voisins.`;
    return {
      nom,
      description,
      image: m.strMealThumb,
      ingredients: suggestionsLocales(`${nom} ${m.strMeal} ${m.strCategory ?? ''}`),
      vegetarien: fr ? VEGETARIEN.has(m.idMeal) : (m.strCategory === 'Vegetarian' || m.strCategory === 'Vegan'),
    };
  });

  const ordre = seededShuffle(repas, 42);
  const lignes = [
    '-- Toutes les recettes TheMealDB appliquées aux 500 tablées synthétiques.',
    '-- Idempotent. Application : npx wrangler d1 execute labonnetablee-db --remote --file=seed/recettes-france.sql',
  ];
  for (let i = 1; i <= TOTAL; i++) {
    const r = ordre[(i - 1) % ordre.length];
    const id = PREFIX + String(i).padStart(12, '0');
    const wanted = JSON.stringify(r.ingredients).replace(/'/g, "''");
    lignes.push(
      `UPDATE tables SET dishName='${esc(r.nom)}', description='${esc(r.description)}', dishImageUrl='${r.image}', wantedContributions='${wanted}', isVegetarian=${r.vegetarien ? 1 : 0} WHERE id='${id}';`,
    );
  }

  const ici = dirname(fileURLToPath(import.meta.url));
  writeFileSync(join(ici, 'recettes-france.sql'), lignes.join('\n') + '\n');
  console.log(`Écrit ${lignes.length} lignes (${repas.length} recettes) dans seed/recettes-france.sql`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
