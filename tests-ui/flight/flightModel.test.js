import {describe, it, expect} from 'vitest';
import {calculate, newRun, advance, resolve} from '@engine/model.js';
import {PRESETS} from '@data/catalog.js';
import {SCENARIOS} from '@data/scenarios.js';
import {computeFlows, orbitBands, nextOrbitEvent, commandLock, clockLock, historyAt, pastView, directionWord, batteryStatus, recorderStatus, OPERATION_MODES} from '@/features/flight/flightModel.js';

const toOps = design => { let r = newRun(design); while (r.phase !== 'operations') r = r.crisis ? resolve(r, r.crisis.actions.find(x => !x.disabled).id) : advance(r); return r; };

describe('flight model', () => {
  const a = calculate(PRESETS.balanced);

  it('orbit bands tile the whole campaign (sunlight, contact, shadow) for any duration', () => {
    for (const duration of [240, 720]) {
      const bands = orbitBands(a, duration);
      expect(bands[0].from).toBe(0); expect(bands.at(-1).to).toBeCloseTo(duration, 6);
      for (let i = 1; i < bands.length; i++) expect(bands[i].from).toBeCloseTo(bands[i - 1].to, 6);
      expect(new Set(bands.map(b => b.kind))).toEqual(new Set(['sun', 'contact', 'eclipse']));
    }
  });

  it('every scenario produces bands inside its own duration (no 240-minute assumption)', () => {
    for (const sc of Object.values(SCENARIOS)) {
      const design = {...PRESETS.balanced, destination: sc.destination, scenario: sc.id};
      const an = calculate(design), bands = orbitBands(an, an.m.duration);
      expect(bands.at(-1).to).toBeCloseTo(an.m.duration, 6);
      expect(bands.every(b => b.to <= an.m.duration + 1e-6)).toBe(true);
    }
  });

  it('the orbit position agrees with the engine contact and eclipse flags (read from run.history)', () => {
    let r = toOps(PRESETS.balanced);
    for (let i = 0; i < 40 && !r.done && !r.crisis; i++) r = advance(r);
    expect(r.history.length).toBeGreaterThan(10);
    const cs = a.period - a.m.eclipseMinutes - a.m.contactMinutes, es = a.period - a.m.eclipseMinutes;
    for (const h of r.history) {
      const pos = nextOrbitEvent(a, h.minute - h.dt / 2).position;
      expect(pos >= es).toBe(h.eclipse); expect(pos >= cs && pos < es).toBe(h.contact);
    }
  });

  it('flows: sunlight powers the loads, eclipse starves the array, a full recorder is starved', () => {
    const run = toOps(PRESETS.balanced);
    const lit = computeFlows({...run, eclipse: false, contact: false, safe: false, mode: 'science', backlog: 0}, a);
    expect(lit.solarW).toBeGreaterThan(0); expect(lit.status.array).toBe('flow'); expect(lit.dataInMBs).toBeGreaterThan(0); expect(lit.payloadW).toBeGreaterThan(0);
    const dark = computeFlows({...run, eclipse: true, contact: false, safe: false, mode: 'science'}, a);
    expect(dark.solarW).toBe(0); expect(dark.status.array).toBe('starved'); expect(dark.payloadW).toBe(0);
    const aggressive = computeFlows({...run, eclipse: true, contact: false, safe: false, mode: 'aggressive'}, a);
    expect(aggressive.payloadW).toBeGreaterThan(0);
    const full = computeFlows({...run, backlog: a.c.storage.capacity, eclipse: false, contact: false}, a);
    expect(full.status.recorder).toBe('starved');
    const tx = computeFlows({...run, backlog: 50, eclipse: false, contact: true, safe: false, mode: 'science'}, a);
    expect(tx.downMBs).toBeGreaterThan(0); expect(tx.status.downlink).toBe('flow'); expect(tx.txW).toBe(a.c.comms.power);
    const coast = computeFlows({...run, backlog: 50, contact: true, eclipse: false, mode: 'coast'}, a);
    expect(coast.downMBs).toBe(0); expect(coast.payloadW).toBe(0);
    const safe = computeFlows({...run, safe: true}, a);
    expect(safe.loadW).toBeCloseTo(a.base * 0.65, 6); expect(safe.status.loads).toBe('starved');
  });

  it('locks have visible reasons', () => {
    const r = toOps(PRESETS.balanced);
    expect(commandLock({...r, phase: 'transfer'}, false)).toMatch(/operations phase/);
    expect(commandLock(r, true)).toMatch(/crisis response/);
    expect(commandLock(r, false)).toBe('');
    expect(clockLock(r, true)).toMatch(/crisis response/); expect(clockLock(r, false)).toBe('');
    expect(commandLock({...r, done: true}, false)).toMatch(/No mission/);
    expect(OPERATION_MODES.map(m => m.id)).toEqual(['science', 'aggressive', 'coast', 'downlink']);
  });

  it('history helpers are read-only', () => {
    const run = toOps(PRESETS.balanced); let r = run; for (let i = 0; i < 6; i++) r = advance(r);
    const frozen = JSON.stringify(r), e = historyAt(r.history, r.history[2].minute);
    expect(e).toBe(r.history[2]); const view = pastView(r, e, a.c.power.battery);
    expect(view.minute).toBe(e.minute); expect(view.battery).toBeCloseTo(e.battery / 100 * a.c.power.battery, 6);
    expect(JSON.stringify(r)).toBe(frozen); expect(historyAt([], 5)).toBeNull();
  });

  it('direction words and gauge statuses', () => {
    expect(directionWord(2)).toBe('higher'); expect(directionWord(-3)).toBe('much lower'); expect(directionWord(0)).toBe('about the same');
    expect(/\d/.test(Object.values({a: directionWord(1), b: directionWord(-1)}).join(''))).toBe(false);
    expect(batteryStatus(0.5)).toBe('nominal'); expect(batteryStatus(0.25)).toBe('warning'); expect(batteryStatus(0.1)).toBe('critical');
    expect(recorderStatus(0.5)).toBe('nominal'); expect(recorderStatus(0.8)).toBe('warning'); expect(recorderStatus(0.95)).toBe('critical');
  });
});
