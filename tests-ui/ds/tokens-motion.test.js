import {describe, it, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {variants, variantsFor, REDUCED, reduce, stagger, duration, spring, ease} from '@/motion/index.js';

const css = readFileSync(path.resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const token = name => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('tokens', () => {
  const surfaces = ['bg-0', 'bg-1', 'surface-1', 'surface-2', 'surface-3'];
  it('every text colour has AA contrast (>= 4.5:1) on every surface', () => {
    for (const t of ['text-1', 'text-2', 'text-3']) for (const sf of surfaces) expect(contrast(token(t), token(sf)), `${t} on ${sf}`).toBeGreaterThanOrEqual(4.5);
  });
  it('accent and status hues are readable on every surface', () => {
    for (const h of ['lime-500', 'cyan-400', 'amber-400', 'red-400', 'violet-400', 'role-commander', 'role-engineer', 'role-science', 'role-power']) for (const sf of surfaces) expect(contrast(token(h), token(sf)), `${h} on ${sf}`).toBeGreaterThanOrEqual(4.5);
  });
  it('dark text on the lime primary button is AA', () => { expect(contrast(token('on-lime'), token('lime-500'))).toBeGreaterThanOrEqual(4.5); expect(contrast(token('on-lime'), token('lime-600'))).toBeGreaterThanOrEqual(4.5); });
  it('exposes the planned scales', () => {
    for (const k of ['space-1', 'space-8', 'radius-chip', 'radius-control', 'radius-panel', 'radius-pill', 'z-stage', 'z-hud', 'z-sheet', 'z-dialog', 'z-toast', 'z-incident', 'dur-instant', 'dur-fast', 'dur-base', 'dur-slow', 'dur-scene', 'ease-enter', 'ease-exit', 'ease-camera', 'font-ui', 'font-mono', 'target-min']) expect(css).toContain(`--${k}:`);
    expect(css).toMatch(/pointer: coarse[\s\S]*--target-min: 44px/); expect(css).toContain('[data-density="compact"]'); expect(css).toContain('[data-motion="reduced"]');
  });
  it('global CSS never removes the focus ring and defines tabular numerals', () => {
    const base = readFileSync(path.resolve(process.cwd(), 'src/styles/base.css'), 'utf8');
    expect(base).toMatch(/:focus-visible\s*{[^}]*outline:\s*2px solid var\(--focus\)/); expect(base).not.toMatch(/outline:\s*(none|0)/); expect(base).toContain('tabular-nums');
  });
  it('component styles animate only transform, opacity and colour-ish properties (no layout properties in transitions)', () => {
    const dir = path.resolve(process.cwd(), 'src/ds');
    for (const f of ['Button', 'Chip', 'Gauge', 'Panel', 'Segmented', 'Sheet', 'Dialog', 'Toast', 'PartCard', 'Slider', 'Concept']) {
      const text = readFileSync(path.join(dir, `${f}.module.css`), 'utf8');
      for (const m of text.matchAll(/transition:\s*([^;]+);/g)) expect(m[1], `${f}: ${m[1]}`).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding)\b\s/);
    }
  });
});

describe('motion presets (plan 2.6)', () => {
  it('match the planned durations, easings and springs', () => {
    expect(duration).toMatchObject({instant: 0.09, fast: 0.16, base: 0.24, slow: 0.42, scene: 0.9});
    expect(ease.enter).toEqual([0.2, 0, 0, 1]); expect(ease.exit).toEqual([0.4, 0, 1, 1]); expect(ease.camera).toEqual([0.65, 0, 0.35, 1]);
    expect(spring.snappy).toMatchObject({stiffness: 520, damping: 34, mass: 0.9}); expect(spring.soft).toMatchObject({stiffness: 220, damping: 26}); expect(spring.snap).toMatchObject({stiffness: 420, damping: 26});
    expect(spring.needle).toMatchObject({stiffness: 120, damping: 20}); expect(spring.press).toMatchObject({stiffness: 700, damping: 30});
  });
  it('reduced variants keep opacity and drop every transform and spring', () => {
    for (const [name, v] of Object.entries(variants)) {
      const r = variantsFor(v, true);
      for (const state of Object.values(r)) { for (const k of ['x', 'y', 'scale', 'rotate']) expect(state, `${name}.${k}`).not.toHaveProperty(k); expect(state.transition).toBe(REDUCED); }
    }
    expect(variantsFor(variants.fadeUp, true).animate.opacity).toBe(1); expect(variantsFor(variants.fadeUp, false)).toBe(variants.fadeUp);
    expect(REDUCED.duration).toBeLessThanOrEqual(0.12);
  });
  it('reduce() and stagger() obey the flag; stagger is 40 ms capped at 6 children', () => {
    expect(reduce(true, spring.soft)).toBe(REDUCED); expect(reduce(false, spring.soft)).toBe(spring.soft);
    expect(stagger(2)).toBeCloseTo(0.08); expect(stagger(50)).toBeCloseTo(0.2); expect(stagger(3, true)).toBe(0);
  });
});
