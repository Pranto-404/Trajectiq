// Simulation clock: legacy cadence, pauses on crisis / sheet / hidden tab, resumes only what it paused.
import {describe, it, expect} from 'vitest';
import {announce} from '@/ds/announce.js';
import {subscribeAnnouncements} from '@/ds/announce.js';
import {makeStore} from './harness.js';

const interval = h => [...h.intervals.values()][0];
function fakeDocument() {
  const listeners = {}; const doc = {hidden: false, addEventListener: (t, fn) => { listeners[t] = fn; }, removeEventListener: t => { delete listeners[t]; }, setHidden(v) { doc.hidden = v; listeners.visibilitychange?.(); }};
  return doc;
}

describe('simulation clock', () => {
  it('ticks every 1.9 s outside operations and 1.4 s / speed inside operations', () => {
    const h = makeStore(); h.a.init(); h.a['game-launch']();
    expect(h.get().run.phase).toBe('launch'); expect(h.get().playing).toBe(true); expect(interval(h).ms).toBe(1900);
    let guard = 0; while (h.get().run.phase !== 'operations' && guard++ < 60) { h.tickTimer(); }
    expect(h.get().run.phase).toBe('operations'); expect(interval(h).ms).toBe(1400); // restarted when the phase changed
    h.a['speed-3'](); expect(interval(h).ms).toBeCloseTo(1400 / 3); h.a['speed-10'](); expect(interval(h).ms).toBe(140);
    h.a.setSpeed(1000); expect(h.get().speed).toBe(10);
    h.a['speed-1'](); expect(interval(h).ms).toBe(1400);
    expect(h.intervals.size).toBe(1);
  });

  it('play toggles; step advances one slice while paused; the clock stops itself on a crisis', () => {
    const h = makeStore(); h.a.init(); h.a['preset-fragile'](); h.a['game-launch']();
    h.a.play(); expect(h.get().playing).toBe(false); expect(h.intervals.size).toBe(0);
    const r0 = h.get().run; h.a.step(); expect(h.get().run).not.toBe(r0); expect(h.get().playing).toBe(false);
    h.a.play(); expect(h.get().playing).toBe(true);
    const heard = []; const off = subscribeAnnouncements(m => heard.push(m));
    for (let i = 0; i < 400 && !h.get().run.crisis; i++) { if (h.get().playing) h.tickTimer(); else break; }
    off();
    expect(h.get().run.crisis).toBeTruthy(); expect(h.get().playing).toBe(false); expect(h.intervals.size).toBe(0);
    expect(heard.some(m => m.assertive && /Decision required/.test(m.text))).toBe(true);
    h.a.play(); expect(h.get().playing).toBe(false); // cannot resume with a decision pending
  });

  it('a hidden tab pauses the clock and a visible tab resumes it, unless the player paused or a sheet opened', () => {
    const doc = fakeDocument(); const h = makeStore(undefined, {document: () => doc}); h.a.init(); h.a['game-launch']();
    expect(h.get().playing).toBe(true);
    doc.setHidden(true); expect(h.get().playing).toBe(false); expect(h.get().hidden).toBe(true); expect(h.intervals.size).toBe(0);
    doc.setHidden(false); expect(h.get().playing).toBe(true); expect(h.get().hidden).toBe(false); expect(h.intervals.size).toBe(1);
    h.a.pause(); doc.setHidden(true); doc.setHidden(false); expect(h.get().playing).toBe(false); // manual pause stays
    h.a.play(); doc.setHidden(true); h.a.mentor(); doc.setHidden(false); expect(h.get().playing).toBe(false); // sheet open: no resume
    h.a.dispose();
  });

  it('dispose clears the timer', () => {
    const h = makeStore(); h.a.init(); h.a['game-launch'](); expect(h.intervals.size).toBe(1); h.a.dispose(); expect(h.intervals.size).toBe(0);
  });

  it('telemetry threshold announcements reach the live region', () => {
    const h = makeStore(); h.a.init(); h.a['preset-fragile'](); h.a['game-launch']();
    const heard = []; const off = subscribeAnnouncements(m => heard.push(m.text));
    for (let i = 0; i < 500 && !h.get().run.done; i++) { const r = h.get().run; if (r.crisis) h.a.resolve(r.crisis.actions.find(a => !a.disabled).id); else { h.a.play(); h.tickTimer(); } }
    off();
    expect(heard.some(t => /^Phase:/.test(t))).toBe(true);
    expect(heard.some(t => /Mission complete/.test(t))).toBe(true);
    announce('');
  });

  it('install announces mass and margin in words', () => {
    const h = makeStore(); h.a.init(); const heard = []; const off = subscribeAnnouncements(m => heard.push(m.text));
    h.a.install('power', 'compact'); off();
    expect(heard[0]).toMatch(/^Installed Compact solar kit\. Mass \d+ of \d+ kilograms, -?\d+ kilograms margin\.$/);
  });
});
