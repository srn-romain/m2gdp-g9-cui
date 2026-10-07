<script setup lang="ts">
import { ArrowRight, Mail } from '@lucide/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import Mascot from '@/components/Mascot.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { useAuthStore } from '@/stores/auth';

const email = ref('');
const loading = ref(false);
const router = useRouter();
const authStore = useAuthStore();

async function submit() {
  const value = email.value.trim();
  if (!value) return;
  loading.value = true;
  try {
    await authStore.sendMagicLink(value);
    await router.push({ path: '/email-sent', query: { email: value } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "L'envoi du lien a échoué.");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="app-pad flex flex-1 flex-col gap-6 pt-14 pb-10">
    <div class="flex justify-center">
      <Mascot pose="wave" :size="140" />
    </div>

    <div class="flex flex-col gap-2 text-center">
      <h1 class="text-display-xl font-titres text-ardoise">Bon retour&nbsp;!</h1>
      <p class="text-body-sm text-secondaire">
        Retrouve tes tablées et continue à partager de bons repas.
      </p>
    </div>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <FieldGroup>
        <Field>
          <FieldLabel for="login-email">Votre e-mail</FieldLabel>
          <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
            <InputGroupAddon align="inline-start">
              <Mail class="size-4 text-secondaire" />
            </InputGroupAddon>
            <InputGroupInput
              id="login-email"
              v-model="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              placeholder="vous@exemple.fr"
              class="text-body-md"
            />
          </InputGroup>
        </Field>
      </FieldGroup>

      <Button type="submit" size="lg" class="w-full" :disabled="loading || !email.trim()">
        {{ loading ? 'Envoi…' : 'Connexion avec un lien magique' }}
        <ArrowRight v-if="!loading" data-icon="inline-end" />
      </Button>
      <p class="text-center text-body-sm text-secondaire">Pas de mot de passe à retenir.</p>
    </form>

    <p class="mt-auto text-center text-body-md text-secondaire">
      Pas encore de compte&nbsp;?
      <RouterLink to="/bienvenue" class="text-button-md text-terracotta underline-offset-4 hover:underline">
        Créer un compte
      </RouterLink>
    </p>
  </div>
</template>
