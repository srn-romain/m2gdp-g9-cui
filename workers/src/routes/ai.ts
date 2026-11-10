import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { requireAuth } from '../auth';

// Choix documenté dans docs/feedback.md : Workers AI, modèle léger et rapide.
const MODELE = '@cf/meta/llama-3.2-3b-instruct';

export const aiRoutes = new Hono<{ Bindings: Env }>();

function extraireJson(texte: unknown): unknown {
  if (typeof texte !== 'string') return null;
  const brut = texte.replace(/```json|```/g, '').trim();
  const debut = brut.indexOf('{');
  const fin = brut.lastIndexOf('}');
  if (debut < 0 || fin < 0) return null;
  try {
    return JSON.parse(brut.slice(debut, fin + 1));
  } catch {
    return null;
  }
}

async function generer(c: { env: Env }, messages: Array<{ role: string; content: string }>): Promise<string | null> {
  try {
    if (!c.env.AI) return null;
    const resultat = (await Promise.race([
      c.env.AI.run(MODELE as string, {
        messages,
        max_tokens: 500,
      }) as Promise<{ response?: string }>,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000)),
    ])) as { response?: unknown } | null;
    return typeof resultat?.response === 'string' ? resultat.response : null;
  } catch (e) {
    console.error('IA table-draft KO', e);
    return null;
  }
}

/** Catalogue local d'ingrédients : repli fiable quand l'IA est indisponible. */
const CATALOGUE_INGREDIENTS: Array<{ re: RegExp; ingredients: Array<{ label: string; quantity: number; unit: string }> }> = [
  { re: /gratin|dauphinois|parmentier|aligot/i, ingredients: [{ label: 'Pommes de terre', quantity: 1, unit: 'KG' }, { label: 'Crème fraîche', quantity: 20, unit: 'CL' }, { label: 'Fromage râpé', quantity: 200, unit: 'G' }, { label: 'Ail', quantity: 2, unit: 'UNIT' }] },
  { re: /lasagn|pâtes|pate|spaghetti|tagliatelle|gnocchi|carbonara|bolognaise|pesto/i, ingredients: [{ label: 'Pâtes', quantity: 500, unit: 'G' }, { label: 'Sauce tomate', quantity: 40, unit: 'CL' }, { label: 'Parmesan', quantity: 100, unit: 'G' }, { label: 'Basilic frais', quantity: 1, unit: 'UNIT' }] },
  { re: /risotto|riz\b/i, ingredients: [{ label: 'Riz arborio', quantity: 300, unit: 'G' }, { label: 'Champignons', quantity: 250, unit: 'G' }, { label: 'Parmesan', quantity: 100, unit: 'G' }, { label: 'Bouillon de légumes', quantity: 1, unit: 'L' }] },
  { re: /curry|massala|korma/i, ingredients: [{ label: 'Lait de coco', quantity: 40, unit: 'CL' }, { label: 'Pois chiches', quantity: 400, unit: 'G' }, { label: 'Riz basmati', quantity: 300, unit: 'G' }, { label: 'Pâte de curry', quantity: 2, unit: 'UNIT' }] },
  { re: /couscous/i, ingredients: [{ label: 'Semoule', quantity: 400, unit: 'G' }, { label: 'Carottes', quantity: 400, unit: 'G' }, { label: 'Courgettes', quantity: 300, unit: 'G' }, { label: 'Pois chiches', quantity: 300, unit: 'G' }] },
  { re: /tajine/i, ingredients: [{ label: 'Citron confit', quantity: 2, unit: 'UNIT' }, { label: 'Olives vertes', quantity: 150, unit: 'G' }, { label: 'Coriandre fraîche', quantity: 1, unit: 'UNIT' }, { label: 'Semoule', quantity: 400, unit: 'G' }] },
  { re: /soupe|potage|velout|minestrone|gaspacho/i, ingredients: [{ label: 'Légumes de saison', quantity: 800, unit: 'G' }, { label: 'Bouillon', quantity: 1, unit: 'L' }, { label: 'Pain de campagne', quantity: 1, unit: 'UNIT' }, { label: 'Crème fraîche', quantity: 20, unit: 'CL' }] },
  { re: /quiche|tarte sal|tourte|pissaladi/i, ingredients: [{ label: 'Pâte brisée', quantity: 1, unit: 'UNIT' }, { label: 'Œufs', quantity: 4, unit: 'UNIT' }, { label: 'Crème fraîche', quantity: 20, unit: 'CL' }, { label: 'Lardons', quantity: 150, unit: 'G' }] },
  { re: /poulet|volaille|coquelet|magret|canard/i, ingredients: [{ label: 'Poulet entier', quantity: 1, unit: 'UNIT' }, { label: 'Pommes de terre', quantity: 800, unit: 'G' }, { label: 'Herbes de Provence', quantity: 1, unit: 'UNIT' }, { label: 'Citron', quantity: 2, unit: 'UNIT' }] },
  { re: /boeuf|bœuf|bourguignon|daube|pot-au-feu|pot au feu|chili con carne/i, ingredients: [{ label: 'Bœuf à mijoter', quantity: 800, unit: 'G' }, { label: 'Carottes', quantity: 400, unit: 'G' }, { label: 'Oignons', quantity: 3, unit: 'UNIT' }, { label: 'Vin rouge', quantity: 50, unit: 'CL' }] },
  { re: /agneau|souris|navarin|tajine d.agneau/i, ingredients: [{ label: 'Agneau', quantity: 800, unit: 'G' }, { label: 'Pommes de terre', quantity: 600, unit: 'G' }, { label: 'Thym', quantity: 1, unit: 'UNIT' }, { label: 'Ail', quantity: 3, unit: 'UNIT' }] },
  { re: /saumon|poisson|cabillaud|colin|truite|moule|sardine|morue|brandade/i, ingredients: [{ label: 'Poisson', quantity: 600, unit: 'G' }, { label: 'Fenouil', quantity: 1, unit: 'UNIT' }, { label: 'Citron', quantity: 2, unit: 'UNIT' }, { label: 'Aneth', quantity: 1, unit: 'UNIT' }] },
  { re: /porc|rôti de porc|roti de porc|cassoulet|choucroute|petit salé|petit sale/i, ingredients: [{ label: 'Porc', quantity: 800, unit: 'G' }, { label: 'Haricots blancs', quantity: 400, unit: 'G' }, { label: 'Carottes', quantity: 300, unit: 'G' }, { label: 'Bouquet garni', quantity: 1, unit: 'UNIT' }] },
  { re: /veau|blanquette|escalope/i, ingredients: [{ label: 'Veau', quantity: 800, unit: 'G' }, { label: 'Champignons', quantity: 300, unit: 'G' }, { label: 'Carottes', quantity: 300, unit: 'G' }, { label: 'Crème fraîche', quantity: 25, unit: 'CL' }] },
  { re: /pizza|focaccia|calzone/i, ingredients: [{ label: 'Pâte à pizza', quantity: 2, unit: 'UNIT' }, { label: 'Sauce tomate', quantity: 30, unit: 'CL' }, { label: 'Mozzarella', quantity: 250, unit: 'G' }, { label: 'Roquette', quantity: 100, unit: 'G' }] },
  { re: /salade|crudit|taboul|bol buddha|buddha/i, ingredients: [{ label: 'Salade verte', quantity: 2, unit: 'UNIT' }, { label: 'Tomates cerises', quantity: 250, unit: 'G' }, { label: 'Concombre', quantity: 1, unit: 'UNIT' }, { label: 'Vinaigrette', quantity: 1, unit: 'UNIT' }] },
  { re: /falafel|houmous|mezze/i, ingredients: [{ label: 'Pois chiches', quantity: 400, unit: 'G' }, { label: 'Tahini', quantity: 150, unit: 'G' }, { label: 'Menthe fraîche', quantity: 1, unit: 'UNIT' }, { label: 'Pain pita', quantity: 6, unit: 'UNIT' }] },
  { re: /ratatouille|tian|légumes rôtis|legumes rotis|poêlée|poelee|aubergine|courgette|poivron/i, ingredients: [{ label: 'Aubergines', quantity: 2, unit: 'UNIT' }, { label: 'Courgettes', quantity: 3, unit: 'UNIT' }, { label: 'Poivrons', quantity: 3, unit: 'UNIT' }, { label: 'Tomates', quantity: 500, unit: 'G' }] },
  { re: /sushi|maki|california|ramen|pho|nems|pad thaï|pad thai|biryani/i, ingredients: [{ label: 'Riz à sushi', quantity: 400, unit: 'G' }, { label: 'Nori', quantity: 10, unit: 'UNIT' }, { label: 'Sauce soja', quantity: 15, unit: 'CL' }, { label: 'Gingembre', quantity: 1, unit: 'UNIT' }] },
  { re: /fondue|raclette/i, ingredients: [{ label: 'Fromage à fondre', quantity: 800, unit: 'G' }, { label: 'Pommes de terre', quantity: 1, unit: 'KG' }, { label: 'Charcuterie', quantity: 400, unit: 'G' }, { label: 'Cornichons', quantity: 1, unit: 'UNIT' }] },
  { re: /crêpe|crepe|galette|pancake|brioche|brunch/i, ingredients: [{ label: 'Farine', quantity: 300, unit: 'G' }, { label: 'Œufs', quantity: 4, unit: 'UNIT' }, { label: 'Lait', quantity: 50, unit: 'CL' }, { label: 'Confiture', quantity: 1, unit: 'UNIT' }] },
  { re: /dessert|tarte|clafouti|crumble|gâteau|gateau|mousse|chocolat|fruit/i, ingredients: [{ label: 'Fruits de saison', quantity: 600, unit: 'G' }, { label: 'Farine', quantity: 200, unit: 'G' }, { label: 'Beurre', quantity: 125, unit: 'G' }, { label: 'Sucre', quantity: 150, unit: 'G' }] },
  { re: /lentille|dahl|dal\b/i, ingredients: [{ label: 'Lentilles corail', quantity: 300, unit: 'G' }, { label: 'Lait de coco', quantity: 40, unit: 'CL' }, { label: 'Épinards', quantity: 200, unit: 'G' }, { label: 'Riz basmati', quantity: 300, unit: 'G' }] },
];

function suggestionsLocales(texte: string): Array<{ label: string; quantity: number; unit: string }> {
  const hit = CATALOGUE_INGREDIENTS.find((e) => e.re.test(texte));
  if (hit) return hit.ingredients;
  return [
    { label: 'Ingrédient de saison', quantity: 1, unit: 'UNIT' },
    { label: 'Boisson à partager', quantity: 1, unit: 'UNIT' },
    { label: 'Dessert à partager', quantity: 1, unit: 'UNIT' },
  ];
}

aiRoutes.post('/table-draft', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const b = (await c.req.json().catch(() => null)) as { description?: string } | null;
  const description = (b?.description ?? '').trim();
  if (description.length < 3 || description.length > 1000) {
    return apiError('VALIDATION_ERROR', 'description invalide.', { field: 'description' });
  }
  const reponse = await generer(c, [
    {
      role: 'system',
      content:
        'Tu es un assistant de cuisine convivial. À partir de la description, propose un brouillon de tablée. Réponds UNIQUEMENT en JSON avec les clés : dishName (string), description (string), wantedContributions (tableau d\'objets {label, quantity, unit}), seatsTotal (nombre entier entre 2 et 12), durationMinutes (nombre entier).',
    },
    { role: 'user', content: description },
  ]);

  if (!reponse) {
    return c.json({
      data: {
        dishName: description.slice(0, 60),
        description,
        wantedContributions: suggestionsLocales(description),
        seatsTotal: 4,
        durationMinutes: 120,
      },
    });
  }

  const parsed = extraireJson(reponse) as Record<string, unknown> | null;
  const nom = typeof parsed?.dishName === 'string' ? parsed.dishName : description.slice(0, 60);
  return c.json({
    data: {
      dishName: nom,
      description: typeof parsed?.description === 'string' ? parsed.description : description,
      wantedContributions: suggestionsLocales(`${description} ${nom}`),
      seatsTotal: Number.isFinite(Number(parsed?.seatsTotal)) ? Number(parsed?.seatsTotal) : 4,
      durationMinutes: Number.isFinite(Number(parsed?.durationMinutes)) ? Number(parsed?.durationMinutes) : 120,
    },
  });
});

aiRoutes.post('/table-suggestions', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const b = (await c.req.json().catch(() => null)) as { query?: string } | null;
  const query = (b?.query ?? '').trim();
  if (query.length < 2 || query.length > 200) {
    return apiError('VALIDATION_ERROR', 'query invalide.', { field: 'query' });
  }

  // Catalogue des plats réellement proposés autour de l'utilisateur : l'IA ne
  // doit suggérer que des plats qui existent dans la base, jamais en inventer.
  const rows = await c.env.DB.prepare(
    "SELECT DISTINCT dishName FROM tables WHERE status IN ('OPEN','FULL')",
  ).all<{ dishName: string }>();
  const catalogue = [...new Set((rows.results ?? []).map((r) => r.dishName.trim()).filter(Boolean))];
  if (!catalogue.length) return c.json({ data: { dishes: [] } });

  const reponse = await generer(c, [
    {
      role: 'system',
      content:
        'Tu es un assistant qui aide à trouver des repas partagés. Voici la liste exacte des plats proposés autour de l\'utilisateur : ' +
        JSON.stringify(catalogue) +
        '. À partir de la demande (envie, humeur, saison), choisis jusqu\'à 4 plats UNIQUEMENT dans cette liste, ceux qui correspondent le mieux. Réponds UNIQUEMENT en JSON : {"dishes": ["plat de la liste", ...]}. Recopie chaque nom exactement comme dans la liste, sans en inventer.',
    },
    { role: 'user', content: query },
  ]);

  // Repli lexical quand l'IA ne répond pas : on rapproche les mots de la demande
  // des noms de plats du catalogue.
  const mots = query.toLowerCase().split(/[^a-z0-9à-ÿ]+/i).filter((m) => m.length > 2);
  const repli = catalogue.filter((d) => mots.some((m) => d.toLowerCase().includes(m))).slice(0, 4);
  if (!reponse) return c.json({ data: { dishes: repli } });

  const parsed = extraireJson(reponse) as { dishes?: unknown } | null;
  if (!Array.isArray(parsed?.dishes)) return c.json({ data: { dishes: repli } });

  // On ne conserve que les noms réellement présents dans le catalogue (insensible
  // à la casse), pour éviter que l'IA n'invente un plat.
  const parNom = new Map(catalogue.map((d) => [d.toLowerCase(), d]));
  const dishes = parsed.dishes
    .filter((d): d is string => typeof d === 'string')
    .map((d) => parNom.get(d.trim().toLowerCase()))
    .filter((d): d is string => Boolean(d))
    .slice(0, 6);
  return c.json({ data: { dishes: dishes.length ? dishes : repli } });
});
