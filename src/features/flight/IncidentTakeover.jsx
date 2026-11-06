import {useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {Button, Icon, duration, ease, spring, useReducedMotion} from '@/ds/index.js';
import {fx} from '@/fx/index.js';
import {useGame} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {CrewVote} from '../crew/CrewVote.jsx';
import {DirectionChips} from './DirectionChips.jsx';
import s from './flight.module.css';

/** Spend the one forecast (assistant answer with ranges). The store does not consume it yet (see FEATURE_REQUESTS), so mark it here. */
export async function spendForecast() {
  const st = useGame.getState();
  if (!st.run?.crisis || (st.run.forecasts || 0) >= 1) return false;
  await st.actions.ask('Use my one forecast');
  const now = useGame.getState();
  if (now.chat.at(-1)?.answer?.consumesForecast && now.run?.crisis && (now.run.forecasts || 0) < 1) useGame.setState({run: {...now.run, forecasts: (now.run.forecasts || 0) + 1}});
  return true;
}

/**
 * Incident takeover. When a crisis pauses the run: a vignette fades in (240 ms), the stage desaturates (see `stageDesat` in
 * the flight screen), the alarm sounds twice through fx, and the decision card rises from the crisis marker on the timeline.
 * Responses are Commit buttons (hold, or tap twice). Previews are direction-only; ranges cost the one forecast.
 * In crew mode the options are read-only and <CrewVote/> collects the team's votes.
 */
export function IncidentTakeover({crisis, originRef, onResolved}) {
  const t = useT();
  const reduced = useReducedMotion();
  const actions = useGame(st => st.actions);
  const headingRef = useRef(null);
  const [origin, setOrigin] = useState('50%');
  const key = crisis ? `${crisis.crisis.id}|${crisis.crisis.title}` : '';

  useEffect(() => {
    if (!crisis) return undefined;
    const el = originRef?.current;
    if (el) { const r = el.getBoundingClientRect(); setOrigin(`${Math.max(5, Math.min(95, Math.round((r.left + r.width / 2) / window.innerWidth * 100)))}%`); }
    const timer = setTimeout(() => fx.play('warn'), 450); // second beat of the alarm; the store already played the first
    const focus = setTimeout(() => headingRef.current?.focus({preventScroll: true}), reduced ? 0 : 120);
    return () => { clearTimeout(timer); clearTimeout(focus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const rise = reduced
    ? {initial: {opacity: 0}, animate: {opacity: 1, transition: {duration: 0.12}}, exit: {opacity: 0, transition: {duration: 0.12}}}
    : {initial: {opacity: 0, y: 72, scale: 0.92}, animate: {opacity: 1, y: 0, scale: 1, transition: spring.soft}, exit: {opacity: 0, y: 40, scale: 0.97, transition: {duration: duration.base * 0.6, ease: ease.exit}}};
  const fade = {initial: {opacity: 0}, animate: {opacity: 1, transition: {duration: 0.24}}, exit: {opacity: 0, transition: {duration: 0.15}}};

  return (
    <AnimatePresence>
      {crisis ? (
        <>
          <motion.div key="vignette" className={s.vignette} aria-hidden="true" data-testid="vignette" {...fade} />
          <div key="layer" className={s.incidentLayer}>
            <motion.div className={s.incident} style={{transformOrigin: `${origin} 100%`}} {...rise}>
              <CardBody crisis={crisis} t={t} headingRef={headingRef} actions={actions} onResolved={onResolved} />
            </motion.div>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function CardBody({crisis, t, headingRef, actions, onResolved}) {
  const c = crisis.crisis, dirs = Object.fromEntries(crisis.directions.map(d => [d.id, d]));
  const headingId = `incident-${c.id}`;
  const spent = !crisis.forecastAvailable;
  const confirm = id => { fx.cue('tick'); actions.resolve(id); onResolved?.(id); };
  return (
    <section className={s.incidentCard} role="region" aria-labelledby={headingId} data-crisis={c.id}>
      <div className={s.alarmRow}><span className={s.alarmDot} aria-hidden="true" /> {t('Decision required · simulation paused')}</div>
      <h2 id={headingId} tabIndex={-1} ref={headingRef}>{c.title}</h2>
      <p>{c.body}</p>
      {c.chain?.length ? (
        <ol className={s.chain} aria-label={t('Cause chain')}>
          {c.chain.map((step, i) => <li key={i} style={{display: 'contents'}}>{i ? <span className={s.chainArrow} aria-hidden="true">→</span> : null}<span className={s.chainNode}>{step}</span></li>)}
        </ol>
      ) : null}
      <div className={s.directionBox}>
        <span className="kicker">{t('Rough preview · direction only')}</span>
        <div className={s.incidentActions}>
          <Button size="sm" variant="secondary" icon="assistant" disabled={spent} disabledReason={spent ? t('Your forecast for this mission is used.') : undefined} onClick={() => spendForecast()}>{t('Spend my one forecast for ranges')}</Button>
          <Button size="sm" variant="ghost" onClick={() => actions.ask('Compare crisis choices')}>{t('Ask the assistant about these choices')}</Button>
          {spent ? <span className={s.hint} role="status">{t('Your forecast for this mission is used.')}</span> : null}
        </div>
      </div>
      <div className={s.options} role="group" aria-label={t('Recovery options')}>
        {c.actions.map(o => (
          <div key={o.id} className={s.option} data-disabled={o.disabled || undefined} data-option={o.id}>
            <h3>{o.name}</h3>
            <p>{o.effect}{o.disabled ? ` ${t('Unavailable: insufficient capability.')}` : ''}</p>
            {!o.disabled ? <DirectionChips chips={dirs[o.id]?.chips} /> : null}
            {crisis.crewMode ? null : (
              <Button variant="commit" icon="check" disabled={!!o.disabled} disabledReason={o.disabled ? t('Unavailable: insufficient capability.') : undefined}
                holdLabel={t('Keep holding')} confirmLabel={t('Press again to confirm')} onConfirm={() => confirm(o.id)} aria-label={`${t('Hold to commit')}: ${o.name}`}>{t('Hold to commit')}</Button>
            )}
          </div>
        ))}
      </div>
      {crisis.crewMode ? <CrewVote onResolved={onResolved} /> : null}
    </section>
  );
}
