<script setup lang="ts">
import { CalendarDays, Leaf, MapPin, Users } from '@lucide/vue';
import { computed } from 'vue';
import DishPhoto from './DishPhoto.vue';
import { Badge } from '@/components/ui/badge';
import { formatDistance, formatDay, formatSeatsCourt, tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';

/**
 * Ligne de l'écran Explorer : photo, pastille de régime, titre, méta sur une ligne.
 * La pastille de régime est posée en tête de la colonne de texte, comme la maquette.
 */
const props = defineProps<{ table: Table }>();

const title = computed(() => tableTitle(props.table));
const distance = computed(() => formatDistance(props.table.distanceMeters));
const jour = computed(() => formatDay(props.table.startsAt));
</script>

<template>
  <article class="flex gap-3 rounded-2xl bg-surface p-3 shadow-[0_2px_10px_rgba(43,43,43,.06)]">
    <DishPhoto :dish-name="table.dishName" :size="92" class="self-start" />

    <div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
      <Badge
        v-if="table.isVegetarian"
        variant="outline"
        class="w-fit gap-1 border-transparent bg-sauge/12 px-2.5 py-1 text-label-sm text-sauge-fonce"
      >
        <Leaf class="size-3.5" :stroke-width="2.25" />
        Végétarien
      </Badge>

      <h3 class="text-body-lg-strong leading-[22px] text-ardoise">{{ title }}</h3>

      <p class="flex flex-wrap items-center gap-x-1 gap-y-1 text-micro text-secondaire">
        <span class="flex items-center gap-1">
          <CalendarDays class="size-3.5 shrink-0 text-sauge" :stroke-width="2" />
          {{ jour }}
        </span>
        <template v-if="distance">
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
    </div>
  </article>
</template>
