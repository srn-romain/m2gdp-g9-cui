<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Mascot from '@/components/Mascot.vue';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTable } from '@/lib/api';
import { contributionLine, formatDistance, formatDayTime, tableTitle } from '@/lib/format';
import type { Table } from '@/lib/types';

const route = useRoute();
const tableId = computed(() => String(route.params.id));
const table = ref<Table | null>(null);
const loading = ref(true);

const title = computed(() => (table.value ? tableTitle(table.value) : ''));
const contribution = computed(() => table.value?.myParticipation?.contribution ?? null);
const place = computed(() => {
  if (!table.value) return '';
  const distance = formatDistance(table.value.distanceMeters);
  return distance
    ? `${table.value.location.neighborhood} · ${distance}`
    : table.value.location.neighborhood;
});

onMounted(async () => {
  try {
    table.value = await getTable(tableId.value);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="app-pad flex flex-1 flex-col gap-5 pt-10 pb-8">
    <div class="flex justify-center">
      <Mascot pose="cheer" :size="132" with-buddy />
    </div>

    <h1 class="text-center text-display-lg font-titres text-sauge">C'est confirmé&nbsp;!</h1>

    <Skeleton v-if="loading" class="h-24 w-full rounded-2xl" />

    <template v-else-if="table">
      <p class="text-center text-body-lg text-ardoise">
        Tu rejoins <span class="font-titres text-title-sm text-sauge-fonce">{{ title }}</span>
      </p>

      <div class="flex flex-col gap-1 text-center">
        <p class="text-body-md text-ardoise">{{ table.host?.firstName ?? 'Ton hôte' }}</p>
        <p class="text-micro text-secondaire">
          {{ formatDayTime(table.startsAt) }} · {{ place }}
        </p>
      </div>

      <div v-if="contribution" class="rounded-2xl border border-ardoise/10 p-4">
        <p class="text-micro text-secondaire">Tu apportes</p>
        <p class="text-body-md text-ardoise">{{ contributionLine(contribution) }}</p>
      </div>
      <div v-else class="rounded-2xl border border-ardoise/10 p-4">
        <p class="text-micro text-secondaire">Tu apportes</p>
        <p class="text-body-md text-ardoise">Rien, tu viens les mains libres.</p>
      </div>

      <div class="mt-auto flex flex-col gap-3">
        <Button as-child size="lg" variant="secondary" class="w-full">
          <RouterLink :to="`/messages/${table.id}`">
            Écrire à {{ table.host?.firstName ?? 'ton hôte' }}
          </RouterLink>
        </Button>
        <Button as-child size="lg" class="w-full">
          <RouterLink to="/">Voir mes tablées</RouterLink>
        </Button>
      </div>
    </template>
  </div>
</template>
