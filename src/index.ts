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
  useCDN?:
    | {
        mars3d?: string;
        mars3dCesium?: string;
        turf?: string;
      }
    | { cesium?: string };
}

export default function vitePluginEarth(options: VitePluginEarthOptions = {}): Plugin {
  let CESIUM_NAME = options.useMars3D ? 'mars3d-cesium' : 'cesium';
  const {
    rebuildCesium = false,
    devMinifyCesium = false,
    cesiumBuildRootPath = `node_modules/${CESIUM_NAME}/Build`,
    cesiumBuildPath = `${cesiumBuildRootPath}/Cesium/`,
    useMars3D = false,
    useCDN = null
  } = options;

  // 默认使用的版本号
  let cdnVersion = Object.assign(
    { mars3d: '3.5.0', mars3dCesium: '1.103.1', cesium: '1.105.0', turf: '6.5.0' },
    useCDN
  );

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
          let external = [CESIUM_NAME];
          let plugins = [externalGlobals({ cesium: 'Cesium' })];

          if (useMars3D) {
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
      if (useMars3D) {
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
      if (isBuild && !useCDN) {
        try {
          await fs.copy(path.join(cesiumBuildPath, 'Assets'), path.join(outDir, `${CESIUM_NAME}/Assets`));
          await fs.copy(path.join(cesiumBuildPath, 'ThirdParty'), path.join(outDir, `${CESIUM_NAME}/ThirdParty`));
          await fs.copy(path.join(cesiumBuildPath, 'Workers'), path.join(outDir, `${CESIUM_NAME}/Workers`));
          await fs.copy(path.join(cesiumBuildPath, 'Widgets'), path.join(outDir, `${CESIUM_NAME}/Widgets`));
          if (!rebuildCesium) {
            await fs.copy(path.join(cesiumBuildPath, 'Cesium.js'), path.join(outDir, `${CESIUM_NAME}/Cesium.js`));
          }

          if (useMars3D) {
            await fs.copy(path.join(`node_modules/mars3d/`, 'dist'), path.join(outDir, 'mars3d'));
          }
        } catch (err) {
          console.error('copy failed', err);
        }
      }
    },

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];
      if (useCDN) {
        let cesiumVersion = useMars3D ? cdnVersion.mars3dCesium : cdnVersion.cesium;
        tags.push(
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: `https://unpkg.com/${CESIUM_NAME}@${cesiumVersion}/Build/Cesium/Widgets/widgets.css`
            }
          },
          {
            tag: 'script',
            children: `window['CESIUM_BASE_URL'] = 'https://unpkg.com/${CESIUM_NAME}@${cesiumVersion}/Build/Cesium'`
          },
          {
            tag: 'script',
            attrs: {
              src: `https://unpkg.com/${CESIUM_NAME}@${cesiumVersion}/Build/Cesium/Cesium.js`
            }
          }
        );

        if (useMars3D) {
          tags.push(
            {
              tag: 'link',
              attrs: {
                rel: 'stylesheet',
                href: `https://unpkg.com/mars3d@${cdnVersion.mars3d}/dist/mars3d.css`
              }
            },
            {
              tag: 'script',
              attrs: {
                src: `https://unpkg.com/mars3d@${cdnVersion.mars3d}/dist/mars3d.js`
              }
            },
            {
              tag: 'script',
              attrs: {
                src: `https://unpkg.com/@turf/turf@${cdnVersion.turf}/turf.min.js`
              }
            }
          );
        }
      } else {
        tags.push({
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: normalizePath(path.join(CESIUM_BASE_URL, 'Widgets/widgets.css'))
          }
        });
        if (isBuild && !rebuildCesium) {
          tags.push({
            tag: 'script',
            attrs: {
              src: normalizePath(path.join(base, `${CESIUM_NAME}/Cesium.js`))
            }
          });
        }

        if (useMars3D) {
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
      }

      return tags;
    }
  };
}
