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

  /** Envoie un code OTP à 6 chiffres par e-mail via Supabase Auth. */
  async function sendOtp(email: string) {
    // Mode démo : la session s'ouvre immédiatement, sans code par e-mail.
    if (DEMO_MODE) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      user.value = { id: DEMO_USER.id, email } as SupabaseUser;
      window.localStorage.setItem(CLE_SESSION_DEMO, email);
      return;
    }
    // « sign in with OTP » envoie un code à 6 chiffres dès que le template d'e-mail
    // contient {{ .Token }} au lieu du lien de confirmation. La réponse ne révèle pas
    // si l'adresse est connue, ce qui évite d'énumérer les comptes.
    // Source : https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  /** Vérifie le code OTP et ouvre la session Supabase correspondante. */
  async function verifyOtpCode(email: string, code: string) {
    if (DEMO_MODE) return;
    const normalise = email.trim().toLowerCase();
    const token = code.trim();
    // Un même flux sert la connexion et l'inscription. Selon que Supabase considère
    // l'utilisateur comme existant ou nouveau, le code est typé 'email' ou 'signup'.
    // On essaie les deux pour absorber cette différence sans dérouter l'utilisateur.
    let session: { user: SupabaseUser } | null = null;
    let derniereErreur: Error | null = null;
    for (const type of ['email', 'signup'] as const) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalise,
        token,
        type,
      });
      if (!error && data.session) {
        session = data.session;
        break;
      }
      if (error) derniereErreur = new Error(error.message);
    }
    if (!session) throw derniereErreur ?? new Error('Code invalide.');
    user.value = session.user;
    isNewUser.value =
      session.user.created_at === session.user.last_sign_in_at;
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
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    const maintenant = Math.floor(Date.now() / 1000);
    const expire = data.session.expires_at ?? 0;
    // Rafraîchit avant l'expiration : l'utilisateur reste connecté tant que
    // Supabase accepte le refresh token, sans passage par un nouvel e-mail.
    if (expire - maintenant < 60) {
      const { data: refreshed } = await supabase.auth.refreshSession({
        refresh_token: data.session.refresh_token,
      });
      if (refreshed.session) return refreshed.session.access_token;
    }
    return data.session.access_token;
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
    sendOtp, verifyOtpCode, logout, initAuthListener, getToken, waitForAuth,
  };
});
