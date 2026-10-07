/**
 * Jeu de données de démonstration, activé par VITE_DEMO_MODE=true.
 * Permet de travailler les écrans sans Firebase ni API, et de faire relire le
 * design sur un téléphone. À laisser désactivé en production.
 */
import type { Message, Table, User } from './types';

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/** Horodatage relatif à maintenant, pour que les libellés restent justes. */
function at(jours: number, heures: number, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  d.setHours(heures, minutes, 0, 0);
  return d.toISOString();
}

export const DEMO_USER: User = {
  id: 'demo-bernard',
  email: 'bernard.martin@example.fr',
  firstName: 'bernard',
  lastName: 'Martin',
  neighborhood: 'Lyon 7e',
  city: 'Lyon',
  coordinates: { latitude: 45.7485, longitude: 4.8467 },
  dietaryPreferences: ['VEGETARIAN', 'NO_PORK'],
  avatarUrl: null,
  status: 'ACTIVE',
  createdAt: '2026-03-02T09:14:00Z',
  updatedAt: '2026-10-06T18:02:31Z',
};

function personne(id: string, firstName: string) {
  return { id, firstName, avatarUrl: null, neighborhood: 'Lyon 7e', city: 'Lyon' };
}

function apport(id: string, label: string, quantity: number, unit: 'KG' | 'UNIT', firstName: string) {
  return {
    id,
    label,
    quantity,
    unit,
    category: 'INGREDIENT' as const,
    status: 'PROPOSED' as const,
    participant: personne(`u-${firstName}`, firstName),
  };
}

export const DEMO_TABLE_GRATIN: Table = {
  id: 'demo-gratin',
  title: 'Gratin chez Léonie',
  dishName: 'Gratin dauphinois',
  description: 'Un gratin maison à partager entre voisins.',
  startsAt: at(0, 12, 30),
  durationMinutes: 120,
  seatsTotal: 4,
  seatsAvailable: 3,
  visibility: 'PUBLIC',
  status: 'OPEN',
  isVegetarian: true,
  hasAllergenNotice: true,
  host: personne('demo-leonie', 'Léonie'),
  location: {
    neighborhood: 'Lyon 7e',
    city: 'Lyon',
    postalCode: '69007',
    coordinates: { latitude: 45.7485, longitude: 4.8467 },
  },
  contributions: [
    apport('c-1', 'pommes de terre', 1, 'KG', 'bernard'),
    apport('c-2', 'salade verte', 1, 'UNIT', 'Yann'),
  ],
  wantedContributions: [
    { label: 'Pommes de terre', quantity: 1.5, unit: 'KG' },
    { label: 'Crème fraîche', quantity: 20, unit: 'CL' },
    { label: 'Comté', quantity: 200, unit: 'G' },
  ],
  myParticipation: {
    id: 'p-1',
    tableId: 'demo-gratin',
    role: 'GUEST',
    status: 'CONFIRMED',
    joinedAt: '2026-10-05T10:00:00Z',
    contribution: apport('c-1', 'pommes de terre', 1, 'KG', 'bernard'),
  },
  distanceMeters: 700,
  createdAt: '2026-10-01T10:00:00Z',
};

export const DEMO_TABLE_RISOTTO: Table = {
  id: 'demo-risotto',
  title: 'Risotto chez Camille',
  dishName: 'Risotto crémeux aux courgettes',
  description: 'Risotto crémeux, cuisiné sur place.',
  startsAt: at(3, 12, 30),
  durationMinutes: 120,
  seatsTotal: 4,
  seatsAvailable: 2,
  visibility: 'PUBLIC',
  status: 'OPEN',
  isVegetarian: true,
  hasAllergenNotice: false,
  host: personne('demo-camille', 'Camille'),
  location: { neighborhood: 'Lyon 7e', city: 'Lyon', coordinates: { latitude: 45.7505, longitude: 4.8477 } },
  contributions: [apport('c-3', 'parmesan', 200, 'KG', 'Julie')],
  wantedContributions: [
    { label: 'Courgettes', quantity: 4, unit: null },
    { label: 'Riz arborio', quantity: 500, unit: 'G' },
    { label: 'Parmesan', quantity: 1, unit: 'UNIT' },
  ],
  myParticipation: {
    id: 'p-2',
    tableId: 'demo-risotto',
    role: 'GUEST',
    status: 'CONFIRMED',
    joinedAt: '2026-10-04T10:00:00Z',
    contribution: apport('c-4', 'parmesan', 200, 'KG', 'bernard'),
  },
  distanceMeters: 600,
  createdAt: '2026-10-02T10:00:00Z',
};

export const DEMO_TABLE_SOUPE: Table = {
  id: 'demo-soupe',
  title: 'Soupe de lentilles chez Sarah',
  dishName: 'Soupe de lentilles',
  description: 'Une soupe réconfortante.',
  startsAt: at(-5, 12, 30),
  durationMinutes: 120,
  seatsTotal: 6,
  seatsAvailable: 0,
  visibility: 'PUBLIC',
  status: 'PASSED',
  isVegetarian: true,
  hasAllergenNotice: false,
  host: personne('demo-sarah', 'Sarah'),
  location: { neighborhood: 'Lyon 3e', city: 'Lyon', coordinates: { latitude: 45.7625, longitude: 4.8522 } },
  contributions: [apport('c-5', 'salade verte', 1, 'UNIT', 'bernard')],
  myParticipation: {
    id: 'p-3',
    tableId: 'demo-soupe',
    role: 'GUEST',
    status: 'ATTENDED',
    joinedAt: '2026-09-28T10:00:00Z',
    contribution: apport('c-5', 'salade verte', 1, 'UNIT', 'bernard'),
  },
  distanceMeters: 2100,
  createdAt: '2026-09-20T10:00:00Z',
};

export const DEMO_UPCOMING = [DEMO_TABLE_GRATIN, DEMO_TABLE_RISOTTO];
export const DEMO_PAST = [DEMO_TABLE_SOUPE];
export const DEMO_ALL = [DEMO_TABLE_GRATIN, DEMO_TABLE_RISOTTO, DEMO_TABLE_SOUPE];

/**
 * Applique les filtres de l'explorateur à la démo (régime, rayon, créneau,
 * recherche) : en mode démo, il n'y a pas de Worker pour les appliquer.
 */
export function demoQueryTables(params: {
  radiusKm?: number;
  startsAfter?: string;
  startsBefore?: string;
  dietary?: string[];
  vegetarianOnly?: boolean;
  query?: string;
  sortBy?: 'distance' | 'startsAt' | 'seatsAvailable';
} = {}): Table[] {
  let list = [...DEMO_ALL];

  const recherche = params.query?.trim().toLowerCase();
  if (recherche) {
    list = list.filter((t) =>
      `${t.dishName} ${t.host?.firstName ?? ''}`.toLowerCase().includes(recherche),
    );
  }
  if (params.startsAfter) list = list.filter((t) => t.startsAt >= params.startsAfter!);
  if (params.startsBefore) list = list.filter((t) => t.startsAt <= params.startsBefore!);
  // La démo ne porte que le drapeau végétarien : les autres régimes sont ignorés.
  if (params.vegetarianOnly || params.dietary?.includes('VEGETARIAN')) {
    list = list.filter((t) => t.isVegetarian);
  }
  if (params.radiusKm) {
    const max = params.radiusKm * 1000;
    list = list.filter((t) => t.distanceMeters == null || t.distanceMeters <= max);
  }

  if (params.sortBy === 'distance') {
    list.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
  } else if (params.sortBy === 'seatsAvailable') {
    list.sort((a, b) => b.seatsAvailable - a.seatsAvailable);
  } else {
    list.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return list;
}

export const DEMO_MESSAGES: Message[] = [
  {
    id: 'm-3',
    tableId: DEMO_TABLE_GRATIN.id,
    type: 'AUDIO',
    author: personne('demo-leonie', 'Léonie'),
    text: null,
    audioUrl: 'demo',
    durationSeconds: 12,
    sentAt: at(0, 13, 56),
  },
  {
    id: 'm-2',
    tableId: DEMO_TABLE_GRATIN.id,
    type: 'TEXT',
    author: personne('u-yann', 'Yann'),
    text: 'Je peux passer prendre le pain.',
    sentAt: at(0, 13, 6),
  },
  {
    id: 'm-1',
    tableId: DEMO_TABLE_GRATIN.id,
    type: 'TEXT',
    author: personne('demo-bernard', 'bernard'),
    text: "J'apporte les pommes de terre.",
    sentAt: at(0, 12, 36),
  },
];

export function demoPage<T>(data: T[]) {
  return {
    data,
    pagination: { page: 1, pageSize: 20, totalItems: data.length, totalPages: data.length ? 1 : 0 },
  };
}
