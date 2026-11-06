// SVG fallback for the stage: used when WebGL2 is unavailable, the context is lost, or the 3D chunk fails to load.
// Same selection API as the 3D stage (selected, hoverPart, onPick, onSocketHover) and the same imperative methods.
import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {missionFor} from '@data/catalog.js';
import {bodyIdFor, bodyVisualFor} from './bodyVisuals.js';
import {KINDS, SOCKETS, craftSpec, describeCraft} from './parts.js';
import {sceneModeFor} from './camera.js';
import {orbitGeometry} from './orbit.js';
import css from './stage.module.css';

const STARS = Array.from({length: 70}, (_, i) => ({x: (i * 127 + 17) % 840, y: (i * i * 37 + 11) % 500, r: i % 9 === 0 ? 1.3 : 0.65, o: 0.2 + (i % 5) * 0.12}));

function PartShape({kind, spec, bus}) {
  const p = spec.parts;
  switch (kind) {
    case 'bus': return <rect x="385" y="202" width={p.bus.size[0] * 130} height={p.bus.size[1] * 135} rx="4" fill={bus} stroke="#fff6d8" strokeOpacity=".5" />;
    case 'payload': return <g><rect x="455" y="262" width={p.payload.length * 120} height="26" rx="2" fill={p.payload.color} stroke="#cfe0f2" strokeOpacity=".5" /><circle cx={455 + p.payload.length * 120} cy="275" r={p.payload.lens * 70} fill="#0a1626" stroke="#7cdbf3" /></g>;
    case 'power': { const s = p.power.cells, w = spec.wingSpan * 70; return <g>{[-1, 1].map(d => <g key={d}>{Array.from({length: s}, (_, i) => <rect key={i} x={d < 0 ? 380 - (i + 1) * (w / s) : 460 + i * (w / s)} y="236" width={w / s - 2} height="22" fill="#193c68" stroke="#6ea0cf" />)}</g>)}</g>; }
    case 'propulsion': return <path d={`M${420 - p.propulsion.nozzle * 90} 322 L${420 - p.propulsion.bell * 120} 356 H${420 + p.propulsion.bell * 120} L${420 + p.propulsion.nozzle * 90} 322 Z`} fill={p.propulsion.color} stroke="#cfe0f2" strokeOpacity=".5" />;
    case 'comms': return <g><path d="M420 202 V172" stroke="#cbd5de" strokeWidth="3" /><ellipse cx="420" cy="166" rx={p.comms.dish * 90} ry={p.comms.dish * 22} fill="#cfd8de" stroke="#8e9fad" />{p.comms.feed && <path d="M420 166 V140" stroke="#cbd5de" strokeWidth="2" />}</g>;
    case 'storage': return <g>{Array.from({length: p.storage.boxes}, (_, i) => <rect key={i} x="352" y={266 + i * 26} width={p.storage.size[0] * 70} height="22" rx="2" fill="#35546b" stroke="#8fb0c9" strokeOpacity=".6" />)}</g>;
    case 'launch': return <g><ellipse cx="420" cy="376" rx={p.launch.ring * 110} ry="14" fill="#41505c" stroke="#9fb2c1" />{Array.from({length: p.launch.clamps}, (_, i) => <rect key={i} x={420 - p.launch.ring * 110 + i * (p.launch.ring * 220 / Math.max(1, p.launch.clamps - 1)) - 3} y="368" width="6" height="14" fill="#c9d3db" />)}</g>;
    default: return null;
  }
}

/** Hit area per part (generous, for touch). */
const HIT = {bus: [378, 198, 84, 126], payload: [450, 256, 70, 38], power: [250, 230, 140, 34], propulsion: [378, 318, 84, 44], comms: [376, 130, 88, 76], storage: [346, 262, 56, 56], launch: [345, 360, 150, 34]};

export const SceneFallback = forwardRef(function SceneFallback({design, selected, hoverPart, run, phase, reduced, onPick, onSocketHover, className}, ref) {
  const mission = missionFor(design || {}), visual = bodyVisualFor(bodyIdFor(design, mission)), spec = craftSpec(design);
  const mode = sceneModeFor(phase || (run?.phase) || 'hangar'), orbit = mode === 'orbit' || mode === 'transfer';
  const [flash, setFlash] = useState(null), [launching, setLaunching] = useState(false), timers = useRef([]);
  const launchDone = useRef(null);
  const schedule = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id; };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const endLaunch = useCallback(() => { setLaunching(false); const d = launchDone.current; launchDone.current = null; d?.({skipped: true}); }, []);
  useImperativeHandle(ref, () => ({
    seatPart(kind) { setFlash(kind); return new Promise(res => schedule(() => { setFlash(null); res(true); }, reduced ? 120 : 520)); },
    cameraTo() { /* the SVG scene has a single view */ },
    launchSequence(skip) {
      if (skip) { if (launching) endLaunch(); return Promise.resolve({skipped: true}); }
      setLaunching(true);
      return new Promise(res => { launchDone.current = res; schedule(() => { setLaunching(false); launchDone.current = null; res({skipped: false}); }, reduced ? 400 : 1800); });
    },
    setExploded() {}, resetCamera() {}
  }), [launching, reduced, endLaunch]);

  const geom = orbitGeometry(mission, design), period = geom.period;
  const pos = (run?.minute ?? 0) % period / period * Math.PI * 2;
  const cx = 420 + Math.cos(pos) * 250, cy = 250 + Math.sin(pos) * 105;
  const dim = run?.safe ? 0.45 : 1;
  const label = describeCraft(design, mission.bodyName, phase || run?.phase);

  return (
    <svg className={`${css.fallback} ${className || ''}`} viewBox="0 0 840 500" role="group" aria-label={label} data-stage-fallback="">
      <defs>
        <radialGradient id="tqBody" cx="38%" cy="34%"><stop offset="0" stopColor={visual.accent} /><stop offset=".6" stopColor={visual.color} /><stop offset="1" stopColor="#0a0f18" /></radialGradient>
        {visual.atmosphere && <radialGradient id="tqAtm"><stop offset=".82" stopColor={visual.atmosphere.color} stopOpacity="0" /><stop offset=".92" stopColor={visual.atmosphere.color} stopOpacity=".6" /><stop offset="1" stopColor={visual.atmosphere.color} stopOpacity="0" /></radialGradient>}
      </defs>
      <rect width="840" height="500" fill="#060b14" />
      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#bbd4ed" opacity={s.o} />)}
      {orbit ? (
        <g>
          {visual.atmosphere && <circle cx="420" cy="250" r="140" fill="url(#tqAtm)" />}
          <circle cx="420" cy="250" r="115" fill="url(#tqBody)" />
          <ellipse cx="420" cy="250" rx="250" ry="105" fill="none" stroke="#3c5266" />
          {run?.eclipse && <text x="640" y="470" fill="#ffbc6e" fontFamily="monospace" fontSize="12" letterSpacing="2">IN SHADOW</text>}
          {run?.contact && <path d={`M${cx} ${cy}L760 90`} stroke="#7cdbf3" strokeWidth="1.4" strokeDasharray="5 5" />}
          <g transform={`translate(${cx} ${cy}) scale(.34)`} opacity={run?.eclipse ? 0.5 : dim}><g transform="translate(-420 -250)">{KINDS.filter(k => k !== 'launch').map(k => <PartShape key={k} kind={k} spec={spec} bus={spec.busColor} />)}</g></g>
        </g>
      ) : (
        <g opacity={launching ? 0.9 : 1} className={launching && !reduced ? css.rise : undefined}>
          <circle cx="170" cy="110" r="64" fill="url(#tqBody)" opacity=".85" />
          {KINDS.map(k => {
            const on = selected === k, hot = hoverPart === k, f = flash === k, hit = HIT[k];
            return (
              <g key={k} role="button" tabIndex={0} aria-label={SOCKETS[k].label} aria-pressed={on} data-part={k}
                className={`${css.part} ${on ? css.partOn : ''} ${hot ? css.partHot : ''} ${f && !reduced ? css.partSeat : ''}`}
                onClick={() => onPick?.(k)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick?.(k); } }}
                onPointerEnter={() => onSocketHover?.(k)} onPointerLeave={() => onSocketHover?.(null)} onFocus={() => onSocketHover?.(k)} onBlur={() => onSocketHover?.(null)}>
                <rect x={hit[0]} y={hit[1]} width={hit[2]} height={hit[3]} fill="transparent" />
                <PartShape kind={k} spec={spec} bus={spec.busColor} />
              </g>);
          })}
        </g>
      )}
      <text x="24" y="476" fill="#7590a5" fontFamily="monospace" fontSize="10" letterSpacing="2">{`${(mission.bodyName || 'BODY').toUpperCase()} - SCHEMATIC VIEW`}</text>
    </svg>
  );
});
