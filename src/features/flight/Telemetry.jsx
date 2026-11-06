import {Gauge, Panel, Chip} from '@/ds/index.js';
import {useMediaQuery} from '@/shell/hooks.js';
import {useT} from '@/i18n/index.js';
import {batteryStatus, recorderStatus, linkState} from './flightModel.js';
import s from './flight.module.css';

const LINK_TEXT = {safe: 'Link suspended', eclipse: 'In shadow', contact: 'In contact', sunlit: 'No contact'};

/**
 * Telemetry gauges: battery (arc, safe-mode tick), recorder (segments, 75 % tick), returned science, propellant, plus the
 * lost data, safe mode and link readouts. `values` is [battery Wh, recorder MB, science, propellant kg], already smoothed
 * between ticks; each Gauge adds its own needle spring.
 */
export function Telemetry({values, run, analysis: a, crisis, past}) {
  const t = useT();
  const narrow = useMediaQuery('(max-width: 899.98px)') || useMediaQuery('(max-height: 760px)'); // the arc dial needs height; short laptops get the linear bar
  const [battery, backlog, science, fuel] = values;
  const cap = a.c.power.battery, mem = a.c.storage.capacity;
  const link = linkState(run);
  const safeMin = run.safeSteps * a.m.step;
  return (
    <Panel kicker={t('Live telemetry')} title={t('Telemetry')} state={crisis ? 'incident' : past ? 'warning' : 'default'} badge={past ? t('Past view') : null} className={`${s.fill} ${s.tight}`}>
      <div className={s.gaugeBody}>
        <div className={s.gaugeGrid}>
          <Gauge className={s.gaugeArc} kind={narrow ? 'linear' : 'arc'} label={t('Battery')} value={battery} max={cap} unit="Wh" digits={1} status={batteryStatus(battery / cap)}
            thresholds={[{at: cap * 0.15, label: t('Safe mode 15%')}]} valueText={`${Math.round(battery / cap * 100)} percent, ${battery.toFixed(1)} of ${cap} Wh`} />
          <Gauge kind="segments" label={t('Recorder')} value={backlog} max={mem} unit="MB" digits={0} status={recorderStatus(backlog / mem)}
            thresholds={[{at: mem * 0.75, label: t('Warning 75%')}]} valueText={`${Math.round(backlog / mem * 100)} percent full, ${Math.round(backlog)} of ${mem} MB`} />
          <div className={s.gaugePair}>
          <Gauge kind="linear" label={t('Science')} value={science} max={a.m.scienceTarget} unit={t('units')} digits={0}
            thresholds={[{at: a.m.scienceTarget * a.m.scienceSuccess / 100, label: t('Objective')}]} />
          <Gauge kind="linear" label={t('Propellant')} value={fuel} max={Math.max(1, run.design.fuel)} unit="kg" digits={1} />
          </div>
        </div>
        <dl className={s.readouts}>
          <div className={s.readout} data-warn={run.lostMB > 0 || undefined}><dt>{t('Lost data')}</dt><dd>{Math.round(run.lostMB)} MB</dd></div>
          <div className={s.readout} data-warn={run.safe || undefined}><dt>{t('Safe mode')}</dt><dd>{run.safe ? <Chip kind="warn" size="sm">{t('ACTIVE')}</Chip> : `${safeMin.toFixed(1)} min`}</dd></div>
          <div className={s.readout} data-warn={link === 'safe' || undefined}><dt>{t('Link')}</dt><dd>{t(LINK_TEXT[link])}</dd></div>
        </dl>
      </div>
    </Panel>
  );
}
