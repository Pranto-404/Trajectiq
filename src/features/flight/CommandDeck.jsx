import {Panel, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {OPERATION_MODES, commandLock} from './flightModel.js';
import s from './flight.module.css';

/**
 * Operations commands. Locked (aria-disabled, still focusable, visible reason) until the operations phase and while a crisis is
 * pending. The active command is `aria-pressed`. Pressing a locked command does nothing and the reason is already on screen.
 */
export function CommandDeck({run, crisis, actions}) {
  const t = useT();
  const lock = commandLock(run, !!crisis);
  return (
    <Panel kicker={t('Command the spacecraft')} title={t('Operations')} className={s.fill} state={lock ? 'locked' : 'default'}>
      <div className={s.cmdGrid} role="group" aria-label={t('Operations commands')}>
        {OPERATION_MODES.map(m => (
          <button key={m.id} type="button" className={s.cmd} aria-pressed={run.mode === m.id} aria-disabled={lock ? true : undefined}
            aria-describedby={lock ? 'flight-cmd-reason' : undefined} data-command={m.id}
            onClick={() => { if (!lock) actions.command(m.id); }}>
            <span className={s.cmdIcon}><Icon name={m.icon} size={18} /></span>
            <span><strong>{t(m.title)}</strong><small>{t(m.detail)}</small></span>
          </button>
        ))}
      </div>
      <p className={s.lockLine} id="flight-cmd-reason" role="status">
        {lock ? <><Icon name="lock" size={14} /> {t(lock)}</> : <>{t('Your schedule changes energy use, data generation and science return.')}</>}
      </p>
    </Panel>
  );
}
