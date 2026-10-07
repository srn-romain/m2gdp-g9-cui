<script setup lang="ts">
import { CalendarClock, Check, MapPin } from '@lucide/vue';
import { computed } from 'vue';
import DishPhoto from './DishPhoto.vue';
import { Badge } from '@/components/ui/badge';
import { contributionLine, formatDistance, formatDayTime, formatSeats, tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';

/** Carte de tablée de l'accueil : photo, titre, méta, badges, apport éventuel. */
const props = defineProps<{ table: Table }>();

const title = computed(() => tableTitle(props.table));
const meta = computed(() => {
  const parts = [formatDayTime(props.table.startsAt)];
  const distance = formatDistance(props.table.distanceMeters);
  const place = props.table.location?.neighborhood;
  if (place) parts.push(distance ? `${place} · ${distance}` : place);
  return parts;
});
const contribution = computed(() => props.table.myParticipation?.contribution ?? null);
</script>

<template>
  <article class="rounded-2xl border border-ardoise/10 bg-creme p-3 shadow-[0_2px_10px_rgba(43,43,43,.05)]">
    <div class="flex gap-3">
      <DishPhoto :dish-name="table.dishName" :size="84" />

      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <h3 class="text-title-md font-titres text-sauge-fonce">{{ title }}</h3>

        <p v-for="line in meta" :key="line" class="flex items-center gap-1.5 text-micro text-secondaire">
          <CalendarClock v-if="line === meta[0]" class="size-3.5 shrink-0" :stroke-width="1.75" />
          <MapPin v-else class="size-3.5 shrink-0" :stroke-width="1.75" />
          <span class="truncate">{{ line }}</span>
        </p>

        <div class="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge v-if="table.isVegetarian" variant="outline" class="px-2 text-label-sm text-secondaire">
            Végétarien
          </Badge>
          <Badge v-if="table.status !== 'PASSED'" variant="outline" class="px-2 text-label-sm text-secondaire">
            {{ formatSeats(table.seatsAvailable) }}
          </Badge>
        </div>
      </div>
    </div>

    <div
      v-if="contribution"
      class="mt-3 flex items-center gap-2 rounded-xl bg-sauge/10 px-3 py-2"
    >
      <Check class="size-4 shrink-0 text-sauge-fonce" :stroke-width="2.25" />
      <span class="text-micro text-secondaire">Tu apportes</span>
      <span class="truncate text-body-md text-ardoise">{{ contributionLine(contribution) }}</span>
    </div>
  </article>
</template>
