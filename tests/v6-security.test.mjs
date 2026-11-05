import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runToEnd} from '../dist/engine/model.js';
import {presetFor} from '../dist/data/catalog.js';
import {encodeDesign} from '../dist/engine/share.js';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
function walk(dir, out = []) { for (const f of readdirSync(new URL(dir, root))) { const p = `${dir}${f}`; if (statSync(new URL(p, root)).isDirectory()) walk(p + '/', out); else out.push(p); } return out; }
const sources = walk('dist/').filter(p => p.endsWith('.js') || p.endsWith('.html') || p.endsWith('.css'));
const headers = JSON.parse(read('vercel.json')).headers;
const directive = (policy, name) => (policy.split(';').map(x => x.trim()).find(x => x.startsWith(name + ' ')) || '').slice(name.length).trim();

test('Security: hosted pages ship a strict Content-Security-Policy and hardening headers', () => {
  const all = Object.fromEntries(headers.find(h => h.source === '/(.*)').headers.map(h => [h.key, h.value]));
  assert.equal(all['X-Content-Type-Options'], 'nosniff'); assert.equal(all['X-Frame-Options'], 'DENY');
  assert.equal(all['Cross-Origin-Opener-Policy'], 'same-origin'); assert.equal(all['Cross-Origin-Resource-Policy'], 'same-origin');
  assert.match(all['Strict-Transport-Security'], /max-age=\d{7,}/); assert.match(all['Referrer-Policy'], /strict-origin/);
  for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) assert.match(all['Permissions-Policy'], new RegExp(`${feature}=\\(\\)`));
  const csp = headers.flatMap(h => h.headers).find(h => h.key === 'Content-Security-Policy').value;
  assert.equal(directive(csp, 'default-src'), "'self'");
  assert.equal(directive(csp, 'script-src'), "'self'", 'no inline or eval scripts on the hosted pages');
  assert.equal(directive(csp, 'object-src'), "'none'"); assert.equal(directive(csp, 'frame-ancestors'), "'none'"); assert.equal(directive(csp, 'base-uri'), "'none'"); assert.equal(directive(csp, 'form-action'), "'none'");
  assert.equal(directive(csp, 'connect-src'), "'self'");
  assert.doesNotMatch(csp, /unsafe-eval|https?:|\*/);
  const scope = headers.find(h => h.headers.some(x => x.key === 'Content-Security-Policy')).source;
  assert.ok(new RegExp(`^${scope}$`.replace(/^\^\//, '^/')).test('/index.html') || /\(\?!TRAJECTIQ_Play/.test(scope));
  assert.match(scope, /\(\?!TRAJECTIQ_Play\\.html\)/, 'the standalone file carries its own hash-pinned policy instead');
});

test('Security: the standalone file pins its exact script by hash and has no network permission', () => {
  const html = read('dist/TRAJECTIQ_Play.html');
  const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  // Browsers normalise CRLF to LF while parsing HTML, so the hash is over the LF form (a Windows checkout may store CRLF).
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/\r\n/g, '\n');
  assert.equal(directive(meta, 'default-src'), "'none'");
  assert.equal(directive(meta, 'script-src'), `'sha256-${createHash('sha256').update(script).digest('base64')}'`, 'the CSP hash matches the embedded script');
  assert.doesNotMatch(meta, /connect-src|unsafe-eval|https?:/);
  assert.equal(directive(meta, 'base-uri'), "'none'"); assert.equal(directive(meta, 'form-action'), "'none'");
});

test('Security: no code path can evaluate strings, load remote code or open network connections', () => {
  const banned = [[/\beval\s*\(/, 'eval'], [/new\s+Function\s*\(/, 'new Function'], [/document\.write\s*\(/, 'document.write'], [/javascript:/i, 'javascript: URL'], [/\bimportScripts\s*\(/, 'importScripts'], [/\bXMLHttpRequest\b/, 'XMLHttpRequest'], [/\bWebSocket\b/, 'WebSocket'], [/\bEventSource\b/, 'EventSource'], [/\bsendBeacon\b/, 'sendBeacon'], [/\bpostMessage\s*\(/, 'postMessage'], [/setTimeout\s*\(\s*['"`]/, 'string timer'], [/\.insertAdjacentHTML\([^)]*(?:location|document\.cookie)/, 'html from URL']];
  for (const file of sources.filter(p => p.endsWith('.js') || p.endsWith('.html'))) {
    const text = read(file);
    for (const [rx, name] of banned) assert.doesNotMatch(text, rx, `${name} in ${file}`);
    if (file !== 'dist/sw.js') assert.doesNotMatch(text.replace(/\bfetch\(event\.request\)/g, ''), /(?<![.\w])fetch\s*\(/, `fetch in ${file}`);
  }
  assert.doesNotMatch(read('dist/index.html'), /<script(?![^>]*\bsrc=)/, 'no inline script on the hosted page');
  assert.doesNotMatch(read('dist/index.html'), /\son\w+\s*=/i, 'no inline event handlers');
  for (const file of ['dist/ui/app.js', 'dist/ui/panels.js', 'dist/ui/scene.js']) assert.doesNotMatch(read(file), /\son(?:click|error|load|mouseover)=/i, file);
});

test('Security: every external link opens safely and only to NASA, GitHub or the game itself', () => {
  for (const file of ['dist/ui/app.js', 'dist/ui/panels.js']) {
    const text = read(file);
    for (const tag of text.match(/<a [^>]*target="_blank"[^>]*>/g) || []) assert.match(tag, /rel="noopener noreferrer"/, tag);
  }
  const urls = new Set((sources.filter(p => p.endsWith('.js')).map(read).join('\n').match(/https:\/\/[a-z0-9.-]+/gi) || []).map(u => new URL(u).hostname));
  for (const host of urls) assert.match(host, /(^|\.)(nasa\.gov|w3\.org|openapi\.vercel\.sh|github\.com|vercel\.app|jpl\.nasa\.gov|usgs\.gov)$/, host);
});

test('Security: hostile persisted data renders as text on every screen', async () => {
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
  const run = runToEnd(presetFor('moon', 'fragile'), {mode: 'aggressive'});
  Object.assign(run, {id: 'r1', label: evil, modelVersion: '6.0.0', completedAt: new Date().toISOString(), review: [], crew: null, score: null});
  run.logs[0].title = evil; run.logs[0].detail = evil; run.events[0].title = evil; run.events[0].action = evil; run.events[0].effect = evil; run.events[0].chain = [evil, evil]; run.design.name = evil;
  const handlers = {}, els = Object.fromEntries(['#app', '#modal-root', '#toast'].map(k => [k, {innerHTML: '', textContent: '', classList: {add() {}, remove() {}}, focus() {}}]));
  globalThis.document = {body: {classList: {toggle() {}}}, activeElement: {focus() {}}, querySelector: s => els[s] || null, getElementById: () => null, addEventListener: (t, fn) => { handlers[t] = fn; }};
  globalThis.window = {scrollTo() {}};
  const store = new Map([['trajectiq-v1', JSON.stringify({design: {...presetFor('moon'), name: evil, livery: evil, scenario: evil}, runs: [run], prefs: {language: evil}, team: {mode: 'crew', players: [{name: evil}, {name: evil}], suggestions: [{id: evil, owner: 'power', status: 'pending', kind: 'power', part: 'compact', label: evil, fromName: evil}]}, board: [{id: 'x', team: evil, label: evil, scenarioTitle: evil, difficulty: evil, mode: evil, grade: evil, score: 500, code: evil}]})]]);
  globalThis.localStorage = {getItem: k => store.get(k), setItem: (k, v) => store.set(k, v)};
  Object.defineProperty(globalThis, 'navigator', {value: {}, configurable: true});
  globalThis.setTimeout = () => 0; globalThis.clearTimeout = () => {}; globalThis.setInterval = () => 0; globalThis.clearInterval = () => {};
  await import('../dist/ui/app.js');
  const click = dataset => handlers.click({target: {closest: () => ({dataset})}, preventDefault() {}});
  const shots = [];
  for (const page of ['game', 'brief', 'architect', 'readiness', 'control', 'trade', 'sources']) { click({page}); shots.push(els['#app'].innerHTML); }
  click({loadrun: 'r1'}); shots.push(els['#app'].innerHTML); click({action: 'mentor'}); shots.push(els['#modal-root'].innerHTML); click({action: 'close'});
  click({action: 'customize'}); shots.push(els['#modal-root'].innerHTML);
  for (const html of shots) {
    assert.doesNotMatch(html, /<img src=x/i); assert.doesNotMatch(html, /<script>alert/i);
    // Inside a quoted attribute value the text is inert; what must never exist is a handler attribute on a tag.
    const tagsOnly = html.replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/g, '').replace(/"[^"]*"/g, '""');
    assert.doesNotMatch(tagsOnly, /<[^>]*\son\w+\s*=/i);
  }
  assert.ok(shots.some(h => h.includes('&lt;img')), 'hostile text is visible but inert somewhere');
});

test('Security: share codes cannot smuggle markup into a design', () => {
  const code = encodeDesign({...presetFor('moon'), name: '<svg onload=alert(1)>'});
  assert.doesNotMatch(Buffer.from(code.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(), /[<>]/);
});
