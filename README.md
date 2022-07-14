# ⚡ vite-plugin-earth

Easily set up a [`cesium`] & [`mars3d-cesium`] project in [`Vite`].

[`cesium`]: https://github.com/CesiumGS/cesium
[`mars3d`]: https://mars3d.cn/

## Install

```bash
npm i vite-plugin-earth -D
```

## Usage

add this plugin to `vite.config.js`

```js
import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';
export default defineConfig({
  plugins: [earth()]
});
```

## Options

### **pkgName**

- **Type :** `string`
- **Default :** `cesium`

`mars3d-cesium` 为`mars3d`对应的依赖库

```js
import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';
export default defineConfig({
  plugins: [
    earth({
      pkgName: 'mars3d-cesium'
    })
  ]
});
```

### **libPath**

- **Type :** `string`
- **Default :** `lib`

将类库复制到指定的`lib/`目录下面

```js
import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';
export default defineConfig({
  plugins: [
    earth({
      libPath: 'lib'
    })
  ]
});
```

### **rebuildCesium**

- **Type :** `boolean`
- **Default :** `false`

Default copy min cesium file to dist. if `true` will rebuild cesium from source.

```js
import { defineConfig } from 'vite';
import earth from 'vite-plugin-earth';
export default defineConfig({
  plugins: [
    earth({
      rebuildCesium: true
    })
  ]
});
```
