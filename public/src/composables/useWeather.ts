import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from '@lucide/vue';
import type { Component } from 'vue';
import { ref, watch, type Ref } from 'vue';
import type { Coordinates } from '@/lib/types';

export interface Meteo {
  temperature: number;
  label: string;
  icone: Component;
}

/** Codes WMO renvoyés par Open-Meteo, traduits pour l'interface. */
const TEMPS: Array<[number[], string, Component]> = [
  [[0], 'Ensoleillé', Sun],
  [[1], 'Plutôt dégagé', CloudSun],
  [[2], 'Partiellement nuageux', CloudSun],
  [[3], 'Couvert', Cloud],
  [[45, 48], 'Brouillard', CloudFog],
  [[51, 53, 55, 56, 57], 'Bruine', CloudDrizzle],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Pluie', CloudRain],
  [[71, 73, 75, 77, 85, 86], 'Neige', CloudSnow],
  [[95, 96, 99], 'Orage', CloudLightning],
];

export function decrire(code: number): { label: string; icone: Component } {
  const trouve = TEMPS.find(([codes]) => codes.includes(code));
  return trouve ? { label: trouve[1], icone: trouve[2] } : { label: 'Temps calme', icone: Cloud };
}

const CLE_CACHE = 'lbt.meteo';
const DUREE_CACHE = 30 * 60 * 1000;

function lireCache(cle: string): Meteo | null {
  try {
    const brut = window.sessionStorage.getItem(CLE_CACHE);
    if (!brut) return null;
    const enregistre = JSON.parse(brut) as {
      cle: string;
      quand: number;
      code: number;
      temperature: number;
    };
    if (enregistre.cle !== cle || Date.now() - enregistre.quand > DUREE_CACHE) return null;
    return { temperature: enregistre.temperature, ...decrire(enregistre.code) };
  } catch {
    return null;
  }
}

/**
 * Météo du quartier via Open-Meteo : service public, sans clé ni compte.
 * La position est arrondie à ~1 km : inutile de transmettre une position précise.
 */
export function useWeather(coordinates: Ref<Coordinates | null | undefined>) {
  const meteo = ref<Meteo | null>(null);

  async function charger() {
    const co = coordinates.value;
    if (!co) return;
    const lat = Number(co.latitude.toFixed(2));
    const lon = Number(co.longitude.toFixed(2));
    const cle = `${lat},${lon}`;

    const enCache = lireCache(cle);
    if (enCache) {
      meteo.value = enCache;
      return;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
      const reponse = await fetch(url);
      if (!reponse.ok) return;
      const json = (await reponse.json()) as {
        current?: { temperature_2m?: number; weather_code?: number };
      };
      const code = json.current?.weather_code;
      const temperature = json.current?.temperature_2m;
      if (code === undefined || temperature === undefined) return;
      meteo.value = { temperature: Math.round(temperature), ...decrire(code) };
      window.sessionStorage.setItem(
        CLE_CACHE,
        JSON.stringify({ cle, quand: Date.now(), code, temperature: meteo.value.temperature }),
      );
    } catch {
      // Service injoignable : pas de météo, la pastille ne s'affiche pas.
      meteo.value = null;
    }
  }

  watch(coordinates, charger, { immediate: true });

  return { meteo };
}
