import fs from 'fs-extra';
import path from 'path';
import externalGlobals from 'rollup-plugin-external-globals';
import serveStatic from 'serve-static';
import { HtmlTagDescriptor, normalizePath, Plugin, UserConfig } from 'vite';

interface VitePluginEarthOptions {
  /**
   * rebuild cesium library, default: false
   */
  rebuildCesium?: boolean;
  devMinifyCesium?: boolean;
  cesiumBuildRootPath?: string;
  cesiumBuildPath?: string;
  useMars3D?: boolean;
}

export default function vitePluginEarth(options: VitePluginEarthOptions = {}): Plugin {
  let CESIUM_NAME = options.useMars3D ? 'mars3d-cesium' : 'cesium';
  const {
    rebuildCesium = false,
    devMinifyCesium = false,
    cesiumBuildRootPath = `node_modules/${CESIUM_NAME}/Build`,
    cesiumBuildPath = `node_modules/${CESIUM_NAME}/Build/Cesium/`
  } = options;

  let CESIUM_BASE_URL = `${CESIUM_NAME}/`;
  let MARS3D_BASE_URL = `mars3d/`;
  let outDir = 'dist';
  let base: string = '/';
  let isBuild: boolean = false;

  return {
    name: 'vite-plugin-earth',

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
      MARS3D_BASE_URL = path.posix.join(base, MARS3D_BASE_URL);
      const userConfig: UserConfig = {};
      if (!isBuild) {
        // -----------dev-----------
        userConfig.define = {
          CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
          MARS3D_BASE_URL: JSON.stringify(MARS3D_BASE_URL)
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
          let external = ['cesium'];
          let plugins = [externalGlobals({ cesium: 'Cesium' })];

          if (options.useMars3D) {
            external.push('mars3d');
            plugins.push(externalGlobals({ mars3d: 'mars3d' }));
          }

          userConfig.build = {
            rollupOptions: {
              external: external,
              plugins: plugins
            }
          };
        }
      }
      return userConfig;
    },

    configureServer({ middlewares }) {
      if (options.useMars3D) {
        const cesiumPath = path.join(cesiumBuildRootPath, 'Cesium');
        middlewares.use(path.posix.join('/', CESIUM_BASE_URL), serveStatic(cesiumPath));

        const mars3dPath = path.join(`node_modules/mars3d`, 'dist');
        middlewares.use(path.posix.join('/', MARS3D_BASE_URL), serveStatic(mars3dPath));
      } else {
        const cesiumPath = path.join(cesiumBuildRootPath, devMinifyCesium ? 'Cesium' : 'CesiumUnminified');
        middlewares.use(path.posix.join('/', CESIUM_BASE_URL), serveStatic(cesiumPath));
      }
    },

    async closeBundle() {
      if (isBuild) {
        try {
          await fs.copy(path.join(cesiumBuildPath, 'Assets'), path.join(outDir, `${CESIUM_NAME}/Assets`));
          await fs.copy(path.join(cesiumBuildPath, 'ThirdParty'), path.join(outDir, `${CESIUM_NAME}/ThirdParty`));
          await fs.copy(path.join(cesiumBuildPath, 'Workers'), path.join(outDir, `${CESIUM_NAME}/Workers`));
          await fs.copy(path.join(cesiumBuildPath, 'Widgets'), path.join(outDir, `${CESIUM_NAME}/Widgets`));
          if (!rebuildCesium) {
            await fs.copy(path.join(cesiumBuildPath, 'Cesium.js'), path.join(outDir, `${CESIUM_NAME}/Cesium.js`));
          }

          if (options.useMars3D) {
            await fs.copy(path.join(`node_modules/mars3d/`, 'dist'), path.join(outDir, 'mars3d'));
          }
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
            href: normalizePath(path.join(CESIUM_BASE_URL, 'Widgets/widgets.css'))
          }
        }
      ];
      if (isBuild && !rebuildCesium) {
        tags.push({
          tag: 'script',
          attrs: {
            src: normalizePath(path.join(CESIUM_BASE_URL, 'Cesium.js'))
          }
        });
      }

      if (options.useMars3D) {
        tags.push(
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: normalizePath(path.join(MARS3D_BASE_URL, 'mars3d.css'))
            }
          },
          {
            tag: 'script',
            attrs: {
              src: normalizePath(path.join(MARS3D_BASE_URL, 'mars3d.js'))
            }
          }
        );
      }
      return tags;
    }
  };
}
