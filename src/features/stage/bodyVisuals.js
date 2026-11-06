// Body-visual table, keyed by body id (the ids of dist/data/bodies.js). Pure data, no three.js, no images.
// Unknown ids never throw: they fall back to the engine's own colours (getBody) and then to a neutral grey rock.
// `texture` names a bundled NASA map (see textures.js and src/assets/ATTRIBUTION.md); null means procedural shading.
// radiusRatio is a visual exaggeration of the body against the stage reference radius, not a true size ratio.
import {getBody} from '@engine/api.js';

export const REFERENCE_BODY_RADIUS = 1.7;   // world units for radiusRatio 1

export const DEFAULT_VISUAL = Object.freeze({
  id: 'default', color: '#9a9ea3', accent: '#c9ccd0', texture: null, radiusRatio: 1, spin: 0.04, flatten: 1,
  atmosphere: null, haze: null, procedural: Object.freeze({kind: 'rock', craters: 70, lines: 0, bright: 0, contrast: 0.22})
});

const V = (id, o) => Object.freeze({...DEFAULT_VISUAL, id, ...o});
const P = o => Object.freeze({...DEFAULT_VISUAL.procedural, ...o});

export const BODY_VISUALS = Object.freeze({
  moon: V('moon', {color: '#b9b7b0', accent: '#e3e1da', texture: 'moon', radiusRatio: 1, spin: 0.03}),
  mars: V('mars', {color: '#cc5c38', accent: '#e08a63', texture: 'mars', radiusRatio: 1.08, spin: 0.05,
    atmosphere: {color: '#d9a07a', strength: 0.55, thickness: 0.055}}),
  earth: V('earth', {color: '#2f6fb3', accent: '#5fa5e6', texture: 'earth', radiusRatio: 1.3, spin: 0.06,
    atmosphere: {color: '#8cc4ff', strength: 0.95, thickness: 0.07}}),
  venus: V('venus', {color: '#d9b36a', accent: '#f0d48f', texture: 'venus', radiusRatio: 1.25, spin: 0.015,
    // Magellan radar map under a thick, bright cloud shell: the haze layer hides the surface on purpose.
    haze: {color: '#f3dca0', opacity: 0.62},
    atmosphere: {color: '#f3dca0', strength: 1.15, thickness: 0.11}}),
  mercury: V('mercury', {color: '#8f8a85', accent: '#c9c2b8', radiusRatio: 0.88, spin: 0.02, procedural: P({craters: 150, contrast: 0.3})}),
  ceres: V('ceres', {color: '#6f6c68', accent: '#d8d4cb', radiusRatio: 0.74, spin: 0.08, procedural: P({craters: 110, contrast: 0.28, bright: 6})}),
  vesta: V('vesta', {color: '#a39a8c', accent: '#d9d0c0', radiusRatio: 0.7, spin: 0.09, flatten: 0.88, procedural: P({craters: 90, lines: 4, contrast: 0.3})}),
  // Europa: the game orbit is a stand-in for the Clipper flyby tour (docs/ENGINE_BODIES.md); the UI shows that note.
  europa: V('europa', {color: '#d8cdb8', accent: '#9a6b4f', radiusRatio: 0.96, spin: 0.03, procedural: P({kind: 'ice', craters: 14, lines: 46, contrast: 0.18})})
});

const HEX = /^#[0-9a-f]{6}$/i;
const safeHex = (v, fb) => (typeof v === 'string' && HEX.test(v) ? v : fb);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Visual for a body id. Always returns a complete record, never throws. */
export function bodyVisualFor(id) {
  const key = typeof id === 'string' ? id : '';
  if (own(BODY_VISUALS, key)) return BODY_VISUALS[key];
  let engine = null;
  try { engine = key ? getBody(key) : null; } catch { engine = null; }
  if (!engine) return DEFAULT_VISUAL;
  const atm = safeHex(engine.colors?.atmosphere, null);
  return Object.freeze({...DEFAULT_VISUAL, id: key,
    color: safeHex(engine.colors?.surface, DEFAULT_VISUAL.color), accent: safeHex(engine.colors?.accent, DEFAULT_VISUAL.accent),
    atmosphere: atm ? {color: atm, strength: 0.5, thickness: 0.05} : null});
}

/** Body id of a design: the mission's own id (missionFor / engine), tolerant of partial or hostile input. */
export function bodyIdFor(design, mission) {
  const m = mission || {};
  const id = m.bodyId || m.destination || design?.destination;
  return typeof id === 'string' && id ? id : 'moon';
}

/** Visual radius in world units. */
export const bodyRadiusFor = visual => REFERENCE_BODY_RADIUS * (visual?.radiusRatio > 0 ? visual.radiusRatio : 1);

/** Mulberry32, deterministic. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashId = id => { let h = 2166136261; for (const c of String(id)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Deterministic painting plan for a procedural surface (normalised 0..1 coordinates). Pure, so it is unit-testable. */
export function proceduralPlan(visual, seed = hashId(visual?.id)) {
  const p = visual?.procedural || DEFAULT_VISUAL.procedural, r = rng(seed);
  const craters = Array.from({length: Math.min(400, Math.max(0, p.craters | 0))}, () => ({x: r(), y: 0.08 + r() * 0.84, r: 0.004 + Math.pow(r(), 3) * 0.05, rim: 0.5 + r() * 0.5}));
  const lines = Array.from({length: Math.min(120, Math.max(0, p.lines | 0))}, () => ({x: r(), y: r(), dx: (r() - 0.5) * 0.6, dy: (r() - 0.5) * 0.3, w: 0.0015 + r() * 0.003}));
  const bright = Array.from({length: Math.min(20, Math.max(0, p.bright | 0))}, () => ({x: r(), y: 0.2 + r() * 0.6, r: 0.004 + r() * 0.01}));
  return {craters, lines, bright, contrast: p.contrast, kind: p.kind};
}
