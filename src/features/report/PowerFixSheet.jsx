import {missionFor} from '@data/catalog.js';
import {useGame, analyze} from '@/store/index.js';
import {Button, Chip, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {fmt, signed} from './format.js';
import s from './report.module.css';

/** The two-part change the report recommends: Power system -> Endurance and Communications -> High-gain. */
export const POWER_FIX = {power: 'endurance', comms: 'highgain'};

/** Before/after numbers of the fix for a design. Pure; exported for tests. */
export function powerFixRows(design) {
  const before = analyze(design), after = analyze({...design, ...POWER_FIX}), m = missionFor(design);
  return {
    before, after, budget: m.budget,
    rows: [
      ['Wet mass', before.wet, after.wet, 'kg', 1, true],
      ['Cost', before.cost, after.cost, 'cr', 1, true],
      ['Budget margin', before.margins.budget, after.margins.budget, 'cr', 1, false],
      ['Maneuver available', before.deltaV, after.deltaV, 'm/s', 0, false],
      ['Power margin', before.margins.power, after.margins.power, 'W', 1, false],
      ['Data margin', before.margins.data, after.margins.data, 'MB/orbit', 1, false]
    ]
  };
}

/** Read-only preview with deltas, then one explicit confirmation. Orbit, fuel, payload, name and scaling stay as they are. */
export function PowerFixSheet() {
  const t = useT();
  const design = useGame(st => st.design);
  const a = useGame.getState().actions;
  const {before, after, rows, budget} = powerFixRows(design);
  return (
    <div className={s.stack}>
      <p>{t('Only Power system → Endurance and Communications → High-gain are changed. Orbit, fuel, destination, payload, name, color and custom scaling stay as selected.')}</p>
      <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Effect of the change')}>
        <table className={s.table}>
          <thead><tr><th scope="col">{t('Quantity')}</th><th scope="col">{t('Now')}</th><th scope="col">{t('After')}</th><th scope="col">{t('Change')}</th></tr></thead>
          <tbody>
            {rows.map(([label, b, c, unit, n, lowerBetter]) => {
              const d = c - b, good = d !== 0 && (lowerBetter ? d < 0 : d > 0);
              return (
                <tr key={label}>
                  <th scope="row">{t(label)}</th><td className="num">{fmt(b, n)} {unit}</td><td className="num">{fmt(c, n)} {unit}</td>
                  <td className={`num ${s.delta}`} data-trend={d === 0 ? 'flat' : good ? 'good' : 'bad'}><Icon name={d === 0 ? 'arrow-flat' : d > 0 ? 'arrow-up' : 'arrow-down'} size={14} /> {signed(d, n)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={s.muted}>{t('Budget')}: {fmt(before.cost, 1)} → {fmt(after.cost, 1)} / {budget} {t('credits')}.</p>
      <p>{after.launchable ? <Chip kind="pass" size="sm">{t('Launchable')}</Chip> : <Chip kind="fail" size="sm">{t('Blocked')}</Chip>} {after.launchable ? t('Feasible hardware; warnings and operating choices can still prevent mission success.') : t('This change exceeds a hard constraint. Adjust your design before launching.')}</p>
      <div className={s.row}>
        <Button variant="ghost" onClick={() => a.close()}>{t('Cancel')}</Button>
        <Button variant="primary" data-autofocus onClick={() => a['confirm-power-fix']()}>{t('Apply these two changes')}</Button>
      </div>
    </div>
  );
}
