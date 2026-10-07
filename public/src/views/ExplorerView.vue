<script setup lang="ts">
import { MapPin, Search, SlidersHorizontal, X } from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import AppBar from '@/components/AppBar.vue';
import MascotBubble from '@/components/MascotBubble.vue';
import TableCard from '@/components/TableCard.vue';
import TableRow from '@/components/TableRow.vue';
import TablesMap from '@/components/TablesMap.vue';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { listTables } from '@/lib/api';
import { tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';
import { usePosition } from '@/composables/usePosition';
import { useMeStore } from '@/stores/me';
import { cn } from '@/lib/utils';

const RADIUS_OPTIONS = [1, 2, 5, 10, 20];

const meStore = useMeStore();
const position = usePosition();

const query = ref('');
const tonight = ref(false);
const vegetarian = ref(false);
const radiusKm = ref(2);
const radiusOpen = ref(false);
const view = ref<'liste' | 'carte'>('liste');
const selectedId = ref<string | null>(null);

const tables = ref<Table[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

const center = computed(() => ({
  lat: position.latitude.value ?? 45.7485,
  lng: position.longitude.value ?? 4.8467,
}));

const selected = computed(() => tables.value.find((t) => t.id === selectedId.value) ?? null);
const hasFilters = computed(() => tonight.value || vegetarian.value || query.value.trim().length > 1);

function tonightWindow(): { startsAfter?: string; startsBefore?: string } {
  if (!tonight.value) return {};
  const now = new Date();
  const start = new Date(now);
  start.setHours(18, 0, 0, 0);
  if (start < now) start.setTime(now.getTime() + 15 * 60_000);
  const end = new Date(now);
  end.setHours(2, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return { startsAfter: start.toISOString(), startsBefore: end.toISOString() };
}

async function ensurePosition() {
  if (position.latitude.value != null) return;
  await meStore.load();
  position.set(meStore.profile?.coordinates);
  if (position.latitude.value == null) await position.locate();
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    await ensurePosition();
    const page = await listTables({
      lat: position.latitude.value ?? undefined,
      lng: position.longitude.value ?? undefined,
      radiusKm: radiusKm.value,
      vegetarianOnly: vegetarian.value || undefined,
      query: query.value.trim().length > 1 ? query.value.trim() : undefined,
      sortBy: 'distance',
      page: 1,
      pageSize: 20,
      ...tonightWindow(),
    });
    tables.value = page.data;
    total.value = page.pagination.totalItems;
    if (!page.data.some((t) => t.id === selectedId.value)) selectedId.value = page.data[0]?.id ?? null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Recherche impossible.';
    tables.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(query, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void load(), 400);
});
watch([tonight, vegetarian, radiusKm], () => void load());
watch(radiusOpen, (open) => { if (!open) void load(); });

onMounted(load);
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppBar>
      <template #right>
        <button
          type="button"
          class="grid size-10 place-items-center rounded-full border border-ardoise/12 text-ardoise hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          aria-label="Choisir le rayon de recherche"
          @click="radiusOpen = true"
        >
          <SlidersHorizontal class="size-5" :stroke-width="1.75" />
        </button>
      </template>
    </AppBar>

    <div class="app-pad flex flex-1 flex-col gap-3 pb-6">
      <InputGroup
        class="h-12 rounded-xl border-ardoise/12 bg-creme"
        :class="view === 'carte' ? 'order-none' : ''"
      >
        <InputGroupAddon align="inline-start">
          <Search class="size-4 text-secondaire" />
        </InputGroupAddon>
        <InputGroupInput
          v-model="query"
          type="search"
          placeholder="Rechercher une tablée"
          aria-label="Rechercher une tablée"
          class="text-body-md"
        />
      </InputGroup>

      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          class="shrink-0 rounded-full border px-3 py-1.5 text-label-md transition-colors"
          :class="
            tonight
              ? 'border-terracotta bg-terracotta text-creme'
              : 'border-ardoise/15 bg-creme text-ardoise hover:bg-ardoise/5'
          "
          :aria-pressed="tonight"
          @click="tonight = !tonight"
        >
          Ce soir
        </button>
        <button
          type="button"
          class="shrink-0 rounded-full border px-3 py-1.5 text-label-md transition-colors"
          :class="
            vegetarian
              ? 'border-terracotta bg-terracotta text-creme'
              : 'border-ardoise/15 bg-creme text-ardoise hover:bg-ardoise/5'
          "
          :aria-pressed="vegetarian"
          @click="vegetarian = !vegetarian"
        >
          Végétarien
        </button>
        <button
          type="button"
          class="flex shrink-0 items-center gap-1 rounded-full border border-ardoise/15 bg-creme px-3 py-1.5 text-label-md text-ardoise hover:bg-ardoise/5"
          @click="radiusOpen = true"
        >
          {{ radiusKm }} km
        </button>
      </div>

      <div v-if="loading" class="flex flex-col gap-3">
        <Skeleton class="h-6 w-52" />
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="h-24 w-full rounded-2xl" />
      </div>

      <Empty v-else-if="error" class="border border-ardoise/10">
        <EmptyHeader>
          <EmptyTitle>La recherche a échoué</EmptyTitle>
          <EmptyDescription>{{ error }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="default" @click="load">Réessayer</Button>
        </EmptyContent>
      </Empty>

      <template v-else>
        <div class="flex items-center justify-between gap-3">
          <h2 class="min-w-0 text-title-md font-titres text-sauge">
            {{ total }} {{ total > 1 ? 'tablées' : 'tablée' }} autour de vous
          </h2>
          <div class="flex shrink-0 items-center gap-1 rounded-full border border-ardoise/12 p-1">
            <button
              type="button"
              class="rounded-full px-3 py-1 text-label-sm transition-colors"
              :class="view === 'liste' ? 'bg-ardoise/8 text-ardoise' : 'text-secondaire'"
              :aria-pressed="view === 'liste'"
              @click="view = 'liste'"
            >
              Liste
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1 text-label-sm transition-colors"
              :class="view === 'carte' ? 'bg-ardoise/8 text-ardoise' : 'text-secondaire'"
              :aria-pressed="view === 'carte'"
              @click="view = 'carte'"
            >
              Carte
            </button>
          </div>
        </div>

        <template v-if="view === 'liste'">
        <Empty v-if="!tables.length" class="border border-ardoise/10">
          <EmptyHeader>
            <EmptyTitle>Aucune tablée par ici</EmptyTitle>
            <EmptyDescription>
              {{
                hasFilters
                  ? 'Élargis le rayon ou retire un filtre pour voir plus de tablées.'
                  : 'Aucune tablée ouverte dans ton quartier pour le moment.'
              }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              v-if="hasFilters"
              variant="secondary"
              size="default"
              @click="((tonight = false), (vegetarian = false), (query = ''), (radiusKm = 5))"
            >
              <X data-icon="inline-start" />
              Retirer les filtres
            </Button>
          </EmptyContent>
        </Empty>

        <div v-else class="flex flex-col gap-3">
          <RouterLink
            v-for="table in tables"
            :key="table.id"
            :to="`/tables/${table.id}`"
            class="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <TableRow :table="table" />
          </RouterLink>
        </div>

        <div class="mt-2 flex justify-center">
          <MascotBubble text="Utilise les filtres pour trouver ta tablée." pose="point" :size="92" />
        </div>
        </template>

        <template v-else>
        <div class="relative -mx-1 min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-ardoise/10">
          <TablesMap
            :tables="tables"
            :center="center"
            :selected-id="selectedId"
            @select="selectedId = $event"
          />
          <p
            v-if="position.locating.value"
            class="absolute left-3 top-3 rounded-full bg-creme/95 px-3 py-1 text-micro text-secondaire"
          >
            Localisation en cours…
          </p>
        </div>

        <div v-if="selected" class="flex flex-col gap-3">
          <TableCard :table="selected" />
          <Button as-child size="lg" class="w-full">
            <RouterLink :to="`/tables/${selected.id}`">Voir la tablée</RouterLink>
          </Button>
        </div>
        <p v-else class="text-center text-body-sm text-secondaire">
          Aucune tablée à afficher sur la carte.
        </p>
        </template>
      </template>
    </div>

    <Drawer v-model:open="radiusOpen">
      <DrawerContent class="bg-creme">
        <DrawerHeader class="app-pad text-left">
          <DrawerTitle class="text-title-lg font-titres text-sauge">Rayon de recherche</DrawerTitle>
        </DrawerHeader>
        <div class="app-pad flex flex-col gap-2 pb-8">
          <button
            v-for="option in RADIUS_OPTIONS"
            :key="option"
            type="button"
            class="flex items-center justify-between rounded-xl border px-4 py-3 text-body-md transition-colors"
            :class="
              cn(
                'border-ardoise/12',
                radiusKm === option ? 'bg-sauge/12 text-sauge-fonce' : 'bg-creme text-ardoise hover:bg-ardoise/5',
              )
            "
            @click="((radiusKm = option), (radiusOpen = false))"
          >
            {{ option }} km
            <MapPin v-if="radiusKm === option" class="size-4" :stroke-width="2.25" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  </div>
</template>
