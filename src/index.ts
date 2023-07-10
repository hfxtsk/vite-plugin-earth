import fs from 'fs-extra';
import path from 'path';
import externalGlobals from 'rollup-plugin-external-globals';
import serveStatic from 'serve-static';
import { HtmlTagDescriptor, normalizePath, Plugin, UserConfig } from 'vite';

interface BaseOptions {
  rebuildCesium?: boolean;
  devMinifyCesium?: boolean;
  cesiumBuildRootPath?: string;
  cesiumBuildPath?: string;
}

interface VitePluginCesiumOptions extends BaseOptions {
  /**
   * [仅build编译时] 是否使用CDN引入资源,也可以配置object定义各库的cdn的版本号
   */
  useCDN?: boolean | { cesium?: string };
}

interface VitePluginMars3dOptions extends BaseOptions {
  /**
   * [仅build编译时] 是否使用CDN引入资源,也可以配置object定义各库的cdn的版本号
   */
  useCDN?:
    | boolean
    | {
        mars3d?: string;
        mars3dCesium?: string;
        turf?: string;
      };
}
/**
 * 集成mars3d
 * @param options
 * @returns
 */
export function mars3dPlugin(options: VitePluginMars3dOptions = {}): Plugin {
  let CESIUM_NAME = 'mars3d-cesium';
  const {
    rebuildCesium = false,
    devMinifyCesium = false,
    cesiumBuildRootPath = `node_modules/${CESIUM_NAME}/Build`,
    cesiumBuildPath = `${cesiumBuildRootPath}/Cesium/`,
    useCDN = null
  } = options;

  // 默认使用最新版本，可指定版本
  let cdnVersion = Object.assign({ mars3d: null, mars3dCesium: null, turf: null }, useCDN);

  let CESIUM_BASE_URL = `${CESIUM_NAME}/`;
  let MARS3D_BASE_URL = `mars3d/`;
  let outDir = 'dist';
  let base: string = '/';
  let isBuild: boolean = false;

  return {
    name: 'vite-plugin-mars3d',

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
          const external = [CESIUM_NAME, 'mars3d'];
          const globalsLibs = {
            mars3d: 'mars3d',
            'mars3d-cesium': 'Cesium'
          };

          userConfig.build = {
            rollupOptions: {
              external: external,
              plugins: [externalGlobals(globalsLibs)]
            }
          };
        }
      }
      return userConfig;
    },

    configureServer({ middlewares }) {
      const cesiumPath = path.join(cesiumBuildRootPath, 'Cesium');
      middlewares.use(path.posix.join('/', CESIUM_BASE_URL), serveStatic(cesiumPath));

      const mars3dPath = path.join(`node_modules/mars3d`, 'dist');
      middlewares.use(path.posix.join('/', MARS3D_BASE_URL), serveStatic(mars3dPath));
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

          await fs.copy(path.join(`node_modules/mars3d/`, 'dist'), path.join(outDir, 'mars3d'));
        } catch (err) {
          console.error('copy failed', err);
        }
      }
    },

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];
      if (useCDN) {
        let cesiumVersion = cdnVersion.mars3dCesium ? `@${cdnVersion.mars3dCesium}` : '';
        let mars3dVersion = cdnVersion.mars3d ? `@${cdnVersion.mars3d}` : '';
        let turfVersion = cdnVersion.turf ? `@${cdnVersion.turf}` : '';

        tags.push(
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: `https://unpkg.com/${CESIUM_NAME}${cesiumVersion}/Build/Cesium/Widgets/widgets.css`
            }
          },
          {
            tag: 'script',
            children: `window['CESIUM_BASE_URL'] = 'https://unpkg.com/${CESIUM_NAME}${cesiumVersion}/Build/Cesium'`
          },
          {
            tag: 'script',
            attrs: {
              src: `https://unpkg.com/${CESIUM_NAME}${cesiumVersion}/Build/Cesium/Cesium.js`
            }
          }
        );

        tags.push(
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: `https://unpkg.com/mars3d${mars3dVersion}/dist/mars3d.css`
            }
          },
          {
            tag: 'script',
            attrs: {
              src: `https://unpkg.com/mars3d${mars3dVersion}/dist/mars3d.js`
            }
          },
          {
            tag: 'script',
            attrs: {
              src: `https://unpkg.com/@turf/turf${turfVersion}/turf.min.js`
            }
          }
        );
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
            children: `window['CESIUM_BASE_URL'] = '${CESIUM_BASE_URL}'`
          });

          tags.push({
            tag: 'script',
            attrs: {
              src: normalizePath(path.join(CESIUM_BASE_URL, `Cesium.js`))
            }
          });
        }

        tags.push({
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: normalizePath(path.join(MARS3D_BASE_URL, 'mars3d.css'))
          }
        });

        if (isBuild) {
          tags.push({
            tag: 'script',
            attrs: {
              src: normalizePath(path.join(MARS3D_BASE_URL, 'mars3d.js'))
            }
          });
        }
      }

      return tags;
    }
  };
}
/**
 * 集成cesium
 * @param options
 * @returns
 */
export function cesiumPlugin(options: VitePluginCesiumOptions = {}): Plugin {
  let CESIUM_NAME = 'cesium';
  const {
    rebuildCesium = false,
    devMinifyCesium = false,
    cesiumBuildRootPath = `node_modules/${CESIUM_NAME}/Build`,
    cesiumBuildPath = `${cesiumBuildRootPath}/Cesium/`,
    useCDN = null
  } = options;

  // 默认使用最新版本，可指定任意版本
  let cdnVersion = Object.assign({ cesium: null }, useCDN);

  let CESIUM_BASE_URL = `${CESIUM_NAME}/`;
  let outDir = 'dist';
  let base: string = '/';
  let isBuild: boolean = false;

  return {
    name: 'vite-plugin-cesium',

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
        userConfig.define = {
          CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL)
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
      const cesiumPath = path.join(cesiumBuildRootPath, devMinifyCesium ? 'Cesium' : 'CesiumUnminified');
      middlewares.use(path.posix.join('/', CESIUM_BASE_URL), serveStatic(cesiumPath));
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
        } catch (err) {
          console.error('copy failed', err);
        }
      }
    },

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];
      if (useCDN) {
        let cesiumVersion = cdnVersion.cesium ? `@${cdnVersion.cesium}` : '';
        tags.push(
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: `https://unpkg.com/${CESIUM_NAME}${cesiumVersion}/Build/Cesium/Widgets/widgets.css`
            }
          },
          {
            tag: 'script',
            children: `window['CESIUM_BASE_URL'] = 'https://unpkg.com/${CESIUM_NAME}${cesiumVersion}/Build/Cesium'`
          },
          {
            tag: 'script',
            attrs: {
              src: `https://unpkg.com/${CESIUM_NAME}${cesiumVersion}/Build/Cesium/Cesium.js`
            }
          }
        );
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
      }

      return tags;
    }
  };
}
