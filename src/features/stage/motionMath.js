// Small motion helpers for the stage. Pure.
export const clamp01 = v => Math.min(1, Math.max(0, v));

/** Cubic-bezier easing (CSS semantics): returns f(x) -> y. Used for the 900 ms camera glide. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) return sy(t); const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 24; i++) { const e = sx(t); if (Math.abs(e - x) < 1e-6) break; if (e < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
export const easeCamera = cubicBezier(0.65, 0, 0.35, 1);

/** Damped spring, semi-implicit Euler with sub-stepping. state = {x, v}; params follow the Motion convention. */
export function springStep(state, target, {stiffness = 420, damping = 26, mass = 1} = {}, dt = 1 / 60) {
  let left = Math.min(Math.max(dt, 0), 0.1);
  while (left > 1e-9) {
    const h = Math.min(left, 1 / 240);
    state.v += ((-stiffness * (state.x - target) - damping * state.v) / mass) * h;
    state.x += state.v * h; left -= h;
  }
  return state;
}

/** Frame-rate independent exponential approach. lambda = Infinity snaps (reduced motion). */
export function damp(x, target, lambda, dt) {
  if (!Number.isFinite(lambda)) return target;
  return target + (x - target) * Math.exp(-lambda * dt);
}

/** Peak overshoot (fraction of travel) of a spring released from rest, by simulation. */
export function springOvershoot(params, seconds = 3) {
  const s = {x: 0, v: 0}; let peak = 0;
  for (let i = 0; i < seconds * 240; i++) { springStep(s, 1, params, 1 / 240); peak = Math.max(peak, s.x); }
  return peak - 1;
}

/** Launch shake: ramps in at ignition, then decays exponentially after the peak. Always zero when reduced. */
export function shakeAmplitude(t, {ignite = 0.6, peak = 1.6, amp = 0.05, decay = 2.4, reduced = false} = {}) {
  if (reduced || t < ignite) return 0;
  if (t < peak) return amp * ((t - ignite) / (peak - ignite));
  return amp * Math.exp(-decay * (t - peak));
}
