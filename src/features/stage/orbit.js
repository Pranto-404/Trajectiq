// Orbit and lighting maths for the stage. Pure. The geometry is schematic (altitude spacing is exaggerated) but the
// period, the eclipse fraction and the order of the orbit phases come from the engine (circular orbit, central
// cylindrical shadow, zero beta angle; see dist/data/catalog.js and dist/engine/model.js).
import {REFERENCE_BODY_RADIUS} from './bodyVisuals.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

/** Visual orbit radius: grows with altitude/radius, monotonic, clamped so the ring always fits the frame. */
export function orbitRadiusVisual(altitude, bodyRadiusKm, bodyRadiusVisual = REFERENCE_BODY_RADIUS) {
  const ratio = clamp(num(altitude, 0) / Math.max(1, num(bodyRadiusKm, 1737.4)), 0, 100);
  return bodyRadiusVisual * Math.min(3.1, 1.53 + 7.06 * ratio);
}

/** Position on the schematic orbit at `minute`. Equatorial (inclination 0) lies in x/z, polar (90) in x/y. */
export function orbitPoint(minute, period, radius, inclinationDeg = 0, out = [0, 0, 0]) {
  return orbitPointAngle((num(minute, 0) / Math.max(1e-6, period)) * TAU, radius, inclinationDeg, out);
}

/** Orbit point from an angle in radians (same plane as orbitPoint). */
export function orbitPointAngle(angle, radius, inclinationDeg = 0, out = [0, 0, 0]) {
  const i = (num(inclinationDeg, 0) * Math.PI) / 180;
  out[0] = radius * Math.cos(angle); out[1] = radius * Math.sin(angle) * Math.sin(i); out[2] = radius * Math.sin(angle) * Math.cos(i);
  return out;
}

/**
 * Where the Sun is and where the shadow lies. The engine flags eclipse for the LAST `eclipseMinutes` of each orbit,
 * so the shadow is centred at fraction 1 - e/2 of the period; the Sun is on the opposite side of the orbit, in plane.
 * The shadow cylinder radius is r * R/(R+h) (the physical ratio), which reproduces the engine's eclipse arc.
 */
export function eclipseGeometry({period, eclipseMinutes, orbitRadius, inclination = 0, bodyRadiusKm, altitude}) {
  const P = Math.max(1e-6, num(period, 100)), e = clamp(num(eclipseMinutes, 0) / P, 0, 0.5);
  const center = TAU * (1 - e / 2), sunAngle = center - Math.PI;
  const sunDir = orbitPointAngle(sunAngle, 1, inclination);
  const phys = bodyRadiusKm > 0 ? bodyRadiusKm / (bodyRadiusKm + Math.max(0, num(altitude, 0))) : Math.sin(Math.PI * e);
  return {fraction: e, centerAngle: center, halfAngle: Math.PI * e, sunAngle, sunDir, shadowRadius: orbitRadius * phys};
}

/** Geometric eclipse test against a cylindrical shadow behind the body. */
export function inShadow(pos, sunDir, shadowRadius) {
  const along = pos[0] * sunDir[0] + pos[1] * sunDir[1] + pos[2] * sunDir[2];
  if (along >= 0) return false;
  const px = pos[0] - along * sunDir[0], py = pos[1] - along * sunDir[1], pz = pos[2] - along * sunDir[2];
  return Math.hypot(px, py, pz) < shadowRadius;
}

/** Orbit period in minutes (same formula as the engine, kept local so tests can pin it). */
export const periodMinutes = (radiusKm, mu, altitudeKm) => (TAU * Math.sqrt((radiusKm + altitudeKm) ** 3 / mu)) / 60;

/** Orbit numbers for a mission (the object missionFor returns) and a design. */
export function orbitGeometry(mission, design = {}) {
  const altitude = num(design.altitude, mission?.altitudeMin ?? 100), inclination = clamp(num(design.inclination, 90), 0, 180);
  const radiusKm = num(mission?.radius, 1737.4), mu = num(mission?.mu, 4902.8);
  return {period: periodMinutes(radiusKm, mu, altitude), altitude, inclination, radiusKm, mu,
    eclipseMinutes: num(mission?.eclipseMinutes, 0), contactMinutes: num(mission?.contactMinutes, 25)};
}

/** Unit vector toward a target from a position, written into `out`. */
export function directionTo(from, to, out = [0, 0, 0]) {
  const x = to[0] - from[0], y = to[1] - from[1], z = to[2] - from[2], l = Math.hypot(x, y, z) || 1;
  out[0] = x / l; out[1] = y / l; out[2] = z / l; return out;
}

/** Yaw (about Y) that turns +Z toward a direction; used for solar wings and the dish. */
export const yawToward = dir => Math.atan2(dir[0], dir[2]);
