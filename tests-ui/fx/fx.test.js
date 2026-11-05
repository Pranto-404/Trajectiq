import {describe, it, expect, vi} from 'vitest';
import {createFx, SOUNDS, HAPTICS, SOUND_NAMES, soundLength, bindFx} from '@/fx/index.js';
import {makeStore} from '../store/harness.js';

/** A recording fake of the parts of WebAudio the synth uses. */
function fakeAudio() {
  const log = {oscillators: [], noises: [], resumed: 0, created: 0};
  class Ctx {
    constructor() { log.created++; this.currentTime = 10; this.sampleRate = 8000; this.state = 'suspended'; this.destination = {}; }
    resume() { log.resumed++; this.state = 'running'; }
    createGain() { return {gain: {value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}}, connect() {}}; }
    createOscillator() { const o = {type: '', frequency: {setValueAtTime(f, t) { o.f = f; o.t0 = t; }, exponentialRampToValueAtTime(f, t) { o.f2 = f; o.t1 = t; }}, connect() {}, start(t) { o.start = t; }, stop(t) { o.stop = t; }}; log.oscillators.push(o); return o; }
    createBuffer(c, len) { return {getChannelData: () => new Float32Array(len)}; }
    createBufferSource() { const n = {connect() {}, start(t) { n.start = t; }, stop(t) { n.stop = t; }}; log.noises.push(n); return n; }
    createBiquadFilter() { return {type: '', frequency: {value: 0}, connect() {}}; }
  }
  return {Ctx, log};
}

describe('fx: synth', () => {
  it('has the seven planned sounds as pure data with sane timing', () => {
    expect(SOUND_NAMES).toEqual(expect.arrayContaining(['tick', 'seat', 'warn', 'go', 'nogo', 'launch', 'success']));
    for (const n of SOUND_NAMES) { expect(soundLength(n)).toBeGreaterThan(0); expect(soundLength(n)).toBeLessThan(3); for (const v of SOUNDS[n]) { expect(v.gain).toBeGreaterThan(0); expect(v.gain).toBeLessThanOrEqual(0.4); expect(v.dur).toBeGreaterThan(0); } }
    expect(soundLength('tick')).toBeLessThan(0.1); expect(soundLength('launch')).toBeGreaterThan(2);
  });

  it('is silent until a user gesture AND until enabled', () => {
    const {Ctx, log} = fakeAudio(); const prefs = {sound: false, haptics: false}; const fx = createFx({AudioContextCtor: Ctx, getPrefs: () => prefs, vibrate: () => null});
    expect(fx.play('tick')).toBe(false); expect(log.created).toBe(0);
    prefs.sound = true; expect(fx.play('tick')).toBe(false); expect(log.created).toBe(0); // enabled but no gesture yet
    fx.unlock(); expect(log.created).toBe(1); prefs.sound = false; expect(fx.play('tick')).toBe(false); expect(log.oscillators).toHaveLength(0); // gesture but disabled
    prefs.sound = true; expect(fx.play('tick')).toBe(true); expect(log.oscillators).toHaveLength(1); expect(log.resumed).toBeGreaterThan(0);
  });

  it('schedules every voice at the right time with a glide for the rumble and noise for the clunk', () => {
    const {Ctx, log} = fakeAudio(); const fx = createFx({AudioContextCtor: Ctx, getPrefs: () => ({sound: true})}); fx.unlock();
    fx.play('success'); const notes = log.oscillators.splice(0);
    expect(notes).toHaveLength(4); expect(notes.map(n => +(n.start - 10.005).toFixed(3))).toEqual([0, 0.12, 0.24, 0.36]); expect(notes.map(n => n.f)).toEqual([523.25, 659.25, 783.99, 1046.5]);
    for (const n of notes) expect(n.stop).toBeGreaterThan(n.start);
    fx.play('launch'); expect(log.noises).toHaveLength(1); expect(log.oscillators.at(-1)).toMatchObject({f: 55, f2: 180}); expect(log.oscillators.at(-1).stop - log.oscillators.at(-1).start).toBeGreaterThan(2.5);
    log.noises.length = 0; fx.play('seat'); expect(log.noises).toHaveLength(1); expect(log.oscillators.at(-1).f2).toBe(55);
    expect(fx.play('unknown')).toBe(false);
  });

  it('works without AudioContext and without vibrate (nothing throws)', () => {
    const fx = createFx({AudioContextCtor: null, getPrefs: () => ({sound: true, haptics: true}), vibrate: () => null});
    expect(fx.supported).toBe(false); expect(fx.unlock()).toBe(false); expect(fx.play('go')).toBe(false); expect(fx.haptic('go')).toBe(false); expect(fx.cue('go')).toBe(false);
    const broken = createFx({AudioContextCtor: class { constructor() { throw new Error('no audio'); } }, getPrefs: () => ({sound: true})}); broken.unlock(); expect(broken.play('tick')).toBe(false);
  });

  it('makes no network request and needs no audio file', async () => {
    const f = vi.fn(); vi.stubGlobal('fetch', f); const {Ctx} = fakeAudio(); const fx = createFx({AudioContextCtor: Ctx, getPrefs: () => ({sound: true})}); fx.unlock(); for (const n of SOUND_NAMES) fx.play(n);
    expect(f).not.toHaveBeenCalled(); vi.unstubAllGlobals();
  });
});

describe('fx: haptics', () => {
  it('vibrates only when enabled, unlocked and supported, with valid patterns', () => {
    const vibrate = vi.fn(() => true); const prefs = {sound: false, haptics: false}; const fx = createFx({AudioContextCtor: null, getPrefs: () => prefs, vibrate: () => vibrate});
    expect(fx.haptic('seat')).toBe(false); prefs.haptics = true; expect(fx.haptic('seat')).toBe(false); fx.unlock();
    expect(fx.haptic('seat')).toBe(true); expect(vibrate).toHaveBeenLastCalledWith(HAPTICS.seat);
    expect(fx.haptic([20, 40, 20])).toBe(true); expect(fx.haptic('nope')).toBe(false); expect(fx.haptic([-1])).toBe(false); expect(fx.haptic([5000])).toBe(false); expect(fx.haptic('launch')).toBe(true);
    for (const p of Object.values(HAPTICS)) expect(p.every(n => n > 0 && n <= 200)).toBe(true);
  });
});

describe('fx: store bindings', () => {
  it('unlocks on the first gesture and plays cues for seat, launch, warn and success only when enabled', () => {
    const h = makeStore(); h.a.init();
    const target = new EventTarget(); const calls = []; const inst = {unlock: vi.fn(), play: vi.fn(n => calls.push(['play', n])), cue: vi.fn(n => calls.push(['cue', n]))};
    const unbind = bindFx(h.store, inst, target);
    h.a.install('payload', 'hires'); expect(calls).toContainEqual(['cue', 'seat']);
    target.dispatchEvent(new Event('pointerdown')); expect(inst.unlock).toHaveBeenCalledTimes(1); target.dispatchEvent(new Event('keydown')); expect(inst.unlock).toHaveBeenCalledTimes(1);
    calls.length = 0; h.a['game-launch'](); expect(calls).toContainEqual(['cue', 'launch']);
    for (let i = 0; i < 400 && !h.get().run.done; i++) { const r = h.get().run; if (r.crisis) { if (!calls.some(c => c[1] === 'warn')) expect(calls).toContainEqual(['cue', 'warn']); h.a.resolve(r.crisis.actions.find(a => !a.disabled).id); } else h.a.fast(); }
    expect(calls.some(c => c[1] === 'success' || c[1] === 'nogo')).toBe(true);
    unbind();
  });
  it('turning sound on gives one tick as feedback', () => {
    const h = makeStore(); h.a.init(); const calls = []; const inst = {unlock() { calls.push('unlock'); }, play: n => calls.push(n), cue() {}};
    bindFx(h.store, inst, new EventTarget()); h.a['toggle-sound'](); expect(calls).toEqual(['unlock', 'tick']);
  });
});
