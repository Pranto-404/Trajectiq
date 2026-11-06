import {Chip} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {clean, finite} from './format.js';
import s from './report.module.css';

/** Top ten of the local leaderboard (at most 30 are stored). Every field comes from storage and renders as text. */
export function Leaderboard({board, currentId}) {
  const t = useT();
  const rows = board.slice().sort((a, b) => finite(b.score) - finite(a.score)).slice(0, 10);
  return (
    <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Leaderboard')}>
      <table className={s.table}>
        <caption className="sr-only">{t('Local leaderboard, this browser only, self-reported')}</caption>
        <thead><tr><th scope="col">#</th><th scope="col">{t('Team')}</th><th scope="col">{t('Scenario')}</th><th scope="col">{t('Mode')}</th><th scope="col">{t('Score')}</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((r, i) => (
            <tr key={String(r.id)} data-active={r.id === currentId || undefined}>
              <td className="num">{i + 1}</td>
              <th scope="row">{clean(r.team, 40)}<br /><small className={s.muted}>{clean(r.label, 12)}</small></th>
              <td>{clean(r.scenarioTitle, 40)}<br /><small className={s.muted}>{clean(r.difficulty, 24)}</small></td>
              <td>{clean(r.mode, 24)}</td>
              <td className="num"><strong>{finite(r.score)}</strong> <Chip kind="info" size="sm" icon={null}>{clean(r.grade, 2)}</Chip></td>
            </tr>
          )) : <tr><td colSpan={5} className={s.muted}>{t('Finish a ranked mission and add it here. Scores in codes are self-reported; the engine re-flies shared designs to check them.')}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
