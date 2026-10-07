<script setup lang="ts">
import { ChevronDown, MapPin } from '@lucide/vue';

/** Pastille de quartier, réutilisable (en-tête, filtres). */
defineProps<{ label: string }>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full border border-ardoise/12 bg-surface py-1.5 pr-2 pl-3 text-label-sm text-ardoise"
  >
    <MapPin class="size-3.5 shrink-0 text-terracotta" :stroke-width="2" />
    {{ label }}
    <ChevronDown class="size-3.5 shrink-0 text-ardoise/50" :stroke-width="2" />
  </span>
</template>
