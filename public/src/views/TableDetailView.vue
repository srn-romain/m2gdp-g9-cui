<script setup lang="ts">
import { CalendarClock, Check, MapPin, Share2, TriangleAlert, Users } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import AppBar from '@/components/AppBar.vue';
import DishPhoto from '@/components/DishPhoto.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { dishPhotoUrl } from '@/lib/dishPhoto';
import {
  contributionLine,
  formatDistance,
  formatDay,
  formatIngredientQuantity,
  formatSeats,
  formatTime,
  tableTitle,
} from '@/lib/format';
import { getTable, joinTable } from '@/lib/api';
import type { ContributionCategory, QuantityUnit, Table } from '@/lib/types';

const route = useRoute();
const router = useRouter();
const tableId = computed(() => String(route.params.id));
const table = ref<Table | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const title = computed(() => (table.value ? tableTitle(table.value) : ''));
const contributions = computed(() => table.value?.contributions ?? []);
const wanted = computed(() => table.value?.wantedContributions ?? []);
const isHost = computed(() => table.value?.myParticipation?.role === 'HOST');
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

function ouvrirParticipation() {
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
          :src="dishPhotoUrl(table.dishName, 900)"
          alt=""
          class="aspect-[4/3] w-full rounded-2xl object-cover"
        />
      </div>

      <div class="app-pad mt-4 flex flex-col gap-4">
        <h1 class="text-title-lg font-titres text-sauge">{{ title }}</h1>

        <div class="flex items-center gap-2">
          <span class="grid size-8 place-items-center rounded-full bg-sauge/12 text-label-sm text-sauge-fonce">
            {{ (table.host?.firstName ?? '?').charAt(0).toUpperCase() }}
          </span>
          <span class="text-body-md text-ardoise">{{ table.host?.firstName ?? 'Hôte' }}</span>
          <span
            v-if="table.host?.rating && table.host.rating.count > 0"
            class="text-micro text-secondaire"
          >
            · {{ table.host.rating.average.toFixed(1).replace('.', ',') }} ({{ table.host.rating.count }} avis)
          </span>
        </div>

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

        <p v-if="table.description" class="text-body-lg text-ardoise">{{ table.description }}</p>

        <Separator />

        <section v-if="wanted.length" class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="text-body-lg-strong text-ardoise">Ce que les invités apportent</h2>
            <p class="text-body-sm text-secondaire">
              {{ isHost ? 'Tu proposes ces ingrédients : tes voisins choisiront le leur.' : "Choisis ton ingrédient en rejoignant la tablée." }}
            </p>
          </div>
          <ul class="flex flex-col gap-2">
            <li
              v-for="(ingredient, index) in wanted"
              :key="`${ingredient.label}-${index}`"
              class="flex items-center gap-3 rounded-xl border border-ardoise/10 py-2 pr-3 pl-2"
            >
              <DishPhoto :dish-name="ingredient.label" :size="40" rounded="rounded-full" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="text-body-md font-bold text-ardoise">{{ ingredient.label }}</span>
                <span
                  v-if="formatIngredientQuantity(ingredient.quantity, ingredient.unit)"
                  class="text-micro text-secondaire"
                >
                  {{ formatIngredientQuantity(ingredient.quantity, ingredient.unit) }}
                </span>
              </span>
            </li>
          </ul>
        </section>

        <Separator v-if="wanted.length" />

        <section class="flex flex-col gap-3">
          <h2 class="text-body-lg-strong text-ardoise">Ce que chacun apporte</h2>
          <ul v-if="contributions.length" class="flex flex-col gap-2">
            <li
              v-for="contribution in contributions"
              :key="contribution.id"
              class="flex items-center justify-between gap-3 rounded-xl border border-ardoise/10 px-3 py-2"
            >
              <span class="flex items-center gap-2 text-body-md text-ardoise">
                <Check class="size-4 text-sauge" :stroke-width="2.25" />
                {{ contributionLine(contribution) }}
              </span>
              <span v-if="contribution.participant" class="text-micro text-secondaire">
                {{ contribution.participant.firstName }}
              </span>
            </li>
          </ul>
          <p v-else class="text-body-sm text-secondaire">
            Personne n'a encore annoncé son apport.
          </p>
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
        <Button v-else-if="joined" as-child size="lg" variant="secondary" class="w-full">
          <RouterLink :to="`/messages/${table.id}`">Écrire à {{ table.host?.firstName ?? 'l’hôte' }}</RouterLink>
        </Button>
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
  </div>
</template>
