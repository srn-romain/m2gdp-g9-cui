<script setup lang="ts">
import { CalendarDays, ChevronRight, MapPin } from '@lucide/vue';
import { computed } from 'vue';
import AccentStroke from './AccentStroke.vue';
import DishPhoto from './DishPhoto.vue';
import InfoRow from './InfoRow.vue';
import { formatDistance, formatDay, formatTime, tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';

/**
 * Carte de tablée, réutilisée par l'accueil et l'explorateur.
 * `past` correspond à la variante compacte des tablées passées.
 */
const props = withDefaults(defineProps<{ table: Table; variant?: 'upcoming' | 'past' }>(), {
  variant: 'upcoming',
});

const title = computed(() => tableTitle(props.table));
const distance = computed(() => formatDistance(props.table.distanceMeters));
const quand = computed(() => ({
  jour: formatDay(props.table.startsAt),
  heure: formatTime(props.table.startsAt),
}));
</script>

<template>
  <article class="flex gap-3 rounded-2xl bg-surface p-3 shadow-[0_2px_10px_rgba(43,43,43,.06)]">
    <DishPhoto
      :dish-name="table.dishName"
      :image-url="table.dishImageUrl"
      :size="variant === 'past' ? 76 : 96"
    />

    <!-- Les apports sont une liste : ils sont affichés en entier dans la fiche détail. -->
    <div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
      <h3 class="flex items-start gap-1.5">
        <span
          class="font-titres text-sauge-fonce"
          :class="variant === 'past' ? 'text-[13px] leading-5' : 'text-title-sm'"
        >
          {{ title }}
        </span>
        <AccentStroke :height="11" class="mt-1.5" />
      </h3>

      <template v-if="variant === 'upcoming'">
        <!-- Date et lieu sur la même ligne, comme sur la maquette. -->
        <div class="flex items-start">
          <!-- « Aujourd'hui » est long : la colonne de la date est un peu plus large. -->
          <InfoRow
            class="flex-[1.17]"
            :icon="CalendarDays"
            :label="quand.jour"
            :value="quand.heure"
          />
          <InfoRow
            class="flex-1 border-l border-ardoise/10 pl-3"
            :icon="MapPin"
            :label="table.location.neighborhood"
            :value="distance"
          />
        </div>
      </template>

      <template v-else>
        <p class="text-micro text-secondaire">{{ quand.jour }} · {{ quand.heure }}</p>
      </template>
    </div>

    <span
      class="grid size-8 shrink-0 place-items-center self-center rounded-full bg-sauge/12 text-sauge-fonce"
      aria-hidden="true"
    >
      <ChevronRight class="size-4" :stroke-width="2.25" />
    </span>
  </article>
</template>
