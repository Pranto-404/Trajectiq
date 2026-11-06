import {useState} from 'react';
import {useGame, selectReportRun, analyze} from '@/store/index.js';
import {Button, Segmented} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {RunArchive} from '../report/RunArchive.jsx';
import {finite, fmt} from '../report/format.js';
import s from './sheets.module.css';

/** Battery state of charge over the campaign, with the 15 % safe-mode line. Pure geometry; exported for tests. */
export function batteryPoints(history, duration) {
  return (Array.isArray(history) ? history : []).map(h => `${(5 + finite(h.minute) / Math.max(1, duration) * 590).toFixed(1)},${(85 - Math.min(100, Math.max(0, finite(h.battery))) * 0.75).toFixed(1)}`).join(' ');
}

function BatteryHistory() {
  const t = useT();
  const run = useGame(st => (st.run || selectReportRun(st)));
  const history = run?.history || [];
  if (!run) return <p className={s.muted}>{t('Battery history appears once a mission is under way.')}</p>;
  const duration = analyze(run.design).m.duration;
  const min = history.length ? Math.min(...history.map(h => finite(h.battery))) : null;
  return (
    <div className={s.stackSm}>
      <svg viewBox="0 0 600 90" className={s.spark} role="img" aria-label={history.length ? t('Battery state of charge over the mission; lowest {n} percent', {n: fmt(min)}) : t('Battery history will appear as the mission advances')}>
        <path d="M0 10H600M0 48H600M0 85H600" className={s.sparkGrid} />
        <line x1="0" y1="73.75" x2="600" y2="73.75" className={s.sparkLimit} />
        {history.length ? <polyline fill="none" className={s.sparkLine} points={batteryPoints(history, duration)} /> : <text x="300" y="48" textAnchor="middle" className={s.sparkText}>{t('Telemetry begins during operations')}</text>}
        <text x="580" y="69" textAnchor="end" className={s.sparkText}>15%</text>
      </svg>
      <p className={s.muted}>{t('The dashed line is the 15% safe-mode threshold. Below it, science and transmission stop until the battery recovers above 40%.')}</p>
    </div>
  );
}

/** Run history (load or clear saved runs) and, from the flight screen, the battery history. */
export function HistorySheet({kind, close}) {
  const t = useT();
  const [view, setView] = useState(kind === 'battery' ? 'battery' : 'runs');
  const runs = useGame(st => st.runs), act = useGame.getState().actions;
  return (
    <div className={s.sheet}>
      <Segmented label={t('History view')} value={view} onChange={setView} options={[{value: 'runs', label: t('Saved runs')}, {value: 'battery', label: t('Battery history')}]} />
      {view === 'battery' ? <BatteryHistory /> : (
        <>
          <p className={s.muted}>{t('Completed missions are saved in this browser only (the latest 20). Review one to reopen its report.')}</p>
          <RunArchive runs={runs} onReview={r => { act.loadRun(r.id); if (useGame.getState().sheet?.id === 'history') close?.(); }} />
          <div className={s.row}><Button variant="danger" size="sm" disabled={!runs.length} disabledReason={t('No saved runs')} onClick={() => act['clear-history']()}>{t('Clear run history')}</Button></div>
        </>
      )}
    </div>
  );
}
