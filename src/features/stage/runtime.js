// Stage runtime: mutable state shared by the scene (three.js side) and the imperative ref (React side).
// It is plain JS, has no three.js import, and survives screen changes because the host owns it.
// Commands issued before the lazy scene exists (or while it is hidden) are buffered and replayed.
import {resolvePreset} from './camera.js';

export const LAUNCH_SECONDS = {first: 5.5, repeat: 3.2, reduced: 0.9};
const MAX_QUEUE = 8, QUEUE_TTL_MS = 3000;

export function createRuntime({now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())} = {}) {
  const rt = {
    // camera
    presetOverride: null, user: {yaw: 0, pitch: 0, zoom: 1}, interactedAt: -1e9, resetCount: 0,
    // snap-fit queue (consumed by the scene)
    seatQueue: [],
    // launch cinematic
    launch: {active: false, t: 0, duration: 0, resolve: null, promise: null, skipped: false},
    launchesPlayed: 0,
    exploded: false, xray: false,
    // scene wake-up (frameloop demand): the scene registers its invalidate here
    wake: null,
    listeners: new Set(),

    cameraTo(preset) {
      rt.presetOverride = preset == null ? null : resolvePreset(preset);
      rt.user = {yaw: 0, pitch: 0, zoom: 1}; rt.resetCount++;
      rt.poke();
    },
    resetCamera() { rt.user = {yaw: 0, pitch: 0, zoom: 1}; rt.resetCount++; rt.poke(); },

    seatPart(kind, id, fromRect) {
      const t = now();
      rt.seatQueue = rt.seatQueue.filter(s => t - s.at < QUEUE_TTL_MS).slice(-(MAX_QUEUE - 1));
      return new Promise(resolve => { rt.seatQueue.push({kind, id, rect: fromRect && typeof fromRect === 'object' ? fromRect : null, at: t, resolve}); rt.poke(); });
    },

    /** Start the cinematic, or skip it when `skip` is true. Resolves when it has ended (also when skipped). */
    launchSequence(skip = false, {reduced = false} = {}) {
      const L = rt.launch;
      if (skip) { if (L.active) rt.endLaunch(true); return L.promise || Promise.resolve(); }
      if (L.active) return L.promise;
      const duration = reduced ? LAUNCH_SECONDS.reduced : rt.launchesPlayed === 0 ? LAUNCH_SECONDS.first : LAUNCH_SECONDS.repeat;
      L.active = true; L.t = 0; L.duration = duration; L.skipped = false;
      L.promise = new Promise(resolve => { L.resolve = resolve; });
      // Frames advance the cinematic; this timer guarantees it ends (reduced motion draws no frames, hidden tabs pause them).
      clearTimeout(rt.launchTimer);
      rt.launchTimer = setTimeout(() => rt.endLaunch(false), duration * 1000 + (reduced ? 0 : 1500));
      rt.poke(); rt.emit();
      return L.promise;
    },
    launchTimer: 0,
    /** Advance the cinematic by dt seconds; returns progress 0..1 (or null when idle). */
    stepLaunch(dt) {
      const L = rt.launch;
      if (!L.active) return null;
      L.t += Math.max(0, dt);
      if (L.t >= L.duration) { rt.endLaunch(false); return 1; }
      return L.t / L.duration;
    },
    endLaunch(skipped) {
      const L = rt.launch;
      if (!L.active) return;
      clearTimeout(rt.launchTimer);
      L.active = false; L.skipped = skipped; rt.launchesPlayed++;
      const done = L.resolve; L.resolve = null; done?.({skipped});
      rt.poke(); rt.emit();
    },

    interact() { rt.interactedAt = now(); },
    idleFor(ms) { return now() - rt.interactedAt > ms; },
    poke() { rt.wake?.(); },
    onChange(fn) { rt.listeners.add(fn); return () => rt.listeners.delete(fn); },
    emit() { for (const fn of rt.listeners) fn(); },
    /** Drop everything (host disposal). Pending promises resolve so awaiting UI never hangs. */
    reset() {
      for (const s of rt.seatQueue) s.resolve?.(false);
      rt.seatQueue = []; rt.endLaunch(true); rt.wake = null; rt.listeners.clear();
    }
  };
  return rt;
}
