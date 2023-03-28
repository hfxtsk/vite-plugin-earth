import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';

export default defineConfig({
  plugins: [earth({ useCDN: {} })]
});
