// npm run build
//   1. vite build            -> site/ (hosted app, hashed assets, no inline script)
//   2. site/sw.js            generated from src/sw/sw.template.js with the full precache list
//   3. standalone build      one chunk, inlined into one HTML file whose script is pinned by SHA-256 in a meta CSP
//                            -> site/TRAJECTIQ_Play.html  (and dist/TRAJECTIQ_Play.html at cutover, see below)
//   4. legacy standalone     dist/TRAJECTIQ_Play.html stays the byte-stable v6 file until cutover (WP12), so the
//                            existing CI byte-equality check and the legacy tests keep their meaning.
// Cutover: run with TRAJECTIQ_STANDALONE_TARGET=dist (or --cutover) and the React standalone replaces dist/TRAJECTIQ_Play.html.
import {build} from 'vite';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {renderFromDisk} from './lib/sw.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const cutover = process.argv.includes('--cutover') || process.env.TRAJECTIQ_STANDALONE_TARGET === 'dist';
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const kb = n => (n / 1024).toFixed(1) + ' KB';

// ---- 1. hosted app -------------------------------------------------------------------------------------------------
const hostedConfig = (await import('../vite.config.js')).default;
await build({...hostedConfig, configFile: false, logLevel: 'warn'});

// ---- 2. service worker ---------------------------------------------------------------------------------------------
const sw = await renderFromDisk(root, site, pkg.version);
await writeFile(path.join(site, 'sw.js'), sw.source);

// ---- 3. standalone -------------------------------------------------------------------------------------------------
const standaloneConfig = (await import('../vite.standalone.config.js')).default;
const result = await build({...standaloneConfig, configFile: false, logLevel: 'warn'});
const outputs = (Array.isArray(result) ? result : [result]).flatMap(r => r.output);
const entries = outputs.filter(o => o.type === 'chunk');
if (entries.length !== 1) throw new Error(`Standalone build must be one chunk, got ${entries.length}.`);
const cssAssets = outputs.filter(o => o.type === 'asset' && o.fileName.endsWith('.css'));
if (outputs.some(o => o.type === 'asset' && !o.fileName.endsWith('.css') && !o.fileName.endsWith('.html'))) throw new Error('Standalone build emitted a separate asset; everything must be inlined.');
const norm = s => String(s).replace(/\r\n/g, '\n');
const css = cssAssets.map(a => norm(a.source)).join('\n');
// A script element ends at "</script" and enters an escaped state at "<!--"; neutralise both (identity escapes inside strings).
const script = norm(entries[0].code).replaceAll('</script', '<\\/script').replaceAll('<!--', '<\\!--');
if (/^import |^export /m.test(script)) throw new Error('Standalone script still has module imports or exports.');
const hash = createHash('sha256').update(script).digest('base64');
const policy = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'`;
const icon = 'data:image/svg+xml,' + encodeURIComponent(norm(await readFile(path.join(root, 'public/icon.svg'), 'utf8')));
const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080d15"><meta name="color-scheme" content="dark"><meta name="description" content="The complete TRAJECTIQ mission design game. Standalone offline edition."><title>TRAJECTIQ — Complete offline game</title><link rel="icon" href="${icon}"><style>${css}</style></head><body><div id="root"></div><script type="module">${script}</script></body></html>`;
await writeFile(path.join(site, 'TRAJECTIQ_Play.html'), html);
if (cutover) await writeFile(path.join(root, 'dist/TRAJECTIQ_Play.html'), html);

// ---- 4. legacy standalone (until cutover) --------------------------------------------------------------------------
// Preserve the committed v6 artifact. Its concatenation builder cannot consume the v7 module graph.

// ---- report --------------------------------------------------------------------------------------------------------
const hostedFiles = sw.assets.filter(a => a !== './');
let js = 0, jsGz = 0, cssGz = 0, cssRaw = 0;
for (const f of hostedFiles) {
  const buf = await readFile(path.join(site, f.slice(2)));
  if (f.endsWith('.js')) { js += buf.length; jsGz += gzipSync(buf).length; }
  if (f.endsWith('.css')) { cssRaw += buf.length; cssGz += gzipSync(buf).length; }
}
console.log(`Hosted app: site/  (${hostedFiles.length} files, JS ${kb(js)} raw / ${kb(jsGz)} gzip, CSS ${kb(cssRaw)} raw / ${kb(cssGz)} gzip)`);
console.log(`Service worker: site/sw.js precaches ${sw.assets.length} URLs`);
console.log(`Standalone: site/TRAJECTIQ_Play.html ${kb(Buffer.byteLength(html))}${cutover ? ' (also written to dist/)' : ' (dist/TRAJECTIQ_Play.html is still the legacy v6 file until cutover)'}, script sha256-${hash.slice(0, 12)}...`);
