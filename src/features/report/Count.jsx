import {useEffect} from 'react';
import {animate, motion, useMotionValue, useTransform} from 'motion/react';
import {ease, useReducedMotion} from '@/ds/index.js';
import {fmt} from './format.js';

/** Number that counts up in 600 ms; under reduced motion it shows the final value immediately. Hidden from AT: pair with a text label. */
export function Count({value, digits = 0, delay = 0}) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? value : 0);
  const text = useTransform(mv, v => fmt(v, digits));
  useEffect(() => {
    if (reduced) { mv.set(value); return undefined; }
    const c = animate(mv, value, {duration: 0.6, delay, ease: ease.enter});
    return () => c.stop();
  }, [value, reduced, mv, delay]);
  return <motion.span className="num" aria-hidden="true">{text}</motion.span>;
}
