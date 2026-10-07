import { computed, ref } from 'vue';

/** Évènement Chromium non standard, absent des typages DOM. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'desktop';

const DISMISS_KEY = 'lbt.installDismissed';

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const installed = ref(false);
const dismissed = ref(false);
let initialized = false;

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent;
  // iPad récent se présente comme un Mac : on repère aussi le tactile.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && 'ontouchend' in document)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Vrai quand l'app tourne déjà comme application installée. */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** À appeler une seule fois au démarrage : écoute les invitations du navigateur. */
export function initInstallPrompt(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  installed.value = isStandalone();
  dismissed.value = window.localStorage.getItem(DISMISS_KEY) === '1';

  window.addEventListener('beforeinstallprompt', (event) => {
    // Sans preventDefault, Chromium affiche sa propre bannière.
    event.preventDefault();
    deferredPrompt.value = event as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    installed.value = true;
    deferredPrompt.value = null;
    window.localStorage.removeItem(DISMISS_KEY);
  });
}

export function useInstallPrompt() {
  const platform = detectPlatform();
  /** Chromium (Android, desktop) : on peut déclencher l'installation. */
  const canPrompt = computed(() => deferredPrompt.value !== null);
  /** iOS/Safari : aucune API, il faut guider l'utilisateur. */
  const needsManualSteps = computed(() => !installed.value && !canPrompt.value);
  const isInstalled = computed(() => installed.value);
  const isDismissed = computed(() => dismissed.value);
  /** À afficher sur l'accueil : une seule fois, et seulement si ça mène à quelque chose. */
  const shouldInvite = computed(
    () => !installed.value && !dismissed.value && (canPrompt.value || platform === 'ios'),
  );

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const event = deferredPrompt.value;
    if (!event) return 'unavailable';
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') installed.value = true;
    deferredPrompt.value = null;
    return outcome;
  }

  function dismiss(): void {
    dismissed.value = true;
    window.localStorage.setItem(DISMISS_KEY, '1');
  }

  return {
    platform,
    canPrompt,
    needsManualSteps,
    isInstalled,
    isDismissed,
    shouldInvite,
    promptInstall,
    dismiss,
  };
}
