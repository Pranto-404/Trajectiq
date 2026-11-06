import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {screen, within, act, fireEvent, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useGame} from '@/store/index.js';
import {CrewVote, RollCall, CrewStrip, voteSummary} from '@/features/crew/index.js';
import {FlightScreen} from '@/features/flight/index.js';
import {roleVerdicts, tallyVotes} from '@engine/crew.js';
import {calculate} from '@engine/model.js';
import {CATALOG} from '@data/catalog.js';
import {resetStore, renderMotion, actions, toCrisis, launch} from '../flight/helpers.jsx';

let errors;
beforeEach(() => { resetStore(); errors = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { vi.useRealTimers(); actions().dispose(); const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0]))); errors.mockRestore(); expect(bad).toEqual([]); });

const ROLES = ['commander', 'engineer', 'science', 'power'];
const crewSetup = (n = 4) => { const a = actions(); act(() => { a['board-mode']({mode: 'crew'}); a['board-players']({players: n}); a['game-accept'](); }); };
/** Launch a crew mission (all roles sign off) and run to the first crisis. */
function crewCrisis() {
  const a = actions();
  act(() => { a['board-mode']({mode: 'crew'}); a['board-players']({players: 4}); a['game-accept'](); a['preset-fragile'](); });
  act(() => { for (const r of ROLES) a['crew-signoff']({role: r}); });
  act(() => { a['game-launch'](); a.pause(); });
  return toCrisis();
}

describe('tallyVotes summary and tie-break', () => {
  const A = 'a', B = 'b', C = 'c';
  it('majority wins', () => { const s = voteSummary({commander: B, engineer: A, science: A, power: A}); expect(s.decided).toBe(A); expect(s.tie).toBe(false); expect(s.complete).toBe(true); });
  it('a 2-2 tie goes to the Commander and is flagged as tie-broken', () => {
    const s = voteSummary({commander: A, engineer: B, science: B, power: A}); expect(s.tie).toBe(true); expect(s.decided).toBe(A); expect(s.tieBroken).toBe(true);
    const s2 = voteSummary({commander: B, engineer: A, science: B, power: A}); expect(s2.decided).toBe(B);
  });
  it('a tie without a Commander vote, or with the Commander outside the tie, is undecided', () => {
    expect(tallyVotes({engineer: A, science: B})).toBeNull(); expect(voteSummary({engineer: A, science: B}).deadlock).toBe(true);
    const three = voteSummary({commander: C, engineer: A, science: B}); expect(three.tie).toBe(true); expect(three.decided).toBe(C); expect(three.complete).toBe(false); // 1-1-1: the Commander's option decides
    expect(voteSummary({engineer: A, science: B, power: C}).decided).toBeNull();
  });
  it('an empty vote has no decision', () => { const s = voteSummary({}); expect(s.decided).toBeNull(); expect(s.cast).toBe(0); expect(s.tie).toBe(false); });
});

describe('crisis team vote', () => {
  it('each role shows its advice and vote buttons; a 2-2 tie is broken by the Commander; applying records collaboration inputs', async () => {
    const run = crewCrisis(); expect(run.crisis).toBeTruthy();
    const open = run.crisis.actions.filter(a => !a.disabled), [x, y] = open;
    renderMotion(<CrewVote />); const user = userEvent.setup();
    const vote = screen.getByTestId('crew-vote');
    const groups = within(vote).getAllByRole('group', {name: /vote$/}); expect(groups).toHaveLength(4);
    const cast = async (i, opt) => user.click(within(groups[i]).getByRole('button', {name: opt.name}));
    await cast(0, x); await cast(1, y); await cast(2, y);
    expect(within(vote).getByRole('status').textContent).toContain(y.name); // after 1-2 the majority option already leads


    await cast(3, x);
    expect(useGame.getState().team.votes).toEqual({commander: x.id, engineer: y.id, science: y.id, power: x.id});
    expect(tallyVotes(useGame.getState().team.votes)).toBe(x.id); // Commander's option breaks the 2-2 tie
    expect(within(vote).getByRole('status').textContent).toMatch(/Tie broken by the Commander/);
    expect(within(vote).getByRole('status').textContent).toContain(x.name);
    vi.useFakeTimers();
    const btn = within(vote).getByRole('button', {name: /apply team decision/i}); expect(btn.getAttribute('aria-disabled')).toBeNull();
    fireEvent.pointerDown(btn); act(() => { vi.advanceTimersByTime(700); }); fireEvent.pointerUp(btn);
    const st = useGame.getState();
    expect(st.run.events.at(-1).actionId).toBe(x.id);
    expect(st.team.crises.at(-1)).toMatchObject({id: run.crisis.id, consulted: 4}); expect(st.team.contributions).toEqual(expect.arrayContaining(ROLES));
    expect(st.team.votes).toEqual({});
  });

  it('a Commander-less tie cannot be applied and says how to proceed; the majority needs no tie-break', async () => {
    const run = crewCrisis(); const [x, y] = run.crisis.actions.filter(a => !a.disabled);
    renderMotion(<CrewVote />); const user = userEvent.setup();
    const groups = within(screen.getByTestId('crew-vote')).getAllByRole('group', {name: /vote$/});
    await user.click(within(groups[1]).getByRole('button', {name: x.name})); await user.click(within(groups[2]).getByRole('button', {name: y.name}));
    const status = within(screen.getByTestId('crew-vote')).getByRole('status');
    expect(status.textContent).toMatch(/Commander/); expect(useGame.getState().team.votes.commander).toBeUndefined();
    expect(within(screen.getByTestId('crew-vote')).getByRole('button', {name: /apply team decision/i}).getAttribute('aria-disabled')).toBe('true');
    await user.click(within(groups[0]).getByRole('button', {name: x.name})); await user.click(within(groups[3]).getByRole('button', {name: x.name}));
    expect(status.textContent).toMatch(/Team decision/); expect(status.textContent).not.toMatch(/Tie broken/);
  });

  it('shows each role\'s advice from crew.js roleAdvice', () => {
    const run = crewCrisis(); renderMotion(<CrewVote />);
    const advice = useGame.getState().run && require_advice(run);
    expect(advice.length).toBe(4);
    const rows = screen.getByTestId('crew-vote').querySelectorAll('[data-role]');
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('the flight incident takeover delegates to CrewVote in crew mode (no per-option solo commit buttons)', () => {
    const run = crewCrisis(); renderMotion(<FlightScreen />);
    const card = screen.getByRole('region', {name: run.crisis.title});
    expect(within(card).getByTestId('crew-vote')).toBeTruthy(); expect(within(card).queryByRole('button', {name: /^Hold to commit/})).toBeNull();
    expect(screen.getByTestId('crew-strip')).toBeTruthy();
  });
});

// roleAdvice is computed by the store selector; read it the same way the component does
import {selectCrisis} from '@/store/index.js';
function require_advice() { return selectCrisis(useGame.getState()).advice; }

describe('Go / No-Go roll call', () => {
  it('lights one console per role in sequence, 450 ms apart, with a stamp each; sign-off per role; commander cannot launch alone', () => {
    crewSetup(); actions()['preset-balanced']();
    vi.useFakeTimers(); renderMotion(<RollCall />, {reduced: false});
    const consoles = () => screen.getAllByRole('listitem').filter(li => li.dataset.role);
    expect(consoles()).toHaveLength(4); expect(consoles().every(c => c.dataset.status === 'standby')).toBe(true);
    expect(screen.getByText('Polling the consoles…')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(450); }); expect(consoles().filter(c => c.dataset.lit)).toHaveLength(1); expect(screen.getAllByTestId('stamp')).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(450); }); expect(consoles().filter(c => c.dataset.lit)).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(900); }); expect(consoles().filter(c => c.dataset.lit)).toHaveLength(4);
    const verdicts = roleVerdicts(calculate(useGame.getState().design).checks);
    ROLES.forEach((r, i) => expect(consoles()[i].dataset.status).toBe(verdicts.find(v => v.role === r).status));
    // sign off the Commander only: not ready
    act(() => { fireEvent.click(within(consoles()[0]).getByRole('button', {name: /Sign off/})); });
    expect(useGame.getState().team.signed.commander).toBe(true);
    expect(screen.getByRole('status', {}).textContent).toMatch(/1 of 4 roles signed off/);
  });

  it('a failing check is a NO-GO stamp that cannot be signed off', () => {
    crewSetup();
    // find a launch vehicle that fails a Commander check on the balanced build
    const base = useGame.getState().design;
    const variants = CATALOG.launch.flatMap(l => CATALOG.storage.flatMap(m => CATALOG.bus.map(b => ({...base, launch: l.id, storage: m.id, bus: b.id}))));
    const bad = variants.find(d => roleVerdicts(calculate(d).checks).some(v => v.status === 'nogo'));
    expect(bad, 'a NO-GO design exists in the catalog').toBeTruthy();
    useGame.setState({design: bad});
    renderMotion(<RollCall />, {reduced: true});
    const nogo = screen.getAllByRole('listitem').filter(li => li.dataset.status === 'nogo');
    expect(nogo.length).toBeGreaterThan(0);
    expect(within(nogo[0]).getByText('NO-GO')).toBeTruthy(); expect(within(nogo[0]).getByText('Cannot sign off')).toBeTruthy(); expect(within(nogo[0]).queryByRole('button', {name: /Sign off/})).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/NO-GO/);
    act(() => actions()['crew-signoff']({role: roleVerdicts(calculate(bad).checks).find(v => v.status === 'nogo').role}));
    expect(Object.keys(useGame.getState().team.signed)).not.toContain(roleVerdicts(calculate(bad).checks).find(v => v.status === 'nogo').role);
  });

  it('with reduced motion every console is lit immediately (no stagger)', () => {
    crewSetup(); renderMotion(<RollCall />, {reduced: true});
    expect(screen.getAllByRole('listitem').filter(li => li.dataset.lit)).toHaveLength(4);
  });

  it('solo play gets the same poll without sign-off buttons', () => {
    act(() => actions()['game-accept']()); renderMotion(<RollCall />, {reduced: true});
    expect(screen.getAllByRole('listitem').filter(li => li.dataset.role)).toHaveLength(4); expect(screen.queryByRole('button', {name: /Sign off/})).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/All consoles GO|NO-GO/);
  });
});

describe('crew strip: pass the controls and proposals', () => {
  it('lists the players with roles and subsystems, passes the controls with a hand-off banner', async () => {
    crewSetup(); useGame.setState(s => ({team: {...s.team, players: s.team.players.map((p, i) => i === 1 ? {...p, name: '<img src=x onerror=alert(1)>'} : p)}}));
    renderMotion(<CrewStrip />, {reduced: true}); const user = userEvent.setup();
    const strip = screen.getByRole('region', {name: 'Crew table'});
    const players = within(strip).getAllByRole('listitem').filter(li => li.dataset.active !== undefined || li.className.includes('player'));
    expect(players.length).toBeGreaterThanOrEqual(4);
    expect(within(strip).getAllByText('<img src=x onerror=alert(1)>').length).toBeGreaterThan(0); expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(strip.querySelector('[aria-current="true"]').textContent).toMatch(/Player 1/);
    await user.click(within(strip).getByRole('button', {name: 'Pass the controls'}));
    expect(useGame.getState().team.active).toBe(1);
    expect(strip.querySelector('[aria-current="true"]').textContent).toContain('<img src=x onerror=alert(1)>');
    expect((await screen.findAllByRole('status')).some(n => /has the controls as/.test(n.textContent))).toBe(true);
  });

  it('a non-owner suggestion waits; the owner accepts (installs) or declines', async () => {
    crewSetup(); renderMotion(<CrewStrip />, {reduced: true}); const user = userEvent.setup();
    const a = actions(), design0 = useGame.getState().design;
    const other = CATALOG.payload.find(p => p.id !== design0.payload).id;
    act(() => a.suggest('payload', other)); // player 1 (Commander) is not the Science Lead
    const strip = screen.getByRole('region', {name: 'Crew table'});
    expect(within(strip).getByText('Waiting for the owner')).toBeTruthy(); expect(within(strip).queryByRole('button', {name: 'Accept'})).toBeNull();
    for (let i = 0; i < 2; i++) await user.click(within(strip).getByRole('button', {name: 'Pass the controls'})); // 4 players: the Science Lead is the third
    expect(useGame.getState().team.active).toBe(2);
    const accept = await within(strip).findByRole('button', {name: 'Accept'});
    await user.click(accept);
    expect(useGame.getState().design.payload).toBe(other);
    expect(useGame.getState().team.suggestions.at(-1).status).toBe('accepted');
    await waitFor(() => expect(within(strip).queryByRole('button', {name: 'Accept'})).toBeNull());
  });

  it('renders nothing outside crew mode', () => {
    renderMotion(<CrewStrip />); expect(screen.queryByTestId('crew-strip')).toBeNull();
  });
});

void launch;
