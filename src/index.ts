import fs from 'fs-extra';
import path from 'path';
import externalGlobals from 'rollup-plugin-external-globals';
import serveStatic from 'serve-static';
import { HtmlTagDescriptor, normalizePath, Plugin, UserConfig } from 'vite';

interface VitePluginCesiumOptions {
  /**
   * rebuild cesium library, default: false
   */
  rebuildCesium?: boolean;
  devMinifyCesium?: boolean;
}

function vitePluginCesium(
  options: VitePluginCesiumOptions = {
    rebuildCesium: false,
    devMinifyCesium: false
  }
): Plugin {
  const { rebuildCesium, devMinifyCesium } = options;

  const cesiumBuildRootPath = 'node_modules/mars3d-cesium/Build';
  const cesiumBuildPath = 'node_modules/mars3d-cesium/Build/Cesium/';const mars3dBuildPath = 'node_modules/mars3d/dist/';

  let CESIUM_BASE_URL = '/mars3d-cesium/';
  let MARS3D_BASE_URL = '/mars3d/';
  let outDir = 'dist';
  let base: string = '/';
  let isBuild: boolean = false;

  return {
    name: 'vite-plugin-ice-mars3d',

    config(c, { command }) {
      isBuild = command === 'build';
      if (c.base) {
        base = c.base;
      }
      if (base === '') base = './';
      if (isBuild) CESIUM_BASE_URL = path.join(base, CESIUM_BASE_URL);
      const userConfig: UserConfig = {
        build: {
          assetsInlineLimit: 0,
          chunkSizeWarningLimit: 4000
        },
        define: {
          CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL)
        }
      };
      if (!isBuild) {
        userConfig.optimizeDeps = {
          exclude: ['mars3d-cesium']
        };
      }
      if (isBuild && !rebuildCesium) {
        userConfig.build!.rollupOptions = {
          external: ['cesium','mars3d'],
          plugins: [externalGlobals({ cesium: 'Cesium' }),externalGlobals({ mars3d: 'mars3d' })]
        };
      }
      return userConfig;
    },

    async load(id: string) {
      if (!rebuildCesium) return null;
      // replace CESIUM_BASE_URL variable in 'cesium/Source/Core/buildModuleUrl.js'
      if (id.includes('buildModuleUrl')) {
        let file = fs.readFileSync(id, { encoding: 'utf8' });
        file = file.replace(
          /CESIUM_BASE_URL/g,
          JSON.stringify(CESIUM_BASE_URL)
        );
        return file;
      }

      return null;
    },

    configureServer({ middlewares }) {
      const cesiumPath = path.join(
        cesiumBuildRootPath,
        'Cesium'
        // devMinifyCesium ? 'Cesium' : 'CesiumUnminified'
      );
      middlewares.use(CESIUM_BASE_URL, serveStatic(cesiumPath));
    },

    async closeBundle() {
      if (isBuild) {
        try {
          await fs.copy(
            path.join(cesiumBuildPath, 'Assets'),
            path.join(outDir, 'Cesium/Assets')
          );
          await fs.copy(
            path.join(cesiumBuildPath, 'ThirdParty'),
            path.join(outDir, 'Cesium/ThirdParty')
          );
          await fs.copy(
            path.join(cesiumBuildPath, 'Workers'),
            path.join(outDir, 'Cesium/Workers')
          );
          await fs.copy(
            path.join(cesiumBuildPath, 'Widgets'),
            path.join(outDir, 'Cesium/Widgets')
          );
          if (!rebuildCesium) {
            await fs.copy(
              path.join(cesiumBuildPath, 'Cesium.js'),
              path.join(outDir, 'Cesium/Cesium.js')
            );
          }
          await fs.copy(
            path.join(mars3dBuildPath, ''),
            path.join(outDir, 'mars3d')
          );
        } catch (err) {
          console.error('copy failed', err);
        }
      }
    },

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];
      if (isBuild && !rebuildCesium) {
        tags.push({
          tag: 'script',
          attrs: { src: normalizePath(path.join(base, 'Cesium/Cesium.js')) }
        });
      }
      if (isBuild) {
        tags.push( {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: normalizePath(
              path.join('/Cesium/', 'Widgets/widgets.css')
            )
          }
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: normalizePath(
              path.join(MARS3D_BASE_URL, 'mars3d.css')
            )
          }
        });
        tags.push({
          tag: 'script',
          attrs: { src: normalizePath(path.join(MARS3D_BASE_URL, 'mars3d.js')) }
        });
      }
      return tags;
    }
  };
}

export default vitePluginCesium;