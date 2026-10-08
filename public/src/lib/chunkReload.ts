// Après un déploiement, un onglet resté ouvert peut demander un chunk qui n'existe
// plus : la réécriture SPA renvoie l'index HTML à la place du script et l'import
// échoue (« Failed to fetch dynamically imported module »). On recharge une fois
// pour reprendre la version en ligne, plutôt que de laisser un écran cassé.
const CLE = 'lbt.reloaded-after-deploy';

const MOTIF_CHUNK =
  /dynamically imported module|Importing a module script failed|[Ll]oading chunk .* failed/i;

export function estErreurDeChunk(valeur: unknown): boolean {
  const message = valeur instanceof Error ? valeur.message : String(valeur ?? '');
  return MOTIF_CHUNK.test(message);
}

/** Recharge la page une seule fois : évite une boucle si le réseau est en cause. */
export function rechargerUneFois(): void {
  try {
    if (window.sessionStorage.getItem(CLE)) return;
    window.sessionStorage.setItem(CLE, '1');
  } catch {
    /* Navigation privée : on recharge quand même. */
  }
  window.location.reload();
}

/** Une fois l'application montée, l'onglet est à jour : le garde-fou se réarme. */
export function rearmerLeGarde(): void {
  try {
    window.sessionStorage.removeItem(CLE);
  } catch {
    /* Rien à faire. */
  }
}

/** À installer au démarrage : couvre l'évènement Vite et le rejet natif du navigateur. */
export function installerGardeChunks(): void {
  window.addEventListener('vite:preloadError', (evenement) => {
    evenement.preventDefault();
    rechargerUneFois();
  });
  window.addEventListener('unhandledrejection', (evenement) => {
    if (estErreurDeChunk(evenement.reason)) rechargerUneFois();
  });
}
