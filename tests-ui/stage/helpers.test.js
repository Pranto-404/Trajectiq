import {describe, expect, it} from 'vitest';
import {readFileSync, statSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {BODY_IDS, CATALOG, getBody, missionFor, orbitPeriodMinutes} from '@engine/api.js';
import {CAMERA_PRESETS, PRESET_IDS, PITCH_LIMIT, clampUser, distanceForAspect, dragDelta, eyeFor, keyboardCamera, lerpPose, presetForPhase, resolvePreset, sceneModeFor} from '@/features/stage/camera.js';
import {BODY_VISUALS, DEFAULT_VISUAL, bodyIdFor, bodyRadiusFor, bodyVisualFor, proceduralPlan} from '@/features/stage/bodyVisuals.js';
import {eclipseGeometry, inShadow, orbitGeometry, orbitPoint, orbitRadiusVisual, periodMinutes} from '@/features/stage/orbit.js';
import {TIER_SETTINGS, createFpsSampler, downgrade, dprRange, isPhoneLike, pickInitialTier, resolveTier, tierAfterSample} from '@/features/stage/quality.js';
import {cubicBezier, damp, easeCamera, shakeAmplitude, springOvershoot, springStep} from '@/features/stage/motionMath.js';
import {KINDS, craftSpec, partSpec} from '@/features/stage/parts.js';
import {ASSET_BYTES, ASSET_CREDITS} from '@/features/stage/credits.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const textures = path.resolve(here, '../../src/assets/textures');

describe('camera presets', () => {
  it('have complete, sane presets for the four screens plus launch/transfer', () => {
    for (const id of ['board', 'hangar', 'flight', 'report', 'launch', 'transfer']) {
      const p = CAMERA_PRESETS[id]; expect(p, id).toBeTruthy();
      expect(p.distance).toBeGreaterThan(3); expect(p.fov).toBeGreaterThan(20); expect(p.target).toHaveLength(3); expect(Math.abs(p.pitch)).toBeLessThan(PITCH_LIMIT);
    }
    expect(PRESET_IDS).toContain('hangar');
  });
  it('resolve names and objects, never throw on hostile input', () => {
    expect(resolvePreset('flight')).toBe(CAMERA_PRESETS.flight);
    expect(resolvePreset('__proto__')).toBe(CAMERA_PRESETS.hangar);
    expect(resolvePreset('constructor')).toBe(CAMERA_PRESETS.hangar);
    expect(resolvePreset(null)).toBe(CAMERA_PRESETS.hangar);
    const r = resolvePreset({yaw: 'x', pitch: 99, distance: -3, target: [1, 2], fov: 500});
    expect(r.pitch).toBeLessThanOrEqual(PITCH_LIMIT); expect(r.distance).toBeGreaterThan(0.5); expect(r.target).toEqual(CAMERA_PRESETS.hangar.target); expect(r.fov).toBeLessThanOrEqual(70);
  });
  it('map phases to presets and scene modes', () => {
    expect(presetForPhase('board')).toBe('board'); expect(presetForPhase('hangar')).toBe('hangar'); expect(presetForPhase('hangar', 'launch')).toBe('hangar-launch');
    expect(presetForPhase('operations')).toBe('flight'); expect(presetForPhase('capture')).toBe('flight'); expect(presetForPhase('debrief')).toBe('report'); expect(presetForPhase('launch')).toBe('launch');
    expect(sceneModeFor('board')).toBe('hangar'); expect(sceneModeFor('operations')).toBe('orbit'); expect(sceneModeFor('transfer')).toBe('transfer'); expect(sceneModeFor('launch')).toBe('launch'); expect(sceneModeFor(undefined)).toBe('orbit');
  });
  it('backs the camera off on narrow canvases', () => {
    expect(distanceForAspect(7, 1.8)).toBe(7); expect(distanceForAspect(7, 0.6)).toBeGreaterThan(7 * 1.9); expect(distanceForAspect(7, 0.01)).toBeLessThanOrEqual(7 * 2.4 + 1e-9); expect(distanceForAspect(7, NaN)).toBe(7);
  });
  it('composes user offsets, clamps pitch and zoom, and resets with R', () => {
    const u = clampUser({yaw: 1, pitch: 9, zoom: 99}); expect(u.pitch).toBe(PITCH_LIMIT); expect(u.zoom).toBeLessThanOrEqual(1.9);
    const base = eyeFor(CAMERA_PRESETS.hangar, undefined, 1.8), moved = eyeFor(CAMERA_PRESETS.hangar, {yaw: 0.5, pitch: 0, zoom: 1}, 1.8);
    expect(moved[0]).not.toBeCloseTo(base[0]);
    expect(keyboardCamera({yaw: 0, pitch: 0, zoom: 1}, 'ArrowRight').yaw).toBeGreaterThan(0);
    expect(keyboardCamera({yaw: 0.4, pitch: 0.2, zoom: 1.5}, 'r')).toEqual({yaw: 0, pitch: 0, zoom: 1});
    expect(keyboardCamera({yaw: 0, pitch: 0, zoom: 1}, 'x')).toBeNull();
  });
  it('lerps poses by the shortest yaw arc', () => {
    const a = {...CAMERA_PRESETS.hangar, yaw: 3}, b = {...CAMERA_PRESETS.hangar, yaw: -3};
    expect(Math.abs(lerpPose(a, b, 0.5).yaw)).toBeGreaterThan(3);   // passes through pi, not 0
    expect(lerpPose(a, b, 0).yaw).toBe(3);
  });
  it('touch: vertical gestures never rotate (page scroll), horizontal ones do; mouse rotates both', () => {
    expect(dragDelta({touch: true, totalX: 2, totalY: 50, dx: 2, dy: 50}).rotate).toBe(false);
    const h = dragDelta({touch: true, totalX: 40, totalY: 3, dx: 10, dy: 1}); expect(h.rotate).toBe(true); expect(h.dy).toBe(0);
    expect(dragDelta({touch: false, totalX: 1, totalY: 30, dx: 1, dy: 5})).toEqual({rotate: true, dx: 1, dy: 5});
  });
});

describe('body visual table', () => {
  it('covers every engine body with a valid colour, atmosphere rule and radius ratio', () => {
    expect(BODY_IDS.length).toBeGreaterThanOrEqual(8);
    for (const id of BODY_IDS) {
      const v = bodyVisualFor(id);
      expect(v.id, id).toBe(id); expect(Object.prototype.hasOwnProperty.call(BODY_VISUALS, id), `table has ${id}`).toBe(true);
      expect(v.color).toMatch(/^#[0-9a-f]{6}$/i); expect(v.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(v.radiusRatio).toBeGreaterThan(0.3); expect(v.radiusRatio).toBeLessThan(2);
      if (v.atmosphere) { expect(v.atmosphere.color).toMatch(/^#[0-9a-f]{6}$/i); expect(v.atmosphere.strength).toBeGreaterThan(0); }
    }
  });
  it('matches the brief: Venus thick glow, Earth blue, Mercury/Ceres/Vesta procedural and small, Europa icy', () => {
    expect(bodyVisualFor('venus').atmosphere.strength).toBeGreaterThan(bodyVisualFor('mars').atmosphere.strength);
    expect(bodyVisualFor('venus').haze).toBeTruthy();
    const earth = bodyVisualFor('earth'); expect(earth.atmosphere.color.toLowerCase()).toBe('#8cc4ff');
    for (const id of ['mercury', 'ceres', 'vesta', 'europa']) expect(bodyVisualFor(id).texture, id).toBeNull();
    expect(bodyRadiusFor(bodyVisualFor('ceres'))).toBeLessThan(bodyRadiusFor(bodyVisualFor('moon')));
    expect(bodyRadiusFor(bodyVisualFor('vesta'))).toBeLessThan(bodyRadiusFor(bodyVisualFor('moon')));
    expect(bodyVisualFor('europa').procedural.kind).toBe('ice');
    expect(bodyVisualFor('mercury').procedural.craters).toBeGreaterThan(bodyVisualFor('europa').procedural.craters);
  });
  it('falls back safely for unknown, hostile or missing ids (no moon/mars hard-coding)', () => {
    for (const id of ['nope', '', null, undefined, 42, {}, '__proto__', 'constructor', 'toString', 'hasOwnProperty']) expect(bodyVisualFor(id), String(id)).toBe(DEFAULT_VISUAL);
    expect(bodyIdFor({destination: 'vesta'})).toBe('vesta'); expect(bodyIdFor(null)).toBe('moon'); expect(bodyIdFor({}, {bodyId: 'europa'})).toBe('europa');
  });
  it('only names textures that are bundled, real files, and the whole set stays under 6 MB', () => {
    const files = readdirSync(textures).filter(f => f.endsWith('.jpg'));
    let total = 0;
    for (const v of Object.values(BODY_VISUALS)) if (v.texture) expect(files, v.texture).toContain(v.texture + '.jpg');
    for (const f of files) { const b = readFileSync(path.join(textures, f)); expect(b[0]).toBe(0xff); expect(b[1]).toBe(0xd8); total += statSync(path.join(textures, f)).size; }
    expect(total).toBeLessThan(6 * 1024 * 1024); expect(total).toBe(ASSET_BYTES);
    for (const c of ASSET_CREDITS) { expect(files).toContain(c.file); expect(c.source).toMatch(/^https:\/\/(visibleearth\.nasa\.gov|svs\.gsfc\.nasa\.gov|github\.com\/nasa\/)/); expect(c.credit.length).toBeGreaterThan(20); }
  });
  it('plans procedural surfaces deterministically and within bounds', () => {
    const a = proceduralPlan(bodyVisualFor('mercury')), b = proceduralPlan(bodyVisualFor('mercury'));
    expect(a).toEqual(b); expect(a.craters.length).toBe(150); expect(proceduralPlan(bodyVisualFor('europa')).lines.length).toBe(46);
    for (const c of a.craters) { expect(c.x).toBeGreaterThanOrEqual(0); expect(c.x).toBeLessThan(1); expect(c.r).toBeGreaterThan(0); }
    expect(proceduralPlan(bodyVisualFor('mercury')).craters[0]).not.toEqual(proceduralPlan(bodyVisualFor('ceres')).craters[0]);
  });
});

describe('orbit maths', () => {
  const near = (a, b, e = 1e-7) => expect(Math.abs(a - b)).toBeLessThan(e);
  it('orbit position reacts to altitude, inclination and phase (legacy renderer guard)', () => {
    const eq = orbitPoint(30, 120, 3, 0), polar = orbitPoint(30, 120, 3, 90);
    near(eq[1], 0); expect(eq[2]).toBeGreaterThan(0); near(polar[2], 0); expect(polar[1]).toBeGreaterThan(0);
    near(orbitPoint(120, 120, 3, 90)[0], orbitPoint(0, 120, 3, 90)[0]);
  });
  it('visual radius grows with altitude, shrinks with body radius, and is clamped', () => {
    expect(orbitRadiusVisual(400, 3389.5)).toBeGreaterThan(orbitRadiusVisual(200, 3389.5));
    expect(orbitRadiusVisual(100, 1737.4)).toBeGreaterThan(orbitRadiusVisual(100, 6371));
    expect(orbitRadiusVisual(1e9, 10)).toBeLessThanOrEqual(1.7 * 3.1 + 1e-9); expect(orbitRadiusVisual(NaN, NaN)).toBeGreaterThan(1.7);
  });
  it('period matches the engine formula for every body', () => {
    for (const id of BODY_IDS) {
      const b = getBody(id), alt = b.defaultAltitude, m = missionFor({destination: id, altitude: alt});
      near(periodMinutes(m.radius, m.mu, alt), orbitPeriodMinutes(m.radius, m.mu, alt), 1e-9);
      near(orbitGeometry(m, {altitude: alt, inclination: 90}).period, orbitPeriodMinutes(m.radius, m.mu, alt), 1e-9);
    }
  });
  it('the drawn shadow reproduces the engine eclipse: last E minutes of each orbit, for every body', () => {
    for (const id of BODY_IDS) {
      const d = {destination: id, altitude: getBody(id).defaultAltitude, inclination: 90}, m = missionFor(d), g = orbitGeometry(m, d);
      const rVis = orbitRadiusVisual(g.altitude, g.radiusKm), e = eclipseGeometry({period: g.period, eclipseMinutes: g.eclipseMinutes, orbitRadius: rVis, inclination: g.inclination, bodyRadiusKm: g.radiusKm, altitude: g.altitude});
      let inside = 0; const N = 1000, p = [0, 0, 0];
      for (let i = 0; i < N; i++) { const minute = (i + 0.5) / N * g.period; orbitPoint(minute, g.period, rVis, g.inclination, p); const engine = minute >= g.period - g.eclipseMinutes, drawn = inShadow(p, e.sunDir, e.shadowRadius); if (engine === drawn) inside++; }
      expect(inside / N, id).toBeGreaterThan(0.985);
    }
  });
  it('hostile inputs do not produce NaN', () => {
    const g = orbitGeometry({}, {altitude: 'x', inclination: NaN}); expect(Number.isFinite(g.period)).toBe(true);
    const e = eclipseGeometry({period: 0, eclipseMinutes: NaN, orbitRadius: 3}); expect(Number.isFinite(e.centerAngle)).toBe(true);
  });
});

describe('quality tiers', () => {
  it('picks an initial tier from cheap signals', () => {
    expect(pickInitialTier({hardwareConcurrency: 2})).toBe('low'); expect(pickInitialTier({hardwareConcurrency: 8, deviceMemory: 8})).toBe('high');
    expect(pickInitialTier({hardwareConcurrency: 8, deviceMemory: 8, phone: true})).toBe('medium'); expect(pickInitialTier({})).toBe('medium');
  });
  it('explicit quality wins, junk means auto', () => { expect(resolveTier('low', 'high')).toBe('low'); expect(resolveTier('auto', 'medium')).toBe('medium'); expect(resolveTier('ultra', 'high')).toBe('high'); });
  it('caps DPR at 1.5 on phones and never below 1', () => {
    expect(dprRange('high', {phone: true, devicePixelRatio: 3})).toEqual([1, 1.5]); expect(dprRange('high', {phone: false, devicePixelRatio: 3})).toEqual([1, 2]);
    expect(dprRange('low', {phone: true, devicePixelRatio: 3})).toEqual([1, 1]); expect(dprRange('medium', {devicePixelRatio: 0.5})).toEqual([1, 1]);
  });
  it('detects phones', () => { expect(isPhoneLike({coarse: true, width: 390, height: 844})).toBe(true); expect(isPhoneLike({coarse: false, width: 390, height: 844})).toBe(false); expect(isPhoneLike({coarse: true, width: 1366, height: 1024})).toBe(false); });
  it('samples fps over one second after warm-up and only downgrades', () => {
    const s = createFpsSampler(); let fps = null, n = 0;
    while (fps == null && n < 500) { fps = s.tick(25); n++; }
    expect(fps).toBeCloseTo(40, 0); expect(s.done).toBe(true); expect(s.tick(25)).toBeNull();
    expect(tierAfterSample('high', 30)).toBe('medium'); expect(tierAfterSample('medium', 55)).toBeNull(); expect(tierAfterSample('low', 10)).toBeNull(); expect(downgrade('low')).toBe('low');
    expect(TIER_SETTINGS.low.stars).toBeLessThan(TIER_SETTINGS.high.stars);
  });
});

describe('motion maths', () => {
  it('camera easing is the CSS cubic-bezier(.65,0,.35,1): endpoints, monotonic, symmetric', () => {
    expect(easeCamera(0)).toBe(0); expect(easeCamera(1)).toBe(1); expect(easeCamera(0.5)).toBeCloseTo(0.5, 3);
    let prev = 0; for (let i = 1; i <= 20; i++) { const v = easeCamera(i / 20); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
    expect(cubicBezier(0, 0, 1, 1)(0.3)).toBeCloseTo(0.3, 3);
  });
  it('the snap spring (420/26) overshoots a little and settles; damp/snap helpers behave', () => {
    const o = springOvershoot({stiffness: 420, damping: 26, mass: 1}); expect(o).toBeGreaterThan(0.02); expect(o).toBeLessThan(0.1);
    const s = {x: 0, v: 0}; for (let i = 0; i < 300; i++) springStep(s, 1, {stiffness: 420, damping: 26}, 1 / 60); expect(s.x).toBeCloseTo(1, 3);
    expect(damp(0, 10, Infinity, 0.016)).toBe(10); expect(damp(0, 10, 5, 1)).toBeGreaterThan(9.9);
  });
  it('launch shake rises at ignition, decays after the peak, and is zero when reduced', () => {
    expect(shakeAmplitude(0.2)).toBe(0); const peak = shakeAmplitude(1.6), later = shakeAmplitude(3.5), end = shakeAmplitude(5.5);
    expect(peak).toBeGreaterThan(later); expect(later).toBeGreaterThan(end); expect(shakeAmplitude(1.6, {reduced: true})).toBe(0);
  });
});

describe('procedural spacecraft', () => {
  it('has a known spec for every catalog variant of every part', () => {
    for (const kind of KINDS) for (const part of CATALOG[kind]) { const s = partSpec(kind, part.id); expect(s.known, `${kind}/${part.id}`).toBe(true); }
  });
  it('falls back per part for unknown or hostile designs and never throws', () => {
    for (const d of [undefined, null, {}, {bus: 'zzz', power: '__proto__', livery: 'constructor', arrayScale: 'x'}, {arrayScale: -5}]) {
      const c = craftSpec(d); for (const k of KINDS) expect(c.parts[k].kind).toBe(k); expect(Number.isFinite(c.wingSpan)).toBe(true);
    }
    expect(partSpec('power', 'zzz').known).toBe(false); expect(partSpec('nonsense', 'a')).toBeNull(); expect(partSpec('bus', '__proto__').known).toBe(false);
  });
  it('wing span grows with the array scale and kit; livery recolours the bus', () => {
    expect(craftSpec({power: 'endurance', arrayScale: 2}).wingSpan).toBeGreaterThan(craftSpec({power: 'compact', arrayScale: 1}).wingSpan);
    expect(craftSpec({livery: 'cyan'}).busColor).not.toBe(craftSpec({livery: 'x'}).busColor);
  });
});
