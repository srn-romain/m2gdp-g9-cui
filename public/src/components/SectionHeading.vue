<script setup lang="ts">
import AccentStroke from './AccentStroke.vue';

defineProps<{ title: string }>();
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <h2 class="flex items-center gap-2">
      <span class="text-title-lg font-titres text-sauge-fonce">{{ title }}</span>
      <AccentStroke :height="14" class="mb-1" />
    </h2>
    <slot name="action" />
  </div>
</template>
