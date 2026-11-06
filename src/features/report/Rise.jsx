import {motion} from 'motion/react';
import {useReducedMotion, variants, variantsFor, stagger} from '@/ds/index.js';

/** Staggered enter (16 px up + fade, 40 ms steps, at most six) that collapses to a short fade under reduced motion. */
export function Rise({i = 0, delay = 0, className = '', children, ...rest}) {
  const reduced = useReducedMotion();
  const v = variantsFor(variants.fadeUp, reduced);
  const animate = {...v.animate, transition: {...v.animate.transition, delay: stagger(i, reduced) + (reduced ? 0 : delay)}};
  return <motion.div className={className} initial={v.initial} animate={animate} {...rest}>{children}</motion.div>;
}
