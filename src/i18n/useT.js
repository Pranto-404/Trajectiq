import {useCallback} from 'react';
import {useGame} from '../store/index.js';
import {translate} from './translate.js';

/** const t = useT(); t('Close'); t('Hello {name}', {name}). Re-renders when the language changes. */
export function useT() {
  const lang = useGame(s => s.prefs.language);
  return useCallback((text, vars) => translate(lang, text, vars), [lang]);
}
export const useLanguage = () => useGame(s => s.prefs.language);
