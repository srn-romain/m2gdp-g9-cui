import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import 'vue-sonner/style.css';
import './assets/main.css';
import 'leaflet/dist/leaflet.css';
import { installerGardeChunks, rearmerLeGarde } from './lib/chunkReload';
import { initInstallPrompt } from './composables/useInstallPrompt';
import { renderConfigHelp } from './lib/configHelp';
import { supabaseConfigMissing } from './lib/supabase';
import { useAuthStore } from './stores/auth';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'vue-sonner';

// Écoute l'invitation à installer avant tout rendu, sinon l'évènement est manqué.
initInstallPrompt();
// Un onglet ouvert avant un déploiement peut réclamer un chunk supprimé.
installerGardeChunks();

// Mises à jour sans vider le cache : dès qu'un déploiement est détecté, on
// propose le rechargement en un geste. Aucune action manuelle demandée.
if ('serviceWorker' in navigator) {
  const appliquerMiseAJour = registerSW({
    onNeedRefresh() {
      toast.info('Nouvelle version disponible', {
        description: 'Recharge pour profiter des dernières corrections.',
        duration: Infinity,
        action: {
          label: 'Recharger',
          onClick: () => void appliquerMiseAJour(true),
        },
      });
    },
    onRegisteredSW(_url, registration) {
      // Onglet resté ouvert longtemps : revérifie toutes les 30 minutes.
      if (registration) setInterval(() => void registration.update(), 30 * 60 * 1000);
    },
  });
}
console.info('[La Bonne Tablée] version', __APP_VERSION__);

const mountPoint = document.getElementById('app') as HTMLElement;

if (supabaseConfigMissing.length) {
  // Sans clés Supabase l'application ne peut pas démarrer : on explique au lieu de rester blanc.
  renderConfigHelp(mountPoint, supabaseConfigMissing);
} else {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  useAuthStore().initAuthListener();
  app.mount(mountPoint);
  rearmerLeGarde();
}
