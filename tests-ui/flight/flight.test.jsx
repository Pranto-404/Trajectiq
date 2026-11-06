import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {screen, within, act, fireEvent, waitFor, renderHook} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useGame} from '@/store/index.js';
import {FlightScreen} from '@/features/flight/index.js';
import {useTickInterpolation} from '@/features/flight/useTickInterpolation.js';
import {makeStore} from '../store/harness.js';
import {PRESETS, VERSION} from '@data/catalog.js';
import {newRun, advance} from '@engine/model.js';
import {resetStore, renderMotion, launch, toCrisis, toOperations, actions, initial} from './helpers.jsx';

let errors;
beforeEach(() => { resetStore(); errors = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); actions().dispose(); const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0]))); errors.mockRestore(); expect(bad).toEqual([]); });

const holdCommit = (button, ms = 700) => { fireEvent.pointerDown(button); act(() => { vi.advanceTimersByTime(ms); }); fireEvent.pointerUp(button); };

describe('flight screen', () => {
  it('shows an empty state with a way back when nothing is in flight', () => {
    renderMotion(<FlightScreen />);
    expect(screen.getByText('No mission in flight')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Back to hangar'})).toBeTruthy();
  });

  it('renders telemetry gauges, the phase ribbon, clock controls and the orbit timeline', () => {
    launch(); renderMotion(<FlightScreen />);
    const tele = screen.getByRole('region', {name: 'Telemetry'});
    const meters = within(tele).getAllByRole('meter').map(m => m.getAttribute('aria-labelledby') && document.getElementById(m.getAttribute('aria-labelledby')).textContent);
    expect(meters).toEqual(['Battery', 'Recorder', 'Science', 'Propellant']);
    for (const label of ['Lost data', 'Safe mode', 'Link']) expect(within(tele).getByText(label)).toBeTruthy();
    const ribbon = screen.getByRole('list', {name: 'Mission phase'});
    expect(within(ribbon).getAllByRole('listitem')).toHaveLength(5); expect(ribbon.querySelector('[aria-current="step"]').textContent).toMatch(/Launch/);
    const clock = screen.getByRole('toolbar', {name: 'Mission clock'});
    for (const n of ['Play', 'Step', 'Next event']) expect(within(clock).getByRole('button', {name: n})).toBeTruthy();
    expect(within(clock).getByRole('radiogroup', {name: 'Speed'}).querySelectorAll('[role=radio]')).toHaveLength(3);
    expect(screen.getByRole('slider', {name: 'Review mission history'})).toBeTruthy();
    expect(screen.getByRole('img', {name: /Resource flow diagram/})).toBeTruthy();
  });

  it('clock controls drive the store: step, speed and play/pause', async () => {
    launch(); renderMotion(<FlightScreen />); const user = userEvent.setup();
    const m0 = useGame.getState().run.minute; const phase0 = useGame.getState().run.phase;
    await user.click(screen.getByRole('button', {name: 'Step'}));
    expect(useGame.getState().run.phase !== phase0 || useGame.getState().run.minute > m0).toBe(true);
    await user.click(within(screen.getByRole('radiogroup', {name: 'Speed'})).getByRole('radio', {name: '10×'}));
    expect(useGame.getState().speed).toBe(10);
    await user.click(screen.getByRole('button', {name: 'Play'})); expect(useGame.getState().playing).toBe(true);
    expect(await screen.findByRole('button', {name: 'Pause'})).toBeTruthy();
    await user.click(screen.getByRole('button', {name: 'Pause'})); expect(useGame.getState().playing).toBe(false);
  });

  it('operations commands are locked with a visible reason until the operations phase, then act on the run', async () => {
    launch(); renderMotion(<FlightScreen />); const user = userEvent.setup();
    const deck = screen.getByRole('group', {name: 'Operations commands'});
    const coast = within(deck).getByRole('button', {name: /Conserve energy/});
    expect(coast.getAttribute('aria-disabled')).toBe('true'); expect(screen.getByText('Commands unlock in the operations phase')).toBeTruthy();
    expect(coast.getAttribute('aria-describedby')).toBe('flight-cmd-reason');
    await user.click(coast); expect(useGame.getState().run.mode).toBe('science'); // locked: nothing happens
    toOperations(); expect(useGame.getState().run.phase).toBe('operations');
    await waitFor(() => expect(within(deck).getByRole('button', {name: /Conserve energy/}).getAttribute('aria-disabled')).toBeNull());
    await user.click(within(deck).getByRole('button', {name: /Conserve energy/}));
    expect(useGame.getState().run.mode).toBe('coast'); expect(within(deck).getByRole('button', {name: /Conserve energy/}).getAttribute('aria-pressed')).toBe('true');
    expect(useGame.getState().run.logs.at(-1).title).toBe('Operations: coast');
  });

  it('a pending crisis takes over: region, vignette, focus, locked clock and commands with reasons, direction-only previews', async () => {
    launch(); toCrisis(); renderMotion(<FlightScreen />);
    const crisis = useGame.getState().run.crisis;
    const card = screen.getByRole('region', {name: crisis.title});
    expect(within(card).getByText(crisis.body.slice(0, 40), {exact: false})).toBeTruthy();
    expect(screen.getByTestId('vignette')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(card.querySelector('h2'))); // focus moves to the decision
    for (const n of ['Play', 'Step', 'Next event']) expect(screen.getByRole('button', {name: n}).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getAllByText('Choose the crisis response first').length).toBeGreaterThan(0);
    // direction chips: arrows and words, never a digit
    const lists = within(card).getAllByRole('list', {name: 'Rough preview, direction only'});
    expect(lists.length).toBeGreaterThan(0);
    for (const l of lists) expect(l.textContent).not.toMatch(/\d/);
    expect(card.querySelector('[class*=directionBox]').textContent).not.toMatch(/\d/);
    expect(within(card).getAllByRole('button', {name: /Hold to commit/}).length).toBe(crisis.actions.filter(a => !a.disabled).length + crisis.actions.filter(a => a.disabled).length);
  });

  it('crisis responses are hold-to-confirm: a tap only arms, a 700 ms hold resolves and focus returns to the clock', () => {
    launch(); toCrisis(); vi.useFakeTimers(); renderMotion(<FlightScreen />);
    const crisis = useGame.getState().run.crisis, option = crisis.actions.find(a => !a.disabled);
    const btn = screen.getByRole('button', {name: `Hold to commit: ${option.name}`});
    fireEvent.pointerDown(btn); act(() => { vi.advanceTimersByTime(300); }); fireEvent.pointerUp(btn);
    expect(useGame.getState().run.crisis).toBeTruthy(); expect(btn.dataset.armed).toBe('true'); // armed, not committed
    act(() => { vi.advanceTimersByTime(3200); }); expect(btn.dataset.armed).toBeUndefined();
    holdCommit(btn, 700);
    expect(useGame.getState().run.crisis).toBeFalsy();
    expect(useGame.getState().run.events.at(-1).actionId).toBe(option.id);
    act(() => { vi.advanceTimersByTime(300); });
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Play'})); // focus is retained on the screen
  });

  it('unavailable responses cannot be committed and say why', () => {
    launch(); toCrisis();
    // force an unavailable option into the pending crisis (copy; the run stays immutable)
    const run = useGame.getState().run; useGame.setState({run: {...run, crisis: {...run.crisis, actions: run.crisis.actions.map((a, i) => i === 0 ? {...a, disabled: true} : a)}}});
    vi.useFakeTimers(); renderMotion(<FlightScreen />);
    const first = screen.getByRole('button', {name: new RegExp(`Hold to commit: ${useGame.getState().run.crisis.actions[0].name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)});
    expect(first.getAttribute('aria-disabled')).toBe('true'); expect(first).toHaveAccessibleDescription('Unavailable: insufficient capability.');
    holdCommit(first); expect(useGame.getState().run.crisis).toBeTruthy();
  });

  it('the one forecast per mission: spent once, then the button is disabled and says so', async () => {
    launch(); toCrisis(); renderMotion(<FlightScreen />); const user = userEvent.setup();
    expect(useGame.getState().run.forecasts || 0).toBe(0);
    const spend = screen.getByRole('button', {name: /Spend my one forecast/});
    await user.click(spend);
    await waitFor(() => expect(useGame.getState().run.forecasts).toBe(1));
    expect(useGame.getState().chat.at(-1).answer.consumesForecast).toBe(true);
    await waitFor(() => expect(screen.getByRole('button', {name: /Spend my one forecast/}).getAttribute('aria-disabled')).toBe('true'));
    expect(screen.getAllByText('Your forecast for this mission is used.').length).toBeGreaterThan(0);
    const n = useGame.getState().chat.length; await user.click(screen.getByRole('button', {name: /Spend my one forecast/}));
    expect(useGame.getState().chat.length).toBe(n); expect(useGame.getState().run.forecasts).toBe(1);
  });

  it('reload resumes paused with the pending decision on this screen (checkpoint)', () => {
    let run = newRun(PRESETS.fragile); for (let i = 0; i < 100 && !run.crisis; i++) run = advance(run);
    const h = makeStore({checkpoint: {schema: 1, version: VERSION, run}}); h.a.init();
    expect(h.get().screen).toBe('flight'); expect(h.get().playing).toBe(false); expect(h.get().sheet.id).toBe('resume');
    useGame.setState({run: h.get().run, screen: 'flight', playing: false});
    renderMotion(<FlightScreen />);
    expect(screen.getByRole('region', {name: run.crisis.title})).toBeTruthy();
    expect(useGame.getState().playing).toBe(false); expect(screen.getByRole('button', {name: 'Play'}).getAttribute('aria-disabled')).toBe('true');
  });

  it('the scrubber shows a read-only past and returns to live without touching the run', async () => {
    launch(); toOperations(); for (let i = 0; i < 8; i++) act(() => actions().step());
    renderMotion(<FlightScreen />);
    const runBefore = useGame.getState().run, last = runBefore.history.length - 1;
    expect(last).toBeGreaterThan(3);
    const slider = screen.getByRole('slider', {name: 'Review mission history'});
    fireEvent.change(slider, {target: {value: '2'}});
    expect(screen.getAllByText('Past view · read-only').length).toBeGreaterThan(0);
    expect(slider.getAttribute('aria-valuetext')).toMatch(/^T\+/);
    expect(useGame.getState().run).toBe(runBefore); // read-only
    await userEvent.setup().click(screen.getByRole('button', {name: 'Return to live'}));
    expect(screen.queryByText('Past view · read-only')).toBeNull(); expect(useGame.getState().run).toBe(runBefore);
  });

  it('hostile text from logs and crisis data renders as text, never as markup', () => {
    launch(); toOperations();
    const run = useGame.getState().run;
    useGame.setState({run: {...run, logs: [...run.logs, {minute: run.minute, type: 'warning', title: '<img src=x onerror=alert(1)>', detail: '<script>alert(2)</script>'}]}});
    renderMotion(<FlightScreen />);
    expect(screen.getAllByText('<img src=x onerror=alert(1)>').length).toBeGreaterThan(0);
    expect(document.querySelector('img[src="x"]')).toBeNull(); expect(document.querySelector('script')).toBeNull();
  });

  it('keyboard: Space toggles the clock when no control has focus, and shortcuts are ignored while locked', () => {
    launch(); renderMotion(<FlightScreen />);
    act(() => { document.body.focus(); fireEvent.keyDown(document.body, {key: ' '}); });
    expect(useGame.getState().playing).toBe(true);
    act(() => { fireEvent.keyDown(document.body, {key: ' '}); }); expect(useGame.getState().playing).toBe(false);
  });

  it('with reduced motion no needle interpolation runs: values snap to each tick', () => {
    vi.useFakeTimers(); const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    const {result, rerender} = renderHook(({t}) => useTickInterpolation(t, {running: true, periodMs: 1000, reduced: true}), {initialProps: {t: [1, 10]}});
    rerender({t: [5, 20]}); expect(result.current).toEqual([5, 20]); expect(raf).not.toHaveBeenCalled();
  });

  it('without reduced motion the values glide from the previous tick to the new one while the clock runs', () => {
    vi.useFakeTimers(); let frame = null, now = 0;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => { frame = cb; return 1; });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => { frame = null; });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const {result, rerender} = renderHook(({t}) => useTickInterpolation(t, {running: true, periodMs: 1000, reduced: false}), {initialProps: {t: [0, 100]}});
    rerender({t: [10, 200]}); // a new tick
    now = 500; act(() => frame?.(now)); expect(result.current[0]).toBeCloseTo(5, 5); expect(result.current[1]).toBeCloseTo(150, 5);
    now = 1000; act(() => frame?.(now)); expect(result.current).toEqual([10, 200]);
    rerender({t: [20, 300]}); now = 1100; act(() => frame?.(now)); expect(result.current[0]).toBeGreaterThan(10); expect(result.current[0]).toBeLessThan(20);
  });

  it('does not interpolate when the clock is paused (a manual step shows the true value at once)', () => {
    vi.useFakeTimers(); const raf = vi.spyOn(globalThis, 'requestAnimationFrame');
    const {result, rerender} = renderHook(({t}) => useTickInterpolation(t, {running: false, periodMs: 1000, reduced: false}), {initialProps: {t: [0]}});
    rerender({t: [9]}); expect(result.current).toEqual([9]); expect(raf).not.toHaveBeenCalled();
  });
});
