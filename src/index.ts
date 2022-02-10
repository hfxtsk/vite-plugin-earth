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
  const cesiumBuildPath = cesiumBuildRootPath + '/Cesium/';
  const mars3dBuildPath = 'node_modules/mars3d/dist/';

  let CESIUM_BASE_URL = '/cesium/';
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
        if (base === '') base = './';
      }
      if (c.build?.outDir) {
        outDir = c.build.outDir;
      }
      CESIUM_BASE_URL = path.posix.join(base, CESIUM_BASE_URL);
      const userConfig: UserConfig = {};
      if (!isBuild) {
        // -----------dev-----------
        userConfig.optimizeDeps = {
          exclude: ['mars3d-cesium']
        };
        userConfig.define = {
          CESIUM_BASE_URL: JSON.stringify(path.posix.join(base, "mars3d-cesium"))
          // MARS3D_BASE_URL: JSON.stringify(path.posix.join(base, "mars3d"))
        };
      } else {
        // -----------build------------
        if (rebuildCesium) {
          // build 1) rebuild cesium library
          userConfig.build = {
            assetsInlineLimit: 0,
            chunkSizeWarningLimit: 5000,
            rollupOptions: {
              output: {
                intro: `window.CESIUM_BASE_URL = "${CESIUM_BASE_URL}";`
              }
            }
          };
        } else {
          // build 2) copy Cesium.js later
          userConfig.build = {
            rollupOptions: {
              external: ['cesium','mars3d'],
              plugins: [externalGlobals({ cesium: 'Cesium' }),externalGlobals({ mars3d: 'mars3d' })]
            }
          };
        }
      }
      return userConfig;
    },

    configureServer({ middlewares }) {
      const cesiumPath = path.join(
        cesiumBuildRootPath,
        devMinifyCesium ? 'Cesium' : 'CesiumUnminified'
      );
      middlewares.use(CESIUM_BASE_URL, serveStatic(cesiumPath));
    },

    async closeBundle() {
      if (isBuild) {
        try {
          await fs.copy(
            path.join(cesiumBuildPath, 'Assets'),
            path.join(outDir, 'cesium/Assets')
          );
          await fs.copy(
            path.join(cesiumBuildPath, 'ThirdParty'),
            path.join(outDir, 'cesium/ThirdParty')
          );
          await fs.copy(
            path.join(cesiumBuildPath, 'Workers'),
            path.join(outDir, 'cesium/Workers')
          );
          await fs.copy(
            path.join(cesiumBuildPath, 'Widgets'),
            path.join(outDir, 'cesium/Widgets')
          );
          if (!rebuildCesium) {
            await fs.copy(
              path.join(cesiumBuildPath, 'Cesium.js'),
              path.join(outDir, 'cesium/Cesium.js')
            );
          };
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
      const tags: HtmlTagDescriptor[] = [
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: normalizePath(
              path.join(CESIUM_BASE_URL, 'Widgets/widgets.css')
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
        }
      ];
      if (isBuild && !rebuildCesium) {
        tags.push({
          tag: 'script',
          attrs: { src: normalizePath(path.join(base, 'cesium/Cesium.js')) }
        });
      }
      if (isBuild) {
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