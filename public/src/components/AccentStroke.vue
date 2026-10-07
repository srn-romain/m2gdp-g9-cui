<script setup lang="ts">
/** Tiret décoratif terracotta qui accompagne les titres dans la maquette. */
withDefaults(defineProps<{ height?: number }>(), { height: 12 });
</script>

<template>
  <svg
    :height="height"
    :width="(height * 20) / 16"
    viewBox="0 0 20 16"
    fill="none"
    stroke="#DB5A3B"
    stroke-width="3"
    stroke-linecap="round"
    aria-hidden="true"
    class="shrink-0"
  >
    <path d="M3 14 L6.5 3" />
    <path d="M11 15 L15.5 5" />
  </svg>
</template>
