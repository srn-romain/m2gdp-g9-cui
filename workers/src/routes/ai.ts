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

/** Nettoie une éventuelle mise en forme autour d'une ligne marqueur. */
function nettoyerMarqueur(ligne: string): string {
  return ligne.trim().replace(/[*_~`#]+/g, '').trim();
}

/** Ligne « AMBIANCE : » avec ou sans mise en forme, contenu éventuel après « : ». */
function lireMarqueurAmbiance(ligne: string): { marqueur: boolean; suite: string } {
  const nettoyee = nettoyerMarqueur(ligne);
  if (/^ambiance$/i.test(nettoyee)) return { marqueur: true, suite: '' };
  const m = /^ambiance\s*:\s*(.+)?$/i.exec(nettoyee);
  if (!m) return { marqueur: false, suite: '' };
  return { marqueur: true, suite: (m[1] ?? '').trim() };
}

/**
 * Tronque à max caractères en coupant à la dernière fin de phrase si possible.
 */
export function tronquerTexte(texte: string, max: number): string {
  const propre = texte.trim().replace(/\s+/g, ' ');
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  if (/[.!?]$/.test(coupe)) return coupe;
  const finPhrase = Math.max(coupe.lastIndexOf('. '), coupe.lastIndexOf('! '), coupe.lastIndexOf('? '));
  if (finPhrase >= Math.floor(max * 0.4)) return coupe.slice(0, finPhrase + 1).trim();
  return coupe.trim();
}

/**
 * Lit le premier objet JSON à partir d'une ligne, même indenté sur plusieurs
 * lignes : on avance jusqu'à équilibre des accolades (hors chaînes).
 */
function lirePremierJson(lignes: string[], depart: number): { data: Record<string, unknown> | null; fin: number } {
  let texte = '';
  let profondeur = 0;
  let dansChaine = false;
  let echappe = false;
  let commence = false;
  for (let i = depart; i < lignes.length; i++) {
    for (const car of lignes[i]) {
      if (dansChaine) {
        if (echappe) echappe = false;
        else if (car === '\\') echappe = true;
        else if (car === '"') dansChaine = false;
      } else if (car === '"') {
        dansChaine = true;
      } else if (car === '{') {
        profondeur++;
        commence = true;
      } else if (car === '}') {
        profondeur--;
      }
      if (commence) texte += car;
      if (commence && profondeur === 0 && !dansChaine) {
        try {
          return { data: JSON.parse(texte) as Record<string, unknown>, fin: i };
        } catch {
          return { data: null, fin: i };
        }
      }
    }
    if (commence) texte += '\n';
  }
  return { data: null, fin: lignes.length - 1 };
}

/**
 * Découpe la réponse IA en trois morceaux : le premier objet JSON (nom,
 * ingrédients, places, durée, sur une ou plusieurs lignes), puis le paragraphe
 * du plat, puis — après la ligne « AMBIANCE : » — le paragraphe d'ambiance.
 * Les retours à la ligne parasites sont fusionnés pour garder un seul paragraphe.
 */
export function extraireBrouillon(texte: unknown): {
  data: Record<string, unknown> | null;
  description: string | null;
  ambiance: string | null;
} {
  const vide = {
    data: null as Record<string, unknown> | null,
    description: null as string | null,
    ambiance: null as string | null,
  };
  if (typeof texte !== 'string') return vide;
  const lignes = texte.replace(/```json|```/g, '').split('\n');
  const idxJson = lignes.findIndex((l) => l.trim() !== '');
  if (idxJson < 0) return vide;
  const lu = lirePremierJson(lignes, idxJson);
  let data = lu.data;
  let debut = lu.fin + 1;
  if (!data) {
    // Repli : ancienne forme JSON complète.
    const complet = extraireJson(texte) as Record<string, unknown> | null;
    if (complet) {
      return {
        data: complet,
        description: typeof complet.description === 'string' ? complet.description : null,
        ambiance: typeof complet.ambiance === 'string' ? complet.ambiance : null,
      };
    }
    // Sans JSON : on tente quand même la découpe par marqueur.
    debut = idxJson;
  }
  const lignesDescription: string[] = [];
  const lignesAmbiance: string[] = [];
  let dansAmbiance = false;
  let marqueurTrouve = false;
  for (const ligne of lignes.slice(debut)) {
    const { marqueur, suite } = lireMarqueurAmbiance(ligne);
    if (marqueur && !dansAmbiance) {
      dansAmbiance = true;
      marqueurTrouve = true;
      if (suite) lignesAmbiance.push(suite);
      continue;
    }
    const propre = ligne.trim();
    if (!propre) continue;
    (dansAmbiance ? lignesAmbiance : lignesDescription).push(propre);
  }
  if (!data && !marqueurTrouve) return vide;
  return {
    data,
    description:
      lignesDescription.length
        ? lignesDescription.join(' ')
        : typeof data?.description === 'string'
          ? data.description
          : null,
    ambiance:
      lignesAmbiance.length
        ? lignesAmbiance.join(' ')
        : typeof data?.ambiance === 'string'
          ? data.ambiance
          : null,
  };
}

async function generer(c: { env: Env }, messages: Array<{ role: string; content: string }>): Promise<string | null> {
  try {
    if (!c.env.AI) return null;
    const resultat = (await Promise.race([
      c.env.AI.run(MODELE as string, {
        messages,
        max_tokens: 900,
      }) as Promise<{ response?: string }>,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000)),
    ])) as { response?: unknown } | null;
    return typeof resultat?.response === 'string' ? resultat.response : null;
  } catch (e) {
    console.error('IA table-draft KO', e);
    return null;
  }
}

/**
 * Chaîne de modèles Gemini essayés dans l'ordre : le premier qui répond gagne.
 * `GEMINI_MODEL` (secret/env) permet d'imposer un modèle en tête de liste.
 */
export function modelesGemini(env: Env): string[] {
  const force = (env.GEMINI_MODEL ?? '').trim();
  const defaut = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
  return [...new Set([force, ...defaut].filter(Boolean))];
}

/** Appels à l'API Gemini (clé fournie par Google AI Studio, stockée en secret Worker). */
async function genererGemini(
  c: { env: Env },
  messages: Array<{ role: string; content: string }>,
): Promise<{ texte: string; modele: string } | null> {
  const key = c.env.GEMINI_API_KEY;
  if (!key) {
    console.warn('GEMINI_API_KEY absente : repli direct sur Workers AI.');
    return null;
  }
  const texte = messages.map((m) => `${m.role.toUpperCase()} : ${m.content}`).join('\n\n');
  for (const modele of modelesGemini(c.env)) {
    try {
      const controleur = new AbortController();
      const delai = setTimeout(() => controleur.abort(), 20000);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: texte }] }],
            generationConfig: { maxOutputTokens: 1200 },
          }),
          signal: controleur.signal,
        },
      );
      clearTimeout(delai);
      if (!res.ok) {
        console.error('Gemini HTTP', modele, res.status, (await res.text()).slice(0, 300));
        continue;
      }
      const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const texteReponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof texteReponse === 'string' && texteReponse.trim()) {
        console.info('IA brouillon : Gemini', modele);
        return { texte: texteReponse, modele };
      }
      console.error('Gemini réponse vide', modele);
    } catch (e) {
      console.error('Gemini KO', modele, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

const UNITES_GEMINI = new Set(['KG', 'G', 'L', 'CL', 'UNIT', 'PORTION']);

export function normaliserWantedGemini(input: unknown): Array<{ label: string; quantity: number | null; unit: string | null }> | null {
  if (!Array.isArray(input)) return null;
  const items: Array<{ label: string; quantity: number | null; unit: string | null }> = [];
  for (const brut of input.slice(0, 20)) {
    const o = (brut ?? {}) as Record<string, unknown>;
    const label = typeof o?.['label'] === 'string' ? o['label'].trim() : '';
    if (!label) continue;
    const q = o?.['quantity'] == null ? null : Number(o['quantity']);
    const unit = typeof o?.['unit'] === 'string' ? o['unit'].trim().toUpperCase() : null;
    items.push({
      label: label.slice(0, 120),
      quantity: q != null && Number.isFinite(q) && q > 0 ? q : null,
      unit: unit && UNITES_GEMINI.has(unit) ? unit : null,
    });
  }
  return items.length ? items : null;
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

/** Convertit une mesure type « 1 kg », « 200g », « 1/2 cup » en quantité + unité. */
function parserMesure(mesure: string): { quantity: number; unit: string } {
  const nb = mesure.match(/(\d+(?:[.,]\d+)?|\d+\/\d+)/);
  let quantity = 1;
  if (nb) {
    const brut = nb[1].replace(',', '.');
    if (brut.includes('/')) {
      const [a, b] = brut.split('/').map(Number);
      quantity = b ? a / b : 1;
    } else {
      quantity = Number(brut);
    }
    if (!Number.isFinite(quantity) || quantity <= 0) quantity = 1;
  }
  const bas = mesure.toLowerCase();
  if (/kg|kilo/.test(bas)) return { quantity, unit: 'KG' };
  if (/\bg\b|gram/.test(bas)) return { quantity, unit: 'G' };
  if (/\bcl\b|centilitre/.test(bas)) return { quantity, unit: 'CL' };
  if (/\bml\b|millilitre/.test(bas)) return { quantity: Math.round((quantity / 10) * 100) / 100, unit: 'CL' };
  if (/\bl\b|litre/.test(bas)) return { quantity, unit: 'L' };
  if (/portion|part|serve/.test(bas)) return { quantity, unit: 'PORTION' };
  return { quantity, unit: 'UNIT' };
}

/**
 * TheMealDB (gratuit, sans clé) fournit de vrais ingrédients pour un plat.
 * La base est surtout en anglais ; en cas d'échec on retombe sur le catalogue local.
 */
async function suggestionsMealDb(texte: string): Promise<Array<{ label: string; quantity: number; unit: string }>> {
  try {
    const q = encodeURIComponent(texte.trim().slice(0, 80));
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${q}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = (await res.json()) as { meals?: Array<Record<string, unknown>> };
    const meal = json?.meals?.[0];
    if (!meal) throw new Error('aucun résultat');
    const items: Array<{ label: string; quantity: number; unit: string }> = [];
    for (let i = 1; i <= 20; i++) {
      const label = meal[`strIngredient${i}`];
      if (typeof label !== 'string' || !label.trim()) continue;
      const { quantity, unit } = parserMesure(String(meal[`strMeasure${i}`] ?? ''));
      items.push({ label: label.trim(), quantity, unit });
    }
    if (items.length) return items;
  } catch (e) {
    console.error('TheMealDB indisponible, repli local', e);
  }
  return suggestionsLocales(texte);
}

/** Image du plat depuis TheMealDB, quand elle existe. */
async function mealDbImage(texte: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(texte.trim().slice(0, 80));
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${q}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { meals?: Array<{ strMealThumb?: string }> };
    return json?.meals?.[0]?.strMealThumb ?? null;
  } catch {
    return null;
  }
}

aiRoutes.post('/table-draft', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return apiError('UNAUTHENTICATED', 'Jeton absent, expire ou invalide.');
  const b = (await c.req.json().catch(() => null)) as { description?: string; ambianceHint?: string } | null;
  const description = (b?.description ?? '').trim();
  if (description.length < 3 || description.length > 1000) {
    return apiError('VALIDATION_ERROR', 'description invalide.', { field: 'description' });
  }
  // Mots-clés saisis par l'utilisateur dans le champ ambiance : l'IA doit les intégrer.
  const hint = typeof b?.ambianceHint === 'string' ? b.ambianceHint.trim().slice(0, 300) : '';
  // Un seul appel : données structurées en JSON sur la 1re ligne, puis les
  // deux paragraphes séparés (ligne « AMBIANCE : » entre les deux).
  const messages = [
    {
      role: 'system',
      content:
        'Tu es un assistant de cuisine convivial. À partir de la description fournie par l\'utilisateur, propose un brouillon de tablée. Si la description mentionne un nombre de personnes (ex. « pour 6 », « 8 convives »), utilise ce nombre pour seatsTotal et adapte les quantités en conséquence ; sinon utilise 4. Ta réponse commence par UNE SEULE ligne JSON avec les clés : dishName (string court), wantedContributions (tableau d\'objets {label, quantity, unit}), seatsTotal (entier), durationMinutes (entier). Pour wantedContributions, propose 4 à 8 ingrédients réels et précis, avec des quantités sobres et réalistes adaptées au nombre de personnes. La valeur de "unit" doit être UNIQUEMENT parmi : KG, G, L, CL, UNIT, PORTION. La valeur de "quantity" doit être un nombre strictement positif. Après cette ligne JSON, saute une ligne puis écris UN SEUL paragraphe de 4 à 6 phrases appétissantes qui présente UNIQUEMENT LE PLAT — saveurs, textures, ingrédients stars, préparation, service ; PAS de liste, PAS de sauts de ligne dans le paragraphe, ne recopie pas la saisie mot à mot, n\'invente pas un autre plat, NE PARLE NI des convives NI de l\'ambiance. Saute une ligne, écris la ligne « AMBIANCE : », saute une ligne, puis écris UN SEUL paragraphe de 2 à 3 phrases (300 caractères maximum) qui DÉCRIT l\'ambiance dans laquelle les invités seront reçus — décor, lumière, humeur du moment — au présent ou au futur, comme une invitation qui donne envie de venir ; INTERDIT : recommandations, conseils, « il est recommandé », « il faut », « pensez à » ; PAS de liste, PAS d\'énumération, PAS de sauts de ligne dans le paragraphe, et ne décris JAMAIS le plat lui-même.' +
        (hint ? ` Intègre obligatoirement ces mots-clés dans le paragraphe d'ambiance : « ${hint} ».` : ''),
    },
    { role: 'user', content: description },
  ];
  // Gemini d'abord (chaîne de modèles), Workers AI ensuite, repli local en dernier.
  async function genererTexte(): Promise<{ texte: string; moteur: string } | null> {
    const gemini = await genererGemini(c, messages);
    if (gemini) return { texte: gemini.texte, moteur: `gemini:${gemini.modele}` };
    const texte = await generer(c, messages);
    return texte ? { texte, moteur: 'workers-ai' } : null;
  }
  let resultat = await genererTexte();
  let brouillon = resultat ? extraireBrouillon(resultat.texte) : null;
  if (resultat && brouillon && !brouillon.ambiance && !hint) {
    // Réponse sans ambiance exploitable et aucun mot-clé : un seul nouvel essai.
    console.warn('IA brouillon sans ambiance, nouvel essai.');
    resultat = await genererTexte();
    brouillon = resultat ? extraireBrouillon(resultat.texte) : null;
  }

  if (!resultat || !brouillon) {
    if (resultat) console.error('IA brouillon inparseable, repli local.', resultat.texte.slice(0, 500));
    const nomRepli = description.slice(0, 60);
    return c.json({
      data: {
        dishName: nomRepli,
        description,
        ambiance: hint || null,
        moteur: 'local',
        wantedContributions: await suggestionsMealDb(description),
        dishImageUrl: await mealDbImage(nomRepli),
        seatsTotal: 4,
        durationMinutes: 120,
      },
    });
  }

  const parsed = brouillon.data;
  const moteur = resultat.moteur;
  const ambianceFinale = brouillon.ambiance ? tronquerTexte(brouillon.ambiance, 300) : hint || null;
  const nom = typeof parsed?.dishName === 'string' ? parsed.dishName : description.slice(0, 60);
  const wantedIA = normaliserWantedGemini(parsed?.wantedContributions);
  return c.json({
    data: {
      dishName: nom,
      description: brouillon.description ?? description,
      ambiance: ambianceFinale,
      moteur,
      wantedContributions: wantedIA ?? await suggestionsMealDb(`${nom} ${description}`),
      dishImageUrl: await mealDbImage(nom),
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

  const messagesSuggestion = [
    {
      role: 'system',
      content:
        'Tu es un assistant qui aide à trouver des repas partagés. Voici la liste exacte des plats proposés autour de l\'utilisateur : ' +
        JSON.stringify(catalogue) +
        '. À partir de la demande (envie, humeur, saison), choisis jusqu\'à 4 plats UNIQUEMENT dans cette liste, ceux qui correspondent le mieux. Réponds UNIQUEMENT en JSON : {"dishes": ["plat de la liste", ...]}. Recopie chaque nom exactement comme dans la liste, sans en inventer.',
    },
    { role: 'user', content: query },
  ];
  const reponse =
    (await genererGemini(c, messagesSuggestion))?.texte ?? (await generer(c, messagesSuggestion));

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
