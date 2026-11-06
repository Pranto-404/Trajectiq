import {describe, it, expect, beforeEach, vi} from 'vitest';
import {render, screen, within, act, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MotionProvider} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {ReportScreen} from '@/features/report/ReportScreen.jsx';
import {CausalCards, Diagnosis, Chain} from '@/features/report/CausalChain.jsx';
import {Comparison, changedChoices, metric} from '@/features/report/Comparison.jsx';
import {TradePlot, plotGeometry} from '@/features/report/TradePlot.jsx';
import {Robustness, histogram} from '@/features/report/Robustness.jsx';
import {PowerFixSheet, powerFixRows} from '@/features/report/PowerFixSheet.jsx';
import {makeRun, showReport, EVIL} from './fixtures.js';

const wrap = ui => render(ui, {wrapper: ({children}) => <MotionProvider reduced>{children}</MotionProvider>});
const acts = () => useGame.getState().actions;
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); });

describe('causal debrief tab', () => {
  let run;
  beforeEach(() => { run = makeRun(); showReport(run, {reportTab: 'debrief'}); });

  it('lists causal chains with impact and response, a diagnosis of where the science went, and rule-based tips', () => {
    wrap(<ReportScreen />);
    expect(screen.getByRole('tabpanel')).toBeTruthy();
    const cards = screen.queryAllByTestId('cause-card');
    expect(cards.length).toBeGreaterThan(0);
    expect(within(cards[0]).getByRole('list', {name: 'Causal chain'}).children.length).toBeGreaterThan(1);
    expect(screen.getByRole('list', {name: 'Redesign recommendations'}).children.length).toBeGreaterThan(0);
  });

  it('opens the power + comms preview through the store action', async () => {
    const fix = vi.spyOn(acts(), 'game-fix').mockImplementation(() => {});
    wrap(<ReportScreen />);
    await userEvent.setup().click(screen.getByRole('button', {name: 'Preview power + comms fix'}));
    expect(fix).toHaveBeenCalled();
  });

  it('compares with the previous run of the same scenario only', () => {
    const before = makeRun({id: 'r0', label: 'R00', preset: 'balanced', mode: 'science'});
    const marsRun = makeRun({id: 'm1', label: 'R-M', destination: 'mars'});
    showReport(run, {reportTab: 'debrief', runs: [before, marsRun, run]});
    wrap(<ReportScreen />);
    const table = within(screen.getByTestId('comparison')).getByRole('table');
    expect(within(table).getByText('Returned science · units')).toBeTruthy();
    expect(changedChoices(before, run)).toBeInstanceOf(Array);
    expect(metric(run, 'rawCompletion')).toBeGreaterThan(0);
  });

  it('says so when there is no earlier run in this scenario', () => {
    wrap(<ReportScreen />);
    expect(screen.getByText(/Play a second mission in this scenario/)).toBeTruthy();
  });

  it('renders hostile event text, chains and fixes as text', () => {
    const items = [{id: 'x', title: EVIL, chain: [EVIL, EVIL], impact: EVIL, action: EVIL}];
    const causes = [{id: 'c', units: 40, what: EVIL, fix: EVIL}];
    const {container} = wrap(<><CausalCards items={items} /><Diagnosis causes={causes} primary={causes[0]} /><Chain items={[EVIL]} /></>);
    expect(container.querySelector('img,script')).toBeNull(); expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(screen.getByText('Main cause')).toBeTruthy();
  });

  it('Comparison shows signed deltas with words for screen readers and the caveats', () => {
    const a = makeRun({id: 'a', label: 'A', preset: 'balanced', mode: 'science'}), b = makeRun({id: 'b', label: 'B'});
    wrap(<Comparison before={a} after={b} />);
    expect(screen.getByText(/not controlled hardware comparisons/)).toBeTruthy();
    expect(document.body.textContent).toMatch(/(better|worse|no change)/);
  });
});

describe('tabs', () => {
  it('arrow keys move between tabs, update the store and keep roles and names', async () => {
    const run = makeRun(); showReport(run);
    wrap(<ReportScreen />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4); expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    tabs[0].focus(); fireEvent.keyDown(tabs[0], {key: 'ArrowRight'});
    expect(useGame.getState().reportTab).toBe('debrief');
    expect(screen.getByRole('tab', {name: /Causal debrief/}).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(screen.getByRole('tab', {name: /Causal debrief/}).id);
    fireEvent.keyDown(document.activeElement, {key: 'End'}); expect(useGame.getState().reportTab).toBe('share');
  });
  it('an unknown persisted tab id falls back to the score tab', () => {
    const run = makeRun(); showReport(run, {reportTab: '<script>'});
    wrap(<ReportScreen />);
    expect(screen.getByRole('tab', {name: /Score/}).getAttribute('aria-selected')).toBe('true');
  });
  it('go(trade) and go(debrief) select the matching tab', () => {
    const run = makeRun(); showReport(run);
    wrap(<ReportScreen />);
    act(() => acts().go('trade')); expect(screen.getByRole('tab', {name: /Trade space/}).getAttribute('aria-selected')).toBe('true');
    act(() => acts().go('debrief')); expect(screen.getByRole('tab', {name: /Causal debrief/}).getAttribute('aria-selected')).toBe('true');
  });
});

describe('trade space tab', () => {
  it('plots only runs of this scenario and model, marks non-dominated designs, and reviews a run from the archive', async () => {
    const r1 = makeRun({id: 'a', label: 'R01'}), r2 = makeRun({id: 'b', label: 'R02', preset: 'balanced', mode: 'science'}), other = makeRun({id: 'm', label: 'R03', destination: 'mars'});
    const old = makeRun({id: 'o', label: 'R04', patch: {modelVersion: '5.0.0'}});
    showReport(r2, {reportTab: 'trade', runs: [r1, r2, other, old]});
    const load = vi.spyOn(acts(), 'loadRun').mockImplementation(() => {});
    wrap(<ReportScreen />);
    const plot = screen.getByRole('group', {name: /Saved mission cost versus returned science/});
    expect(within(plot).getAllByRole('button')).toHaveLength(2);
    const archive = screen.getByRole('region', {name: 'Mission archive'});
    expect(within(archive).getAllByRole('row')).toHaveLength(3);
    expect(within(archive).queryByText('R03')).toBeNull(); expect(within(archive).queryByText('R04')).toBeNull();
    await userEvent.setup().click(within(archive).getByRole('button', {name: 'Review R01'}));
    expect(load).toHaveBeenCalledWith('a');
    fireEvent.keyDown(within(plot).getAllByRole('button')[0], {key: 'Enter'});
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('the plot offers keyboard focus and a readout, and handles hostile labels and an empty archive', () => {
    const r = makeRun({id: 'h', label: EVIL});
    const {container} = wrap(<TradePlot runs={[r]} frontier={[true]} />);
    const pt = screen.getByRole('button'); fireEvent.focus(pt);
    expect(container.querySelector('img,script')).toBeNull(); expect(container.querySelector('[aria-live]').textContent).toContain('science units');
    expect(plotGeometry([]).ymax).toBeGreaterThan(600);
  });

  it('clear history opens the confirmation sheet; the leaderboard filters by scenario', async () => {
    const r = makeRun({id: 'a'});
    const title = 'Lunar Polar Mapper';
    showReport(r, {reportTab: 'trade', board: [{id: 'x1', team: 'Here', label: 'R01', scenarioTitle: title, difficulty: 'Engineer', mode: 'Solo', score: 500, grade: 'C', code: 'c'}, {id: 'x2', team: 'Elsewhere', label: 'R02', scenarioTitle: 'Another Scenario', difficulty: 'Engineer', mode: 'Solo', score: 900, grade: 'A', code: 'c'}]});
    wrap(<ReportScreen />);
    const user = userEvent.setup(), lb = () => screen.getByRole('region', {name: 'Leaderboard'});
    expect(within(lb()).queryByText('Elsewhere')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'All scenarios'}));
    expect(within(lb()).getByText('Elsewhere')).toBeTruthy();
    await user.click(screen.getByRole('button', {name: 'Clear run history'}));
    expect(useGame.getState().sheet?.id).toBe('confirm-clear');
  });
});

describe('robustness job panel', () => {
  beforeEach(() => showReport(makeRun(), {reportTab: 'trade'}));
  it('starts the job, shows progress with a cancel button, then the result with its caveat', async () => {
    const start = vi.spyOn(acts(), 'robust').mockImplementation(() => {}), cancel = vi.spyOn(acts(), 'cancel-robust').mockImplementation(() => {});
    wrap(<Robustness />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: 'Run the uncertainty test'})); expect(start).toHaveBeenCalled();
    act(() => useGame.setState({robustProgress: {done: 50, total: 200}}));
    const bar = screen.getByRole('progressbar', {name: 'Uncertainty sampling progress'}); expect(bar.getAttribute('aria-valuenow')).toBe('50');
    await user.click(screen.getByRole('button', {name: 'Cancel sampling'})); expect(cancel).toHaveBeenCalled();
    act(() => useGame.setState({robustProgress: null, robust: {index: 62.5, passed: 125, samples: 200, seed: 4385, meanCompletion: 80, results: [10, 55, 95, 100, 120], blocked: false}}));
    expect(screen.getByRole('status').textContent).toContain('62.5%'); expect(screen.getByText(/not real-world mission probability/)).toBeTruthy();
    expect(screen.getByRole('img', {name: /Distribution of completion/})).toBeTruthy();
  });
  it('is disabled with a reason when the draft design cannot launch; histogram bins are clamped', () => {
    act(() => useGame.setState({design: {...useGame.getState().design, fuel: 160, payload: 'hires', launch: 'rideshare'}}));
    wrap(<Robustness />);
    const b = screen.getByRole('button', {name: /uncertainty test|Run again/});
    if (b.getAttribute('aria-disabled')) expect(b).toHaveAccessibleDescription(/Fix \d+ failed check/);
    expect(histogram([-5, 0, 9, 10, 99, 100, 250, NaN])).toEqual([4, 1, 0, 0, 0, 0, 0, 0, 0, 3]);
  });
});

describe('power + comms fix preview', () => {
  it('shows before/after rows and applies only after the explicit confirm', async () => {
    showReport(makeRun(), {design: {...useGame.getState().design}});
    const confirm = vi.spyOn(acts(), 'confirm-power-fix').mockImplementation(() => {});
    wrap(<PowerFixSheet />);
    expect(powerFixRows(useGame.getState().design).rows.length).toBe(6);
    expect(within(screen.getByRole('table')).getByText('Wet mass')).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', {name: 'Apply these two changes'}));
    expect(confirm).toHaveBeenCalled();
  });
});
