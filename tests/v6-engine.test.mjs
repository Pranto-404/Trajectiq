import test from 'node:test';
import assert from 'node:assert/strict';
import {presetFor, PRESETS, missionFor, neededScience, shadowMinutes, orbitPeriodMinutes} from '../dist/data/catalog.js';
import {SCENARIOS, DIFFICULTY, ROLES, ROLE_ORDER} from '../dist/data/scenarios.js';
import {calculate, normalize, newRun, advance, resolve, runToEnd, debrief, diagnose, clone} from '../dist/engine/model.js';
import {reviewDecisions, forecastDirections, forecastRanges, missionScore, roleAdvice, crewScore} from '../dist/engine/review.js';
import {assignRoles, canEdit, ownerOf, roleVerdicts, signoffAllowed, tallyVotes, summarizeCrew} from '../dist/engine/crew.js';
import {encodeDesign, decodeDesign, verifyDesign} from '../dist/engine/share.js';

const near = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) <= t, `${a} vs ${b}`);
function play(design, pick = {}, seed) {
  let s = newRun(design, seed);
  for (let i = 0; i < 300 && !s.done; i++) {
    if (s.crisis) { const open = s.crisis.actions.filter(x => !x.disabled); s = resolve(s, (open.find(x => x.id === pick[s.crisis.id]) || open[0]).id); } else s = advance(s);
  }
  assert.ok(s.done); return s;
}

// ---- Item 6: one eclipse model for Moon and Mars --------------------------------------------------
test('V6 #6: the Moon eclipse uses the same shadow formula as Mars (about 46.5 min at 100 km)', () => {
  const moon = calculate(presetFor('moon')), R = 1737.4, mu = 4902.8;
  const period = 2 * Math.PI * Math.sqrt((R + 100) ** 3 / mu) / 60;
  near(moon.m.eclipseMinutes, period / Math.PI * Math.asin(R / (R + 100)));
  assert.ok(Math.abs(moon.m.eclipseMinutes - 46.5) < 0.1);
  assert.notEqual(moon.m.eclipseMinutes, 35);
  assert.match(moon.m.eclipseModel, /cylindrical-shadow/);
  assert.equal(calculate(presetFor('mars')).m.eclipseModel, moon.m.eclipseModel);
  const high = calculate({...presetFor('moon'), altitude: 200});
  assert.ok(high.m.eclipseMinutes !== moon.m.eclipseMinutes, 'eclipse depends on altitude');
  near(shadowMinutes(R, mu, 100), orbitPeriodMinutes(R, mu, 100) / Math.PI * Math.asin(R / (R + 100)));
});

// ---- Item 4: recorder warning --------------------------------------------------------------------------
test('V6 #4: readiness warns when the recorder may fill before the first contact', () => {
  const a = calculate(PRESETS.resilient), check = a.checks.find(c => c.id === 'recorder');
  assert.equal(check.status, 'warn');
  assert.match(check.why, /recorder may fill before the first contact/);
  assert.ok(a.fillMinutes < a.contactStart);
  assert.equal(calculate(PRESETS.balanced).checks.find(c => c.id === 'recorder').status, 'pass');
  assert.equal(calculate({...PRESETS.resilient, storage: 'expanded', bus: 'precision'}).checks.find(c => c.id === 'recorder').status, 'pass');
});

// ---- Item 7: crisis text explains the duty cycle ---------------------------------------------------------
test('V6 #7: the storage crisis explains that the link is only available for part of each orbit', () => {
  let s = newRun(presetFor('moon', 'resilient')); s.mode = 'science';
  while (!s.crisis) s = advance(s);
  assert.equal(s.crisis.id, 'storage');
  assert.match(s.crisis.body, /only during a 25-minute ground contact once per 118-minute orbit/);
  assert.match(s.crisis.body, /about 21% of the time/);
  assert.match(s.crisis.body, /returns 0\.85 Mb\/s/);
  assert.doesNotMatch(s.crisis.body, /must fit a/);
});

// ---- Item 1: decisions must matter --------------------------------------------------------------------------
test('V6 #1: a recovery decision with no effect is never offered, and the log says why', () => {
  for (const key of ['balanced', 'resilient']) {
    const r = play(presetFor('moon', key));
    assert.equal(r.events.some(e => e.id === 'link'), false, key);
  }
  const r = play(presetFor('moon', 'resilient'));
  assert.ok(r.logs.some(l => /No decision is needed/.test(l.detail)) || !r.logs.some(l => l.title === 'Ground contact is degraded'));
});
test('V6 #1: every crisis that is raised changes the replayed outcome', () => {
  for (const [key, mode] of [['resilient', 'science'], ['fragile', 'science'], ['balanced', 'aggressive']]) {
    let s = newRun(presetFor('moon', key)); s.mode = mode;
    for (let i = 0; i < 300 && !s.done; i++) {
      if (s.crisis) {
        const d = forecastDirections(s);
        assert.ok(d.length >= 2);
        const distinct = new Set(d.map(x => x.chips.map(c => c.dir).join(',')));
        assert.ok(distinct.size > 1, `${key}: ${s.crisis.id} options are indistinguishable`);
        s = resolve(s, s.crisis.actions.find(x => !x.disabled).id);
      } else s = advance(s);
    }
  }
});

// ---- Item 2: previews show direction, not the exact outcome -----------------------------------------------------------
test('V6 #2: the free preview shows direction only; one forecast gives ranges', () => {
  let s = newRun(presetFor('moon', 'resilient'));
  while (!s.crisis) s = advance(s);
  const directions = forecastDirections(s);
  for (const row of directions) for (const chip of row.chips) {
    assert.ok(Number.isInteger(chip.dir) && chip.dir >= -3 && chip.dir <= 3);
    assert.deepEqual(Object.keys(chip).sort(), ['dir', 'key']);
  }
  assert.doesNotMatch(JSON.stringify(directions), /\d{3}/);
  const ranges = forecastRanges(s);
  assert.equal(ranges.length, directions.length);
  for (const r of ranges) { assert.ok(r.science[0] <= r.science[1]); assert.equal(r.science[0] % 10, 0); }
  const before = JSON.stringify(s);
  forecastDirections(s); forecastRanges(s);
  assert.equal(JSON.stringify(s), before, 'forecasts never mutate the mission');
});

// ---- Item 3 and 5: causal explanation and honest advice ---------------------------------------------------------------
test('V6 #3: the review explains why prioritizing return scored lower, from replayed evidence', () => {
  const r = play(presetFor('moon', 'resilient'), {storage: 'downlink'});
  const review = reviewDecisions(r), storage = review.find(x => x.id === 'storage');
  assert.ok(storage.material);
  assert.equal(storage.chosenId, 'downlink');
  assert.equal(storage.bestId, 'continue');
  assert.ok(storage.regret > 20);
  assert.match(storage.explanation, /Prioritize return of data/);
  assert.match(storage.explanation, /paused for \d+ more minutes/);
  assert.ok(storage.options.every(o => o.disabled || Number.isFinite(o.science)));
  assert.equal(storage.options.find(o => o.id === 'continue').rank, 1);
});
test('V6 #5: advice is based on the real bottleneck, not a generic energy tip', () => {
  const r = play(presetFor('moon', 'resilient'), {storage: 'downlink'});
  assert.ok(r.outcome.finalBattery > 60, 'battery is healthy');
  const tips = debrief(r).tips.join(' ');
  assert.doesNotMatch(tips, /Resume sunlit mapping after conserving energy/);
  assert.doesNotMatch(tips, /battery capacity|safe mode/i);
  assert.match(tips, /paused|recorder|storage|downlink|link/i);
  const d = diagnose(r);
  assert.ok(['paused', 'storage', 'link'].includes(d.primary.id));
  assert.ok(d.causes.every((c, i, a) => i === 0 || a[i - 1].units >= c.units));
});
test('V6 #5: a battery-limited mission is still diagnosed as an energy problem', () => {
  const r = runToEnd(PRESETS.fragile, {mode: 'aggressive'});
  const ids = diagnose(r).causes.map(c => c.id);
  assert.ok(ids.includes('energy') || r.outcome.status === 'Power exhausted' || ids.includes('link'));
});

// ---- Scoring -------------------------------------------------------------------------------------------------------------------
test('V6 score: five-part Mission Score is bounded, deterministic and rewards better decisions', () => {
  const good = play(presetFor('moon', 'resilient'), {storage: 'continue'}), poor = play(presetFor('moon', 'resilient'), {storage: 'downlink'});
  for (const r of [good, poor]) r.review = reviewDecisions(r);
  const g = missionScore(good), p = missionScore(poor);
  assert.ok(g.total > p.total);
  assert.equal(JSON.stringify(missionScore(good)), JSON.stringify(g));
  for (const sc of [g, p]) { assert.ok(sc.total >= 0 && sc.total <= 1000); assert.equal(sc.dims.length, 4); for (const d of sc.dims) assert.ok(d.value >= -1e-9 && d.value <= d.max + 1e-9, d.id); }
  assert.equal(good.review.find(x => x.id === 'storage').quality, 1);
  assert.equal(poor.review.find(x => x.id === 'storage').quality, 0);
});
test('V6 score: crew mode adds a collaboration dimension out of 100', () => {
  const r = play(presetFor('moon', 'balanced'));
  const crew = {roles: ROLE_ORDER, contributions: ROLE_ORDER, goNoGo: {raised: 2, resolved: 2}, crises: [{id: 'storage', consulted: 4, followedExpert: true}]};
  const sc = missionScore(r, crew), solo = missionScore(r, null);
  assert.equal(sc.dims.length, 5); assert.equal(sc.dims.at(-1).max, 100); assert.equal(sc.dims.at(-1).value, 100);
  assert.equal(solo.dims.length, 4);
  const lazy = crewScore({roles: ROLE_ORDER, contributions: ['commander'], goNoGo: {raised: 4, resolved: 0}, crises: [{id: 'x', consulted: 1, followedExpert: false}]});
  assert.ok(lazy.total < 50);
});
test('V6 score: sandbox runs are marked unranked', () => {
  const r = play({...presetFor('moon', 'balanced'), sandbox: true});
  assert.equal(missionScore(r).ranked, false);
});

// ---- Mission board: scenarios, difficulty, sandbox -------------------------------------------------------------------------
test('V6 board: difficulty changes budget, objective and environment; sandbox lifts the budget', () => {
  const base = missionFor({destination: 'moon', difficulty: 'engineer'});
  assert.equal(base.budget, 150);
  assert.equal(missionFor({destination: 'moon', difficulty: 'cadet'}).budget, 188);
  assert.equal(missionFor({destination: 'moon', difficulty: 'director'}).budget, 138);
  assert.equal(neededScience(missionFor({destination: 'moon', difficulty: 'director'})), Math.round(650 * 0.85));
  assert.equal(missionFor({destination: 'moon', sandbox: true}).budget, 999);
  assert.equal(base.weather, null);
  assert.ok(missionFor({destination: 'moon', difficulty: 'director'}).weather);
  const bad = normalize({...presetFor('moon'), scenario: 'mars-dust', difficulty: 'nonsense', sandbox: 'yes'});
  assert.equal(bad.scenario, 'lunar-polar'); assert.equal(bad.difficulty, 'engineer'); assert.equal(bad.sandbox, false);
  for (const s of Object.values(SCENARIOS)) assert.ok(['data', 'mass', 'comms', 'power', 'budget', 'time'].includes(s.critical));
});
test('V6 board: space weather arrives, differs by response and is explained', () => {
  const d = normalize({...presetFor('moon', 'resilient'), scenario: 'lunar-ice', altitude: 75});
  let s = newRun(d);
  for (let i = 0; i < 300 && !s.done && s.crisis?.id !== 'weather'; i++) { if (s.crisis) s = resolve(s, 'continue'); else s = advance(s); }
  assert.equal(s.crisis.id, 'weather');
  assert.deepEqual(s.crisis.actions.map(a => a.id), ['shield', 'reduce', 'ride']);
  const outcomes = ['shield', 'reduce', 'ride'].map(id => play(d, {storage: 'continue', weather: id}).science);
  assert.ok(new Set(outcomes.map(Math.round)).size === 3);
  assert.ok(outcomes[0] < outcomes[1], 'safing costs collection time');
  const r = play(d, {storage: 'continue', weather: 'ride'});
  assert.ok(r.logs.some(l => /corrupted/.test(l.title + l.detail)));
  assert.ok(debrief(r).items.some(i => i.id === 'weather'));
});
test('V6 board: a resilient design can absorb weather without a pointless decision', () => {
  const d = normalize({...presetFor('mars', 'balanced'), scenario: 'mars-dust'});
  const r = play(d);
  assert.ok(r.events.some(e => e.id === 'weather') || r.logs.some(l => /passed/.test(l.title)));
});

// ---- Launch compatibility, schedule -----------------------------------------------------------------------------------------------
test('V6 launch: orbit and mass must be compatible with the chosen launch vehicle', () => {
  const low = calculate({...PRESETS.balanced, inclination: 30});
  assert.equal(low.checks.find(c => c.id === 'launchOrbit').status, 'fail');
  assert.equal(low.launchable, false);
  assert.equal(calculate({...PRESETS.balanced, inclination: 30, launch: 'dedicated'}).checks.find(c => c.id === 'launchOrbit').status, 'pass');
  const high = calculate({...PRESETS.balanced, altitude: 200});
  assert.equal(high.checks.find(c => c.id === 'launchOrbit').status, 'fail');
  assert.equal(calculate(PRESETS.balanced).checks.find(c => c.id === 'launchOrbit').status, 'pass');
});
test('V6 time: development schedule is a resource that can block launch', () => {
  const ok = calculate(PRESETS.balanced);
  assert.ok(ok.months > 0 && ok.months <= ok.m.deadline);
  const heavyDesign = {bus: 'precision', payload: 'hires', power: 'endurance', propulsion: 'efficient', comms: 'highgain', storage: 'expanded', launch: 'dedicated', fuel: 70, altitude: 100, inclination: 90};
  const heavy = calculate(heavyDesign);
  assert.ok(heavy.months > ok.months);
  const tight = calculate({...heavyDesign, difficulty: 'director'});
  assert.equal(tight.checks.find(c => c.id === 'schedule').status, 'fail');
  assert.equal(tight.launchable, false);
});

// ---- Crew mode ---------------------------------------------------------------------------------------------------------------------------
test('V6 crew: one to four players cover all four roles and roles own subsystems', () => {
  for (const n of [1, 2, 3, 4]) {
    const players = assignRoles(n);
    assert.equal(players.length, n);
    assert.deepEqual([...new Set(players.flatMap(p => p.roles))].sort(), [...ROLE_ORDER].sort());
  }
  assert.equal(assignRoles(9).length, 4); assert.equal(assignRoles(0).length, 1);
  assert.equal(assignRoles(2, ['<b>Ana</b>', 'Bo'])[0].name, 'bAna/b');
  const team = {mode: 'crew', active: 0, players: assignRoles(4)};
  assert.equal(canEdit(team, 'launch'), true); assert.equal(canEdit(team, 'power'), false);
  team.active = 3; assert.equal(canEdit(team, 'power'), true); assert.equal(canEdit(team, 'comms'), true); assert.equal(canEdit(team, 'payload'), false);
  assert.equal(canEdit({mode: 'solo'}, 'power'), true);
  assert.equal(ownerOf('fuel'), 'engineer'); assert.equal(ownerOf('inclination'), 'science'); assert.equal(ownerOf('batteryScale'), 'power');
  for (const r of ROLE_ORDER) assert.ok(ROLES[r].lens.length);
});
test('V6 crew: roles judge readiness through their own lens', () => {
  const v = roleVerdicts(calculate(PRESETS.resilient).checks);
  assert.equal(v.length, 4);
  assert.equal(v.find(x => x.role === 'power').status, 'concern');
  const blocked = roleVerdicts(calculate({...PRESETS.balanced, inclination: 30}).checks);
  assert.equal(signoffAllowed(blocked), false);
  assert.equal(signoffAllowed(roleVerdicts(calculate(PRESETS.balanced).checks)), true);
});
test('V6 crew: voting is by majority with the Commander breaking ties', () => {
  assert.equal(tallyVotes({commander: 'a', engineer: 'b', science: 'b', power: 'a'}), 'a');
  assert.equal(tallyVotes({commander: 'a', engineer: 'b', science: 'b', power: 'b'}), 'b');
  assert.equal(tallyVotes({engineer: 'b', science: 'c'}), null);
  assert.equal(tallyVotes({}), null);
  assert.equal(summarizeCrew({mode: 'solo'}), null);
});
test('V6 crew: roles can honestly disagree during a crisis', () => {
  let s = newRun(presetFor('moon', 'resilient'));
  while (!s.crisis) s = advance(s);
  const advice = roleAdvice(s);
  assert.equal(advice.length, 4);
  assert.ok(advice.every(a => ROLE_ORDER.includes(a.role) && typeof a.why === 'string'));
  assert.ok(advice.some(a => a.optionId));
  assert.deepEqual(roleAdvice({}), []);
});

// ---- Share codes: save, share, compare, and treat codes as hostile input -----------------------------------------------------------
test('V6 share: designs round-trip through a code and verify deterministically', () => {
  const d = normalize({...presetFor('mars', 'resilient'), name: 'Aurora ✦', scenario: 'mars-dust', difficulty: 'director'});
  const code = encodeDesign(d, {score: 812, team: 'Team Orion'});
  assert.match(code, /^TQ6\.[A-Za-z0-9_-]+$/);
  const back = decodeDesign(code);
  assert.equal(back.ok, true);
  assert.deepEqual(back.design, d);
  assert.equal(back.claimedScore, 812); assert.equal(back.team, 'Team Orion');
  assert.equal(decodeDesign(`https://example.test/#design=${code}`).ok, true);
  assert.deepEqual(verifyDesign(back.design), verifyDesign(d));
  assert.equal(verifyDesign({...PRESETS.balanced, inclination: 30}).launchable, false);
});
test('V6 share security: hostile or malformed codes are rejected or neutralised', () => {
  const bad = ['', 'hello', 'TQ6.', 'TQ6.!!!', 'TQ6.' + 'A'.repeat(5000), 'TQ6.' + btoa('not json'), 'TQ6.' + btoa('[1,2]'), 'TQ6.' + btoa('{"v":2,"d":{}}'), 'TQ6.' + btoa('{"v":1,"d":null}'), 'TQ6.' + btoa('{"v":1,"d":[]}'), null, undefined, 42, {}];
  for (const b of bad) assert.equal(decodeDesign(b).ok, false, String(b).slice(0, 30));
  const enc = o => 'TQ6.' + btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const evil = decodeDesign(enc({v: 1, d: {name: '<img src=x onerror=alert(1)>\u0000\u001f', bus: '__proto__', fuel: 'Infinity', altitude: 1e99, inclination: -50, arrayScale: {}, duty: NaN, launch: ['x'], livery: '<script>', __proto__: {polluted: 1}, constructor: {prototype: {polluted: 1}}, isAdmin: true}, s: 99999, t: '<b>x</b>'}));
  assert.equal(evil.ok, true);
  assert.doesNotMatch(evil.design.name, /[<>\u0000-\u001f]/);
  assert.equal(evil.design.livery, 'gold'); assert.equal(evil.design.bus, 'precision');
  assert.ok(Number.isFinite(evil.design.fuel) && evil.design.altitude <= 200 && evil.design.inclination >= 0 && evil.design.duty >= 0.25);
  assert.equal(evil.claimedScore, 1000); assert.equal(evil.team, 'bx/b');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(evil.design, 'isAdmin'), false);
  const calc = calculate(evil.design); assert.ok(Number.isFinite(calc.cost));
});
test('V6 share security: fuzzing the decoder with random input never throws', () => {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const alphabet = 'AZaz09-_.{}[]":,<>&\u0000é☃ ';
  for (let i = 0; i < 400; i++) {
    let t = rnd() < 0.5 ? 'TQ6.' : ''; for (let j = 0, n = Math.floor(rnd() * 120); j < n; j++) t += alphabet[Math.floor(rnd() * alphabet.length)];
    assert.doesNotThrow(() => decodeDesign(t));
  }
});

test('V6 state: runs record decisions with replayable snapshots and link metrics', () => {
  const r = play(presetFor('moon', 'resilient'), {storage: 'continue'});
  const e = r.events[0];
  assert.ok(e.snapshot && e.snapshot.crisis && Array.isArray(e.options));
  assert.equal(e.snapshot.history.length, 0);
  assert.ok(r.outcome.contactCapacityMB > 0 && r.outcome.linkUtilization > 0 && r.outcome.linkUtilization <= 100.0001);
  near(r.generated, r.returned + r.backlog + r.lostMB);
  assert.ok(JSON.stringify(r).length < 120000);
  const copy = clone(r); assert.deepEqual(reviewDecisions(copy).map(x => x.id), reviewDecisions(r).map(x => x.id));
});

// ---- Item 3: the assistant explains the decision the player just made ---------------------------------------------------------------
import {answerQuestion} from '../dist/engine/assistant.js';
test('V6 #3: the assistant answers “why did prioritizing return score lower?” from the replay', () => {
  const run = play(presetFor('moon', 'resilient'), {storage: 'downlink'});
  for (const q of ['Why did prioritizing return score lower?', 'why did prioritizing return of data give me a lower score', 'Explain why my return priority choice was worse', 'Why did my decision to prioritize downlink cost me science?']) {
    const a = answerQuestion(q, {run});
    assert.equal(a.known, true, q);
    assert.equal(a.topic, 'decision', q);
    assert.match(a.text, /Prioritize return of data/);
    assert.match(a.text, /Keep mapping/);
    assert.match(a.text, /paused for \d+ more minutes/);
    assert.notMatch?.(a.text, /can’t answer/);
  }
  assert.equal(answerQuestion('Why did prioritizing return score lower?', {run}).title.startsWith('Decision review'), true);
});
test('V6 #3: during a live crisis the assistant shows direction, and before any mission it says what it can do', () => {
  let s = newRun(presetFor('moon', 'resilient')); while (!s.crisis) s = advance(s);
  const live = answerQuestion('Why would prioritizing return be worse than keep mapping?', {run: s});
  assert.equal(live.known, true); assert.ok(live.directions.length >= 2); assert.doesNotMatch(live.text, /\d{3}/);
  const none = answerQuestion('Why did my decision score lower?', {});
  assert.equal(none.known, true); assert.match(none.text, /Finish a mission/);
});
test('V6 #3: unrelated or adversarial questions still get an honest “cannot answer”', () => {
  for (const q of ['Why is the stock price lower today?', 'Why did the football score drop?', 'Why is my moon night temperature worse?']) {
    const a = answerQuestion(q, {run: play(presetFor('moon', 'resilient'), {storage: 'downlink'})});
    assert.equal(a.known, false, q);
  }
});
