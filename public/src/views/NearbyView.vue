<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import TableRow from '@/components/TableRow.vue';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { listTables } from '@/lib/api';
import type { Table } from '@/lib/types';
import { useMeStore } from '@/stores/me';

const meStore = useMeStore();
const tables = ref<Table[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    await meStore.load();
    const coords = meStore.profile?.coordinates;
    if (!coords) {
      error.value = 'Complète ton adresse pour voir les tablées proches.';
      return;
    }
    const page = await listTables({
      lat: coords.latitude,
      lng: coords.longitude,
      radiusKm: 5,
      sortBy: 'distance',
      page: 1,
      pageSize: 100,
    });
    tables.value = page.data;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col pb-6">
    <AppBar back plain back-to="/" title="Autour de chez toi" />

    <div class="app-pad flex flex-col gap-3">
      <Skeleton v-if="loading" class="h-20 w-full rounded-2xl" />

      <Empty v-else-if="error" class="mt-8">
        <EmptyHeader>
          <EmptyTitle>Impossible de charger les tablées</EmptyTitle>
          <EmptyDescription>{{ error }}</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <Empty v-else-if="!tables.length" class="mt-8">
        <EmptyHeader>
          <EmptyTitle>Aucune tablée proche</EmptyTitle>
          <EmptyDescription>Élargis ton rayon ou reviens plus tard.</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <template v-else>
        <RouterLink
          v-for="table in tables"
          :key="table.id"
          :to="`/tables/${table.id}`"
          class="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          <TableRow :table="table" />
        </RouterLink>
      </template>
    </div>
  </div>
</template>
