<script setup lang="ts">
import { MapPin } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import InstallAppCard from '@/components/InstallAppCard.vue';
import MascotBubble from '@/components/MascotBubble.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import TableCard from '@/components/TableCard.vue';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyTables } from '@/lib/api';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import type { Table } from '@/lib/types';
import { useMeStore } from '@/stores/me';

const meStore = useMeStore();
const { shouldInvite } = useInstallPrompt();
const upcoming = ref<Table[]>([]);
const past = ref<Table[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showAllUpcoming = ref(false);
const showAllPast = ref(false);

const firstName = computed(() => meStore.profile?.firstName ?? '');
const neighborhood = computed(() => meStore.profile?.neighborhood ?? '');
const visibleUpcoming = computed(() => (showAllUpcoming.value ? upcoming.value : upcoming.value.slice(0, 3)));
const visiblePast = computed(() => (showAllPast.value ? past.value : past.value.slice(0, 2)));
/** Sans passé ni à-venir, on présente l'écran vide de la maquette. */
const isEmpty = computed(() => !upcoming.value.length && !past.value.length);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [, up, pa] = await Promise.all([
      meStore.load(),
      listMyTables('upcoming', 1, 20),
      listMyTables('past', 1, 20),
    ]);
    upcoming.value = up.data;
    past.value = pa.data;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppBar>
      <template #right>
        <span
          v-if="neighborhood"
          class="flex items-center gap-1 rounded-full border border-ardoise/12 px-3 py-1.5 text-label-sm text-ardoise"
        >
          <MapPin class="size-3.5 text-terracotta" :stroke-width="2" />
          {{ neighborhood }}
        </span>
      </template>
    </AppBar>

    <div class="app-pad flex flex-1 flex-col gap-5 pb-6">
      <h1 v-if="firstName" class="text-display-lg font-titres text-sauge">
        Bonjour {{ firstName }}&nbsp;!
      </h1>
      <Skeleton v-else class="h-8 w-48" />

      <!-- Chargement -->
      <div v-if="loading" class="flex flex-col gap-3">
        <Skeleton class="h-6 w-24" />
        <Skeleton class="h-28 w-full rounded-2xl" />
        <Skeleton class="h-28 w-full rounded-2xl" />
      </div>

      <!-- Erreur -->
      <Empty v-else-if="error" class="border border-ardoise/10">
        <EmptyHeader>
          <EmptyTitle>Tes tablées ne se sont pas chargées</EmptyTitle>
          <EmptyDescription>{{ error }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="default" @click="$router.go(0)">Réessayer</Button>
        </EmptyContent>
      </Empty>

      <!-- Aucune tablée -->
      <template v-else-if="isEmpty">
        <div class="mt-4 flex justify-center">
          <MascotBubble
            text="Tu n'as pas encore de tablée."
            pose="point"
            layout="stack"
            :size="132"
          />
        </div>
        <p class="text-center text-body-md text-secondaire">
          Trouve un repas à apporter près de chez toi.
        </p>
        <Button as-child size="lg" class="mt-2 w-full">
          <RouterLink to="/explorer">Explorer les tablées</RouterLink>
        </Button>
      </template>

      <!-- Liste -->
      <template v-else>
        <section v-if="upcoming.length" class="flex flex-col gap-3">
          <SectionHeading title="À venir">
            <template #action>
              <button
                v-if="upcoming.length > 3"
                type="button"
                class="text-label-sm text-secondaire underline-offset-4 hover:underline"
                @click="showAllUpcoming = !showAllUpcoming"
              >
                {{ showAllUpcoming ? 'Réduire' : `Voir tout (${upcoming.length})` }}
              </button>
            </template>
          </SectionHeading>
          <RouterLink
            v-for="table in visibleUpcoming"
            :key="table.id"
            :to="`/tables/${table.id}`"
            class="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <TableCard :table="table" />
          </RouterLink>
        </section>

        <section v-if="past.length" class="flex flex-col gap-3">
          <SectionHeading title="Passées">
            <template #action>
              <button
                v-if="past.length > 2"
                type="button"
                class="text-label-sm text-secondaire underline-offset-4 hover:underline"
                @click="showAllPast = !showAllPast"
              >
                {{ showAllPast ? 'Réduire' : `Voir tout (${past.length})` }}
              </button>
            </template>
          </SectionHeading>
          <RouterLink
            v-for="table in visiblePast"
            :key="table.id"
            :to="`/tables/${table.id}`"
            class="rounded-2xl opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <TableCard :table="table" />
          </RouterLink>
        </section>
      </template>

      <InstallAppCard v-if="shouldInvite" dismissible />
    </div>
  </div>
</template>
