// Client /api/v1 : Bearer accessToken, enveloppes {data,pagination} / {error:{code,message,details}}.
import type {
  ApiErrorCode,
  Message,
  MessageCreate,
  Page,
  Participation,
  ParticipationCreate,
  Session,
  Table,
  TableCreate,
  TableScope,
  TableSort,
  User,
  UserUpdate,
} from './types';

const BASE = '/api/v1';

export function resolveApiUrl(): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    try {
      const u = new URL(base);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        u.hostname = window.location.hostname;
        return u.toString().replace(/\/$/, '');
      }
    } catch { /* base relative */ }
  }
  return base.replace(/\/$/, '');
}

/** Le jeton est fourni par le store d'authentification : un seul endroit décide. */
let accessTokenProvider: (() => Promise<string | null>) | null = null;

export function setAccessTokenProvider(provider: () => Promise<string | null>): void {
  accessTokenProvider = provider;
}

export class ApiError extends Error {
  code: ApiErrorCode | 'NETWORK_ERROR';
  status: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ApiErrorCode | 'NETWORK_ERROR',
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface FetchOptions extends RequestInit {
  /** `false` pour les routes sans jeton (auth). */
  auth?: boolean;
}

export async function apiFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = true, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (auth && accessTokenProvider) {
    const token = await accessTokenProvider();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${resolveApiUrl()}${path}`, { ...init, headers });
  } catch (cause) {
    throw new ApiError(
      'Connexion impossible. Vérifie ton réseau puis réessaie.',
      'NETWORK_ERROR',
      0,
      { cause: String(cause) },
    );
  }

  if (res.status === 204) return null as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      body?.error?.message ?? 'Une erreur est survenue.',
      body?.error?.code ?? 'INTERNAL_ERROR',
      res.status,
      body?.error?.details,
    );
  }
  return body as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);
export const apiPost = <T>(path: string, body?: unknown, init: FetchOptions = {}) =>
  apiFetch<T>(path, { ...init, method: 'POST', body: JSON.stringify(body ?? {}) });
export const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' });

/** Écran « Bon retour ! ». Répond toujours 202, même si l'adresse est inconnue. */
export const requestMagicLink = (email: string) =>
  apiPost<void>(`${BASE}/auth/magic-links`, { email }, { auth: false });

/** Échange le jeton du lien magique contre une session d'une heure. */
export const createSession = (token: string) =>
  apiPost<Session>(`${BASE}/auth/sessions`, { token }, { auth: false });

export const getMe = () => apiGet<User>(`${BASE}/me`);
export const updateMe = (patch: UserUpdate) => apiPatch<User>(`${BASE}/me`, patch);

export interface TableQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  startsAfter?: string;
  startsBefore?: string;
  dietary?: string[];
  vegetarianOnly?: boolean;
  query?: string;
  sortBy?: TableSort;
  page?: number;
  pageSize?: number;
}

export function listTables(params: TableQuery = {}): Promise<Page<Table>> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((v) => search.append(key, String(v)));
    else search.set(key, String(value));
  }
  const qs = search.toString();
  return apiGet<Page<Table>>(`${BASE}/tables${qs ? `?${qs}` : ''}`);
}

export const listMyTables = (scope: TableScope = 'upcoming', page = 1, pageSize = 20) =>
  apiGet<Page<Table>>(`${BASE}/me/tables?scope=${scope}&page=${page}&pageSize=${pageSize}`);

export const getTable = (tableId: string) => apiGet<Table>(`${BASE}/tables/${tableId}`);
export const createTable = (body: TableCreate) => apiPost<Table>(`${BASE}/tables`, body);

/** Rejouable sans risque : l'Idempotency-Key est fournie par l'appelant. */
export const joinTable = (tableId: string, body: ParticipationCreate, idempotencyKey: string) =>
  apiPost<Participation>(`${BASE}/tables/${tableId}/participations`, body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });

export const leaveTable = (tableId: string) =>
  apiDelete<void>(`${BASE}/tables/${tableId}/participations/me`);

export const listMessages = (tableId: string, page = 1, pageSize = 50) =>
  apiGet<Page<Message>>(`${BASE}/tables/${tableId}/messages?page=${page}&pageSize=${pageSize}`);

export const postMessage = (tableId: string, body: MessageCreate) =>
  apiPost<Message>(`${BASE}/tables/${tableId}/messages`, body);
