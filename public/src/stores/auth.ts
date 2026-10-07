import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createSession, requestMagicLink, setAccessTokenProvider } from '@/lib/api';
import { DEMO_MODE, DEMO_USER } from '@/lib/mock';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<FirebaseUser | null>(null);
  const isNewUser = ref(false);
  const loading = ref(true);
  const ready = ref(false);
  const accessToken = ref<string | null>(null);

  function actionUrl(): string {
    // Le lien magique doit revenir sur le domaine réellement utilisé (dev, preview ou prod).
    return `${window.location.origin}/auth/finish`;
  }

  /** Écran « Bon retour ! » : lien Firebase sous le capot, déclaration serveur tolérante. */
  async function sendMagicLink(email: string) {
    // Mode démo : la session s'ouvre immédiatement, sans lien par e-mail.
    if (DEMO_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      user.value = { uid: DEMO_USER.id, email } as FirebaseUser;
      return;
    }
    await sendSignInLinkToEmail(auth, email, { url: actionUrl(), handleCodeInApp: true });
    window.localStorage.setItem('emailForSignIn', email);
    await requestMagicLink(email).catch(() => {
      /* 202 attendu : une erreur réseau ne doit pas bloquer le parcours. */
    });
  }

  async function finishMagicLink(href = window.location.href) {
    if (DEMO_MODE) return;
    let email = window.localStorage.getItem('emailForSignIn') ?? '';
    if (!email) email = window.prompt('Confirmez votre e-mail :') ?? '';
    if (!isSignInWithEmailLink(auth, href)) throw new Error('Lien invalide.');
    const cred = await signInWithEmailLink(auth, email, href);
    window.localStorage.removeItem('emailForSignIn');
    const meta: unknown = cred.user.metadata;
    isNewUser.value =
      (cred as unknown as { _tokenResponse?: { isNewUser?: boolean } })._tokenResponse?.isNewUser ??
      (meta as { creationTime?: string; lastSignInTime?: string }).creationTime ===
        (meta as { lastSignInTime?: string }).lastSignInTime;
    const idToken = await cred.user.getIdToken();
    const session = await createSession(idToken);
    accessToken.value = session.accessToken;
    user.value = cred.user;
  }

  async function logout() {
    if (DEMO_MODE) {
      user.value = null;
      accessToken.value = null;
      return;
    }
    accessToken.value = null;
    await auth.signOut();
    user.value = null;
  }

  function initAuthListener() {
    setAccessTokenProvider(getToken);
    // Mode démo : aucune connexion Firebase. On reste déconnecté au départ pour
    // pouvoir relire les écrans d'accès, puis le CTA ouvre la session fictive.
    if (DEMO_MODE) {
      user.value = null;
      loading.value = false;
      ready.value = true;
      return;
    }
    auth.onAuthStateChanged((u) => {
      user.value = u;
      loading.value = false;
      ready.value = true;
    });
  }

  async function getToken(): Promise<string | null> {
    if (accessToken.value) return accessToken.value;
    return auth.currentUser?.getIdToken() ?? null;
  }

  /** Attend le premier état d'authentification, sans bloquer indéfiniment. */
  function waitForAuth(timeoutMs = 4000): Promise<void> {
    if (ready.value) return Promise.resolve();
    return new Promise((resolve) => {
      const stop = auth.onAuthStateChanged(() => { stop(); resolve(); });
      setTimeout(() => { stop(); resolve(); }, timeoutMs);
    });
  }

  return {
    user, isNewUser, loading, ready, accessToken,
    sendMagicLink, finishMagicLink, logout, initAuthListener, getToken, waitForAuth,
  };
});
