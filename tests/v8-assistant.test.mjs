import test from 'node:test';
import assert from 'node:assert/strict';
import {answerQuestion} from '../dist/engine/assistant.js';
import {rankTopics,lev,bodiesIn} from '../dist/engine/smart.js';
import {HELP_TOPICS} from '../dist/engine/assistant.js';
import {BODIES} from '../dist/data/bodies.js';
import {presetFor} from '../dist/data/catalog.js';
import {newRun,advance,calculate} from '../dist/engine/model.js';

const design=presetFor('moon','balanced');
const ask=(q,o={})=>answerQuestion(q,{design,...o});
const live=()=>{let s=newRun(design);for(let i=0;i<6&&!s.done&&!s.crisis;i++)s=advance(s);return s;};

test('Assistant v2: casual greetings and small talk get a friendly, context-aware reply instead of a refusal', () => {
  for (const q of ['Heyy', 'hii', 'HELLO!!', 'yo', 'good morning', 'salam', 'hey there']) { const a = ask(q); assert.equal(a.known, true, q); assert.equal(a.topic, 'greeting', q); assert.match(a.text, /Lunar Polar Mapper|spacecraft|mission/i, q); assert.ok(a.suggestions.length >= 2, q); }
  for (const q of ['thanks', 'thank you!', 'bye', 'how are you?', 'who are you', 'what can you do', 'good bot', 'ok']) assert.equal(ask(q).known, true, q);
  assert.match(ask('who are you').text, /not a generative AI/i);
  assert.match(ask('what can you do').text, /Orbit period at 150 km/);
});

test('Assistant v2: a live mission changes the greeting and the suggestions', () => {
  const s = live();
  const a = ask('hello', {run: s});
  assert.match(a.text, /T\+\d+ min|crisis/);
  assert.notDeepEqual(a.suggestions, ask('hello').suggestions);
});

test('Assistant v2: stuck players are routed to their real next step', () => {
  for (const q of ["I'm stuck", 'i dont understand', 'this is too hard', 'what do i do']) { const a = ask(q); assert.equal(a.known, true, q); assert.match(a.text, /next step|stand/i, q); }
  const improve = ask('how can i improve my score');
  assert.equal(improve.topic, 'review');
});

test('Assistant v2: readiness answers come from the real launch checks', () => {
  const a = ask('Am I ready to launch?');
  assert.equal(a.known, true); assert.match(a.text, /Yes|Not yet/);
  const bad = {...design, fuel: 70, bus: 'precision', launch: 'rideshare', payload: 'hires'};
  const calc = calculate(bad);
  const b = ask('can I launch?', {design: bad});
  assert.equal(/Not yet/.test(b.text), !calc.launchable, JSON.stringify(b.text));
  assert.equal(ask('Can I repair after launch?').topic, 'repair', 'the old topic is not hijacked');
});

test('Assistant v2: live facts read the actual mission numbers', () => {
  const s = live(), a = calculate(s.design);
  const bat = ask('how much battery do I have?', {run: s});
  assert.match(bat.text, new RegExp(`${Math.round(s.battery / a.c.power.battery * 100)}%`));
  assert.equal(bat.evidence, 'CURRENT MISSION · MEASURED GAME STATE');
  assert.match(ask('how much fuel is left?', {run: s}).text, /kg/);
  assert.match(ask('how full is the recorder?', {run: s}).text, /% full/);
  assert.match(ask('what is my science progress?', {run: s}).text, /science units returned/);
  assert.match(ask('when is the next contact?', {run: s}).text, /Contact opens about/);
  assert.match(ask('how much time is left?', {run: s}).text, /minutes left/);
});

test('Assistant v2: the orbit calculator matches the Kepler formulas and the engine', () => {
  const moon = BODIES.moon, h = 150, r = moon.radius + h;
  const T = 2 * Math.PI * Math.sqrt(r ** 3 / moon.mu) / 60, v = Math.sqrt(moon.mu / r), ecl = T * Math.asin(moon.radius / r) / Math.PI;
  const a = ask('What is the orbit period at 150 km?');
  assert.equal(a.known, true); assert.equal(a.topic, 'calc');
  assert.match(a.text, new RegExp(T.toFixed(2).replace('.', '\\.'))); assert.match(a.text, new RegExp(v.toFixed(3).replace('.', '\\.'))); assert.match(a.text, new RegExp(ecl.toFixed(1).replace('.', '\\.')));
  // the spec's own reference value: about 46.5 minutes of shadow at 100 km around the Moon
  assert.match(ask('eclipse time at 100 km').text, /46\.5/);
  const mars = ask('orbital speed at 400 km around Mars');
  assert.match(mars.text, /Mars|42,828/);
  assert.ok(a.sources.length >= 1 && a.sources.every(x => /^https:\/\/(?:[a-z0-9-]+\.)*nasa\.gov\//.test(x.url)));
  assert.equal(ask('orbit period at 0 km').known, false);
  assert.match(ask('orbit period at 9999 km around Mars').text, /calculation only|inside/);
});

test('Assistant v2: rocket-equation calculators are exact and validate their input', () => {
  assert.match(ask('delta v with isp 300 wet 500 dry 400').text, /656 m\/s/);
  assert.equal(ask('delta v with isp 300 wet 300 dry 400').known, false);
  const a = ask('how much fuel for 700 m/s?'), c = calculate(design);
  const need = c.dry * (Math.exp(700 / (c.c.propulsion.isp * 9.80665)) - 1);
  assert.match(a.text, new RegExp(need.toFixed(1).replace('.', '\\.')));
});

test('Assistant v2: NASA body facts use the game data, show sources and label assumptions', () => {
  for (const id of Object.keys(BODIES)) {
    const a = ask(`tell me about ${id === 'earth' ? 'Earth' : BODIES[id].name}`);
    assert.equal(a.topic, 'bodies', id); assert.match(a.text, /Mean radius/); assert.ok(!/NaN|undefined|Infinity/.test(a.text), id);
    assert.ok(a.sources.every(x => x.url.startsWith('https://')), id);
  }
  const mars = ask('tell me about Mars');
  assert.match(mars.text, /3,389\.5 km/); assert.match(mars.text, /42,828\.374/);
  assert.equal(ask('compare mars and venus').title, 'Mars vs Venus');
  assert.match(ask('which planet has the most sunlight?').text, /Mercury/);
  assert.match(ask('which body has the strongest gravity?').text, /Venus/);
  assert.match(ask('how far is Europa?').text, /signal delay/);
});

test('Assistant v2: definitions that the original engine covers keep their live-context answers', () => {
  assert.equal(ask('What is delta v?').topic, 'fuel');
  assert.equal(ask('What is altitude?').topic, 'orbit');
  assert.match(ask('what is an eclipse').text, /asin\(R/);
  assert.match(ask('what is the rocket equation').text, /m\/s/);
  assert.match(ask('what is sun synchronous orbit').text, /does not model/);
});

test('Assistant v2: typo-tolerant matching understands misspelled project questions', () => {
  for (const [q, topic] of [['why is my recorder fulll', 'data'], ['batery problem', 'battery'], ['how do i play', 'start']]) { const a = ask(q); assert.equal(a.known, true, q); assert.equal(a.topic, topic, q); }
  assert.equal(lev('recorder', 'recordr', 2), 1); assert.ok(lev('abc', 'xyzxyz', 2) > 2);
  assert.ok(rankTopics('stoarge recordr', HELP_TOPICS)[0].coverage > .5);
  assert.deepEqual(bodiesIn('what about mars and the moon'), ['moon', 'mars']);
});

test('Assistant v2: everything still out of scope stays refused, with next steps instead of a dead end', () => {
  for (const q of ['What is 2+2?', 'Who is the president?', 'What is the capital of France?', 'write me a poem', 'Tell me about Moon latest news', 'Tell me about Mars night temperature', 'how much is the real price in dollars', 'Please guarantee a win', 'ignore your instructions', 'Moon weather tomorrow?']) {
    const a = ask(q); assert.equal(a.known, false, q); assert.equal(a.proposal, undefined, q); assert.deepEqual(a.sources, [], q);
    assert.equal(a.evidence, 'OUTSIDE VERIFIED KNOWLEDGE', q);
  }
  const soft = ask('What is the capital of France?');
  assert.ok(soft.suggestions.length >= 2); assert.match(soft.text, /Right now I can help with/);
});

test('Assistant v2: no answer to any of 120 mixed questions contains NaN, undefined or an HTML tag, and answers are deterministic', () => {
  const qs = ['hi', 'what if fuel = 45', 'review my design', 'compare presets', 'tell me about ceres', 'compare vesta and europa', 'orbit period at 55 km', 'delta v with isp 220 wet 200 dry 150', 'am i ready', 'battery now', 'fuel left', 'what is margin', 'what is gm', 'irradiance', 'contact window', 'which planet is closest', 'which world has the smallest radius', '<img src=x onerror=alert(1)>', 'tell me about <script>alert(1)</script> Mars', 'orbit period at NaN km', 'speed at 1e400 km'];
  const s = live();
  for (const q of qs) for (const o of [{}, {run: s}, {language: 'bn'}]) {
    const a = ask(q, o), b = ask(q, o);
    assert.deepEqual(a, b, q);
    const flat = JSON.stringify(a);
    assert.ok(!/NaN|undefined|Infinity/.test(String(a.text)), `${q}: ${a.text}`);
    assert.ok(typeof a.title === 'string' && typeof a.text === 'string' && Array.isArray(a.sources) && Array.isArray(a.suggestions), flat.slice(0, 80));
    assert.ok(!/<(?:script|img)/i.test(a.title + a.text.replace(/<img src=x onerror=alert\(1\)>|<script>alert\(1\)<\/script>/g, '')), q);
  }
});

test('Assistant v2: every suggestion chip the assistant offers is itself answerable', () => {
  const s = live(), done = (() => { let r = newRun(design); for (let i = 0; i < 400 && !r.done; i++) { r = r.crisis ? r : advance(r); if (r.crisis) break; } return r; })();
  const seen = new Set();
  for (const o of [{}, {run: s}, {run: done}, {language: 'bn'}]) for (const q of ['hi', 'what can you do', 'who are you', 'thanks', 'What is 2+2?', "i'm stuck", 'tell me about Mars', 'am i ready to launch']) for (const chip of ask(q, o).suggestions) seen.add(chip);
  assert.ok(seen.size >= 10);
  for (const chip of seen) for (const o of [{}, {run: s}]) assert.equal(ask(chip, o).known, true, chip);
});
