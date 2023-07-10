import { defineConfig } from 'vite';
import { cesiumPlugin } from 'vite-plugin-earth';

export default defineConfig({
  plugins: [cesiumPlugin({ useCDN: true })]
});
