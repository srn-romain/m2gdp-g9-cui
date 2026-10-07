<script setup lang="ts">
import { computed } from 'vue';

/**
 * Mascotte de la marque, redessinée en vectoriel aux couleurs de la charte
 * (le fichier source n'existe qu'aplat dans la maquette).
 */
const props = withDefaults(
  defineProps<{
    pose?: 'wave' | 'idle' | 'point' | 'cheer' | 'think';
    size?: number;
    /** Le petit compagnon qui suit la mascotte sur les écrans vides. */
    withBuddy?: boolean;
  }>(),
  { pose: 'idle', size: 120, withBuddy: false },
);

const arms = computed(() => {
  switch (props.pose) {
    case 'wave':
      return { left: 'M31,68 C22,64 18,56 20,46', right: 'M89,66 C99,58 100,46 96,38' };
    case 'cheer':
      return { left: 'M30,62 C20,50 20,40 24,32', right: 'M90,62 C100,50 100,40 96,32' };
    case 'point':
      return { left: 'M31,72 C24,76 21,82 22,88', right: 'M89,68 C100,66 108,62 113,57' };
    case 'think':
      return { left: 'M31,70 C23,72 19,78 20,85', right: 'M89,70 C95,64 95,56 92,50' };
    default:
      return { left: 'M31,70 C23,74 20,80 21,87', right: 'M89,70 C97,74 100,80 99,87' };
  }
});
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    role="img"
    aria-label="Mascotte de La Bonne Tablée"
    class="shrink-0"
  >
    <ellipse cx="60" cy="108" rx="30" ry="5" fill="rgba(43,43,43,.08)" />

    <!-- Toque -->
    <g fill="#FAF7F2">
      <circle cx="41" cy="22" r="14" />
      <circle cx="60" cy="15" r="16" />
      <circle cx="79" cy="22" r="14" />
    </g>
    <path
      d="M27 34 A15 15 0 0 1 45 10 A17 17 0 0 1 75 10 A15 15 0 0 1 93 34"
      fill="none"
      stroke="#2B2B2B"
      stroke-width="3"
      stroke-linecap="round"
    />
    <rect x="27" y="29" width="66" height="14" rx="7" fill="#FAF7F2" stroke="#2B2B2B" stroke-width="3" />

    <!-- Corps -->
    <path
      d="M60 38 C79 38 93 53 93 72 C93 91 79 105 60 105 C41 105 27 91 27 72 C27 53 41 38 60 38 Z"
      fill="#DB5A3B"
      stroke="#2B2B2B"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <!-- Reflet -->
    <path
      d="M45 52 C40 58 38 66 39 74"
      fill="none"
      stroke="rgba(250,247,242,.45)"
      stroke-width="4"
      stroke-linecap="round"
    />

    <!-- Visage -->
    <ellipse cx="41" cy="78" rx="6" ry="4" fill="rgba(250,247,242,.35)" />
    <ellipse cx="79" cy="78" rx="6" ry="4" fill="rgba(250,247,242,.35)" />
    <circle cx="50" cy="68" r="3.2" fill="#2B2B2B" />
    <circle cx="70" cy="68" r="3.2" fill="#2B2B2B" />
    <path
      d="M53 79 C56 83 64 83 67 79"
      fill="none"
      stroke="#2B2B2B"
      stroke-width="3"
      stroke-linecap="round"
    />

    <!-- Bras -->
    <path :d="arms.left" fill="none" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round" />
    <path :d="arms.right" fill="none" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round" />

    <!-- Jambes -->
    <path d="M50 104 L49 111" fill="none" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round" />
    <path d="M70 104 L71 111" fill="none" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round" />

    <g v-if="withBuddy">
      <circle cx="103" cy="104" r="9" fill="#5B8266" stroke="#2B2B2B" stroke-width="3" />
      <circle cx="100.5" cy="102" r="1.6" fill="#2B2B2B" />
      <circle cx="105.5" cy="102" r="1.6" fill="#2B2B2B" />
      <path d="M108 105 L113 107 L108 109 Z" fill="#DB5A3B" stroke="#2B2B2B" stroke-width="2" stroke-linejoin="round" />
    </g>
  </svg>
</template>
