// Exports `trajectiq-v1` blobs produced by the CURRENT (v6) application, driven through its real handlers in a fake DOM,
// into tests-ui/fixtures/legacy-saves/. The React store must load each blob, resume paused, and re-save with the same shape.
// Run with: npm run fixtures:legacy   (the fixtures are committed; re-run only if the legacy app changes)
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tests-ui/fixtures/legacy-saves');
mkdirSync(out, {recursive: true});
let serial = 0;

async function legacyApp(initial) {
  const handlers = {}, storage = new Map(initial === undefined ? [] : [['trajectiq-v1', typeof initial === 'string' ? initial : JSON.stringify(initial)]]);
  const els = Object.fromEntries(['#app', '#modal-root', '#toast', '#compare-code', '#share-code'].map(k => [k, {innerHTML: '', textContent: '', value: '', classList: {add() {}, remove() {}}, focus() {}, select() {}, get firstChild() { return this.innerHTML ? {} : null; }}]));
  globalThis.document = {body: {classList: {toggle() {}}}, activeElement: {focus() {}}, querySelector: s => els[s] || null, getElementById: () => null, addEventListener: (t, fn) => { handlers[t] = fn; }};
  globalThis.window = {scrollTo() {}};
  globalThis.localStorage = {getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v)};
  Object.defineProperty(globalThis, 'navigator', {value: {}, configurable: true});
  globalThis.setTimeout = () => 0; globalThis.clearTimeout = () => {}; globalThis.setInterval = () => 0; globalThis.clearInterval = () => {};
  await import('../dist/ui/app.js?legacy=' + serial++);
  const click = dataset => handlers.click({target: {closest: () => ({dataset})}, preventDefault() {}});
  const input = (dataset, value) => handlers.input({target: {dataset, value}});
  return {click, input, html: () => els['#app'].innerHTML, modal: () => els['#modal-root'].innerHTML, stored: () => storage.get('trajectiq-v1')};
}
const write = (name, text) => { writeFileSync(path.join(out, name), text); console.log('wrote', name, text.length, 'bytes'); };
const finish = ui => { for (let i = 0; i < 14 && !ui.html().includes('MISSION COMPLETE'); i++) { if (ui.html().includes('DECISION REQUIRED')) ui.click({recovery: ui.html().includes('data-recovery="continue"') ? 'continue' : ui.html().includes('data-recovery="wait"') ? 'wait' : 'nominal'}); else ui.click({action: 'fast'}); } };

// 1. Fresh player who accepted the mission and customised the spacecraft (no run).
let ui = await legacyApp();
ui.click({action: 'game-accept'}); ui.click({component: 'compact', kind: 'power'}); ui.click({component: 'hires', kind: 'payload'}); ui.input({gamefield: 'fuel'}, '48');
write('01-hangar-draft.json', ui.stored());

// 2. Mid-flight: launched, paused on a pending crisis decision (checkpoint with a crisis).
ui = await legacyApp();
ui.click({action: 'preset-fragile'}); ui.click({action: 'game-launch'});
for (let i = 0; i < 14 && !ui.html().includes('DECISION REQUIRED'); i++) ui.click({action: 'fast'});
write('02-flight-pending-crisis.json', ui.stored());

// 3. Mid-flight in operations (no crisis), after a command.
ui = await legacyApp();
ui.click({action: 'game-launch'}); for (let i = 0; i < 8; i++) ui.click({action: 'step'}); ui.click({command: 'aggressive'});
write('03-flight-operations.json', ui.stored());

// 4. Two finished runs, a leaderboard entry and Bengali + reduced motion preferences.
ui = await legacyApp();
ui.click({action: 'toggle-language'}); ui.click({action: 'toggle-motion'});
ui.click({action: 'preset-fragile'}); ui.click({action: 'game-launch'}); finish(ui);
ui.click({action: 'game-fix'}); ui.click({action: 'confirm-power-fix'}); ui.click({action: 'game-launch'});
for (let i = 0; i < 3; i++) ui.click({action: 'step'}); ui.click({command: 'aggressive'}); finish(ui);
ui.click({action: 'board-add'});
write('04-two-runs-board-bn.json', ui.stored());

// 5. Crew mode with a pending suggestion and a finished crew run.
ui = await legacyApp();
ui.click({action: 'start'}); ui.click({action: 'board-mode', mode: 'crew'}); ui.click({action: 'board-players', players: '3'});
ui.click({action: 'game-accept'}); ui.click({component: 'compact', kind: 'power'});
write('05-crew-suggestion.json', ui.stored());

// 6. Mars destination with Flight Director difficulty.
ui = await legacyApp();
ui.click({action: 'start'}); ui.click({action: 'board-scenario', scenario: 'mars-dust'}); ui.click({action: 'board-difficulty', difficulty: 'director'});
write('06-mars-dust-director.json', ui.stored());

// 7. Damaged raw text (kept verbatim until the player discards it).
write('07-damaged-raw.txt', '{"design":{"name":"broken');
process.exit(0);
