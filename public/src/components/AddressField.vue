<script setup lang="ts">
import { MapPin } from '@lucide/vue';
import { ref, watch } from 'vue';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { useAddressSearch, type Adresse } from '@/composables/useAddressSearch';
import { CHAMP, ICONE_CHAMP } from '@/lib/styles';

/**
 * Champ d'adresse avec autocomplétion (API Adresse, service public français).
 * Émet `select` avec l'adresse complète : libellé, ville, quartier, coordonnées.
 */
withDefaults(defineProps<{ id: string; placeholder?: string }>(), { placeholder: 'adresse' });

const modele = defineModel<string>({ required: true });
const emit = defineEmits<{ (e: 'select', adresse: Adresse): void }>();

const { suggestions, chargement, rechercher, vider } = useAddressSearch();
const ouvert = ref(false);
const actif = ref(-1);
let choixEnCours = false;

watch(modele, (valeur) => {
  if (choixEnCours) {
    choixEnCours = false;
    return;
  }
  rechercher(valeur);
  actif.value = -1;
  ouvert.value = valeur.trim().length >= 3;
});

function choisir(suggestion: Adresse) {
  choixEnCours = true;
  modele.value = suggestion.label;
  ouvert.value = false;
  vider();
  emit('select', suggestion);
}

function surTouche(evenement: KeyboardEvent) {
  if (!ouvert.value || !suggestions.value.length) return;
  if (evenement.key === 'ArrowDown') {
    evenement.preventDefault();
    actif.value = (actif.value + 1) % suggestions.value.length;
  } else if (evenement.key === 'ArrowUp') {
    evenement.preventDefault();
    actif.value = actif.value <= 0 ? suggestions.value.length - 1 : actif.value - 1;
  } else if (evenement.key === 'Enter' && actif.value >= 0) {
    evenement.preventDefault();
    choisir(suggestions.value[actif.value]);
  } else if (evenement.key === 'Escape') {
    ouvert.value = false;
  }
}

/** Ferme la liste après le clic sur une suggestion (mousedown passe avant blur). */
function fermerAvecDelai() {
  window.setTimeout(() => {
    ouvert.value = false;
  }, 120);
}
</script>

<template>
  <div class="relative">
    <InputGroup :class="CHAMP">
      <InputGroupAddon align="inline-start">
        <MapPin :class="ICONE_CHAMP" :stroke-width="1.6" />
      </InputGroupAddon>
      <InputGroupInput
        :id="id"
        v-model="modele"
        :placeholder="placeholder"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        :aria-expanded="ouvert && suggestions.length > 0"
        :aria-controls="`${id}-suggestions`"
        class="text-body-md"
        @keydown="surTouche"
        @focus="ouvert = modele.trim().length >= 3"
        @blur="fermerAvecDelai"
      />
    </InputGroup>

    <p v-if="chargement" class="px-2 pt-1 text-micro text-secondaire">Recherche…</p>

    <ul
      v-if="ouvert && suggestions.length"
      :id="`${id}-suggestions`"
      role="listbox"
      class="absolute z-40 mt-1 w-full overflow-hidden rounded-2xl border border-ardoise/10 bg-surface shadow-[0_8px_24px_rgba(43,43,43,.14)]"
    >
      <li v-for="(suggestion, index) in suggestions" :key="suggestion.label" role="option" :aria-selected="index === actif">
        <button
          type="button"
          class="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors"
          :class="index === actif ? 'bg-sauge/10' : 'hover:bg-ardoise/5'"
          @mousedown.prevent="choisir(suggestion)"
        >
          <span class="text-body-sm text-ardoise">{{ suggestion.nom }}</span>
          <span class="text-micro text-secondaire">
            {{ suggestion.codePostal }} {{ suggestion.ville }}
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
