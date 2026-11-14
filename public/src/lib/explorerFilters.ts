import { DIETARY_OPTIONS } from '@/lib/format';
import type { DietaryPreference } from '@/lib/types';

export interface ExplorerFilters {
  query: string;
  tonight: boolean;
  diets: DietaryPreference[];
  radiusKm: number;
}

export type ExplorerFilterStorage = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'lbt.explorerFilters.v1';
const MAX_QUERY_LENGTH = 120;

export function defaultExplorerFilters(defaultRadiusKm: number): ExplorerFilters {
  return { query: '', tonight: false, diets: [], radiusKm: defaultRadiusKm };
}

export function normalizeExplorerFilters(
  raw: unknown,
  radii: readonly number[],
  defaultRadiusKm: number,
): ExplorerFilters {
  const candidate = (raw ?? {}) as {
    query?: unknown;
    tonight?: unknown;
    diets?: unknown;
    radiusKm?: unknown;
  };
  const allowedDiets = new Set<DietaryPreference>(DIETARY_OPTIONS.map((option) => option.value));
  const diets: DietaryPreference[] = [];
  if (Array.isArray(candidate.diets)) {
    for (const diet of candidate.diets) {
      if (
        typeof diet === 'string' &&
        allowedDiets.has(diet as DietaryPreference) &&
        !diets.includes(diet as DietaryPreference)
      ) {
        diets.push(diet as DietaryPreference);
      }
    }
  }
  const radius =
    typeof candidate.radiusKm === 'number' && Number.isFinite(candidate.radiusKm)
      ? candidate.radiusKm
      : defaultRadiusKm;
  const query = typeof candidate.query === 'string' ? candidate.query : '';
  return {
    query: query.slice(0, MAX_QUERY_LENGTH),
    tonight: candidate.tonight === true,
    diets,
    radiusKm: radii.includes(radius) ? radius : defaultRadiusKm,
  };
}

export function readExplorerFilters(
  storage: ExplorerFilterStorage | undefined,
  radii: readonly number[],
  defaultRadiusKm: number,
): ExplorerFilters {
  const defaults = defaultExplorerFilters(defaultRadiusKm);
  if (!storage) return defaults;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return normalizeExplorerFilters(JSON.parse(raw) as unknown, radii, defaultRadiusKm);
  } catch {
    return defaults;
  }
}

export function writeExplorerFilters(
  storage: ExplorerFilterStorage | undefined,
  filters: ExplorerFilters,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        query: filters.query,
        tonight: filters.tonight,
        diets: [...filters.diets],
        radiusKm: filters.radiusKm,
      }),
    );
  } catch {
    // Stockage indisponible : les filtres restent seulement en mémoire.
  }
}
