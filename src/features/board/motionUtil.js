// Small motion helpers shared by the board and the hangar. Everything animates transform and opacity only, and every form
// has a reduced-motion version taken from the shared motion module (one source of truth for reduced motion).
import {useEffect, useState} from 'react';
import {enterTransition, REDUCED, stagger} from '@/motion/index.js';

/** Staggered enter props for a motion element: 16 px up + fade, 40 ms steps (max 6); opacity-only when reduced. */
export function enterProps(index = 0, reduced = false) {
  if (reduced) return {initial: {opacity: 0}, animate: {opacity: 1, transition: REDUCED}};
  return {initial: {opacity: 0, y: 16}, animate: {opacity: 1, y: 0, transition: {...enterTransition, delay: stagger(index)}}};
}

const FINE = '(hover: hover) and (pointer: fine)';
/** True on a device with a fine pointer and hover (mouse, trackpad). Tilt and hover lift are for these only. */
export function useFinePointer() {
  const [fine, setFine] = useState(() => !!globalThis.matchMedia?.(FINE)?.matches);
  useEffect(() => {
    const mq = globalThis.matchMedia?.(FINE); if (!mq) return undefined;
    const on = () => setFine(mq.matches); on();
    mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on);
  }, []);
  return fine;
}
