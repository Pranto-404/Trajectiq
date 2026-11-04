import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

// The engine and data are the tested source of truth. They stay in dist/ and are reached through aliases,
// so no test (node or vitest) ever changes an import path.
export const alias = [
  {find: /^@engine\//, replacement: path.resolve(root, 'dist/engine') + '/'},
  {find: /^@data\//, replacement: path.resolve(root, 'dist/data') + '/'},
  {find: /^@\//, replacement: path.resolve(root, 'src') + '/'}
];

export default defineConfig({
  root,
  base: './',
  plugins: [react()],
  resolve: {alias},
  // True only in the single-file offline build (vite.standalone.config.js): no service worker there.
  define: {__STANDALONE__: 'false'},
  server: {host: '127.0.0.1', port: 5173, strictPort: true},
  preview: {host: '127.0.0.1', port: 4173},
  build: {
    outDir: 'site',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 700,
    // Only the game is built. kit.html (the design-system gallery) is a development page.
    rolldownOptions: {input: path.resolve(root, 'index.html')}
  },
  css: {modules: {localsConvention: 'camelCase'}}
});
