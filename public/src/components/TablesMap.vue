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
let derniereCle = '';

function pinIcon(selected: boolean, table: Table): L.DivIcon {
  const size = selected ? 46 : 38;
  const bordure = selected ? '#B8442A' : '#FAF7F2';
  const contenu = table.dishImageUrl
    ? `<img src="${table.dishImageUrl}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" />`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:18px;">🍽️</span>`;
  return L.divIcon({
    className: '',
    html: `<span style="
      display:block;width:${size}px;height:${size}px;border-radius:9999px;overflow:hidden;
      background:#FAF7F2;border:2px solid ${bordure};
      box-shadow:0 2px 8px rgba(43,43,43,.28);">${contenu}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function render() {
  if (!map || !layer) return;
  layer.clearLayers();
  const bounds: L.LatLngExpression[] = [];
  props.tables.forEach((table) => {
    const { latitude, longitude } = table.location.coordinates;
    const marker = L.marker([latitude, longitude], {
      icon: pinIcon(table.id === props.selectedId, table),
      title: table.dishName,
    });
    marker.on('click', () => emit('select', table.id));
    if (table.distanceMeters != null) {
      marker.bindTooltip(formatDistance(table.distanceMeters), { direction: 'top', offset: [0, -30] });
    }
    marker.addTo(layer as L.LayerGroup);
    bounds.push([latitude, longitude]);
  });
  // On ne recadre que lorsque l'ensemble des tablées change (nouvelle recherche),
  // pas quand seule la sélection change : le zoom de l'utilisateur persiste.
  const cle = props.tables.map((t) => t.id).sort().join('|');
  if (cle !== derniereCle) {
    derniereCle = cle;
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 15 });
    else map.setView([props.center.lat, props.center.lng], 14);
  }
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
  derniereCle = '';
  render();
  requestAnimationFrame(() => map?.invalidateSize());
});

watch(() => [props.tables, props.selectedId], render);
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
