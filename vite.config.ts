import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ask before switching to a new version, so a reload never wipes a half-filled form.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Dishlist',
        short_name: 'Dishlist',
        description: 'Rate the dish, not the restaurant. Remember what to order next time, and how.',
        theme_color: '#d4321a',
        background_color: '#fff7ef',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache the whole app shell so it opens with no connection.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
        // Firebase Hosting's reserved URLs (e.g. the /__/auth sign-in handler) must reach the network.
        navigateFallbackDenylist: [/^\/__\//],
        runtimeCaching: [
          {
            // Meal photos: cache once seen, so they still show offline.
            urlPattern: ({ url }) => url.hostname === 'firebasestorage.googleapis.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'meal-photos',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true },
              // <img> requests are cross-origin without CORS, so responses are opaque (status 0).
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Security rules tests need the emulators: npm run test:rules
    exclude: [...configDefaults.exclude, 'tests/rules/**'],
  },
});
