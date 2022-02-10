# ⚡ vite-plugin-ice-mars3d

Easily set up a [`Cesium`] project in [`Vite`].

[`cesium`]: https://github.com/CesiumGS/cesium
[`mars3d`]: https://mars3d.cn/

## Install

```bash
npm i cesium vite-plugin-ice-mars3d vite -D
# yarn add cesium vite-plugin-ice-mars3d vite -D
```

## Usage

add this plugin to `vite.config.js`

```js
import { defineConfig } from 'vite';
import mars3dPlugin from 'vite-plugin-ice-mars3d';
export default defineConfig({
  plugins: [mars3dPlugin()]
});
```

add dev command to `package.json`

```json
"scripts": {
  "dev": "vite",
  "build": "vite build"
}
```

run:

`yarn dev`

## Options

**rebuildCesium**

- **Type :** `boolean`
- **Default :** `false`

Default copy min cesium file to dist. if `true` will rebuild cesium from source.

```js
import { defineConfig } from 'vite';
import mars3dPlugin from 'vite-plugin-ice-mars3d';
export default defineConfig({
  plugins: [
    mars3dPlugin({
      rebuildCesium: true
    })
  ]
});
```
