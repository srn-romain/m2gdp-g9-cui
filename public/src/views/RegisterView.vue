<script setup lang="ts">
import { ChevronRight, Mail, User } from '@lucide/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import illustration from '@/assets/bonjour.png';
import AddressField from '@/components/AddressField.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { useAddressSearch, type Adresse } from '@/composables/useAddressSearch';
import { saveSignupDraft } from '@/lib/signupDraft';
import { DEMO_MODE } from '@/lib/mock';
import { CHAMP, ICONE_CHAMP } from '@/lib/styles';
import { useAuthStore } from '@/stores/auth';

const firstName = ref('');
const lastName = ref('');
const address = ref('');
const email = ref('');
const loading = ref(false);
/** Adresse retenue dans la liste de suggestions, avec ses coordonnées. */
const adresseChoisie = ref<Adresse | null>(null);

const router = useRouter();
const authStore = useAuthStore();
const { chercherUne } = useAddressSearch();

async function submit() {
  if (!firstName.value.trim() || !lastName.value.trim()) {
    toast.error('Renseigne ton prénom et ton nom.');
    return;
  }
  if (address.value.trim().length < 2) {
    toast.error('Indique ton quartier : c’est ce qui permet de te proposer des tablées proches.');
    return;
  }
  if (!/\S+@\S+\.\S+/.test(email.value.trim())) {
    toast.error('Vérifie ton adresse e-mail.');
    return;
  }
  const mail = email.value.trim();
  loading.value = true;
  try {
    // Supabase envoie le lien sans révéler si l'adresse est déjà connue. La réponse
    // « ce compte existe déjà » arrive après le clic sur le lien, dans AuthFinishView.
    await authStore.sendMagicLink(mail);
    // Sans suggestion retenue, on tente une dernière recherche avant d'enregistrer :
    // l'adresse porte les coordonnées qui alimentent distances et météo.
    const adresse = adresseChoisie.value ?? (await chercherUne(address.value));
    saveSignupDraft({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      adresseSaisie: address.value.trim(),
      adresse: adresse ?? undefined,
    });
    await router.push(DEMO_MODE ? { path: '/' } : { path: '/email-sent', query: { email: mail } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'La création du compte a échoué.');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col px-5 pt-6 pb-8">
    <img :src="illustration" alt="" class="mx-auto w-60 max-w-full" />

    <h1 class="mt-1 text-center text-display-2xl font-titres text-sauge-fonce">Bienvenue&nbsp;!</h1>
    <p class="mx-auto mt-3 max-w-[17.5rem] text-center text-body-lg text-secondaire">
      Rejoins une communauté de voisins qui partagent de bons repas.
    </p>

    <form class="mt-9 flex flex-col gap-3" novalidate @submit.prevent="submit">
      <FieldGroup class="gap-3">
        <div class="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel for="signup-firstname" class="sr-only">Prénom</FieldLabel>
            <InputGroup :class="CHAMP">
              <InputGroupAddon align="inline-start">
                <User :class="ICONE_CHAMP" :stroke-width="1.6" />
              </InputGroupAddon>
              <InputGroupInput
                id="signup-firstname"
                v-model="firstName"
                autocomplete="given-name"
                placeholder="Prénom"
                class="text-body-md"
              />
            </InputGroup>
          </Field>

          <Field>
            <FieldLabel for="signup-lastname" class="sr-only">Nom</FieldLabel>
            <InputGroup :class="CHAMP">
              <InputGroupAddon align="inline-start">
                <User :class="ICONE_CHAMP" :stroke-width="1.6" />
              </InputGroupAddon>
              <InputGroupInput
                id="signup-lastname"
                v-model="lastName"
                autocomplete="family-name"
                placeholder="Nom"
                class="text-body-md"
              />
            </InputGroup>
          </Field>
        </div>

        <Field>
          <FieldLabel for="signup-address" class="sr-only">Adresse</FieldLabel>
          <AddressField
            id="signup-address"
            v-model="address"
            placeholder="adresse"
            @select="adresseChoisie = $event"
          />
        </Field>

        <Field>
          <FieldLabel for="signup-email" class="sr-only">Votre e-mail</FieldLabel>
          <InputGroup :class="CHAMP">
            <InputGroupAddon align="inline-start">
              <Mail :class="ICONE_CHAMP" :stroke-width="1.6" />
            </InputGroupAddon>
            <InputGroupInput
              id="signup-email"
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
        {{ loading ? 'Création…' : 'Créer mon compte' }}
        <ChevronRight data-icon="inline-end" />
      </Button>
    </form>

    <div class="mt-auto pt-12">
      <Separator />
      <p class="mt-4 text-center text-body-md text-ardoise">
        Déjà inscrit&nbsp;?
        <RouterLink to="/login" class="font-medium text-sauge-fonce underline underline-offset-4">
          Se connecter
        </RouterLink>
      </p>
    </div>
  </div>
</template>
