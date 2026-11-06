import {useMemo} from 'react';
import {Button, Chip, Icon, Panel} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {orbitBands, nextOrbitEvent} from './flightModel.js';
import s from './flight.module.css';

const W = 1000, H = 100;
const BAND_CLASS = {sun: s.bandSun, contact: s.bandContact, eclipse: s.bandEclipse};

/**
 * Orbit timeline over the whole campaign (scaled by the mission's own duration, up to 720 min): sunlight, ground contact and
 * shadow bands, the battery curve from run.history, event markers, the playhead and a scrubber over the history.
 * The past is read-only: scrubbing never changes the run.
 */
export function OrbitTimeline({run, analysis: a, minute, scrub, setScrub, crisis, crisisRef}) {
  const t = useT();
  const duration = a.m.duration;
  const history = run.history;
  const last = history.length - 1;
  const bands = useMemo(() => orbitBands(a, duration), [a, duration]);
  const x = m => Math.max(0, Math.min(W, m / duration * W));
  const curve = useMemo(() => {
    const pts = [[0, a.c.power.battery ? 100 : 0], ...history.map(h => [h.minute, h.battery])];
    return pts.map(([m, b]) => `${x(m).toFixed(1)},${(H - 6 - Math.max(0, Math.min(100, b)) * 0.88).toFixed(1)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, duration]);
  const entry = scrub != null ? history[Math.min(scrub, last)] : null;
  const shownMinute = entry ? entry.minute : minute;
  const next = nextOrbitEvent(a, run.minute);
  const marks = run.logs.filter(l => l.type === 'warning' || l.type === 'decision');
  const seekTo = m => { if (last < 0) return; const i = history.findIndex(h => h.minute >= m - 1e-9); setScrub(i < 0 || i >= last ? null : i); };
  const live = entry == null;
  const valueText = entry ? t('T+{m} min, battery {b} percent, mode {mode}', {m: entry.minute.toFixed(1), b: Math.round(entry.battery), mode: entry.mode}) : t('Live');
  const inOps = run.phase === 'operations';
  const safeY = H - 6 - 15 * 0.88;
  return (
    <Panel kicker={t('Orbit timeline')} title={t('Campaign')} className={s.fill}
      badge={!live ? <Chip kind="warn" icon="lock" size="sm">{t('Past view · read-only')}</Chip> : null}>
      <div className={s.tlHead}>
        <span><strong>{inOps ? t('{label} in {n} min', {label: t(next.label), n: next.in.toFixed(1)}) : t('Campaign clock starts after capture at {body}', {body: a.m.bodyName || ''})}</strong></span>
        <span>{run.science.toFixed(1)} {t('returned')} / {Math.round(a.m.scienceTarget * a.m.scienceSuccess / 100)} {t('to succeed')} · {Math.max(0, duration - run.minute).toFixed(0)} min {t('remaining')}</span>
      </div>
      <div className={s.tlWrap}>
        <svg className={s.tlSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={t('Orbit schedule with sunlight, ground contact and shadow bands and the battery history')}>
          <defs>
            <pattern id="fl-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#b5a8ff" strokeOpacity=".35" strokeWidth="2" /></pattern>
            <pattern id="fl-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#7cdbf3" fillOpacity=".55" /></pattern>
          </defs>
          {bands.map((b, i) => <rect key={i} className={BAND_CLASS[b.kind]} x={x(b.from)} y="0" width={Math.max(0.5, x(b.to) - x(b.from))} height={H} />)}
          {bands.filter(b => b.kind === 'eclipse').map((b, i) => <rect key={`e${i}`} x={x(b.from)} y="0" width={Math.max(0.5, x(b.to) - x(b.from))} height={H} fill="url(#fl-hatch)" />)}
          {bands.filter(b => b.kind === 'contact').map((b, i) => <rect key={`c${i}`} x={x(b.from)} y="0" width={Math.max(0.5, x(b.to) - x(b.from))} height={H} fill="url(#fl-dots)" />)}
          <line className={s.safeLine} x1="0" x2={W} y1={safeY} y2={safeY} />
          {curve.length > 1 ? <><polygon className={s.battFill} points={`0,${H} ${curve.join(' ')} ${curve.at(-1).split(',')[0]},${H}`} /><polyline className={s.battLine} points={curve.join(' ')} /></> : null}
          <line className={s.playhead} y1="0" y2={H} x1={x(shownMinute)} x2={x(shownMinute)} />
        </svg>
        <div className={s.marks}>
          {marks.map((l, i) => (
            <button key={i} type="button" className={s.mark} data-kind={l.type} style={{left: `${x(l.minute) / W * 100}%`}} aria-label={`T+${l.minute.toFixed(1)}: ${l.title}`} title={`T+${l.minute.toFixed(1)}: ${l.title}`} onClick={() => seekTo(l.minute)}>
              <Icon name={l.type === 'decision' ? 'check' : 'warning'} size={14} />
            </button>
          ))}
          {crisis ? <span ref={crisisRef} className={s.mark} data-kind="crisis" style={{left: `${x(run.minute) / W * 100}%`, pointerEvents: 'none'}} aria-hidden="true"><Icon name="warning" size={16} /></span> : null}
        </div>
      </div>
      <input type="range" className={s.scrub} min={0} max={Math.max(0, last)} step={1} value={entry ? Math.min(scrub, last) : Math.max(0, last)} disabled={last < 1}
        aria-label={t('Review mission history')} aria-valuetext={valueText} onChange={e => { const v = Number(e.target.value); setScrub(v >= last ? null : v); }} />
      {entry ? (
        <div className={s.pastRow} role="status">
          <span>T+<strong>{entry.minute.toFixed(1)}</strong></span><span>{t('Battery')} <strong>{Math.round(entry.battery)}%</strong></span>
          <span>{t('Recorder')} <strong>{Math.round(entry.backlog)} MB</strong></span><span>{t('Science')} <strong>{Math.round(entry.science)}</strong></span>
          <span><strong>{entry.mode}</strong>{entry.eclipse ? ` · ${t('shadow')}` : entry.contact ? ` · ${t('contact')}` : ''}</span>
          <Button size="sm" variant="primary" icon="play" onClick={() => setScrub(null)}>{t('Return to live')}</Button>
        </div>
      ) : (
        <div className={s.legend} aria-label={t('Legend')}>
          <Chip kind="info" icon="power" size="sm">{t('Sunlight')}</Chip><Chip kind="info" icon="signal" size="sm">{t('Contact')}</Chip><Chip kind="info" icon="eclipse" size="sm">{t('Shadow')}</Chip>
          <span className={s.hint}>{t('Repeating teaching schedule. Contact and shadow durations are assumptions.')}</span>
        </div>
      )}
    </Panel>
  );
}
