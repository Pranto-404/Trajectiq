import {CATALOG} from '@data/catalog.js';
import {Chip, Concept, Gauge, Icon, Panel} from '@/ds/index.js';
import {useGame, selectMargins, selectPreview, selectAnalysis} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {fmt, signed} from './hooks.js';
import s from './hangar.module.css';

const STATUS = {pass: 'nominal', warn: 'warning', fail: 'critical'};
const gaugeStatus = st => STATUS[st] || 'nominal';

/** Name of what is being previewed (a part, or a field value). */
function previewName(patch) {
  const [key, val] = Object.entries(patch)[0] || [];
  if (!key) return '';
  const part = CATALOG[key]?.find(p => p.id === val);
  return part ? part.name : `${key} ${val}`;
}

/** One-sentence consequence of the previewed change, from the store's ghost deltas. */
export function GhostSummary() {
  const t = useT();
  const ghost = useGame(selectPreview);
  if (!ghost) return <p className={s.ghostHint} role="status">{t('Hover or focus a part to see its effect before you install it.')}</p>;
  const d = ghost.deltas;
  const parts = [[t('Mass'), d.wet, 'kg', 1], [t('Cost'), d.cost, 'cr', 1], [t('Schedule'), d.months, 'mo', 1], [t('Maneuver'), d.deltaV, 'm/s', 0], [t('Power margin'), d.power, 'W', 0], [t('Contact margin'), d.data, 'MB', 0]]
    .filter(([, v, , n]) => Math.abs(v) >= (n ? 0.05 : 0.5));
  return (
    <p className={s.ghostSummary} role="status" data-testid="ghost-summary">
      <Icon name="arrow-right" size={14} />
      <span><strong>{t('Preview')}: {previewName(ghost.patch)}</strong>{' · '}{parts.length ? parts.map(([l, v, u, n]) => `${l} ${signed(v, n)} ${u}`).join(' · ') : t('no change to the margins')}</span>
      {!ghost.launchable ? <Chip kind="fail" size="sm">{t('Would block launch')}</Chip> : null}
    </p>
  );
}

function StatusRow({label, status, children}) {
  return (
    <li className={s.statusRow}>
      <span>{label}</span>
      <Chip kind={status === 'pass' ? 'pass' : status === 'warn' ? 'warn' : 'fail'} size="sm">{children}</Chip>
    </li>
  );
}

/**
 * Margin and resource gauges. Mass, cost, schedule, maneuver, eclipse, peak power, contact capacity and the
 * recorder-before-first-contact warning are all design-system Gauges; the previewed change draws a striped ghost segment.
 * Launch-orbit compatibility, pointing and the recorder interface are status rows with the engine's own explanation.
 */
export function MarginsPanel() {
  const t = useT();
  const margins = useGame(selectMargins), ghost = useGame(selectPreview), a = useGame(selectAnalysis);
  const g = ghost?.analysis || null;
  const byId = Object.fromEntries(margins.rows.map(r => [r.id, r]));
  const ghostRow = id => ghost?.margins.rows.find(r => r.id === id)?.value ?? null;
  const row = r => (
    <Gauge key={r.id} kind="margin" label={t(r.title)} value={r.value} max={r.max} unit={r.unit} digits={r.digits} limit={r.margin}
      status={gaugeStatus(r.status)} preview={ghostRow(r.id)}
      help={<>{r.critical ? <Chip kind="warn" size="sm" icon="warning">{t('Critical')}</Chip> : null}{r.learn ? <Concept id={r.learn} label={t(r.title)} /> : null}</>} />
  );
  const checks = Object.fromEntries(margins.checks.map(c => [c.id, c]));
  const peak = a.peak, avail = a.c.power.solar * 0.85;
  const fill = Number.isFinite(a.fillMinutes) ? a.fillMinutes : null, contact = a.contactStart;
  const recorderMax = Math.max(1, contact * 2);
  const recorderValue = fill == null ? recorderMax : Math.min(fill, recorderMax);
  const gFill = g ? (Number.isFinite(g.fillMinutes) ? Math.min(g.fillMinutes, Math.max(1, g.contactStart * 2)) : Math.max(1, g.contactStart * 2)) : null;
  const rec = checks.recorder, lo = checks.launchOrbit, comp = checks.compatibility, pt = checks.pointing;
  return (
    <Panel kicker={t('Mission constraints')} title={t('Margins')} badge={margins.launchable ? t('No hard failures') : t('Launch blocked')} state={margins.launchable ? 'default' : 'warning'} data-testid="margins" data-tour="margins">
      <GhostSummary />
      <div className={s.gauges}>
        {['mass', 'budget', 'schedule'].map(id => byId[id] && row(byId[id]))}
        {['deltaV', 'eclipse'].map(id => byId[id] && row(byId[id]))}
        <Gauge kind="margin" label={t('Peak power')} value={peak} max={avail} unit="W" digits={0} limit={margins.extras.power.margin} status={gaugeStatus(margins.extras.power.status)} preview={g ? g.peak : null} help={<Concept id="power" label={t('Peak power')} />} />
        <Gauge kind="margin" label={t('Contact capacity')} value={a.dataGenerated} max={a.dataDownlink} unit="MB/orbit" digits={0} limit={margins.extras.data.margin} status={gaugeStatus(margins.extras.data.status)} preview={g ? g.dataGenerated : null} help={<Concept id="datarate" label={t('Contact capacity')} />} />
        {rec ? (
          <Gauge kind="linear" label={t('Recorder fill time')} value={recorderValue} max={recorderMax} unit="min" digits={0} thresholds={[{at: contact, label: t('First contact')}]} status={gaugeStatus(rec.status)} preview={gFill}
            valueText={rec.value} statusLabel={rec.status === 'pass' ? t('OK before contact') : t('May fill before first contact')} />
        ) : null}
      </div>
      {rec && rec.status !== 'pass' ? <p className={s.warnLine} role="note"><Icon name="warning" size={14} /> {rec.why}</p> : null}
      <ul className={s.statusList}>
        {lo ? <StatusRow label={`${t('Launch · orbit')}`} status={lo.status}>{lo.status === 'pass' ? t('Compatible') : t('Blocked')}</StatusRow> : null}
        {lo && lo.status !== 'pass' ? <li className={s.statusWhy}>{lo.why}</li> : null}
        {pt ? <StatusRow label={t('Pointing')} status={pt.status}>{pt.value}</StatusRow> : null}
        {comp ? <StatusRow label={t('Recorder interface')} status={comp.status}>{comp.value}</StatusRow> : null}
      </ul>
      <p className={s.fine}>{fmt(a.wet, 1)} kg {t('wet')} · {a.months} {t('months')} · {t('orbit period')} {fmt(a.period, 1)} min</p>
    </Panel>
  );
}
