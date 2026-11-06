// Development-only harness for the stage (not part of the build; open /src/features/stage/dev/harness.html with `npm run dev`).
import {useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../../styles/fonts.css';
import '../../../styles/tokens.css';
import '../../../styles/base.css';
import {presetFor, CATALOG} from '@data/catalog.js';
import {BODY_IDS, presetsForScenario, bodyForScenario, scenariosForBody} from '@engine/api.js';
import {Stage3D} from '../Stage3D.jsx';
import {configureHost, disposeHost, getHost} from '../host.js';
window.__stage = {disposeHost, getHost};

const PHASES = ['board', 'hangar', 'launch', 'transfer', 'capture', 'operations', 'report'];
const params = new URLSearchParams(location.search);
if (params.get('nowebgl')) configureHost({detect: () => false, loadCanvas: () => import('../StageCanvas.jsx')});

function designFor(body, key) {
  const sid = scenariosForBody(body)[0];
  try { return {...(presetsForScenario(sid)[key] || presetFor(body, key, sid)), destination: body, scenario: sid}; } catch { return presetFor(body, key); }
}

function App() {
  const [body, setBody] = useState(params.get('body') || 'moon'), [phase, setPhase] = useState(params.get('phase') || 'hangar'), [selected, setSel] = useState('bus'), [hover, setHover] = useState(null);
  const [minute, setMinute] = useState(30), [flags, setFlags] = useState({eclipse: false, contact: false, safe: false}), [reduced, setReduced] = useState(!!params.get('reduced')), [quality, setQuality] = useState('auto');
  const [design, setDesign] = useState(() => designFor(params.get('body') || 'moon', 'balanced')), [exploded, setExploded] = useState(false), [xray, setXray] = useState(false), [log, setLog] = useState('');
  const ref = useRef(), tray = useRef();
  const run = ['launch', 'transfer', 'capture', 'operations', 'report'].includes(phase) ? {phase: phase === 'report' ? 'debrief' : phase, minute, ...flags, mode: 'science', history: [{mode: flags.contact ? 'downlink' : 'science'}], seed: 1} : null;
  const pickBody = b => { setBody(b); setDesign(designFor(b, 'balanced')); };
  const install = (kind, id) => { setDesign(d => ({...d, [kind]: id})); const r = tray.current.getBoundingClientRect(); ref.current.seatPart(kind, id, r).then(v => setLog(`seated ${kind}/${id}: ${v}`)); };
  return (
    <div style={{display: 'grid', gridTemplateRows: 'auto 1fr', height: '100dvh', gap: 6, background: '#080d15', color: '#f1f4f8', fontSize: 12}}>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 6, padding: 6, alignItems: 'center'}}>
        <select value={body} onChange={e => pickBody(e.target.value)}>{[...BODY_IDS, 'nonsense'].map(b => <option key={b}>{b}</option>)}</select>
        {PHASES.map(p => <button key={p} aria-pressed={phase === p} style={{background: phase === p ? '#ccff6b' : '#1a2636', color: phase === p ? '#000' : '#fff'}} onClick={() => setPhase(p)}>{p}</button>)}
        <select value={selected || ''} onChange={e => setSel(e.target.value || null)}><option value="">none</option>{Object.keys(CATALOG).map(k => <option key={k}>{k}</option>)}</select>
        <label>min <input type="range" min="0" max="400" value={minute} onChange={e => setMinute(+e.target.value)} /></label>
        {['eclipse', 'contact', 'safe'].map(f => <label key={f}><input type="checkbox" checked={flags[f]} onChange={e => setFlags({...flags, [f]: e.target.checked})} />{f}</label>)}
        <label><input type="checkbox" checked={exploded} onChange={e => setExploded(e.target.checked)} />exploded</label>
        <label><input type="checkbox" checked={xray} onChange={e => setXray(e.target.checked)} />xray</label>
        <label><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)} />reduced</label>
        <select value={quality} onChange={e => setQuality(e.target.value)}>{['auto', 'low', 'medium', 'high'].map(q => <option key={q}>{q}</option>)}</select>
        <button onClick={() => ref.current.launchSequence(false)}>launch</button><button onClick={() => ref.current.launchSequence(true)}>skip</button>
        <button ref={tray} onClick={() => install('power', design.power === 'endurance' ? 'compact' : 'endurance')}>seat power</button>
        <button onClick={() => install('comms', design.comms === 'highgain' ? 'compact' : 'highgain')}>seat comms</button>
        <button onClick={() => install('payload', design.payload === 'hires' ? 'survey' : 'hires')}>seat payload</button>
        <button onClick={() => ref.current.cameraTo('report')}>cam report</button><button onClick={() => ref.current.resetCamera()}>reset cam</button>
        <span id="log">{log} sel={selected} hover={hover}</span>
      </div>
      <Stage3D ref={ref} design={design} selected={selected} hoverPart={hover} run={run} phase={phase} quality={quality} reduced={reduced} exploded={exploded} xray={xray}
        onPick={k => { setSel(k); setLog('picked ' + k); }} onSocketHover={setHover} />
    </div>
  );
}
const appRoot = createRoot(document.getElementById('root')); appRoot.render(<App />);
window.__stage.unmountApp = () => appRoot.unmount();
