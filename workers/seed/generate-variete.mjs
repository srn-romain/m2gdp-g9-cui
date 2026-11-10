// Génère seed/variete-plats.sql : attribue à chacune des 500 tablées
// synthétiques un plat varié et réaliste, avec description et régimes.
// Usage : node generate-variete.mjs

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PREFIX = '5eede100-0000-4000-8000-';
const TOTAL = 500;

// Catalogue : ~100 plats faits maison, proches d'une vraie plateforme de repas
// entre voisins. `veg` est déduit des régimes.
const PLATS = [
  ['Bœuf bourguignon', 'Bœuf mijoté au vin rouge, carottes et champignons.', ['NO_GLUTEN']],
  ['Blanquette de veau', 'Veau tendre en sauce crémée aux champignons.', []],
  ['Coq au vin', 'Coq mijoté au vin, lardons et oignons grelots.', ['NO_GLUTEN']],
  ['Daube provençale', 'Bœuf mijoté aux herbes de Provence et olives.', ['NO_GLUTEN']],
  ['Pot-au-feu', 'Bœuf et légumes d’hiver bouillis, bouillon parfumé.', ['NO_GLUTEN']],
  ['Navarin d’agneau', 'Ragoût d’agneau aux navets et petits légumes.', ['NO_GLUTEN']],
  ['Souris d’agneau confite', 'Agneau confit au miel, thym et ail.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Chili con carne', 'Bœuf, haricots rouges, épices douces et maïs.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Poulet rôti et pommes de terre', 'Poulet fermier rôti, jus au thym.', ['NO_GLUTEN']],
  ['Poulet basquaise', 'Poulet mijoté aux poivrons, tomates et piment doux.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Tajine de poulet au citron', 'Poulet, citron confit et olives vertes.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Poulet au curry coco', 'Curry doux au lait de coco et riz basmati.', ['NO_GLUTEN']],
  ['Coquelet rôti aux herbes', 'Coquelet doré au four, jus aux herbes fraîches.', ['NO_GLUTEN']],
  ['Saumon rôti et fenouil', 'Pavé de saumon, fenouil confit et citron.', ['NO_GLUTEN']],
  ['Cabillaud en papillote', 'Cabillaud cuit en papillote, légumes croquants.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Brandade de morue', 'Morue émiettée, pommes de terre et ail.', []],
  ['Sardines grillées', 'Sardines au four, huile d’olive et persillade.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Moules marinières', 'Moules au vin blanc, échalotes et crème.', ['NO_GLUTEN']],
  ['Gratin dauphinois', 'Pommes de terre fondantes, crème et muscade.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Ratatouille', 'Légumes du soleil mijotés à l’huile d’olive.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Curry de pois chiches', 'Pois chiches, épinards et lait de coco.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Dahl de lentilles corail', 'Lentilles corail crémeuses aux épices douces.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Risotto aux champignons', 'Riz crémeux, champignons et parmesan.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Lasagnes aux légumes', 'Lasagnes aux courgettes, épinards et béchamel.', ['VEGETARIAN']],
  ['Tarte fine aux tomates', 'Pâte croustillante, tomates confites et moutarde.', ['VEGETARIAN']],
  ['Quiche lorraine', 'Pâte brisée, lardons, œufs et crème.', []],
  ['Tarte aux poireaux', 'Tarte moelleuse aux poireaux fondants.', ['VEGETARIAN']],
  ['Pissaladière', 'Tarte fine aux oignons caramélisés et anchois.', []],
  ['Tourte aux champignons', 'Tourte dorée aux champignons et crème.', ['VEGETARIAN']],
  ['Soupe à l’oignon gratinée', 'Bouillon d’oignons caramélisés, croûtons et fromage.', ['VEGETARIAN']],
  ['Velouté de potiron', 'Velouté onctueux au potiron et châtaignes.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Minestrone', 'Soupe italienne aux légumes et pâtes.', ['VEGAN', 'VEGETARIAN', 'NO_LACTOSE']],
  ['Soupe miso et légumes', 'Bouillon miso, tofu soyeux et algues.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Couscous royal', 'Semoule, légumes et viandes mijotées.', ['NO_LACTOSE']],
  ['Paella maison', 'Riz safrané, poulet, fruits de mer et légumes.', ['NO_LACTOSE']],
  ['Moussaka', 'Aubergines, viande hachée et béchamel gratinée.', ['NO_GLUTEN']],
  ['Pad thaï', 'Nouilles sautées, crevettes, cacahuètes et citron vert.', ['NO_LACTOSE']],
  ['Biryani aux légumes', 'Riz basmati parfumé, légumes et épices.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Ramen maison', 'Bouillon, nouilles, œuf mariné et légumes.', []],
  ['Pho au bœuf', 'Bouillon parfumé, nouilles de riz et fines herbes.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Maki et california rolls', 'Atelier sushis : riz vinaigré et garnitures fraîches.', ['NO_LACTOSE']],
  ['Nems au poulet', 'Rouleaux croustillants, sauce nuoc-mâm.', ['NO_LACTOSE']],
  ['Bœuf sauté au basilic thaï', 'Bœuf émincé, basilic thaï et riz parfumé.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Spaghetti bolognaise', 'Sauce tomate mijotée et viande hachée.', []],
  ['Pâtes à la carbonara', 'Pâtes crémeuses, guanciale et pecorino.', []],
  ['Pâtes au pesto', 'Pesto de basilic maison, parmesan et pignons.', ['VEGETARIAN']],
  ['Gnocchis à la tomate', 'Gnocchis fondants, sauce tomate et basilic.', ['VEGETARIAN']],
  ['Lasagnes à la bolognaise', 'Lasagnes maison à la viande et béchamel.', []],
  ['Gratin de chou-fleur', 'Chou-fleur, béchamel et fromage gratiné.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Gratin de courgettes', 'Courgettes, riz et béchamel gratinée.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Poêlée de légumes rôtis', 'Légumes de saison rôtis au four et herbes.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Falafels et houmous', 'Falafels maison, houmous et crudités.', ['VEGAN', 'VEGETARIAN', 'NO_LACTOSE']],
  ['Chili sin carne', 'Haricots rouges, maïs et épices douces.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Bol buddha', 'Bol complet : céréales, légumes, houmous et graines.', ['VEGAN', 'VEGETARIAN', 'NO_LACTOSE']],
  ['Galettes de sarrasin', 'Galettes bretonnes garnies œuf, fromage et jambon.', []],
  ['Crêpes salées et sucrées', 'Crêpes fines garnies au choix.', ['VEGETARIAN']],
  ['Omelette aux herbes', 'Omelette baveuse, fines herbes et salade.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Salade niçoise', 'Thon, œufs, haricots verts et olives.', ['NO_GLUTEN']],
  ['Salade de chèvre chaud', 'Salade verte, toasts de chèvre et miel.', ['VEGETARIAN']],
  ['Taboulé libanais', 'Persil, menthe, tomates et boulgour.', ['VEGAN', 'VEGETARIAN', 'NO_LACTOSE']],
  ['Gaspacho', 'Soupe froide de tomates et poivrons.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Tartiflette', 'Pommes de terre, reblochon, lardons et oignons.', ['NO_GLUTEN']],
  ['Fondue savoyarde', 'Fromage fondu, pain et pommes de terre.', ['VEGETARIAN']],
  ['Raclette entre voisins', 'Fromage fondu, charcuterie et pommes de terre.', ['NO_GLUTEN']],
  ['Aligot', 'Purée onctueuse à la tome fraîche et à l’ail.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Choucroute garnie', 'Chou fermenté, viandes et pommes de terre.', ['NO_GLUTEN']],
  ['Cassoulet', 'Haricots blancs mijotés, saucisse et confit.', ['NO_GLUTEN']],
  ['Petit salé aux lentilles', 'Porc confit et lentilles mijotées.', ['NO_GLUTEN']],
  ['Hachis parmentier', 'Bœuf haché, purée maison et fromage gratiné.', ['NO_GLUTEN']],
  ['Gratin de pâtes', 'Pâtes, jambon et béchamel gratinée.', []],
  ['Rôti de porc aux pruneaux', 'Rôti de porc moelleux, sauce aux pruneaux.', ['NO_GLUTEN']],
  ['Épaule d’agneau confite', 'Épaule d’agneau fondante, jus au romarin.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Magret de canard', 'Magret rosé, purée de patate douce.', ['NO_GLUTEN']],
  ['Poulet au miel et sésame', 'Poulet laqué au miel, riz et sésame.', ['NO_GLUTEN', 'NO_LACTOSE']],
  ['Boulettes sauce tomate', 'Boulettes moelleuses, sauce tomate maison.', ['NO_LACTOSE']],
  ['Courge rôtie et châtaignes', 'Courge rôtie, châtaignes et miel.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Tian de légumes', 'Légumes de Provence cuits au four.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Crumble de légumes', 'Légumes fondants sous un crumble croustillant.', ['VEGETARIAN']],
  ['Parmentier végétarien', 'Purée maison et lentilles mijotées.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Tarte tatin', 'Pommes caramélisées, pâte croustillante.', ['VEGETARIAN']],
  ['Clafoutis aux cerises', 'Flan moelleux aux cerises.', ['VEGETARIAN']],
  ['Mousse au chocolat', 'Mousse onctueuse au chocolat noir.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Crumble aux pommes', 'Pommes fondantes et crumble croustillant.', ['VEGETARIAN']],
  ['Crêpes suzette', 'Crêpes flambées au beurre d’orange.', ['VEGETARIAN']],
  ['Gâteau au yaourt', 'Gâteau moelleux au yaourt et au citron.', ['VEGETARIAN']],
  ['Far aux pruneaux', 'Flan breton aux pruneaux.', ['VEGETARIAN']],
  ['Salade de fruits frais', 'Fruits de saison découpés, menthe.', ['VEGAN', 'VEGETARIAN', 'NO_GLUTEN', 'NO_LACTOSE']],
  ['Brioche perdue', 'Brioche dorée, sirop d’érable et fruits.', ['VEGETARIAN']],
  ['Pancakes maison', 'Pancakes moelleux, sirop d’érable.', ['VEGETARIAN']],
  ['Granola et yaourt', 'Granola maison, yaourt et fruits frais.', ['VEGETARIAN']],
  ['Smoothie bowl', 'Smoothie épais, granola et fruits.', ['VEGAN', 'VEGETARIAN', 'NO_LACTOSE']],
  ['Pain perdu salé', 'Pain perdu au fromage et œuf poché.', ['VEGETARIAN']],
  ['Carpaccio de betteraves', 'Betteraves fines, chèvre et noix.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Aubergines farcies', 'Aubergines garnies, tomates et fromage.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Poivrons farcis', 'Poivrons au riz, légumes et herbes.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Tomates farcies', 'Tomates à la chair, riz et herbes.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Courgettes farcies', 'Courgettes rondes garnies de riz et légumes.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Gratin de blettes', 'Blettes, béchamel et parmesan gratiné.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Épinards à la crème', 'Épinards fondants, crème et œuf mollet.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Lentilles au lard', 'Lentilles mijotées, lardons et carottes.', ['NO_GLUTEN']],
  ['Riz au lait crémeux', 'Riz au lait vanillé et caramel.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Polenta crémeuse aux champignons', 'Polenta onctueuse et poêlée de champignons.', ['VEGETARIAN', 'NO_GLUTEN']],
  ['Quinoa aux légumes rôtis', 'Quinoa, légumes rôtis et feta.', ['VEGETARIAN', 'NO_GLUTEN']],
];

// Mélange déterministe : évite que deux tablées voisines aient le même plat.
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

const catalogue = seededShuffle(PLATS, 42);
const lignes = [];

lignes.push('-- Variété des plats synthétiques : remplace les doublons par un catalogue');
lignes.push('-- réaliste (~' + PLATS.length + ' plats) appliqué aux 500 tablées. Idempotent.');
lignes.push('-- Application : npx wrangler d1 execute labonnetablee-db --remote --file=seed/variete-plats.sql');

for (let i = 1; i <= TOTAL; i++) {
  const [nom, description, regimes] = catalogue[(i - 1) % catalogue.length];
  const veg = regimes.includes('VEGETARIAN') || regimes.includes('VEGAN') ? 1 : 0;
  const allergene = (i % 3 === 0) ? 1 : 0;
  const tags = JSON.stringify(regimes);
  const id = PREFIX + String(i).padStart(12, '0');
  lignes.push(
    `UPDATE tables SET dishName='${esc(nom)}', description='${esc(description)}', isVegetarian=${veg}, hasAllergenNotice=${allergene}, dietaryTags='${tags}' WHERE id='${id}';`,
  );
}

const ici = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(ici, 'variete-plats.sql'), lignes.join('\n') + '\n');
console.log(`Écrit ${lignes.length} lignes dans seed/variete-plats.sql`);
