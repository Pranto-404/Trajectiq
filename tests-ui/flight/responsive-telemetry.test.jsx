import {it, expect, vi} from 'vitest';
import {act, screen} from '@testing-library/react';
import {Telemetry} from '@/features/flight/Telemetry.jsx';
import {newRun, calculate} from '@engine/model.js';
import {PRESETS} from '@data/catalog.js';
import {renderMotion} from './helpers.jsx';

it('keeps telemetry mounted while crossing width and height breakpoints', () => {
  const queries = new Map();
  vi.stubGlobal('matchMedia', query => {
    if (!queries.has(query)) {
      const listeners = new Set();
      queries.set(query, {matches: false, media: query, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn), change(value) { this.matches = value; listeners.forEach(fn => fn(this)); }});
    }
    return queries.get(query);
  });
  const run = newRun(PRESETS.balanced), a = calculate(run.design);
  const view = renderMotion(<Telemetry run={run} analysis={a} values={[run.battery, run.backlog, run.science, run.fuel]} />);
  try {
    for (const [width, height] of [[true, false], [true, true], [false, true], [false, false]]) {
      act(() => { queries.get('(max-width: 899.98px)').change(width); queries.get('(max-height: 760px)').change(height); });
      expect(screen.getByRole('region', {name: 'Telemetry'})).toBeTruthy();
      expect(screen.getAllByRole('meter')).toHaveLength(4);
    }
  } finally { view.unmount(); vi.unstubAllGlobals(); }
});
