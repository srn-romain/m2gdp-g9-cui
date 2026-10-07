<script setup lang="ts">
import { MapPin, Users } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import AppBar from '@/components/AppBar.vue';
import Stepper from '@/components/Stepper.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useGeocode } from '@/composables/useGeocode';
import { createTable } from '@/lib/api';
import { fromDateTimeLocal, toDateTimeLocal } from '@/lib/format';
import { useMeStore } from '@/stores/me';

const router = useRouter();
const meStore = useMeStore();
const geocode = useGeocode();

const dishName = ref('');
const description = ref('');
const date = ref(toDateTimeLocal(new Date()).slice(0, 10));
const time = ref('12:30');
const neighborhood = ref('');
const city = ref('');
const seatsTotal = ref(4);
const isVegetarian = ref(false);
const hasAllergenNotice = ref(false);
const submitting = ref(false);

const startsAt = computed(() => fromDateTimeLocal(`${date.value}T${time.value}`));
const canSubmit = computed(
  () => dishName.value.trim().length > 0 && date.value && time.value && neighborhood.value.trim().length > 1,
);

watch([neighborhood, city], ([place, town]) => {
  const address = town ? `${place}, ${town}` : place;
  geocode.search(address);
});

async function resolveCoordinates(): Promise<{ latitude: number; longitude: number } | null> {
  const address = city.value ? `${neighborhood.value}, ${city.value}` : neighborhood.value;
  const fresh = await geocode.run(address);
  if (fresh) return { latitude: fresh.lat, longitude: fresh.lng };
  return meStore.profile?.coordinates ?? null;
}

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  try {
    const coordinates = await resolveCoordinates();
    if (!coordinates) {
      toast.error("Impossible de situer l'adresse. Précise ton quartier.");
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
        neighborhood: neighborhood.value.trim(),
        city: (city.value || meStore.profile?.city || 'Lyon').trim(),
        coordinates,
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
  if (meStore.profile?.neighborhood) neighborhood.value = meStore.profile.neighborhood;
  if (meStore.profile?.city) city.value = meStore.profile.city;
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
          <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
            <InputGroupInput
              id="table-dish"
              v-model="dishName"
              placeholder="Gratin dauphinois"
              class="text-body-md"
            />
          </InputGroup>
          <FieldDescription>Le titre affiché sera «&nbsp;{{ dishName || 'ton plat' }} chez toi&nbsp;».</FieldDescription>
        </Field>

        <div class="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel for="table-date">Date</FieldLabel>
            <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
              <InputGroupInput id="table-date" v-model="date" type="date" class="text-body-md" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="table-time">Heure</FieldLabel>
            <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
              <InputGroupInput id="table-time" v-model="time" type="time" class="text-body-md" />
            </InputGroup>
          </Field>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel for="table-neighborhood">Lieu</FieldLabel>
            <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
              <InputGroupAddon align="inline-start">
                <MapPin class="size-4 text-secondaire" />
              </InputGroupAddon>
              <InputGroupInput
                id="table-neighborhood"
                v-model="neighborhood"
                placeholder="Lyon 7e"
                class="text-body-md"
              />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="table-city">Ville</FieldLabel>
            <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
              <InputGroupInput id="table-city" v-model="city" placeholder="Lyon" class="text-body-md" />
            </InputGroup>
          </Field>
        </div>

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
            class="rounded-xl border-ardoise/12 bg-creme text-body-md"
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
