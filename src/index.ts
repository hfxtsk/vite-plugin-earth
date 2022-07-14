/**
 * @Author: xuwoool@qq.com
 * @Date: 2022-04-22 13:50:15
 */
import path from 'path';
import fs from 'fs-extra';
import serveStatic from 'serve-static';
import { HtmlTagDescriptor, normalizePath, Plugin } from 'vite';

interface PluginOptions {
  libPath: String;
  useUnminified: Boolean;
  pkgName: 'mars3d-cesium' | 'cesium';
}

function vitePluginEarth(
  options: PluginOptions = {
    libPath: 'lib',
    useUnminified: false,
    pkgName: 'cesium'
  }
): Plugin {
  const cesiumBuildPath = `./node_modules/${options.pkgName}/Build`;
  let base = '/';
  let outDir = 'dist';
  let isBuild = false;
  let libPath = options.libPath || 'lib';
  let useUnminified = options.useUnminified || false;

  return {
    name: 'vite-plugin-earth',
    config(config, { command }) {
      isBuild = command === 'build';
      base = config.base || '/';
      outDir = config.build?.outDir || 'dist';
    },
    configureServer({ middlewares }) {
      middlewares.use(
        `/${libPath}/Cesium`,
        serveStatic(
          normalizePath(
            path.join(
              cesiumBuildPath,
              useUnminified ? 'CesiumUnminified' : 'Cesium'
            )
          )
        )
      );
    },
    closeBundle() {
      if (isBuild) {
        try {
          fs.copySync(
            path.join(cesiumBuildPath, 'Cesium'),
            path.join(outDir, String(libPath), 'Cesium')
          );
        } catch (e) {}
      }
    },

    transformIndexHtml() {
      let tags: HtmlTagDescriptor[] = [];

      tags.push({
        tag: 'link',
        attrs: {
          rel: 'stylesheet',
          href: normalizePath(
            path.join(base, String(libPath), 'Cesium/Widgets/widgets.css')
          )
        },
        injectTo: 'head'
      });
      tags.push({
        tag: 'script',
        attrs: {
          src: normalizePath(
            path.join(base, String(libPath), 'Cesium/Cesium.js')
          )
        },
        injectTo: 'head'
      });

      return tags;
    }
  };
}

export default vitePluginEarth;
