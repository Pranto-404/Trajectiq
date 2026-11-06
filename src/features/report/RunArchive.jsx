import {missionFor} from '@data/catalog.js';
import {analyze} from '@/store/index.js';
import {Button, Chip} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {clean, finite, fmt} from './format.js';
import s from './report.module.css';

/** Names of the three parts a run is best recognised by, resilient to damaged saved designs. */
function parts(run) {
  try { const c = analyze(run.design).c; return {payload: c.payload.name, power: c.power.name, comms: c.comms.name}; } catch { return {payload: '–', power: '–', comms: '–'}; }
}

/** The mission archive as a table: newest first, with a Review button per run. Text from runs renders as text. */
export function RunArchive({runs, onReview, activeId, emptyText}) {
  const t = useT();
  const rows = runs.slice().reverse();
  return (
    <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Mission archive')}>
      <table className={s.table}>
        <thead><tr><th scope="col">{t('Run')}</th><th scope="col">{t('Payload')}</th><th scope="col">{t('Power / comms')}</th><th scope="col">{t('Cost')}</th><th scope="col">{t('Science')}</th><th scope="col">{t('Outcome')}</th><th scope="col"><span className="sr-only">{t('Actions')}</span></th></tr></thead>
        <tbody>
          {rows.length ? rows.map(r => {
            const p = parts(r), target = Math.max(1, finite(missionFor(r.design).scienceTarget, 1));
            return (
              <tr key={r.id} data-active={r.id === activeId || undefined}>
                <th scope="row" className="mono">{clean(r.label, 12)}</th>
                <td>{p.payload}</td><td>{p.power}<br />{p.comms}</td>
                <td className="num">{fmt(r.outcome?.cost)} cr</td>
                <td className="num">{fmt(r.outcome?.science, 1)} {t('units')}<br />{fmt(finite(r.outcome?.science) / target * 100, 1)}%</td>
                <td><Chip kind={r.outcome?.achieved ? 'pass' : 'warn'} size="sm">{r.outcome?.achieved ? t('Achieved') : t('Incomplete')}</Chip></td>
                <td><Button size="sm" variant="ghost" aria-label={`${t('Review')} ${clean(r.label, 12)}`} onClick={() => onReview?.(r)}>{t('Review')}</Button></td>
              </tr>
            );
          }) : <tr><td colSpan={7} className={s.muted}>{emptyText || t('Your completed missions will appear here.')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
