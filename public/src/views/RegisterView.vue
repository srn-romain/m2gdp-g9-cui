<script setup lang="ts">
import { ArrowRight, Mail, MapPin, User } from '@lucide/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import Mascot from '@/components/Mascot.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { saveSignupDraft } from '@/lib/signupDraft';
import { useAuthStore } from '@/stores/auth';

const firstName = ref('');
const lastName = ref('');
const address = ref('');
const email = ref('');
const loading = ref(false);

const router = useRouter();
const authStore = useAuthStore();

function canSubmit(): boolean {
  return Boolean(
    firstName.value.trim() &&
    lastName.value.trim() &&
    address.value.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email.value.trim()),
  );
}

async function submit() {
  if (!canSubmit()) return;
  const mail = email.value.trim();
  loading.value = true;
  try {
    saveSignupDraft({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      address: address.value.trim(),
    });
    await authStore.sendMagicLink(mail);
    await router.push({ path: '/email-sent', query: { email: mail } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'La création du compte a échoué.');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="app-pad flex flex-1 flex-col gap-5 pt-10 pb-10">
    <div class="flex justify-center">
      <Mascot pose="cheer" :size="120" />
    </div>

    <div class="flex flex-col gap-2 text-center">
      <h1 class="text-display-xl font-titres text-ardoise">Bienvenue&nbsp;!</h1>
      <p class="text-body-sm text-secondaire">
        Rejoins une communauté de voisins qui partagent de bons repas.
      </p>
    </div>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <FieldGroup>
        <Field>
          <FieldLabel for="signup-firstname">Je suis</FieldLabel>
          <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
            <InputGroupAddon align="inline-start">
              <User class="size-4 text-secondaire" />
            </InputGroupAddon>
            <InputGroupInput
              id="signup-firstname"
              v-model="firstName"
              autocomplete="given-name"
              placeholder="Bernard"
              class="text-body-md"
            />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel for="signup-lastname">Nom</FieldLabel>
          <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
            <InputGroupAddon align="inline-start">
              <User class="size-4 text-secondaire" />
            </InputGroupAddon>
            <InputGroupInput
              id="signup-lastname"
              v-model="lastName"
              autocomplete="family-name"
              placeholder="Martin"
              class="text-body-md"
            />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel for="signup-address">Adresse</FieldLabel>
          <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
            <InputGroupAddon align="inline-start">
              <MapPin class="size-4 text-secondaire" />
            </InputGroupAddon>
            <InputGroupInput
              id="signup-address"
              v-model="address"
              autocomplete="address-level2"
              placeholder="Lyon 7e"
              class="text-body-md"
            />
          </InputGroup>
          <FieldDescription>Ton quartier suffit : jamais ton adresse exacte.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel for="signup-email">Votre e-mail</FieldLabel>
          <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
            <InputGroupAddon align="inline-start">
              <Mail class="size-4 text-secondaire" />
            </InputGroupAddon>
            <InputGroupInput
              id="signup-email"
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

      <Button type="submit" size="lg" class="w-full" :disabled="loading || !canSubmit()">
        {{ loading ? 'Création…' : 'Créer mon compte' }}
        <ArrowRight v-if="!loading" data-icon="inline-end" />
      </Button>
    </form>

    <p class="mt-auto text-center text-body-md text-secondaire">
      Déjà inscrit&nbsp;?
      <RouterLink to="/login" class="text-button-md text-terracotta underline-offset-4 hover:underline">
        Se connecter
      </RouterLink>
    </p>
  </div>
</template>
