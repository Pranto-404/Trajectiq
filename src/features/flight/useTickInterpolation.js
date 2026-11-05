import {useEffect, useRef, useState} from 'react';
import {useGame} from '@/store/index.js';
import {lerp} from './flightModel.js';

/**
 * Smooth values between simulation ticks. The simulation advances in discrete steps (about every 1.9 s, or 1.4 s / speed in
 * operations). `target` is a list of numbers (the latest tick); the hook returns the same list, moving linearly from the
 * previous tick's values to the new ones over `periodMs`, so gauges, the playhead and the flow widths move continuously instead
 * of jumping. It never extrapolates past the latest tick: what it shows is always a value the engine has produced.
 *
 * Snaps to the target when: motion is reduced, the clock is not running (a manual step or a paused run shows the true value
 * at once and lets the gauge needle spring do the easing), the tab is hidden, or the list changes length.
 * Updates are throttled to ~25 Hz; the needle springs inside the gauges fill in the rest.
 */
export function useTickInterpolation(target, {running, periodMs, reduced}) {
  const hidden = useGame(s => s.hidden);
  const [shown, setShown] = useState(target);
  const state = useRef({from: target, to: target, start: 0, last: target});
  const key = target.join('|');

  useEffect(() => {
    const st = state.current;
    const snap = reduced || !running || hidden || target.length !== st.to.length || typeof requestAnimationFrame !== 'function';
    if (snap) { st.from = target; st.to = target; st.last = target; setShown(target); return undefined; }
    st.from = st.last; st.to = target; st.start = performance.now();
    let raf = 0, lastPaint = 0;
    const frame = now => {
      const t = periodMs > 0 ? (now - st.start) / periodMs : 1;
      if (now - lastPaint >= 40 || t >= 1) {
        lastPaint = now;
        const next = st.to.map((v, i) => lerp(st.from[i], v, t));
        st.last = next; setShown(next);
      }
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, running, periodMs, reduced, hidden]);

  return shown;
}

/** The store's tick period in ms for the current phase and speed (same formula as the store's clock). */
export const tickPeriod = (phase, speed) => phase !== 'operations' ? 1900 : Math.max(100, 1400 / (speed || 1));
