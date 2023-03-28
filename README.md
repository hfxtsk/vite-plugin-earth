# ⚡ vite-plugin-earth

[![npm](https://img.shields.io/npm/v/vite-plugin-earth.svg)](https://www.npmjs.com/package/vite-plugin-earth)
[![npm](https://img.shields.io/npm/dt/vite-plugin-earth)](https://www.npmjs.com/package/vite-plugin-earth)

Easily set up a [`Cesium`] & [`Mars3D`] project in [`Vite`].

[`cesium`]: https://cesium.com/platform/cesiumjs/
[`vite`]: https://vitejs.dev/
[`Mars3D`]: http://mars3d.cn/

## Cesium

### Install

```bash
npm i cesium vite-plugin-earth vite -D
```

### Usage

add this plugin to `vite.config.js`

```js
import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';
export default defineConfig({
  plugins: [earth()]
});
```

## Mars3D

### Install

```bash
npm i mars3d mars3d-cesium vite-plugin-earth vite -D
```

### Usage

add this plugin to `vite.config.js`

```js
import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';
export default defineConfig({
  plugins: [earth({ useMars3D: true })]
});
```

## Options

**useCDN**

- **Type :** `object`
- **Default :** `{ mars3d: '3.5.0', mars3dCesium: '1.103.1', cesium: '1.103.0', turf: '6.5.0' }`

打包时使用 cdn 方式

```js
import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';
export default defineConfig({
  plugins: [
    earth({
      useCDN: {}
    })
  ]
});
```

## Demo

### Cesium

```html
<div id="cesiumContainer"></div>
```

```js
import { Viewer } from 'cesium';

const viewer = new Viewer('cesiumContainer');
```

### Mars3D

```html
<div id="mars3dContainer"></div>
```

```js
import * as mars3d from 'mars3d';
import 'mars3d/dist/mars3d.css';

const map = new mars3d.Map('mars3dContainer', {});
```

## License

MIT
