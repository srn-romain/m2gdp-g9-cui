<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import { useRouter } from 'vue-router';
import logo from '@/assets/la-bonne-tablee-horizontal.png';

withDefaults(
  defineProps<{
    title?: string;
    back?: boolean;
    /** Route de repli quand l'historique est vide (lien ouvert directement). */
    backTo?: string;
    /** En-tête réduit au bouton retour, sans titre de marque. */
    plain?: boolean;
  }>(),
  { back: false, backTo: '/', plain: false },
);

const router = useRouter();

function goBack(fallback: string) {
  if (window.history.length > 1) router.back();
  else void router.push(fallback);
}
</script>

<template>
  <header class="app-pad sticky top-0 z-30 flex items-center gap-2 bg-creme py-5">
    <button
      v-if="back"
      type="button"
      class="grid size-10 shrink-0 place-items-center rounded-full border border-ardoise/12 bg-creme text-ardoise transition-colors hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      aria-label="Revenir en arrière"
      @click="goBack(backTo)"
    >
      <ArrowLeft class="size-5" />
    </button>

    <h1 v-if="title" class="min-w-0 flex-1 truncate text-title-lg font-titres text-sauge">
      {{ title }}
    </h1>
    <RouterLink v-else to="/" :class="plain ? 'sr-only' : 'flex min-w-0 flex-1 items-center'">
      <img :src="logo" alt="La Bonne Tablée" class="h-5 w-auto" />
    </RouterLink>

    <slot name="right" />
  </header>
</template>
