<script setup lang="ts">
import { Camera, ChevronRight, Leaf, LogOut, MapPin, TriangleAlert, User, Utensils } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import illustration from '@/assets/bonjour.png';
import AddressField from '@/components/AddressField.vue';
import AppBar from '@/components/AppBar.vue';
import InstallAppCard from '@/components/InstallAppCard.vue';
import MascotBubble from '@/components/MascotBubble.vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAddressSearch, type Adresse } from '@/composables/useAddressSearch';
import { listMyTables, mediaUrl, presignMedia, uploadMedia } from '@/lib/api';
import { DIETARY_OPTIONS, formatDietary, initials } from '@/lib/format';
import { DEMO_MODE } from '@/lib/mock';
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

const champAvatar = ref<HTMLInputElement | null>(null);
const uploadingAvatar = ref(false);

const identityOpen = ref(false);
const prenom = ref('');
const nom = ref('');
const aPropos = ref('');
const savingIdentity = ref(false);

const profile = computed(() => meStore.profile);
const fullName = computed(() =>
  profile.value ? `${profile.value.firstName} ${profile.value.lastName}`.trim() : '',
);
const nomIncomplet = computed(
  () => !profile.value?.firstName || !profile.value?.lastName,
);
const adresseIncomplete = computed(
  () => !profile.value?.neighborhood || !profile.value?.city,
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

/** Photo de profil : R2 (URL signée ou Worker en repli), puis PATCH /me. */
async function choisirAvatar(evenement: Event) {
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
  uploadingAvatar.value = true;
  try {
    let avatarUrl: string;
    if (DEMO_MODE) {
      // Démo : pas de stockage, on garde l'image en data URL pour l'aperçu.
      avatarUrl = await new Promise<string>((resolve) => {
        const lecteur = new FileReader();
        lecteur.onload = () => resolve(String(lecteur.result));
        lecteur.readAsDataURL(fichier);
      });
    } else {
      const { key, uploadUrl } = await presignMedia('avatar', fichier.type, fichier.size);
      await uploadMedia(uploadUrl, fichier, fichier.type);
      avatarUrl = mediaUrl(key);
    }
    await meStore.save({ avatarUrl });
    toast.success('Photo de profil mise à jour.');
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "L'envoi de la photo a échoué.");
  } finally {
    uploadingAvatar.value = false;
  }
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

/** Ouvre le formulaire d'identité prérempli avec le profil courant. */
function ouvrirIdentite() {
  prenom.value = profile.value?.firstName ?? '';
  nom.value = profile.value?.lastName ?? '';
  aPropos.value = profile.value?.about ?? '';
  identityOpen.value = true;
}

async function saveIdentity() {
  const first = prenom.value.trim();
  const last = nom.value.trim();
  if (!first || !last) {
    toast.error('Renseigne ton prénom et ton nom.');
    return;
  }
  savingIdentity.value = true;
  try {
    await meStore.save({ firstName: first, lastName: last, about: aPropos.value.trim() || null });
    toast.success('Informations enregistrées.');
    identityOpen.value = false;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "L'enregistrement a échoué.");
  } finally {
    savingIdentity.value = false;
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
  prenom.value = me?.firstName ?? '';
  nom.value = me?.lastName ?? '';
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
          <span class="relative inline-flex size-16 shrink-0">
            <span
              v-if="!profile.avatarUrl"
              class="absolute -top-1 -right-1 z-10 size-3 rounded-full border-2 border-creme bg-terracotta"
              aria-label="Photo de profil à compléter"
            ></span>
            <Avatar class="size-16 bg-terracotta/12">
              <AvatarImage
                v-if="profile.avatarUrl"
                :src="profile.avatarUrl"
                :alt="fullName"
                class="size-full object-cover"
              />
              <AvatarFallback class="text-button-md text-terracotta">
                {{ initials(profile.firstName, profile.lastName) }}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              class="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border-2 border-creme bg-sauge text-creme transition-colors hover:bg-sauge-fonce disabled:opacity-60"
              :disabled="uploadingAvatar"
              aria-label="Changer la photo de profil"
              @click="champAvatar?.click()"
            >
              <Camera class="size-3.5" :stroke-width="2.25" />
            </button>
            <input
              ref="champAvatar"
              type="file"
              accept="image/*"
              class="hidden"
              @change="choisirAvatar"
            />
          </span>
          <div class="min-w-0">
            <h1 class="truncate text-display-lg font-titres text-sauge">{{ fullName }}</h1>
            <p class="text-micro text-secondaire">{{ profile.neighborhood }} · {{ profile.email }}</p>
          </div>
        </div>

        <div
          v-if="!meStore.isOnboarded"
          class="flex items-start gap-2 rounded-2xl border border-terracotta/30 bg-terracotta/10 p-3"
        >
          <TriangleAlert class="mt-0.5 size-5 shrink-0 text-terracotta" :stroke-width="1.75" />
          <p class="text-body-sm text-ardoise">
            Ton profil est incomplet : renseigne ton prénom, ton nom, ton adresse et ta
            photo de profil pour pouvoir rejoindre ou créer une tablée.
          </p>
        </div>

        <MascotBubble text="Tout est au même endroit !" :image="illustration" :size="104" />

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
            @click="ouvrirIdentite"
          >
            <User class="size-5 shrink-0 text-sauge" :stroke-width="1.75" />
            <span class="flex-1">
              <span class="flex items-center gap-1.5 text-body-md text-ardoise">
                Mes informations
                <span v-if="nomIncomplet" class="size-2 rounded-full bg-terracotta" aria-label="À compléter"></span>
              </span>
              <span class="block text-micro text-secondaire">
                {{ fullName || 'Prénom et nom à compléter' }}
              </span>
            </span>
            <ChevronRight class="size-4 text-secondaire" />
          </button>

          <button
            type="button"
            class="flex items-center gap-3 border-b border-ardoise/10 py-4 text-left transition-colors hover:bg-ardoise/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            @click="ouvrirAdresse"
          >
            <MapPin class="size-5 shrink-0 text-sauge" :stroke-width="1.75" />
            <span class="flex-1">
              <span class="flex items-center gap-1.5 text-body-md text-ardoise">
                Mon adresse
                <span v-if="adresseIncomplete" class="size-2 rounded-full bg-terracotta" aria-label="À compléter"></span>
              </span>
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

        <InstallAppCard />

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

    <Drawer v-model:open="identityOpen">
      <DrawerContent class="bg-creme">
        <DrawerHeader class="app-pad text-left">
          <DrawerTitle class="text-title-lg font-titres text-sauge">Mes informations</DrawerTitle>
          <DrawerDescription class="text-body-sm text-secondaire">
            Ton prénom s'affiche sur les tablées que tu proposes ou rejoins.
          </DrawerDescription>
        </DrawerHeader>

        <div class="app-pad flex flex-col gap-4 pb-2">
          <FieldGroup class="gap-3">
            <Field>
              <FieldLabel for="profile-firstname">Prénom</FieldLabel>
              <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
                <InputGroupInput
                  id="profile-firstname"
                  v-model="prenom"
                  autocomplete="given-name"
                  class="text-body-md"
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel for="profile-lastname">Nom</FieldLabel>
              <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
                <InputGroupInput
                  id="profile-lastname"
                  v-model="nom"
                  autocomplete="family-name"
                  class="text-body-md"
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel for="profile-about">À propos de toi</FieldLabel>
              <Textarea
                id="profile-about"
                v-model="aPropos"
                rows="3"
                placeholder="Quelques mots pour te présenter à tes voisins."
                class="rounded-xl border-ardoise/12 bg-creme text-body-md"
              />
            </Field>
          </FieldGroup>
        </div>

        <DrawerFooter class="app-pad pb-8">
          <Button
            size="lg"
            class="w-full"
            :disabled="savingIdentity || !prenom.trim() || !nom.trim()"
            @click="saveIdentity"
          >
            {{ savingIdentity ? 'Enregistrement…' : 'Enregistrer' }}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  </div>
</template>
