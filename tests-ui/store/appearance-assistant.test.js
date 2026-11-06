import {it, expect} from 'vitest';
import {makeStore} from './harness.js';
it('persists both themes and normalizes unsupported values', () => {
  const h = makeStore(); expect(h.get().prefs.theme).toBe('dark');
  h.a.setPref('theme', 'light'); expect(makeStore(h.stored()).get().prefs.theme).toBe('light');
  h.a.setPref('theme', 'dark'); expect(makeStore(h.stored()).get().prefs.theme).toBe('dark');
  h.a.setPref('theme', 'unsupported'); expect(h.get().prefs.theme).toBe('dark');
});
it('answers in place without resetting the open assistant panel', async () => {
  const h = makeStore(); h.a.mentor(); const sheet = h.get().sheet;
  await h.a.ask('Review my design'); expect(h.get().sheet).toBe(sheet); expect(h.get().chat).toHaveLength(1);
});
it('assistant proposals respect crew ownership', async () => {
  const h = makeStore(); h.a['board-mode']({mode: 'crew'}); h.a['board-players']({players: 4});
  const before = h.get().design;
  await h.a.ask('What if fuel = 45'); expect(h.get().chat[0].answer.proposal).toBeTruthy();
  h.a.applyAssistant(0); expect(h.get().design).toEqual(before);
});
