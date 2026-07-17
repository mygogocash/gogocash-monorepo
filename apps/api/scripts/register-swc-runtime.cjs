'use strict';

const fs = require('node:fs');
const swc = require('@swc/core');

// SWC emits inline source maps below. Enable Node's native source-map support
// once here so every development and operator command reports original
// TypeScript locations without requiring each package script to repeat a flag.
process.setSourceMapsEnabled(true);

/**
 * Minimal TypeScript require hook for operator scripts.
 *
 * @swc-node/register currently reads TypeScript's removed `Extension` API and
 * crashes with the repository's TypeScript 7 toolchain. This hook stays on the
 * public SWC transform API and does not alter application/package config.
 */
require.extensions['.ts'] = function registerTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { code } = swc.transformSync(source, {
    filename,
    sourceMaps: 'inline',
    jsc: {
      parser: {
        syntax: 'typescript',
        decorators: true,
        dynamicImport: true,
      },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
      },
      target: 'es2021',
      keepClassNames: true,
    },
    module: {
      type: 'commonjs',
      ignoreDynamic: true,
    },
  });
  module._compile(code, filename);
};
