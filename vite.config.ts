/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Ask before switching to a new version, so a reload never wipes a half-filled form.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Meal Tracker',
        short_name: 'Meals',
        description: 'Track and rate your restaurant meals.',
        theme_color: '#4f46e5',
        background_color: '#f9fafb',
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
  },
});
