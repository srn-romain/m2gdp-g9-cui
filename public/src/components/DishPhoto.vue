<script setup lang="ts">
import { Salad } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { dishPhotoUrl } from '@/lib/dishPhoto';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{ dishName: string; size?: number; rounded?: string; class?: string }>(),
  { size: 84, rounded: 'rounded-2xl' },
);

const failed = ref(false);
watch(() => props.dishName, () => { failed.value = false; });

const src = computed(() => dishPhotoUrl(props.dishName, props.size > 120 ? 900 : 320));
</script>

<template>
  <div
    class="shrink-0 overflow-hidden bg-ardoise/8"
    :class="cn(rounded, props.class)"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="!failed"
      :src="src"
      alt=""
      loading="lazy"
      decoding="async"
      class="size-full object-cover"
      @error="failed = true"
    />
    <div v-else class="grid size-full place-items-center text-sauge">
      <Salad class="size-6" />
    </div>
  </div>
</template>
