// <Stage3D design selected hoverPart run phase quality reduced onPick onSocketHover />
// A slot that shows the single persistent 3D canvas (see host.js). Render it in any screen; the scene is created once,
// lazily, and survives screen changes. Imperative ref: {seatPart(kind,id,fromRect), cameraTo(preset), launchSequence(skip)}
// plus setExploded(bool), setXray(bool) and resetCamera(). Falls back to an SVG scene with the same API.
import {forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useSyncExternalStore} from 'react';
import {STANDALONE} from '../../env.js';
import {useReducedMotion} from '../../ds/index.js';
import {configureHost, getHost} from './host.js';
import {SceneFallback} from './SceneFallback.jsx';
import {missionFor} from '@data/catalog.js';
import {describeCraft} from './parts.js';
import css from './stage.module.css';

// The single-file offline build has no code splitting: it keeps the SVG scene and leaves three.js out of the file.
const loadCanvas = STANDALONE ? null : () => import('./StageCanvas.jsx');
let configured = false;
function host() { if (!configured) { configured = true; configureHost({loadCanvas}); } return getHost(); }

export const Stage3D = forwardRef(function Stage3D(props, ref) {
  const {design, selected, hoverPart, run, phase, quality, reduced, onPick, onSocketHover, exploded, xray, autoLaunch = true, className, style, label} = props;
  const systemReduced = useReducedMotion();
  const isReduced = reduced ?? systemReduced;
  const h = host(), slotRef = useRef(null), fbRef = useRef(null);
  const status = useSyncExternalStore(h.subscribe, h.getStatus, h.getStatus);
  const fallback = status === 'fallback';

  useLayoutEffect(() => { const el = slotRef.current; h.attach(el); return () => h.detach(el); }, [h]);
  // The latest props (including callbacks) flow into the persistent scene on every render.
  useLayoutEffect(() => {
    h.update({design, selected, hoverPart, run, phase, quality, reduced: isReduced, onPick, onSocketHover, exploded, xray});
  });
  useEffect(() => { if (exploded != null) h.runtime.exploded = !!exploded; if (xray != null) h.runtime.xray = !!xray; h.runtime.poke(); }, [h, exploded, xray]);

  // Launch cinematic starts by itself when the mission enters the launch phase (once per run), unless autoLaunch is off.
  const launched = useRef(null);
  const api = useCallback(() => (h.status === 'fallback' ? fbRef.current : null), [h]);
  useEffect(() => {
    const p = phase || run?.phase;
    if (!autoLaunch || p !== 'launch') { if (p !== 'launch') launched.current = null; return; }
    const key = run?.seed ?? run?.id ?? 'run';
    if (launched.current === key) return;
    launched.current = key;
    (api() || h.runtime).launchSequence(false, {reduced: isReduced});
  }, [phase, run?.phase, run?.seed, run?.id, autoLaunch, isReduced, h, api]);

  useImperativeHandle(ref, () => ({
    seatPart: (kind, id, fromRect) => (api() ? api().seatPart(kind, id, fromRect) : h.runtime.seatPart(kind, id, fromRect)),
    cameraTo: preset => (api() ? api().cameraTo(preset) : h.runtime.cameraTo(preset)),
    launchSequence: skip => (api() ? api().launchSequence(skip) : h.runtime.launchSequence(!!skip, {reduced: isReduced})),
    setExploded: v => { h.runtime.exploded = !!v; h.runtime.poke(); },
    setXray: v => { h.runtime.xray = !!v; h.runtime.poke(); },
    resetCamera: () => h.runtime.resetCamera(),
    get status() { return h.status; }, retry: () => h.retry()
  }), [h, api, isReduced]);

  const mission = missionFor(design || {});
  const text = describeCraft(design, mission.bodyName, phase || run?.phase);
  return (
    <div ref={slotRef} className={`${css.slot} ${className || ''}`} style={style} data-stage-slot="" data-status={status}>
      {fallback && <SceneFallback ref={fbRef} design={design} selected={selected} hoverPart={hoverPart} run={run} phase={phase} reduced={isReduced} onPick={onPick} onSocketHover={onSocketHover} />}
      <span className={css.sr} aria-live="off">{label || text}</span>
    </div>
  );
});
