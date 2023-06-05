import fs from 'fs-extra';
import externalGlobals from 'rollup-plugin-external-globals';
import serveStatic from 'serve-static';

import path from 'path';
import { HtmlTagDescriptor, normalizePath, Plugin, UserConfig } from 'vite';

/**
 *  mars3dPlugin插件构造参数
 */
interface mars3dPluginOptions {
  /**
   * mars3d包名，默认值为 "mars3d"
   */
  mars3dPackageName?: string;
  /**
   * mars3d库运行时的目录名称，默认为 mars3dPackageName
   */
  mars3dRunPath?: string;

  /**
   * cesium包名，默认值为 "mars3d-cesium"
   */
  cesiumPackageName?: string;
  /**
   * cesium库运行时的目录名称，默认为 cesiumPackageName
   */
  cesiumRunPath?: string;

  /**
   * [仅build编译时]使用静态资源方式引入mars3d
   */
  useStatic?: boolean;
  /**
   * [仅build编译时] 是否使用CDN引入资源,也可以配置object定义各库的cdn的版本号
   */
  useCDN?:
    | boolean
    | {
        mars3d?: string;
        cesium?: string;
        turf?: string;
      };
}

/**
 * mars3d库在vite技术栈下的处理插件
 *
 * @export
 * @param {mars3dPluginOptions} [options={}] 参数
 * @return {*}  {Plugin}
 */
export function mars3dPlugin(options: mars3dPluginOptions = {}): Plugin {
  let {
    mars3dPackageName = 'mars3d',
    mars3dRunPath,
    cesiumPackageName = 'mars3d-cesium',
    cesiumRunPath,

    useStatic = false,
    useCDN = false
  } = options;

  if (!mars3dRunPath) {
    mars3dRunPath = `/${mars3dPackageName}/`;
  }
  if (!cesiumRunPath) {
    cesiumRunPath = `/${cesiumPackageName}/`;
  }

  const cesiumNpmPath = `node_modules/${cesiumPackageName}/Build/Cesium/`;
  const mars3dNpmPath = `node_modules/${mars3dPackageName}/dist/`;

  let outDir: string, base: string, CESIUM_BASE_URL: string, MARS3D_BASE_URL: string;
  let isBuild = false;

  return {
    name: 'vite-plugin-mars3d',

    config(c, { command }) {
      isBuild = command === 'build';
      if (c.base) {
        base = c.base;
        if (base === '') {
          base = './';
        }
      } else {
        base = '/';
      }

      if (c.build?.outDir) {
        outDir = c.build.outDir;
      } else {
        outDir = 'dist';
      }

      CESIUM_BASE_URL = path.posix.join(base, cesiumRunPath || `/${cesiumPackageName}/`);
      MARS3D_BASE_URL = path.posix.join(base, mars3dRunPath || `/${mars3dPackageName}/`);

      const userConfig: UserConfig = {
        build: {
          assetsInlineLimit: 0,
          chunkSizeWarningLimit: 4000
        },
        define: {
          CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
          MARS3D_BASE_URL: JSON.stringify(MARS3D_BASE_URL)
        }
      };

      if (isBuild) {
        const external = [cesiumPackageName];
        const globals: any = {};
        globals[cesiumPackageName] = 'Cesium';

        if (useStatic) {
          external.push(mars3dPackageName);
          globals[mars3dPackageName] = 'mars3d';
        }

        userConfig.build = {
          rollupOptions: {
            external: external,
            plugins: [externalGlobals(globals)]
          }
        };
      } else {
        userConfig.optimizeDeps = {
          include: [mars3dPackageName],
          exclude: [cesiumPackageName]
        };
      }
      return userConfig;
    },

    configResolved(resolvedConfig) {
      outDir = path.join(resolvedConfig.root, resolvedConfig.build.outDir);
    },

    configureServer({ middlewares }) {
      middlewares.use(path.posix.join('/', CESIUM_BASE_URL), serveStatic(cesiumNpmPath));

      if (useStatic) {
        middlewares.use(path.posix.join('/', MARS3D_BASE_URL), serveStatic(mars3dNpmPath));
      }
    },

    async closeBundle() {
      if (isBuild && !useCDN) {
        try {
          await fs.copy(path.join(cesiumNpmPath, 'Assets'), path.join(outDir, `${cesiumRunPath}/Assets`));
          await fs.copy(path.join(cesiumNpmPath, 'ThirdParty'), path.join(outDir, `${cesiumRunPath}/ThirdParty`));
          await fs.copy(path.join(cesiumNpmPath, 'Workers'), path.join(outDir, `${cesiumRunPath}/Workers`));
          await fs.copy(path.join(cesiumNpmPath, 'Widgets'), path.join(outDir, `${cesiumRunPath}/Widgets`));
          await fs.copy(path.join(cesiumNpmPath, 'Cesium.js'), path.join(outDir, `${cesiumRunPath}/Cesium.js`));

          if (useStatic) {
            await fs.copy(path.join(mars3dNpmPath, 'img'), path.join(outDir, `${mars3dRunPath}/img`));
            await fs.copy(path.join(mars3dNpmPath, 'mars3d.css'), path.join(outDir, `${mars3dRunPath}/mars3d.css`));
            await fs.copy(path.join(mars3dNpmPath, 'mars3d.js'), path.join(outDir, `${mars3dRunPath}/mars3d.js`));
          }
        } catch (err) {
          console.error(`拷贝 ${cesiumPackageName} 库失败`, err);
        }
      }
    },

    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];
      if (!isBuild) {
        return tags;
      }

      if (useCDN) {
        // 默认使用的版本号
        let cdnVersion_cesium;
        let cdnVersion_mars3d;
        let cdnVersion_turf;
        if (useCDN instanceof Object) {
          cdnVersion_cesium = useCDN.cesium ? `@${useCDN.cesium}` : '';
          cdnVersion_mars3d = useCDN.mars3d ? `@${useCDN.mars3d}` : '';
          cdnVersion_turf = useCDN.turf ? `@${useCDN.turf}` : '';
        } else {
          cdnVersion_cesium = '';
          cdnVersion_mars3d = '';
          cdnVersion_turf = '';
        }

        tags.push(
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: `https://unpkg.com/${cesiumPackageName}${cdnVersion_cesium}/Build/Cesium/Widgets/widgets.css`
            }
          },
          {
            tag: 'script',
            children: `window['CESIUM_BASE_URL'] = 'https://unpkg.com/${cesiumPackageName}${cdnVersion_cesium}/Build/Cesium'`
          },
          {
            tag: 'script',
            attrs: {
              src: `https://unpkg.com/${cesiumPackageName}${cdnVersion_cesium}/Build/Cesium/Cesium.js`
            }
          }
        );

        if (useStatic) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                src: `https://unpkg.com/@turf/turf${cdnVersion_turf}/turf.min.js`
              }
            },
            {
              tag: 'link',
              attrs: {
                rel: 'stylesheet',
                href: `https://unpkg.com/${mars3dPackageName}${cdnVersion_mars3d}/dist/mars3d.css`
              }
            },
            {
              tag: 'script',
              attrs: {
                src: `https://unpkg.com/${mars3dPackageName}${cdnVersion_mars3d}/dist/mars3d.js`
              }
            }
          );
        }
      } else {
        tags.push(
          {
            tag: 'link',
            attrs: {
              rel: 'stylesheet',
              href: normalizePath(path.join(CESIUM_BASE_URL, 'Widgets/widgets.css'))
            }
          },
          {
            tag: 'script',
            attrs: { src: normalizePath(path.join(CESIUM_BASE_URL, 'Cesium.js')) }
          }
        );

        if (useStatic) {
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
              attrs: { src: normalizePath(path.join(MARS3D_BASE_URL, 'mars3d.js')) }
            }
          );
        }
      }

      return tags;
    }
  };
}
