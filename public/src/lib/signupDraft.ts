import type { Adresse } from '@/composables/useAddressSearch';

/**
 * Profil saisi avant la connexion, appliqué par PATCH /me au retour du lien magique.
 * L'adresse vient de l'autocomplétion : elle porte le quartier, la ville et les
 * coordonnées, ce qui alimente les distances et la météo.
 */
export interface SignupDraft {
  firstName: string;
  lastName: string;
  /** Saisie brute, conservée si la recherche d'adresse n'a rien donné. */
  adresseSaisie: string;
  adresse?: Adresse;
}

const CLE = 'lbt.signupDraft';

export function saveSignupDraft(draft: SignupDraft): void {
  window.localStorage.setItem(CLE, JSON.stringify(draft));
}

export function readSignupDraft(): SignupDraft | null {
  const brut = window.localStorage.getItem(CLE);
  if (!brut) return null;
  try {
    return JSON.parse(brut) as SignupDraft;
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  window.localStorage.removeItem(CLE);
}

/** Repli quand l'adresse n'a pas pu être géolocalisée : « Lyon 7e » -> Quartier + Ville. */
export function guessNeighborhoodCity(address: string): { neighborhood: string; city: string } {
  const valeur = address.trim();
  if (!valeur) return { neighborhood: '', city: '' };
  const ville = valeur.replace(/\s+\d+\s*(er|e|ème)?$/i, '').trim();
  return { neighborhood: valeur, city: ville || valeur };
}
