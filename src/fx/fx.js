import {SOUNDS, HAPTICS, SOUND_NAMES} from './patterns.js';

/**
 * Zero-asset WebAudio synth + haptics.
 *  - Silent until a user gesture has happened (autoplay policy) AND sound is enabled (prefs.sound, default off).
 *  - Works when AudioContext or navigator.vibrate are missing (play/haptic return false, nothing throws).
 *  - No network, no audio files: every sound is oscillators and filtered noise described in patterns.js.
 *
 * createFx({AudioContextCtor, vibrate, getPrefs, now}) builds an instance (tests inject fakes); `fx` is the singleton.
 */
export function createFx(options = {}) {
  const env = {
    Ctor: options.AudioContextCtor !== undefined ? options.AudioContextCtor : (globalThis.AudioContext || globalThis.webkitAudioContext || null),
    vibrate: options.vibrate !== undefined ? options.vibrate : (() => globalThis.navigator?.vibrate?.bind(globalThis.navigator) || null),
    getPrefs: options.getPrefs || (() => ({sound: false, haptics: false})),
    volume: options.volume ?? 0.8
  };
  let ctx = null, master = null, unlocked = false, noiseBuffer = null;
  const prefs = () => env.getPrefs() || {};
  const vibrateFn = () => (typeof env.vibrate === 'function' ? env.vibrate() : env.vibrate);

  function ensureContext() {
    if (ctx || !env.Ctor) return ctx;
    try {
      ctx = new env.Ctor();
      master = ctx.createGain(); master.gain.value = env.volume; master.connect(ctx.destination);
    } catch { ctx = null; }
    return ctx;
  }
  function noise() {
    if (noiseBuffer) return noiseBuffer;
    const len = Math.floor(ctx.sampleRate * 1), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let seed = 1; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647) * 2 - 1; }
    return (noiseBuffer = buf);
  }
  function voice(v, start) {
    const t0 = start + v.t, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v.gain), t0 + Math.min(0.01, v.dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);
    let src;
    if (v.noise) {
      src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = v.filter || 1200;
      src.connect(filter); filter.connect(g);
    } else {
      src = ctx.createOscillator(); src.type = v.type || 'sine'; src.frequency.setValueAtTime(v.f, t0);
      if (v.f2) src.frequency.exponentialRampToValueAtTime(v.f2, t0 + v.dur);
      src.connect(g);
    }
    g.connect(master); src.start(t0); src.stop(t0 + v.dur + 0.02);
    return src;
  }

  const api = {
    /** Call from a user gesture (the shell does it on the first pointer/key event). Creates and resumes the audio context. */
    unlock() {
      unlocked = true;
      const c = ensureContext();
      try { if (c && c.state === 'suspended') c.resume?.(); } catch { /* ignore */ }
      return !!c;
    },
    get unlocked() { return unlocked; },
    get supported() { return !!env.Ctor; },
    get enabled() { return !!prefs().sound; },
    /** fx.play('tick'|'seat'|'warn'|'go'|'nogo'|'launch'|'success'). Returns true when a sound was scheduled. */
    play(name) {
      const def = SOUNDS[name];
      if (!def || !prefs().sound || !unlocked) return false;
      const c = ensureContext(); if (!c) return false;
      try {
        if (c.state === 'suspended') c.resume?.();
        const start = c.currentTime + 0.005;
        for (const v of def) voice(v, start);
        return true;
      } catch { return false; }
    },
    /** fx.haptic('seat') or fx.haptic([20, 40, 20]). Returns true when vibrate() was called. */
    haptic(pattern) {
      if (!prefs().haptics || !unlocked) return false;
      const p = typeof pattern === 'string' ? HAPTICS[pattern] : pattern;
      if (!Array.isArray(p) || !p.every(n => Number.isFinite(n) && n >= 0 && n <= 2000)) return false;
      const vib = vibrateFn(); if (!vib) return false;
      try { return vib(p) !== false; } catch { return false; }
    },
    /** Plays the sound and the matching haptic together. */
    cue(name) { const a = api.play(name), b = api.haptic(name); return a || b; },
    names: SOUND_NAMES,
    close() { try { ctx?.close?.(); } catch { /* ignore */ } ctx = null; master = null; unlocked = false; noiseBuffer = null; },
    _context: () => ctx
  };
  return api;
}

let singletonPrefs = () => ({sound: false, haptics: false});
/** The shell points the singleton at the store's prefs (see bindings.js). */
export function configureFx(getPrefs) { singletonPrefs = getPrefs; }
export const fx = createFx({getPrefs: () => singletonPrefs()});
