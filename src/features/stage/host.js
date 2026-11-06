// The persistent stage host. ONE WebGL context for the whole app: a detached DOM element holds the canvas and a separate
// React root renders the react-three-fiber scene into it. <Stage3D> slots (one per screen) only move that element
// into their own box, so changing screens never unmounts the scene; the camera glides instead.
// With no slot mounted the element is parked off screen and the scene pauses. dispose() releases every GPU resource.
import {createRuntime} from './runtime.js';
import {createPropsStore} from './stageStore.js';
import {detectWebGL2} from './webgl.js';

/**
 * @param {object} o
 * @param {() => Promise<{mountStage: Function}>} [o.loadCanvas] lazy loader of the three.js side (null: SVG only)
 * @param {() => boolean} [o.detect] WebGL2 probe
 * @param {Document} [o.doc]
 */
export function createHost({loadCanvas, detect = () => detectWebGL2(), doc = globalThis.document} = {}) {
  const runtime = createRuntime(), store = createPropsStore({});
  const subs = new Set();
  let status = 'idle', reason = '', slot = null, scene = null, disposed = false, parkTimer = 0, generation = 0;
  const el = doc.createElement('div');
  el.setAttribute('data-stage-host', '');
  el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  let parking = null;
  const park = () => {
    if (!parking) { parking = doc.createElement('div'); parking.setAttribute('aria-hidden', 'true'); parking.style.cssText = 'position:fixed;left:-10000px;top:0;width:320px;height:240px;visibility:hidden;pointer-events:none;overflow:hidden;'; }
    if (!parking.isConnected) doc.body.appendChild(parking);
    parking.appendChild(el);
  };

  const setStatus = (s, r = '') => { if (status === s && reason === r) return; status = s; reason = r; for (const f of subs) f(); };

  async function start() {
    if (status !== 'idle' || disposed) return;
    if (!loadCanvas) { setStatus('fallback', 'unavailable'); return; }
    if (!detect()) { setStatus('fallback', 'no-webgl2'); return; }
    const my = ++generation;
    setStatus('loading');
    try {
      const mod = await loadCanvas();
      if (my !== generation || disposed) return;
      scene = await mod.mountStage(el, {
        store, runtime,
        onReady: () => { if (my === generation) setStatus('ready'); },
        onLost: why => { if (my === generation) { teardown(); setStatus('fallback', why || 'context-lost'); } },
        onError: () => { if (my === generation) { teardown(); setStatus('fallback', 'error'); } }
      });
      if (my !== generation || disposed) { scene?.dispose?.(); scene = null; return; }
      if (status === 'loading') setStatus('ready');
    } catch {
      if (my === generation) { teardown(); setStatus('fallback', 'load-failed'); }
    }
  }
  function teardown() { generation++; try { scene?.dispose?.(); } catch { /* ignore */ } scene = null; }

  const host = {
    el, runtime, store,
    get status() { return status; }, get reason() { return reason; }, get slot() { return slot; },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    getStatus: () => status,
    /** A <Stage3D> slot mounted: move the canvas element into it. */
    attach(slotEl) {
      if (disposed) return;
      clearTimeout(parkTimer);
      slot = slotEl; slotEl.appendChild(el);
      store.set({...store.get(), parked: false});
      runtime.poke();
      start();
    },
    /** A slot unmounted. If no other slot claims the canvas shortly, park it (the scene pauses, nothing is disposed). */
    detach(slotEl) {
      if (slot !== slotEl) return;
      slot = null;
      clearTimeout(parkTimer);
      parkTimer = setTimeout(() => { if (!slot && !disposed) { park(); store.set({...store.get(), parked: true}); } }, 0);
    },
    update(props) {
      const cur = store.get(), next = {...cur, ...props, parked: slot ? false : cur.parked};
      // identical props (same design/run objects and callbacks) must not re-render the scene
      if (Object.keys(next).length === Object.keys(cur).length && Object.keys(next).every(k => Object.is(next[k], cur[k]))) return;
      store.set(next); runtime.poke();
    },
    /** Try WebGL again after a fallback (e.g. a lost context). */
    retry() { if (status === 'fallback' && !disposed) { status = 'idle'; start(); } },
    /** Release the scene and every GPU resource. The host can be used again by calling attach(). */
    dispose() {
      clearTimeout(parkTimer); teardown(); runtime.reset(); store.clear();
      el.remove(); parking?.remove(); slot = null; setStatus('idle');
    }
  };
  return host;
}

let singleton = null, defaults = {}, explicit = false;
/** The app's default loader (set once when Stage3D is imported). An explicit configureHost() call always wins. */
export function setHostDefaults(opts) { if (!explicit) defaults = opts || {}; }
/** Set how the singleton is built (lazy loader, WebGL probe). Tests use this. */
export function configureHost(opts) { singleton?.dispose(); singleton = null; defaults = opts || {}; explicit = true; }
/** The app-wide host (created on first use). */
export function getHost() {
  if (!singleton) singleton = createHost(defaults);
  return singleton;
}
export function disposeHost() { singleton?.dispose(); singleton = null; }
