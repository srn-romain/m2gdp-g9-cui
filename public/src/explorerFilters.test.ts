import { describe, expect, it } from 'vitest';
import {
  defaultExplorerFilters,
  normalizeExplorerFilters,
  readExplorerFilters,
  writeExplorerFilters,
} from '@/lib/explorerFilters';

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('filtres explorateur', () => {
  it('retourne les valeurs par défaut sans stockage', () => {
    expect(readExplorerFilters(undefined, [1, 2, 5], 2)).toEqual({
      query: '',
      tonight: false,
      diets: [],
      radiusKm: 2,
    });
    expect(defaultExplorerFilters(2)).toEqual({
      query: '',
      tonight: false,
      diets: [],
      radiusKm: 2,
    });
  });

  it('normalise et rejette les valeurs invalides', () => {
    expect(
      normalizeExplorerFilters(
        { query: 'x'.repeat(200), tonight: 'oui', diets: ['VEGAN', 'INCONNU', 42], radiusKm: 99 },
        [1, 2, 5],
        2,
      ),
    ).toEqual({ query: 'x'.repeat(120), tonight: false, diets: ['VEGAN'], radiusKm: 2 });
  });

  it('conserve les filtres valides entre deux lectures', () => {
    const storage = createMemoryStorage();
    writeExplorerFilters(storage, {
      query: 'fondue',
      tonight: true,
      diets: ['VEGETARIAN', 'HALAL'],
      radiusKm: 5,
    });
    expect(readExplorerFilters(storage, [1, 2, 5], 2)).toEqual({
      query: 'fondue',
      tonight: true,
      diets: ['VEGETARIAN', 'HALAL'],
      radiusKm: 5,
    });
  });
});
