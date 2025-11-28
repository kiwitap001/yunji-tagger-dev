# Contributing to yunji-tagger-dev

## Table of Contents

- [Contributing to yunji-tagger-dev](#contributing-to-yunji-tagger-dev)
  - [Table of Contents](#table-of-contents)
  - [Documentation](#documentation)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Vite + React](#vite--react)
  - [Configure](#configure)
      - [Options](#options)



## Documentation

## Installation

```bash
npm install --save-dev yunji-tagger-dev
```

```bash
yarn add  -dev yunji-tagger-dev
```


## Usage

### Vite + React

```ts

const { createReactDevInjectorPlugin } = require('yunji-tagger');

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

Read the [Contributing guide](https://github.com/kiwitap001/yunji-tagger-dev/blob/main/CONTRIBUTING.md)

####  Options

`include` (string | regexp | Array[...string|regexp], default `[/\.vue$/, /\.(jsx|tsx)$/]`) - name of the file with diagram to generate

`exclude` (tring | regexp | Array[...string|regexp], default `[/node_modules/]`) - name of the file with diagram to generate

`attributes` (object, default `{uniqueId:'data-plugin-component-unique-id',filePath:'data-plugin-component-file-path',fileName:'data-plugin-component-file-name',lineNumber:'data-plugin-line-number',columnNumber:'data-plugin-column-number',tagName:'data-plugin-tag-name',tagContent:'data-plugin-tag-content', elementMap: 'data-plugin-element-map',contextInfo:'data-plugin-component-context', hasElementChildren: 'data-plugin-has-element-children' }`) - name of the file with diagram to generate

`includeTags` (array, default `[]`) - HTML tags that need to be included

`excludeTags` (array, default `['script','style','template','link','meta','html','head','body','title','base','noscript','noframes','iframe','frame','frameset','object','embed','applet','Fragment','svg']`) - HTML tags that need to be filtered
