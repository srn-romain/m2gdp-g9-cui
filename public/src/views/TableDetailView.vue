<script setup lang="ts">
import { CalendarClock, Check, MapPin, Plus, Share2, Trash2, TriangleAlert, Users } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import AppBar from '@/components/AppBar.vue';
import DishPhoto from '@/components/DishPhoto.vue';
import IngredientGlyph from '@/components/IngredientGlyph.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { dishPhotoUrl } from '@/lib/dishPhoto';
import {
  formatDistance,
  formatDay,
  formatIngredientQuantity,
  formatSeats,
  formatTime,
  tableTitle,
} from '@/lib/format';
import { getTable, joinTable, leaveTable, updateMyContribution, updateWantedContributions } from '@/lib/api';
import type { ContributionCategory, QuantityUnit, Table, WantedContribution } from '@/lib/types';
import { useMeStore } from '@/stores/me';

const route = useRoute();
const router = useRouter();
const meStore = useMeStore();
const tableId = computed(() => String(route.params.id));
const table = ref<Table | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const title = computed(() => (table.value ? tableTitle(table.value) : ''));
const contributions = computed(() => table.value?.contributions ?? []);
const wanted = computed(() => table.value?.wantedContributions ?? []);
const isHost = computed(() => table.value?.myParticipation?.role === 'HOST');
const apporteur = computed(() => {
  const map = new Map<string, { firstName: string; userId: string }>();
  for (const c of contributions.value) {
    if (c.participant) {
      map.set(c.label.trim().toLowerCase(), { firstName: c.participant.firstName, userId: c.participant.id });
    }
  }
  return map;
});

const contributionsLibres = computed(() => {
  const labels = new Set(wanted.value.map((w) => w.label.trim().toLowerCase()));
  return contributions.value.filter((c) => !labels.has(c.label.trim().toLowerCase()));
});

const monId = computed(() => meStore.profile?.id ?? '');

const editWantedOpen = ref(false);
const draftWanted = ref<WantedContribution[]>([]);
const nouvelIngredient = ref('');
const savingWanted = ref(false);
const savingApport = ref(false);

function ouvrirEditionWanted() {
  draftWanted.value = wanted.value.map((w) => ({ ...w }));
  nouvelIngredient.value = '';
  editWantedOpen.value = true;
}

function ajouterIngredient() {
  const label = nouvelIngredient.value.trim();
  if (!label) return;
  draftWanted.value.push({ label, quantity: 1, unit: 'UNIT' });
  nouvelIngredient.value = '';
}

function retirerIngredient(index: number) {
  draftWanted.value.splice(index, 1);
}

async function enregistrerWanted() {
  if (!table.value) return;
  savingWanted.value = true;
  try {
    table.value = await updateWantedContributions(table.value.id, draftWanted.value);
    editWantedOpen.value = false;
    toast.success('Liste de courses mise à jour.');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Mise à jour impossible.');
  } finally {
    savingWanted.value = false;
  }
}

async function retirerMonApport() {
  if (!table.value) return;
  savingApport.value = true;
  try {
    table.value = await updateMyContribution(table.value.id, null);
    toast.success('Apport retiré.');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Impossible de retirer l’apport.');
  } finally {
    savingApport.value = false;
  }
}

const changerOuverte = ref(false);
const changerChoix = ref<string | null>(null);
const changerLibre = ref('');

function ouvrirChangement() {
  changerChoix.value = table.value?.myParticipation?.contribution?.label ?? null;
  changerLibre.value = '';
  changerOuverte.value = true;
}

async function enregistrerChangement() {
  if (!table.value || savingApport.value) return;
  const label = (changerLibre.value.trim() || changerChoix.value || '').trim();
  if (!label) return;
  savingApport.value = true;
  try {
    table.value = await updateMyContribution(table.value.id, { label, category: 'INGREDIENT' });
    changerOuverte.value = false;
    toast.success('Apport mis à jour.');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Mise à jour impossible.');
  } finally {
    savingApport.value = false;
  }
}

const leaving = ref(false);
async function seRetirer() {
  if (!table.value || leaving.value) return;
  leaving.value = true;
  try {
    await leaveTable(table.value.id);
    toast.success('Tu t’es retiré de la tablée.');
    table.value = await getTable(table.value.id);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Impossible de te retirer.');
  } finally {
    leaving.value = false;
  }
}

const joined = computed(() => Boolean(table.value?.myParticipation));
const isPast = computed(() => table.value?.status === 'PASSED');
const canJoin = computed(
  () => table.value?.status === 'OPEN' && (table.value?.seatsAvailable ?? 0) > 0,
);

const participationOuverte = ref(false);
const apportChoisi = ref<string | null>(null);
const apportLibre = ref('');
const joining = ref(false);
const idempotencyKey = crypto.randomUUID();

async function ouvrirParticipation() {
  await meStore.load();
  if (!meStore.isOnboarded) {
    toast.info('Complète ton profil pour participer.');
    await router.push('/profil');
    return;
  }
  apportChoisi.value = wanted.value[0]?.label ?? null;
  apportLibre.value = '';
  participationOuverte.value = true;
}

async function rejoindre() {
  if (!table.value || joining.value) return;
  const libre = apportLibre.value.trim();
  let contribution: {
    label: string;
    category: ContributionCategory;
    quantity?: number;
    unit?: QuantityUnit;
  };
  if (libre) {
    contribution = { label: libre, category: 'INGREDIENT' };
  } else if (apportChoisi.value) {
    const item = wanted.value.find((w) => w.label === apportChoisi.value);
    contribution = {
      label: item?.label ?? apportChoisi.value,
      category: 'INGREDIENT',
      quantity: item?.quantity ?? undefined,
      unit: item?.unit ?? undefined,
    };
  } else {
    contribution = { label: 'Je ne fais pas les courses', category: 'NONE' };
  }
  joining.value = true;
  try {
    await joinTable(table.value.id, { contribution }, idempotencyKey);
    await router.replace(`/tables/${table.value.id}/confirme`);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'La participation a échoué.');
  } finally {
    joining.value = false;
  }
}

async function partager() {
  if (!table.value) return;
  const url = `${window.location.origin}/tables/${table.value.id}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: tableTitle(table.value), url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié.');
    }
  } catch {
    /* partage annulé */
  }
}

onMounted(async () => {
  try {
    table.value = await getTable(tableId.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Tablée introuvable.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col pb-6">
    <AppBar back plain back-to="/explorer" />

    <div v-if="loading" class="app-pad flex flex-col gap-3">
      <Skeleton class="aspect-[4/3] w-full rounded-2xl" />
      <Skeleton class="h-7 w-2/3" />
      <Skeleton class="h-5 w-1/3" />
      <Skeleton class="h-20 w-full" />
    </div>

    <Empty v-else-if="error || !table" class="app-pad">
      <EmptyHeader>
        <EmptyTitle>Cette tablée n'existe plus</EmptyTitle>
        <EmptyDescription>{{ error ?? 'Elle a peut-être été annulée.' }}</EmptyDescription>
      </EmptyHeader>
    </Empty>

    <template v-else>
      <div class="app-pad">
        <img
          :src="table.dishImageUrl || dishPhotoUrl(table.dishName, 900)"
          alt=""
          class="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      </div>

      <div class="app-pad mt-4 flex flex-col gap-4">
        <h1 class="text-title-lg font-titres text-sauge">{{ title }}</h1>

        <div class="flex items-center gap-2">
          <Avatar class="size-8 bg-sauge/12">
            <AvatarImage v-if="table.host?.avatarUrl" :src="table.host.avatarUrl" alt="" />
            <AvatarFallback class="text-label-sm text-sauge-fonce">
              {{ (table.host?.firstName ?? '?').charAt(0).toUpperCase() }}
            </AvatarFallback>
          </Avatar>
          <span class="text-body-md text-ardoise">{{ table.host?.firstName ?? 'Hôte' }}</span>
          <span
            v-if="table.host?.rating && table.host.rating.count > 0"
            class="text-micro text-secondaire"
          >
            · {{ table.host.rating.average.toFixed(1).replace('.', ',') }} ({{ table.host.rating.count }} avis)
          </span>
        </div>
        <p v-if="table.host?.about" class="text-body-sm whitespace-pre-line text-secondaire">
          {{ table.host.about }}
        </p>

        <div class="flex flex-wrap items-center gap-1.5">
          <Badge v-if="table.isVegetarian" variant="outline" class="text-label-sm text-secondaire">
            Végétarien
          </Badge>
          <Badge v-if="table.hasAllergenNotice" variant="outline" class="text-label-sm text-secondaire">
            <TriangleAlert class="size-3.5" :stroke-width="2" />
            Allergènes indiqués
          </Badge>
          <Badge variant="outline" class="text-label-sm text-secondaire">
            {{ formatSeats(table.seatsAvailable) }}
          </Badge>
        </div>

        <dl class="flex flex-col gap-2">
          <div class="flex items-center gap-2 text-body-md text-ardoise">
            <CalendarClock class="size-4 shrink-0 text-secondaire" :stroke-width="1.75" />
            <span>{{ formatDay(table.startsAt) }} · {{ formatTime(table.startsAt) }}</span>
          </div>
          <div class="flex items-center gap-2 text-body-md text-ardoise">
            <MapPin class="size-4 shrink-0 text-secondaire" :stroke-width="1.75" />
            <span>
              {{ table.location.neighborhood }}
              <template v-if="table.distanceMeters != null">
                · {{ formatDistance(table.distanceMeters) }}
              </template>
            </span>
          </div>
          <div class="flex items-center gap-2 text-body-md text-ardoise">
            <Users class="size-4 shrink-0 text-secondaire" :stroke-width="1.75" />
            <span>{{ table.seatsTotal }} places ouvertes aux invités</span>
          </div>
        </dl>

        <p v-if="table.description" class="text-body-lg whitespace-pre-line text-ardoise">{{ table.description }}</p>
        <p v-if="table.ambiance" class="whitespace-pre-line rounded-xl bg-sauge/10 px-3 py-2 text-body-md text-sauge-fonce">
          {{ table.ambiance }}
        </p>

        <Separator />

        <section v-if="wanted.length" class="flex flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-col gap-1">
            <h2 class="text-body-lg-strong text-ardoise">Ce que les invités apportent</h2>
            <p class="text-body-sm text-secondaire">
              {{ isHost ? 'Tu proposes ces ingrédients : tes voisins choisiront le leur.' : "Choisis ton ingrédient en rejoignant la tablée." }}
            </p>
            </div>
            <Button v-if="isHost" type="button" variant="ghost" size="sm" @click="ouvrirEditionWanted">
              Modifier
            </Button>
          </div>
          <ul class="flex flex-col gap-2">
            <li
              v-for="(ingredient, index) in wanted"
              :key="`${ingredient.label}-${index}`"
              class="flex items-center gap-3 rounded-xl border py-2 pr-3 pl-2"
              :class="apporteur.get(ingredient.label.trim().toLowerCase()) ? 'border-sauge/40 bg-sauge/5' : 'border-ardoise/10'"
            >
              <IngredientGlyph :label="ingredient.label" :size="40" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="text-body-md font-bold text-ardoise">{{ ingredient.label }}</span>
                <span
                  v-if="formatIngredientQuantity(ingredient.quantity, ingredient.unit)"
                  class="text-micro text-secondaire"
                >
                  {{ formatIngredientQuantity(ingredient.quantity, ingredient.unit) }}
                </span>
                <span
                  v-if="apporteur.get(ingredient.label.trim().toLowerCase())"
                  class="flex items-center gap-1 text-micro font-medium text-sauge-fonce"
                >
                  <Check class="size-3.5" :stroke-width="2.5" />
                  Apporté par {{ apporteur.get(ingredient.label.trim().toLowerCase())?.firstName }}
                </span>
                <span v-else class="text-micro text-secondaire">À pourvoir</span>
              </span>
              <button
                v-if="apporteur.get(ingredient.label.trim().toLowerCase())?.userId === monId"
                type="button"
                class="shrink-0 text-micro font-medium text-terracotta"
                @click="ouvrirChangement"
              >
                Changer
              </button>
            </li>

            <li
              v-for="contribution in contributionsLibres"
              :key="contribution.id"
              class="flex items-center gap-3 rounded-xl border border-ardoise/10 py-2 pr-3 pl-2"
            >
              <IngredientGlyph :label="contribution.label" :size="40" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="text-body-md font-bold text-ardoise">{{ contribution.label }}</span>
                <span class="text-micro text-sauge-fonce">Apporté par {{ contribution.participant?.firstName }}</span>
              </span>
              <button
                v-if="contribution.participant?.id === monId"
                type="button"
                class="shrink-0 text-micro font-medium text-terracotta"
                @click="ouvrirChangement"
              >
                Changer
              </button>
            </li>
          </ul>
        </section>

      </div>

      <div class="app-pad mt-auto flex flex-col gap-3 pt-6">
        <template v-if="isHost">
          <Button size="lg" variant="secondary" class="w-full" @click="partager">
            <Share2 data-icon="inline-start" />
            Partager la tablée
          </Button>
          <Button as-child size="lg" variant="secondary" class="w-full">
            <RouterLink :to="`/messages/${table.id}`">Écrire au groupe</RouterLink>
          </Button>
        </template>
        <template v-else-if="joined">
          <Button as-child size="lg" variant="secondary" class="w-full">
            <RouterLink :to="`/messages/${table.id}`">Écrire à {{ table.host?.firstName ?? 'l’hôte' }}</RouterLink>
          </Button>
          <Button size="lg" variant="ghost" class="w-full text-terracotta" :disabled="leaving" @click="seRetirer">
            {{ leaving ? 'Retrait…' : 'Se retirer de la tablée' }}
          </Button>
        </template>
        <Button v-else-if="canJoin" size="lg" class="w-full" @click="ouvrirParticipation">
          Participer à la tablée
        </Button>
        <Button v-else size="lg" class="w-full" disabled>
          {{ isPast ? 'Tablée passée' : 'Plus de place' }}
        </Button>
      </div>

      <Drawer v-model:open="participationOuverte">
        <DrawerContent class="bg-creme">
          <DrawerHeader class="app-pad text-left">
            <DrawerTitle class="text-title-lg font-titres text-sauge">Ta contribution</DrawerTitle>
          </DrawerHeader>
          <div class="app-pad flex flex-col gap-3 pb-8">
            <div v-if="wanted.length" class="flex flex-col gap-2">
              <button
                v-for="item in wanted"
                :key="item.label"
                type="button"
                class="flex items-center justify-between rounded-xl border px-3 py-2.5 text-body-md text-ardoise"
                :class="apportChoisi === item.label ? 'border-terracotta bg-terracotta/10' : 'border-ardoise/10'"
                @click="apportChoisi = item.label; apportLibre = ''"
              >
                <span>{{ item.label }}</span>
                <Check v-if="apportChoisi === item.label" class="size-4 text-terracotta" :stroke-width="2.25" />
              </button>
            </div>

            <input
              v-model="apportLibre"
              type="text"
              placeholder="J'apporte autre chose…"
              class="h-12 w-full rounded-xl border border-ardoise/10 bg-surface px-3 text-body-md text-ardoise outline-none focus:border-terracotta"
              @input="apportChoisi = null"
            />

            <button
              type="button"
              class="rounded-xl border px-3 py-2.5 text-body-md"
              :class="!apportChoisi && !apportLibre ? 'border-terracotta bg-terracotta/10 text-ardoise' : 'border-ardoise/10 text-ardoise'"
              @click="apportChoisi = null; apportLibre = ''"
            >
              Je ne fais pas les courses
            </button>

            <Button size="lg" class="w-full" :disabled="joining" @click="rejoindre">
              {{ joining ? 'Envoi…' : 'Confirmer ma participation' }}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </template>

    <Drawer v-model:open="editWantedOpen">
      <DrawerContent class="bg-creme">
        <DrawerHeader class="app-pad text-left">
          <DrawerTitle class="text-title-lg font-titres text-sauge">Modifier les ingrédients</DrawerTitle>
        </DrawerHeader>
        <div class="app-pad flex flex-col gap-3 pb-8">
          <ul class="flex flex-col gap-2">
            <li
              v-for="(item, i) in draftWanted"
              :key="`${item.label}-${i}`"
              class="flex items-center gap-2 rounded-xl border border-ardoise/10 px-3 py-2"
            >
              <span class="flex-1 text-body-md text-ardoise">{{ item.label }}</span>
              <button
                type="button"
                class="grid size-8 place-items-center rounded-full text-terracotta"
                aria-label="Retirer l’ingrédient"
                @click="retirerIngredient(i)"
              >
                <Trash2 class="size-4" />
              </button>
            </li>
          </ul>
          <div class="flex gap-2">
            <input
              v-model="nouvelIngredient"
              type="text"
              placeholder="Ajouter un ingrédient…"
              class="h-12 flex-1 rounded-xl border border-ardoise/10 bg-surface px-3 text-body-md text-ardoise outline-none focus:border-terracotta"
              @keydown.enter.prevent="ajouterIngredient"
            />
            <Button type="button" variant="secondary" size="default" @click="ajouterIngredient">
              <Plus class="size-4" />
            </Button>
          </div>
          <Button size="lg" class="w-full" :disabled="savingWanted" @click="enregistrerWanted">
            {{ savingWanted ? 'Enregistrement…' : 'Enregistrer' }}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>

    <Drawer v-model:open="changerOuverte">
      <DrawerContent class="bg-creme">
        <DrawerHeader class="app-pad text-left">
          <DrawerTitle class="text-title-lg font-titres text-sauge">Changer mon apport</DrawerTitle>
        </DrawerHeader>
        <div class="app-pad flex flex-col gap-3 pb-8">
          <div v-if="wanted.length" class="flex flex-col gap-2">
            <button
              v-for="item in wanted"
              :key="item.label"
              type="button"
              class="flex items-center justify-between rounded-xl border px-3 py-2.5 text-body-md text-ardoise"
              :class="changerChoix === item.label ? 'border-terracotta bg-terracotta/10' : 'border-ardoise/10'"
              @click="changerChoix = item.label; changerLibre = ''"
            >
              <span>{{ item.label }}</span>
              <Check v-if="changerChoix === item.label" class="size-4 text-terracotta" :stroke-width="2.25" />
            </button>
          </div>
          <input
            v-model="changerLibre"
            type="text"
            placeholder="J'apporte autre chose…"
            class="h-12 w-full rounded-xl border border-ardoise/10 bg-surface px-3 text-body-md text-ardoise outline-none focus:border-terracotta"
            @input="changerChoix = null"
          />
          <Button size="lg" class="w-full" :disabled="savingApport || (!changerChoix && !changerLibre.trim())" @click="enregistrerChangement">
            {{ savingApport ? 'Enregistrement…' : 'Enregistrer' }}
          </Button>
          <Button type="button" variant="ghost" size="default" class="w-full text-terracotta" :disabled="savingApport" @click="retirerMonApport">
            Retirer mon apport
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  </div>
</template>
