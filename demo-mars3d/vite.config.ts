import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';

export default defineConfig({
  plugins: [
    earth({
      useMars3D: true,
      useCDN: { mars3d: '3.5.1' }
    })
  ]
});
