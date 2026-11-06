import {ROLES, ROLE_ORDER} from '@data/scenarios.js';
import {Button, Chip, Panel} from '@/ds/index.js';
import {useGame, selectLaunchCheck, selectLaunchGate} from '@/store/index.js';
import {hasSheet} from '@/sheets/registry.js';
import {useT} from '@/i18n/index.js';
import s from './hangar.module.css';

const KIND = {pass: 'pass', warn: 'warn', fail: 'fail'};
const VERDICT = {go: ['pass', 'GO'], concern: ['warn', 'GO WITH CONCERN'], nogo: ['fail', 'NO-GO']};

/**
 * The pre-launch check (sheet id `launch-check`, replaces the shell's basic one). Lists every engine check with its
 * explanation, including the recorder-before-first-contact, launch-orbit compatibility and development-schedule checks, then,
 * in crew mode, the Go/No-Go sign-offs. The final step is a hold-to-confirm "authorize launch".
 */
export function LaunchCheckSheet() {
  const t = useT();
  const lc = useGame(selectLaunchCheck), gate = useGame(selectLaunchGate), a = useGame(st => st.actions);
  const counts = {pass: 0, warn: 0, fail: 0};
  for (const c of lc.checks) counts[KIND[c.status] || 'warn']++;
  const rollcall = hasSheet('rollcall');
  return (
    <div className={s.check}>
      <div className={s.row} role="group" aria-label={t('Summary')}>
        <Chip kind="pass" size="sm">{counts.pass} {t('pass')}</Chip>
        <Chip kind="warn" size="sm">{counts.warn} {t('warn')}</Chip>
        <Chip kind="fail" size="sm">{counts.fail} {t('fail')}</Chip>
      </div>
      <ul className={s.checkList}>
        {lc.checks.map(c => (
          <li key={c.id} className={s.checkRow} data-check={c.id} data-status={c.status}>
            <Chip kind={KIND[c.status] || 'warn'} size="sm">{c.status.toUpperCase()}</Chip>
            <div><strong>{c.name}</strong><p className={s.fine}>{c.why}</p></div>
            <span className="num">{c.value}</span>
          </li>
        ))}
      </ul>
      {lc.crew ? (
        <Panel kicker={t('Go / No-Go')} title={t('Each role signs off')} data-testid="gonogo">
          <ul className={s.checkList}>
            {ROLE_ORDER.map(role => {
              const v = lc.verdicts.find(x => x.role === role), [kind, word] = VERDICT[v?.status] || ['warn', 'WAITING'];
              const done = !!lc.signed[role];
              return (
                <li key={role} className={s.checkRow} data-role={role}>
                  <Chip kind={done ? 'pass' : kind} size="sm">{done ? t('SIGNED OFF') : t(word)}</Chip>
                  <div>
                    <strong>{ROLES[role].label}</strong>
                    <p className={s.fine}>{v?.issues?.length ? v.issues.map(i => `${i.name}: ${i.value}`).join('; ') : t('Nothing in this role’s area needs attention.')}</p>
                  </div>
                  <Button size="sm" variant="secondary" disabled={v?.status === 'nogo' || done} disabledReason={v?.status === 'nogo' ? t('This role sees a hard failure') : undefined} onClick={() => a['crew-signoff']({role})}>{t('Sign off')}</Button>
                </li>
              );
            })}
          </ul>
          {rollcall ? <Button size="sm" variant="ghost" icon="signal" onClick={() => a.openSheet('rollcall')}>{t('Open the roll call')}</Button> : null}
        </Panel>
      ) : null}
      <p>{lc.launchable ? t('Hardware is locked after launch. Warnings become operational consequences. You can recover only using the capabilities you selected.') : t('Resolve the hard failures in the hangar. Impossible mass, budget or interfaces cannot launch.')}</p>
      <div className={s.row}>
        <Button variant="ghost" onClick={() => a.close()}>{t('Back to hangar')}</Button>
        <Button variant="commit" icon="launch" disabled={!lc.canLaunch} disabledReason={gate.reason || lc.blockReason} onConfirm={() => a['game-launch']()}>{t('Hold to authorize launch')}</Button>
      </div>
    </div>
  );
}
