import {motion} from 'motion/react';
import {Chip, useReducedMotion, ease} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {clean, finite, fmt} from './format.js';
import {Rise} from './Rise.jsx';
import s from './report.module.css';

/** Options of one reviewed decision, best first; unavailable options last. Pure and exported for tests. */
export function rankOptions(options) {
  const live = options.filter(o => !o.disabled).slice().sort((a, b) => finite(a.rank, 99) - finite(b.rank, 99) || finite(b.score) - finite(a.score));
  return [...live, ...options.filter(o => o.disabled)];
}

function ScoreBar({value, lo, hi, chosen, best, reduced, i}) {
  const f = hi > lo ? 0.08 + 0.92 * (value - lo) / (hi - lo) : 1;
  return (
    <span className={s.rankBar} role="presentation" data-chosen={chosen || undefined} data-best={best || undefined}>
      <motion.i style={{transformOrigin: 'left center'}} initial={reduced ? false : {scaleX: 0}} animate={{scaleX: f}} transition={reduced ? {duration: 0} : {delay: 0.2 + i * 0.06, duration: 0.42, ease: ease.enter}} />
    </span>
  );
}

/**
 * Decision review: for every crisis the engine replayed every response from the paused moment and ranked them.
 * Cards show the explanation, the chosen option against the best one, and a ranked table with an inline score bar.
 * Everything from the run (titles, option names, explanations) is rendered as text.
 */
export function DecisionReview({review}) {
  const t = useT();
  const reduced = useReducedMotion();
  if (!review.length) {
    return (
      <Rise className={s.card}>
        <h3>{t('No crisis decision this time')}</h3>
        <p className={s.muted}>{t('Margins that avoid a crisis are good decisions too. Try a leaner design to find where the reserves start to matter.')}</p>
      </Rise>
    );
  }
  return (
    <div className={s.stack}>
      {review.map((r, n) => {
        const ranked = rankOptions(Array.isArray(r.options) ? r.options : []);
        const scores = ranked.filter(o => !o.disabled).map(o => finite(o.score));
        const lo = Math.min(...scores), hi = Math.max(...scores);
        const regret = finite(r.regret);
        return (
          <Rise key={`${r.id}-${n}`} i={n}>
            <article className={s.card} aria-labelledby={`dr-${n}`} data-testid="decision-card">
              <header className={s.cardHead}>
                <h3 id={`dr-${n}`}>{clean(r.title, 80)}</h3>
                <span className={s.chips}>
                  <Chip kind={r.material ? 'warn' : 'info'} size="sm" icon={r.material ? 'warning' : 'info'}>{r.material ? t('High stakes') : t('Low stakes')}</Chip>
                  <Chip kind="mode" size="sm">T+{fmt(r.minute)} min</Chip>
                </span>
              </header>
              <p>{String(r.explanation ?? '')}</p>
              {r.material && r.chosenId !== r.bestId ? (
                <p className={s.regret}><strong>{t('Your choice')}:</strong> {clean(r.chosenName, 60)} · <strong>{t('Best tested')}:</strong> {clean(r.bestName, 60)} · {t('Gap to best')} <span className="num">{fmt(regret)}</span> {t('Mission Score points')}</p>
              ) : null}
              <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Replayed alternatives')}>
                <table className={s.table}>
                  <caption className="sr-only">{t('Responses ranked by Mission Score when replayed from the paused moment')}: {clean(r.title, 80)}</caption>
                  <thead><tr><th scope="col">{t('Rank')}</th><th scope="col">{t('Response')}</th><th scope="col">{t('Science')}</th><th scope="col">{t('Battery')}</th><th scope="col">{t('Data lost')}</th></tr></thead>
                  <tbody>
                    {ranked.map((o, i) => o.disabled ? (
                      <tr key={o.id} className={s.rowMuted}><td>–</td><th scope="row">{clean(o.name, 60)}</th><td colSpan={3} className={s.muted}>{t('Unavailable for this design')}</td></tr>
                    ) : (
                      <tr key={o.id} data-chosen={o.id === r.chosenId || undefined} data-best={o.id === r.bestId || undefined}>
                        <td className="num">#{finite(o.rank, i + 1)}</td>
                        <th scope="row">
                          <span className={s.optName}>{clean(o.name, 60)}</span>
                          <span className={s.chips}>
                            {o.id === r.chosenId ? <Chip kind="info" size="sm" icon="check">{t('Your choice')}</Chip> : null}
                            {o.id === r.bestId ? <Chip kind="pass" size="sm">{t('Best')}</Chip> : null}
                          </span>
                          <ScoreBar value={finite(o.score)} lo={lo} hi={hi} chosen={o.id === r.chosenId} best={o.id === r.bestId} reduced={reduced} i={i} />
                        </th>
                        <td className="num">{fmt(o.science)}</td><td className="num">{fmt(o.battery)}%</td><td className="num">{fmt(o.lostMB)} MB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <small className={s.muted}>{t('Isolated replay from the paused moment; later choices held equal.')}</small>
            </article>
          </Rise>
        );
      })}
    </div>
  );
}
