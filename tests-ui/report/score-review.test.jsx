import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, within, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MotionProvider} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {ReportScreen} from '@/features/report/ReportScreen.jsx';
import {ScoreReveal, useReveal} from '@/features/report/ScoreReveal.jsx';
import {DecisionReview, rankOptions} from '@/features/report/DecisionReview.jsx';
import {makeRun, showReport, EVIL} from './fixtures.js';
import {renderHook} from '@testing-library/react';

const wrap = ui => render(ui, {wrapper: ({children}) => <MotionProvider reduced>{children}</MotionProvider>});
let run;
beforeEach(() => { run = makeRun(); showReport(run); });

describe('Report screen: score reveal and decision review', () => {
  it('shows the outcome, a labelled score ring, all category bars, the grade and the decision review', () => {
    wrap(<ReportScreen />);
    expect(screen.getByRole('heading', {name: /science home|has a lesson/})).toBeTruthy();
    const ring = screen.getByRole('img', {name: /Mission Score \d+ out of 1000, grade [SABCD]/});
    expect(ring).toBeTruthy();
    const list = screen.getByRole('list', {name: 'Score by category'});
    expect(within(list).getAllByRole('listitem')).toHaveLength(run.score.dims.length);
    for (const d of run.score.dims) expect(within(list).getByText(d.label)).toBeTruthy();
    expect(screen.getByRole('heading', {name: 'Decision review'})).toBeTruthy();
    expect(screen.getByRole('button', {name: /Redesign/})).toBeTruthy();
  });

  it('reduced motion plays no sequence: the review is immediately available and the score is marked seen', () => {
    wrap(<ReportScreen />);
    expect(screen.queryByRole('button', {name: 'Skip animation'})).toBeNull();
    expect(useGame.getState().scoreSeen).toBe('r1');
  });

  it('crew collaboration appears only for a crew run', () => {
    const first = wrap(<ReportScreen />);
    expect(screen.queryByText('Team collaboration')).toBeNull();
    first.unmount();
    const crewRun = makeRun({id: 'c1', label: 'R02', patch: {}});
    crewRun.score = {...crewRun.score, crew: true, dims: [...crewRun.score.dims, {id: 'collaboration', label: 'Team collaboration', value: 80, max: 100, note: 'x'}]};
    showReport(crewRun);
    wrap(<ReportScreen />);
    expect(screen.getByText('Team collaboration')).toBeTruthy();
  });

  it('renders each replayed decision with its options ranked and your choice marked', () => {
    wrap(<DecisionReview review={run.review} />);
    const cards = screen.queryAllByTestId('decision-card');
    expect(cards.length).toBe(run.review.length);
    if (!cards.length) return;
    const first = run.review[0], table = within(cards[0]).getByRole('table');
    expect(within(table).getByText('Your choice')).toBeTruthy();
    const ranked = rankOptions(first.options).filter(o => !o.disabled);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain(ranked[0].name);
    expect(rows[0].textContent).toContain('#1');
  });

  it('hostile titles, option names, explanations and labels render as text', () => {
    const review = [{id: 'x', title: EVIL, minute: 40, material: true, chosenId: 'a', bestId: 'b', chosenName: EVIL, bestName: EVIL, regret: 30, explanation: EVIL,
      options: [{id: 'a', name: EVIL, science: 10, battery: 20, lostMB: 3, rank: 2, score: 1}, {id: 'b', name: EVIL, science: 30, battery: 40, lostMB: 1, rank: 1, score: 50}, {id: 'c', name: EVIL, disabled: true}]}];
    const {container} = wrap(<DecisionReview review={review} />);
    expect(container.querySelector('img,script')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    const bad = makeRun({id: 'e1', label: EVIL, patch: {}});
    bad.design.name = EVIL;
    showReport(bad);
    const r = wrap(<ReportScreen />);
    expect(r.container.querySelector('img,script')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/<img[^>]*onerror/i);
  });

  it('an empty review explains that good margins are good decisions', () => {
    wrap(<DecisionReview review={[]} />);
    expect(screen.getByText('No crisis decision this time')).toBeTruthy();
  });
});

describe('score reveal timeline', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('walks ring -> bars -> stamp -> done, calls onDone once, and can be skipped', () => {
    const onDone = vi.fn();
    const {result} = renderHook(() => useReveal({fresh: true, reduced: false, count: 4, onDone}));
    expect(result.current.phase).toBe(0);
    act(() => vi.advanceTimersByTime(1200)); expect(result.current.phase).toBe(1);
    act(() => vi.advanceTimersByTime(4 * 150 + 420)); expect(result.current.phase).toBe(2);
    act(() => vi.advanceTimersByTime(500)); expect(result.current.phase).toBe(3);
    expect(onDone).toHaveBeenCalledTimes(1);
    const skip = renderHook(() => useReveal({fresh: true, reduced: false, count: 4, onDone: vi.fn()}));
    act(() => skip.result.current.skip()); expect(skip.result.current.phase).toBe(3);
  });
  it('a fresh score in full motion shows the Skip button and marks the score seen only after the reveal', async () => {
    const onSeen = vi.fn();
    render(<MotionProvider reduced={false}><ScoreReveal score={run.score} label="R01" fresh onSeen={onSeen} /></MotionProvider>);
    expect(screen.getByRole('button', {name: 'Skip animation'})).toBeTruthy();
    expect(onSeen).not.toHaveBeenCalled();
    act(() => screen.getByRole('button', {name: 'Skip animation'}).click());
    expect(onSeen).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
