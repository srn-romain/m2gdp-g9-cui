<script setup lang="ts">
import { ChevronRight, Lock, Mail } from '@lucide/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import illustration from '@/assets/bonjour.png';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { CHAMP, ICONE_CHAMP } from '@/lib/styles';
import { DEMO_MODE } from '@/lib/mock';
import { useAuthStore } from '@/stores/auth';

const email = ref('');
const loading = ref(false);

const router = useRouter();
const authStore = useAuthStore();

async function submit() {
  const value = email.value.trim();
  if (!/\S+@\S+\.\S+/.test(value)) {
    toast.error('Vérifie ton adresse e-mail.');
    return;
  }
  loading.value = true;
  try {
    await authStore.sendOtp(value);
    // En démo la session est déjà ouverte : inutile de passer par la boîte mail.
    await router.push(DEMO_MODE ? { path: '/' } : { path: '/email-sent', query: { email: value } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "L'envoi du lien a échoué.");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col px-5 pt-6 pb-8">
    <img :src="illustration" alt="" class="mx-auto w-60 max-w-full" />

    <h1 class="mt-1 text-center text-display-2xl font-titres text-sauge-fonce">Bon retour&nbsp;!</h1>
    <p class="mx-auto mt-3 max-w-[16rem] text-center text-body-lg text-secondaire">
      Retrouve tes tablées et continue à partager de bons repas.
    </p>

    <form class="mt-9 flex flex-col gap-3" novalidate @submit.prevent="submit">
      <FieldGroup class="gap-3">
        <Field>
          <FieldLabel for="login-email" class="sr-only">Votre e-mail</FieldLabel>
          <InputGroup :class="CHAMP">
            <InputGroupAddon align="inline-start">
              <Mail :class="ICONE_CHAMP" :stroke-width="1.6" />
            </InputGroupAddon>
            <InputGroupInput
              id="login-email"
              v-model="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              placeholder="Votre e-mail"
              class="text-body-md"
            />
          </InputGroup>
        </Field>
      </FieldGroup>

      <Button type="submit" size="lg" class="mt-3 w-full" :disabled="loading">
        {{ loading ? 'Envoi…' : 'Recevoir mon code' }}
        <ChevronRight data-icon="inline-end" />
      </Button>

      <p class="mt-2 flex items-center justify-center gap-2 text-body-sm text-ardoise">
        <Lock class="size-4 shrink-0 text-sauge" :stroke-width="1.6" />
        Pas de mot de passe à retenir.
      </p>
    </form>

    <div class="mt-auto pt-12">
      <Separator />
      <p class="mt-4 text-center text-body-md text-ardoise">
        Pas encore de compte&nbsp;?
        <RouterLink to="/bienvenue" class="font-medium text-sauge-fonce underline underline-offset-4">
          Créer un compte
        </RouterLink>
      </p>
    </div>
  </div>
</template>
