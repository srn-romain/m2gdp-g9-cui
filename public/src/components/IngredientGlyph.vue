<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ label: string; size?: number }>(), { size: 48 });

const CATALOGUE: Array<{ match: RegExp; glyph: string }> = [
  { match: /pomme de terre|patate/i, glyph: '🥔' },
  { match: /beurre|margarine/i, glyph: '🧈' },
  { match: /fromage|gruy|parmesan|mozzarella|feta|chèvre|chevre|comté|comte/i, glyph: '🧀' },
  { match: /lait|crème|creme|yaourt|beurre blanc/i, glyph: '🥛' },
  { match: /œuf|oeuf/i, glyph: '🥚' },
  { match: /oignon|échalote|echalote/i, glyph: '🧅' },
  { match: /ail/i, glyph: '🧄' },
  { match: /tomate/i, glyph: '🍅' },
  { match: /carotte/i, glyph: '🥕' },
  { match: /poivron|piment/i, glyph: '🫑' },
  { match: /courgette|concombre/i, glyph: '🥒' },
  { match: /aubergine/i, glyph: '🍆' },
  { match: /champignon|truffe/i, glyph: '🍄' },
  { match: /salade|épinard|epinard|légume|legume|chou|blette/i, glyph: '🥬' },
  { match: /citron/i, glyph: '🍋' },
  { match: /pomme|poire|cerise|fruit|fraise/i, glyph: '🍎' },
  { match: /pain|farine|boulgour|semoule/i, glyph: '🌾' },
  { match: /riz/i, glyph: '🍚' },
  { match: /pâte|pate|nouille|spaghetti|tagliatelle|gnocchi/i, glyph: '🍝' },
  { match: /poisson|saumon|cabillaud|colin|truite|sardine|morue|crevette|fruit de mer/i, glyph: '🐟' },
  { match: /poulet|volaille|viande|bœuf|boeuf|veau|porc|agneau|jambon|lardon|charcuterie|merguez/i, glyph: '🥩' },
  { match: /vin/i, glyph: '🍷' },
  { match: /boisson|jus|soda|eau/i, glyph: '🥤' },
  { match: /chocolat|cacao|sucre|dessert|mousse/i, glyph: '🍫' },
  { match: /herbe|basilic|thym|coriandre|persil|menthe|aneth|romarin|bouquet garni/i, glyph: '🌿' },
  { match: /épice|epice|curry|poivre|muscade|cumin|paprika|safran|gingembre/i, glyph: '🌶️' },
  { match: /huile|olive/i, glyph: '🫒' },
  { match: /noix|amande|cacahuète|cacahuete|noisette|pignon/i, glyph: '🥜' },
  { match: /miel/i, glyph: '🍯' },
  { match: /pois chiche|pois|haricot|lentille/i, glyph: '🫘' },
];

const glyph = computed(() => {
  const entry = CATALOGUE.find((e) => e.match.test(props.label));
  return entry?.glyph ?? '🧺';
});
</script>

<template>
  <div
    class="grid shrink-0 place-items-center rounded-full bg-sauge/12"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.5)}px` }"
    aria-hidden="true"
  >
    <span class="leading-none">{{ glyph }}</span>
  </div>
</template>
