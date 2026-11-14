<script setup lang="ts">
import { CalendarDays, Leaf, MapPin, Users } from '@lucide/vue';
import { computed } from 'vue';
import DishPhoto from './DishPhoto.vue';
import { Badge } from '@/components/ui/badge';
import { DIETARY_OPTIONS, formatDistance, formatDay, formatSeatsCourt, tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';

/**
 * Ligne de l'écran Explorer : photo, pastille de régime, titre, méta sur une ligne.
 * La pastille de régime est posée en tête de la colonne de texte, comme la maquette.
 */
const props = withDefaults(
  defineProps<{ table: Table; showDistance?: boolean; showIngredients?: boolean }>(),
  { showDistance: true, showIngredients: false },
);

const title = computed(() => tableTitle(props.table));
const distance = computed(() => formatDistance(props.table.distanceMeters));
const jour = computed(() => formatDay(props.table.startsAt));
const wanted = computed(() => props.table.wantedContributions ?? []);

/** Libellés des régimes de la tablée (repli : pastille « Végétarien » historique). */
const regimesLabels = computed(() => {
  const tags = props.table.dietaryTags ?? [];
  const labels = tags
    .map((tag) => DIETARY_OPTIONS.find((option) => option.value === tag)?.label ?? tag)
    .filter(Boolean);
  if (!labels.length && props.table.isVegetarian) labels.push('Végétarien');
  return labels;
});
</script>

<template>
  <article class="flex gap-3 rounded-2xl bg-surface p-3 shadow-[0_2px_10px_rgba(43,43,43,.06)]">
    <DishPhoto :dish-name="table.dishName" :image-url="table.dishImageUrl" :size="92" class="self-start" />

    <div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
      <div v-if="regimesLabels.length" class="flex flex-wrap gap-1">
        <Badge
          v-for="(label, index) in regimesLabels.slice(0, 2)"
          :key="label"
          variant="outline"
          class="w-fit gap-1 border-transparent bg-sauge/12 px-2.5 py-1 text-label-sm text-sauge-fonce"
        >
          <Leaf v-if="index === 0" class="size-3.5" :stroke-width="2.25" />
          {{ label }}
        </Badge>
        <Badge
          v-if="regimesLabels.length > 2"
          variant="outline"
          class="w-fit border-transparent bg-sauge/12 px-2.5 py-1 text-label-sm text-sauge-fonce"
        >
          +{{ regimesLabels.length - 2 }}
        </Badge>
      </div>

      <h3 class="text-body-lg-strong leading-[22px] text-ardoise">{{ title }}</h3>

      <p class="flex flex-wrap items-center gap-x-1 gap-y-1 text-micro text-secondaire">
        <span class="flex items-center gap-1">
          <CalendarDays class="size-3.5 shrink-0 text-sauge" :stroke-width="2" />
          {{ jour }}
        </span>
        <template v-if="showDistance && distance">
          <span class="text-ardoise/35" aria-hidden="true">·</span>
          <span class="flex items-center gap-1">
            <MapPin class="size-3.5 shrink-0 text-sauge" :stroke-width="2" />
            {{ distance }}
          </span>
        </template>
        <span class="text-ardoise/35" aria-hidden="true">·</span>
        <span class="flex items-center gap-1">
          <Users class="size-3.5 shrink-0 text-sauge" :stroke-width="2" />
          {{ formatSeatsCourt(table.seatsAvailable) }}
        </span>
      </p>

      <p v-if="showIngredients && wanted.length" class="truncate text-micro text-secondaire">
        À apporter : {{ wanted.slice(0, 3).map((w) => w.label).join(', ') }}
      </p>
    </div>
  </article>
</template>
