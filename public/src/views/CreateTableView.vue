<script setup lang="ts">
import { Users } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import AddressField from '@/components/AddressField.vue';
import AppBar from '@/components/AppBar.vue';
import Stepper from '@/components/Stepper.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAddressSearch, type Adresse } from '@/composables/useAddressSearch';
import { createTable } from '@/lib/api';
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/format';
import { CHAMP } from '@/lib/styles';
import type { Coordinates } from '@/lib/types';
import { useMeStore } from '@/stores/me';

const router = useRouter();
const meStore = useMeStore();
const { chercherUne } = useAddressSearch();

const dishName = ref('');
const description = ref('');
/** Créneau par défaut : aujourd'hui 12 h 30, ou demain s'il est déjà passé. */
function creneauParDefaut() {
  const quand = new Date();
  quand.setHours(12, 30, 0, 0);
  if (quand.getTime() <= Date.now()) quand.setDate(quand.getDate() + 1);
  const valeur = toDateTimeLocal(quand);
  return { date: valeur.slice(0, 10), time: valeur.slice(11, 16) };
}
const defaut = creneauParDefaut();
const date = ref(defaut.date);
const time = ref(defaut.time);
const lieu = ref('');
const adresseChoisie = ref<Adresse | null>(null);
const seatsTotal = ref(4);
const isVegetarian = ref(false);
const hasAllergenNotice = ref(false);
const submitting = ref(false);

const startsAt = computed(() => fromDateTimeLocal(`${date.value}T${time.value}`));
const creneauPasse = computed(() => new Date(startsAt.value).getTime() <= Date.now());
const canSubmit = computed(
  () =>
    dishName.value.trim().length > 0 &&
    Boolean(date.value) &&
    Boolean(time.value) &&
    lieu.value.trim().length > 1 &&
    !creneauPasse.value,
);

/** L'adresse choisie porte le quartier, la ville et les coordonnées de la tablée. */
async function resoudreLieu(): Promise<{
  neighborhood: string;
  city: string;
  postalCode?: string;
  coordinates: Coordinates;
} | null> {
  const adresse = adresseChoisie.value ?? (await chercherUne(lieu.value));
  if (adresse) {
    return {
      neighborhood: adresse.quartier,
      city: adresse.ville,
      postalCode: adresse.codePostal,
      coordinates: { latitude: adresse.latitude, longitude: adresse.longitude },
    };
  }
  // Adresse non reconnue : le quartier du profil fait office de position.
  const profil = meStore.profile;
  if (!profil?.coordinates) return null;
  return {
    neighborhood: lieu.value.trim() || profil.neighborhood,
    city: profil.city,
    coordinates: profil.coordinates,
  };
}

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const position = await resoudreLieu();
    if (!position) {
      toast.error("Impossible de situer ce lieu. Précise le quartier ou la ville.");
      return;
    }
    const table = await createTable({
      dishName: dishName.value.trim(),
      description: description.value.trim() || undefined,
      startsAt: startsAt.value,
      seatsTotal: seatsTotal.value,
      isVegetarian: isVegetarian.value,
      hasAllergenNotice: hasAllergenNotice.value,
      location: {
        neighborhood: position.neighborhood,
        city: position.city,
        postalCode: position.postalCode,
        coordinates: position.coordinates,
      },
    });
    toast.success('Ta tablée est publiée.');
    await router.push(`/tables/${table.id}`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'La publication a échoué.');
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  await meStore.load();
  if (meStore.profile?.neighborhood) lieu.value = meStore.profile.neighborhood;
});
</script>

<template>
  <div class="flex flex-1 flex-col pb-8">
    <AppBar title="Créer une tablée" />

    <form class="app-pad flex flex-1 flex-col gap-5" novalidate @submit.prevent="submit">
      <p class="text-body-sm text-secondaire">
        Partage ton plat et laisse tes voisins choisir ce qu'ils apportent.
      </p>

      <FieldGroup>
        <Field>
          <FieldLabel for="table-dish">Titre de la tablée</FieldLabel>
          <InputGroup :class="CHAMP">
            <InputGroupInput
              id="table-dish"
              v-model="dishName"
              placeholder="Gratin dauphinois"
              class="text-body-md"
            />
          </InputGroup>
          <FieldDescription>
            Le titre affiché sera «&nbsp;{{ dishName || 'ton plat' }} chez toi&nbsp;».
          </FieldDescription>
        </Field>

        <div class="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel for="table-date">Date</FieldLabel>
            <InputGroup :class="CHAMP">
              <InputGroupInput id="table-date" v-model="date" type="date" class="text-body-md" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="table-time">Heure</FieldLabel>
            <InputGroup :class="CHAMP">
              <InputGroupInput id="table-time" v-model="time" type="time" class="text-body-md" />
            </InputGroup>
          </Field>
        </div>
        <p v-if="creneauPasse" class="-mt-2 text-micro text-terracotta">
          Choisis une date et une heure à venir.
        </p>

        <Field>
          <FieldLabel for="table-lieu">Lieu</FieldLabel>
          <AddressField
            id="table-lieu"
            v-model="lieu"
            placeholder="Lyon 7e"
            @select="adresseChoisie = $event"
          />
        </Field>

        <Field orientation="horizontal" class="items-center justify-between">
          <FieldLabel>Nombre de places</FieldLabel>
          <div class="flex items-center gap-2">
            <Users class="size-4 text-secondaire" :stroke-width="1.75" />
            <Stepper v-model="seatsTotal" :min="1" :max="30" label="Nombre de places" />
          </div>
        </Field>

        <Field>
          <FieldLabel for="table-description">Description</FieldLabel>
          <Textarea
            id="table-description"
            v-model="description"
            rows="3"
            placeholder="Un gratin maison à partager entre voisins."
            class="rounded-2xl border-ardoise/10 bg-surface text-body-md"
          />
        </Field>

        <Field orientation="horizontal" class="items-center justify-between">
          <FieldLabel for="table-vegetarian">Plat végétarien</FieldLabel>
          <Switch id="table-vegetarian" v-model="isVegetarian" />
        </Field>
        <Field orientation="horizontal" class="items-center justify-between">
          <FieldLabel for="table-allergens">Allergènes indiqués</FieldLabel>
          <Switch id="table-allergens" v-model="hasAllergenNotice" />
        </Field>
      </FieldGroup>

      <div class="mt-auto pt-4">
        <Button type="submit" size="lg" class="w-full" :disabled="submitting || !canSubmit">
          {{ submitting ? 'Publication…' : 'Publier ma tablée' }}
        </Button>
      </div>
    </form>
  </div>
</template>
