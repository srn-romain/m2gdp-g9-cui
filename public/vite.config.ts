import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Alias résolu sans dépendre de Node : évite d'ajouter @types/node pour la CI.
const srcPath = decodeURIComponent(new URL('./src', import.meta.url).pathname);

export default defineConfig({
  root: '.',
  publicDir: 'static',
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 5173 },
  resolve: { alias: { '@': srcPath } },
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'La Bonne Tablée',
        short_name: 'Tablée',
        description:
          'Trouve une tablée près de chez toi, dis ce que tu apportes, rejoins tes voisins.',
        lang: 'fr',
        theme_color: '#DB5A3B',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['food', 'social', 'lifestyle'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Explorer les tablées', short_name: 'Explorer', url: '/explorer' },
          { name: 'Créer une tablée', short_name: 'Créer', url: '/creer' },
        ],
      },
      workbox: {
        // Active immédiatement le nouveau service worker : les visiteurs reçoivent
        // les corrections sans avoir à fermer/réouvrir l'onglet.
        skipWaiting: true,
        clientsClaim: true,
        // Les illustrations importées depuis src/assets doivent être disponibles hors ligne.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        // Pas de fallback de navigation : l'index.html est servi par le réseau
        // (no-cache), donc les visiteurs voient toujours la dernière version.
        navigateFallback: null as unknown as string,
        // Sans ce nettoyage, un déploiement laisse l'ancien précache en place et
        // l'onglet ouvert réclame des chunks qui n'existent plus.
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 31_536_000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          { urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 100, maxAgeSeconds: 2592000 } } },
          {
            // Météo : mise en cache 30 min, tolérante au hors-ligne.
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'meteo', networkTimeoutSeconds: 5, expiration: { maxEntries: 4, maxAgeSeconds: 1800 } },
          },
          {
            // Recherche d'adresse (Base Adresse Nationale) : réponses courtes, utiles hors-ligne.
            urlPattern: /^https:\/\/api-adresse\.data\.gouv\.fr\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'adresses', networkTimeoutSeconds: 5, expiration: { maxEntries: 30, maxAgeSeconds: 86400 } },
          },
          { urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i, handler: 'CacheFirst', options: { cacheName: 'osm', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 } } },
        ],
      },
    }),
  ],
});
