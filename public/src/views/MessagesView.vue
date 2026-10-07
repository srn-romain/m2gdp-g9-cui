<script setup lang="ts">
import { ArrowUp, MessageCircle, Mic } from '@lucide/vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import AppBar from '@/components/AppBar.vue';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTable, listMessages, listMyTables, postMessage } from '@/lib/api';
import {
  contributionLine,
  formatClock,
  formatDay,
  formatDayTime,
  formatTime,
  participantCount,
  tableTitle,
} from '@/lib/format';
import type { Message, Table } from '@/lib/types';
import { cn } from '@/lib/utils';

const route = useRoute();
const tableId = computed(() => (route.params.id ? String(route.params.id) : null));

const upcoming = ref<Table[]>([]);
const past = ref<Table[]>([]);
const tablesLoading = ref(true);

const table = ref<Table | null>(null);
const messages = ref<Message[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const draft = ref('');
const sending = ref(false);
const scroller = ref<HTMLElement | null>(null);

const title = computed(() => (table.value ? tableTitle(table.value) : 'Messages'));
const threadSubtitle = computed(() => {
  if (!table.value) return '';
  return `${participantCount(table.value)} participants · ${formatDayTime(table.value.startsAt)}`;
});
const contributions = computed(() => table.value?.contributions ?? []);

function conversationLine(item: Table): string {
  const parts = [formatDay(item.startsAt), formatTime(item.startsAt)];
  return parts.join(' · ');
}

async function loadConversations() {
  tablesLoading.value = true;
  try {
    const [up, pa] = await Promise.all([
      listMyTables('upcoming', 1, 50),
      listMyTables('past', 1, 20),
    ]);
    upcoming.value = up.data;
    past.value = pa.data;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Chargement impossible.';
  } finally {
    tablesLoading.value = false;
  }
}

async function scrollToEnd() {
  await nextTick();
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' });
}

async function loadThread(id: string) {
  loading.value = true;
  error.value = null;
  try {
    const [detail, page] = await Promise.all([getTable(id), listMessages(id, 1, 50)]);
    table.value = detail;
    // L'API renvoie du plus récent au plus ancien : le fil se lit dans l'autre sens.
    messages.value = [...page.data].reverse();
    await scrollToEnd();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Fil indisponible.';
  } finally {
    loading.value = false;
  }
}

async function send() {
  const text = draft.value.trim();
  if (!text || !tableId.value) return;
  sending.value = true;
  try {
    const created = await postMessage(tableId.value, { type: 'TEXT', text });
    messages.value.push(created);
    draft.value = '';
    await scrollToEnd();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Le message n'est pas parti.");
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  if (tableId.value) void loadThread(tableId.value);
  else void loadConversations();
});

watch(tableId, (id) => {
  messages.value = [];
  table.value = null;
  if (id) void loadThread(id);
  else void loadConversations();
});
</script>

<template>
  <!-- Fil de discussion -->
  <div v-if="tableId" class="flex h-[100dvh] flex-1 flex-col">
    <AppBar back back-to="/messages" :title="title" />
    <p class="app-pad pb-2 text-micro text-secondaire">{{ threadSubtitle }}</p>

    <div ref="scroller" class="flex-1 overflow-y-auto px-5 pb-4">
      <Skeleton v-if="loading" class="h-40 w-full rounded-2xl" />
      <Empty v-else-if="error">
        <EmptyHeader>
          <EmptyTitle>Fil indisponible</EmptyTitle>
          <EmptyDescription>{{ error }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <p v-else-if="!messages.length" class="py-10 text-center text-body-sm text-secondaire">
        Aucun message pour l'instant. Lance la conversation.
      </p>
      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="message in messages"
          :key="message.id"
          class="max-w-[85%] rounded-2xl border border-ardoise/10 bg-creme px-3 py-2"
        >
          <p class="text-micro text-secondaire">
            {{ message.author?.firstName ?? 'Quelqu’un' }} · {{ formatClock(message.sentAt) }}
          </p>
          <p v-if="message.type === 'AUDIO'" class="flex items-center gap-1.5 text-body-md text-secondaire">
            <Mic class="size-4" :stroke-width="1.75" />
            Message vocal · {{ message.durationSeconds ?? 0 }} s
          </p>
          <p v-else class="text-body-md text-ardoise">{{ message.text }}</p>
        </li>
      </ul>
    </div>

    <div v-if="contributions.length" class="app-pad pb-2">
      <div class="rounded-2xl border border-ardoise/10 p-3">
        <p class="text-micro text-secondaire">Contributions partagées</p>
        <ul class="mt-1 flex flex-col gap-0.5">
          <li v-for="contribution in contributions" :key="contribution.id" class="text-body-md text-ardoise">
            {{ contributionLine(contribution) }}
            <span v-if="contribution.participant" class="text-micro text-secondaire">
              — {{ contribution.participant.firstName }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <form class="app-pad tab-bar sticky bottom-0 flex items-center gap-2 bg-creme pt-1" @submit.prevent="send">
      <InputGroup class="h-12 flex-1 rounded-full border-ardoise/12 bg-creme">
        <InputGroupInput
          v-model="draft"
          placeholder="Écrire un message"
          aria-label="Écrire un message"
          class="text-body-md"
        />
      </InputGroup>
      <Button
        type="submit"
        size="icon-lg"
        :disabled="sending || !draft.trim()"
        aria-label="Envoyer le message"
      >
        <ArrowUp />
      </Button>
    </form>
  </div>

  <!-- Liste des conversations -->
  <div v-else class="flex flex-1 flex-col">
    <AppBar title="Messages" />

    <div class="app-pad flex flex-1 flex-col gap-4 pb-6">
      <Skeleton v-if="tablesLoading" class="h-24 w-full rounded-2xl" />

      <Tabs v-else default-value="upcoming" class="flex flex-col gap-4">
        <TabsList class="grid w-full grid-cols-2 rounded-full bg-ardoise/6 p-1">
          <TabsTrigger value="upcoming" class="rounded-full text-label-md">À venir</TabsTrigger>
          <TabsTrigger value="past" class="rounded-full text-label-md">Passées</TabsTrigger>
        </TabsList>

        <TabsContent v-for="scope in ['upcoming', 'past']" :key="scope" :value="scope" class="flex flex-col gap-3">
          <Empty v-if="!(scope === 'upcoming' ? upcoming : past).length">
            <EmptyHeader>
              <EmptyTitle>Aucune conversation</EmptyTitle>
              <EmptyDescription>
                {{ scope === 'upcoming' ? 'Rejoins une tablée pour échanger avec le groupe.' : 'Tes tablées passées apparaîtront ici.' }}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
          <RouterLink
            v-for="item in scope === 'upcoming' ? upcoming : past"
            :key="item.id"
            :to="`/messages/${item.id}`"
            class="flex items-center gap-3 rounded-2xl border border-ardoise/10 p-3 transition-colors hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-sauge/12 text-sauge">
              <MessageCircle class="size-5" :stroke-width="1.75" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-title-sm font-titres text-sauge-fonce">
                {{ tableTitle(item) }}
              </span>
              <span class="block text-micro text-secondaire">{{ conversationLine(item) }}</span>
            </span>
          </RouterLink>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
