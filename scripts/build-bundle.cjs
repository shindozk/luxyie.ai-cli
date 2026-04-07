const esbuild = require('esbuild');
const path = require('path');

const outfile = path.resolve(__dirname, '../bundle/luxyie.cjs');

const pkg = require('../package.json');

esbuild
  .build({
    entryPoints: ['dist/index.js'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: outfile,
    external: [
      'node:fs',
      'node:path',
      'node:child_process',
      'cfonts',
    ],
    minify: true,
    sourcemap: false,
    banner: {
      js: '#!/usr/bin/env node\nconst { pathToFileURL } = require("url"); const importMetaUrl = pathToFileURL(__filename).href;',
    },
    define: {
      'import.meta.url': 'importMetaUrl',
      'process.env.APP_VERSION': JSON.stringify(pkg.version),
      'process.env.APP_NAME': JSON.stringify(pkg.name),
    },
  })
  .catch(() => process.exit(1));