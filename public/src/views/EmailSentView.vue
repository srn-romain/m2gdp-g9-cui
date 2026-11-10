<script setup lang="ts">
import { KeyRound, MailCheck } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import logo from '@/assets/logo.png';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { clearSignupDraft, guessNeighborhoodCity, readSignupDraft } from '@/lib/signupDraft';
import { CHAMP, ICONE_CHAMP } from '@/lib/styles';
import type { UserUpdate } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useMeStore } from '@/stores/me';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const meStore = useMeStore();

const email = computed(() => String(route.query.email ?? ''));
const code = ref('');
const verifying = ref(false);
const resending = ref(false);

/**
 * Applique le profil saisi avant la connexion. On ne se fie pas à `isNewUser` de
 * Supabase mais au profil réellement stocké dans D1 : s'il porte déjà un prénom,
 * le compte existait.
 */
async function applySignupDraft(): Promise<boolean> {
  const draft = readSignupDraft();
  if (!draft) return false;

  const profil = await meStore.load(true);
  if (profil?.firstName) {
    clearSignupDraft();
    toast.info('Ce compte existait déjà : tu es connecté à ton espace.');
    return false;
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
    const repli = guessNeighborhoodCity(draft.adresseSaisie);
    payload.neighborhood = repli.neighborhood;
    payload.city = repli.city;
  }
  await meStore.save(payload);
  clearSignupDraft();
  return true;
}

async function verify() {
  const valeur = code.value.trim();
  if (!/^\d{6}$/.test(valeur)) {
    toast.error('000000');
    return;
  }
  if (!email.value) {
    toast.error('Adresse e-mail manquante. Reviens à la connexion.');
    return;
  }
  verifying.value = true;
  try {
    await authStore.verifyOtpCode(email.value, valeur);
    const nouveau = await applySignupDraft();
    if (nouveau) toast.success('Bienvenue ! Trouve ta première tablée.');
    await router.replace(nouveau ? '/explorer' : '/');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Code invalide.');
  } finally {
    verifying.value = false;
  }
}

async function resend() {
  if (!email.value) return;
  resending.value = true;
  try {
    await authStore.sendOtp(email.value);
    toast.success('Nouveau code envoyé.');
  } catch {
    toast.error("L'envoi a échoué. Réessaie dans un instant.");
  } finally {
    resending.value = false;
  }
}
</script>

<template>
  <div class="app-pad flex flex-1 flex-col gap-6 pt-16 pb-10">
    <div class="flex justify-center">
      <div class="grid size-20 place-items-center rounded-full bg-sauge/12 text-sauge">
        <MailCheck class="size-9" :stroke-width="1.75" />
      </div>
    </div>

    <div class="flex flex-col gap-2 text-center">
      <h1 class="text-display-lg font-titres text-sauge">Vérifie ta boîte mail</h1>
      <p class="text-body-md text-ardoise">
        Ton code de connexion part vers
        <span v-if="email" class="font-bold">{{ email }}</span>
        <span v-else>ton adresse e-mail</span>.
      </p>
      <p class="text-body-sm text-secondaire">
        Il est valable 1 heure et ne fonctionne qu'une fois.
      </p>
    </div>

    <form class="mt-1 flex flex-col gap-3" novalidate @submit.prevent="verify">
      <InputGroup :class="CHAMP">
        <InputGroupAddon align="inline-start">
          <KeyRound :class="ICONE_CHAMP" :stroke-width="1.6" />
        </InputGroupAddon>
        <InputGroupInput
          v-model="code"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          placeholder="000000"
          class="text-center font-mono text-title-lg tracking-[0.5em]"
        />
      </InputGroup>
      <Button type="submit" size="lg" class="mt-3 w-full" :disabled="verifying">
        {{ verifying ? 'Vérification…' : 'Vérifier mon code' }}
      </Button>
    </form>

    <div class="mt-auto flex flex-col gap-3">
      <img :src="logo" alt="La Bonne Tablée" class="mx-auto w-32 max-w-full" />
      <Button
        variant="secondary"
        size="default"
        class="w-full"
        :disabled="resending || !email"
        @click="resend"
      >
        {{ resending ? 'Envoi…' : 'Renvoyer le code' }}
      </Button>
      <RouterLink
        to="/login"
        class="text-center text-body-md text-secondaire underline-offset-4 hover:underline"
      >
        Changer d'adresse
      </RouterLink>
    </div>
  </div>
</template>
