import { ref } from 'vue';

export interface Adresse {
  /** Libellé complet : « 12 Rue de Marseille 69007 Lyon ». */
  label: string;
  nom: string;
  ville: string;
  codePostal?: string;
  /** Quartier déduit de l'arrondissement : « Lyon 7e ». */
  quartier: string;
  latitude: number;
  longitude: number;
}

interface ReponseBAN {
  features?: Array<{
    geometry: { coordinates: [number, number] };
    properties: {
      label: string;
      name: string;
      city: string;
      postcode?: string;
      district?: string;
    };
  }>;
}

// API Adresse (Base Adresse Nationale) : service public français, gratuit, sans clé.
const BASE = 'https://api-adresse.data.gouv.fr/search/';

/**
 * L'API renvoie tantôt un `district` propre (« Lyon 2e Arrondissement »), tantôt
 * l'arrondissement dans le champ `city` quand on cherche un quartier et non une rue.
 * On en déduit toujours le quartier (« Lyon 7e ») et la ville (« Lyon »).
 */
function analyserLieu(valeur: string): { quartier: string; ville: string | null } {
  const arrondissement = /^(.*?)\s+(\d+)\s*(er|e|ème)?\s*arrondissement\s*$/i.exec(valeur.trim());
  if (arrondissement) {
    const [, racine, numero, ordinal] = arrondissement;
    return {
      quartier: `${racine.trim()} ${numero}${ordinal ?? ''}`.trim(),
      ville: racine.trim(),
    };
  }
  return {
    quartier: valeur.replace(/\s*arrondissement\s*$/i, '').replace(/\s+/g, ' ').trim(),
    ville: null,
  };
}

export function useAddressSearch() {
  const suggestions = ref<Adresse[]>([]);
  const chargement = ref(false);
  const erreur = ref<string | null>(null);
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  let controleur: AbortController | undefined;

  async function chercher(requete: string) {
    controleur?.abort();
    controleur = new AbortController();
    chargement.value = true;
    erreur.value = null;
    try {
      const url = `${BASE}?q=${encodeURIComponent(requete)}&limit=5&autocomplete=1`;
      const reponse = await fetch(url, { signal: controleur.signal });
      if (!reponse.ok) throw new Error('Service indisponible');
      const json = (await reponse.json()) as ReponseBAN;
      suggestions.value = (json.features ?? []).map((f) => {
        const analyse = analyserLieu(f.properties.district?.trim() || f.properties.city);
        return {
          label: f.properties.label,
          nom: f.properties.name,
          ville: analyse.ville ?? f.properties.city,
          codePostal: f.properties.postcode,
          quartier: analyse.quartier || f.properties.city,
          longitude: f.geometry.coordinates[0],
          latitude: f.geometry.coordinates[1],
        };
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      suggestions.value = [];
      erreur.value = 'Recherche d’adresse indisponible.';
    } finally {
      chargement.value = false;
    }
  }

  /** Débounce : l'API est appelée pendant la frappe. */
  function rechercher(requete: string, delai = 300) {
    clearTimeout(minuteur);
    const q = requete.trim();
    if (q.length < 3) {
      suggestions.value = [];
      return;
    }
    minuteur = setTimeout(() => void chercher(q), delai);
  }

  function vider() {
    clearTimeout(minuteur);
    controleur?.abort();
    suggestions.value = [];
  }

  /** Recherche immédiate, sans débounce : utile à la soumission du formulaire. */
  async function chercherUne(requete: string): Promise<Adresse | null> {
    clearTimeout(minuteur);
    suggestions.value = [];
    await chercher(requete);
    return suggestions.value[0] ?? null;
  }

  return { suggestions, chargement, erreur, rechercher, chercherUne, vider };
}
