import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, createRef} from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {Texture, CanvasTexture} from 'three';
import {PRESETS} from '@data/catalog.js';
import {Stage3D} from '@/features/stage/Stage3D.jsx';
import {configureHost, createHost, disposeHost, getHost} from '@/features/stage/host.js';
import {createRuntime, LAUNCH_SECONDS} from '@/features/stage/runtime.js';
import {detectWebGL2} from '@/features/stage/webgl.js';
import {createParticles} from '@/features/stage/particles.js';
import {disposeTextures, ownedTextureCount, track} from '@/features/stage/textures.js';
import {KINDS} from '@/features/stage/parts.js';

const design = {...PRESETS.balanced, destination: 'moon'};

afterEach(() => { disposeHost(); vi.useRealTimers(); });

describe('WebGL2 detection', () => {
  it('is false without a context, true with one, and releases the probe context', () => {
    expect(detectWebGL2({createElement: () => ({getContext: () => null})})).toBe(false);
    expect(detectWebGL2({createElement: () => { throw new Error('boom'); }})).toBe(false);
    expect(detectWebGL2(null)).toBe(false);
    const lose = vi.fn();
    expect(detectWebGL2({createElement: () => ({getContext: kind => (kind === 'webgl2' ? {getExtension: () => ({loseContext: lose})} : null)})})).toBe(true);
    expect(lose).toHaveBeenCalledTimes(1);
  });
  it('asks only for webgl2 (a webgl1-only browser takes the fallback)', () => {
    const asked = []; expect(detectWebGL2({createElement: () => ({getContext: k => { asked.push(k); return k === 'webgl' ? {} : null; }})})).toBe(false); expect(asked).toEqual(['webgl2']);
  });
});

describe('SVG fallback (WebGL2 unavailable)', () => {
  beforeEach(() => configureHost({detect: () => false, loadCanvas: async () => { throw new Error('must not load'); }}));

  it('renders every part as a selectable control with the same selection API', () => {
    const onPick = vi.fn(), onHover = vi.fn();
    render(<Stage3D design={design} selected="power" hoverPart="comms" phase="hangar" reduced onPick={onPick} onSocketHover={onHover} />);
    const fb = document.querySelector('[data-stage-fallback]'); expect(fb).toBeTruthy();
    const parts = [...fb.querySelectorAll('[data-part]')]; expect(parts.map(p => p.getAttribute('data-part'))).toEqual(KINDS);
    expect(fb.querySelector('[data-part="power"]').getAttribute('aria-pressed')).toBe('true');
    expect(fb.querySelector('[data-part="bus"]').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(fb.querySelector('[data-part="payload"]')); expect(onPick).toHaveBeenCalledWith('payload');
    fireEvent.keyDown(fb.querySelector('[data-part="storage"]'), {key: 'Enter'}); expect(onPick).toHaveBeenCalledWith('storage');
    fireEvent.pointerEnter(fb.querySelector('[data-part="comms"]')); expect(onHover).toHaveBeenCalledWith('comms');
    fireEvent.pointerLeave(fb.querySelector('[data-part="comms"]')); expect(onHover).toHaveBeenLastCalledWith(null);
  });

  it('describes the craft for assistive technology and names the body from the design', () => {
    render(<Stage3D design={{...design, destination: 'mars'}} phase="operations" run={{phase: 'operations', minute: 10, eclipse: true, contact: false}} reduced />);
    expect(document.querySelector('[data-stage-fallback]').getAttribute('aria-label')).toMatch(/Mars/);
    expect(screen.getByText(/Schematic 3D spacecraft/)).toBeTruthy();
    expect(document.body.textContent).toMatch(/IN SHADOW/);
  });

  it('survives hostile designs and unknown bodies', () => {
    expect(() => render(<Stage3D design={{destination: 'zzz', bus: {}, power: 5, livery: '<script>'}} phase="hangar" reduced />)).not.toThrow();
    expect(() => render(<Stage3D phase="operations" run={{minute: 'x'}} reduced />)).not.toThrow();
  });

  it('imperative API: seatPart and launchSequence resolve, skip ends a launch early, cameraTo is safe', async () => {
    vi.useFakeTimers(); const ref = createRef();
    render(<Stage3D ref={ref} design={design} phase="hangar" reduced />);
    let seated; act(() => { seated = ref.current.seatPart('power', 'endurance', {left: 10, top: 10, width: 50, height: 20}); });
    await act(async () => { await vi.advanceTimersByTimeAsync(200); }); expect(await seated).toBe(true);
    expect(() => ref.current.cameraTo('flight')).not.toThrow(); expect(() => ref.current.cameraTo({yaw: 1})).not.toThrow();
    let done = false, p; act(() => { p = ref.current.launchSequence(false); p.then(() => { done = true; }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); }); expect(done).toBe(false);
    await act(async () => { ref.current.launchSequence(true); await vi.advanceTimersByTimeAsync(10); }); expect(done).toBe(true);
  });

  it('never loads the 3D chunk and reports its status', () => { const ref = createRef(); render(<Stage3D ref={ref} design={design} phase="hangar" reduced />); expect(ref.current.status).toBe('fallback'); expect(getHost().reason).toBe('no-webgl2'); });
});

describe('persistent host (mocked 3D chunk)', () => {
  it('suspends offscreen slots, resumes visible slots and ignores stale observations', () => {
    const callbacks = [], disconnect = vi.fn();
    const original = window.IntersectionObserver;
    window.IntersectionObserver = class { constructor(cb) { callbacks.push(cb); } observe() {} disconnect() { disconnect(); } };
    const h = createHost({detect: () => false}), one = document.createElement('div'), two = document.createElement('div');
    try {
      h.attach(one); callbacks[0]([{target: one, isIntersecting: false}]);
      expect(h.store.get().offscreen).toBe(true);
      h.update({phase: 'operations'}); expect(h.store.get().offscreen).toBe(true);
      callbacks[0]([{target: one, isIntersecting: true}]); expect(h.store.get().offscreen).toBe(false);
      h.detach(one); h.attach(two);
      callbacks[0]([{target: one, isIntersecting: false}]); expect(h.store.get().offscreen).toBe(false);
      h.dispose(); expect(disconnect).toHaveBeenCalled();
    } finally { h.dispose(); window.IntersectionObserver = original; }
  });
  // Counters live in a per-test object so a late load from a previous test cannot pollute the next one.
  let S;
  beforeEach(() => {
    const st = S = {mounts: 0, disposes: 0, hooks: null};
    configureHost({detect: () => true, loadCanvas: async () => ({mountStage: async (el, h) => { st.mounts++; st.hooks = h; return {dispose() { st.disposes++; }}; }})});
  });

  it('mounts the scene once, lazily, and keeps it alive across screen changes (slot unmount/mount)', async () => {
    const a = render(<Stage3D design={design} phase="hangar" reduced />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(S.mounts).toBe(1); expect(getHost().status).toBe('ready');
    const hostEl = getHost().el; expect(a.container.querySelector('[data-stage-slot]').contains(hostEl)).toBe(true);
    a.unmount();                                   // hangar screen leaves
    await act(async () => { await new Promise(r => setTimeout(r, 5)); });
    expect(S.disposes).toBe(0); expect(hostEl.isConnected).toBe(true); expect(hostEl.parentElement.hasAttribute('aria-hidden')).toBe(true); expect(getHost().store.get().parked).toBe(true);
    const b = render(<Stage3D design={design} phase="operations" reduced />);   // flight screen arrives
    await act(async () => { await Promise.resolve(); });
    expect(S.mounts).toBe(1); expect(S.disposes).toBe(0); expect(b.container.querySelector('[data-stage-slot]').contains(hostEl)).toBe(true); expect(getHost().store.get().parked).toBe(false);
    expect(getHost().store.get().phase).toBe('operations');
  });

  it('passes the latest props (including callbacks) into the scene store', async () => {
    const onPick = vi.fn(); const {rerender} = render(<Stage3D design={design} selected="bus" hoverPart="power" phase="hangar" quality="low" reduced onPick={onPick} />);
    const s1 = getHost().store.get(); expect(s1.selected).toBe('bus'); expect(s1.hoverPart).toBe('power'); expect(s1.quality).toBe('low'); expect(s1.reduced).toBe(true); s1.onPick('x'); expect(onPick).toHaveBeenCalledWith('x');
    rerender(<Stage3D design={design} selected="comms" phase="hangar" reduced onPick={onPick} />); expect(getHost().store.get().selected).toBe('comms');
  });

  it('disposes the scene exactly once on dispose and resolves pending commands', async () => {
    const ref = createRef(); render(<Stage3D ref={ref} design={design} phase="hangar" reduced />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const pending = ref.current.seatPart('bus', 'compact', null); let launched = false; ref.current.launchSequence(false).then(() => { launched = true; });
    disposeHost(); disposeHost();
    expect(S.disposes).toBe(1); expect(await pending).toBe(false); await Promise.resolve(); expect(launched).toBe(true);
  });

  it('a lost context that does not come back switches to the SVG scene and disposes the scene', async () => {
    render(<Stage3D design={design} phase="hangar" reduced />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(document.querySelector('[data-stage-fallback]')).toBeNull();
    act(() => { S.hooks.onLost('context-lost'); });
    expect(S.disposes).toBe(1); expect(getHost().status).toBe('fallback'); expect(getHost().reason).toBe('context-lost');
    expect(document.querySelector('[data-stage-fallback]')).toBeTruthy();
  });

  it('a failing chunk load falls back instead of crashing', async () => {
    configureHost({detect: () => true, loadCanvas: async () => { throw new Error('offline'); }});
    render(<Stage3D design={design} phase="hangar" reduced />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(getHost().status).toBe('fallback'); expect(getHost().reason).toBe('load-failed'); expect(document.querySelector('[data-stage-fallback]')).toBeTruthy();
  });

  it('starts the launch cinematic by itself when the phase becomes launch (once per run)', async () => {
    vi.useFakeTimers();
    const {rerender} = render(<Stage3D design={design} phase="hangar" reduced />);
    const spy = vi.spyOn(getHost().runtime, 'launchSequence');
    rerender(<Stage3D design={design} phase="launch" run={{phase: 'launch', seed: 7, minute: 0}} reduced />);
    expect(spy).toHaveBeenCalledTimes(1);
    rerender(<Stage3D design={design} phase="launch" run={{phase: 'launch', seed: 7, minute: 0}} reduced />); expect(spy).toHaveBeenCalledTimes(1);
    rerender(<Stage3D design={design} phase="launch" autoLaunch={false} run={{phase: 'launch', seed: 8, minute: 0}} reduced />); expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('runtime', () => {
  it('buffers seat requests (bounded, expiring) and camera changes until a scene consumes them', () => {
    let t = 0; const rt = createRuntime({now: () => t});
    for (let i = 0; i < 20; i++) rt.seatPart('power', 'x', null);
    expect(rt.seatQueue.length).toBeLessThanOrEqual(8);
    t += 10000; rt.seatPart('bus', 'y', null); expect(rt.seatQueue.map(s => s.kind)).toEqual(['bus']);
    rt.cameraTo('flight'); rt.user.yaw = 1; rt.cameraTo('report'); expect(rt.presetOverride.distance).toBeGreaterThan(10); expect(rt.user.yaw).toBe(0);
    rt.cameraTo(null); expect(rt.presetOverride).toBeNull();
  });
  it('launch: first launch is longer than repeats, reduced is short, skip resolves, one at a time', async () => {
    vi.useFakeTimers(); const rt = createRuntime();
    expect(LAUNCH_SECONDS.first).toBeGreaterThan(LAUNCH_SECONDS.repeat); expect(LAUNCH_SECONDS.reduced).toBeLessThan(1.5);
    const p1 = rt.launchSequence(false); expect(rt.launch.duration).toBe(LAUNCH_SECONDS.first); expect(rt.launchSequence(false)).toBe(p1);
    let p = 0; while (rt.stepLaunch(0.5) != null && p++ < 100); expect(rt.launch.active).toBe(false); await expect(p1).resolves.toEqual({skipped: false});
    const p2 = rt.launchSequence(false); expect(rt.launch.duration).toBe(LAUNCH_SECONDS.repeat); rt.launchSequence(true); await expect(p2).resolves.toEqual({skipped: true});
    rt.launchSequence(false, {reduced: true}); expect(rt.launch.duration).toBe(LAUNCH_SECONDS.reduced);
    await vi.advanceTimersByTimeAsync(1000); expect(rt.launch.active).toBe(false);   // the timer ends it even when no frames run
  });
  it('wakes the scene (frameloop demand) on every command', () => { const rt = createRuntime(), wake = vi.fn(); rt.wake = wake; rt.cameraTo('hangar'); rt.seatPart('bus', 'a'); rt.launchSequence(false); expect(wake.mock.calls.length).toBeGreaterThanOrEqual(3); rt.reset(); });
});

describe('GPU resource tracking and disposal', () => {
  it('disposeTextures disposes every texture we created, exactly once', () => {
    const a = track(new Texture()), b = track(new CanvasTexture(document.createElement('canvas'))); const spyA = vi.fn(), spyB = vi.fn();
    a.addEventListener('dispose', spyA); b.addEventListener('dispose', spyB);
    expect(ownedTextureCount()).toBe(2); disposeTextures(); disposeTextures();
    expect(spyA).toHaveBeenCalledTimes(1); expect(spyB).toHaveBeenCalledTimes(1); expect(ownedTextureCount()).toBe(0);
  });
  it('particle fields release their geometry and material', () => {
    const p = createParticles(32), g = vi.fn(), m = vi.fn(); p.points.geometry.addEventListener('dispose', g); p.points.material.addEventListener('dispose', m);
    p.emit(0, 0, 0, 1, 1, 1, 0.5); p.update(0.1); expect(p.live).toBe(1); p.update(1); expect(p.live).toBe(0); expect(p.points.visible).toBe(false);
    p.dispose(); expect(g).toHaveBeenCalledTimes(1); expect(m).toHaveBeenCalledTimes(1);
  });
  it('createHost with no loader (single-file offline build) uses the SVG scene', () => {
    const h = createHost({loadCanvas: null, detect: () => true}); const slot = document.createElement('div'); document.body.appendChild(slot); h.attach(slot);
    expect(h.status).toBe('fallback'); expect(h.reason).toBe('unavailable'); h.dispose(); slot.remove();
  });
});
