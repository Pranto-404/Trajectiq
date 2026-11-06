// Camera presets and pure camera maths. Spherical presets (yaw/pitch/distance around a target) so the user's drag
// offsets compose on top of the preset and glide back to zero on every preset change.
export const CAMERA_PRESETS = Object.freeze({
  board:   {yaw: 0.9,  pitch: 0.2,  distance: 10.5, target: [0, 0.1, 0],  fov: 40},
  hangar:  {yaw: 0.65, pitch: 0.28, distance: 7,    target: [0, 0, 0],    fov: 42},
  'hangar-launch': {yaw: 0.5, pitch: 0.12, distance: 8.2, target: [0, -0.9, 0], fov: 42},
  launch:  {yaw: 0.25, pitch: 0.08, distance: 8.5,  target: [0, 0.5, 0],  fov: 44},
  transfer:{yaw: 0.1,  pitch: 0.12, distance: 7.2,  target: [0, 0, 0],    fov: 42},
  flight:  {yaw: 0.65, pitch: 0.28, distance: 9.4,  target: [0, 0, 0],    fov: 42},
  report:  {yaw: -0.5, pitch: 0.38, distance: 12.5, target: [0, 0, 0],    fov: 42}
});
export const PRESET_IDS = Object.freeze(Object.keys(CAMERA_PRESETS));

export const PITCH_LIMIT = 1.15;
export const ZOOM_LIMIT = [0.6, 1.9];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isNum = v => typeof v === 'number' && Number.isFinite(v);

/** Resolve a preset name or a partial object to a complete preset. Unknown names fall back to `hangar`. */
export function resolvePreset(p) {
  if (typeof p === 'string') return Object.prototype.hasOwnProperty.call(CAMERA_PRESETS, p) ? CAMERA_PRESETS[p] : CAMERA_PRESETS.hangar;
  if (p && typeof p === 'object') {
    const b = CAMERA_PRESETS.hangar;
    return {yaw: isNum(p.yaw) ? p.yaw : b.yaw, pitch: isNum(p.pitch) ? clamp(p.pitch, -PITCH_LIMIT, PITCH_LIMIT) : b.pitch,
      distance: isNum(p.distance) && p.distance > 0.5 ? p.distance : b.distance,
      target: Array.isArray(p.target) && p.target.length === 3 && p.target.every(isNum) ? p.target : b.target, fov: isNum(p.fov) ? clamp(p.fov, 20, 70) : b.fov};
  }
  return CAMERA_PRESETS.hangar;
}

/** Which preset belongs to a screen/mission phase. `selected` zooms the hangar on the launch adapter. */
export function presetForPhase(phase, selected) {
  switch (phase) {
    case 'board': return 'board';
    case 'launch': return 'launch';
    case 'transfer': return 'transfer';
    case 'capture': case 'operations': case 'flight': return 'flight';
    case 'debrief': case 'report': return 'report';
    default: return selected === 'launch' ? 'hangar-launch' : 'hangar';
  }
}

/** Scene mode (which layout the objects take) for a phase. */
export function sceneModeFor(phase) {
  switch (phase) {
    case 'board': case 'hangar': return 'hangar';
    case 'launch': return 'launch';
    case 'transfer': return 'transfer';
    default: return 'orbit';
  }
}

/** On narrow canvases the craft would be cropped: back the camera off in proportion to the missing aspect. */
export function distanceForAspect(distance, aspect, minAspect = 1.2) {
  const a = isNum(aspect) && aspect > 0 ? aspect : 1.6;
  return a >= minAspect ? distance : distance * Math.min(2.4, minAspect / a);
}

/** Clamp user offsets (yaw free, pitch +-limit around the preset, zoom factor limited). */
export function clampUser(u) {
  return {yaw: isNum(u.yaw) ? u.yaw : 0, pitch: clamp(isNum(u.pitch) ? u.pitch : 0, -PITCH_LIMIT, PITCH_LIMIT), zoom: clamp(isNum(u.zoom) ? u.zoom : 1, ZOOM_LIMIT[0], ZOOM_LIMIT[1])};
}

/** Eye position for a preset plus user offsets and an aspect-fitted distance. */
export function eyeFor(preset, user = {yaw: 0, pitch: 0, zoom: 1}, aspect = 1.6, out = [0, 0, 0]) {
  const u = clampUser(user), yaw = preset.yaw + u.yaw, pitch = clamp(preset.pitch + u.pitch, -PITCH_LIMIT, PITCH_LIMIT);
  const d = distanceForAspect(preset.distance, aspect) * u.zoom, cp = Math.cos(pitch);
  out[0] = preset.target[0] + Math.sin(yaw) * cp * d; out[1] = preset.target[1] + Math.sin(pitch) * d; out[2] = preset.target[2] + Math.cos(yaw) * cp * d;
  return out;
}

/** Linear blend of two spherical poses (yaw by shortest arc). */
export function lerpPose(a, b, k) {
  let dy = b.yaw - a.yaw; dy = ((dy + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return {yaw: a.yaw + dy * k, pitch: a.pitch + (b.pitch - a.pitch) * k, distance: a.distance + (b.distance - a.distance) * k,
    fov: a.fov + (b.fov - a.fov) * k, target: a.target.map((v, i) => v + (b.target[i] - v) * k)};
}

/** Keyboard camera control (ported from the legacy renderer): returns new user offsets or null when the key is unused. */
export function keyboardCamera(user, key) {
  const u = {...user};
  switch (key) {
    case 'ArrowLeft': u.yaw -= 0.1; break;
    case 'ArrowRight': u.yaw += 0.1; break;
    case 'ArrowUp': u.pitch += 0.1; break;
    case 'ArrowDown': u.pitch -= 0.1; break;
    case '+': case '=': u.zoom *= 0.92; break;
    case '-': case '_': u.zoom *= 1.08; break;
    case 'r': case 'R': return {yaw: 0, pitch: 0, zoom: 1};
    default: return null;
  }
  return clampUser(u);
}

/**
 * Touch rule: a gesture whose total movement is mostly vertical belongs to page scrolling and never rotates the camera.
 * Returns {rotate, dx, dy}. Mouse drags rotate in both axes.
 */
export function dragDelta({touch, totalX, totalY, dx, dy}) {
  if (touch) return Math.abs(totalY) > Math.abs(totalX) ? {rotate: false, dx: 0, dy: 0} : {rotate: true, dx, dy: 0};
  return {rotate: true, dx, dy};
}
