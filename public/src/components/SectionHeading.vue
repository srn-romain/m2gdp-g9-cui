<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <div class="flex items-baseline justify-between gap-3">
    <h2 class="text-title-lg font-titres text-sauge">{{ title }}</h2>
    <slot name="action" />
  </div>
</template>
