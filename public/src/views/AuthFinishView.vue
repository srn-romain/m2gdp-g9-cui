<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { apiGet } from '@/lib/api';
import {
  clearSignupDraft,
  guessNeighborhoodCity,
  parseFrenchAddress,
  readSignupDraft,
} from '@/lib/signupDraft';
import type { UserUpdate } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useMeStore } from '@/stores/me';

const router = useRouter();
const authStore = useAuthStore();
const meStore = useMeStore();
const error = ref<string | null>(null);

/** Le quartier est affiné après connexion : le proxy de géocodage est protégé. */
async function applySignupDraft() {
  const draft = readSignupDraft();
  if (!draft) return;
  const fallback = guessNeighborhoodCity(draft.address);
  let payload: UserUpdate = {
    firstName: draft.firstName,
    lastName: draft.lastName,
    neighborhood: fallback.neighborhood,
    city: fallback.city,
  };
  try {
    const geo = await apiGet<{ formatted: string; lat: number; lng: number }>(
      `/api/v1/geocode?address=${encodeURIComponent(draft.address)}&lang=fr`,
    );
    const resolved = parseFrenchAddress(geo.formatted);
    payload = {
      ...payload,
      neighborhood: resolved.neighborhood || fallback.neighborhood,
      city: resolved.city || fallback.city,
      coordinates: { latitude: geo.lat, longitude: geo.lng },
    };
  } catch {
    /* Le quartier saisi reste valable sans coordonnées. */
  }
  await meStore.save(payload);
  clearSignupDraft();
}

onMounted(async () => {
  try {
    await authStore.finishMagicLink();
    await applySignupDraft();
    await router.replace('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Connexion impossible.';
  }
});
</script>

<template>
  <div class="app-pad flex flex-1 flex-col items-center justify-center gap-5 text-center">
    <template v-if="!error">
      <Spinner class="size-8 text-terracotta" />
      <p class="text-body-md text-secondaire">Connexion en cours…</p>
    </template>

    <template v-else>
      <Alert variant="destructive" class="text-left">
        <AlertTitle>Lien inutilisable</AlertTitle>
        <AlertDescription>
          {{ error }} Demande un nouveau lien pour continuer.
        </AlertDescription>
      </Alert>
      <Button size="default" @click="router.replace('/login')">Revenir à la connexion</Button>
    </template>
  </div>
</template>
