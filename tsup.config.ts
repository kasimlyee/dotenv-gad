import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',

  dts: true,
  minify: true,
  clean: true,

  bundle: false,
  skipNodeModulesBundle: true,
  shims: false,

  external: [
    'fs',
    'path',
    'os',
    'crypto',
    'util',
    'child_process',
    'url',
    'readline',
    'tty',
    'async_hooks',
    'process'
  ],

  noExternal: [
    'chalk',
    'commander',
    'dotenv',
    'figlet',
    'inquirer',
    'ora'
  ]
});
