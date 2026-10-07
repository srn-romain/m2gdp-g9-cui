<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import BottomNav from '@/components/BottomNav.vue';
import { Toaster } from '@/components/ui/sonner';

const route = useRoute();
/** Barre d'onglets : présente sur les écrans de l'application, absente des parcours d'accès. */
const showTabs = computed(() => route.meta.tabs === true);
</script>

<template>
  <div class="app-frame flex flex-col">
    <main class="flex flex-1 flex-col">
      <RouterView />
    </main>
    <BottomNav v-if="showTabs" />
    <Toaster position="top-center" />
  </div>
</template>
