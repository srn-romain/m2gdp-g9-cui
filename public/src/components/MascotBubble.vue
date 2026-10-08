<script setup lang="ts">
withDefaults(
  defineProps<{
    text: string;
    /** Illustration de la charte (bonjour.png) : la bulle ne dessine plus de mascotte. */
    image: string;
    size?: number;
    /** `row` : mascotte à gauche, bulle à droite. `stack` : bulle au-dessus. */
    layout?: 'row' | 'stack';
  }>(),
  { size: 88, layout: 'row' },
);
</script>

<template>
  <div
    class="flex gap-3"
    :class="layout === 'stack' ? 'flex-col items-center text-center' : 'flex-row items-end'"
  >
    <img
      :src="image"
      alt=""
      class="shrink-0 object-contain"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
    <div
      class="relative max-w-[15rem] rounded-2xl border border-ardoise/10 bg-creme px-4 py-3 text-title-md font-titres text-sauge shadow-[0_2px_10px_rgba(43,43,43,.06)]"
    >
      <span
        class="absolute size-3 rotate-45 border-ardoise/10 bg-creme"
        :class="
          layout === 'stack'
            ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-b border-r'
            : '-left-1.5 bottom-5 border-b border-l'
        "
        aria-hidden="true"
      />
      {{ text }}
    </div>
  </div>
</template>
