<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import TableCard from '@/components/TableCard.vue';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyTables } from '@/lib/api';
import type { Table } from '@/lib/types';

const tables = ref<Table[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const page = await listMyTables('past', 1, 100);
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
    <AppBar back plain back-to="/" title="Passées" />

    <div class="app-pad flex flex-col gap-3">
      <Skeleton v-if="loading" class="h-24 w-full rounded-2xl" />

      <Empty v-else-if="error" class="mt-8">
        <EmptyHeader>
          <EmptyTitle>Impossible de charger tes tablées</EmptyTitle>
          <EmptyDescription>{{ error }}</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <Empty v-else-if="!tables.length" class="mt-8">
        <EmptyHeader>
          <EmptyTitle>Aucune tablée passée</EmptyTitle>
          <EmptyDescription>Tes tablées terminées apparaîtront ici.</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <template v-else>
        <RouterLink
          v-for="table in tables"
          :key="table.id"
          :to="`/tables/${table.id}`"
          class="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          <TableCard :table="table" variant="past" />
        </RouterLink>
      </template>
    </div>
  </div>
</template>
