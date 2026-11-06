import {registerStrings} from './translate.js';
import {normalizeLanguage} from './locales.js';
const packs = import.meta.glob('./locales/*.json');
const pending = new Map();
let revision = 0;
const listeners = new Set();
export const subscribeLanguage = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const languageRevision = () => revision;
export function loadLanguage(code) {
  code = normalizeLanguage(code);
  if (code === 'en' || code === 'bn') return Promise.resolve();
  if (!pending.has(code)) pending.set(code, (async () => {
    try {
      const pack = await packs[`./locales/${code}.json`]();
      registerStrings(code, pack.default);
      revision++; listeners.forEach(fn => fn());
    } catch (error) { pending.delete(code); throw error; }
  })());
  return pending.get(code);
}
