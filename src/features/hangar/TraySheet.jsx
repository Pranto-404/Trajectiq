import {useEffect, useRef, useState} from 'react';
import {animate, motion, useMotionValue, useTransform} from 'motion/react';
import {Chip, Icon, spring, useReducedMotion} from '@/ds/index.js';
import {useGame, selectMargins} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {fmt} from './hooks.js';
import s from './hangar.module.css';

export const SNAPS = [0.18, 0.5, 0.88];
const FULL = SNAPS[SNAPS.length - 1];

/** Index of the snap point whose visible height is nearest to `visible` (a fraction of the viewport). */
export function nearestSnap(visible) {
  let best = 0;
  SNAPS.forEach((v, i) => { if (Math.abs(v - visible) < Math.abs(SNAPS[best] - visible)) best = i; });
  return best;
}

function useViewportHeight() {
  const [h, setH] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight));
  useEffect(() => { const on = () => setH(window.innerHeight); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  return h;
}

/**
 * Mobile parts tray: a non-modal bottom sheet with three snap points (18 / 50 / 88 % of the viewport). Drag the handle (touch or
 * mouse), or use the handle button from the keyboard: Enter / Space cycle the snap points, Arrow Up / Down move one. Choosing a
 * subsystem from the collapsed tray opens it to half height. Under reduced motion it jumps instead of springing.
 */
export function TraySheet({header, children}) {
  const t = useT();
  const reduced = useReducedMotion();
  const vh = useViewportHeight();
  const category = useGame(st => st.category), margins = useGame(selectMargins);
  const [snap, setSnap] = useState(0);
  const base = useMotionValue((FULL - SNAPS[0]) * vh), drag = useMotionValue(0);
  const y = useTransform([base, drag], ([b, d]) => b + d);
  const start = useRef(null), moved = useRef(false);
  const prevCat = useRef(category);

  useEffect(() => {
    const target = (FULL - SNAPS[snap]) * vh;
    if (reduced) base.set(target); else { const c = animate(base, target, spring.soft); return () => c.stop(); }
    return undefined;
  }, [snap, vh, reduced, base]);
  useEffect(() => { if (prevCat.current !== category) { prevCat.current = category; setSnap(s0 => (s0 === 0 ? 1 : s0)); } }, [category]);

  const down = e => { if (reduced) return; start.current = {y: e.clientY, t: performance.now()}; moved.current = false; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = e => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y; if (Math.abs(dy) > 6) moved.current = true;
    // never pull above the top snap point or below the screen edge
    drag.set(Math.max(-((FULL - SNAPS[snap]) * vh), Math.min(SNAPS[snap] * vh, dy)));
  };
  const up = e => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y, dt = Math.max(1, performance.now() - start.current.t), flick = dy / dt * 1000;
    start.current = null; e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!moved.current) { drag.set(0); return; }
    const visible = (SNAPS[snap] * vh - dy - flick * 0.12) / vh;
    drag.set(0); setSnap(nearestSnap(visible));
  };
  const cycle = () => { if (moved.current) { moved.current = false; return; } setSnap(i => (i + 1) % SNAPS.length); };
  const key = e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); setSnap(i => Math.min(SNAPS.length - 1, i + 1)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSnap(i => Math.max(0, i - 1)); }
  };
  const mass = margins.rows.find(r => r.id === 'mass'), cost = margins.rows.find(r => r.id === 'budget');
  const label = [t('Collapsed'), t('Half height'), t('Full height')][snap];
  return (
    <motion.section className={s.traySheet} style={{y, height: FULL * vh}} aria-label={t('Parts tray')} data-snap={snap} data-testid="tray-sheet" data-tour="tray">
      <button type="button" className={s.handle} aria-expanded={snap > 0} aria-label={`${t('Parts tray')}: ${label}. ${t('Press to change height.')}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={cycle} onKeyDown={key}>
        <span className={s.grip} aria-hidden="true" />
        <Icon name="chevron-down" size={16} className={snap === SNAPS.length - 1 ? '' : s.flipUp} />
      </button>
      <div className={s.miniMargins} aria-label={t('Margins')}>
        {mass ? <Chip size="sm" kind={mass.status === 'pass' ? 'pass' : mass.status === 'warn' ? 'warn' : 'fail'}>{t('Mass')} {fmt(mass.margin, 0)} kg</Chip> : null}
        {cost ? <Chip size="sm" kind={cost.status === 'pass' ? 'pass' : cost.status === 'warn' ? 'warn' : 'fail'}>{t('Cost')} {fmt(cost.margin, 0)} cr</Chip> : null}
      </div>
      {header}
      <div className={s.traySheetBody}>{children}</div>
    </motion.section>
  );
}
