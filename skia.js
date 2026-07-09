// Fallback for resolvers that don't honor the package.json "exports" map
// (Metro < RN 0.79). Mirrors the "./skia" subpath export.
module.exports = require('./build/skia/index.js');
