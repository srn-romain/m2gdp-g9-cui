<script setup lang="ts">
import { ChevronDown, MapPin } from '@lucide/vue';

/**
 * Pastille de quartier, réutilisable (en-tête, explorateur).
 * `lg` aligne sa hauteur sur celle des champs de saisie (52 px).
 */
withDefaults(defineProps<{ label: string; size?: 'sm' | 'lg' }>(), { size: 'sm' });
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded-full border border-ardoise/12 bg-surface text-sauge-fonce"
    :class="
      size === 'lg'
        ? 'h-[52px] px-3.5 text-body-sm font-medium'
        : 'py-1.5 pr-2.5 pl-3 text-label-sm'
    "
  >
    <MapPin class="size-4 shrink-0 text-sauge" :stroke-width="2" />
    {{ label }}
    <ChevronDown class="size-3.5 shrink-0 text-sauge/60" :stroke-width="2.25" />
  </span>
</template>
