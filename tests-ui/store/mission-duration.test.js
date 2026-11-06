import {it, expect} from 'vitest';
import {SCENARIOS} from '@data/scenarios.js';
import {missionFor, presetFor} from '@data/catalog.js';
import {newRun} from '@engine/model.js';
import {computeTelemetry} from '@/store/selectors.js';

it('telemetry progress uses each scenario duration rather than a fixed four-hour campaign', () => {
  for (const scenario of Object.values(SCENARIOS)) {
    const design = {...presetFor(scenario.destination, 'balanced'), scenario: scenario.id};
    const m = missionFor(design), run = newRun(design, 42);
    run.minute = m.duration / 2;
    expect(computeTelemetry(run).clock, scenario.id).toBeCloseTo(.5);
    run.minute = m.duration * 2; expect(computeTelemetry(run).clock).toBe(1);
  }
});
