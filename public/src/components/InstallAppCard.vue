<script setup lang="ts">
import { Download, Share, SquarePlus } from '@lucide/vue';
import { toast } from 'vue-sonner';
import Mascot from './Mascot.vue';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/composables/useInstallPrompt';

withDefaults(defineProps<{ dismissible?: boolean }>(), { dismissible: false });

const { platform, canPrompt, isInstalled, promptInstall, dismiss } = useInstallPrompt();

async function install() {
  const outcome = await promptInstall();
  if (outcome === 'accepted') toast.success('Installation lancée.');
  else if (outcome === 'unavailable') toast.error("Ton navigateur ne propose pas l'installation.");
}
</script>

<template>
  <section v-if="!isInstalled" class="rounded-2xl border border-ardoise/10 p-4">
    <div class="flex items-center gap-3">
      <Mascot pose="cheer" :size="64" />
      <div class="min-w-0 flex-1">
        <h2 class="text-title-sm font-titres text-sauge-fonce">Installer l'application</h2>
        <p class="text-micro text-secondaire">
          Plein écran, icône sur ton écran d'accueil, et consultation hors ligne.
        </p>
      </div>
    </div>

    <Button v-if="canPrompt" size="default" class="mt-3 w-full" @click="install">
      <Download data-icon="inline-start" />
      Installer
    </Button>

    <ol v-else-if="platform === 'ios'" class="mt-3 flex flex-col gap-2">
      <li class="flex items-center gap-2 text-body-md text-ardoise">
        <Share class="size-4 shrink-0 text-sauge" :stroke-width="1.75" />
        Appuie sur l'icône Partager dans Safari
      </li>
      <li class="flex items-center gap-2 text-body-md text-ardoise">
        <SquarePlus class="size-4 shrink-0 text-sauge" :stroke-width="1.75" />
        Choisis « Sur l'écran d'accueil »
      </li>
    </ol>

    <p v-else class="mt-3 text-body-sm text-secondaire">
      Ouvre le menu du navigateur, puis choisis « Installer l'application » ou
      « Ajouter à l'écran d'accueil ».
    </p>

    <button
      v-if="dismissible"
      type="button"
      class="mt-3 text-micro text-secondaire underline-offset-4 hover:underline"
      @click="dismiss"
    >
      Plus tard
    </button>
  </section>
</template>
