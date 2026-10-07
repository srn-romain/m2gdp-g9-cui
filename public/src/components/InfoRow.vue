<script setup lang="ts">
import type { Component } from 'vue';

/** Ligne « icône + valeur + précision » utilisée dans les cartes de tablée. */
defineProps<{ icon: Component; label: string; value?: string | null }>();
</script>

<template>
  <div class="flex items-center gap-2">
    <component :is="icon" class="size-[15px] shrink-0 text-sauge" :stroke-width="1.9" />
    <div class="min-w-0 leading-tight">
      <!-- La maquette serre ces lignes : les métadonnées de carte sont plus petites que body-sm. -->
      <p class="truncate text-[12px] leading-4 text-ardoise">{{ label }}</p>
      <p v-if="value" class="truncate text-[11px] leading-4 text-secondaire">{{ value }}</p>
    </div>
  </div>
</template>
