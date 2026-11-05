import test from 'node:test';
import assert from 'node:assert/strict';
import {BODIES, BODY_IDS, PROVENANCE_FIELDS, LEGACY_BODY_IDS, SKIPPED_BODIES, ATTRIBUTION, getBody, isBodyId, bodyRows} from '../dist/data/bodies.js';
import {REAL_MISSIONS, ODYSSEY_SUBSYSTEMS, PROPELLANT_FRACTIONS, getRealMission, missionsFor} from '../dist/data/real-missions.js';
import {NASA_DATA, MARS_DATA, nasaValue, nasaDataset, distanceOptions, datasetCSV} from '../dist/data/nasa.js';
import {CATALOG, SOURCES, sourcesFor, missionFor, presetFor, orbitPeriodMinutes, shadowMinutes, neededScience} from '../dist/data/catalog.js';
import {SCENARIOS, DEFAULT_SCENARIO, DIFFICULTY} from '../dist/data/scenarios.js';
import {calculate, normalize, newRun, advance, resolve, runToEnd, clone, linkEnvironment, robustness} from '../dist/engine/model.js';
import {encodeDesign, decodeDesign, verifyDesign} from '../dist/engine/share.js';
import {answerQuestion} from '../dist/engine/assistant.js';
import * as api from '../dist/engine/api.js';

const near = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) <= t, `${a} vs ${b}`);
const NUMERIC = ['radius', 'mu', 'solarIrradiance', 'referenceDistance', 'altitudeMin', 'altitudeMax', 'defaultAltitude', 'heliocentricAu', 'order'];
const HOSTS = /(^|\.)(nasa\.gov|usgs\.gov)$/;

// ---- Registry integrity -----------------------------------------------------------------------------------------------------
test('V7 registry: every body has finite numbers, provenance for each numeric field, colours and hazards', () => {
  assert.deepEqual(BODY_IDS, ['moon', 'mars', 'earth', 'mercury', 'venus', 'ceres', 'vesta', 'europa']);
  for (const b of Object.values(BODIES)) {
    for (const k of NUMERIC) assert.ok(Number.isFinite(b[k]) && b[k] > 0, `${b.id}.${k}`);
    for (const k of ['near', 'mean', 'far']) assert.ok(Number.isFinite(b.earthRange[k]) && b.earthRange[k] > 0, `${b.id}.earthRange.${k}`);
    for (const k of ['rideshare', 'dedicated']) assert.ok(Number.isFinite(b.launchAltMax[k]) && b.launchAltMax[k] >= b.altitudeMin, `${b.id}.launchAltMax.${k}`);
    assert.ok(b.earthRange.near <= b.earthRange.mean && b.earthRange.mean <= b.earthRange.far, `${b.id} range order`);
    assert.equal(b.referenceDistance, b.earthRange.mean, `${b.id} reference distance is the mean`);
    assert.ok(b.altitudeMin < b.altitudeMax && b.defaultAltitude >= b.altitudeMin && b.defaultAltitude <= b.altitudeMax, `${b.id} altitude range`);
    assert.ok(b.launchAltMax.rideshare <= b.launchAltMax.dedicated && b.launchAltMax.dedicated <= b.altitudeMax, `${b.id} launch envelope`);
    assert.match(b.colors.surface, /^#[0-9a-f]{6}$/); assert.match(b.colors.accent, /^#[0-9a-f]{6}$/);
    assert.ok(b.colors.atmosphere === null || /^#[0-9a-f]{6}$/.test(b.colors.atmosphere));
    assert.ok(Object.keys(b.hazards).length >= 2); for (const v of Object.values(b.hazards)) assert.equal(typeof v, 'string');
    assert.ok(b.directorWeather && ['dust', 'particle', 'thermal', 'radiation'].includes(b.directorWeather.kind));
    for (const f of PROVENANCE_FIELDS) {
      const p = b.provenance[f];
      assert.ok(p, `${b.id} provenance.${f}`);
      assert.ok(['direct', 'derived', 'assumption'].includes(p.kind), `${b.id}.${f} kind`);
      assert.match(p.verified, /^2026-\d\d-\d\d$/); assert.equal(typeof p.unverified, 'boolean'); assert.equal(typeof p.note, 'string');
      if (p.kind === 'assumption') assert.equal(p.unverified, true, `${b.id}.${f} assumptions are flagged`);
      if (p.url) assert.match(new URL(p.url).hostname, HOSTS, `${b.id}.${f} host`);
      if (p.kind !== 'assumption') assert.ok(p.url, `${b.id}.${f} has a URL`);
    }
    assert.ok(getBody(b.id) === b);
  }
});
test('V7 registry: registry lookup rejects prototype keys and unknown ids', () => {
  for (const bad of ['__proto__', 'constructor', 'toString', 'pluto', '', null, undefined, 3, {}, ['moon']]) { assert.equal(isBodyId(bad), false, String(bad)); assert.equal(getBody(bad), null); }
  assert.deepEqual(LEGACY_BODY_IDS, ['moon', 'mars']);
});
test('V7 registry: Moon and Mars keep exactly the constants the game has always used', () => {
  const m = BODIES.moon, s = BODIES.mars;
  assert.equal(m.radius, nasaValue('radius')); assert.equal(m.mu, nasaValue('mu')); assert.equal(m.solarIrradiance, nasaValue('solar'));
  assert.deepEqual(m.earthRange, {near: nasaValue('perigee'), mean: nasaValue('mean'), far: nasaValue('apogee')});
  const row = id => MARS_DATA.rows.find(r => r.id === id).value;
  assert.equal(s.radius, row('radius')); assert.equal(s.mu, row('mu')); assert.equal(s.solarIrradiance, row('solar'));
  assert.deepEqual(s.earthRange, {near: row('perigee'), mean: 225000000, far: row('apogee')});
  assert.equal(s.provenance.earthRangeMean.kind, 'assumption'); assert.equal(s.provenance.earthRangeMean.unverified, true);
  assert.match(s.provenance.earthRangeMean.note, /not an observed average/);
  for (const [id, alt] of [['moon', [50, 200]], ['mars', [200, 1000]]]) assert.deepEqual([BODIES[id].altitudeMin, BODIES[id].altitudeMax], alt);
  const mm = missionFor({destination: 'mars'});
  assert.equal(mm.referenceDistance, 225000000); assert.equal(mm.radius, 3389.5); assert.equal(mm.altitudeMax, 1000);
  assert.match(mm.assumption, /game reference distance rather than a measured average/);
});
test('V7 registry: values read from the NASA research pass are reproduced in the code', () => {
  const expect = {mercury: [2439.4, 22031.8686, 9082.7], venus: [6051.8, 324858.592, 2601.3], earth: [6371.0, 398600.4355, 1361], ceres: [469.7, 62.6284, 177.9], vesta: [261.385, 17.2882844, 244.1], europa: [1560.8, 3202.7121, 50.26]};
  for (const [id, [r, mu, sun]] of Object.entries(expect)) { near(BODIES[id].radius, r); near(BODIES[id].mu, mu); near(BODIES[id].solarIrradiance, sun); }
  assert.equal(BODIES.mercury.earthRange.near, 82743606); assert.equal(BODIES.mercury.earthRange.far, 217134678);
  assert.equal(BODIES.venus.earthRange.near, 39812857); assert.equal(BODIES.europa.earthRange.far, 965457448);
  // Derived irradiance is flagged as derived, with the formula in the note.
  for (const id of ['ceres', 'vesta']) { assert.equal(BODIES[id].provenance.solarIrradiance.kind, 'derived'); assert.match(BODIES[id].provenance.solarIrradiance.note, /1361 \/ a\^2/); }
  near(BODIES.ceres.solarIrradiance, 1361 / BODIES.ceres.heliocentricAu ** 2, 0.1); near(BODIES.vesta.solarIrradiance, 1361 / BODIES.vesta.heliocentricAu ** 2, 0.1);
  // Earth ground-station distances are geometry for a 705 km orbit.
  const R = 6371, h = 705, slant = e => Math.sqrt((R + h) ** 2 - (R * Math.cos(e * Math.PI / 180)) ** 2) - R * Math.sin(e * Math.PI / 180);
  near(BODIES.earth.earthRange.near, slant(90), 1); near(BODIES.earth.earthRange.mean, slant(30), 1); near(BODIES.earth.earthRange.far, slant(10), 1);
  // Mean ranges that are midpoints are labelled as game references.
  for (const id of ['mercury', 'venus', 'ceres', 'vesta', 'europa']) { near(BODIES[id].earthRange.mean, (BODIES[id].earthRange.near + BODIES[id].earthRange.far) / 2, 1); assert.equal(BODIES[id].provenance.earthRangeMean.unverified, true); assert.match(BODIES[id].provenance.earthRangeMean.note, /not an observed average/); }
});
test('V7 registry: skipped bodies are listed with a reason and are not selectable', () => {
  assert.deepEqual(SKIPPED_BODIES.map(b => b.id).sort(), ['bennu', 'ganymede', 'phobos', 'titan']);
  for (const b of SKIPPED_BODIES) { assert.ok(b.reason.length > 40); assert.equal(isBodyId(b.id), false); assert.equal(normalize({destination: b.id}).destination, 'moon'); }
});
test('V7 attribution: credits name NASA as the source, claim no endorsement and use only NASA or USGS links', () => {
  assert.ok(ATTRIBUTION.length >= 6);
  for (const a of ATTRIBUTION) { for (const k of ['id', 'name', 'url', 'use', 'credit']) assert.equal(typeof a[k], 'string', a.id + k); assert.match(new URL(a.url).hostname, HOSTS); }
  const text = JSON.stringify(ATTRIBUTION);
  assert.match(text, /not endorsed by or affiliated with NASA/); assert.match(text, /insignia are not used/);
});

// ---- Data presentation: provenance, unverified, CSV ------------------------------------------------------------------------------
test('V7 data panel: every body shows each value with source URL, verified date and an unverified flag', () => {
  for (const id of BODY_IDS) {
    const rows = bodyRows(id), ds = nasaDataset({destination: id});
    assert.equal(rows.length, 8);
    for (const r of rows) {
      assert.ok(Number.isFinite(r.value)); assert.equal(typeof r.unverified, 'boolean'); assert.match(r.verifiedOn, /^2026-/);
      assert.ok(r.url === '' ? r.kind === 'assumption' : r.url.startsWith('https://'));
      if (r.unverified) assert.match(r.label, /GAME ASSUMPTION/);
    }
    assert.ok(Array.isArray(ds.rows) && ds.rows.length >= 6 && ds.factURL.startsWith('https://') && ds.verified);
    for (const o of Object.values(distanceOptions({destination: id}))) { assert.ok(o.km > 0); assert.equal(typeof o.name, 'string'); }
  }
  assert.equal(nasaDataset({destination: 'moon'}), NASA_DATA); assert.equal(nasaDataset({destination: 'mars'}), MARS_DATA);
  assert.equal(nasaDataset({}), NASA_DATA); assert.equal(nasaDataset({destination: 'zzz'}), NASA_DATA);
  assert.deepEqual(distanceOptions({destination: 'mars'}).mean, {name: 'Teaching reference · assumed', km: 225000000});
});
test('V7 CSV: export has one RFC 4180 row per value with URL, date and unverified flag', () => {
  for (const id of BODY_IDS) {
    const csv = datasetCSV(id), lines = csv.trim().split('\r\n');
    assert.equal(lines[0], '"parameter","value","unit","evidence","source_url","verified_utc","unverified","note"');
    assert.ok(lines.length >= 9);
    const rows = bodyRows(id);
    for (const r of rows) { const line = lines.find(l => l.startsWith(`"${r.id}",`)); assert.ok(line, r.id); assert.ok(line.includes(`"${r.verifiedOn}"`)); assert.ok(line.includes(`"${r.unverified}"`)); if (r.url) assert.ok(line.includes(`"${r.url}"`)); }
  }
  assert.match(datasetCSV('mars'), /"earthRangeMean","225000000","km","GAME ASSUMPTION"/);
  assert.equal(datasetCSV('nonsense'), datasetCSV('moon'));
});
test('V7 sources: every body lists its URLs with a verified date and the unverified flag; the Moon list is unchanged', () => {
  assert.equal(sourcesFor('moon'), SOURCES); assert.equal(sourcesFor('pluto'), SOURCES);
  for (const id of BODY_IDS.filter(x => x !== 'moon')) {
    const list = sourcesFor(id); assert.ok(list.length > SOURCES.length - 1);
    for (const s of list) { assert.equal(typeof s.title, 'string'); assert.match(s.url, /^https:\/\//); assert.equal(typeof s.use, 'string'); }
    const own = list.filter(s => s.id.startsWith('body-'));
    assert.ok(own.length >= 2); for (const s of own) { assert.match(s.verified, /^2026-/); assert.equal(typeof s.unverified, 'boolean'); if (s.unverified) assert.match(s.use, /GAME ASSUMPTION/); }
  }
});

// ---- Real missions -------------------------------------------------------------------------------------------------------------------------------
test('V7 real missions: 17 missions with provenance, honest nulls and the published fractions', () => {
  assert.equal(REAL_MISSIONS.length, 17);
  for (const m of REAL_MISSIONS) {
    assert.ok(m.provenance.sources.length >= 1 && m.provenance.sources.every(u => /^https:\/\//.test(u) && HOSTS.test(new URL(u).hostname)), m.id);
    assert.match(m.provenance.verified, /^2026-/); assert.ok(Array.isArray(m.provenance.unverified), m.id);
    assert.ok(m.launch_mass_kg === null || Number.isFinite(m.launch_mass_kg));
    assert.equal(getRealMission(m.id), m);
  }
  assert.equal(getRealMission('nope'), null);
  assert.deepEqual(missionsFor('moon').map(m => m.id).sort(), ['grail', 'lro']);
  // Propellant fractions follow from the masses.
  for (const [id, key] of [['odyssey', 'odyssey'], ['mro', 'mro'], ['juno', 'juno'], ['grail', 'grail'], ['messenger', 'messenger'], ['maven', 'maven']]) {
    const m = getRealMission(id); if (m.propellant_kg && m.launch_mass_kg) near(m.propellant_kg / m.launch_mass_kg, PROPELLANT_FRACTIONS[key], 0.01);
  }
  near(ODYSSEY_SUBSYSTEMS.fractionOfDry.electrical_power, 86 / 376.3, 0.001);
  near(ODYSSEY_SUBSYSTEMS.fractionOfDry.telecommunications, 23.9 / 376.3, 0.001);
});

// ---- Physics: one orbit model reproduces published orbit periods ---------------------------------------------------------------------
const period = (id, altitude) => orbitPeriodMinutes(BODIES[id].radius, BODIES[id].mu, altitude);
test('V7 physics: the circular-orbit period reproduces published periods of real missions', () => {
  // [label, computed minutes, published minutes, tolerance minutes]
  const cases = [
    ['Dawn at Vesta, 210 km (4.3 h)', period('vesta', 210), 4.3 * 60, 1.5],
    ['Dawn at Vesta, 680 km (12.3 h)', period('vesta', 680), 12.3 * 60, 0.02 * 12.3 * 60], // 2%: the published altitude is rounded and 10 km of altitude moves the period 1.6%
    ['Dawn at Vesta, 2,750 km (69 h)', period('vesta', 2750), 69 * 60, 0.01 * 69 * 60],
    ['GRAIL at the Moon, 50 km (113 min)', period('moon', 50), 113, 0.5],
    ['Landsat 9, 705 km (99 min)', period('earth', 705), 99, 0.5],
    ['PACE, 676.5 km (98.3 min)', period('earth', 676.5), 98.3, 0.3],
    ['MRO, mean altitude of 255 x 320 km (112 min)', period('mars', (255 + 320) / 2), 112, 1],
    ['Odyssey, about 400 km (2 h)', period('mars', 400), 120, 3],
    ['MESSENGER 12 h from its 10,136 km semimajor axis', orbitPeriodMinutes(BODIES.mercury.radius, BODIES.mercury.mu, (200 + 15193) / 2), 12 * 60, 1]
  ];
  for (const [label, got, published, tol] of cases) assert.ok(Math.abs(got - published) <= tol, `${label}: computed ${got.toFixed(2)} vs published ${published} (tolerance ${tol})`);
});
test('V7 physics: central-shadow eclipse matches the closed form and the research table for every body', () => {
  for (const b of Object.values(BODIES)) for (const alt of [b.altitudeMin, b.defaultAltitude, b.altitudeMax]) {
    const T = orbitPeriodMinutes(b.radius, b.mu, alt), E = shadowMinutes(b.radius, b.mu, alt);
    near(E, T / Math.PI * Math.asin(b.radius / (b.radius + alt)), 1e-9);
    assert.ok(E > 0 && E < T / 2, `${b.id}@${alt}`);
    near(calculate({...presetFor(b.id), altitude: alt}).m.eclipseMinutes, E, 1e-9);
  }
  // Values from the research table (bodies.json orbit_check), minutes, to 0.05.
  near(shadowMinutes(6371, 398600.4355, 400), 36.045, 0.05); near(shadowMinutes(3389.5, 42828.37362, 200), 43.0, 0.5);
  near(shadowMinutes(2439.4, 22031.8686, 200), 35.903, 0.05); near(shadowMinutes(6051.8, 324858.592, 300), 37.369, 0.05);
  near(period('mercury', 200), 95.667, 0.01); near(period('venus', 300), 93.009, 0.01);
});
test('V7 physics: weak sunlight scales array power with irradiance, nothing else changes', () => {
  const kit = {power: 'balanced', arrayScale: 1}, moon = calculate({...presetFor('moon'), ...kit}), base = moon.c.power.solar;
  for (const b of Object.values(BODIES)) {
    const a = calculate({...presetFor(b.id), ...kit, arrayScale: 1}), eff = a.m.arrayEfficiency;
    near(a.c.power.solar, b.solarIrradiance * a.c.power.arrayArea * eff, 1e-9);
    near(a.c.power.arrayArea, moon.c.power.arrayArea, 1e-9);
    if (eff === 0.28) near(a.c.power.solar / base, b.solarIrradiance / 1361, 1e-9);
  }
  assert.ok(missionFor({destination: 'vesta'}).solarIrradiance < missionFor({destination: 'mars'}).solarIrradiance / 2);
});
test('V7 physics: scenario array limits and efficiency are explicit, bounded and default to the old constants', () => {
  for (const id of ['moon', 'mars']) { const m = missionFor({destination: id}); assert.equal(m.arrayScaleMax, 1.5); assert.equal(m.arrayEfficiency, 0.28); assert.equal(m.duration, 240); assert.equal(m.contactMinutes, 25); assert.equal(m.maneuver, 650); assert.equal(m.reserve, 100); }
  for (const s of Object.values(SCENARIOS)) {
    const m = missionFor({destination: s.destination, scenario: s.id});
    assert.ok(m.arrayScaleMax >= 1.5 && m.arrayScaleMax <= 10); assert.ok(m.arrayEfficiency >= 0.1 && m.arrayEfficiency <= 0.28);
    assert.ok(m.duration >= 120 && m.duration <= 720); assert.ok(m.contactMinutes > 0 && m.contactMinutes <= 40);
    const d = normalize({...presetFor(s.destination, 'balanced', s.id), arrayScale: 99, scenario: s.id});
    assert.equal(d.arrayScale, m.arrayScaleMax);
  }
});

// ---- Normalisation and API ---------------------------------------------------------------------------------------------------------------------------
function realMissionOrNull(id) { return id === null ? true : getRealMission(id); }
test('V7 normalize: destination is validated against the registry and bad input falls back safely', () => {
  for (const id of BODY_IDS) { const d = normalize({destination: id}); assert.equal(d.destination, id); assert.ok(SCENARIOS[d.scenario].destination === id); const m = missionFor(d); assert.ok(d.altitude >= m.altitudeMin && d.altitude <= m.altitudeMax); }
  for (const bad of ['jupiter', '__proto__', 'constructor', 'MARS', ' moon', 42, null, {}, [], 'titan', 'phobos']) assert.equal(normalize({destination: bad}).destination, 'moon', String(bad));
  const crossed = normalize({destination: 'venus', scenario: 'lunar-polar'}); assert.equal(crossed.scenario, DEFAULT_SCENARIO.venus);
  assert.equal(normalize({destination: 'moon', scenario: 'dawn-vesta'}).scenario, 'lunar-polar');
  for (const s of Object.values(SCENARIOS)) { const d = normalize({destination: s.destination, scenario: s.id}); assert.equal(d.scenario, s.id); }
});
test('V7 API: scenario cards, body mapping and preset factories are complete and consistent', () => {
  const cards = api.listScenarios();
  assert.equal(cards.length, Object.keys(SCENARIOS).length); assert.ok(cards.length >= 10);
  for (const c of cards) {
    assert.equal(api.bodyForScenario(c.id).id, c.destination); assert.ok(api.scenariosForBody(c.destination).includes(c.id));
    assert.ok(c.title && c.summary && c.why && c.tag); assert.ok(c.body.colors.surface); assert.ok(c.scienceNeeded > 0 && c.scienceNeeded <= c.scienceTarget); assert.ok(c.budget > 0);
    const presets = api.presetsForScenario(c.id);
    assert.deepEqual(Object.keys(presets), ['balanced', 'resilient', 'fragile']);
    for (const p of Object.values(presets)) { assert.equal(p.destination, c.destination); assert.deepEqual(normalize(p), normalize(normalize(p))); assert.equal(normalize(p).scenario, c.id); }
    assert.ok(realMissionOrNull(c.realMission), `${c.id} real mission ${c.realMission}`);
  }
  assert.equal(api.bodyForScenario('nope'), null); assert.equal(api.presetsForScenario('nope'), null);
  assert.deepEqual(cards.filter(c => c.isDefaultForBody).map(c => c.destination).sort(), [...BODY_IDS].sort());
  for (const name of ['BODIES', 'getBody', 'listScenarios', 'REAL_MISSIONS', 'ATTRIBUTION', 'calculate', 'newRun', 'advance', 'resolve', 'runToEnd', 'reviewDecisions', 'missionScore', 'encodeDesign', 'decodeDesign', 'datasetCSV', 'sourcesFor']) assert.ok(name in api, name);
});

// ---- Share codes ------------------------------------------------------------------------------------------------------------------------------------------
const enc = o => 'TQ6.' + Buffer.from(JSON.stringify(o)).toString('base64url');
test('V7 share: old TQ6 codes still decode and Moon or Mars codes keep format v1', () => {
  const old = enc({v: 1, d: {bus: 'precision', payload: 'survey', power: 'endurance', propulsion: 'standard', comms: 'highgain', storage: 'standard', launch: 'rideshare', fuel: 55, altitude: 100, inclination: 90, arrayScale: 1, batteryScale: 1, duty: 1, distance: 'mean', destination: 'moon', scenario: 'lunar-polar', difficulty: 'engineer', name: 'Old', livery: 'gold'}, s: 700, t: 'Old team'});
  const r = decodeDesign(old); assert.equal(r.ok, true); assert.equal(r.design.destination, 'moon'); assert.equal(r.claimedScore, 700); assert.equal(r.team, 'Old team');
  const payloadOf = code => JSON.parse(Buffer.from(code.slice(4), 'base64url').toString());
  assert.equal(payloadOf(encodeDesign(presetFor('moon'))).v, 1); assert.equal(payloadOf(encodeDesign(presetFor('mars'))).v, 1);
  assert.equal(payloadOf(encodeDesign(presetFor('venus'))).v, 2);
});
test('V7 share: every scenario and preset round-trips through a code and verifies deterministically', () => {
  for (const s of Object.values(SCENARIOS)) for (const key of ['balanced', 'resilient', 'fragile']) {
    const d = normalize({...api.presetsForScenario(s.id)[key], name: 'Crew ✦'}), code = encodeDesign(d, {score: 640, team: 'T'});
    assert.match(code, /^TQ6\.[A-Za-z0-9_-]+$/);
    const back = decodeDesign(code); assert.equal(back.ok, true, `${s.id} ${key}: ${back.error}`); assert.deepEqual(back.design, d);
  }
  const d = presetFor('europa'); assert.deepEqual(verifyDesign(decodeDesign(encodeDesign(d)).design), verifyDesign(d));
});
test('V7 share security: new bodies are validated strictly; hostile input is rejected, never repaired into another body', () => {
  const good = {...normalize(presetFor('vesta'))};
  const mutate = patch => decodeDesign(enc({v: 2, d: {...good, ...patch}}));
  assert.equal(mutate({}).ok, true);
  const rejects = [{destination: 'pluto'}, {destination: '__proto__'}, {destination: ['vesta']}, {destination: 7}, {destination: null}, {scenario: 'lunar-polar'}, {scenario: 'nope'}, {scenario: '__proto__'}, {difficulty: 'god'}, {bus: 'turbo'}, {payload: 5}, {altitude: 99999}, {altitude: 1}, {altitude: 'x'}, {altitude: null}, {fuel: -1}, {fuel: 1e9}, {fuel: '55'}, {arrayScale: 99}, {arrayScale: null}, {batteryScale: 9}, {duty: 0}, {inclination: 120}];
  for (const r of rejects) assert.equal(mutate(r).ok, false, JSON.stringify(r));
  const noDest = {...good}; delete noDest.destination;
  assert.equal(decodeDesign(enc({v: 2, d: noDest})).ok, false, 'v2 must name a destination');
  assert.equal(decodeDesign(enc({v: 2, d: {name: 'x'}})).ok, false);
  assert.equal(decodeDesign(enc({v: 3, d: good})).ok, false);
  // v1 may only name the Moon or Mars, and an unknown destination is never turned into the Moon.
  assert.equal(decodeDesign(enc({v: 1, d: {...good, destination: 'vesta'}})).ok, false);
  assert.equal(decodeDesign(enc({v: 1, d: {destination: 'jupiter'}})).ok, false);
  assert.equal(decodeDesign(enc({v: 1, d: {destination: 'mars', name: 'ok'}})).design.destination, 'mars');
  // markup in the name never survives, prototype pollution does not occur.
  const evil = decodeDesign(enc({v: 2, d: {...good, name: '<img src=x onerror=alert(1)>', __proto__: {polluted: 1}, constructor: {prototype: {polluted: 1}}}}));
  assert.equal(evil.ok, true); assert.doesNotMatch(evil.design.name, /[<>]/); assert.equal({}.polluted, undefined);
});
test('V7 share security: fuzzing v1 and v2 payloads never throws and never yields an unknown body', () => {
  let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const values = [null, undefined, true, false, 0, -1, 1e308, NaN, Infinity, '', 'moon', 'mars', 'vesta', 'europa', '__proto__', 'x'.repeat(50), [], {}, [1], {a: 1}, '<b>', -0, 1e-9, 'constructor'];
  const keys = ['bus', 'payload', 'power', 'propulsion', 'comms', 'storage', 'launch', 'fuel', 'altitude', 'inclination', 'arrayScale', 'batteryScale', 'duty', 'distance', 'destination', 'scenario', 'difficulty', 'name', 'livery', 'sandbox', 'zzz'];
  let accepted = 0;
  for (let i = 0; i < 1500; i++) {
    const d = {}; for (const k of keys) if (rnd() < 0.55) d[k] = values[Math.floor(rnd() * values.length)];
    const code = enc({v: rnd() < 0.5 ? 1 : 2, d});
    let r; assert.doesNotThrow(() => { r = decodeDesign(code); });
    if (r.ok) { accepted++; assert.ok(isBodyId(r.design.destination)); const c = calculate(r.design); assert.ok(Number.isFinite(c.cost) && Number.isFinite(c.period) && c.period > 0); }
  }
  assert.ok(accepted > 0);
});

// ---- Assistant honesty -------------------------------------------------------------------------------------------------------------------------------------------
test('V7 assistant: NASA data answers name the body, list game assumptions and link sources for every body', () => {
  for (const id of BODY_IDS) {
    const design = presetFor(id), a = answerQuestion('Which NASA data is actually used?', {design}), name = BODIES[id].name.split(' ')[0];
    assert.equal(a.known, true, id); assert.match(a.text, new RegExp(name)); assert.ok(a.sources.length >= 1 && a.sources.every(s => /^https:\/\//.test(s.url)));
    assert.match(a.text, /Game assumptions in the data panel/); assert.match(a.text, /no NASA source\): [A-Z]/);
    for (const q of ['What is altitude?', 'How does distance affect the link?', 'Which values are game assumptions?', 'How do I play?']) assert.equal(answerQuestion(q, {design}).known, true, `${id}: ${q}`);
  }
  assert.match(answerQuestion('Which NASA data is actually used?', {design: presetFor('mars')}).text, /Earth range, reference/);
});
test('V7 assistant: heat and radiation are answered only where the scenario has them, labelled as game assumptions', () => {
  for (const [id, q] of [['mercury', 'What is the thermal heat load event?'], ['europa', 'What is the radiation event?']]) {
    const a = answerQuestion(q, {design: presetFor(id)});
    assert.equal(a.known, true, id); assert.equal(a.topic, 'hazard'); assert.match(a.text, /GAME ASSUMPTION/); assert.match(a.text, /will not quote one/);
    assert.match(a.evidence, /GAME ASSUMPTION/); assert.doesNotMatch(a.text, /\b\d+ ?krad\b|\b\d+ rads\b/i);
  }
  for (const q of ['Tell me about Moon radiation shielding', 'Tell me about Moon thermal analysis', 'night temperature']) assert.equal(answerQuestion(q, {design: presetFor('moon')}).known, false, q);
  assert.equal(answerQuestion('Tell me about Mars thermal analysis', {design: presetFor('mars')}).known, false);
  assert.equal(answerQuestion('Is the stock radiation forecast good?', {design: presetFor('europa')}).known, false);
});
test('V7 assistant: real-mission answers cite sources and list the fields NASA pages did not give', () => {
  const a = answerQuestion('Which real mission is this based on?', {design: presetFor('vesta')});
  assert.equal(a.known, true); assert.equal(a.topic, 'realmission'); assert.match(a.text, /Dawn/); assert.match(a.text, /fictional small orbiter/); assert.match(a.text, /Fields NASA pages did not give/);
  assert.ok(a.sources.some(s => /nssdc\.gsfc\.nasa\.gov/.test(s.url)));
  assert.match(answerQuestion('How does this compare with real missions?', {design: presetFor('moon')}).text, /Lunar Reconnaissance Orbiter/);
  assert.equal(answerQuestion('Which real mission is the stock price based on?', {design: presetFor('moon')}).known, false);
});
test('V7 hints: readiness hints cite real propellant fractions and GOLD margins without blocking launch', () => {
  for (const id of BODY_IDS) {
    const a = calculate(presetFor(id)); assert.equal(a.hints.length, 3);
    for (const h of a.hints) { assert.ok(h.text.length > 40 && /^https:\/\//.test(h.source) && h.basis); assert.ok(['ok', 'note'].includes(h.status)); }
    assert.match(a.hints[0].text, /Odyssey 48%/); assert.match(a.hints[1].text, /GOLD Rules|GSFC-STD-1000/);
    assert.equal(a.checks.some(c => c.id === 'hints'), false);
  }
});
