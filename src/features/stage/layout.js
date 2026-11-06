// Where the objects sit in each scene mode. The scene damps every object toward the layout of the current mode,
// so a phase change glides instead of cutting. Pure data.
export const LAYOUTS = Object.freeze({
  hangar:   {craft: {pos: [0, 0, 0], scale: 1},        body: {pos: [-11, 5, -18], k: 2.0}, earth: {pos: [12, -3, -22], r: 1.7}, sun: [-0.7, 0.8, 1.0]},
  launch:   {craft: {pos: [0, 0, 0], scale: 0.001},    body: {pos: [-11, 5, -18], k: 2.0}, earth: {pos: [0, -6.4, 0], r: 3.4},   sun: [-0.7, 0.8, 1.0]},
  transfer: {craft: {pos: [0, 0, 0], scale: 0.3},      body: {pos: [3.1, 0.8, 0], k: 0.45}, earth: {pos: [-3.1, -0.75, -1], r: 1.15}, sun: [-0.6, 0.7, 1.0]},
  orbit:    {craft: {pos: [0, 0, 0], scale: 0.26},     body: {pos: [0, 0, 0], k: 1},       earth: {pos: [8.5, -1.5, -7], r: 1.05},  sun: null}
});

export const GLIDE_LAMBDA = 5.5;     // 1/s: about 900 ms to settle
export const TRACK_LAMBDA = 20;      // tight follow once settled (craft on its orbit)
export const POSE_SETTLE_S = 1.2;

/** Transfer flight path: craft position for progress k in 0..1 (schematic, not a trajectory). */
export const transferPoint = (k, out = [0, 0, 0]) => { const c = Math.min(1, Math.max(0, k)); out[0] = -2.1 + 4.4 * c; out[1] = -0.4 + 1.0 * c + Math.sin(c * Math.PI) * 0.35; out[2] = 0; return out; };

/** Launch rocket altitude (world y of the stack centre) at normalised launch progress p in 0..1. */
export function rocketY(p) {
  const lift = Math.max(0, (p - 0.22) / 0.78);
  return -0.6 + 16 * lift * lift;
}
export const LAUNCH_MARKS = Object.freeze({ignite: 0.1, liftoff: 0.22, separation: 0.62});
