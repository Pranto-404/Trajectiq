// Motion language (plan section 2.6). Seconds, because Motion takes seconds. CSS mirrors live in tokens.css.
// Principles: motion explains cause and effect; UI is quick, 3D is weighty; only transform and opacity animate;
// everything is interruptible; every animation has a reduced-motion form (see `reduce()`).

export const duration = {instant: 0.09, fast: 0.16, base: 0.24, slow: 0.42, scene: 0.9, cinematic: 1.5};
export const ease = {enter: [0.2, 0, 0, 1], exit: [0.4, 0, 1, 1], camera: [0.65, 0, 0.35, 1]};

export const spring = {
  snappy: {type: 'spring', stiffness: 520, damping: 34, mass: 0.9},   // UI
  soft: {type: 'spring', stiffness: 220, damping: 26},                // sheets, layout
  snap: {type: 'spring', stiffness: 420, damping: 26},                // part seating, about 4 % overshoot
  needle: {type: 'spring', stiffness: 120, damping: 20},              // gauges
  press: {type: 'spring', stiffness: 700, damping: 30}                // button press
};

/** Exit is 60 % of the enter duration with the exit easing. */
export const exitTransition = {duration: duration.base * 0.6, ease: ease.exit};
export const enterTransition = {duration: duration.base, ease: ease.enter};

/** Reduced-motion form of any transition: a short opacity-only cross-fade (<= 120 ms), no springs. */
export const REDUCED = {duration: 0.12, ease: 'linear'};
export const reduce = (reduced, transition) => reduced ? REDUCED : transition;

/** Variants. With reduced motion `variantsFor` strips every transform and keeps opacity. */
export const variants = {
  fade: {initial: {opacity: 0}, animate: {opacity: 1, transition: enterTransition}, exit: {opacity: 0, transition: exitTransition}},
  fadeUp: {initial: {opacity: 0, y: 16}, animate: {opacity: 1, y: 0, transition: enterTransition}, exit: {opacity: 0, y: -8, transition: exitTransition}},
  scaleIn: {initial: {opacity: 0, scale: 0.96}, animate: {opacity: 1, scale: 1, transition: enterTransition}, exit: {opacity: 0, scale: 0.98, transition: exitTransition}},
  toast: {initial: {opacity: 0, y: 12}, animate: {opacity: 1, y: 0, transition: enterTransition}, exit: {opacity: 0, y: 6, transition: exitTransition}},
  sideSheet: {initial: {x: '100%'}, animate: {x: 0, transition: spring.soft}, exit: {x: '100%', transition: {duration: duration.base, ease: ease.exit}}},
  bottomSheet: {initial: {y: '100%'}, animate: {y: 0, transition: spring.soft}, exit: {y: '100%', transition: {duration: duration.base, ease: ease.exit}}},
  scrim: {initial: {opacity: 0}, animate: {opacity: 1, transition: {duration: 0.2}}, exit: {opacity: 0, transition: {duration: 0.15}}}
};

const TRANSFORM_KEYS = ['x', 'y', 'scale', 'rotate', 'scaleX', 'scaleY'];
function stripState(state) {
  if (!state || typeof state !== 'object') return state;
  const out = {};
  for (const [k, v] of Object.entries(state)) if (!TRANSFORM_KEYS.includes(k)) out[k] = k === 'transition' ? REDUCED : v;
  if (!('transition' in out) || out.transition !== REDUCED) out.transition = REDUCED;
  return out;
}
/** variantsFor(variants.fadeUp, reducedFlag) -> the same variant, or its opacity-only reduced form. */
export function variantsFor(v, reduced) {
  if (!reduced) return v;
  return Object.fromEntries(Object.entries(v).map(([k, state]) => [k, stripState(state)]));
}

/** Stagger helper: 40 ms steps, at most 6 children. */
export const stagger = (index, reduced = false) => reduced ? 0 : Math.min(index, 5) * 0.04;
