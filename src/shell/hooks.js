import {useEffect, useState} from 'react';
import {useGame} from '../store/index.js';
import {loadLanguage} from '../i18n/loadLanguage.js';

/** <html lang> follows the language preference (en | bn). */
export function useDocumentLanguage() {
  const lang = useGame(s => s.prefs.language);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    loadLanguage(lang).catch(() => { /* English source remains usable offline. */ });
  }, [lang]);
}

/** data-density="compact" under 820 px viewport height, so short laptop screens fit the mission-control layout. */
export function useDensity(threshold = 820) {
  useEffect(() => {
    const apply = () => { document.documentElement.dataset.density = window.innerHeight < threshold ? 'compact' : 'regular'; };
    apply(); window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [threshold]);
}

/**
 * Browser Back/Forward follow the screens. Each screen change pushes a history entry (same URL, no hash).
 * During an active flight Back never leaves the flight screen (it cannot silently abandon the mission).
 */
export function useHistorySync() {
  const screen = useGame(s => s.screen);
  const go = useGame(s => s.actions.go);
  useEffect(() => {
    const h = window.history;
    if (!h?.state || h.state.tq !== screen) {
      if (h.state?.tq === undefined) h.replaceState({tq: screen}, ''); else h.pushState({tq: screen}, '');
    }
  }, [screen]);
  useEffect(() => {
    const onPop = e => {
      const target = e.state?.tq;
      const s = useGame.getState();
      if (!target) return;
      if (s.run && !s.run.done && target !== 'flight') { window.history.pushState({tq: 'flight'}, ''); go('flight'); return; }
      if (target === 'flight' && !s.run) { window.history.replaceState({tq: s.screen}, ''); return; }
      go(target);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [go]);
}

/** Viewport narrower than `px`. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => !!globalThis.matchMedia?.(query)?.matches);
  useEffect(() => {
    const mq = globalThis.matchMedia?.(query); if (!mq) return undefined;
    const on = () => setMatches(mq.matches);
    mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return matches;
}
