import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getMe, updateMe } from '@/lib/api';
import type { User, UserUpdate } from '@/lib/types';

/** Profil de l'utilisateur connecté : GET /me et PATCH /me. */
export const useMeStore = defineStore('me', () => {
  const profile = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /** L'onboarding est terminé quand l'identité et le quartier sont renseignés. */
  const isOnboarded = computed(() => {
    const p = profile.value;
    return Boolean(p && p.firstName && p.lastName && p.neighborhood && p.city);
  });

  async function load(force = false): Promise<User | null> {
    if (profile.value && !force) return profile.value;
    loading.value = true;
    error.value = null;
    try {
      profile.value = await getMe();
      return profile.value;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Profil indisponible.';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function save(patch: UserUpdate): Promise<User> {
    const updated = await updateMe(patch);
    profile.value = updated;
    return updated;
  }

  function reset() {
    profile.value = null;
    error.value = null;
  }

  return { profile, loading, error, isOnboarded, load, save, reset };
});
