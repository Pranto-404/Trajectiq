import {useState} from 'react';
import {CATALOG} from '@data/catalog.js';
import {Button, Panel, PartCard, Gauge, Chip, Segmented, Slider, Dialog, Sheet, ToastViewport, Icon, ICON_NAMES, Concept, LiveRegion, useAnnounce, MotionProvider, useGhostPreview, setConceptOpener} from '../ds/index.js';
import s from './kit.module.css';

const Section = ({id, title, children}) => <section className={s.section} aria-labelledby={`k-${id}`}><h2 id={`k-${id}`}>{title}</h2>{children}</section>;
const Cell = ({label, children}) => <div className={s.cell}><span className="kicker">{label}</span>{children}</div>;

function Gallery({coarse}) {
  const say = useAnnounce();
  const [seg, setSeg] = useState('science'), [speed, setSpeed] = useState(1), [fuel, setFuel] = useState(55), [alt, setAlt] = useState(100);
  const [dialog, setDialog] = useState(false), [alertDlg, setAlertDlg] = useState(false), [side, setSide] = useState(false), [bottom, setBottom] = useState(false);
  const [toasts, setToasts] = useState([]), [loading, setLoading] = useState(false), [hit, setHit] = useState(0);
  const [preview, setPreview] = useState(null), [installedId, setInstalled] = useState('balanced'), [lastConcept, setLastConcept] = useState('none');
  setConceptOpener(id => setLastConcept(id));
  const parts = CATALOG.power, installed = parts.find(p => p.id === installedId);
  const bind = useGhostPreview(setPreview);
  const addToast = (kind) => setToasts(t => [...t, {id: Date.now() + Math.random(), kind, text: `${kind} toast: Installed Endurance solar kit. Margins updated.`}]);
  const ghost = preview ? (parts.find(p => p.id === preview).mass - installed.mass) : null;
  return (
    <div className={s.page} data-coarse={coarse || undefined}>
      <Section id="buttons" title="Button">
        <div className={s.grid}>
          {['primary', 'secondary', 'ghost', 'danger'].map(v => (
            <Cell key={v} label={v}>
              <div className={s.stack}>
                <Button variant={v}>Rest</Button>
                <Button variant={v} icon="play">With icon</Button>
                <Button variant={v} disabled disabledReason="Fix 2 failed checks to launch">Disabled with reason</Button>
                <Button variant={v} loading>Loading</Button>
                <Button variant={v} success>Saved</Button>
                <Button variant={v} size="sm">Small</Button>
                <Button variant={v} size="lg" iconEnd="arrow-right">Large</Button>
                <Button variant={v} iconOnly icon="close" label={`Close (${v})`} />
              </div>
            </Cell>
          ))}
          <Cell label="commit (hold 700 ms, or tap twice)">
            <div className={s.stack}>
              <Button variant="commit" icon="launch" onConfirm={() => { setHit(h => h + 1); say('Launch authorized'); }}>Hold to authorize launch</Button>
              <Button variant="commit" disabled disabledReason="Every role must sign off to launch">Hold to authorize launch</Button>
              <output aria-live="polite">Confirmed {hit} times</output>
            </div>
          </Cell>
          <Cell label="interactive loading">
            <Button variant="secondary" loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1600); }}>Run uncertainty job</Button>
          </Cell>
        </div>
      </Section>

      <Section id="chips" title="Chip">
        <div className={s.stack}>
          {['pass', 'warn', 'fail', 'info', 'role', 'mode'].map(k => <Chip key={k} kind={k}>{k}</Chip>)}
          {['pass', 'warn', 'fail'].map(k => <Chip key={k + 's'} kind={k} size="sm">{k} sm</Chip>)}
          <Chip kind="role" icon="power" tone="var(--role-power)">Power and Comms</Chip>
          <Chip selectable selected={seg === 'science'} onClick={() => setSeg('science')}>Selectable</Chip>
          <Chip selectable selected={seg !== 'science'} onClick={() => setSeg('coast')}>Selectable (other)</Chip>
        </div>
      </Section>

      <Section id="panels" title="Panel">
        <div className={s.grid}>
          {['default', 'selected', 'locked', 'warning', 'incident'].map(st => <Panel key={st} kicker={st} title={`Panel ${st}`} badge={st === 'warning' ? 'Attention' : 'Engine'} state={st}><p>Body text on a {st} panel.</p></Panel>)}
          <Panel kicker="mobile" title="Collapsible panel" collapsible><p>Collapsed on small screens by the feature that uses it.</p></Panel>
        </div>
      </Section>

      <Section id="partcard" title="PartCard (hover or focus a card to preview on the gauge)">
        <div className={s.grid}>
          <div className={s.stack1}>
            {parts.map(p => <PartCard key={p.id} part={p} installed={installed} kind="power" draggable onInstall={pt => { setInstalled(pt.id); say(`Installed ${pt.name}.`); }} onPreview={setPreview} />)}
            <PartCard part={parts[0]} installed={installed} state="locked" disabledReason="Hardware is locked after launch" />
          </div>
          <Gauge kind="margin" label="Mass used" value={164 + (installed.mass - 15)} max={220} unit="kg" preview={ghost == null ? null : 164 + (installed.mass - 15) + ghost} help={<Concept id="mass" label="mass" />} />
        </div>
        <p className={s.note}>Ghost preview hook: <code>useGhostPreview(onPreview)</code> returned <code>{typeof bind('x').onFocus}</code>. Last concept opened: {lastConcept}.</p>
      </Section>

      <Section id="gauge" title="Gauge (linear, arc, segments, margin, with ghost, thresholds and every status)">
        <div className={s.grid}>
          {['nominal', 'warning', 'critical', 'locked'].map(st => (
            <Cell key={st} label={st}>
              <div className={s.stack1}>
                <Gauge kind="linear" label="Science" value={st === 'nominal' ? 62 : st === 'warning' ? 78 : 91} max={100} unit="%" status={st} />
                <Gauge kind="arc" label="Battery" value={st === 'nominal' ? 78 : st === 'warning' ? 28 : 12} max={100} unit="%" status={st} thresholds={[{at: 15, label: 'Safe mode 15%'}, {at: 30, label: 'Low 30%'}]} />
                <Gauge kind="segments" label="Recorder" value={st === 'nominal' ? 30 : 80} max={100} unit="%" status={st} thresholds={[{at: 75, label: 'Warning 75%'}]} />
                <Gauge kind="margin" label="Mass used" value={st === 'critical' ? 230 : 164} max={220} unit="kg" status={st} />
              </div>
            </Cell>
          ))}
          <Cell label="ghost segments (increase and decrease)">
            <div className={s.stack1}>
              <Gauge kind="linear" label="Cost used" value={90} max={150} unit="cr" preview={118} />
              <Gauge kind="linear" label="Cost used" value={90} max={150} unit="cr" preview={62} />
              <Gauge kind="arc" label="Battery" value={60} max={100} unit="%" preview={80} />
              <Gauge kind="segments" label="Propellant" value={60} max={100} unit="%" preview={30} />
              <Slider label="Drives the first gauge" min={0} max={150} value={fuel * 2} onChange={v => setFuel(v / 2)} showField={false} />
              <Gauge kind="linear" label="Live value" value={fuel * 2} max={150} unit="kg" digits={1} />
            </div>
          </Cell>
        </div>
      </Section>

      <Section id="segmented" title="Segmented">
        <div className={s.stack}>
          <Segmented label="Operations" value={seg} onChange={setSeg} options={[{value: 'science', label: 'Map in sunlight', icon: 'power'}, {value: 'aggressive', label: 'Through shadow', icon: 'eclipse'}, {value: 'coast', label: 'Conserve', icon: 'battery'}, {value: 'downlink', label: 'Return', icon: 'signal', disabled: true}]} />
          <Segmented label="Speed" value={speed} onChange={setSpeed} size="sm" options={[1, 3, 10].map(n => ({value: n, label: `${n}×`}))} />
          <Segmented label="Mode" value="crew" onChange={() => {}} fullWidth options={[{value: 'solo', label: 'Solo'}, {value: 'crew', label: 'Crew'}, {value: 'sandbox', label: 'Sandbox'}]} />
        </div>
      </Section>

      <Section id="slider" title="Slider">
        <div className={s.grid}>
          <Slider label="Propellant" unit="kg" min={0} max={160} value={fuel} onChange={setFuel} markers={[{at: 40, label: 'Reserve'}]} help={<Concept id="deltav" label="delta-v" />} />
          <Slider label="Orbit altitude" unit="km" min={50} max={300} step={10} value={alt} onChange={setAlt} />
          <Slider label="Locked" unit="kg" min={0} max={160} value={55} onChange={() => {}} disabled disabledReason="Hardware is locked after launch" />
        </div>
      </Section>

      <Section id="overlays" title="Dialog, Sheet, Toast, LiveRegion">
        <div className={s.stack}>
          <Button onClick={() => setDialog(true)}>Open dialog</Button>
          <Button variant="danger" onClick={() => setAlertDlg(true)}>Open alert dialog</Button>
          <Button onClick={() => setSide(true)}>Open side sheet</Button>
          <Button onClick={() => setBottom(true)}>Open bottom sheet (drag to dismiss)</Button>
          {['info', 'success', 'warn', 'error'].map(k => <Button key={k} variant="ghost" onClick={() => addToast(k)}>Toast {k}</Button>)}
          <Button variant="ghost" onClick={() => say('Battery critical: 12 percent.', {assertive: true})}>Announce (assertive)</Button>
          <Button variant="ghost" onClick={() => say('Installed Endurance solar kit. Mass 164 of 220 kilograms, 56 kilograms margin.')}>Announce (polite)</Button>
        </div>
        <Dialog open={dialog} onClose={() => setDialog(false)} title="Commit your design?" description="Hardware is locked after launch." footer={<><Button variant="ghost" onClick={() => setDialog(false)}>Back to hangar</Button><Button variant="primary" data-autofocus onClick={() => setDialog(false)}>Continue</Button></>}><p>Focus is trapped, Escape closes, the page behind is inert and focus returns to the button that opened this.</p></Dialog>
        <Dialog open={alertDlg} onClose={() => setAlertDlg(false)} title="Discard the active flight?" size="sm" alert footer={<><Button variant="primary" data-autofocus onClick={() => setAlertDlg(false)}>Keep flight</Button><Button variant="danger" onClick={() => setAlertDlg(false)}>Discard and continue</Button></>}><p>This permanently removes the unfinished run.</p></Dialog>
        <Sheet open={side} onClose={() => setSide(false)} title="Side sheet" placement="side"><p>A 420 px drawer on desktop.</p><Slider label="Inside the sheet" min={0} max={10} value={4} onChange={() => {}} /></Sheet>
        <Sheet open={bottom} onClose={() => setBottom(false)} title="Bottom sheet" placement="bottom"><p>Drag the handle down to dismiss. Keyboard: Escape.</p></Sheet>
        <ToastViewport toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))} />
        <LiveRegion />
      </Section>

      <Section id="icons" title={`Icon (${ICON_NAMES.length})`}>
        <ul className={s.icons}>{ICON_NAMES.map(n => <li key={n}><Icon name={n} size={24} /><span>{n}</span></li>)}</ul>
      </Section>
    </div>
  );
}

/** The gallery with global switches: reduced motion, width (phone 375 / desktop) and a coarse-pointer simulation. */
export function KitApp() {
  const [reduced, setReduced] = useState(false), [width, setWidth] = useState('desktop'), [coarse, setCoarse] = useState(false);
  return (
    <MotionProvider reduced={reduced}>
      <div className={s.bar} role="toolbar" aria-label="Kit controls">
        <strong>TRAJECTIQ design kit</strong>
        <Segmented label="Width" value={width} onChange={setWidth} size="sm" options={[{value: 'phone', label: 'Phone 375'}, {value: 'desktop', label: 'Desktop'}]} />
        <Button size="sm" variant="secondary" aria-pressed={reduced} onClick={() => setReduced(r => !r)}>Reduced motion: {reduced ? 'on' : 'off'}</Button>
        <Button size="sm" variant="secondary" aria-pressed={coarse} onClick={() => { setCoarse(c => { document.documentElement.style.setProperty('--target-min', !c ? '44px' : '32px'); return !c; }); }}>Coarse pointer (44 px): {coarse ? 'on' : 'off'}</Button>
      </div>
      <div className={s.frame} style={{maxWidth: width === 'phone' ? 375 : 1280}} data-width={width}><Gallery coarse={coarse} /></div>
    </MotionProvider>
  );
}
