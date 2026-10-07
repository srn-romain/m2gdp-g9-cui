// Formatage francophone. Aucune valeur n'est inventée : tout vient de l'API.
import type {
  Contribution,
  DietaryPreference,
  QuantityUnit,
  Table,
  TableStatus,
} from './types';

const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** « Aujourd'hui », « Demain », « Sam. 12 oct. ». Base 375 px : rester court. */
export function formatDay(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const delta = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  if (delta === 0) return "Aujourd'hui";
  if (delta === 1) return 'Demain';
  if (delta === -1) return 'Hier';
  // Dans la semaine qui vient, la maquette écrit le jour en entier (« Dimanche »).
  if (delta > 1 && delta <= 6) {
    const jour = JOURS_LONGS[d.getDay()];
    return jour.charAt(0).toUpperCase() + jour.slice(1);
  }
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « 12 h 30 ». */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** « 12 h 30 » pour un horodatage de message. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDayTime(iso: string, now = new Date()): string {
  return `${formatDay(iso, now)} ${formatTime(iso)}`;
}

/** « 700 m », « 1,2 km ». */
export function formatDistance(meters?: number | null): string {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

const UNIT_LABELS: Record<QuantityUnit, string> = {
  KG: 'kg',
  G: 'g',
  L: 'L',
  CL: 'cl',
  UNIT: 'unité',
  PORTION: 'portion',
};

export function formatUnit(unit?: QuantityUnit | null): string {
  return unit ? UNIT_LABELS[unit] : '';
}

/** « 1 kg », « 500 g », « 2 portions ». */
export function formatQuantity(quantity?: number | null, unit?: QuantityUnit | null): string {
  if (quantity == null) return '';
  // « 1 unité » n'apporte rien : on ne l'affiche qu'à partir de deux.
  if (unit === 'UNIT' && quantity <= 1) return '';
  const n = Number.isInteger(quantity) ? String(quantity) : String(quantity).replace('.', ',');
  const u = formatUnit(unit);
  if (!u) return n;
  if (u === 'portion') return `${n} ${Number(quantity) > 1 ? 'portions' : 'portion'}`;
  return `${n} ${u}`;
}

export const DIETARY_OPTIONS: Array<{ value: DietaryPreference; label: string }> = [
  { value: 'VEGETARIAN', label: 'Végétarien' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'NO_PORK', label: 'Sans porc' },
  { value: 'NO_GLUTEN', label: 'Sans gluten' },
  { value: 'NO_LACTOSE', label: 'Sans lactose' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'KOSHER', label: 'Casher' },
  { value: 'NO_NUTS', label: 'Sans fruits à coque' },
];

export function formatDietary(list?: DietaryPreference[] | null): string {
  if (!list?.length) return 'Aucune';
  return list.map((d) => DIETARY_OPTIONS.find((o) => o.value === d)?.label ?? d).join(', ');
}

export function formatStatus(status: TableStatus): string {
  switch (status) {
    case 'OPEN': return 'Ouverte';
    case 'FULL': return 'Complète';
    case 'CANCELLED': return 'Annulée';
    case 'PASSED': return 'Passée';
  }
}

export function formatSeats(available: number): string {
  if (available <= 0) return 'Plus de place';
  return available === 1 ? '1 place disponible' : `${available} places disponibles`;
}

/** « {dishName} chez {host.firstName} », jamais stocké. */
export function tableTitle(table: Pick<Table, 'title' | 'dishName' | 'host'>): string {
  if (table.title) return table.title;
  const host = table.host?.firstName;
  return host ? `${table.dishName} chez ${host}` : table.dishName;
}

export function contributionLine(contribution: Contribution): string {
  const quantity = formatQuantity(contribution.quantity, contribution.unit);
  return quantity ? `${contribution.label} · ${quantity}` : contribution.label;
}

export function initials(firstName: string, lastName = ''): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Date au format `datetime-local` (heure locale, sans secondes). */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): string {
  return new Date(value).toISOString();
}

/** « 4 participants » : l'hôte plus les invités confirmés. */
export function participantCount(table: Pick<Table, 'seatsTotal' | 'seatsAvailable'>): number {
  const guests = Math.max(0, table.seatsTotal - table.seatsAvailable);
  return guests + 1;
}
