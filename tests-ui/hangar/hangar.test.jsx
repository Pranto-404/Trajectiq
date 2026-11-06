import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {screen, within, act, fireEvent, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {CATALOG} from '@data/catalog.js';
import {useGame} from '@/store/index.js';
import {HangarScreen} from '@/features/hangar/HangarScreen.jsx';
import {resetStore, renderIn, a, mockViewport, crewOf} from './util.jsx';

let errors;
beforeEach(() => { resetStore(); errors = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { a().dispose(); const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0]))); errors.mockRestore(); expect(bad).toEqual([]); });

const other = kind => CATALOG[kind].find(p => p.id !== useGame.getState().design[kind]);
const tab = name => within(screen.getByRole('group', {name: 'Subsystem'})).getByRole('button', {name});
const cardButton = part => within(screen.getByRole('group', {name: 'Subsystem'}).closest('[data-testid="parts-tray"]')).getByRole('button', {name: new RegExp(part.name)});

describe('parts tray: install paths, focus, ghost preview', () => {
  it('Enter installs a part from the keyboard and focus stays on that card', async () => {
    renderIn(<HangarScreen />); const user = userEvent.setup();
    const part = other('payload'); const btn = cardButton(part);
    await user.tab(); btn.focus(); expect(btn).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(useGame.getState().design.payload).toBe(part.id);
    expect(cardButton(part).getAttribute('aria-pressed')).toBe('true');
    expect(cardButton(part)).toHaveFocus(); // never lost after an install
    expect(document.activeElement).not.toBe(document.body);
  });

  it('Space and click install too, and every category lists its parts with signed delta chips', async () => {
    renderIn(<HangarScreen />); const user = userEvent.setup();
    const part = other('payload'), btn = cardButton(part);
    expect(btn.querySelectorAll('[data-delta]').length).toBe(3);
    await user.click(btn); expect(useGame.getState().design.payload).toBe(part.id);
    await user.click(tab(/Power system/)); expect(useGame.getState().category).toBe('power');
    const p2 = other('power'); btn.blur(); const b2 = cardButton(p2); b2.focus(); await user.keyboard(' ');
    expect(useGame.getState().design.power).toBe(p2.id); expect(cardButton(p2)).toHaveFocus();
  });

  it('hovering a part previews its effect: ghost segments and a summary, nothing is committed; leaving clears it', async () => {
    const {container} = renderIn(<HangarScreen />); const user = userEvent.setup();
    const part = other('payload'), before = useGame.getState().design.payload;
    await user.hover(cardButton(part));
    expect(useGame.getState().preview).toEqual({kind: 'payload', id: part.id});
    const summary = await screen.findByTestId('ghost-summary'); expect(summary).toHaveTextContent(part.name);
    expect(container.querySelector('[data-ghost]')).toBeTruthy();
    expect(useGame.getState().design.payload).toBe(before);
    await user.unhover(cardButton(part));
    expect(useGame.getState().preview).toBeNull(); expect(screen.queryByTestId('ghost-summary')).toBeNull();
  });

  it('keyboard focus previews as well, and unmounting clears a stale preview', async () => {
    const {unmount} = renderIn(<HangarScreen />);
    const part = other('payload'); act(() => cardButton(part).focus());
    expect(useGame.getState().preview?.id).toBe(part.id);
    unmount(); expect(useGame.getState().preview).toBeNull();
  });

  it('dropping a dragged part on the stage installs it; a hostile payload is ignored', () => {
    renderIn(<HangarScreen />);
    const part = other('comms'), slot = screen.getByTestId('stage-slot');
    const payload = JSON.stringify({kind: 'comms', id: part.id});
    fireEvent.drop(slot, {dataTransfer: {types: ['application/x-trajectiq'], getData: () => payload}});
    expect(useGame.getState().design.comms).toBe(part.id);
    const before = useGame.getState().design;
    fireEvent.drop(slot, {dataTransfer: {types: ['application/x-trajectiq'], getData: () => JSON.stringify({kind: '__proto__', id: 'x'})}});
    fireEvent.drop(slot, {dataTransfer: {types: ['application/x-trajectiq'], getData: () => '{not json'}});
    expect(useGame.getState().design).toBe(before);
  });
});

describe('controls with live previews', () => {
  it('a slider shows a ghost while it moves and commits once when released; the design is untouched until then', () => {
    renderIn(<HangarScreen />);
    const fuel = screen.getByRole('slider', {name: 'Propellant'}), was = useGame.getState().design.fuel;
    fireEvent.change(fuel, {target: {value: String(was + 10)}});
    expect(useGame.getState().preview).toEqual({field: 'fuel', value: was + 10}); expect(useGame.getState().design.fuel).toBe(was);
    fireEvent.blur(fuel);
    expect(useGame.getState().design.fuel).toBe(was + 10); expect(useGame.getState().preview).toBeNull();
  });

  it('inclination, orbit options and destination use the guarded store actions', async () => {
    renderIn(<HangarScreen />); const user = userEvent.setup();
    await user.click(screen.getByRole('radio', {name: /60°/})); expect(useGame.getState().design.inclination).toBe(60);
    const opts = within(screen.getByRole('group', {name: 'Orbit options'})).getAllByRole('button').filter(b => b.dataset.inc); expect(opts.length).toBe(4);
    await user.click(opts[0]); expect(useGame.getState().design.inclination).toBe(90);
    const select = screen.getByLabelText('Choose destination');
    expect([...select.options].length).toBeGreaterThan(1); // destinations come from the engine's scenarios, not a hard-coded pair
    const target = [...select.options].find(o => o.value !== useGame.getState().design.destination);
    await user.selectOptions(select, target.value);
    expect(useGame.getState().design.destination).toBe(target.value);
  });

  it('margin gauges include mass, cost, schedule, maneuver, eclipse, power, contact and the recorder warning, plus launch-orbit status', () => {
    renderIn(<HangarScreen />);
    const meters = screen.getAllByRole('meter').map(m => m.getAttribute('aria-labelledby') && document.getElementById(m.getAttribute('aria-labelledby')).textContent);
    for (const label of ['Mass used', 'Cost used', 'Schedule used', 'Maneuver available', 'Eclipse demand', 'Peak power', 'Contact capacity', 'Recorder fill time']) expect(meters).toContain(label);
    expect(screen.getByText('Launch · orbit')).toBeTruthy(); expect(screen.getAllByRole('button', {name: /About/}).length).toBeGreaterThan(3); // concept "?" triggers
  });

  it('launch readiness remains available to explain failed checks, without authorizing launch', async () => {
    renderIn(<HangarScreen />); const user = userEvent.setup();
    expect(screen.getByRole('button', {name: /Launch readiness/}).getAttribute('aria-disabled')).toBeNull();
    await user.click(screen.getByRole('radio', {name: /30°/}));
    const btn = screen.getByRole('button', {name: /Launch readiness/});
    expect(btn.getAttribute('aria-disabled')).toBeNull();
    await user.click(btn); expect(useGame.getState().sheet.id).toBe('launch-check');
    a()['game-launch'](); expect(useGame.getState().run).toBeNull();
    expect(screen.getAllByText(/Blocked/).length).toBeGreaterThan(0); expect(screen.getByTestId('margins')).toHaveTextContent('Launch blocked');
  });
});

describe('flight lock', () => {
  it('during a flight every hardware control is disabled and says why', () => {
    a()['game-launch'](); expect(useGame.getState().run).toBeTruthy();
    renderIn(<HangarScreen />);
    expect(screen.getByTestId('flight-lock')).toHaveTextContent('Hardware is locked after launch');
    const part = other('payload'); const btn = cardButton(part);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('slider', {name: 'Propellant'}).disabled).toBe(true);
    expect(screen.getByRole('button', {name: /Engineering lab/}).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', {name: /Launch readiness/}).getAttribute('aria-disabled')).toBe('true');
    const before = useGame.getState().design; fireEvent.click(btn); expect(useGame.getState().design).toBe(before);
  });
});

describe('crew: ownership and suggestions', () => {
  it('a non-owner install becomes a suggestion; the owner accepts it from the keyboard and focus is not dropped', async () => {
    crewOf(4); renderIn(<HangarScreen />); const user = userEvent.setup();
    const wanted = other('power'); await user.click(tab(/Power system/));
    const before = useGame.getState().design.power;
    await user.click(cardButton(wanted));
    expect(useGame.getState().design.power).toBe(before); // unchanged until the owner accepts
    expect(useGame.getState().team.suggestions.filter(s => s.status === 'pending')).toHaveLength(1);
    expect(await screen.findByText(/Waiting for the owner/)).toBeTruthy();
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', {name: 'Pass the controls'}));
    const accept = await screen.findByRole('button', {name: 'Accept'}); accept.focus();
    await user.keyboard('{Enter}');
    expect(useGame.getState().design.power).toBe(wanted.id);
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(screen.getByTestId('crew-strip').contains(document.activeElement)).toBe(true);
  });

  it('declining leaves the design alone; a sliders move by a non-owner is refused', async () => {
    crewOf(4); renderIn(<HangarScreen />); const user = userEvent.setup();
    await user.click(tab(/Power system/)); await user.click(cardButton(other('power')));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', {name: 'Pass the controls'}));
    const before = useGame.getState().design.power;
    await user.click(await screen.findByRole('button', {name: 'Decline'}));
    expect(useGame.getState().design.power).toBe(before); expect(useGame.getState().team.suggestions.every(s => s.status !== 'pending')).toBe(true);
    const fuel = screen.getByRole('slider', {name: 'Propellant'}), f0 = useGame.getState().design.fuel;
    fireEvent.change(fuel, {target: {value: String(f0 + 5)}}); fireEvent.blur(fuel);
    expect(useGame.getState().design.fuel).toBe(f0);
  });
});

describe('onboarding spotlight', () => {
  it('has four skippable steps anchored to real elements and never traps focus', async () => {
    resetStore({guided: true}); renderIn(<HangarScreen />); const user = userEvent.setup();
    const card = screen.getByTestId('tour-card'); expect(card.dataset.step).toBe('0');
    expect(document.querySelector('[data-tour="stage"]') && document.querySelector('[data-tour="tray"]') && document.querySelector('[data-tour="launch"]') && document.querySelector('[data-tour="objective"]')).toBeTruthy();
    for (let i = 1; i < 4; i++) { await user.click(within(card).getByRole('button', {name: 'Next hint'})); expect(screen.getByTestId('tour-card').dataset.step).toBe(String(i)); }
    expect(within(card).getByRole('button', {name: 'Done'})).toBeTruthy();
    await user.click(within(card).getByRole('button', {name: 'Done'}));
    expect(useGame.getState().prefs.guided).toBe(false); expect(screen.queryByTestId('tour-card')).toBeNull();
  });

  it('Skip ends it, Escape inside the card ends it, and "Show guided help" brings it back from step one', async () => {
    resetStore({guided: true}); renderIn(<HangarScreen />); const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: 'Skip tour'})); expect(useGame.getState().prefs.guided).toBe(false);
    await user.click(screen.getByRole('button', {name: /Show guided help/}));
    expect(screen.getByTestId('tour-card').dataset.step).toBe('0');
    within(screen.getByTestId('tour-card')).getByRole('button', {name: 'Next hint'}).focus(); await user.keyboard('{Escape}');
    expect(useGame.getState().prefs.guided).toBe(false);
  });

  it('the page stays operable while the tour is showing', async () => {
    resetStore({guided: true}); renderIn(<HangarScreen />); const user = userEvent.setup();
    const part = other('payload'); await user.click(cardButton(part)); expect(useGame.getState().design.payload).toBe(part.id);
    expect(screen.getByTestId('tour-card')).toBeTruthy();
  });
});

describe('mobile layout', () => {
  let restore; beforeEach(() => { restore = mockViewport({narrow: true}); }); afterEach(() => restore());

  it('puts the stage on top, a bottom-sheet tray with snap points and a sticky launch bar; one launch button only', async () => {
    renderIn(<HangarScreen />); const user = userEvent.setup();
    expect(document.querySelector('[data-layout="mobile"]')).toBeTruthy();
    expect(screen.getAllByRole('button', {name: /Launch readiness/})).toHaveLength(1); expect(screen.getByTestId('launch-bar')).toBeTruthy();
    const tray = screen.getByTestId('tray-sheet'), handle = within(tray).getByRole('button', {name: /Parts tray/});
    expect(tray.dataset.snap).toBe('0'); expect(handle.getAttribute('aria-expanded')).toBe('false');
    await user.click(handle); expect(tray.dataset.snap).toBe('1'); expect(handle.getAttribute('aria-expanded')).toBe('true');
    handle.focus(); await user.keyboard('{ArrowUp}'); expect(tray.dataset.snap).toBe('2');
    await user.keyboard('{ArrowDown}{ArrowDown}'); expect(tray.dataset.snap).toBe('0');
    await user.click(within(tray).getAllByRole('button', {name: /Power system/})[0]); expect(tray.dataset.snap).toBe('1'); // choosing a subsystem opens the collapsed tray
  });

  it('installs from the mobile tray and keeps focus', async () => {
    renderIn(<HangarScreen />); const user = userEvent.setup();
    const part = other('payload'); const btn = within(screen.getByTestId('tray-sheet')).getByRole('button', {name: new RegExp(part.name)});
    btn.focus(); await user.keyboard('{Enter}'); expect(useGame.getState().design.payload).toBe(part.id); expect(btn).toHaveFocus();
  });
});
