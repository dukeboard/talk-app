[![NPM version](https://img.shields.io/npm/v/postcss-csso.svg)](https://www.npmjs.com/package/postcss-csso)
[![Build Status](https://travis-ci.org/lahmatiy/postcss-csso.svg?branch=master)](https://travis-ci.org/lahmatiy/postcss-csso)

# postcss-csso

[PostCSS](https://github.com/postcss/postcss) plugin to minify CSS using [CSSO](https://github.com/css/csso).

Under the hood the plugin converts `PostCSS` AST into `CSSO` format, optimises it and converts back. The plugin uses either input `PostCSS` tree nodes or their clones on reverse convertation. So shape of original `PostCSS` tree nodes persists the same after compression in most cases (e.g. properties added by other plugins isn't lost). Also this allows to generate source map correctly.

Performance of the plugin is approximately the same as `CSSO` has (see `CSSO` numbers in [comparison table](https://goalsmashers.github.io/css-minification-benchmark/)).

> If you have any difficulties with the output of this plugin, please use the [CSSO tracker](https://github.com/css/csso/issues).

## Install

```
npm install postcss-csso
```

## Usage

```js
var postcss = require('postcss');
var csso = require('postcss-csso');

postcss([
    csso
])
    .process('.a { color: #FF0000; } .b { color: rgba(255, 0, 0, 1) }')
    .then(function(result) {
        console.log(result.css);
        // .a,.b{color:red}
    });
```

Plugin accepts the same [options](https://github.com/css/csso#minifysource-options) as `minify()` method of CSSO with no any changes.

```js
postcss([
    csso({ restructure: false })
])
    .process('.a { color: #FF0000; } .b { color: rgba(255, 0, 0, 1) }')
    .then(function(result) {
        console.log(result.css);
        // .a{color:red}.b{color:red}
    });
```

## License

MIT
