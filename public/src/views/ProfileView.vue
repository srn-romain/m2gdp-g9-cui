<script setup lang="ts">
import { ChevronRight, Leaf, LogOut, MapPin, Utensils } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import AddressField from '@/components/AddressField.vue';
import AppBar from '@/components/AppBar.vue';
import InstallAppCard from '@/components/InstallAppCard.vue';
import MascotBubble from '@/components/MascotBubble.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAddressSearch, type Adresse } from '@/composables/useAddressSearch';
import { listMyTables } from '@/lib/api';
import { DIETARY_OPTIONS, formatDietary, initials } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { useMeStore } from '@/stores/me';

const router = useRouter();
const meStore = useMeStore();
const authStore = useAuthStore();

const upcomingCount = ref<number | null>(null);
const preferencesOpen = ref(false);
const preferences = ref<string[]>([]);
const saving = ref(false);

const { chercherUne } = useAddressSearch();
const adresseOpen = ref(false);
const adresseTexte = ref('');
const adresseChoisie = ref<Adresse | null>(null);
const savingAdresse = ref(false);

const profile = computed(() => meStore.profile);
const fullName = computed(() =>
  profile.value ? `${profile.value.firstName} ${profile.value.lastName}`.trim() : '',
);

function togglePreference(value: string, checked: boolean) {
  const next = new Set(preferences.value);
  if (checked) next.add(value);
  else next.delete(value);
  preferences.value = [...next];
}

/** On repart d'un champ vide : l'adresse actuelle reste affichée au-dessus. */
function ouvrirAdresse() {
  adresseTexte.value = '';
  adresseChoisie.value = null;
  adresseOpen.value = true;
}

/**
 * L'adresse choisie porte le quartier, la ville et les coordonnées : c'est ce trio
 * qui alimente les distances des tablées et la météo du quartier.
 */
async function saveAdresse() {
  const adresse = adresseChoisie.value ?? (await chercherUne(adresseTexte.value));
  if (!adresse) {
    toast.error('Adresse introuvable. Précise la rue ou la ville.');
    return;
  }
  savingAdresse.value = true;
  try {
    await meStore.save({
      neighborhood: adresse.quartier,
      city: adresse.ville,
      coordinates: { latitude: adresse.latitude, longitude: adresse.longitude },
    });
    toast.success('Adresse mise à jour.');
    adresseOpen.value = false;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "La mise à jour a échoué.");
  } finally {
    savingAdresse.value = false;
  }
}

async function savePreferences() {
  saving.value = true;
  try {
    await meStore.save({ dietaryPreferences: preferences.value as never });
    toast.success('Préférences enregistrées.');
    preferencesOpen.value = false;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "L'enregistrement a échoué.");
  } finally {
    saving.value = false;
  }
}

async function logout() {
  await authStore.logout();
  meStore.reset();
  await router.replace('/login');
}

onMounted(async () => {
  const me = await meStore.load(true);
  preferences.value = [...(me?.dietaryPreferences ?? [])];
  try {
    const page = await listMyTables('upcoming', 1, 1);
    upcomingCount.value = page.pagination.totalItems;
  } catch {
    upcomingCount.value = null;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col">
    <AppBar />

    <div class="app-pad flex flex-1 flex-col gap-5 pb-6">
      <div v-if="!profile" class="flex flex-col gap-3">
        <Skeleton class="h-20 w-full rounded-2xl" />
      </div>

      <template v-else>
        <div class="flex items-center gap-3">
          <Avatar class="size-16 bg-terracotta/12">
            <AvatarImage v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="fullName" />
            <AvatarFallback class="text-button-md text-terracotta">
              {{ initials(profile.firstName, profile.lastName) }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <h1 class="truncate text-display-lg font-titres text-sauge">{{ fullName }}</h1>
            <p class="text-micro text-secondaire">{{ profile.neighborhood }} · {{ profile.email }}</p>
          </div>
        </div>

        <MascotBubble text="Tout est au même endroit !" pose="cheer" :size="92" />

        <InstallAppCard />

        <nav class="flex flex-col">
          <RouterLink
            to="/"
            class="flex items-center gap-3 border-b border-ardoise/10 py-4 transition-colors hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <Utensils class="size-5 shrink-0 text-sauge" :stroke-width="1.75" />
            <span class="flex-1">
              <span class="block text-body-md text-ardoise">Mes tablées</span>
              <span class="block text-micro text-secondaire">
                {{ upcomingCount == null ? '—' : `${upcomingCount} à venir` }}
              </span>
            </span>
            <ChevronRight class="size-4 text-secondaire" />
          </RouterLink>

          <button
            type="button"
            class="flex items-center gap-3 border-b border-ardoise/10 py-4 text-left transition-colors hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            @click="ouvrirAdresse"
          >
            <MapPin class="size-5 shrink-0 text-sauge" :stroke-width="1.75" />
            <span class="flex-1">
              <span class="block text-body-md text-ardoise">Mon adresse</span>
              <span class="block text-micro text-secondaire">
                {{ profile.neighborhood }} · {{ profile.city }}
              </span>
            </span>
            <ChevronRight class="size-4 text-secondaire" />
          </button>

          <button
            type="button"
            class="flex items-center gap-3 border-b border-ardoise/10 py-4 text-left transition-colors hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            @click="preferencesOpen = true"
          >
            <Leaf class="size-5 shrink-0 text-sauge" :stroke-width="1.75" />
            <span class="flex-1">
              <span class="block text-body-md text-ardoise">Préférences alimentaires</span>
              <span class="block text-micro text-secondaire">{{ formatDietary(profile.dietaryPreferences) }}</span>
            </span>
            <ChevronRight class="size-4 text-secondaire" />
          </button>
        </nav>

        <Button variant="ghost" size="default" class="mt-auto w-full justify-start" @click="logout">
          <LogOut data-icon="inline-start" />
          Se déconnecter
        </Button>
      </template>
    </div>

    <Drawer v-model:open="preferencesOpen">
      <DrawerContent class="bg-creme">
        <DrawerHeader class="app-pad text-left">
          <DrawerTitle class="text-title-lg font-titres text-sauge">Préférences alimentaires</DrawerTitle>
          <DrawerDescription class="text-body-sm text-secondaire">
            Tes voisins les voient pour composer le repas.
          </DrawerDescription>
        </DrawerHeader>
        <div class="app-pad flex flex-col gap-1 pb-2">
          <label
            v-for="option in DIETARY_OPTIONS"
            :key="option.value"
            class="flex items-center justify-between gap-3 rounded-xl px-2 py-3"
          >
            <span class="text-body-md text-ardoise">{{ option.label }}</span>
            <Switch
              :model-value="preferences.includes(option.value)"
              @update:model-value="(checked) => togglePreference(option.value, Boolean(checked))"
            />
          </label>
        </div>
        <DrawerFooter class="app-pad pb-8">
          <Button size="lg" class="w-full" :disabled="saving" @click="savePreferences">
            {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>

    <Drawer v-model:open="adresseOpen">
      <DrawerContent class="bg-creme">
        <DrawerHeader class="app-pad text-left">
          <DrawerTitle class="text-title-lg font-titres text-sauge">Mon adresse</DrawerTitle>
          <DrawerDescription class="text-body-sm text-secondaire">
            Elle sert à calculer les distances des tablées et la météo de ton quartier.
          </DrawerDescription>
        </DrawerHeader>

        <div class="app-pad flex flex-col gap-4 pb-2">
          <p class="text-body-sm text-secondaire">
            Adresse actuelle :
            <span class="text-ardoise">{{ profile?.neighborhood }} · {{ profile?.city }}</span>
          </p>
          <Field>
            <FieldLabel for="profile-address">Nouvelle adresse</FieldLabel>
            <AddressField
              id="profile-address"
              v-model="adresseTexte"
              placeholder="12 rue de la République, Lyon"
              @select="adresseChoisie = $event"
            />
            <FieldDescription>
              Choisis une suggestion : le quartier, la ville et les coordonnées suivent.
            </FieldDescription>
          </Field>
        </div>

        <DrawerFooter class="app-pad pb-8">
          <Button
            size="lg"
            class="w-full"
            :disabled="savingAdresse || adresseTexte.trim().length < 3"
            @click="saveAdresse"
          >
            {{ savingAdresse ? 'Enregistrement…' : "Mettre à jour l'adresse" }}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  </div>
</template>
