import { ref } from 'vue';

/** Point de recherche : position du navigateur, sinon coordonnées du profil. */
export function usePosition() {
  const latitude = ref<number | null>(null);
  const longitude = ref<number | null>(null);
  const locating = ref(false);

  function locate(): Promise<{ latitude: number; longitude: number } | null> {
    if (!('geolocation' in navigator)) return Promise.resolve(null);
    locating.value = true;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          latitude.value = position.coords.latitude;
          longitude.value = position.coords.longitude;
          locating.value = false;
          resolve({ latitude: latitude.value, longitude: longitude.value });
        },
        () => {
          locating.value = false;
          resolve(null);
        },
        { timeout: 8000, maximumAge: 600_000 },
      );
    });
  }

  function set(coordinates: { latitude: number; longitude: number } | null | undefined) {
    if (!coordinates) return;
    latitude.value = coordinates.latitude;
    longitude.value = coordinates.longitude;
  }

  return { latitude, longitude, locating, locate, set };
}
