<script setup lang="ts">
import { MailCheck } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import MascotBubble from '@/components/MascotBubble.vue';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const email = computed(() => String(route.query.email ?? ''));
const resending = ref(false);

async function resend() {
  if (!email.value) return;
  resending.value = true;
  try {
    await authStore.sendMagicLink(email.value);
    toast.success('Nouveau lien envoyé.');
  } catch {
    toast.error("L'envoi a échoué. Réessaie dans un instant.");
  } finally {
    resending.value = false;
  }
}
</script>

<template>
  <div class="app-pad flex flex-1 flex-col gap-6 pt-16 pb-10">
    <div class="flex justify-center">
      <div class="grid size-20 place-items-center rounded-full bg-sauge/12 text-sauge">
        <MailCheck class="size-9" :stroke-width="1.75" />
      </div>
    </div>

    <div class="flex flex-col gap-2 text-center">
      <h1 class="text-display-lg font-titres text-sauge">Vérifie ta boîte mail</h1>
      <p class="text-body-md text-ardoise">
        Le lien de connexion part vers
        <span v-if="email" class="font-bold">{{ email }}</span>
        <span v-else>ton adresse e-mail</span>.
      </p>
      <p class="text-body-sm text-secondaire">
        Il est valable 15 minutes et ne fonctionne qu'une fois.
      </p>
    </div>

    <div class="mt-2 flex justify-center">
      <MascotBubble
        text="Ouvre le lien depuis ce téléphone pour rester connecté."
        pose="think"
        layout="stack"
      />
    </div>

    <div class="mt-auto flex flex-col gap-3">
      <Button
        variant="secondary"
        size="default"
        class="w-full"
        :disabled="resending || !email"
        @click="resend"
      >
        {{ resending ? 'Envoi…' : 'Renvoyer le lien' }}
      </Button>
      <RouterLink to="/login" class="text-center text-body-md text-secondaire underline-offset-4 hover:underline">
        Changer d'adresse
      </RouterLink>
    </div>
  </div>
</template>
