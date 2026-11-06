import {useEffect} from 'react';
import {useGame} from '@/store/index.js';

/** True while a launched flight has not finished: hardware is read-only. */
export const useLocked = () => useGame(st => !!(st.run && !st.run.done));

/** Clears any ghost preview when the component unmounts or `deps` change (so a stale preview never lingers). */
export function useClearPreviewOn(...deps) {
  useEffect(() => () => useGame.getState().actions.clearPreview(), deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export const fmt = (v, n = 0) => Number(v).toLocaleString('en-US', {maximumFractionDigits: n, minimumFractionDigits: n});
export const signed = (v, n = 1) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${fmt(Math.abs(v), n)}`;
