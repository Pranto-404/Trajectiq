// The lazy chunk: three.js + react-three-fiber. mountStage() creates the single persistent canvas inside `el`.
// Dispose releases the renderer (r3f forces context loss and disposes the scene graph) and every texture we created.
import {Component, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas, useFrame} from '@react-three/fiber';
import {Scene, createAnim} from './Scene.jsx';
import {createCraftApi} from './Craft.jsx';
import {disposeTextures} from './textures.js';
import {TIER_SETTINGS, TIERS, createFpsSampler, dprRange, isPhoneLike, pickInitialTier, resolveTier, tierAfterSample} from './quality.js';
import {CAMERA_PRESETS} from './camera.js';

const LABEL = '3D spacecraft view. Drag to rotate, arrow keys rotate, plus and minus zoom, R resets.';
const RESTORE_WAIT_MS = 1500;

class Boundary extends Component {
  state = {failed: false};
  static getDerivedStateFromError() { return {failed: true}; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function environment() {
  const w = globalThis.innerWidth || 1280, h = globalThis.innerHeight || 800;
  const phone = isPhoneLike({coarse: !!globalThis.matchMedia?.('(pointer: coarse)')?.matches, width: w, height: h});
  return {phone, dpr: globalThis.devicePixelRatio || 1, initial: pickInitialTier({hardwareConcurrency: globalThis.navigator?.hardwareConcurrency, deviceMemory: globalThis.navigator?.deviceMemory, phone})};
}

function Probe({enabled, tier, onTier, onReady}) {
  const sampler = useRef(createFpsSampler()), ready = useRef(false);
  useFrame((_, dt) => {
    if (!ready.current) { ready.current = true; onReady(); }
    if (!enabled || sampler.current.done) return;
    const next = tierAfterSample(tier, sampler.current.tick(dt * 1000));
    if (next) onTier(next);
  });
  return null;
}

function StageRoot({ctx, hooks}) {
  const props = useSyncExternalStore(ctx.store.subscribe, ctx.store.get, ctx.store.get);
  const env = useMemo(environment, []);
  const [auto, setAuto] = useState(env.initial), [hidden, setHidden] = useState(() => !!globalThis.document?.hidden);
  useEffect(() => { const f = () => setHidden(!!document.hidden); document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f); }, []);
  const tier = resolveTier(props.quality, auto), settings = TIER_SETTINGS[tier];
  const reduced = !!props.reduced;
  const frameloop = props.parked || hidden ? 'never' : reduced ? 'demand' : 'always';
  const dpr = dprRange(tier, {phone: env.phone, devicePixelRatio: env.dpr});
  const cam = CAMERA_PRESETS.hangar;
  useEffect(() => { if (!hidden && !props.parked) ctx.runtime.poke(); }, [hidden, props.parked, ctx]);
  const antialias = useMemo(() => settings.antialias, []); // fixed at context creation
  const onCreated = ({gl}) => {
    const el = gl.domElement; let timer = 0;
    el.tabIndex = 0; el.setAttribute('role', 'img'); el.setAttribute('aria-label', LABEL); el.style.touchAction = 'pan-y';
    el.addEventListener('webglcontextlost', e => { e.preventDefault(); clearTimeout(timer); timer = setTimeout(() => hooks.onLost?.('context-lost'), RESTORE_WAIT_MS); });
    el.addEventListener('webglcontextrestored', () => { clearTimeout(timer); ctx.runtime.poke(); });
  };
  return (
    <Boundary onError={hooks.onError}>
      <Canvas frameloop={frameloop} dpr={dpr} gl={{antialias, alpha: false, powerPreference: 'high-performance', stencil: false}}
        camera={{fov: cam.fov, near: 0.1, far: 220, position: [3.6, 1.9, 6.2]}} onCreated={onCreated} style={{width: '100%', height: '100%', display: 'block'}}>
        <Probe enabled={TIERS.includes(props.quality) ? false : !reduced} tier={tier} onTier={setAuto} onReady={() => hooks.onReady?.()} />
        <Scene props={props} ctx={ctx} tier={tier} />
      </Canvas>
    </Boundary>
  );
}

/** Mount the scene into `el`. Returns {dispose}. */
export async function mountStage(el, {store, runtime, onReady, onLost, onError}) {
  const ctx = {store, runtime, p: {current: store.get()}, reduced: {current: false}, A: createAnim(), craftApi: createCraftApi(), refs: {}, orbit: null};
  const root = createRoot(el);
  root.render(<StageRoot ctx={ctx} hooks={{onReady, onLost, onError}} />);
  return {
    dispose() { runtime.wake = null; root.unmount(); disposeTextures(); }
  };
}
