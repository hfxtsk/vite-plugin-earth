# ⚡ vite-plugin-earth

Easily set up a [`Cesium`] & [`mars3d`] project in [`Vite`].

[`cesium`]: https://github.com/CesiumGS/cesium
[`mars3d`]: https://mars3d.cn/

## Install

```bash
npm i cesium vite-plugin-earth vite -D
# yarn add cesium vite-plugin-earth vite -D
```

## Usage

add this plugin to `vite.config.js`

```js
import { defineConfig } from 'vite';
import earthPlugin from 'vite-plugin-earth';
export default defineConfig({
  plugins: [earthPlugin()]
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
import earthPlugin from 'vite-plugin-earth';
export default defineConfig({
  plugins: [
    earthPlugin({
      rebuildCesium: true
    })
  ]
});
```
