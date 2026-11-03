import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { setAccessTokenProvider } from '@/lib/api';
import { DEMO_MODE, DEMO_USER } from '@/lib/mock';

export const useAuthStore = defineStore('auth', () => {
  // En mode démo, la session est fictive : on la garde en localStorage pour qu'un
  // rafraîchissement de page ne déconnecte pas (comportement réel de Supabase en prod).
  const CLE_SESSION_DEMO = 'lbt.demoSession';

  const user = ref<SupabaseUser | null>(null);
  const isNewUser = ref(false);
  const loading = ref(true);
  const ready = ref(false);

  function actionUrl(): string {
    // Le lien magique doit revenir sur le domaine réellement utilisé (dev, preview ou prod).
    return `${window.location.origin}/auth/finish`;
  }

  /** Écran « Bon retour ! » : envoie un lien magique via Supabase Auth. */
  async function sendMagicLink(email: string) {
    // Mode démo : la session s'ouvre immédiatement, sans lien par e-mail.
    if (DEMO_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      user.value = { id: DEMO_USER.id, email } as SupabaseUser;
      window.localStorage.setItem(CLE_SESSION_DEMO, email);
      return;
    }
    // « sign in with OTP » envoie un Magic Link par défaut. La réponse ne révèle pas
    // si l'adresse est connue, ce qui évite d'énumérer les comptes.
    // Source : https://supabase.com/docs/guides/auth/auth-email-passwordless#signing-in-with-magic-link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: actionUrl(), shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async function finishMagicLink() {
    if (DEMO_MODE) return;
    // Le lien magique ramène avec la session dans l'URL ; detectSessionInUrl la
    // consomme automatiquement. getSession() confirme l'état courant sans redéclencher
    // de navigation.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error('Lien invalide.');
    user.value = data.session.user;
    isNewUser.value =
      data.session.user.created_at === data.session.user.last_sign_in_at;
  }

  async function logout() {
    if (DEMO_MODE) {
      window.localStorage.removeItem(CLE_SESSION_DEMO);
      user.value = null;
      return;
    }
    await supabase.auth.signOut();
    user.value = null;
  }

  function initAuthListener() {
    setAccessTokenProvider(getToken);
    // Mode démo : aucune connexion Supabase. La session fictive est restaurée si elle
    // existe déjà, sinon on démarre déconnecté pour pouvoir relire les écrans d'accès.
    if (DEMO_MODE) {
      const email = window.localStorage.getItem(CLE_SESSION_DEMO);
      user.value = email ? ({ id: DEMO_USER.id, email } as SupabaseUser) : null;
      loading.value = false;
      ready.value = true;
      return;
    }
    // Source : https://supabase.com/docs/reference/javascript/auth-onauthstatechange
    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null;
      loading.value = false;
      ready.value = true;
    });
  }

  async function getToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  /** Attend le premier état d'authentification, sans bloquer indéfiniment. */
  function waitForAuth(timeoutMs = 4000): Promise<void> {
    if (ready.value) return Promise.resolve();
    return new Promise((resolve) => {
      const { data } = supabase.auth.onAuthStateChange(() => {
        data.subscription.unsubscribe();
        resolve();
      });
      setTimeout(() => {
        data.subscription.unsubscribe();
        resolve();
      }, timeoutMs);
    });
  }

  return {
    user, isNewUser, loading, ready,
    sendMagicLink, finishMagicLink, logout, initAuthListener, getToken, waitForAuth,
  };
});
