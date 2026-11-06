import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, within, act, fireEvent, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {SCENARIOS, DIFFICULTY} from '@data/scenarios.js';
import {missionFor} from '@data/catalog.js';
import {getBody} from '@data/bodies.js';
import {MotionProvider} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {loadFeatures} from '@/shell/features.js';
import {BoardScreen} from '@/features/board/BoardScreen.jsx';
import {takeFlip, clearFlip} from '@/features/board/flip.js';
import {scenarioGroups, destinationOptions, criticalLabel, learnTopicFor} from '@/features/board/missionInfo.js';

loadFeatures();
const initial = useGame.getState();
const a = () => useGame.getState().actions;
let errors;
beforeEach(() => {
  localStorage.clear(); useGame.setState(initial, true); a().dispose(); clearFlip();
  useGame.setState({prefs: {...initial.prefs, reducedMotion: true, guided: false}});
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { a().dispose(); const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0]))); errors.mockRestore(); expect(bad).toEqual([]); vi.restoreAllMocks(); });
const board = () => render(<BoardScreen />, {wrapper: ({children}) => <MotionProvider reduced>{children}</MotionProvider>});
const cards = () => within(screen.getByRole('group', {name: 'Scenario'})).getAllByRole('button');

describe('scenarios', () => {
  it('filters destinations without changing the selected mission', async () => {
    board(); const user = userEvent.setup();
    const selected = useGame.getState().design.scenario;
    await user.click(screen.getByRole('button', {name: 'Mars', exact: true}));
    expect(cards()).toHaveLength(2);
    expect(cards().every(c => SCENARIOS[c.dataset.scenario].destination === 'mars')).toBe(true);
    expect(useGame.getState().design.scenario).toBe(selected);
    await user.click(screen.getByRole('button', {name: 'All destinations', exact: true}));
    expect(cards()).toHaveLength(Object.keys(SCENARIOS).length);
  });
  it('lists every scenario the engine offers, grouped by body, with tag, summary and critical resource', () => {
    board();
    const all = Object.values(SCENARIOS);
    expect(cards()).toHaveLength(all.length);
    const headings = within(screen.getByRole('group', {name: 'Scenario'})).getAllByRole('heading', {level: 2}).map(h => h.textContent);
    expect(headings).toEqual(scenarioGroups().map(g => g.label)); expect(new Set(headings).size).toBe(new Set(all.map(s => s.destination)).size);
    for (const s of all) {
      const card = cards().find(c => c.dataset.scenario === s.id); expect(card, s.id).toBeTruthy();
      expect(card).toHaveTextContent(s.title); expect(card).toHaveTextContent(s.summary); expect(card).toHaveTextContent(s.tag); expect(card).toHaveTextContent(criticalLabel(s.critical));
    }
  });

  it('choosing a card selects the scenario (aria-pressed) and updates the charter', async () => {
    board(); const user = userEvent.setup();
    const other = Object.values(SCENARIOS).find(s => s.id !== missionFor(useGame.getState().design).scenarioId);
    await user.click(cards().find(c => c.dataset.scenario === other.id));
    expect(useGame.getState().design.scenario).toBe(other.id);
    expect(cards().find(c => c.dataset.scenario === other.id).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('charter')).toHaveTextContent(other.title);
    expect(cards().filter(c => c.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });

  it('shows the body’s simplification note and flags game assumptions where the data says so', async () => {
    board(); const user = userEvent.setup();
    for (const s of Object.values(SCENARIOS)) {
      await user.click(cards().find(c => c.dataset.scenario === s.id));
      const body = getBody(s.destination), charter = screen.getByTestId('charter');
      if (body?.simplification) expect(charter).toHaveTextContent(body.simplification); else expect(within(charter).queryByRole('note')).toBeNull();
      const unverified = Object.values(body?.provenance || {}).filter(p => p.unverified).length;
      if (unverified) expect(within(charter).getByText(/Data notes and game assumptions/)).toBeTruthy();
    }
  });

  it('charter numbers come from missionFor, not from constants: duration, contact window and array limit follow the scenario', async () => {
    board(); const user = userEvent.setup();
    for (const s of Object.values(SCENARIOS)) {
      await user.click(cards().find(c => c.dataset.scenario === s.id));
      const m = missionFor(useGame.getState().design), charter = screen.getByTestId('charter');
      expect(charter).toHaveTextContent(`${m.duration} minutes after capture`); expect(charter).toHaveTextContent(`${m.contactMinutes} minutes per orbit`); expect(charter).toHaveTextContent(`${m.arrayScaleMax}×`);
      expect(charter).toHaveTextContent(`${m.altitudeMin}–${m.altitudeMax} km`);
    }
  });

  it('the critical resource has a "?" concept trigger when a card exists, and a space-weather warning appears when the mission has one', async () => {
    board(); const user = userEvent.setup();
    const withWeather = Object.values(SCENARIOS).find(s => s.weather);
    await user.click(cards().find(c => c.dataset.scenario === withWeather.id));
    const charter = screen.getByTestId('charter');
    expect(charter).toHaveTextContent(String(withWeather.weather.title).toLowerCase());
    const topic = learnTopicFor(withWeather.critical);
    if (topic) expect(charter.querySelector(`[data-concept="${topic}"]`)).toBeTruthy();
    expect(learnTopicFor('nonsense')).toBeNull(); expect(criticalLabel('mystery')).toBe('Mystery');
  });
});

describe('difficulty and mode', () => {
  it('difficulty changes the budget in the charter and on the cards', async () => {
    board(); const user = userEvent.setup();
    await user.click(screen.getByRole('radio', {name: DIFFICULTY.director.label}));
    expect(useGame.getState().design.difficulty).toBe('director');
    expect(screen.getByTestId('charter')).toHaveTextContent(`${missionFor(useGame.getState().design).budget} credits`);
    expect(screen.getByRole('radiogroup', {name: 'Difficulty'})).toBeTruthy();
  });

  it('Solo / Crew / Sandbox write the mode through the store; crew shows 2-4 player setup with editable names', async () => {
    board(); const user = userEvent.setup();
    await user.click(screen.getByRole('radio', {name: /Sandbox/})); expect(useGame.getState().design.sandbox).toBe(true); expect(screen.getByTestId('charter')).toHaveTextContent('SANDBOX');
    await user.click(screen.getByRole('radio', {name: /Crew/})); expect(useGame.getState().team.mode).toBe('crew');
    const setup = screen.getByTestId('crew-setup'); expect(within(setup).getAllByRole('textbox')).toHaveLength(2);
    await user.click(within(setup).getByRole('radio', {name: '4 players'})); expect(useGame.getState().team.players).toHaveLength(4); expect(within(setup).getAllByRole('textbox')).toHaveLength(4);
    const first = within(setup).getAllByRole('textbox')[0]; await user.clear(first); await user.type(first, 'Ana');
    expect(useGame.getState().team.players[0].name).toBe('Ana');
    await user.clear(first); await user.tab(); expect(first.value).toBe('Ana'); // an empty name falls back to the last valid one
    await user.click(screen.getByRole('radio', {name: /Solo/})); expect(useGame.getState().team.players).toHaveLength(1); expect(screen.queryByTestId('crew-setup')).toBeNull();
  });

  it('hostile crew names are shown as text', async () => {
    board(); const user = userEvent.setup(); await user.click(screen.getByRole('radio', {name: /Crew/}));
    const input = within(screen.getByTestId('crew-setup')).getAllByRole('textbox')[0];
    fireEvent.change(input, {target: {value: '<img src=x onerror=alert(1)>'}});
    expect(document.querySelector('img[src="x"]')).toBeNull(); expect(input.value).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('accept, quick launch, demo', () => {
  it('Accept enters the hangar and records the chosen card title for the shared-element hand-off', async () => {
    board(); const user = userEvent.setup();
    const title = document.querySelector('[data-flip-source]'); title.getBoundingClientRect = () => ({left: 100, top: 400, width: 200, height: 20, x: 100, y: 400});
    await user.click(screen.getByRole('button', {name: /Accept mission/}));
    expect(useGame.getState().screen).toBe('hangar');
    expect(takeFlip()).toMatchObject({x: 100, y: 400, width: 200});
  });

  it('Quick launch loads the Balanced build, keeps scenario, difficulty and sandbox, and opens the launch sheet', async () => {
    board(); const user = userEvent.setup();
    const ice = Object.values(SCENARIOS).filter(s => s.destination === 'moon')[1] || Object.values(SCENARIOS)[1];
    await user.click(cards().find(c => c.dataset.scenario === ice.id)); await user.click(screen.getByRole('radio', {name: DIFFICULTY.cadet.label}));
    a().setField('fuel', 30);
    await user.click(screen.getByRole('button', {name: 'Quick launch'}));
    const s = useGame.getState();
    expect(s.screen).toBe('hangar'); expect(s.sheet?.id).toBe('launch-check');
    expect(s.design.scenario).toBe(ice.id); expect(s.design.difficulty).toBe('cadet'); expect(s.design.fuel).not.toBe(30);
    expect(s.design.power).toBe(missionBalanced().power);
  });

  it('the consequence demo enters pitch mode with its banner and the fragile preset', async () => {
    board(); const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: /consequence demo/}));
    expect(useGame.getState().pitch).toBe(true); expect(useGame.getState().screen).toBe('hangar');
    expect(await screen.findByTestId('pitch-banner')).toBeTruthy();
    await user.click(screen.getByRole('button', {name: 'Exit'})); expect(useGame.getState().pitch).toBe(false);
  });

  it('during a flight the board is locked, explains why and offers the way out', async () => {
    a()['game-launch'](); expect(useGame.getState().run).toBeTruthy(); board();
    expect(screen.getByTestId('flight-lock')).toHaveTextContent('Hardware is locked');
    for (const name of [/Accept mission/, 'Quick launch']) expect(screen.getByRole('button', {name}).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', {name: 'Back to flight'})).toBeTruthy();
  });
});

describe('motion and language', () => {
  it('tilt is off under reduced motion and for coarse pointers: cards carry no rotate style', () => {
    board(); for (const c of cards()) expect(c.style.transform || '').not.toMatch(/rotate/);
  });

  it('is fully translated when the language is Bengali and falls back to English for engine data', () => {
    board(); act(() => a()['toggle-language']());
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('আপনার মিশন সাজান।');
    expect(screen.getByRole('radiogroup', {name: 'ধরন'})).toBeTruthy(); expect(screen.getByRole('button', {name: 'দ্রুত উৎক্ষেপণ'})).toBeTruthy();
    expect(document.querySelector('[data-scenario]')).toHaveTextContent(Object.values(SCENARIOS)[0].title);
    expect(screen.getByRole('group', {name: 'পরিস্থিতি'})).toBeTruthy();
  });

  it('destination options for the hangar are derived from the scenarios', () => {
    expect(destinationOptions().map(d => d.value)).toEqual([...new Set(Object.values(SCENARIOS).map(s => s.destination))]);
  });
});

function missionBalanced() { return {power: 'endurance'}; }
void waitFor;
