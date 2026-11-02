import react from '@vitejs/plugin-react';
import { UserConfig, ConfigEnv } from 'vite';
import { rmSync } from 'node:fs';
import { join } from 'path';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import pkg from './package.json';

const root = join(__dirname);
const srcRoot = join(__dirname, 'src');
rmSync('dist-electron', { recursive: true, force: true });

const buildElectron = (isDev: boolean) => ({
  sourcemap: isDev,
  minify: !isDev,
  outDir: join(root, 'dist-electron'),
  rollupOptions: { external: Object.keys(pkg.dependencies || {}) }
});

function plugins(isDev: boolean) {
  return [
    react(),
    electron([
      {
        entry: join(root, 'electron/app.ts'),
        onstart(options) {
          options.startup();
        },
        vite: { build: buildElectron(isDev) }
      },
      {
        entry: join(root, 'electron/preload.ts'),
        onstart(options) {
          options.reload();
        },
        vite: { build: buildElectron(isDev) }
      }
    ]),
    renderer()
  ];
}

export default ({ command }: ConfigEnv): UserConfig => {
  if (command === 'serve') {
    return {
      root: srcRoot,
      base: '/',
      plugins: plugins(true),
      resolve: {
        alias: { '/@': srcRoot }
      },
      build: {
        outDir: join(root, '/dist-vite'),
        emptyOutDir: true,
        rollupOptions: {}
      },
      server: { port: 3000 },
      optimizeDeps: { exclude: ['path'] }
    };
  }
  return {
    root: srcRoot,
    base: './',
    plugins: plugins(false),
    resolve: {
      alias: { '/@': srcRoot }
    },
    build: {
      outDir: join(root, '/dist-vite'),
      emptyOutDir: true,
      rollupOptions: {}
    },
    server: { port: 3000 },
    optimizeDeps: { exclude: ['path'] }
  };
};
