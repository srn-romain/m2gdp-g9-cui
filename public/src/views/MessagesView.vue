<script setup lang="ts">
import {
  ArrowLeft,
  ArrowUp,
  Camera,
  ChevronRight,
  Mic,
  MoreVertical,
  Play,
  Square,
  Users,
} from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import illustration from '@/assets/bonjour.png';
import AccentStroke from '@/components/AccentStroke.vue';
import AppBar from '@/components/AppBar.vue';
import DishPhoto from '@/components/DishPhoto.vue';
import MascotBubble from '@/components/MascotBubble.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getTable,
  listMessages,
  listMyTables,
  mediaUrl,
  postMessage,
  presignMedia,
  uploadMedia,
} from '@/lib/api';
import {
  formatClock,
  formatDayTime,
  formatQuantity,
  formatStamp,
  initials,
  participantCount,
  tableTitle,
} from '@/lib/format';
import { DEMO_MODE } from '@/lib/mock';
import type { Message, Table } from '@/lib/types';
import { useMeStore } from '@/stores/me';

const route = useRoute();
const router = useRouter();
const meStore = useMeStore();

const tableId = computed(() => (route.params.id ? String(route.params.id) : null));
const monId = computed(() => meStore.profile?.id ?? '');

/* --- Liste des conversations --------------------------------------------- */

interface Conversation {
  table: Table;
  apercu: string;
  quand: string;
  tri: string;
}

const onglet = ref<'toutes' | 'mes-tablees'>('toutes');
const conversations = ref<Conversation[]>([]);
const listLoading = ref(true);
const listError = ref<string | null>(null);

const conversationsAffichees = computed(() =>
  onglet.value === 'toutes'
    ? conversations.value
    : conversations.value.filter((c) => c.table.myParticipation?.role === 'HOST'),
);

function apercuDe(message: Message | undefined, table: Table): string {
  if (!message) return `${formatDayTime(table.startsAt)} · aucun message pour l'instant`;
  const auteur = message.author?.firstName ?? 'Quelqu’un';
  if (message.type === 'IMAGE') return `${auteur} a envoyé une photo`;
  if (message.type === 'AUDIO') return `${auteur} a envoyé un message vocal`;
  return `${auteur} : ${message.text ?? ''}`;
}

async function loadConversations() {
  listLoading.value = true;
  listError.value = null;
  try {
    const [avenir, passees] = await Promise.all([
      listMyTables('upcoming', 1, 20),
      listMyTables('past', 1, 10),
    ]);
    const tables = [...avenir.data, ...passees.data];
    // Le dernier message donne l'aperçu et l'ordre de la liste (comme la maquette).
    const derniers = await Promise.all(
      tables.map((table) =>
        listMessages(table.id, 1, 1)
          .then((page) => page.data[0] as Message | undefined)
          .catch(() => undefined),
      ),
    );
    conversations.value = tables
      .map((table, index) => {
        const dernier = derniers[index];
        return {
          table,
          apercu: apercuDe(dernier, table),
          quand: formatStamp(dernier?.sentAt ?? table.createdAt),
          tri: dernier?.sentAt ?? table.createdAt,
        };
      })
      .sort((a, b) => b.tri.localeCompare(a.tri));
  } catch (e) {
    listError.value = e instanceof Error ? e.message : 'Chargement impossible.';
  } finally {
    listLoading.value = false;
  }
}

/* --- Fil de discussion ---------------------------------------------------- */

const table = ref<Table | null>(null);
const messages = ref<Message[]>([]);
const threadLoading = ref(false);
const threadError = ref<string | null>(null);
const draft = ref('');
const sending = ref(false);
const scroller = ref<HTMLElement | null>(null);
const menuOuvert = ref(false);
const champPhoto = ref<HTMLInputElement | null>(null);

const titre = computed(() => (table.value ? tableTitle(table.value) : 'Discussion'));
const sousTitre = computed(() => {
  if (!table.value) return '';
  const quand = formatDayTime(table.value.startsAt);
  const monde = participantCount(table.value);
  return `${monde} participant${monde > 1 ? 's' : ''} · ${quand.charAt(0).toLowerCase()}${quand.slice(1)}`;
});
const contributions = computed(() => table.value?.contributions ?? []);

const estMoi = (message: Message) => Boolean(monId.value) && message.author?.id === monId.value;

async function defilerEnBas() {
  await nextTick();
  scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' });
}

async function loadThread(id: string) {
  threadLoading.value = true;
  threadError.value = null;
  try {
    const [detail, page] = await Promise.all([getTable(id), listMessages(id, 1, 50)]);
    table.value = detail;
    // L'API renvoie du plus récent au plus ancien : le fil se lit dans l'autre sens.
    messages.value = [...page.data].reverse();
    await defilerEnBas();
  } catch (e) {
    threadError.value = e instanceof Error ? e.message : 'Fil indisponible.';
  } finally {
    threadLoading.value = false;
  }
}

async function ajouter(created: Message) {
  messages.value.push(created);
  draft.value = '';
  await defilerEnBas();
}

async function envoyerTexte() {
  const texte = draft.value.trim();
  if (!texte || !tableId.value) return;
  sending.value = true;
  try {
    await ajouter(await postMessage(tableId.value, { type: 'TEXT', text: texte }));
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Le message n'est pas parti.");
  } finally {
    sending.value = false;
  }
}

/** Upload d'un média puis publication du message correspondant. */
async function publierMedia(fichier: Blob, type: 'IMAGE' | 'AUDIO'): Promise<void> {
  if (!tableId.value) return;
  const contentType = fichier.type || (type === 'IMAGE' ? 'image/jpeg' : 'audio/webm');
  let url = '';
  if (DEMO_MODE) {
    // Hors ligne : on garde le fichier en data URL pour que la relecture fonctionne.
    url = await new Promise<string>((resolve) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resolve(String(lecteur.result));
      lecteur.readAsDataURL(fichier);
    });
  } else {
    const { key, uploadUrl } = await presignMedia('message', contentType, fichier.size);
    await uploadMedia(uploadUrl, fichier, contentType);
    url = mediaUrl(key);
  }
  const corps =
    type === 'IMAGE'
      ? { type, imageUrl: url }
      : { type, audioUrl: url, durationSeconds: dureeAudio.value };
  await ajouter(await postMessage(tableId.value, corps));
}

async function envoyerPhoto(evenement: Event) {
  const champ = evenement.target as HTMLInputElement;
  const fichier = champ.files?.[0];
  champ.value = '';
  if (!fichier) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type)) {
    toast.error('Formats acceptés : JPEG, PNG ou WebP.');
    return;
  }
  if (fichier.size > 5 * 1024 * 1024) {
    toast.error('Image trop lourde (5 Mo maximum).');
    return;
  }
  sending.value = true;
  try {
    await publierMedia(fichier, 'IMAGE');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "La photo n'est pas partie.");
  } finally {
    sending.value = false;
  }
}

/* --- Message vocal -------------------------------------------------------- */

const enregistreur = ref<MediaRecorder | null>(null);
const dureeAudio = ref(0);
let morceaux: Blob[] = [];
let debutEnregistrement = 0;

async function basculerMicro() {
  if (enregistreur.value) {
    enregistreur.value.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    toast.error("L'enregistrement vocal n'est pas disponible sur cet appareil.");
    return;
  }
  try {
    const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(flux);
    morceaux = [];
    recorder.ondataavailable = (evenement) => {
      if (evenement.data.size) morceaux.push(evenement.data);
    };
    recorder.onstop = async () => {
      flux.getTracks().forEach((piste) => piste.stop());
      enregistreur.value = null;
      dureeAudio.value = Math.max(1, Math.round((Date.now() - debutEnregistrement) / 1000));
      const blob = new Blob(morceaux, { type: recorder.mimeType || 'audio/webm' });
      sending.value = true;
      try {
        await publierMedia(blob, 'AUDIO');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Le message vocal n'est pas parti.");
      } finally {
        sending.value = false;
      }
    };
    debutEnregistrement = Date.now();
    recorder.start();
    enregistreur.value = recorder;
  } catch {
    toast.error("Accès au micro refusé.");
  }
}

/* --- Lecture des messages vocaux ------------------------------------------ */

const audioEnCours = ref<string | null>(null);
let lecteur: HTMLAudioElement | null = null;

function basculerLecture(message: Message) {
  const source = message.audioUrl ?? '';
  if (!/^(https?:|data:|blob:)/i.test(source)) {
    toast.info("L'écoute n'est pas disponible pour cet extrait de démonstration.");
    return;
  }
  if (audioEnCours.value === message.id) {
    lecteur?.pause();
    audioEnCours.value = null;
    return;
  }
  lecteur?.pause();
  lecteur = new Audio(source);
  lecteur.onended = () => {
    audioEnCours.value = null;
  };
  void lecteur.play();
  audioEnCours.value = message.id;
}

/** Hauteur des barres de l'onde : stable pour un message donné. */
function onde(message: Message): number[] {
  const graine = [...message.id].reduce((total, caractere) => total + caractere.charCodeAt(0), 0);
  return Array.from({ length: 22 }, (_, index) => 6 + ((graine + index * 7) % 15));
}

/* --- Cycle de vie --------------------------------------------------------- */

onMounted(async () => {
  await meStore.load();
  if (tableId.value) void loadThread(tableId.value);
  else void loadConversations();
});

watch(tableId, (id) => {
  messages.value = [];
  table.value = null;
  menuOuvert.value = false;
  if (id) void loadThread(id);
  else void loadConversations();
});

onBeforeUnmount(() => {
  lecteur?.pause();
  enregistreur.value?.stop();
});
</script>

<template>
  <!-- Fil de discussion -->
  <div v-if="tableId" class="flex h-[100dvh] flex-1 flex-col">
    <header class="app-pad sticky top-0 z-30 flex items-center gap-2 bg-creme py-3">
      <button
        type="button"
        class="grid size-9 shrink-0 place-items-center rounded-full text-ardoise transition-colors hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        aria-label="Revenir aux messages"
        @click="router.push('/messages')"
      >
        <ArrowLeft class="size-5" :stroke-width="2" />
      </button>
      <img :src="illustration" alt="" class="size-9 shrink-0 rounded-full bg-sauge/10 object-contain" />
      <div class="min-w-0 flex-1">
        <p class="flex items-center gap-1.5">
          <span class="truncate text-title-sm font-titres text-sauge-fonce">{{ titre }}</span>
          <AccentStroke :height="9" />
        </p>
        <p class="truncate text-micro text-secondaire">{{ sousTitre }}</p>
      </div>
      <div class="relative shrink-0">
        <button
          type="button"
          class="grid size-8 place-items-center rounded-full text-ardoise transition-colors hover:bg-ardoise/5"
          aria-label="Options de la conversation"
          :aria-expanded="menuOuvert"
          @click="menuOuvert = !menuOuvert"
        >
          <MoreVertical class="size-5" :stroke-width="2" />
        </button>
        <div
          v-if="menuOuvert"
          class="absolute right-0 z-40 mt-1 w-52 overflow-hidden rounded-2xl border border-ardoise/10 bg-surface shadow-[0_8px_24px_rgba(43,43,43,.14)]"
        >
          <RouterLink
            :to="`/tables/${tableId}`"
            class="block px-4 py-3 text-body-md text-ardoise transition-colors hover:bg-ardoise/5"
            @click="menuOuvert = false"
          >
            Voir la tablée
          </RouterLink>
          <RouterLink
            to="/explorer"
            class="block border-t border-ardoise/10 px-4 py-3 text-body-md text-ardoise transition-colors hover:bg-ardoise/5"
            @click="menuOuvert = false"
          >
            Chercher une autre tablée
          </RouterLink>
        </div>
      </div>
    </header>

    <div ref="scroller" class="flex-1 overflow-y-auto px-4 pb-4">
      <Skeleton v-if="threadLoading" class="h-40 w-full rounded-2xl" />
      <Empty v-else-if="threadError">
        <EmptyHeader>
          <EmptyTitle>Fil indisponible</EmptyTitle>
          <EmptyDescription>{{ threadError }}</EmptyDescription>
        </EmptyHeader>
      </Empty>
      <p v-else-if="!messages.length" class="py-10 text-center text-body-sm text-secondaire">
        Aucun message pour l'instant. Lance la conversation.
      </p>
      <ul v-else class="flex flex-col gap-4">
        <li
          v-for="message in messages"
          :key="message.id"
          class="flex items-start gap-2"
          :class="estMoi(message) ? 'flex-row-reverse' : ''"
        >
          <Avatar class="size-9 shrink-0 bg-terracotta/12">
            <AvatarImage
              v-if="message.author?.avatarUrl"
              :src="message.author.avatarUrl"
              :alt="message.author?.firstName"
              class="size-full object-cover"
            />
            <AvatarFallback class="text-micro text-terracotta">
              {{ initials(message.author?.firstName ?? '?') }}
            </AvatarFallback>
          </Avatar>

          <div class="flex min-w-0 max-w-[78%] flex-col gap-1" :class="estMoi(message) ? 'items-end' : 'items-start'">
            <span class="text-micro text-secondaire">{{ message.author?.firstName ?? 'Quelqu’un' }}</span>
            <div class="flex items-end gap-1.5" :class="estMoi(message) ? 'flex-row-reverse' : ''">
              <div
                class="min-w-0 overflow-hidden rounded-2xl text-body-md text-ardoise"
                :class="
                  message.type === 'IMAGE'
                    ? 'p-1'
                    : estMoi(message)
                      ? 'bg-sauge/12 px-3 py-2'
                      : 'border border-ardoise/10 bg-surface px-3 py-2'
                "
              >
                <img
                  v-if="message.type === 'IMAGE' && message.imageUrl"
                  :src="message.imageUrl"
                  alt="Photo partagée"
                  class="max-h-64 w-56 rounded-xl object-cover"
                />
                <button
                  v-else-if="message.type === 'AUDIO'"
                  type="button"
                  class="flex items-center gap-2"
                  :aria-label="`Écouter le message vocal de ${message.durationSeconds ?? 0} secondes`"
                  @click="basculerLecture(message)"
                >
                  <span class="grid size-8 shrink-0 place-items-center rounded-full bg-terracotta text-creme">
                    <Square v-if="audioEnCours === message.id" class="size-3.5" :stroke-width="2.5" />
                    <Play v-else class="size-4 fill-current" :stroke-width="0" />
                  </span>
                  <span class="flex items-end gap-[3px]" aria-hidden="true">
                    <span
                      v-for="(hauteur, index) in onde(message)"
                      :key="index"
                      class="w-[3px] rounded-full bg-sauge/60"
                      :style="{ height: `${hauteur}px` }"
                    />
                  </span>
                  <span class="text-micro text-secondaire">
                    {{ Math.floor((message.durationSeconds ?? 0) / 60) }}:{{
                      String((message.durationSeconds ?? 0) % 60).padStart(2, '0')
                    }}
                  </span>
                </button>
                <p v-else class="whitespace-pre-line">{{ message.text }}</p>
              </div>
              <span class="shrink-0 pb-1 text-micro text-secondaire">{{ formatClock(message.sentAt) }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="contributions.length" class="app-pad pb-2">
      <div class="rounded-2xl bg-sauge/12 p-3">
        <p class="text-micro text-secondaire">Contributions partagées</p>
        <ul class="mt-1.5 flex flex-col gap-1.5">
          <li
            v-for="contribution in contributions"
            :key="contribution.id"
            class="flex items-center gap-3 rounded-xl bg-surface/80 p-2"
          >
            <DishPhoto :dish-name="contribution.label" :size="40" rounded="rounded-full" />
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="truncate text-body-md text-ardoise">
                <span class="font-bold">{{ contribution.label }}</span>
                <template v-if="contribution.participant">
                  · {{ contribution.participant.firstName }}
                </template>
              </span>
              <span v-if="formatQuantity(contribution.quantity, contribution.unit)" class="text-micro text-secondaire">
                {{ formatQuantity(contribution.quantity, contribution.unit) }}
              </span>
            </span>
            <ChevronRight class="size-4 shrink-0 text-sauge" :stroke-width="2" />
          </li>
        </ul>
      </div>
    </div>

    <form
      class="app-pad tab-bar sticky bottom-0 flex items-center gap-2 bg-creme pt-2"
      @submit.prevent="envoyerTexte"
    >
      <input ref="champPhoto" type="file" accept="image/*" class="hidden" @change="envoyerPhoto" />
      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-full bg-sauge/12 text-sauge-fonce transition-colors hover:bg-sauge/20"
        aria-label="Envoyer une photo"
        @click="champPhoto?.click()"
      >
        <Camera class="size-5" :stroke-width="2" />
      </button>

      <InputGroup class="h-11 min-w-0 flex-1 rounded-full border-ardoise/12 bg-surface">
        <InputGroupInput
          v-model="draft"
          placeholder="Écrire un message"
          aria-label="Écrire un message"
          class="text-body-md"
        />
      </InputGroup>

      <button
        v-if="draft.trim() || sending"
        type="submit"
        class="grid size-11 shrink-0 place-items-center rounded-full bg-terracotta text-creme transition-colors hover:bg-terracotta-fonce disabled:opacity-60"
        :disabled="sending"
        aria-label="Envoyer le message"
      >
        <ArrowUp class="size-5" :stroke-width="2.25" />
      </button>
      <button
        v-else
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-full transition-colors"
        :class="enregistreur ? 'bg-terracotta text-creme' : 'bg-sauge/12 text-sauge-fonce hover:bg-sauge/20'"
        :aria-label="enregistreur ? 'Arrêter l’enregistrement' : 'Enregistrer un message vocal'"
        @click="basculerMicro"
      >
        <Square v-if="enregistreur" class="size-4" :stroke-width="2.5" />
        <Mic v-else class="size-5" :stroke-width="2" />
      </button>
    </form>
  </div>

  <!-- Liste des conversations -->
  <div v-else class="flex flex-1 flex-col">
    <AppBar />

    <div class="app-pad flex flex-1 flex-col gap-4 pb-6">
      <h1 class="flex items-center gap-2 text-display-2xl font-titres text-sauge">
        Messages
        <AccentStroke :height="15" />
      </h1>

      <div class="grid grid-cols-2 gap-1 rounded-full bg-ardoise/5 p-1">
        <button
          type="button"
          class="rounded-full py-2 text-button-md transition-colors"
          :class="onglet === 'toutes' ? 'bg-terracotta text-creme' : 'text-ardoise'"
          :aria-pressed="onglet === 'toutes'"
          @click="onglet = 'toutes'"
        >
          Toutes
        </button>
        <button
          type="button"
          class="rounded-full py-2 text-button-md transition-colors"
          :class="onglet === 'mes-tablees' ? 'bg-terracotta text-creme' : 'text-ardoise'"
          :aria-pressed="onglet === 'mes-tablees'"
          @click="onglet = 'mes-tablees'"
        >
          Mes tablées
        </button>
      </div>

      <Skeleton v-if="listLoading" class="h-20 w-full rounded-2xl" />

      <Empty v-else-if="listError">
        <EmptyHeader>
          <EmptyTitle>Conversations indisponibles</EmptyTitle>
          <EmptyDescription>{{ listError }}</EmptyDescription>
        </EmptyHeader>
      </Empty>

      <Empty v-else-if="!conversationsAffichees.length">
        <EmptyHeader>
          <EmptyTitle>Aucune conversation</EmptyTitle>
          <EmptyDescription>
            {{
              onglet === 'mes-tablees'
                ? 'Les tablées que tu organises apparaîtront ici.'
                : 'Rejoins une tablée pour échanger avec le groupe.'
            }}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>

      <div v-else class="flex flex-col gap-3">
        <RouterLink
          v-for="conversation in conversationsAffichees"
          :key="conversation.table.id"
          :to="`/messages/${conversation.table.id}`"
          class="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-[0_2px_10px_rgba(43,43,43,.06)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          <span class="relative shrink-0">
            <DishPhoto :dish-name="conversation.table.dishName" :size="64" />
            <span
              class="absolute -bottom-1 -left-1 grid size-6 place-items-center rounded-full border-2 border-surface bg-sauge/20 text-sauge-fonce"
              aria-hidden="true"
            >
              <Users class="size-3.5" :stroke-width="2.25" />
            </span>
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="flex items-center gap-1.5">
              <span class="truncate text-title-sm font-titres text-sauge-fonce">
                {{ tableTitle(conversation.table) }}
              </span>
              <AccentStroke :height="9" />
            </span>
            <span class="truncate text-micro text-secondaire">{{ conversation.apercu }}</span>
          </span>
          <span class="shrink-0 self-start pt-1 text-micro text-secondaire">
            {{ conversation.quand }}
          </span>
        </RouterLink>
      </div>

      <div class="mt-2 flex justify-center">
        <MascotBubble
          text="Retrouve ici les échanges de tes tablées."
          :image="illustration"
          :size="104"
        />
      </div>
    </div>
  </div>
</template>
