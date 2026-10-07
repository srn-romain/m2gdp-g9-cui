// Helpers metier partages : R2 (seatsAvailable calcule), statuts derives, confidentialite R7.
export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

export async function guestConfirmedCount(db: D1Database, tableId: string): Promise<number> {
  const r = await db.prepare(
    "SELECT COUNT(*) AS n FROM participations WHERE tableId = ? AND role = 'GUEST' AND status = 'CONFIRMED'",
  ).bind(tableId).first<{ n: number }>();
  return r?.n ?? 0;
}

export function tableEndsAt(startsAt: string, durationMinutes: number): string {
  return new Date(new Date(startsAt).getTime() + durationMinutes * 60000).toISOString();
}

export function isPassed(startsAt: string, durationMinutes: number, now = new Date()): boolean {
  return new Date(startsAt).getTime() + durationMinutes * 60000 <= now.getTime();
}

// Position arrondie ~300 m pour les non-participants (R7).
export function round300m(v: number): number {
  return Math.round(v * 370) / 370;
}

export interface TableRow {
  id: string; hostId: string; dishName: string; description: string | null;
  startsAt: string; durationMinutes: number; seatsTotal: number;
  visibility: string; status: string; isVegetarian: number; hasAllergenNotice: number;
  neighborhood: string; city: string; postalCode: string | null;
  latitude: number; longitude: number; addressLine: string | null; createdAt: string;
}

interface UserRow {
  id: string; firstName: string; avatarUrl: string | null;
  neighborhood: string; city: string;
}

interface ContributionRow {
  id: string; label: string; quantity: string | null; unit: string | null;
  category: string; status: string;
  userId: string; firstName: string; avatarUrl: string | null;
  neighborhood: string; city: string;
}

export async function userSummary(db: D1Database, userId: string) {
  const u = await db.prepare(
    'SELECT id, firstName, avatarUrl, neighborhood, city FROM users WHERE id = ?',
  ).bind(userId).first<UserRow>();
  if (!u) return null;
  return {
    id: u.id, firstName: u.firstName, avatarUrl: u.avatarUrl ?? null,
    neighborhood: u.neighborhood, city: u.city,
  };
}

/** « Ce que chacun apporte », hôte compris : les contributions des participants confirmés. */
export async function tableContributions(db: D1Database, tableId: string) {
  const rows = await db.prepare(
    `SELECT c.id, c.label, c.quantity, c.unit, c.category, c.status,
            p.userId, u.firstName, u.avatarUrl, u.neighborhood, u.city
     FROM contributions c
     JOIN participations p ON p.id = c.participationId
     JOIN users u ON u.id = p.userId
     WHERE p.tableId = ? AND p.status = 'CONFIRMED'
     ORDER BY p.joinedAt ASC`,
  ).bind(tableId).all<ContributionRow>();
  return (rows.results ?? []).map((c) => ({
    id: c.id, label: c.label,
    quantity: c.quantity == null ? null : Number(c.quantity),
    unit: c.unit, category: c.category, status: c.status,
    participant: {
      id: c.userId, firstName: c.firstName, avatarUrl: c.avatarUrl ?? null,
      neighborhood: c.neighborhood, city: c.city,
    },
  }));
}

export async function myParticipation(db: D1Database, tableId: string, userId: string) {
  const p = await db.prepare(
    "SELECT id, role, status, joinedAt FROM participations WHERE tableId = ? AND userId = ? AND status = 'CONFIRMED'",
  ).bind(tableId, userId).first<{ id: string; role: string; status: string; joinedAt: string }>();
  if (!p) return null;
  const c = await db.prepare(
    'SELECT id, label, quantity, unit, category, status FROM contributions WHERE participationId = ?',
  ).bind(p.id).first<{
    id: string; label: string; quantity: string | null; unit: string | null;
    category: string; status: string;
  }>();
  return {
    id: p.id, tableId, role: p.role, status: p.status, joinedAt: p.joinedAt,
    contribution: c
      ? {
          id: c.id, label: c.label,
          quantity: c.quantity == null ? null : Number(c.quantity),
          unit: c.unit, category: c.category, status: c.status,
        }
      : null,
  };
}

export async function toTableJson(db: D1Database, row: TableRow, viewerUserId: string | null) {
  const confirmed = await guestConfirmedCount(db, row.id);
  const seatsAvailable = Math.max(0, row.seatsTotal - confirmed);
  let status = row.status;
  if ((status === 'OPEN' || status === 'FULL') && isPassed(row.startsAt, row.durationMinutes)) status = 'PASSED';
  else if (status === 'OPEN' && seatsAvailable === 0) status = 'FULL';
  else if (status === 'FULL' && seatsAvailable > 0) status = 'OPEN';
  let isParticipant = false;
  if (viewerUserId) {
    const p = await db.prepare(
      "SELECT id FROM participations WHERE tableId = ? AND userId = ? AND status = 'CONFIRMED'",
    ).bind(row.id, viewerUserId).first();
    isParticipant = !!p || row.hostId === viewerUserId;
  }
  const exact = isParticipant;
  const host = await userSummary(db, row.hostId);
  return {
    id: row.id, hostId: row.hostId, dishName: row.dishName, description: row.description,
    // Titre dérivé : « {dishName} chez {host.firstName} », jamais stocké.
    title: host ? `${row.dishName} chez ${host.firstName}` : row.dishName,
    startsAt: row.startsAt, durationMinutes: row.durationMinutes,
    seatsTotal: row.seatsTotal, seatsAvailable, visibility: row.visibility, status,
    isVegetarian: !!row.isVegetarian, hasAllergenNotice: !!row.hasAllergenNotice,
    host,
    location: {
      neighborhood: row.neighborhood, city: row.city, postalCode: row.postalCode,
      latitude: exact ? row.latitude : round300m(row.latitude),
      longitude: exact ? row.longitude : round300m(row.longitude),
      ...(exact && row.addressLine ? { addressLine: row.addressLine } : {}),
    },
    contributions: await tableContributions(db, row.id),
    myParticipation: viewerUserId ? await myParticipation(db, row.id, viewerUserId) : null,
    distanceMeters: null,
    createdAt: row.createdAt,
  };
}
