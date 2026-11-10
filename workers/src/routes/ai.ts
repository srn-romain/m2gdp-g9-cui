import { Hono } from 'hono';
import type { Env } from '../env';
import { apiError } from '../errors';
import { requireAuth } from '../auth';

// Choix documenté dans docs/feedback.md : Workers AI, modèle léger et rapide.
const MODELE = '@cf/meta/llama-3.2-3b-instruct';
const UNITES = ['KG', 'G', 'L', 'CL', 'UNIT', 'PORTION'];
const ALIAS_UNITES: Record<string, string> = {
  kg: 'KG', kilo: 'KG', kilogramme: 'KG', kilogrammes: 'KG',
  g: 'G', gramme: 'G', grammes: 'G',
  l: 'L', litre: 'L', litres: 'L',
  cl: 'CL', centilitre: 'CL', centilitres: 'CL',
  unit: 'UNIT', unite: 'UNIT', unité: 'UNIT', piece: 'UNIT', pièce: 'UNIT', pieces: 'UNIT', pièces: 'UNIT',
  bouteille: 'UNIT', boite: 'UNIT', boîte: 'UNIT', pot: 'UNIT', sachet: 'UNIT', paquet: 'UNIT', barquette: 'UNIT',
  portion: 'PORTION', part: 'PORTION',
};

function normaliserUnite(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  const brut = u.trim();
  if (UNITES.includes(brut.toUpperCase())) return brut.toUpperCase();
  return ALIAS_UNITES[brut.toLowerCase()] ?? null;
}

function normaliserWanted(input: unknown): Array<{ label: string; quantity: number | null; unit: string | null }> {
  if (!Array.isArray(input)) return [{ label: 'Ingrédient', quantity: 1, unit: 'UNIT' }];
  const items: Array<{ label: string; quantity: number | null; unit: string | null }> = [];
  for (const brut of input.slice(0, 20)) {
    const o = (brut ?? {}) as Record<string, unknown>;
    const label = typeof o?.['label'] === 'string' ? o['label'].trim() : '';
    if (!label) continue;
    const q = o?.['quantity'] == null ? null : Number(o['quantity']);
    items.push({
      label: label.slice(0, 120),
      quantity: q != null && Number.isFinite(q) && q > 0 ? q : null,
      unit: normaliserUnite(o?.['unit']),
    });
  }
  return items.length ? items : [{ label: 'Ingrédient', quantity: 1, unit: 'UNIT' }];
}

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
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ])) as { response?: unknown } | null;
    return typeof resultat?.response === 'string' ? resultat.response : null;
  } catch {
    return null;
  }
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
        wantedContributions: [{ label: 'Ingrédient', quantity: 1, unit: 'UNIT' }],
        seatsTotal: 4,
        durationMinutes: 120,
      },
    });
  }

  const parsed = extraireJson(reponse) as Record<string, unknown> | null;
  const wanted = normaliserWanted(parsed?.wantedContributions);
  return c.json({
    data: {
      dishName: typeof parsed?.dishName === 'string' ? parsed.dishName : description.slice(0, 60),
      description: typeof parsed?.description === 'string' ? parsed.description : description,
      wantedContributions: wanted,
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
