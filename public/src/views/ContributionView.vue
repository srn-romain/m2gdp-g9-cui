<script setup lang="ts">
import { Check, ShoppingBasket } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import AppBar from '@/components/AppBar.vue';
import DishPhoto from '@/components/DishPhoto.vue';
import Stepper from '@/components/Stepper.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getTable, joinTable } from '@/lib/api';
import { formatQuantity, tableTitle } from '@/lib/format';
import type { ContributionCategory, QuantityUnit, Table } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Suggestion {
  label: string;
  category: ContributionCategory;
  unit: QuantityUnit;
}

/** Apports courants. Le libellé reste libre : l'API accepte n'importe quelle chaîne. */
const SUGGESTIONS: Suggestion[] = [
  { label: 'Pommes de terre', category: 'INGREDIENT', unit: 'KG' },
  { label: 'Salade verte', category: 'APPETIZER', unit: 'UNIT' },
  { label: 'Pain de campagne', category: 'INGREDIENT', unit: 'UNIT' },
  { label: 'Boisson', category: 'DRINK', unit: 'L' },
  { label: 'Dessert', category: 'DESSERT', unit: 'UNIT' },
];

const UNIT_OPTIONS: Array<{ value: QuantityUnit; label: string }> = [
  { value: 'KG', label: 'kg' },
  { value: 'G', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'CL', label: 'cl' },
  { value: 'UNIT', label: 'unité' },
  { value: 'PORTION', label: 'portion' },
];

const route = useRoute();
const router = useRouter();
const tableId = computed(() => String(route.params.id));

const table = ref<Table | null>(null);
const loading = ref(true);
const submitting = ref(false);
const errorCode = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

const mode = ref<'ingredient' | 'none'>('ingredient');
const selectedLabel = ref<string>(SUGGESTIONS[0].label);
const selectedCategory = ref<ContributionCategory>(SUGGESTIONS[0].category);
const customLabel = ref('');
const useCustom = ref(false);
const quantity = ref(1);
const unit = ref<QuantityUnit>(SUGGESTIONS[0].unit);

/** Rejouer la requête renvoie la participation existante, jamais un doublon. */
const idempotencyKey = crypto.randomUUID();

const title = computed(() => (table.value ? tableTitle(table.value) : ''));
const hostName = computed(() => table.value?.host?.firstName ?? 'ton hôte');
const finalLabel = computed(() => (useCustom.value ? customLabel.value.trim() : selectedLabel.value));
const canSubmit = computed(() => mode.value === 'none' || finalLabel.value.length > 0);

function pick(suggestion: Suggestion) {
  useCustom.value = false;
  selectedLabel.value = suggestion.label;
  selectedCategory.value = suggestion.category;
  unit.value = suggestion.unit;
  quantity.value = 1;
  mode.value = 'ingredient';
}

const CONFLICT_MESSAGES: Record<string, string> = {
  TABLE_FULL: 'Cette tablée vient d’être complète.',
  TABLE_CLOSED: 'Cette tablée a été annulée.',
  TABLE_PASSED: 'Cette tablée est déjà passée.',
  ALREADY_PARTICIPATING: 'Tu participes déjà à cette tablée.',
};

async function submit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  errorCode.value = null;
  errorMessage.value = null;
  const contribution =
    mode.value === 'none'
      ? { label: 'Je ne fais pas les courses', category: 'NONE' as ContributionCategory }
      : {
          label: finalLabel.value,
          category: selectedCategory.value,
          quantity: quantity.value,
          unit: unit.value,
        };
  try {
    await joinTable(tableId.value, { contribution }, idempotencyKey);
    await router.replace(`/tables/${tableId.value}/confirme`);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    errorCode.value = err.code ?? null;
    errorMessage.value = err.message ?? 'La participation a échoué.';
    toast.error(errorMessage.value);
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    table.value = await getTable(tableId.value);
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Tablée introuvable.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex flex-1 flex-col pb-8">
    <AppBar back :title="'Votre contribution'" :back-to="`/tables/${tableId}`" />

    <div class="app-pad flex flex-1 flex-col gap-5">
      <Skeleton v-if="loading" class="h-20 w-full rounded-2xl" />

      <div v-else-if="table" class="flex items-center gap-3 rounded-2xl border border-ardoise/10 p-3">
        <DishPhoto :dish-name="table.dishName" :size="56" />
        <div class="min-w-0">
          <p class="truncate text-title-sm font-titres text-sauge-fonce">{{ title }}</p>
          <p class="text-micro text-secondaire">{{ table.location.neighborhood }}</p>
        </div>
      </div>

      <Alert v-if="errorCode || (!table && errorMessage)" variant="destructive">
        <AlertTitle>Participation impossible</AlertTitle>
        <AlertDescription>
          {{ (errorCode && CONFLICT_MESSAGES[errorCode]) || errorMessage }}
        </AlertDescription>
      </Alert>

      <template v-if="table">
        <div class="flex flex-col gap-1">
          <h1 class="text-title-lg font-titres text-sauge">Que peux-tu apporter&nbsp;?</h1>
          <p class="text-body-sm text-secondaire">
            Choisis ce que tu apportes, ou viens les mains libres.
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel for="contribution-custom">Je viens avec…</FieldLabel>
            <InputGroup class="h-12 rounded-xl border-ardoise/12 bg-creme">
              <InputGroupInput
                id="contribution-custom"
                v-model="customLabel"
                placeholder="Écris ta contribution"
                class="text-body-md"
                @focus="useCustom = true"
                @input="useCustom = true"
              />
            </InputGroup>
          </Field>
        </FieldGroup>

        <ul class="flex flex-col gap-2">
          <li v-for="suggestion in SUGGESTIONS" :key="suggestion.label">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors"
              :class="
                cn(
                  !useCustom && mode === 'ingredient' && selectedLabel === suggestion.label
                    ? 'border-sauge bg-sauge/10'
                    : 'border-ardoise/12 bg-creme hover:bg-ardoise/5',
                )
              "
              :aria-pressed="!useCustom && mode === 'ingredient' && selectedLabel === suggestion.label"
              @click="pick(suggestion)"
            >
              <span
                class="grid size-5 shrink-0 place-items-center rounded-full border"
                :class="
                  !useCustom && mode === 'ingredient' && selectedLabel === suggestion.label
                    ? 'border-sauge text-sauge'
                    : 'border-ardoise/25'
                "
              >
                <Check
                  v-if="!useCustom && mode === 'ingredient' && selectedLabel === suggestion.label"
                  class="size-3.5"
                  :stroke-width="3"
                />
              </span>
              <span class="flex-1 text-body-md text-ardoise">{{ suggestion.label }}</span>
              <span class="text-micro text-secondaire">{{ formatQuantity(1, suggestion.unit) }}</span>
            </button>
          </li>

          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors"
              :class="
                cn(
                  mode === 'none' ? 'border-sauge bg-sauge/10' : 'border-ardoise/12 bg-creme hover:bg-ardoise/5',
                )
              "
              :aria-pressed="mode === 'none'"
              @click="mode = 'none'"
            >
              <ShoppingBasket class="size-5 shrink-0 text-secondaire" :stroke-width="1.75" />
              <span class="flex-1">
                <span class="block text-body-md text-ardoise">Je ne fais pas les courses</span>
                <span class="block text-micro text-secondaire">Viens les mains libres.</span>
              </span>
            </button>
          </li>
        </ul>

        <template v-if="mode === 'ingredient'">
          <Separator />
          <div class="flex items-center justify-between gap-3">
            <span class="text-body-md text-ardoise">Quantité</span>
            <div class="flex items-center gap-2">
              <Stepper v-model="quantity" :min="1" :max="30" />
              <select
                v-model="unit"
                class="h-11 rounded-xl border border-ardoise/12 bg-creme px-3 text-body-md text-ardoise"
                aria-label="Unité"
              >
                <option v-for="option in UNIT_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
        </template>
      </template>
    </div>

    <div class="app-pad mt-auto pt-6">
      <Button
        size="lg"
        class="w-full"
        :disabled="submitting || !table || !canSubmit"
        @click="submit"
      >
        {{ submitting ? 'Confirmation…' : 'Confirmer ma participation' }}
      </Button>
    </div>
  </div>
</template>
