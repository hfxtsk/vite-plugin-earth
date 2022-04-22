/**
 * @Author: xuwoool@qq.com
 * @Date: 2022-04-22 13:50:15
 */
import path from 'path';
import fs from 'fs-extra';
import serveStatic from 'serve-static';
import { HtmlTagDescriptor, normalizePath, Plugin } from 'vite';

interface VitePluginCesiumOptions {
  libsPath?: String;
  useUnminified?: Boolean;
  npmPkgName?: String;
  useMars3d?: Boolean;
}

function vitePluginCesium(
  options: VitePluginCesiumOptions = {
    libsPath: 'libs',
    useUnminified: false,
    npmPkgName: 'mars3d-cesium',
    useMars3d: false
  }
): Plugin {
  const cesiumBuildPath = `./node_modules/${options.npmPkgName}/Build`;
  let base = '/';
  let outDir = 'dist';
  let isBuild = false;
  let libsPath = options.libsPath || 'libs';
  let useUnminified = options.useUnminified || false;

  return {
    name: 'vite-plugin-cesium',
    config(config, { command }) {
      isBuild = command === 'build';
      base = config.base || '/';
      outDir = config.build?.outDir || 'dist';
    },
    configureServer({ middlewares }) {
      middlewares.use(
        `/${libsPath}/Cesium`,
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
            path.join(cesiumBuildPath, 'Cesium', 'Assets'),
            path.join(outDir, String(libsPath), 'Cesium', 'Assets')
          );
          fs.copySync(
            path.join(cesiumBuildPath, 'Cesium', 'ThirdParty'),
            path.join(outDir, String(libsPath), 'Cesium', 'ThirdParty')
          );
          fs.copySync(
            path.join(cesiumBuildPath, 'Cesium', 'Widgets'),
            path.join(outDir, String(libsPath), 'Cesium', 'Widgets')
          );
          fs.copySync(
            path.join(cesiumBuildPath, 'Cesium', 'Workers'),
            path.join(outDir, String(libsPath), 'Cesium', 'Workers')
          );
          fs.copySync(
            path.join(cesiumBuildPath, 'Cesium', 'Cesium.js'),
            path.join(outDir, String(libsPath), 'Cesium', 'Cesium.js')
          );
        } catch (e) {}
      }
    },

    transformIndexHtml() {
      let tags: HtmlTagDescriptor[] = [];
      tags.push({
        tag: 'script',
        attrs: {
          src: normalizePath(
            path.join(base, String(libsPath), 'Cesium', 'Cesium.js')
          )
        },
        injectTo: 'head'
      });

      tags.push({
        tag: 'link',
        attrs: {
          rel: 'stylesheet',
          href: normalizePath(
            path.join(base, String(libsPath), 'Cesium', 'Widgets/widgets.css')
          )
        },
        injectTo: 'head'
      });

      return tags;
    }
  };
}

export default vitePluginCesium;
