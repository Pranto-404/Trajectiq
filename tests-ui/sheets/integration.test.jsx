import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, within, act, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App.jsx';
import {useGame} from '@/store/index.js';
import {hasSheet, getSheet, openSheet} from '@/sheets/registry.js';
import {makeRun, EVIL} from '../report/fixtures.js';

const initial = useGame.getState();
let errors;
beforeEach(() => {
  localStorage.clear(); useGame.getState().actions.dispose();
  useGame.setState({...initial, prefs: {...initial.prefs, reducedMotion: true}}, true);
  errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  useGame.getState().actions.dispose();
  const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0])));
  errors.mockRestore(); expect(bad).toEqual([]);
});
const a = () => useGame.getState().actions;

describe('features are discovered by the shell', () => {
  it('registers every WP9 and WP10 sheet id and the report screen', async () => {
    render(<App />);
    for (const id of ['assistant', 'help', 'sources', 'lab', 'nasa', 'history', 'quiz', 'concept', 'menu', 'power-fix']) expect(hasSheet(id), id).toBe(true);
    expect(getSheet('assistant').variant).toBe('chat'); expect(getSheet('sources').size).toBe('lg');
    const run = makeRun();
    act(() => useGame.setState({run, runs: [run], screen: 'report', reportTab: 'score'}));
    expect(await screen.findByRole('tablist', {name: 'Report sections'})).toBeTruthy();
  });
});

describe('sheets inside the real shell', () => {
  it('the assistant opens as a labelled chat dialog, traps focus, closes on Escape and returns focus', async () => {
    render(<App />);
    const user = userEvent.setup(), opener = screen.getByRole('button', {name: /Assistant/});
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', {name: 'Mission assistant'});
    expect(dialog.dataset.placement).toBe('chat');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(await within(dialog).findByRole('textbox', {name: 'Your question'})).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it('menu, concept, sources and NASA sheets open (lazy bodies included) with the right names', async () => {
    render(<App />);
    for (const [id, props, name] of [['menu', {}, 'Menu'], ['concept', {topic: 'eclipse'}, 'Eclipse'], ['concept', {index: true}, 'Concept cards'], ['sources', {}, 'Sources & method'], ['nasa', {}, 'NASA data & credits'], ['help', {}, 'How to play'], ['history', {kind: 'battery'}, 'Run history'], ['lab', {}, 'Engineering lab'], ['quiz', {}, 'Learning check']]) {
      act(() => openSheet(id, props));
      const d = await screen.findByRole('dialog', {name}); expect(d, id).toBeTruthy();
      act(() => a().closeSheet()); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });

  it('the concept "?" trigger anywhere opens the card', async () => {
    render(<App />);
    act(() => a().learn({topic: 'contact'}));
    const d = await screen.findByRole('dialog', {name: 'Ground contact'});
    expect(within(d).getByText(/short window each orbit/)).toBeTruthy();
  });

  it('Bengali: sheet titles and key labels translate', async () => {
    render(<App />);
    act(() => a().setPref('language', 'bn'));
    act(() => openSheet('history', {}));
    expect(await screen.findByRole('dialog', {name: 'মিশনের ইতিহাস'})).toBeTruthy();
  });
});

describe('hostile persisted data renders as text on the report and sheet screens', () => {
  it('report, history, leaderboard, assistant and lab survive hostile names and labels', async () => {
    const run = makeRun({id: 'e', label: EVIL});
    run.design.name = EVIL; run.events[0].title = EVIL; run.events[0].action = EVIL; run.events[0].chain = [EVIL, EVIL];
    const board = [{id: 'x', team: EVIL, label: EVIL, scenarioTitle: EVIL, difficulty: EVIL, mode: EVIL, grade: EVIL, score: 500, code: EVIL}];
    const {container} = render(<App />);
    act(() => useGame.setState({run, runs: [run], board, design: {...run.design}, team: {...initial.team, players: [{name: EVIL, roles: initial.team.players[0].roles}]}, screen: 'report'}));
    for (const tab of ['score', 'debrief', 'trade', 'share']) {
      act(() => a().setReportTab(tab));
      await waitFor(() => expect(screen.getByRole('tab', {name: new RegExp(tab === 'score' ? 'Score' : tab === 'debrief' ? 'Causal' : tab === 'trade' ? 'Trade' : 'Share')}).getAttribute('aria-selected')).toBe('true'));
    }
    for (const id of ['history', 'lab', 'assistant', 'menu', 'nasa']) {
      act(() => openSheet(id, {})); await screen.findByRole('dialog');
      act(() => a().closeSheet()); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
    expect(document.body.querySelector('img[src="x"], script')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/<img[^>]*onerror/i);
    expect(container.ownerDocument.body.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
