/**
 * Requêtes « WHERE ... IN (...) » par lots : D1 plafonne à 100 paramètres liés
 * par requête. On découpe donc les identifiants en paquets de 50 pour garder de
 * la marge quand une requête ajoute des paramètres en plus des identifiants.
 */
export const IN_CHUNK = 50;

export async function queryIn<T>(
  db: D1Database,
  sql: (placeholders: string) => string,
  ids: string[],
  extraBinds: unknown[] = [],
): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const batch = ids.slice(i, i + IN_CHUNK);
    const ph = batch.map(() => '?').join(',');
    const result = await db.prepare(sql(ph)).bind(...batch, ...extraBinds).all<T>();
    for (const row of result.results ?? []) rows.push(row);
  }
  return rows;
}
