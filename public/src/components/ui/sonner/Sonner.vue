<script lang="ts" setup>
import type { ToasterProps } from "vue-sonner"
import { reactiveOmit } from "@vueuse/core"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from "@lucide/vue"
import { Toaster as Sonner } from "vue-sonner"

const props = defineProps<ToasterProps>()
const delegatedProps = reactiveOmit(props, "toastOptions")
</script>

<template>
  <Sonner
    class="toaster group"
    v-bind="delegatedProps"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-5 shrink-0" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-5 shrink-0" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-5 shrink-0" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-5 shrink-0" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-5 shrink-0 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4 shrink-0" />
    </template>
  </Sonner>
</template>
