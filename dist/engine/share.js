import {normalize, calculate, runToEnd} from './model.js';

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
  const payload = {v: 1, d: design};
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
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.v !== 1 || !payload.d || typeof payload.d !== 'object' || Array.isArray(payload.d)) return {ok: false, error: 'This code uses an unsupported format.'};
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
