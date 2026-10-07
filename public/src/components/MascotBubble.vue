<script setup lang="ts">
import Mascot from './Mascot.vue';

withDefaults(
  defineProps<{
    text: string;
    pose?: 'wave' | 'idle' | 'point' | 'cheer' | 'think';
    size?: number;
    /** `row` : mascotte à gauche, bulle à droite. `stack` : bulle au-dessus. */
    layout?: 'row' | 'stack';
    /** Illustration des assets à utiliser à la place de la mascotte vectorielle. */
    image?: string;
  }>(),
  { pose: 'idle', size: 88, layout: 'row' },
);
</script>

<template>
  <div
    class="flex gap-3"
    :class="layout === 'stack' ? 'flex-col items-center text-center' : 'flex-row items-end'"
  >
    <img
      v-if="image"
      :src="image"
      alt=""
      class="shrink-0 object-contain"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
    <Mascot v-else :pose="pose" :size="size" with-buddy />
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
