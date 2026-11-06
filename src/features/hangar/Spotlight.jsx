import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {motion} from 'motion/react';
import {Button, spring, useReducedMotion} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import s from './hangar.module.css';

/** The four steps (the v6 coach text) and the real element each one points at: [data-tour="..."] in the hangar. */
export const TOUR = [
  {anchor: 'stage', title: 'You are the spacecraft designer', body: 'The camera observes, the battery stores energy, and the antenna sends data home. Start with the Balanced build.'},
  {anchor: 'tray', title: 'Try one change', body: 'Choose Power system in the tray, then install another kit. Hover a part first to see its effect on the gauges before you commit.'},
  {anchor: 'launch', title: 'Check before you launch', body: 'Open the launch readiness check. Fix red FAIL items. Read amber WARN items and decide whether you can handle their consequences.'},
  {anchor: 'objective', title: 'Bring the science home', body: 'Only science that reaches Earth counts. Start with Map in sunlight, use Return priority when storage fills, or Conserve energy when the battery is low.'}
];
const PAD = 8, CARD_W = 340;

/** Rectangle of the first visible element matching [data-tour=anchor], re-measured on resize, scroll and layout change. */
export function useTourRect(anchor, active) {
  const [rect, setRect] = useState(null);
  const measure = useCallback(() => {
    const els = [...document.querySelectorAll(`[data-tour="${anchor}"]`)];
    const el = els.find(e => e.getBoundingClientRect().width > 0) || els[0];
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect(prev => prev && Math.abs(prev.x - r.left) < .5 && Math.abs(prev.y - r.top) < .5 && Math.abs(prev.w - r.width) < .5 && Math.abs(prev.h - r.height) < .5 ? prev : {x: r.left, y: r.top, w: r.width, h: r.height});
  }, [anchor]);
  useLayoutEffect(() => {
    if (!active) return undefined;
    const el = document.querySelector(`[data-tour="${anchor}"]`);
    el?.scrollIntoView?.({block: 'nearest', inline: 'nearest'});
    measure();
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
    const ro = typeof ResizeObserver === 'function' && el ? new ResizeObserver(measure) : null; ro?.observe(el);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); ro?.disconnect(); };
  }, [anchor, active, measure]);
  return rect;
}

/**
 * Spotlight onboarding: four skippable steps, each cut out around a real element. It is not modal: the dim is paint only, the
 * page stays operable, nothing traps or steals focus, and Escape or Skip ends it. Replaces the v6 text coach strip.
 */
export function Spotlight() {
  const t = useT();
  const reduced = useReducedMotion();
  const guided = useGame(st => st.prefs.guided), sheet = useGame(st => st.sheet), locked = useGame(st => !!(st.run && !st.run.done)), a = useGame(st => st.actions);
  const [step, setStep] = useState(0);
  const active = guided && !sheet && !locked;
  const cur = TOUR[step];
  const rect = useTourRect(cur.anchor, active);
  const card = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const onKey = e => { if (e.key === 'Escape' && card.current?.contains(document.activeElement)) a['guide-toggle'](); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [active, a]);
  if (!active) return null;
  const last = step === TOUR.length - 1;
  const end = () => a['guide-toggle']();
  const vh = typeof window === 'undefined' ? 800 : window.innerHeight, vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
  const below = rect ? rect.y + rect.h + 12 + 190 < vh : true;
  const cardLeft = rect ? Math.min(Math.max(12, rect.x + rect.w / 2 - CARD_W / 2), Math.max(12, vw - CARD_W - 12)) : Math.max(12, (vw - CARD_W) / 2);
  const cardStyle = rect ? (below ? {top: rect.y + rect.h + 12, left: cardLeft} : {bottom: Math.max(12, vh - rect.y + 12), left: cardLeft}) : {bottom: 96, left: cardLeft};
  const wide = rect && rect.w > vw * 0.9; // a hole nearly as wide as the screen only adds noise
  return (
    <>
      {rect && !wide ? (
        <motion.div className={s.hole} aria-hidden="true" data-testid="spot-hole"
          style={{width: rect.w + PAD * 2, height: rect.h + PAD * 2, left: 0, top: 0}}
          initial={false} animate={{x: rect.x - PAD, y: rect.y - PAD}} transition={reduced ? {duration: 0.12} : spring.soft} />
      ) : null}
      <section ref={card} className={s.tourCard} style={{...cardStyle, width: Math.min(CARD_W, vw - 24)}} aria-label={`${t('Guided tour')}: ${t('step')} ${step + 1} ${t('of')} ${TOUR.length}`} data-testid="tour-card" data-step={step}>
        <div className={s.tourDots} aria-hidden="true">{TOUR.map((_, i) => <i key={i} data-on={i <= step || undefined} />)}</div>
        <strong className={s.tourTitle}>{t(cur.title)}</strong>
        <p>{t(cur.body)}</p>
        <div className={s.row}>
          <Button size="sm" variant="primary" onClick={() => (last ? end() : setStep(step + 1))}>{last ? t('Done') : t('Next hint')}</Button>
          <Button size="sm" variant="ghost" onClick={end}>{t('Skip tour')}</Button>
          <span className={s.fine}>{step + 1} / {TOUR.length}</span>
        </div>
      </section>
    </>
  );
}
