// Camera: glides between presets (900 ms, camera easing), applies the player's drag/keys on top, idle drift, launch shake.
// Touch: horizontal drags rotate, vertical swipes scroll the page (touch-action: pan-y, same rule as the legacy renderer).
import {useEffect} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {PerspectiveCamera} from 'three';
import {clampUser, dragDelta, eyeFor, keyboardCamera, lerpPose, presetForPhase, resolvePreset} from './camera.js';
import {damp, easeCamera, shakeAmplitude} from './motionMath.js';

const GLIDE_S = 0.9;
export function CameraRig({ctx}) {
  const gl = useThree(s => s.gl), invalidate = useThree(s => s.invalidate), camera = useThree(s => s.camera);
  const rt = ctx.runtime;
  useEffect(() => {
    const el = gl.domElement; let down = null, moved = false;
    const apply = u => { rt.user = clampUser(u); rt.interact(); rt.poke(); invalidate(); };
    const onDown = e => {
      if (e.isPrimary === false || e.button > 0) return;
      down = {x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch'}; moved = false; rt.interact();
      if (!down.touch) el.setPointerCapture?.(e.pointerId);
    };
    const onMove = e => {
      if (!down || e.pointerId !== down.id) return;
      const d = dragDelta({touch: down.touch, totalX: e.clientX - down.sx, totalY: e.clientY - down.sy, dx: e.clientX - down.x, dy: e.clientY - down.y});
      if (Math.abs(e.clientX - down.sx) + Math.abs(e.clientY - down.sy) > 5) moved = true;
      down.x = e.clientX; down.y = e.clientY;
      if (d.rotate && (d.dx || d.dy)) apply({...rt.user, yaw: rt.user.yaw + d.dx * 0.006, pitch: rt.user.pitch + d.dy * 0.004});
    };
    const onUp = e => { if (!down || e.pointerId !== down.id) return; if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture?.(e.pointerId); down = null; };
    const onCancel = () => { down = null; moved = true; };
    const onWheel = e => { if (e.ctrlKey || e.metaKey || document.activeElement !== el) return; e.preventDefault(); apply({...rt.user, zoom: rt.user.zoom * (1 + e.deltaY * 0.0015)}); };
    const onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const next = keyboardCamera(rt.user, e.key); if (!next) return;
      e.preventDefault(); if (e.key === 'r' || e.key === 'R') { rt.resetCamera(); rt.interact(); } else apply(next);
    };
    const handlers = [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onCancel], ['lostpointercapture', () => { down = null; }], ['keydown', onKey]];
    handlers.forEach(([t, f]) => el.addEventListener(t, f)); el.addEventListener('wheel', onWheel, {passive: false});
    return () => { handlers.forEach(([t, f]) => el.removeEventListener(t, f)); el.removeEventListener('wheel', onWheel); };
  }, [gl, invalidate, rt]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), red = ctx.reduced.current, A = ctx.A, p = ctx.p.current, now = state.clock.elapsedTime;
    const phase = ctx.runtime.launch.active ? 'launch' : p.phase || p.run?.phase || 'hangar';
    const id = rt.presetOverride ? 'override:' + rt.resetCount : presetForPhase(phase, p.selected);
    const cam = A.cam;
    if (cam.id !== id || cam.reset !== rt.resetCount) {
      const to = rt.presetOverride || resolvePreset(presetForPhase(phase, p.selected));
      const from = cam.cur || to;
      cam.from = {...from, target: [...from.target]}; cam.to = to; cam.t0 = now; cam.id = id; cam.reset = rt.resetCount;
      if (cam.id !== 'init') { A.drift = 0; }
      if (red || !cam.cur) cam.cur = {...to, target: [...to.target]};
    }
    if (!red) { const k = Math.min(1, (now - cam.t0) / GLIDE_S); cam.cur = lerpPose(cam.from, cam.to, easeCamera(k)); if (k < 1) invalidate(); }
    else cam.cur = {...cam.to, target: [...cam.to.target]};
    // idle drift (off under reduced motion; stops on interaction)
    const drifting = !red && rt.idleFor(3500) && (A.mode === 'hangar' || A.mode === 'orbit');
    if (drifting) A.drift += dt * 0.07;
    A.user.yaw = damp(A.user.yaw, rt.user.yaw + A.drift, red ? Infinity : 14, dt); A.user.pitch = damp(A.user.pitch, rt.user.pitch, red ? Infinity : 14, dt); A.user.zoom = damp(A.user.zoom, rt.user.zoom, red ? Infinity : 14, dt);
    const aspect = state.size.width / Math.max(1, state.size.height), eye = eyeFor(cam.cur, A.user, aspect), tg = cam.cur.target.slice();
    if (A.mode === 'launch' && A.launchP != null) tg[1] += Math.max(0, A.rocketY) * 0.5;
    let sx = 0, sy = 0;
    if (A.launchP != null && !red) { const amp = shakeAmplitude(A.launchP * 5.5, {reduced: red}); sx = Math.sin(now * 47) * amp; sy = Math.sin(now * 53 + 1) * amp; }
    if (A.mode === 'launch' && A.launchP != null) eye[1] += Math.max(0, A.rocketY) * 0.25;
    camera.position.set(eye[0] + sx, eye[1] + sy, eye[2]); camera.lookAt(tg[0] + sx, tg[1] + sy, tg[2]);
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - cam.cur.fov) > 0.01) { camera.fov = cam.cur.fov; camera.updateProjectionMatrix(); }
  }, -1);
  return null;
}
