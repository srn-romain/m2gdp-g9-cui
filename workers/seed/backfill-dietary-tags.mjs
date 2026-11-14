/* Genere le backfill SQL des regimes (dietaryTags) depuis un dump JSON de `tables`.
 * Dump : sqlite3 -json base.db "SELECT id, dishName, wantedContributions, dietaryTags, isVegetarian FROM tables;" > /tmp/tables.json
 * Local : node workers/seed/backfill-dietary-tags.mjs /tmp/tables.json --out workers/seed/backfill-dietary-tags.sql
 * Prod : sur demande explicite uniquement, npx wrangler d1 execute labonnetablee-db --remote --file=workers/seed/backfill-dietary-tags.sql
 * Deterministe : memes entrees -> meme fichier. Idempotent : ne touche que les lignes vides.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { computeTags } from './dietary-rules.mjs';

const[, , entree, ...reste] = process.argv;
if (!entree) {
  console.error('Usage : node backfill-dietary-tags.mjs <tables.json> [--out <fichier.sql>]');
  process.exit(1);
}
let sortie = null;
for (let i = 0; i < reste.length; i++) {
  if (reste[i] === '--out') sortie = reste[i + 1];
}

const lignes = JSON.parse(readFileSync(entree, 'utf8'));
const vide = (v) => v == null || v === '' || v === '[]';
const sql = [];
let maj = 0;
const repartitions = {};
for (const r of lignes) {
  if (!vide(r.dietaryTags)) continue;
  let etiquettes = [];
  try {
    etiquettes = (JSON.parse(r.wantedContributions ?? '[]') ?? []).map((w) => w?.label ?? '');
  } catch {
    etiquettes = [];
  }
  const tags = computeTags(r.dishName, etiquettes, { isVegetarian: !!r.isVegetarian });
  if (!tags) continue;
  const litteral = JSON.stringify(tags);
  sql.push(`UPDATE tables SET dietaryTags = '${litteral}' WHERE id = '${r.id}';`);
  const cle = tags.join('+');
  repartitions[cle] = (repartitions[cle] ?? 0) + 1;
  maj++;
}

const detail = Object.entries(repartitions).map(([k, v]) => `${k}=${v}`).join(', ') || 'aucune';
const entete = [
  '/* Backfill deterministe des regimes (voir dietary-rules.mjs). */',
  `/* Lignes mises a jour : ${maj}. Repartition : ${detail}. */`,
  '/* Idempotent : seules les lignes sans regime sont touchees. */',
  '/* A relancer apres chaque re-seed (les INSERT des seeds omettent dietaryTags). */',
  '',
].join('\n');

const contenu = entete + sql.join('\n') + '\n';
if (sortie) {
  writeFileSync(sortie, contenu);
  console.log(`SQL ecrit : ${sortie} (${maj} UPDATE).`);
} else {
  process.stdout.write(contenu);
}
