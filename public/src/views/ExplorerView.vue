<script setup lang="ts">
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Leaf,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from '@lucide/vue';
import { computed, onMounted, ref, watch } from 'vue';
import illustration from '@/assets/bonjour.png';
import AppBar from '@/components/AppBar.vue';
import DishPhoto from '@/components/DishPhoto.vue';
import LocationPill from '@/components/LocationPill.vue';
import MascotBubble from '@/components/MascotBubble.vue';
import TableRow from '@/components/TableRow.vue';
import TablesMap from '@/components/TablesMap.vue';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePosition } from '@/composables/usePosition';
import { listTables, suggestTables } from '@/lib/api';
import {
  DIETARY_OPTIONS,
  formatDay,
  formatSeatsCourt,
  formatTime,
  tableTitle,
} from '@/lib/format';
import type { DietaryPreference, Table } from '@/lib/types';
import { useMeStore } from '@/stores/me';

const RAYONS = [1, 2, 5, 10, 20];
const RAYON_DEFAUT = 2;

/** Champ de saisie arrondi, aligné sur la maquette de recherche. */
const CHAMP = 'h-[52px] rounded-full border-ardoise/10 bg-surface';

const meStore = useMeStore();
const position = usePosition();

const q = ref('');
const ceSoir = ref(false);
const regimes = ref<DietaryPreference[]>([]);
const radiusKm = ref(RAYON_DEFAUT);
const filtresOuverts = ref(false);
const view = ref<'liste' | 'carte'>('liste');
const selectedId = ref<string | null>(null);
const suggestions = ref<Array<{ type: 'plat' | 'quartier' | 'ville'; value: string }>>([]);
const suggestionsOuvertes = ref(false);

const tables = ref<Table[]>([]);
const total = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);

const quartier = computed(() => meStore.profile?.neighborhood ?? '');
const center = computed(() => ({
  lat: position.latitude.value ?? 45.7485,
  lng: position.longitude.value ?? 4.8467,
}));
const selected = computed(() => tables.value.find((t) => t.id === selectedId.value) ?? null);
const vegetarien = computed(() => regimes.value.includes('VEGETARIAN'));
const aDesFiltres = computed(
  () => ceSoir.value || regimes.value.length > 0 || q.value.trim().length > 1,
);
const nbFiltres = computed(
  () => regimes.value.length + (ceSoir.value ? 1 : 0) + (radiusKm.value !== RAYON_DEFAUT ? 1 : 0),
);
const compteTables = computed(() => `${total.value} ${total.value > 1 ? 'tablées' : 'tablée'}`);

/** Suggestion du moment : un plat de saison, ignorable et cliquable. */
const suggestionSaison = computed(() => {
  const mois = new Date().getMonth();
  if (mois >= 2 && mois <= 4) return 'Ratatouille';
  if (mois >= 5 && mois <= 7) return 'Salade estivale';
  if (mois >= 8 && mois <= 10) return 'Soupe de potiron';
  return 'Tartiflette';
});

/** « Ce soir » : de 18 h à 2 h du matin. */
function fenetreCeSoir(): { startsAfter?: string; startsBefore?: string } {
  if (!ceSoir.value) return {};
  const maintenant = new Date();
  const debut = new Date(maintenant);
  debut.setHours(18, 0, 0, 0);
  if (debut < maintenant) debut.setTime(maintenant.getTime() + 15 * 60_000);
  const fin = new Date(maintenant);
  fin.setHours(2, 0, 0, 0);
  fin.setDate(fin.getDate() + 1);
  return { startsAfter: debut.toISOString(), startsBefore: fin.toISOString() };
}

async function ensurePosition() {
  if (position.latitude.value != null) return;
  await meStore.load();
  position.set(meStore.profile?.coordinates);
  if (position.latitude.value == null) {
    // La géolocalisation ne bloque pas le premier rendu : on recharge à la résolution.
    void position.locate().then((coords) => {
      if (coords) void load();
    });
  }
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    await ensurePosition();
    // Sans point de départ connu (géolocalisation refusée, profil incomplet),
    // on ne peut pas trier par distance : on trie par date.
    const aUnePosition = position.latitude.value != null && position.longitude.value != null;
    const page = await listTables({
      lat: aUnePosition ? position.latitude.value! : undefined,
      lng: aUnePosition ? position.longitude.value! : undefined,
      radiusKm: radiusKm.value,
      dietary: regimes.value.length ? regimes.value : undefined,
      query: q.value.trim().length > 1 ? q.value.trim() : undefined,
      sortBy: aUnePosition ? 'distance' : 'startsAt',
      page: 1,
      pageSize: 20,
      ...fenetreCeSoir(),
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

function basculerRegime(valeur: DietaryPreference) {
  const ensemble = new Set(regimes.value);
  if (ensemble.has(valeur)) ensemble.delete(valeur);
  else ensemble.add(valeur);
  regimes.value = [...ensemble];
}

function retirerFiltres() {
  ceSoir.value = false;
  regimes.value = [];
  q.value = '';
  radiusKm.value = RAYON_DEFAUT;
}

let minuteur: ReturnType<typeof setTimeout> | undefined;
watch(q, () => {
  clearTimeout(minuteur);
  minuteur = setTimeout(() => void load(), 400);
});
watch([ceSoir, regimes, radiusKm], () => void load(), { deep: true });

let minuteurSuggestion: ReturnType<typeof setTimeout> | undefined;

async function chargerSuggestions() {
  const texte = q.value.trim();
  if (texte.length < 2) {
    suggestions.value = [];
    suggestionsOuvertes.value = false;
    return;
  }
  try {
    const resultat = await suggestTables(texte);
    suggestions.value = [
      ...resultat.dishes.map((value) => ({ type: 'plat' as const, value })),
      ...resultat.neighborhoods.map((value) => ({ type: 'quartier' as const, value })),
      ...resultat.cities.map((value) => ({ type: 'ville' as const, value })),
    ];
    suggestionsOuvertes.value = suggestions.value.length > 0;
  } catch {
    suggestions.value = [];
    suggestionsOuvertes.value = false;
  }
}

function choisirSuggestion(suggestion: { type: 'plat' | 'quartier' | 'ville'; value: string }) {
  q.value = suggestion.value;
  suggestionsOuvertes.value = false;
}

watch(q, () => {
  clearTimeout(minuteurSuggestion);
  minuteurSuggestion = setTimeout(() => void chargerSuggestions(), 250);
});

onMounted(load);
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppBar />

    <!-- `pt-3` : la maquette laisse respirer la barre de recherche sous le titre. -->
    <div class="app-pad flex flex-1 flex-col gap-3 pt-3 pb-6">
      <!-- Recherche + quartier (liste) ou bouton de filtres (carte). -->
      <div class="sticky top-[60px] z-20 -mx-5 flex items-center gap-2 bg-creme px-5 pb-2">
        <div class="relative min-w-0 flex-1">
          <InputGroup :class="CHAMP" class="w-full">
            <InputGroupAddon align="inline-start">
              <Search class="size-4 text-sauge" :stroke-width="1.9" />
            </InputGroupAddon>
            <InputGroupInput
              v-model="q"
              type="search"
              placeholder="Rechercher une tablée"
              aria-label="Rechercher une tablée"
              class="text-body-sm"
            />
            <InputGroupAddon v-if="q" align="inline-end">
              <button
                type="button"
                class="grid size-6 place-items-center rounded-full text-ardoise/60"
                aria-label="Effacer la recherche"
                @click="q = ''"
              >
                <X class="size-4" :stroke-width="2" />
              </button>
            </InputGroupAddon>
          </InputGroup>

          <div
            v-if="suggestionsOuvertes && suggestions.length"
            class="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-ardoise/10 bg-surface shadow-[0_8px_24px_rgba(43,43,43,.14)]"
          >
            <button
              v-for="(suggestion, index) in suggestions"
              :key="index"
              type="button"
              class="flex w-full items-center gap-2 px-4 py-2.5 text-body-md text-ardoise transition-colors hover:bg-ardoise/5"
              @click="choisirSuggestion(suggestion)"
            >
              <Search class="size-4 shrink-0 text-sauge" :stroke-width="1.9" />
              <span class="min-w-0 flex-1 truncate text-left">{{ suggestion.value }}</span>
              <span class="shrink-0 text-micro uppercase tracking-wide text-secondaire">{{ suggestion.type }}</span>
            </button>
          </div>
        </div>

        <LocationPill v-if="view === 'liste' && quartier" size="lg" :label="quartier" />
        <button
          v-else
          type="button"
          class="relative grid size-[52px] shrink-0 place-items-center rounded-full border border-ardoise/10 bg-surface text-sauge"
          aria-label="Filtrer les tablées"
          @click="filtresOuverts = true"
        >
          <SlidersHorizontal class="size-5" :stroke-width="1.9" />
          <span
            v-if="nbFiltres"
            class="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-terracotta text-[10px] font-bold text-creme"
          >
            {{ nbFiltres }}
          </span>
        </button>
      </div>

      <!-- Filtres rapides : créneau, régime et rayon. Les pastilles se partagent
           toute la largeur disponible, comme sur la maquette. -->
      <div v-if="view === 'liste'" class="flex flex-wrap items-stretch gap-2">
        <button
          type="button"
          class="flex grow items-center justify-center gap-1.5 rounded-full bg-terracotta/10 px-3 py-2.5 text-label-sm text-terracotta transition-colors"
          aria-label="Appliquer la suggestion de saison"
          @click="q = suggestionSaison"
        >
          <span aria-hidden="true">🍂</span>
          {{ suggestionSaison }}
        </button>
        <button
          type="button"
          class="flex grow items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-label-sm transition-colors"
          :class="ceSoir ? 'bg-sauge text-creme' : 'bg-sauge/10 text-sauge-fonce'"
          :aria-pressed="ceSoir"
          @click="ceSoir = !ceSoir"
        >
          <CalendarDays class="size-3.5" :class="ceSoir ? 'text-creme' : 'text-sauge'" :stroke-width="2" />
          Ce soir
          <ChevronDown
            class="size-3"
            :class="ceSoir ? 'text-creme' : 'text-sauge/70'"
            :stroke-width="2.5"
          />
        </button>

        <button
          type="button"
          class="flex grow items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-label-sm transition-colors"
          :class="vegetarien ? 'bg-sauge text-creme' : 'bg-sauge/10 text-sauge-fonce'"
          :aria-pressed="vegetarien"
          @click="basculerRegime('VEGETARIAN')"
        >
          <Leaf class="size-3.5" :class="vegetarien ? 'text-creme' : 'text-sauge'" :stroke-width="2" />
          Végétarien
        </button>

        <button
          type="button"
          class="flex grow items-center justify-center gap-1.5 rounded-full bg-sauge/10 px-3 py-2.5 text-label-sm text-sauge-fonce transition-colors"
          :aria-label="`Filtrer dans un rayon de ${radiusKm} km`"
          @click="filtresOuverts = true"
        >
          <MapPin class="size-3.5 text-sauge" :stroke-width="2" />
          &lt; {{ radiusKm }} km
        </button>
      </div>

      <!-- Bascule Carte / Liste, pleine largeur comme la maquette. -->
      <div class="grid grid-cols-2 gap-1 rounded-full bg-ardoise/5 p-1">
        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-full py-2 text-button-md transition-colors"
          :class="view === 'carte' ? 'bg-terracotta text-creme' : 'text-ardoise'"
          :aria-pressed="view === 'carte'"
          @click="view = 'carte'"
        >
          <MapIcon class="size-4" :stroke-width="2" />
          Carte
        </button>
        <button
          type="button"
          class="flex items-center justify-center gap-2 rounded-full py-2 text-button-md transition-colors"
          :class="view === 'liste' ? 'bg-terracotta text-creme' : 'text-ardoise'"
          :aria-pressed="view === 'liste'"
          @click="view = 'liste'"
        >
          <ListIcon class="size-4" :stroke-width="2" />
          Liste
        </button>
      </div>

      <div v-if="loading" class="flex flex-col gap-3">
        <Skeleton class="h-24 w-full rounded-2xl" />
        <Skeleton class="h-32 w-full rounded-2xl" />
        <Skeleton class="h-32 w-full rounded-2xl" />
      </div>

      <Empty v-else-if="error">
        <EmptyHeader>
          <EmptyTitle>La recherche a échoué</EmptyTitle>
          <EmptyDescription>{{ error }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="default" @click="load">Réessayer</Button>
        </EmptyContent>
      </Empty>

      <!-- Liste -->
      <template v-else-if="view === 'liste'">
        <button
          v-if="total > 0"
          type="button"
          class="relative min-h-[104px] overflow-hidden rounded-2xl bg-sauge/12 p-4 text-left"
          aria-label="Afficher les tablées sur la carte"
          @click="view = 'carte'"
        >
          <svg
            class="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 335 104"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <path d="M-10 24 L140 6" stroke="#ffffff" stroke-width="7" stroke-opacity=".85" />
            <path d="M-10 84 L200 100" stroke="#ffffff" stroke-width="7" stroke-opacity=".85" />
            <path d="M206 -10 L176 114" stroke="#ffffff" stroke-width="6" stroke-opacity=".8" />
            <path d="M300 -10 L268 114" stroke="#ffffff" stroke-width="6" stroke-opacity=".8" />
            <path d="M208 8 h44 v26 h-44 z" fill="#cfe0c8" fill-opacity=".55" />
            <path d="M272 60 h48 v30 h-48 z" fill="#cfe0c8" fill-opacity=".55" />
            <path
              d="M42 112 C 62 76, 92 62, 128 -12"
              stroke="#bcd8e6"
              stroke-width="12"
              stroke-linecap="round"
            />
            <circle cx="252" cy="48" r="28" fill="#db5a3b" fill-opacity=".12" />
            <path
              d="M252 26 c-8 0 -14 6 -14 14 c0 10 14 24 14 24 s14 -14 14 -24 c0 -8 -6 -14 -14 -14 z"
              fill="#db5a3b"
            />
            <circle cx="252" cy="40" r="5" fill="#faf7f2" />
            <circle cx="150" cy="72" r="5" fill="#db5a3b" />
            <circle cx="212" cy="18" r="5" fill="#db5a3b" />
            <circle cx="312" cy="40" r="5" fill="#db5a3b" />
          </svg>

          <p class="relative max-w-[64%] font-titres text-title-md text-sauge-fonce">
            <span class="relative inline-block">
              {{ compteTables }}
              <svg
                class="absolute -top-2 left-[calc(100%+3px)]"
                width="20"
                height="14"
                viewBox="0 0 20 14"
                fill="none"
                stroke="#db5a3b"
                stroke-width="3"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <path d="M3 12 L6 3" />
                <path d="M11 13 L15 4" />
              </svg>
            </span>
            <br />
            autour de vous
          </p>
        </button>

        <Empty v-if="!tables.length">
          <EmptyHeader>
            <EmptyTitle>Aucune tablée par ici</EmptyTitle>
            <EmptyDescription>
              {{
                aDesFiltres
                  ? 'Élargis le rayon ou retire un filtre pour voir plus de tablées.'
                  : 'Aucune tablée ouverte dans ton quartier pour le moment.'
              }}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent v-if="aDesFiltres">
            <Button variant="secondary" size="default" @click="retirerFiltres">
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
          <MascotBubble
            text="Utilise les filtres pour trouver ta tablée."
            :image="illustration"
            :size="104"
          />
        </div>
      </template>

      <!-- Carte -->
      <template v-else>
        <div class="relative -mx-5 -mb-6 flex-1 min-h-0 overflow-hidden">
          <TablesMap
            :tables="tables"
            :center="center"
            :selected-id="selectedId"
            @select="selectedId = $event"
          />
          <p
            v-if="position.locating.value"
            class="absolute top-3 left-3 z-[800] rounded-full bg-creme/95 px-3 py-1 text-micro text-secondaire"
          >
            Localisation en cours…
          </p>

        <article
          v-if="selected"
          class="absolute inset-x-3 bottom-3 z-[800] flex items-center justify-between gap-3 rounded-xl bg-surface p-3 shadow-[0_2px_10px_rgba(43,43,43,.06)]"
        >
          <DishPhoto :dish-name="selected.dishName" :size="56" class="shrink-0 rounded-lg" />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 class="truncate text-body-md-strong text-ardoise">{{ tableTitle(selected) }}</h3>
            <p class="flex flex-wrap items-center gap-x-2 text-micro text-secondaire">
              <span>{{ formatDay(selected.startsAt) }} · {{ formatTime(selected.startsAt) }}</span>
              <span>· {{ formatSeatsCourt(selected.seatsAvailable) }}</span>
            </p>
          </div>
          <RouterLink
            :to="`/tables/${selected.id}`"
            class="grid size-9 shrink-0 place-items-center rounded-full bg-terracotta text-creme"
            aria-label="Voir la tablée"
          >
            <ChevronRight class="size-4" :stroke-width="2.25" />
          </RouterLink>
        </article>
        <p v-else class="absolute inset-x-3 bottom-3 z-[800] text-center text-body-sm text-secondaire">
          Aucune tablée à afficher sur la carte.
        </p>
        </div>
      </template>
    </div>

    <!-- Filtres : régime et rayon -->
    <Drawer v-model:open="filtresOuverts">
      <DrawerContent class="bg-creme">
        <DrawerHeader class="app-pad text-left">
          <DrawerTitle class="text-title-lg font-titres text-sauge">Filtres</DrawerTitle>
        </DrawerHeader>

        <div class="app-pad flex flex-col gap-5 pb-8">
          <section class="flex flex-col gap-3">
            <h3 class="text-body-lg-strong text-ardoise">Autour de toi</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="rayon in RAYONS"
                :key="rayon"
                type="button"
                class="rounded-full px-4 py-2 text-label-md transition-colors"
                :class="
                  radiusKm === rayon
                    ? 'bg-terracotta text-creme'
                    : 'bg-sauge/10 text-sauge-fonce'
                "
                :aria-pressed="radiusKm === rayon"
                @click="radiusKm = rayon"
              >
                {{ rayon }} km
              </button>
            </div>
          </section>

          <section class="flex flex-col gap-2">
            <h3 class="mb-2 text-body-lg-strong text-ardoise">Régime alimentaire</h3>
            <label class="flex items-center justify-between gap-3 rounded-xl px-1 py-3">
              <span class="text-body-md text-ardoise">{{ DIETARY_OPTIONS[0].label }}</span>
              <Switch
                :model-value="regimes.includes('VEGETARIAN')"
                @update:model-value="basculerRegime('VEGETARIAN')"
              />
            </label>
            <!-- Le modèle ne stocke que « plat végétarien » par tablée : les autres
                 régimes (vegan, sans porc, halal…) attendent un champ dédié. -->
            <p class="text-micro text-secondaire">
              Les autres régimes (vegan, sans porc, halal…) arrivent bientôt.
            </p>
          </section>

          <Button size="lg" class="w-full" @click="filtresOuverts = false">
            Voir {{ compteTables }}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  </div>
</template>
