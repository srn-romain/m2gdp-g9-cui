/** Profil saisi avant la connexion, appliqué par PATCH /me au retour du lien magique. */
export interface SignupDraft {
  firstName: string;
  lastName: string;
  /** Saisie libre (« Lyon 7e ») : le quartier exact est résolu après connexion. */
  address: string;
}

const KEY = 'lbt.signupDraft';

export function saveSignupDraft(draft: SignupDraft): void {
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}

export function readSignupDraft(): SignupDraft | null {
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignupDraft;
  } catch {
    return null;
  }
}

export function clearSignupDraft(): void {
  window.localStorage.removeItem(KEY);
}

/** « Lyon 7e » -> quartier « Lyon 7e », ville « Lyon ». */
export function guessNeighborhoodCity(address: string): { neighborhood: string; city: string } {
  const value = address.trim();
  if (!value) return { neighborhood: '', city: '' };
  const city = value.replace(/\s+\d+\s*(er|e|ème)?$/i, '').trim();
  return { neighborhood: value, city: city || value };
}

/** « 12 rue de Marseille, 69007 Lyon, France » -> quartier, ville, code postal. */
export function parseFrenchAddress(formatted: string): {
  neighborhood: string;
  city: string;
  postalCode?: string;
} {
  const parts = formatted.split(',').map((p) => p.trim()).filter(Boolean);
  const postal = parts.find((p) => /^\d{5}\s+\S/.test(p));
  if (postal) {
    const match = /^(\d{5})\s+(.+)$/.exec(postal);
    if (match) {
      const [, code, city] = match;
      const arrondissement = /^(75|69|13)/.test(code) ? Number(code.slice(3)) : 0;
      const neighborhood = arrondissement
        ? `${city} ${arrondissement === 1 ? '1er' : `${arrondissement}e`}`
        : parts[0] && parts[0] !== city
          ? parts[0]
          : city;
      return { neighborhood, city, postalCode: code };
    }
  }
  const city = parts.length > 1 ? parts[parts.length - 2] : (parts[0] ?? '');
  return { neighborhood: parts[0] ?? city, city };
}
