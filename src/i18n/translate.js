import {BN} from './bn.js';
import {LANGUAGES} from './locales.js';

export {LANGUAGES} from './locales.js';
const extra = Object.create(null);
extra.bn = Object.create(null);

/** Features can add their own Bengali strings: registerStrings('bn', {'English text': 'বাংলা'}). */
export function registerStrings(lang, entries) {
  if (!LANGUAGES.includes(lang) || !entries || typeof entries !== 'object') return;
  const target = extra[lang] ??= Object.create(null);
  for (const [key, value] of Object.entries(entries)) if (typeof value === 'string') target[key] = value;
}

/**
 * translate('bn', 'Close') -> 'বন্ধ করুন'. English (or a missing key) returns the source text.
 * `{name}` placeholders are filled after translation: translate(lang, 'Hello {name}', {name: 'Ada'}).
 */
export function translate(lang, text, vars) {
  let out = extra[lang]?.[text] ?? (lang === 'bn' && Object.hasOwn(BN, text) ? BN[text] : undefined) ?? text;
  if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);
  return out;
}

/** Keys with a Bengali translation (used by the coverage test for the primary path). */
export const translatedKeys = () => new Set([...Object.keys(BN), ...Object.keys(extra.bn)]);

/** Localized quick questions still invoke the same tested engine intent. */
export function canonicalQuestion(lang, question) {
  const normalized = String(question).normalize('NFKC').trim().toLocaleLowerCase();
  const intents = ['Mission status', 'Review my design', 'Why is my battery dropping?', 'Compare crisis choices', 'Explain my result'];
  return intents.find(key => translate(lang, key).normalize('NFKC').trim().toLocaleLowerCase() === normalized) ?? question;
}
