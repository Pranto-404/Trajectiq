import {normalize, calculate, runToEnd} from './model.js';
import {CATALOG, missionFor} from '../data/catalog.js';
import {SCENARIOS, DIFFICULTY} from '../data/scenarios.js';
import {BODIES, LEGACY_BODY_IDS, isBodyId} from '../data/bodies.js';

// Mission codes: a compact, validated way to save, share and compare designs. No server and no account.
// Codes are untrusted input: size-limited, parsed defensively and normalized through the engine.
const CODE_PREFIX = 'TQ6.';
const MAX_CODE = 2400;
const SHARE_FIELDS = ['bus', 'payload', 'power', 'propulsion', 'comms', 'storage', 'launch', 'fuel', 'altitude', 'inclination', 'arrayScale', 'batteryScale', 'duty', 'distance', 'destination', 'scenario', 'difficulty', 'name', 'livery'];

const toB64 = text => { const bytes = new TextEncoder().encode(text); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = text => { const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/')); const bytes = Uint8Array.from(bin, c => c.charCodeAt(0)); return new TextDecoder('utf-8', {fatal: true}).decode(bytes); };

export function encodeDesign(raw, meta = {}) {
  const d = normalize(raw), design = {};
  for (const k of SHARE_FIELDS) design[k] = d[k];
  // Format v1 (Moon and Mars) is byte-identical to the original TQ6 codes. Other bodies use v2, which older readers reject
  // as an unsupported format instead of silently turning the design into a Moon mission.
  const payload = {v: LEGACY_BODY_IDS.includes(design.destination) ? 1 : 2, d: design};
  if (Number.isFinite(meta.score)) payload.s = Math.round(meta.score);
  if (typeof meta.team === 'string') payload.t = meta.team.replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, 28);
  return CODE_PREFIX + toB64(JSON.stringify(payload));
}

export function decodeDesign(text) {
  const raw = String(text ?? '').trim().replace(/^.*#design=/, '');
  if (!raw.startsWith(CODE_PREFIX)) return {ok: false, error: 'This is not a TRAJECTIQ mission code. Codes start with TQ6.'};
  if (raw.length > MAX_CODE) return {ok: false, error: 'This code is too long to be a mission design.'};
  if (!/^[A-Za-z0-9_-]+$/.test(raw.slice(CODE_PREFIX.length))) return {ok: false, error: 'This code contains invalid characters.'};
  let payload;
  try { payload = JSON.parse(fromB64(raw.slice(CODE_PREFIX.length))); } catch { return {ok: false, error: 'This code is damaged and could not be read.'}; }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || (payload.v !== 1 && payload.v !== 2) || !payload.d || typeof payload.d !== 'object' || Array.isArray(payload.d)) return {ok: false, error: 'This code uses an unsupported format.'};
  const strict = payload.v === 2 || Object.hasOwn(payload.d, 'destination');
  if (strict) {
    const problem = validateDestinationFields(payload.d, payload.v);
    if (problem) return {ok: false, error: problem};
  }
  // Only whitelisted keys reach the engine; normalize() clamps every value and rejects unknown part ids.
  const picked = {};
  for (const k of SHARE_FIELDS) if (Object.hasOwn(payload.d, k)) picked[k] = payload.d[k];
  const design = normalize(picked);
  return {ok: true, design, claimedScore: Number.isFinite(payload.s) ? Math.max(0, Math.min(1000, Math.round(payload.s))) : null, team: typeof payload.t === 'string' ? payload.t.replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, 28) : ''};
}

// Fair comparison: both designs fly the same seed with the same autopilot policy on this machine.
export function verifyDesign(raw, policy = 'ordinary') {
  const a = calculate(raw);
  if (!a.launchable) return {launchable: false, failures: a.checks.filter(c => c.status === 'fail').map(c => c.name)};
  const r = runToEnd(a.d, {mode: 'science', policy: policy === 'conservative' ? 'conservative' : 'ordinary'});
  return {launchable: true, science: r.science, achieved: r.outcome.achieved, battery: r.outcome.finalBattery, cost: a.cost, mass: a.wet, status: r.outcome.status};
}

// Strict validation for any code that names a destination: unknown bodies, scenarios of another body, unknown part ids and
// out-of-range numbers are rejected rather than silently repaired. Version 1 codes may only name the Moon or Mars.
const NUMERIC_RANGES = {fuel: [0, 90], inclination: [0, 90], arrayScale: [0.75, null], batteryScale: [0.75, 1.5], duty: [0.25, 1]};
function validateDestinationFields(d, version) {
  const dest = d.destination;
  if (version === 2 && !Object.hasOwn(d, 'destination')) return 'This code does not name a destination.';
  if (Object.hasOwn(d, 'destination')) {
    if (typeof dest !== 'string' || !isBodyId(dest)) return 'This code names a destination this version does not know.';
    if (version === 1 && !LEGACY_BODY_IDS.includes(dest)) return 'This code names a destination its format version cannot carry.';
  }
  const body = BODIES[isBodyId(dest) ? dest : 'moon'];
  if (version === 2) {
    if (Object.hasOwn(d, 'scenario') && !(typeof d.scenario === 'string' && Object.hasOwn(SCENARIOS, d.scenario) && SCENARIOS[d.scenario].destination === body.id)) return 'This code names a scenario that does not belong to its destination.';
    if (Object.hasOwn(d, 'difficulty') && !(typeof d.difficulty === 'string' && Object.hasOwn(DIFFICULTY, d.difficulty))) return 'This code names an unknown difficulty.';
    for (const kind of Object.keys(CATALOG)) if (Object.hasOwn(d, kind) && !(typeof d[kind] === 'string' && CATALOG[kind].some(c => c.id === d[kind]))) return 'This code names a part this version does not know.';
    const m = missionFor({destination: body.id, scenario: d.scenario});
    for (const [k, [lo, hi]] of Object.entries(NUMERIC_RANGES)) {
      if (!Object.hasOwn(d, k)) continue;
      const max = k === 'arrayScale' ? m.arrayScaleMax : hi;
      if (typeof d[k] !== 'number' || !Number.isFinite(d[k]) || d[k] < lo || d[k] > max) return `This code has a ${k} value outside the allowed range.`;
    }
    if (Object.hasOwn(d, 'altitude') && (typeof d.altitude !== 'number' || !Number.isFinite(d.altitude) || d.altitude < body.altitudeMin || d.altitude > body.altitudeMax)) return 'This code has an orbit altitude outside the range of its destination.';
  }
  return null;
}
