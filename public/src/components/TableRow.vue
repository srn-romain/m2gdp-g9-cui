<script setup lang="ts">
import { Check, MapPin } from '@lucide/vue';
import { computed } from 'vue';
import DishPhoto from './DishPhoto.vue';
import { Badge } from '@/components/ui/badge';
import { formatDistance, formatSeats, tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';

/** Ligne compacte de l'écran Explorer. */
const props = defineProps<{ table: Table }>();

const title = computed(() => tableTitle(props.table));
const place = computed(() => {
  const distance = formatDistance(props.table.distanceMeters);
  const neighborhood = props.table.location?.neighborhood ?? '';
  return distance ? `${neighborhood} · ${distance}` : neighborhood;
});
</script>

<template>
  <article class="flex items-center gap-3 rounded-2xl border border-ardoise/10 bg-creme p-3 shadow-[0_2px_10px_rgba(43,43,43,.05)]">
    <DishPhoto :dish-name="table.dishName" :size="60" />

    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <h3 class="truncate text-title-sm font-titres text-sauge-fonce">{{ title }}</h3>
      <p class="flex items-center gap-1.5 text-micro text-secondaire">
        <MapPin class="size-3.5 shrink-0" :stroke-width="1.75" />
        <span class="truncate">{{ place }}</span>
      </p>
      <div class="flex flex-wrap items-center gap-1.5">
        <Badge v-if="table.isVegetarian" variant="outline" class="px-2 text-label-sm text-secondaire">
          Végétarien
        </Badge>
        <Badge v-if="table.status !== 'PASSED'" variant="outline" class="px-2 text-label-sm text-secondaire">
          {{ formatSeats(table.seatsAvailable) }}
        </Badge>
      </div>
    </div>

    <Check
      v-if="table.myParticipation"
      class="size-5 shrink-0 text-sauge"
      :stroke-width="2.5"
      aria-label="Tu participes"
    />
  </article>
</template>
