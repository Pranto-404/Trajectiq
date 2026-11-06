import {CATEGORIES, missionFor} from '@data/catalog.js';
import {Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {clean, finite, fmt, signed} from './format.js';
import s from './report.module.css';

const METRICS = [['Returned science · units', 'science', 1], ['Target attainment %', 'rawCompletion', 1], ['Cost · cr', 'cost', 0], ['Returned · MB', 'returned', 1], ['Lost · MB', 'lostMB', 1], ['Safe mode · min', 'safeMinutes', 0]];
const LOWER_IS_BETTER = new Set(['lostMB', 'safeMinutes', 'cost']);
const HARDWARE = [['arrayScale', 'Solar array size'], ['batteryScale', 'Battery size'], ['duty', 'Instrument duty'], ['distance', 'Distance scenario']];

/** Value of one metric of a saved run. Pure; exported for tests. */
export function metric(run, key) {
  const o = run?.outcome || {};
  if (key === 'rawCompletion') return finite(o.science) / Math.max(1, finite(missionFor(run.design).scienceTarget, 1)) * 100;
  return finite(o[key]);
}

/** Names of the design choices that differ between two runs. Pure; exported for tests. */
export function changedChoices(before, after) {
  const a = before.design || {}, b = after.design || {};
  const changed = CATEGORIES.filter(([k]) => a[k] !== b[k]).map(([, title]) => title);
  if (a.fuel !== b.fuel) changed.push('Propellant');
  if (a.altitude !== b.altitude || a.inclination !== b.inclination) changed.push('Orbit');
  for (const [k, label] of HARDWARE) if (a[k] !== b[k]) changed.push(label);
  return changed;
}

/** Before/now table with signed deltas (arrow + sign + colour, never colour alone) and honest caveats. */
export function Comparison({before, after}) {
  const t = useT();
  const changed = changedChoices(before, after);
  return (
    <div className={s.compare} data-testid="comparison">
      <p className={s.muted}>
        {before.modelVersion !== after.modelVersion ? `${t('Different model versions; do not attribute all changes to hardware alone.')} ` : ''}
        {t('Saved outcomes combine hardware with operating decisions; these are not controlled hardware comparisons.')}{' '}
        {t('Seed')} {clean(before.seed, 12)} → {clean(after.seed, 12)}, {t('final mode')} {clean(before.mode, 20)} → {clean(after.mode, 20)}.{' '}
        {t('Changed')}: {changed.length ? changed.map(c => t(c)).join(', ') : t('same architecture; compare operating decisions')}.
      </p>
      <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Run comparison')}>
        <table className={s.table}>
          <thead><tr><th scope="col">{t('Metric')}</th><th scope="col">{t('Before')}</th><th scope="col">{t('Now')}</th><th scope="col">{t('Change')}</th></tr></thead>
          <tbody>
            {METRICS.map(([label, key, n]) => {
              const v0 = metric(before, key), v1 = metric(after, key), d = v1 - v0;
              const good = d !== 0 && (LOWER_IS_BETTER.has(key) ? d < 0 : d > 0);
              return (
                <tr key={key}>
                  <th scope="row">{t(label)}</th><td className="num">{fmt(v0, n)}</td><td className="num">{fmt(v1, n)}</td>
                  <td className={`num ${s.delta}`} data-trend={d === 0 ? 'flat' : good ? 'good' : 'bad'}>
                    <Icon name={d === 0 ? 'arrow-flat' : d > 0 ? 'arrow-up' : 'arrow-down'} size={14} /> {signed(d, n)}
                    <span className="sr-only"> {d === 0 ? t('no change') : good ? t('better') : t('worse')}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
