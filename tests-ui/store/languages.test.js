import {describe, it, expect} from 'vitest';
import {makeStore} from './harness.js';
import {loadLanguage} from '@/i18n/loadLanguage.js';
import {LANGUAGES, LOCALES} from '@/i18n/locales.js';
import {translate, canonicalQuestion, registerStrings} from '@/i18n/translate.js';
import {newRun, calculate} from '@engine/model.js';
import {presetFor} from '@data/catalog.js';
const packs = import.meta.glob('../../src/i18n/locales/*.json', {eager: true, import: 'default'});
describe('12-language release', () => {
  it('preserves all selected languages across save/restore without modifying the design', () => {
    expect(LANGUAGES).toHaveLength(12);
    for (const code of LANGUAGES) {
      const h = makeStore(), design = h.get().design;
      h.a.setPref('language', code);
      expect(h.get().design).toEqual(design);
      const restored = makeStore(h.stored());
      expect(restored.get().prefs.language).toBe(code);
      h.a.dispose(); restored.a.dispose();
    }
    expect(LOCALES.filter(l => l.dir === 'rtl').map(l => l.code)).toEqual(['ar']);
  });
  it('loads every pack, keeps fallback and interpolation intact, and has matching coverage', async () => {
    let expected;
    for (const [path, pack] of Object.entries(packs)) {
      const code = path.split('/').pop().split('.')[0];
      await loadLanguage(code);
      expect(translate(code, 'Build selected mission')).not.toBe('Build selected mission');
      expect(translate(code, 'Untranslated {value}', {value: 42})).toBe('Untranslated 42');
      const keys = Object.keys(pack).sort(); expected ??= keys;
      expect(keys).toEqual(expected);
      for (const [key, value] of Object.entries(pack)) {
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value.match(/\{\w+\}/g) || []).toEqual(key.match(/\{\w+\}/g) || []);
      }
    }
  });
  it('localized questions read the actual flight telemetry without mutating it', async () => {
    const h = makeStore(), design = presetFor('mars', 'balanced'), a = calculate(design);
    const run = {...newRun(design), phase: 'operations', minute: 35, battery: a.c.power.battery * .2, backlog: 0};
    h.store.setState({run, screen: 'flight'});
    for (const code of LANGUAGES.filter(c => !['en', 'bn'].includes(c))) {
      await loadLanguage(code); h.a.setPref('language', code);
      const q = translate(code, 'Mission status');
      expect(canonicalQuestion(code, q)).toBe('Mission status');
      const result = await h.a.ask(q);
      expect(result.text).toContain('Battery 20%');
      expect(result.text).toContain('T+35');
      expect(h.get().run).toEqual(run);
    }
    h.a.dispose();
  });
  it('unknown language preferences safely use English', () => {
    const h = makeStore(); h.a.setPref('language', '../evil');
    expect(h.get().prefs.language).toBe('en'); h.a.dispose();
  });
  it('does not resolve inherited object properties or allow prototype registration', () => {
    for (const code of LANGUAGES) expect(translate(code, 'constructor')).toBe('constructor');
    registerStrings('__proto__', {polluted: 'bad'});
    expect({}.polluted).toBeUndefined();
  });
});
