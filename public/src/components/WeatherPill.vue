<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { computed } from 'vue';
import { useWeather } from '@/composables/useWeather';
import type { Coordinates } from '@/lib/types';

/** Pastille météo du quartier, alimentée par Open-Meteo. */
const props = defineProps<{ coordinates?: Coordinates | null; city: string }>();

const { meteo } = useWeather(computed(() => props.coordinates));
</script>

<template>
  <span
    v-if="meteo"
    class="inline-flex items-center gap-1.5 rounded-full border border-ardoise/10 bg-ardoise/5 py-1.5 pr-2 pl-2.5 text-label-sm text-ardoise"
  >
    <component :is="meteo.icone" class="size-4 shrink-0 text-terracotta" :stroke-width="1.8" />
    <span class="font-medium">{{ meteo.temperature }}°</span>
    <span class="text-secondaire">· {{ meteo.label }} à {{ city }}</span>
    <ChevronDown class="size-3.5 shrink-0 text-ardoise/50" :stroke-width="2" />
  </span>
</template>
