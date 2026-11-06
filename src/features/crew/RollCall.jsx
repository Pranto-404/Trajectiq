import {useEffect, useMemo, useRef, useState} from 'react';
import {motion} from 'motion/react';
import {roleVerdicts, signoffAllowed} from '@engine/crew.js';
import {Button, Chip, Icon, spring, useAnnounce, useReducedMotion} from '@/ds/index.js';
import {fx} from '@/fx/index.js';
import {useGame, selectLaunchCheck} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {ROLES, ROLE_ORDER, holderOf} from './crewModel.js';
import {RoleBadge} from './RoleBadge.jsx';
import s from './crew.module.css';

const STEP_MS = 450;
const WORD = {go: 'GO', concern: 'GO WITH CONCERN', nogo: 'NO-GO'};

/** Stamp: GO scales 1.4 -> 1 with a 12 degree rotation in 180 ms; NO-GO shakes once; reduced motion fades. */
function Stamp({status, reduced, label}) {
  const anim = reduced
    ? {initial: {opacity: 0}, animate: {opacity: 1, transition: {duration: 0.12}}}
    : status === 'nogo'
      ? {initial: {opacity: 0, scale: 1.2}, animate: {opacity: 1, scale: 1, x: [0, -9, 9, -6, 6, 0], transition: {duration: 0.42}}}
      : {initial: {opacity: 0, scale: 1.4, rotate: 12}, animate: {opacity: 1, scale: 1, rotate: -3, transition: {duration: 0.18, ...spring.snap}}};
  return <motion.span className={s.stamp} data-status={status} data-testid="stamp" {...anim}>{label}</motion.span>;
}

/**
 * Go / No-Go roll call. One console per role lights in sequence (450 ms apart), each looking at readiness through its own lens
 * (crew.js roleVerdicts): a failure is NO-GO, a warning is GO with a concern. Crew sessions sign off per role (the Commander cannot
 * launch alone; a NO-GO role cannot sign); solo sessions get the same poll without sign-offs. Reads the store's launch check.
 * Used by the hangar's launch sheet and by the `rollcall` sheet.
 */
export function RollCall({onReady}) {
  const t = useT();
  const reduced = useReducedMotion();
  const say = useAnnounce();
  const lc = useGame(selectLaunchCheck);
  const team = useGame(st => st.team);
  const actions = useGame(st => st.actions);
  const verdicts = useMemo(() => lc.crew ? lc.verdicts : roleVerdicts(lc.checks), [lc]);
  const [shown, setShown] = useState(reduced ? ROLE_ORDER.length : 0);
  const played = useRef(reduced);

  useEffect(() => {
    if (played.current) { setShown(ROLE_ORDER.length); return undefined; }
    played.current = true;
    let i = 0, timer;
    const next = () => {
      i += 1; setShown(i);
      const v = verdicts[i - 1];
      fx.play(v?.status === 'nogo' ? 'nogo' : 'go');
      if (i < ROLE_ORDER.length) timer = setTimeout(next, STEP_MS);
    };
    timer = setTimeout(next, STEP_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const complete = shown >= ROLE_ORDER.length;
  const allowed = signoffAllowed(verdicts);
  const goCount = verdicts.filter(v => v.status !== 'nogo').length;
  const signedCount = ROLE_ORDER.filter(r => lc.signed[r]).length;
  const ready = lc.crew ? lc.ready : allowed;
  const summary = !complete ? t('Polling the consoles…')
    : !allowed ? t('NO-GO: {n} role(s) need a redesign before launch.', {n: verdicts.length - goCount})
      : lc.crew ? (lc.ready ? t('All consoles GO and signed off. Ready for launch authorization.') : t('{n} of {total} roles signed off. Every role must sign to launch.', {n: signedCount, total: ROLE_ORDER.length}))
        : t('All consoles GO. Ready for launch authorization.');
  useEffect(() => { if (complete) { say(summary); if (ready) onReady?.(); } }, [complete, summary]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className={s.rollcall} aria-label={t('Go / No-Go roll call')} data-testid="rollcall">
      <p className={s.note}>{t('Every role checks readiness through its own lens. A NO-GO needs a redesign; a concern can be accepted by signing off. The Commander cannot launch alone.')}</p>
      <ol className={s.consoles}>
        {verdicts.map((v, i) => {
          const lit = i < shown, signed = !!lc.signed[v.role], holder = holderOf(team, v.role);
          return (
            <li key={v.role} className={s.console} data-lit={lit || undefined} data-status={lit ? v.status : 'standby'} data-role={v.role} aria-label={`${ROLES[v.role].label}: ${lit ? t(WORD[v.status]) : t('standby')}`}>
              <div className={s.consoleHead}>
                <RoleBadge role={v.role} />
                <small>{holder?.name}</small>
              </div>
              <div className={s.stampSlot}>
                {lit ? <Stamp status={v.status} reduced={reduced} label={t(WORD[v.status])} /> : <span className={s.standby}><span className={s.pollDot} aria-hidden="true" /> {t('STANDBY')}</span>}
              </div>
              {lit ? (
                <>
                  <p className={s.issues}>{v.issues.length ? v.issues.map(x => `${x.name}: ${x.value}`).join('; ') : t('Nothing in this role’s area needs attention.')}</p>
                  {lc.crew ? (
                    v.status === 'nogo' ? <small className={s.bad}>{t('Cannot sign off')}</small>
                      : signed ? <Chip kind="pass" size="sm">{t('Signed off')}</Chip>
                        : <Button size="sm" variant="secondary" icon="check" onClick={() => actions['crew-signoff']({role: v.role})}>{t('Sign off')} <span className="sr-only">{ROLES[v.role].label}</span></Button>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className={s.summary} role="status" data-ready={ready && complete || undefined}><Icon name={ready && complete ? 'check' : complete && !allowed ? 'warning' : 'info'} size={16} /> {summary}</p>
    </section>
  );
}

/** Registered as the `rollcall` sheet. */
export function RollCallSheet() {
  const t = useT();
  const actions = useGame(st => st.actions);
  return <><RollCall /><Button variant="primary" icon="launch" onClick={() => actions['game-review']()}>{t('Launch readiness →')}</Button></>;
}
