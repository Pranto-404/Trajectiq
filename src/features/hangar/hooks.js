import {useEffect, useState} from 'react';
import {useGame} from '@/store/index.js';

/** True while a launched flight has not finished: hardware is read-only. */
export const useLocked = () => useGame(st => !!(st.run && !st.run.done));

/** Clears any ghost preview when the component unmounts or `deps` change (so a stale preview never lingers). */
export function useClearPreviewOn(...deps) {
  useEffect(() => () => useGame.getState().actions.clearPreview(), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Phone chrome auto-hide: true while the page is being scrolled down (past the first screen), false as soon as the player scrolls
 * up, is near the top, or reaches the end. Passive listener, one frame of work per scroll burst.
 */
export function useScrollHide(enabled) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) { setHidden(false); return undefined; }
    let last = window.scrollY, queued = false;
    const on = () => {
      if (queued) return; queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY, dy = y - last, end = y + window.innerHeight >= document.documentElement.scrollHeight - 24;
        if (y < 90 || end) setHidden(false);
        else if (dy > 8) setHidden(true);
        else if (dy < -8) setHidden(false);
        if (Math.abs(dy) > 8) last = y;
      });
    };
    window.addEventListener('scroll', on, {passive: true});
    return () => window.removeEventListener('scroll', on);
  }, [enabled]);
  return hidden;
}

export const fmt = (v, n = 0) => Number(v).toLocaleString('en-US', {maximumFractionDigits: n, minimumFractionDigits: n});
export const signed = (v, n = 1) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmt(Math.abs(v), n)}`;
