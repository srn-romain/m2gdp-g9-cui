<script setup lang="ts">
import { House, MessageCircle, Search, User, UtensilsCrossed } from '@lucide/vue';
import { computed, onMounted } from 'vue';
import type { Component } from 'vue';
import { useMeStore } from '@/stores/me';

const meStore = useMeStore();
const locked = computed(() => meStore.profile != null && !meStore.isOnboarded);

onMounted(() => {
  void meStore.load();
});

const items: Array<{ to: string; label: string; icon: Component; exact?: boolean }> = [
  { to: '/', label: 'Accueil', icon: House, exact: true },
  { to: '/explorer', label: 'Explorer', icon: Search },
  { to: '/creer', label: 'Créer', icon: UtensilsCrossed },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/profil', label: 'Profil', icon: User },
];
</script>

<template>
  <nav
    class="tab-bar app-pad sticky bottom-0 z-30 flex items-stretch justify-between gap-1 border-t border-ardoise/10 bg-creme pt-2"
    aria-label="Navigation principale"
  >
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      custom
      v-slot="{ href, navigate, isActive, isExactActive }"
    >
      <a
        :href="href"
        class="flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-nav-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        :class="
          locked && item.to !== '/profil'
            ? 'pointer-events-none opacity-40 text-ardoise'
            : (item.exact ? isExactActive : isActive)
            ? 'text-terracotta'
            : 'text-ardoise hover:text-sauge'
        "
        :aria-current="(item.exact ? isExactActive : isActive) ? 'page' : undefined"
        @click="navigate"
      >
        <component :is="item.icon" class="size-6" :stroke-width="1.75" />
        {{ item.label }}
      </a>
    </RouterLink>
  </nav>
</template>
