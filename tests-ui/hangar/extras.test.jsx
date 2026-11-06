import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {screen, act, waitFor} from '@testing-library/react';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {useGame} from '@/store/index.js';
import {loadFeatures} from '@/shell/features.js';
import {translatedKeys} from '@/i18n/index.js';
import {HangarScreen} from '@/features/hangar/HangarScreen.jsx';
import {captureFlip, clearFlip} from '@/features/board/flip.js';
import {resetStore, renderIn, a} from './util.jsx';

const animate = vi.hoisted(() => vi.fn(() => ({stop() {}})));
vi.mock('motion/react', async orig => ({...(await orig()), animate}));

loadFeatures(); // registers every feature's Bengali strings, like the running app
let errors;
beforeEach(() => { resetStore(); animate.mockClear(); clearFlip(); errors = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { a().dispose(); const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0]))); errors.mockRestore(); expect(bad).toEqual([]); vi.restoreAllMocks(); });

const rect = (x, y, width, height) => ({x, y, left: x, top: y, width, height, right: x + width, bottom: y + height});

describe('shared element: scenario card -> hangar title', () => {
  it('the title glides from the card position when motion is allowed', () => {
    const el = document.createElement('span'); el.getBoundingClientRect = () => rect(300, 500, 180, 22); captureFlip(el);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect(40, 90, 240, 30));
    renderIn(<HangarScreen />, {reduced: false});
    expect(animate).toHaveBeenCalledTimes(1);
    const [target, keyframes] = animate.mock.calls[0];
    expect(target.dataset.flipTarget).toBeDefined(); expect(keyframes.x).toEqual([260, 0]); expect(keyframes.y).toEqual([410, 0]); expect(keyframes.scale[1]).toBe(1);
  });

  it('under reduced motion nothing flies, and a stale hand-off is ignored', () => {
    const el = document.createElement('span'); el.getBoundingClientRect = () => rect(300, 500, 180, 22); captureFlip(el);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect(40, 90, 240, 30));
    renderIn(<HangarScreen />, {reduced: true}); expect(animate).not.toHaveBeenCalled();
  });
});

describe('hostile text renders as text', () => {
  it('design name, livery and crew names never become elements or handlers', () => {
    const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    a()['board-mode']({mode: 'crew'}); a()['board-players']({players: 3}); a().setTeamName(0, evil);
    useGame.setState(s => ({design: {...s.design, name: evil, livery: evil}}));
    const {container} = renderIn(<HangarScreen />);
    expect(container.querySelector('img')).toBeNull(); expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toMatch(/<img[^>]*onerror/i);
    expect(screen.getByTestId('design-name').textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('stage contract', () => {
  it('when WebGL is unavailable the stage falls back to the schematic: one button per subsystem, selection flows through the store', async () => {
    renderIn(<HangarScreen />);
    await waitFor(() => expect(document.querySelector('[data-kind="comms"]')).toBeTruthy());
    const spot = document.querySelector('[data-kind="comms"]'); expect(spot.getAttribute('role')).toBe('button');
    act(() => { spot.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); });
    await waitFor(() => expect(useGame.getState().category).toBe('comms'));
    expect(spot.getAttribute('aria-label')).toBe('Communications'); // the part name is not in the name, so it never collides with a part card
  });
});

describe('Bengali', () => {
  it('translates the hangar when the language is switched', async () => {
    renderIn(<HangarScreen />); act(() => a()['toggle-language']());
    expect(await screen.findByRole('button', {name: /উৎক্ষেপণের প্রস্তুতি/})).toBeTruthy();
    expect(screen.getByRole('group', {name: 'উপ-ব্যবস্থা'})).toBeTruthy();
  });

  it('every literal t(...) string of the board and hangar has a Bengali entry', async () => {
    const keys = translatedKeys(), missing = new Set();
    for (const dir of ['board', 'hangar']) {
      const root = path.resolve(__dirname, '../../src/features', dir);
      for (const f of readdirSync(root).filter(x => x.endsWith('.jsx'))) {
        const src = readFileSync(path.join(root, f), 'utf8');
        for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) { const text = m[1].replace(/\\'/g, "'"); if (!keys.has(text)) missing.add(`${dir}/${f}: ${text}`); }
      }
    }
    expect([...missing]).toEqual([]);
  });
});
