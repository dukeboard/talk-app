var postcss = require('postcss');
var compress = require('csso').compress;
var postcssToCsso = require('./lib/postcssToCsso.js');
var cssoToPostcss = require('./lib/cssoToPostcss.js');

var postcssCsso = postcss.plugin('postcss-csso', function postcssCsso(options) {
    return function(root, result) {
        result.root = cssoToPostcss(compress(postcssToCsso(root), options).ast);
    };
});

postcssCsso.process = function(css, options) {
    return postcss([postcssCsso(options)]).process(css);
};

module.exports = postcssCsso;
