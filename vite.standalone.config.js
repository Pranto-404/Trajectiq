import {mergeConfig} from 'vite';
import base from './vite.config.js';

// One chunk, one stylesheet, fonts inlined as data: URIs. scripts/build.mjs inlines the result into a single
// HTML file and pins the script with a SHA-256 meta Content-Security-Policy.
export default mergeConfig(base, {
  define: {__STANDALONE__: 'true'},
  publicDir: false,
  build: {
    outDir: 'node_modules/.cache/trajectiq-standalone',
    emptyOutDir: true,
    write: false,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 1024 * 1024 * 50,
    chunkSizeWarningLimit: 4000,
    rolldownOptions: {output: {codeSplitting: false}}
  }
});
