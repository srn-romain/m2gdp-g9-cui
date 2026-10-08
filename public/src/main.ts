import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/main.css';
import 'leaflet/dist/leaflet.css';
import { installerGardeChunks, rearmerLeGarde } from './lib/chunkReload';
import { initInstallPrompt } from './composables/useInstallPrompt';
import { renderConfigHelp } from './lib/configHelp';
import { firebaseConfigMissing } from './lib/firebase';
import { useAuthStore } from './stores/auth';

// Écoute l'invitation à installer avant tout rendu, sinon l'évènement est manqué.
initInstallPrompt();
// Un onglet ouvert avant un déploiement peut réclamer un chunk supprimé.
installerGardeChunks();

const mountPoint = document.getElementById('app') as HTMLElement;

if (firebaseConfigMissing.length) {
  // Sans clés Firebase l'application ne peut pas démarrer : on explique au lieu de rester blanc.
  renderConfigHelp(mountPoint, firebaseConfigMissing);
} else {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  useAuthStore().initAuthListener();
  app.mount(mountPoint);
  rearmerLeGarde();
}
