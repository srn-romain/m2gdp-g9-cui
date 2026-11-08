<script setup lang="ts">
import L from 'leaflet';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { formatDistance } from '@/lib/format';
import type { Table } from '@/lib/types';

const props = defineProps<{
  tables: Table[];
  center: { lat: number; lng: number };
  selectedId?: string | null;
}>();

const emit = defineEmits<{ (e: 'select', id: string): void }>();

const container = ref<HTMLElement | null>(null);
let map: L.Map | null = null;
let layer: L.LayerGroup | null = null;

function pinIcon(selected: boolean, label: string): L.DivIcon {
  // Toutes les épingles restent terracotta (maquette) : la sélection est plus foncée.
  const background = selected ? '#B8442A' : '#DB5A3B';
  const scale = selected ? 1.12 : 1;
  return L.divIcon({
    className: '',
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:${Math.round(34 * scale)}px;height:${Math.round(34 * scale)}px;
      border-radius:9999px 9999px 9999px 4px;transform:rotate(-45deg);
      background:${background};border:2px solid #FAF7F2;
      box-shadow:0 2px 8px rgba(43,43,43,.28);">
      <span style="transform:rotate(45deg);font-family:'DM Sans',sans-serif;font-weight:700;font-size:11px;color:#FAF7F2;">${label}</span>
    </span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

function render() {
  if (!map || !layer) return;
  layer.clearLayers();
  const bounds: L.LatLngExpression[] = [];
  props.tables.forEach((table, index) => {
    const { latitude, longitude } = table.location.coordinates;
    const marker = L.marker([latitude, longitude], {
      icon: pinIcon(table.id === props.selectedId, String(index + 1)),
      title: table.dishName,
    });
    marker.on('click', () => emit('select', table.id));
    if (table.distanceMeters != null) {
      marker.bindTooltip(formatDistance(table.distanceMeters), { direction: 'top', offset: [0, -28] });
    }
    marker.addTo(layer as L.LayerGroup);
    bounds.push([latitude, longitude]);
  });
  if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 15 });
  else map.setView([props.center.lat, props.center.lng], 14);
}

onMounted(() => {
  if (!container.value) return;
  map = L.map(container.value, { zoomControl: false, attributionControl: true }).setView(
    [props.center.lat, props.center.lng],
    14,
  );
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);
  layer = L.layerGroup().addTo(map);
  render();
  // Le cadre est dimensionné par la mise en page flex : on resynchronise après le rendu.
  requestAnimationFrame(() => map?.invalidateSize());
});

watch(() => [props.tables, props.selectedId], render, { deep: false });
watch(
  () => props.center,
  (center) => {
    if (map && !props.tables.length) map.setView([center.lat, center.lng], 14);
  },
);

onBeforeUnmount(() => {
  map?.remove();
  map = null;
  layer = null;
});
</script>

<template>
  <div ref="container" class="absolute inset-0" role="application" aria-label="Carte des tablées" />
</template>
