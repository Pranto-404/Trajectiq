import {Button, Chip, Icon} from '@/ds/index.js';
import {useGame, selectAnalysis} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {useLocked, fmt} from './hooks.js';
import s from './hangar.module.css';

export const CHECK_CATEGORY = {mass: 'launch', budget: 'launch', compatibility: 'storage', launchOrbit: 'launch', schedule: 'bus', deltaV: 'propulsion', power: 'power', eclipse: 'power', data: 'comms', recorder: 'storage', pointing: 'bus', orbit: 'payload'};
export function priorityCheck(checks, critical) {
  const ids = {power: ['power', 'eclipse'], data: ['data', 'recorder'], comms: ['data'], mass: ['mass'], budget: ['budget'], time: ['schedule']}[critical] || [];
  return checks.find(c => c.status === 'fail') || checks.find(c => c.status === 'warn' && ids.includes(c.id)) || checks.find(c => c.status === 'warn') || null;
}

/** Explains the engine's actual constraints. Never claims a warning-free design guarantees success. */
export function DesignAdvisor() {
  const t = useT(), locked = useLocked();
  const model = useGame(selectAnalysis), a = useGame(st => st.actions);
  const issue = priorityCheck(model.checks, model.m.critical);
  const failed = model.checks.filter(c => c.status === 'fail').length;
  const warnings = model.checks.filter(c => c.status === 'warn').length;
  const category = issue && CHECK_CATEGORY[issue.id];
  const inspect = () => {
    a.setCategory(category);
    requestAnimationFrame(() => {
      const tab = document.querySelector(`[data-category="${category}"]`);
      tab?.scrollIntoView?.({block: 'nearest'}); tab?.focus();
    });
  };
  return <section className={s.advisor} aria-label={t('Design advisor')}>
    <div className={s.advisorHead}>
      <span className="kicker"><Icon name="assistant" size={16} /> {t('YOUR NEXT DECISION')}</span>
      <Chip kind={failed ? 'fail' : warnings ? 'warn' : 'pass'} size="sm">{failed ? `${failed} ${t('launch blockers')}` : warnings ? `${warnings} ${t('trade-offs to review')}` : t('Checks clear')}</Chip>
    </div>
    <h2>{issue ? issue.name : t('Ready for a flight rehearsal')}</h2>
    <p>{issue ? issue.why : t('Your design passes the engineering checks. Fly it, respond to events, then use the report to improve your next attempt.')}</p>
    <div className={s.row}>
      {category ? <Button size="sm" variant="secondary" icon="bus" onClick={inspect}>{t('Inspect subsystem')}</Button> : null}
      <Button size="sm" variant="ghost" onClick={() => a['game-review']()} disabled={locked} disabledReason={locked ? t('A flight is already in progress') : undefined}>{t('View all checks')}</Button>
    </div>
    <div className={s.scienceFlow} aria-label={t('Science data path')}>
      {[['payload', 'Collect', model.dataGenerated, 'MB/orbit'], ['storage', 'Store', model.c.storage.capacity, 'MB'], ['comms', 'Return', model.dataDownlink, 'MB/orbit']].map(([kind, label, value, unit], i) => <div key={kind}>
        <button type="button" onClick={() => a.setCategory(kind)}><Icon name={kind} size={20} /><span>{t(label)}<strong>{fmt(value, 0)} <small>{unit}</small></strong></span></button>
        {i < 2 ? <span className={s.flowLink} aria-hidden="true"><i /></span> : null}
      </div>)}
    </div>
    <small className={s.fine}>{t('Collection and link values are modeled per orbit; storage is total capacity. Only returned science scores.')}</small>
  </section>;
}
