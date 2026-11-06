import {useEffect, useId, useRef} from 'react';
import {motion} from 'motion/react';
import {Button, Chip, Icon, Segmented, spring, useReducedMotion} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {PHASE_IDS, clockLock} from './flightModel.js';
import s from './flight.module.css';

const PHASE_LABEL = {launch: 'Launch', transfer: 'Transfer', capture: 'Capture', operations: 'Operations', debrief: 'Debrief'};

/** Launch > Transfer > Capture > Operations > Debrief. The lime pill slides to the current phase (instant when motion is reduced). */
export function PhaseRibbon({phase}) {
  const t = useT();
  const reduced = useReducedMotion();
  const gid = useId();
  const at = PHASE_IDS.indexOf(phase);
  return (
    <ol className={s.ribbon} aria-label={t('Mission phase')}>
      {PHASE_IDS.map((id, i) => (
        <li key={id} className={s.phase} aria-current={id === phase ? 'step' : undefined} data-done={i < at || undefined}>
          {id === phase ? <motion.span layoutId={`${gid}-phase`} className={s.phasePill} transition={reduced ? {duration: 0.12} : spring.snappy} aria-hidden="true" /> : null}
          <span>{i < at ? <Icon name="check" size={12} /> : null}{t(PHASE_LABEL[id])}</span>
        </li>
      ))}
    </ol>
  );
}

export function StatusChip({run}) {
  const t = useT();
  if (run.safe) return <Chip kind="warn" icon="warning" className={s.status}>{t('SAFE MODE')}</Chip>;
  if (run.eclipse) return <Chip kind="info" icon="eclipse" className={s.status}>{t('IN ECLIPSE')}</Chip>;
  if (run.contact) return <Chip kind="info" icon="signal" className={s.status}>{t('CONTACT WINDOW')}</Chip>;
  return <Chip kind="info" icon="power" className={s.status}>{t('SUNLIGHT')}</Chip>;
}

const interactive = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName) || el.closest?.('[role="dialog"],[role="slider"],[role="radiogroup"]'));

/**
 * Clock controls: play/pause, step, next event, 1x/3x/10x. Shortcuts (when no control or dialog has focus): Space or K play/pause,
 * . step, N next event. Locked with a visible reason while a crisis waits for a decision.
 */
export function ClockControls({run, crisis, playing, speed, minute, duration, actions, className = ''}) {
  const t = useT();
  const lock = clockLock(run, !!crisis);
  const reason = lock ? t(lock) : undefined;
  const live = useRef({});
  live.current = {lock, playing, actions};
  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey || interactive(e.target) || document.querySelector('[role="dialog"]')) return;
      const {lock: l, actions: a} = live.current;
      if (l) return;
      if (e.key === ' ' || e.key === 'k' || e.key === 'K') { e.preventDefault(); a.play(); }
      else if (e.key === '.') a.step();
      else if (e.key === 'n' || e.key === 'N') a.fast();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className={`${s.clock} ${className}`} role="toolbar" aria-label={t('Mission clock')}>
      <div className={s.tplus} aria-hidden="true"><strong>T+{minute.toFixed(1)}</strong><span>{t('of {n} min', {n: Math.round(duration)})}</span></div>
      <span className="sr-only">{t('Mission time {m} of {n} minutes', {m: minute.toFixed(1), n: Math.round(duration)})}</span>
      <Button variant="primary" icon={playing ? 'pause' : 'play'} disabled={!!lock} disabledReason={reason} aria-keyshortcuts="Space K" data-flight-play onClick={() => actions.play()}>{playing ? t('Pause') : t('Play')}</Button>
      <Button icon="step" disabled={!!lock} disabledReason={reason} title={t('Advance 5 minutes or to the next phase')} aria-keyshortcuts="." onClick={() => actions.step()}>{t('Step')}</Button>
      <Button icon="fast" disabled={!!lock} disabledReason={reason} aria-keyshortcuts="N" onClick={() => actions.fast()}>{t('Next event')}</Button>
      <Segmented label={t('Speed')} value={speed} onChange={v => actions.setSpeed(v)} options={[1, 3, 10].map(n => ({value: n, label: `${n}×`}))} size="sm" />
    </div>
  );
}
