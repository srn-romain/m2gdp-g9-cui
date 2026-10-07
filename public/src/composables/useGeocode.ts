import { ref } from 'vue';
import { apiGet } from '@/lib/api';

export interface GeocodeResult {
  formatted: string;
  lat: number;
  lng: number;
  placeId: string;
}

/**
 * Géocodage via le proxy Worker (la clé Google reste côté serveur).
 * Débounce court : l'adresse est saisie au clavier.
 */
export function useGeocode() {
  const result = ref<GeocodeResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function run(address: string): Promise<GeocodeResult | null> {
    loading.value = true;
    error.value = null;
    try {
      result.value = await apiGet<GeocodeResult>(
        `/api/v1/geocode?address=${encodeURIComponent(address)}&lang=fr`,
      );
      return result.value;
    } catch (e) {
      result.value = null;
      error.value = e instanceof Error ? e.message : 'Adresse introuvable.';
      return null;
    } finally {
      loading.value = false;
    }
  }

  function search(address: string, delayMs = 450): void {
    clearTimeout(timer);
    if (address.trim().length < 4) return;
    timer = setTimeout(() => void run(address), delayMs);
  }

  return { result, loading, error, run, search };
}
