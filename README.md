<div align="center">

<h1>yunji-tagger-taro</h1>

A simple Vite + React/Vue Plugin 

</div>

## Installation

```bash
npm install --save-dev yunji-tagger-taro
```

```bash
yarn add  -dev yunji-tagger-taro
```


## Usage

### Taro + React

```ts

const { createBabelPluginTaro } = require('yunji-tagger');

module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
      useBuiltIns: process.env.TARO_ENV === 'h5' ? 'usage' : false
    }]
  ],
  "plugins": [createBabelPluginTaro({})], // success
}
```

## Configure

Read the [Contributing guide](https://github.com/kiwitap001/yunji-tagger/blob/yunji-tagger-taro/CONTRIBUTING.md)

