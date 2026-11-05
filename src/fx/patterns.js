// Sound and haptic patterns as plain data (zero audio files). Times are seconds from the start of the sound.
// Each voice: {t, dur, f, f2?, type, gain, noise?, filter?}. f2 glides the frequency to f2 over the voice.

export const SOUNDS = {
  // UI tick: a short high blip
  tick: [{t: 0, dur: 0.035, f: 1400, type: 'sine', gain: 0.12}],
  // clunk when a part seats: low thud with a noise click
  seat: [{t: 0, dur: 0.14, f: 140, f2: 55, type: 'sine', gain: 0.4}, {t: 0, dur: 0.05, noise: true, filter: 1800, gain: 0.18}],
  // warning chirp: two falling tones
  warn: [{t: 0, dur: 0.14, f: 880, type: 'square', gain: 0.1}, {t: 0.18, dur: 0.18, f: 622, type: 'square', gain: 0.1}],
  // GO chime: rising major triad
  go: [{t: 0, dur: 0.22, f: 523.25, type: 'triangle', gain: 0.16}, {t: 0.09, dur: 0.22, f: 659.25, type: 'triangle', gain: 0.16}, {t: 0.18, dur: 0.45, f: 783.99, type: 'triangle', gain: 0.18}],
  // NO-GO: low buzz, twice
  nogo: [{t: 0, dur: 0.16, f: 130, type: 'sawtooth', gain: 0.16}, {t: 0.22, dur: 0.24, f: 110, type: 'sawtooth', gain: 0.16}],
  // launch: rumble (filtered noise) plus a rising sine sweep
  launch: [{t: 0, dur: 2.6, noise: true, filter: 220, gain: 0.35}, {t: 0, dur: 2.6, f: 55, f2: 180, type: 'sine', gain: 0.22}],
  // success: four rising notes
  success: [{t: 0, dur: 0.2, f: 523.25, type: 'triangle', gain: 0.16}, {t: 0.12, dur: 0.2, f: 659.25, type: 'triangle', gain: 0.16}, {t: 0.24, dur: 0.2, f: 783.99, type: 'triangle', gain: 0.16}, {t: 0.36, dur: 0.6, f: 1046.5, type: 'triangle', gain: 0.18}]
};
export const SOUND_NAMES = Object.keys(SOUNDS);

/** Vibration patterns in milliseconds (Android; iOS Safari has no vibrate and is simply silent). */
export const HAPTICS = {
  tick: [8], seat: [18], warn: [40, 60, 40], go: [30], nogo: [80, 50, 80], launch: [20, 40, 60, 40, 120], success: [20, 30, 40]
};

/** Total length of a sound in seconds. */
export const soundLength = name => Math.max(0, ...(SOUNDS[name] || []).map(v => v.t + v.dur));
