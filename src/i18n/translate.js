import {BN} from './bn.js';

export const LANGUAGES = ['en', 'bn'];
const extra = {bn: {}};

/** Features can add their own Bengali strings: registerStrings('bn', {'English text': 'বাংলা'}). */
export function registerStrings(lang, entries) { if (lang === 'bn') Object.assign(extra.bn, entries); }

/**
 * translate('bn', 'Close') -> 'বন্ধ করুন'. English (or a missing key) returns the source text.
 * `{name}` placeholders are filled after translation: translate(lang, 'Hello {name}', {name: 'Ada'}).
 */
export function translate(lang, text, vars) {
  let out = lang === 'bn' ? (extra.bn[text] ?? BN[text] ?? text) : text;
  if (vars) out = String(out).replace(/\{(\w+)\}/g, (m, k) => k in vars ? String(vars[k]) : m);
  return out;
}

/** Keys with a Bengali translation (used by the coverage test for the primary path). */
export const translatedKeys = () => new Set([...Object.keys(BN), ...Object.keys(extra.bn)]);
