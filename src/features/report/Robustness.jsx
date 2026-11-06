import {motion} from 'motion/react';
import {UNCERTAINTY} from '@data/catalog.js';
import {useGame, selectLaunchGate} from '@/store/index.js';
import {Button, Chip, Concept, ease, useReducedMotion} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {fmt, finite} from './format.js';
import s from './report.module.css';

/** Ten completion bins (0-10 % ... 90-100 %+). Pure; exported for tests. */
export function histogram(results) {
  const bins = Array(10).fill(0);
  for (const v of results || []) bins[Math.min(9, Math.max(0, Math.floor(finite(v) / 10)))]++;
  return bins;
}

const RANGES = [['solar', 'Solar output'], ['link', 'Link rate'], ['isp', 'Engine impulse'], ['pointing', 'Pointing error']];

/**
 * The seeded uncertainty job. It runs in the store (200 samples, batched with setTimeout 0 so the page stays alive,
 * cancellable, one job at a time); this panel starts it, shows progress and renders the result with its caveats.
 */
export function Robustness() {
  const t = useT();
  const reduced = useReducedMotion();
  const robust = useGame(st => st.robust), progress = useGame(st => st.robustProgress), gate = useGame(selectLaunchGate), design = useGame(st => st.design);
  const a = useGame.getState().actions;
  const running = !!progress;
  const bins = robust?.results ? histogram(robust.results) : [];
  const top = Math.max(1, ...bins);
  return (
    <div className={s.robust} data-testid="robustness">
      <p className={s.muted}>{t('Flies the draft design {name} through {n} fixed-seed variations with a fixed conservative policy.', {name: design.name, n: UNCERTAINTY.samples})} <Concept id="robust" label={t('robustness index')} /></p>
      <ul className={s.ranges} aria-label={t('Parameter ranges')}>
        {RANGES.map(([k, label]) => <li key={k}><span>{t(label)}</span><span className="num">×{UNCERTAINTY[k][0]}–{UNCERTAINTY[k][1]}</span></li>)}
      </ul>
      <div className={s.row}>
        <Button variant="secondary" icon="orbit" loading={running} disabled={!gate.ok && !running} disabledReason={!gate.ok ? gate.reason : undefined} onClick={() => a.robust()}>{running ? t('Sampling…') : robust ? t('Run again') : t('Run the uncertainty test')}</Button>
        {running ? <Button variant="ghost" onClick={() => a['cancel-robust']()}>{t('Cancel sampling')}</Button> : null}
      </div>
      {running ? (
        <div className={s.progress} role="progressbar" aria-label={t('Uncertainty sampling progress')} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
          <motion.i style={{transformOrigin: 'left center'}} animate={{scaleX: progress.total ? progress.done / progress.total : 0}} transition={reduced ? {duration: 0} : {duration: 0.2, ease: ease.enter}} />
          <span className="num">{progress.done} / {progress.total}</span>
        </div>
      ) : null}
      {robust && !robust.blocked ? (
        <div className={s.robustResult} role="status">
          <div><span className="kicker">{t('Educational robustness index')}</span><strong className={s.big}>{fmt(robust.index, 1)}%</strong></div>
          <p className="num">{robust.passed} / {robust.samples} {t('samples met the objective')} · {t('mean completion')} {fmt(robust.meanCompletion, 1)}% · {t('seed')} {robust.seed}</p>
          <div className={s.hist} role="img" aria-label={t('Distribution of completion across samples: {counts}', {counts: bins.map((n, i) => `${i * 10}-${i * 10 + 10}%: ${n}`).join(', ')})}>
            {bins.map((n, i) => (
              <span key={i} className={s.histCol}><motion.i style={{transformOrigin: 'bottom center'}} initial={reduced ? false : {scaleY: 0}} animate={{scaleY: Math.max(0.02, n / top)}} transition={reduced ? {duration: 0} : {delay: i * 0.04, duration: 0.42, ease: ease.enter}} /><small className="num">{i * 10}</small></span>
            ))}
          </div>
          <Chip kind="warn" size="sm" icon="warning">{t('Model sensitivity, not real-world mission probability')}</Chip>
        </div>
      ) : null}
    </div>
  );
}
