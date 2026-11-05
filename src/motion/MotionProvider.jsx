import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {MotionConfig} from 'motion/react';

const ReducedContext = createContext(null);
const QUERY = '(prefers-reduced-motion: reduce)';

function systemPrefersReduced() {
  try { return !!globalThis.matchMedia?.(QUERY)?.matches; } catch { return false; }
}

/** The system preference as a live boolean (updates when the OS setting changes). */
export function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(systemPrefersReduced);
  useEffect(() => {
    const mq = globalThis.matchMedia?.(QUERY);
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/**
 * The single source of truth for reduced motion: system preference OR the in-app toggle (`reduced` prop, usually
 * prefs.reducedMotion). It configures Motion (MotionConfig reducedMotion="always" turns transform and layout animation
 * into instant changes while opacity still fades), sets <html data-motion="reduced"> for CSS, and feeds useReducedMotion().
 */
export function MotionProvider({reduced = false, children}) {
  const system = useSystemReducedMotion();
  const effective = !!(reduced || system);
  useEffect(() => {
    const root = document.documentElement;
    if (effective) root.dataset.motion = 'reduced'; else delete root.dataset.motion;
    document.body.classList.toggle('reduced-motion', effective);
    return () => { delete root.dataset.motion; };
  }, [effective]);
  const value = useMemo(() => effective, [effective]);
  return <ReducedContext.Provider value={value}><MotionConfig reducedMotion={effective ? 'always' : 'user'}>{children}</MotionConfig></ReducedContext.Provider>;
}

/** True when animation must be reduced. Works without a provider (falls back to the system preference). */
export function useReducedMotion() {
  const ctx = useContext(ReducedContext);
  const system = useSystemReducedMotion();
  return ctx === null ? system : ctx;
}
