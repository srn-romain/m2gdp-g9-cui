// Traduit en français les noms de plats du seed (source : recettes-france.sql)
// via l'API Meta Muse Spark, puis écrit seed/recettes-france-fr.sql.
// Usage : MUSE_API_KEY=... node traduire-plats.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MODELE = 'muse-spark-1.3-contributor';
const URL_API = 'https://api.meta.ai/v1/chat/completions';
const ici = dirname(fileURLToPath(import.meta.url));

const cle = process.env.MUSE_API_KEY;
if (!cle) {
  console.error('MUSE_API_KEY manquant.');
  process.exit(1);
}

function esc(s) {
  return s.replace(/'/g, "''");
}

const lignes = readFileSync(join(ici, 'recettes-france.sql'), 'utf8').split('\n');
const entrees = [];
for (const ligne of lignes) {
  const m = ligne.match(/^UPDATE tables SET .*dishName='(.*?)'.* WHERE id='([^']+)';$/);
  if (m) entrees.push({ id: m[2], nom: m[1].replace(/''/g, "'") });
}
const noms = [...new Set(entrees.map((e) => e.nom))];

async function traduireTous(batch) {
  const prompt =
    'Traduis en français cette liste de noms de plats, avec des noms courts et appétissants comme sur un menu. ' +
    'Réponds uniquement en JSON, sans commentaire ni texte autour, avec la clé "traductions" : ' +
    'un tableau de chaînes dans exactement le même ordre et le même nombre que la liste.\n\n' +
    batch.map((n, i) => `${i + 1}. ${n}`).join('\n');

  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), 240000);
  try {
    const res = await fetch(URL_API, {
      method: 'POST',
      signal: controleur.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
      body: JSON.stringify({
        model: MODELE,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20000,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error('Muse HTTP ' + res.status + ' ' + (await res.text()).slice(0, 300));
    const json = await res.json();
    const t = json?.choices?.[0]?.message?.content;
    const bloc = String(t).match(/\{[\s\S]*\}/);
    if (!bloc) throw new Error('JSON absent de la réponse Muse.');
    const traductions = JSON.parse(bloc[0]).traductions;
    if (!Array.isArray(traductions) || traductions.length !== batch.length) {
      throw new Error(`Nombre de traductions incohérent (${traductions?.length}/${batch.length}).`);
    }
    return traductions;
  } finally {
    clearTimeout(minuterie);
  }
}

const traductions = await traduireTous(noms);
const traduits = new Map(noms.map((n, i) => [n, String(traductions[i]).trim() || n]));

const sortie = [
  '-- Noms de plats traduits en français via Meta Muse Spark. Idempotent.',
  '-- Application : npx wrangler d1 execute labonnetablee-db --remote --file=seed/recettes-france-fr.sql',
];
for (const e of entrees) {
  const trad = traduits.get(e.nom) ?? e.nom;
  sortie.push(`UPDATE tables SET dishName='${esc(trad)}' WHERE id='${e.id}';`);
}
writeFileSync(join(ici, 'recettes-france-fr.sql'), sortie.join('\n') + '\n');
console.log(`Écrit seed/recettes-france-fr.sql (${entrees.length} mises à jour, ${noms.length} noms traduits).`);
