<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
  }>(),
  { min: 1, max: 30, step: 1, label: 'Quantité' },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>();

function update(delta: number) {
  const next = Math.min(props.max, Math.max(props.min, props.modelValue + delta));
  emit('update:modelValue', next);
}
</script>

<template>
  <div
    class="inline-flex items-center gap-1 rounded-full border border-ardoise/12 bg-creme p-1"
    role="group"
    :aria-label="label"
  >
    <button
      type="button"
      class="grid size-8 place-items-center rounded-full text-ardoise transition-colors hover:bg-ardoise/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      :disabled="modelValue <= min"
      aria-label="Diminuer"
      @click="update(-step)"
    >
      <Minus class="size-4" :stroke-width="2.25" />
    </button>
    <span class="min-w-8 text-center text-button-md tabular-nums" aria-live="polite">{{ modelValue }}</span>
    <button
      type="button"
      class="grid size-8 place-items-center rounded-full text-ardoise transition-colors hover:bg-ardoise/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      :disabled="modelValue >= max"
      aria-label="Augmenter"
      @click="update(step)"
    >
      <Plus class="size-4" :stroke-width="2.25" />
    </button>
  </div>
</template>
