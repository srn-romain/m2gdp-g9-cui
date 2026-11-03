<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { clearSignupDraft, guessNeighborhoodCity, readSignupDraft } from '@/lib/signupDraft';
import type { UserUpdate } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useMeStore } from '@/stores/me';

const router = useRouter();
const authStore = useAuthStore();
const meStore = useMeStore();
const error = ref<string | null>(null);

/**
 * Applique le profil saisi avant la connexion : l'adresse porte déjà les coordonnées.
 * On ne se fie pas à `isNewUser` de Supabase (peu fiable selon les environnements) mais
 * au profil réellement stocké dans D1 : s'il porte déjà un prénom, le compte existait.
 */
async function applySignupDraft() {
  const draft = readSignupDraft();
  if (!draft) return;

  const profil = await meStore.load(true);
  if (profil?.firstName) {
    clearSignupDraft();
    toast.info('Ce compte existait déjà : tu es connecté à ton espace.');
    return;
  }
  const payload: UserUpdate = {
    firstName: draft.firstName,
    lastName: draft.lastName,
  };
  if (draft.adresse) {
    payload.neighborhood = draft.adresse.quartier;
    payload.city = draft.adresse.ville;
    payload.coordinates = {
      latitude: draft.adresse.latitude,
      longitude: draft.adresse.longitude,
    };
  } else {
    // Adresse non géolocalisée : on garde au moins le quartier saisi.
    const repli = guessNeighborhoodCity(draft.adresseSaisie);
    payload.neighborhood = repli.neighborhood;
    payload.city = repli.city;
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
