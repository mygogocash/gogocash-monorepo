// Metro config for the Expo app inside the npm-workspaces monorepo.
// Without this, hoisted root deps + the @mobile/* alias fail to resolve on
// web and native (Metro otherwise only watches the app dir / its own node_modules).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole monorepo so Metro sees hoisted deps + sibling packages.
config.watchFolders = [workspaceRoot];

// Resolve from the app's node_modules first, then the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Hierarchical lookup stays ENABLED (npm hoists) and package-exports stays on
// (firebase v12 needs it). The @mobile/* tsconfig paths are read automatically
// by @expo/metro-config.
module.exports = config;
