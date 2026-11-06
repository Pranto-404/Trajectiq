import {useCallback, useSyncExternalStore} from 'react';
import {subscribeLanguage, languageRevision} from './loadLanguage.js';
import {useGame} from '../store/index.js';
import {translate} from './translate.js';

/** const t = useT(); t('Close'); t('Hello {name}', {name}). Re-renders when the language changes. */
export function useT() {
  const lang = useGame(s => s.prefs.language);
  const revision = useSyncExternalStore(subscribeLanguage, languageRevision, languageRevision);
  return useCallback((text, vars) => translate(lang, text, vars), [lang, revision]);
}
export const useLanguage = () => useGame(s => s.prefs.language);
