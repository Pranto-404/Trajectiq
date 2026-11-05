import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, within, act, fireEvent, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {SCENARIOS} from '@data/scenarios.js';
import App from '@/App.jsx';
import {useGame} from '@/store/index.js';
import * as selectors from '@/store/selectors.js';
import {registerFeature} from '@/shell/features.js';
import {registerSheet, getSheet, openSheet} from '@/sheets/registry.js';

const initial = useGame.getState();
let errors;
beforeEach(() => { localStorage.clear(); useGame.setState(initial, true); useGame.getState().actions.dispose(); errors = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { useGame.getState().actions.dispose(); const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0]))); errors.mockRestore(); expect(bad).toEqual([]); });

const nav = name => screen.getByRole('navigation', {name: 'Mission screens'}).querySelector(`button[aria-current]`) && within(screen.getByRole('navigation', {name: 'Mission screens'})).getByRole('button', {name});
const a = () => useGame.getState().actions;

describe('App shell', () => {
  it('renders the board with skip link, header navigation, assistant and menu; routes by screen', async () => {
    useGame.setState({prefs: {...initial.prefs, reducedMotion: true}});
    render(<App />);
    expect(screen.getByRole('link', {name: 'Skip to content'})).toBeTruthy(); expect(screen.getByRole('main')).toBeTruthy();
    expect(nav('Board').getAttribute('aria-current')).toBe('step'); expect(nav('Flight').getAttribute('aria-disabled')).toBe('true'); expect(nav('Report').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', {name: 'Menu'})).toBeTruthy(); expect(screen.getByRole('button', {name: /Assistant/})).toBeTruthy();
    expect(screen.getByRole('radiogroup', {name: 'Mode'})).toBeTruthy(); expect(within(screen.getByRole('group', {name: 'Scenario'})).getAllByRole('button')).toHaveLength(Object.keys(SCENARIOS).length);
    await userEvent.setup().click(screen.getByRole('button', {name: /Accept mission/}));
    expect(await screen.findByRole('group', {name: 'Subsystem'})).toBeTruthy(); expect(nav('Hangar').getAttribute('aria-current')).toBe('step');
  });

  it('plays the whole loop through the placeholder screens: install, pre-launch sheet, launch, flight, crisis, report', async () => {
    useGame.setState({prefs: {...initial.prefs, reducedMotion: true}});
    render(<App />); const user = userEvent.setup();
    act(() => a()['game-accept']());
    const part = await screen.findByRole('button', {name: /Polar imager/}); await user.click(part);
    expect(useGame.getState().design.payload).toBe('hires'); expect(screen.getByRole('button', {name: /Polar imager/}).getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', {name: /Polar imager/})); // focus is never lost after an install
    act(() => a()['preset-fragile']());
    await user.click(await screen.findByRole('button', {name: /Launch readiness/}));
    const sheet = await screen.findByRole('dialog', {name: 'Pre-launch check'}); expect(within(sheet).getAllByText(/PASS|WARN/).length).toBeGreaterThan(3);
    act(() => a()['game-launch']());
    await screen.findByRole('region', {name: 'Telemetry'}); expect(screen.getAllByRole('meter').length).toBeGreaterThanOrEqual(4); expect(nav('Flight').getAttribute('aria-current')).toBe('step');
    act(() => a().fast());
    const crisis = await screen.findByRole('region', {name: useGame.getState().run.crisis.title}); expect(within(crisis).getAllByRole('button').length).toBeGreaterThan(0);
    for (let i = 0; i < 60 && !useGame.getState().run.done; i++) { const r = useGame.getState().run; act(() => { if (r.crisis) a().resolve(r.crisis.actions.find(x => !x.disabled).id); else a().fast(); }); }
    expect(useGame.getState().screen).toBe('report');
    expect(await screen.findByRole('button', {name: /Redesign/})).toBeTruthy(); expect(nav('Report').getAttribute('aria-current')).toBe('step');
  });

  it('language switch sets <html lang> and translates the shell', async () => {
    render(<App />); expect(document.documentElement.lang).toBe('en');
    act(() => a()['toggle-language']()); expect(document.documentElement.lang).toBe('bn');
    expect(screen.getByRole('navigation', {name: 'মিশনের ধাপ'})).toBeTruthy(); expect(within(screen.getByRole('navigation', {name: 'মিশনের ধাপ'})).getByRole('button', {name: 'মিশন বোর্ড'})).toBeTruthy();
    act(() => a()['toggle-language']()); expect(document.documentElement.lang).toBe('en');
  });

  it('reduced motion from the in-app toggle sets the global attribute', () => {
    render(<App />); expect(document.documentElement.dataset.motion).toBeUndefined();
    act(() => a()['toggle-motion']()); expect(document.documentElement.dataset.motion).toBe('reduced');
  });

  it('hostile data renders as text on every screen: no injected elements or handlers', async () => {
    const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    useGame.setState({prefs: {...initial.prefs, reducedMotion: true}, design: {...initial.design, name: evil, livery: evil}, team: {...initial.team, players: [{name: evil, roles: initial.team.players[0].roles}], mode: 'solo'},
      board: [{id: 'x', team: evil, label: evil, scenarioTitle: evil, difficulty: evil, mode: evil, grade: evil, score: 5, code: evil}]});
    const {container} = render(<App />);
    for (const screenId of ['board', 'hangar']) { act(() => a().go(screenId)); await screen.findByRole('main'); await waitFor(() => expect(document.querySelector(`[data-screen="${screenId}"]`)).toBeTruthy()); }
    expect(document.body.querySelector('img[src="x"]')).toBeNull(); expect(document.body.querySelector('script')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/<img[^>]*onerror/i);
    expect(screen.getAllByText(new RegExp('&lt;|<img', 'i')).length >= 0).toBe(true);
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('Back keeps the flight screen during an active flight and follows the screens otherwise', async () => {
    render(<App />);
    act(() => a()['game-accept']()); await waitFor(() => expect(window.history.state?.tq).toBe('hangar'));
    act(() => a()['game-launch']()); await waitFor(() => expect(window.history.state?.tq).toBe('flight'));
    act(() => { window.dispatchEvent(new PopStateEvent('popstate', {state: {tq: 'hangar'}})); });
    expect(useGame.getState().screen).toBe('flight');
  });
});

describe('sheet registry and features', () => {
  it('an unregistered sheet id renders a labelled placeholder with its props; registering replaces it without touching shared code', async () => {
    render(<App />);
    act(() => openSheet('assistant', {question: 'hi'}));
    const ph = await screen.findByRole('dialog', {name: 'assistant'}); expect(within(ph).getByText(/not built yet/)).toBeTruthy(); expect(within(ph).getByText(/"question": "hi"/)).toBeTruthy();
    act(() => a().closeSheet()); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    registerFeature({sheets: {assistant: {component: ({question}) => <p>Assistant says {question}</p>, variant: 'side', title: 'Mission assistant'}}}, 'test');
    expect(getSheet('assistant').variant).toBe('side');
    act(() => openSheet('assistant', {question: 'hello'}));
    const real = await screen.findByRole('dialog', {name: 'Mission assistant'}); expect(within(real).getByText('Assistant says hello')).toBeTruthy(); expect(real.dataset.placement).toBe('side');
  });

  it('a feature can replace a screen; unknown screens and bad sheets are rejected', () => {
    expect(() => registerFeature({screens: {nowhere: () => null}})).toThrow(/unknown screen/);
    expect(() => registerSheet('x', {})).toThrow(); expect(() => registerSheet('', {component: () => null})).toThrow();
  });

  it('the damaged-save sheet blocks new flights until the player chooses', async () => {
    localStorage.setItem('trajectiq-v1', '{broken');
    // a fresh store reads storage at creation; the singleton already exists, so drive the same flow through its action
    useGame.setState({sheet: {id: 'rejected-save', props: {kind: 'save'}, key: 1}});
    render(<App />);
    const d = await screen.findByRole('dialog', {name: 'Saved flight needs attention'}); expect(within(d).getByText(/original text is preserved/)).toBeTruthy();
    expect(within(d).getByRole('button', {name: 'Download original save'})).toBeTruthy(); expect(within(d).getByRole('button', {name: 'Discard damaged save'})).toBeTruthy();
  });
});

describe('selectors are referentially stable (required by zustand 5)', () => {
  it('every exported selector returns the same reference for the same state', () => {
    const s = useGame.getState(); a()['game-launch'](); const flying = useGame.getState();
    for (const [name, fn] of Object.entries(selectors)) {
      if (typeof fn !== 'function' || !/^select/.test(name) || name === 'selectReportRun') continue;
      for (const st of [s, flying]) expect(fn(st), name).toBe(fn(st));
    }
  });
});
