import { defineConfig } from 'vite';
import cesium from 'vite-plugin-earth';

export default defineConfig({
  plugins: [cesium()]
});
