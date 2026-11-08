<script setup lang="ts">
import { Minus, Plus, Users } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import AddressField from '@/components/AddressField.vue';
import AppBar from '@/components/AppBar.vue';
import DishPhoto from '@/components/DishPhoto.vue';
import Stepper from '@/components/Stepper.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAddressSearch, type Adresse } from '@/composables/useAddressSearch';
import { createTable } from '@/lib/api';
import { formatIngredientQuantity, fromDateTimeLocal, toDateTimeLocal } from '@/lib/format';
import { CHAMP } from '@/lib/styles';
import type { Coordinates, QuantityUnit } from '@/lib/types';
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
const step = ref<1 | 2>(1);

/** Ingrédients que l'hôte propose d'apporter : liste de courses de la tablée. */
interface IngredientPropose {
  id: number;
  label: string;
  quantity?: number;
  unit?: QuantityUnit;
}

const UNITES: Array<{ value: QuantityUnit; label: string }> = [
  { value: 'UNIT', label: 'unité' },
  { value: 'G', label: 'g' },
  { value: 'KG', label: 'kg' },
  { value: 'CL', label: 'cl' },
  { value: 'L', label: 'L' },
  { value: 'PORTION', label: 'portion' },
];

const ingredients = ref<IngredientPropose[]>([]);
const ajoutOuvert = ref(false);
const nouvelIngredient = ref('');
const nouvelleQuantite = ref('');
const nouvelleUnite = ref<QuantityUnit | ''>('');
let prochainId = 1;

const peutAjouter = computed(() => nouvelIngredient.value.trim().length > 0);

function ajouterIngredient() {
  if (!peutAjouter.value) return;
  const nombre = Number(nouvelleQuantite.value.replace(',', '.'));
  ingredients.value.push({
    id: prochainId++,
    label: nouvelIngredient.value.trim(),
    quantity: nouvelleQuantite.value.trim() && nombre > 0 ? nombre : undefined,
    unit: nouvelleUnite.value || undefined,
  });
  fermerAjout();
}

function fermerAjout() {
  ajoutOuvert.value = false;
  nouvelIngredient.value = '';
  nouvelleQuantite.value = '';
  nouvelleUnite.value = '';
}

function retirerIngredient(id: number) {
  ingredients.value = ingredients.value.filter((ingredient) => ingredient.id !== id);
}

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
const etape1Valide = computed(
  () => dishName.value.trim().length > 0 && Boolean(date.value) && Boolean(time.value) && !creneauPasse.value,
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
      wantedContributions: ingredients.value.length
        ? ingredients.value.map(({ label, quantity, unit }) => ({ label, quantity, unit }))
        : undefined,
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

      <div class="flex items-center gap-2 text-label-sm">
        <span :class="step === 1 ? 'text-terracotta' : 'text-secondaire'">1 · Le plat</span>
        <span class="h-px flex-1 bg-ardoise/10"></span>
        <span :class="step === 2 ? 'text-terracotta' : 'text-secondaire'">2 · La logistique</span>
      </div>

      <FieldGroup>
        <Field v-if="step === 1">
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

        <div v-if="step === 1" class="grid grid-cols-2 gap-3">
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
        <p v-if="step === 1 && creneauPasse" class="-mt-2 text-micro text-terracotta">
          Choisis une date et une heure à venir.
        </p>

        <Field v-if="step === 2">
          <FieldLabel for="table-lieu">Lieu</FieldLabel>
          <AddressField
            id="table-lieu"
            v-model="lieu"
            placeholder="Lyon 7e"
            @select="adresseChoisie = $event"
          />
        </Field>

        <Field v-if="step === 2" orientation="horizontal" class="items-center justify-between">
          <FieldLabel>Nombre de places</FieldLabel>
          <div class="flex items-center gap-2">
            <Users class="size-4 text-secondaire" :stroke-width="1.75" />
            <Stepper v-model="seatsTotal" :min="1" :max="30" label="Nombre de places" />
          </div>
        </Field>

        <Field v-if="step === 1">
          <FieldLabel for="table-description">Description</FieldLabel>
          <Textarea
            id="table-description"
            v-model="description"
            rows="3"
            placeholder="Un gratin maison à partager entre voisins."
            class="rounded-2xl border-ardoise/10 bg-surface text-body-md"
          />
        </Field>

        <!-- Liste de courses : l'hôte propose, les invités choisissent. -->
        <div v-if="step === 2" class="flex flex-col gap-1">
          <h2 class="text-title-md font-titres text-sauge-fonce">Ce que les invités apportent</h2>
          <p class="text-body-sm text-secondaire">
            Propose des ingrédients, tes voisins choisiront ce qu'ils apportent.
          </p>
        </div>

        <ul v-if="step === 2 && ingredients.length" class="flex flex-col gap-2">
          <li
            v-for="ingredient in ingredients"
            :key="ingredient.id"
            class="flex items-center gap-3 rounded-2xl bg-surface p-2.5 shadow-[0_2px_10px_rgba(43,43,43,.06)]"
          >
            <DishPhoto :dish-name="ingredient.label" :size="48" rounded="rounded-full" />
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="text-body-lg-strong leading-[20px] text-ardoise">
                {{ ingredient.label }}
              </span>
              <span
                v-if="formatIngredientQuantity(ingredient.quantity, ingredient.unit)"
                class="text-body-sm text-secondaire"
              >
                {{ formatIngredientQuantity(ingredient.quantity, ingredient.unit) }}
              </span>
            </div>
            <button
              type="button"
              class="grid size-8 shrink-0 place-items-center rounded-full bg-terracotta/10 text-terracotta transition-colors hover:bg-terracotta/20"
              :aria-label="`Retirer ${ingredient.label}`"
              @click="retirerIngredient(ingredient.id)"
            >
              <Minus class="size-4" :stroke-width="2.25" />
            </button>
          </li>
        </ul>

        <div
          v-if="step === 2 && ajoutOuvert"
          class="flex flex-col gap-3 rounded-2xl border border-ardoise/12 bg-surface p-3"
        >
          <Field>
            <FieldLabel for="ingredient-label">Ingrédient</FieldLabel>
            <InputGroup :class="CHAMP">
              <InputGroupInput
                id="ingredient-label"
                v-model="nouvelIngredient"
                placeholder="Courgettes"
                class="text-body-md"
                @keydown.enter.prevent="ajouterIngredient"
              />
            </InputGroup>
          </Field>
          <div class="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel for="ingredient-quantite">Quantité</FieldLabel>
              <InputGroup :class="CHAMP">
                <InputGroupInput
                  id="ingredient-quantite"
                  v-model="nouvelleQuantite"
                  inputmode="decimal"
                  placeholder="500"
                  class="text-body-md"
                  @keydown.enter.prevent="ajouterIngredient"
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel for="ingredient-unite">Unité</FieldLabel>
              <select
                id="ingredient-unite"
                v-model="nouvelleUnite"
                class="h-[52px] w-full rounded-full border border-ardoise/10 bg-surface px-4 text-body-md text-ardoise"
              >
                <option value="">Sans unité</option>
                <option v-for="unite in UNITES" :key="unite.value" :value="unite.value">
                  {{ unite.label }}
                </option>
              </select>
            </Field>
          </div>
          <div class="flex gap-2">
            <Button type="button" variant="ghost" size="default" class="flex-1" @click="fermerAjout">
              Annuler
            </Button>
            <Button
              type="button"
              size="default"
              class="flex-1"
              :disabled="!peutAjouter"
              @click="ajouterIngredient"
            >
              Ajouter
            </Button>
          </div>
        </div>

        <Button
          v-else-if="step === 2"
          type="button"
          variant="outline"
          size="default"
          class="w-full border-sauge/45 text-sauge-fonce"
          @click="ajoutOuvert = true"
        >
          <Plus data-icon="inline-start" class="text-sauge" />
          Ajouter un ingrédient
        </Button>

        <Field v-if="step === 2" orientation="horizontal" class="items-center justify-between">
          <FieldLabel for="table-vegetarian">Plat végétarien</FieldLabel>
          <Switch id="table-vegetarian" v-model="isVegetarian" />
        </Field>
        <Field v-if="step === 2" orientation="horizontal" class="items-center justify-between">
          <FieldLabel for="table-allergens">Allergènes indiqués</FieldLabel>
          <Switch id="table-allergens" v-model="hasAllergenNotice" />
        </Field>
      </FieldGroup>

      <div class="mt-auto pt-4">
        <div v-if="step === 1" class="flex flex-col gap-2">
          <Button type="button" size="lg" class="w-full" :disabled="!etape1Valide" @click="step = 2">
            Continuer
          </Button>
        </div>
        <div v-else class="flex flex-col gap-2">
          <Button type="submit" size="lg" class="w-full" :disabled="submitting || !canSubmit">
            {{ submitting ? 'Publication…' : 'Publier ma tablée' }}
          </Button>
          <Button type="button" variant="ghost" size="default" class="w-full" @click="step = 1">
            Retour
          </Button>
        </div>
      </div>
    </form>
  </div>
</template>
