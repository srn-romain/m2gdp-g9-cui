<script setup lang="ts">
import { ChevronDown, ChevronRight, ChevronUp, TriangleAlert } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import illustration from '@/assets/bonjour.png';
import AccentStroke from '@/components/AccentStroke.vue';
import AppBar from '@/components/AppBar.vue';
import DishPhoto from '@/components/DishPhoto.vue';
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
import { listMyTables, listTables } from '@/lib/api';
import { formatDistance, tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';
import { useMeStore } from '@/stores/me';

const meStore = useMeStore();
const { shouldInvite } = useInstallPrompt();

const upcoming = ref<Table[]>([]);
const past = ref<Table[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showAllPast = ref(false);
const proches = ref<Table[]>([]);

const firstName = computed(() => meStore.profile?.firstName ?? '');
const neighborhood = computed(() => meStore.profile?.neighborhood ?? '');
const profilIncomplet = computed(() => meStore.profile != null && !meStore.isOnboarded);
const visibleUpcoming = computed(() =>
  upcoming.value.slice(0, 2),
);
const visiblePast = computed(() => (showAllPast.value ? past.value : past.value.slice(0, 1)));
/** Sans passé ni à-venir, on présente l'écran vide de la maquette. */
const isEmpty = computed(() => !upcoming.value.length && !past.value.length);

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
    // Suggestions : de vraies tablées proches du quartier de l'utilisateur.
    const coords = meStore.profile?.coordinates;
    if (coords) {
      try {
        const page = await listTables({
          lat: coords.latitude,
          lng: coords.longitude,
          radiusKm: 5,
          sortBy: 'distance',
          page: 1,
          pageSize: 10,
        });
        proches.value = page.data;
      } catch {
        proches.value = [];
      }
    }
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
      <RouterLink
        v-if="!meStore.isOnboarded"
        to="/profil"
        class="flex items-start gap-2 rounded-2xl border border-terracotta/30 bg-terracotta/10 p-3"
      >
        <TriangleAlert class="mt-0.5 size-5 shrink-0 text-terracotta" :stroke-width="1.75" />
        <span class="flex-1 text-body-sm text-ardoise">
          <span class="font-semibold">Complète ton profil.</span>
          Renseigne ton prénom, ton nom et ton adresse pour créer ou rejoindre une tablée.
        </span>
        <ChevronRight class="size-4 shrink-0 text-terracotta" />
      </RouterLink>

      <div class="flex flex-wrap items-center gap-2">
        <LocationPill v-if="neighborhood" :label="neighborhood" />
        <WeatherPill :coordinates="meStore.profile?.coordinates" :city="meStore.profile?.city ?? ''" />
      </div>

      <!-- Salut : toujours sur une ligne, avec la réserve de largeur de la mascotte
           (pr) pour qu'un prénom long passe dessous au lieu de la percuter. -->
      <div class="relative mt-3">
        <h1 class="pr-[5.5rem] text-display-lg font-titres text-sauge-fonce">
          <span class="flex items-center gap-2">
            Bonjour {{ firstName }}&nbsp;!
            <AccentStroke :height="11" class="mb-1.5" />
          </span>
        </h1>
        <img
          :src="illustration"
          alt=""
          class="absolute top-1/2 right-0 w-[5.5rem] -translate-y-1/2"
        />
      </div>

      <!-- Suggestions : de vraies tablées proches du quartier -->
      <div v-if="loading || proches.length" class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-body-lg-strong text-ardoise">Autour de chez toi</h2>
          <RouterLink
            to="/autour"
            class="text-label-sm font-medium text-sauge-fonce underline-offset-4 hover:underline"
          >
            Voir tout
          </RouterLink>
        </div>
        <div class="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
          <template v-if="loading">
            <Skeleton v-for="i in 3" :key="i" class="h-48 w-44 shrink-0 rounded-2xl" />
          </template>
          <template v-else>
            <RouterLink
              v-for="table in proches"
              :key="table.id"
              :to="`/tables/${table.id}`"
              class="w-44 shrink-0 rounded-2xl border border-ardoise/10 bg-surface p-2 transition-colors hover:bg-ardoise/5"
            >
              <DishPhoto :dish-name="table.dishName" :image-url="table.dishImageUrl" :size="160" />
              <span class="mt-2 block truncate font-titres text-sauge-fonce">{{ tableTitle(table) }}</span>
              <span class="mt-1 block truncate text-micro text-secondaire">
                {{ table.location.neighborhood }} · {{ formatDistance(table.distanceMeters) }}
              </span>
            </RouterLink>
          </template>
        </div>
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
          <RouterLink :to="profilIncomplet ? '/profil' : '/explorer'" class="flex w-full items-center gap-3">
            <span class="flex-1 text-center">
              {{ profilIncomplet ? 'Compléter mon profil' : 'Explorer les tablées' }}
            </span>
            <ChevronRight class="size-5 shrink-0" :stroke-width="2" />
          </RouterLink>
        </Button>
      </template>

      <!-- Liste -->
      <template v-else>
        <section v-if="upcoming.length" class="flex flex-col gap-4">
          <SectionHeading title="À venir">
            <template #action>
              <RouterLink to="/avenir" class="flex items-center gap-0.5 text-label-sm text-secondaire">
                Voir tout ({{ upcoming.length }})
                <ChevronRight class="size-3.5" :stroke-width="2.25" />
              </RouterLink>
            </template>
          </SectionHeading>
          <RouterLink
            v-for="table in visibleUpcoming"
            :key="table.id"
            :to="`/tables/${table.id}`"
            class="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <span
              class="mb-1 inline-block rounded-full px-2 py-0.5 text-micro font-semibold"
              :class="table.myParticipation?.role === 'HOST' ? 'bg-terracotta/12 text-terracotta' : 'bg-sauge/12 text-sauge-fonce'"
            >
              {{ table.myParticipation?.role === 'HOST' ? 'J’organise' : 'Je participe' }}
            </span>
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
                <ChevronDown v-if="!showAllPast" class="size-3.5" :stroke-width="2.25" />
                <ChevronUp v-else class="size-3.5" :stroke-width="2.25" />
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
