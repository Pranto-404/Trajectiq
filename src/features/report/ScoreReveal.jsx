import {useEffect, useRef, useState} from 'react';
import {animate, motion, useMotionValue, useTransform} from 'motion/react';
import {Button, Chip, announce, ease, spring, useReducedMotion} from '@/ds/index.js';
import {fx} from '@/fx/index.js';
import {useT} from '@/i18n/index.js';
import {clean, finite, fmt} from './format.js';
import s from './report.module.css';

const RING = 2 * Math.PI * 52;
const RING_MS = 1200, BAR_STEP = 0.15, BAR_MS = 420, STAMP_MS = 500;

/**
 * Reveal timeline: 0 the ring fills (1.2 s) -> 1 the category bars fill in sequence (150 ms stagger)
 * -> 2 the grade stamps -> 3 done (the decision review slides in). Skippable; instant under reduced motion
 * and when the score for this run was already seen.
 */
export function useReveal({fresh, reduced, count, onDone}) {
  const live = fresh && !reduced;
  const [phase, setPhase] = useState(live ? 0 : 3);
  const done = useRef(onDone); done.current = onDone;
  const fired = useRef(false);
  useEffect(() => {
    if (phase >= 3) return undefined;
    const ms = phase === 0 ? RING_MS : phase === 1 ? count * BAR_STEP * 1000 + BAR_MS : STAMP_MS;
    const id = setTimeout(() => setPhase(p => Math.min(3, p + 1)), ms);
    return () => clearTimeout(id);
  }, [phase, count]);
  useEffect(() => {
    if (phase >= 3 && !fired.current) { fired.current = true; done.current?.(); }
  }, [phase]);
  return {phase, live, skip: () => setPhase(3)};
}

/**
 * Mission Score as a cinematic: ring, five (or four) category bars in sequence, grade stamp.
 * `score` is the engine's {total, grade, dims[], crew, ranked}. Text values come from the engine and render as text.
 */
export function ScoreReveal({score, label, fresh, onSeen, onDone}) {
  const t = useT();
  const reduced = useReducedMotion();
  const dims = (Array.isArray(score.dims) ? score.dims : []).map((d, i) => ({id: String(d?.id ?? i), label: String(d?.label ?? ''), note: String(d?.note ?? ''), value: finite(d?.value), max: finite(d?.max, 1) || 1}));
  const {phase, live, skip} = useReveal({fresh, reduced, count: dims.length, onDone: () => {
    if (fresh) { onSeen?.(); announce(t('Mission Score {total} out of 1000, grade {grade}.', {total: score.total, grade: score.grade})); }
    onDone?.();
  }});
  const frac = Math.min(1, Math.max(0, score.total / 1000));
  const count = useMotionValue(live ? 0 : score.total);
  const shown = useTransform(count, v => fmt(Math.round(v)));
  useEffect(() => {
    if (!live) { count.set(score.total); return undefined; }
    const controls = animate(count, score.total, {duration: RING_MS / 1000, ease: ease.enter});
    return () => controls.stop();
  }, [live, score.total, count]);
  const stamped = useRef(false);
  useEffect(() => {
    if (phase >= 2 && live && !stamped.current) { stamped.current = true; try { fx.play(score.grade === 'D' ? 'tick' : 'success'); fx.haptic?.('seat'); } catch { /* sound is optional */ } }
  }, [phase, live, score.grade]);

  const gradeIn = phase >= 2;
  const aria = t('Mission Score {total} out of 1000, grade {grade}', {total: score.total, grade: score.grade});
  return (
    <section className={s.score} aria-labelledby="score-title" data-phase={phase} data-testid="score-reveal">
      <div className={s.scoreHead}>
        <div className={s.ringWrap} role="img" aria-label={aria}>
          <svg viewBox="0 0 120 120" className={s.ring} aria-hidden="true" focusable="false">
            <circle className={s.ringTrack} cx="60" cy="60" r="52" />
            <g transform="rotate(-90 60 60)">
              <motion.circle className={s.ringFill} cx="60" cy="60" r="52" strokeDasharray={RING} initial={{strokeDashoffset: live ? RING : RING * (1 - frac)}} animate={{strokeDashoffset: RING * (1 - frac)}} transition={live ? {duration: RING_MS / 1000, ease: ease.enter} : {duration: 0}} />
            </g>
          </svg>
          <div className={s.ringInner} aria-hidden="true"><motion.strong className={s.ringNumber}>{shown}</motion.strong><span>/ 1000</span></div>
        </div>
        <div className={s.scoreText}>
          <span className="kicker">{t('Mission Score')}{label ? ` · ${clean(label, 12)}` : ''}</span>
          <h2 id="score-title" className={s.scoreTitle}>{t('Grade')}{' '}
            <motion.span className={s.stamp} data-grade={score.grade} initial={live ? {opacity: 0, scale: 1.4, rotate: 12} : false} animate={gradeIn ? {opacity: 1, scale: 1, rotate: -6} : {opacity: 0, scale: 1.4, rotate: 12}} transition={reduced ? {duration: 0.12} : spring.snap}>{score.grade}</motion.span>
          </h2>
          <p className={s.muted}>
            {score.ranked ? t('Ranked run.') : t('Sandbox run: not ranked.')} {score.crew ? t('Includes team collaboration.') : t('Solo run.')}{' '}
            {t('Scored on what the challenge rewards: performance, scientific value, efficient resource use, decision quality')}{score.crew ? ` ${t('and collaboration')}` : ''}.
          </p>
          {phase < 3 ? <Button variant="ghost" size="sm" icon="fast" onClick={skip}>{t('Skip animation')}</Button> : <Chip kind="info" size="sm" icon="check">{t('Score revealed')}</Chip>}
        </div>
      </div>
      <ul className={s.dims} aria-label={t('Score by category')}>
        {dims.map((d, i) => {
          const f = Math.min(1, Math.max(0.02, d.value / d.max));
          const barsOn = phase >= 1;
          return (
            <li key={d.id} className={s.dim}>
              <div className={s.dimTop}><strong>{d.label}</strong><motion.span className="num" initial={live ? {opacity: 0} : false} animate={{opacity: barsOn ? 1 : 0}} transition={{delay: live ? i * BAR_STEP : 0}}>{fmt(d.value)} / {d.max}</motion.span></div>
              <div className={s.bar} role="presentation"><motion.i style={{transformOrigin: 'left center'}} initial={live ? {scaleX: 0} : false} animate={{scaleX: barsOn ? f : 0}} transition={live ? {delay: i * BAR_STEP, duration: BAR_MS / 1000, ease: ease.enter} : {duration: 0}} /></div>
              <small className={s.muted}>{d.note}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
