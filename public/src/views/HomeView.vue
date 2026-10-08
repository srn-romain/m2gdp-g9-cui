<script setup lang="ts">
import { ChevronRight, Search } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import illustration from '@/assets/bonjour.png';
import AccentStroke from '@/components/AccentStroke.vue';
import AppBar from '@/components/AppBar.vue';
import InstallAppCard from '@/components/InstallAppCard.vue';
import LocationPill from '@/components/LocationPill.vue';
import SectionHeading from '@/components/SectionHeading.vue';
import TableCard from '@/components/TableCard.vue';
import WeatherPill from '@/components/WeatherPill.vue';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import { listMyTables } from '@/lib/api';
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
const visibleUpcoming = computed(() =>
  showAllUpcoming.value ? upcoming.value : upcoming.value.slice(0, 2),
);
const visiblePast = computed(() => (showAllPast.value ? past.value : past.value.slice(0, 1)));
/** Sans passé ni à-venir, on présente l'écran vide de la maquette. */
const isEmpty = computed(() => !upcoming.value.length && !past.value.length);
/** Écran vide : la maquette centre le salut et met la mascotte en grand dessous. */
const vueVide = computed(() => isEmpty.value && !loading.value);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [, up, passed] = await Promise.all([
      meStore.load(),
      listMyTables('upcoming', 1, 20),
      listMyTables('past', 1, 20),
    ]);
    upcoming.value = up.data;
    past.value = passed.data;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppBar />

    <!-- Rythme vertical relevé sur la maquette : 24 px entre les blocs, 36 px avant le salut. -->
    <div class="app-pad flex flex-1 flex-col gap-6 pb-6">
      <div class="flex flex-wrap items-center gap-2">
        <LocationPill v-if="neighborhood" :label="neighborhood" />
        <WeatherPill :coordinates="meStore.profile?.coordinates" :city="meStore.profile?.city ?? ''" />
      </div>

      <!-- Salut : centré quand il n'y a rien à montrer ; sinon sur une ligne, avec la
           réserve de largeur de la mascotte (pr) pour qu'un prénom long passe dessous
           au lieu de la percuter. -->
      <div class="relative mt-3">
        <h1
          v-if="vueVide"
          class="flex flex-wrap items-center justify-center gap-2 text-center text-display-lg font-titres text-sauge-fonce"
        >
          Bonjour {{ firstName }}&nbsp;!
          <AccentStroke :height="11" class="mb-1.5" />
        </h1>
        <h1 v-else class="pr-[5.5rem] text-display-lg font-titres text-sauge-fonce">
          <span class="flex items-center gap-2">
            Bonjour {{ firstName }}&nbsp;!
            <AccentStroke :height="11" class="mb-1.5" />
          </span>
        </h1>
        <img
          v-if="!vueVide"
          :src="illustration"
          alt=""
          class="absolute top-1/2 right-0 w-[5.5rem] -translate-y-1/2"
        />
      </div>

      <!-- Chargement -->
      <div v-if="loading" class="flex flex-col gap-3">
        <Skeleton class="h-7 w-32" />
        <Skeleton class="h-32 w-full rounded-2xl" />
        <Skeleton class="h-32 w-full rounded-2xl" />
      </div>

      <!-- Erreur -->
      <Empty v-else-if="error">
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
        <img :src="illustration" alt="" class="mx-auto w-72 max-w-full" />

        <h2
          class="flex flex-wrap items-center justify-center gap-2 text-center text-display-lg font-titres text-sauge-fonce"
        >
          Tu n'as pas encore de tablée.
          <AccentStroke :height="14" />
        </h2>

        <p class="mx-auto mt-1 max-w-[15rem] text-center text-body-lg text-secondaire">
          Trouve un repas à partager près de chez toi.
        </p>

        <Button as-child size="lg" class="mt-6 w-full">
          <RouterLink to="/explorer" class="flex w-full items-center gap-3">
            <Search class="size-5 shrink-0" :stroke-width="2" />
            <span class="flex-1 text-center">Explorer les tablées</span>
            <ChevronRight class="size-5 shrink-0" :stroke-width="2" />
          </RouterLink>
        </Button>
      </template>

      <!-- Liste -->
      <template v-else>
        <section v-if="upcoming.length" class="flex flex-col gap-4">
          <SectionHeading title="À venir">
            <template #action>
              <button
                v-if="upcoming.length >= 2"
                type="button"
                class="flex items-center gap-0.5 text-label-sm text-secondaire"
                @click="showAllUpcoming = !showAllUpcoming"
              >
                {{ showAllUpcoming ? 'Réduire' : `Voir tout (${upcoming.length})` }}
                <ChevronRight class="size-3.5" :stroke-width="2.25" />
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

        <section v-if="past.length" class="flex flex-col gap-4">
          <SectionHeading title="Passées">
            <template #action>
              <button
                v-if="past.length >= 2"
                type="button"
                class="flex items-center gap-0.5 text-label-sm text-secondaire"
                @click="showAllPast = !showAllPast"
              >
                {{ showAllPast ? 'Réduire' : `Voir tout (${past.length})` }}
                <ChevronRight class="size-3.5" :stroke-width="2.25" />
              </button>
            </template>
          </SectionHeading>
          <RouterLink
            v-for="table in visiblePast"
            :key="table.id"
            :to="`/tables/${table.id}`"
            class="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <TableCard :table="table" variant="past" />
          </RouterLink>
        </section>
      </template>

      <InstallAppCard v-if="shouldInvite" dismissible />
    </div>
  </div>
</template>
