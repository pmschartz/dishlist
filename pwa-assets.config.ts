import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Generates the PNG app icons in public/ from public/icon.svg:
//   npm run generate-icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Maskable and Apple icons get cropped to various shapes, so give them the brand color
    // edge to edge instead of the default white.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#d4321a' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#d4321a' } },
  },
  images: ['public/icon.svg'],
});
