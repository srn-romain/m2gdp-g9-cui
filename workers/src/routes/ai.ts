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
  const wanted = Array.isArray(parsed?.wantedContributions) ? parsed.wantedContributions : [{ label: 'Ingrédient', quantity: 1, unit: 'UNIT' }];
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
  const reponse = await generer(c, [
    {
      role: 'system',
      content:
        'Tu es un assistant qui aide à trouver des repas partagés. À partir de la demande (envie, humeur, saison), propose 4 plats réalistes pour une tablée de quartier. Réponds UNIQUEMENT en JSON : {"dishes": ["plat 1", "plat 2", "plat 3", "plat 4"]}.',
    },
    { role: 'user', content: query },
  ]);

  const repli = ['Ratatouille', 'Tajine de légumes', 'Soupe de potiron', 'Tartiflette'];
  if (!reponse) return c.json({ data: { dishes: repli } });

  const parsed = extraireJson(reponse) as { dishes?: unknown } | null;
  const dishes = Array.isArray(parsed?.dishes)
    ? parsed.dishes.filter((d): d is string => typeof d === 'string').slice(0, 6)
    : repli;
  return c.json({ data: { dishes: dishes.length ? dishes : repli } });
});
