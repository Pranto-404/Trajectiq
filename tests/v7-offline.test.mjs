import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {ensureBuilt} from './helpers/ensure-built.mjs';

// The React build generates site/sw.js from src/sw/sw.template.js. These are the v5-offline semantics, asserted
// against the generated worker (the legacy dist/sw.js keeps its own v5-offline test until cutover).
const site = ensureBuilt();
const source = readFileSync(path.join(site, 'sw.js'), 'utf8');

function worker({cached = true, offline = false} = {}) {
  const events = {}, removed = [], network = [], installs = [];
  const context = {URL, Response, self: {location: {origin: 'https://game.test'}, registration: {scope: 'https://game.test/'}, addEventListener: (k, v) => events[k] = v},
    caches: {open: async () => ({addAll: async assets => installs.push(...assets), match: async url => cached ? new Response('pinned-v7:' + url) : null}),
      keys: async () => ['trajectiq-4.0.0', 'trajectiq-5.0.0', 'trajectiq-5.0.0-ui1', 'trajectiq-6.0.0-ui2', 'unrelated-cache'], delete: async key => removed.push(key)},
    fetch: async req => { network.push(req); if (offline) throw Error('offline'); return new Response('network'); }};
  vm.runInNewContext(source, context);
  return {events, removed, network, installs};
}
const files = (dir, prefix = '') => readdirSync(dir).flatMap(f => statSync(path.join(dir, f)).isDirectory() ? files(path.join(dir, f), prefix + f + '/') : [prefix + f]);

test('Generated worker precaches every emitted file, waits for open clients and removes old caches on activation', async () => {
  const w = worker(); let pending; w.events.install({waitUntil: p => pending = p}); await pending;
  assert.ok(w.installs.includes('./') && w.installs.includes('./index.html') && w.installs.includes('./icon.svg'));
  const emitted = files(site).filter(f => f !== 'sw.js' && f !== 'TRAJECTIQ_Play.html');
  for (const f of emitted) assert.ok(w.installs.includes('./' + f), `precache ${f}`);
  assert.ok(emitted.some(f => /^assets\/.+\.js$/.test(f)) && emitted.some(f => /^assets\/.+\.woff2$/.test(f)), 'script and font are precached');
  assert.ok(!w.installs.includes('./sw.js') && !w.installs.includes('./TRAJECTIQ_Play.html'));
  assert.doesNotMatch(source, /self\.skipWaiting\(|clients\.claim\(/);
  const name = source.match(/const CACHE = '([^']+)'/)[1]; assert.match(name, /^trajectiq-\d+\.\d+\.\d+-[0-9a-f]{10}$/);
  w.events.activate({waitUntil: p => pending = p}); await pending;
  assert.deepEqual(w.removed, ['trajectiq-4.0.0', 'trajectiq-5.0.0', 'trajectiq-5.0.0-ui1', 'trajectiq-6.0.0-ui2'], 'every older trajectiq-* cache goes, unrelated ones stay');
});

test('Network wins online; offline falls back to the cached copy, including query strings', async () => {
  const entry = source.match(/"(\.\/assets\/[^"]+\.js)"/)[1].slice(1);
  const online = worker(); let result;
  online.events.fetch({request: {method: 'GET', url: 'https://game.test' + entry + '?v=7'}, respondWith: p => result = p, waitUntil: () => {}});
  assert.equal(await (await result).text(), 'network'); assert.equal(online.network.length, 1);
  const off = worker({offline: true});
  off.events.fetch({request: {method: 'GET', url: 'https://game.test' + entry + '?v=7'}, respondWith: p => result = p, waitUntil: () => {}});
  assert.equal(await (await result).text(), 'pinned-v7:https://game.test' + entry);
  off.events.fetch({request: {method: 'GET', url: 'https://game.test/'}, respondWith: p => result = p, waitUntil: () => {}});
  assert.equal(await (await result).text(), 'pinned-v7:https://game.test/', 'the app shell works offline');
});

test('Offline cache miss produces an honest 503; external, non-GET and unknown files are not intercepted', async () => {
  const w = worker({cached: false, offline: true}); let result;
  w.events.fetch({request: {method: 'GET', url: 'https://game.test/'}, respondWith: p => result = p}); assert.equal((await result).status, 503);
  for (const url of ['https://nasa.gov/', 'https://game.test/report.json', 'https://game.test/TRAJECTIQ_Play.html']) { let handled = false; w.events.fetch({request: {method: 'GET', url}, respondWith: () => handled = true}); assert.equal(handled, false, url); }
  let handled = false; w.events.fetch({request: {method: 'POST', url: 'https://game.test/'}, respondWith: () => handled = true}); assert.equal(handled, false);
});
