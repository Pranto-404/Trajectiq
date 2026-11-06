import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, within, act, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App.jsx';
import {useGame} from '@/store/index.js';
import {resetStore, a} from './util.jsx';

let errors;
beforeEach(() => { resetStore(); errors = vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { a().dispose(); const bad = errors.mock.calls.filter(c => !/not wrapped in act|Motion|Reduced Motion/.test(String(c[0]))); errors.mockRestore(); expect(bad).toEqual([]); });

describe('pre-launch check sheet', () => {
  it('lists every engine check, including recorder-before-first-contact, launch-orbit compatibility and the schedule', async () => {
    a()['game-accept'](); a()['preset-fragile']();
    render(<App />);
    await user_open();
    const sheet = await screen.findByRole('dialog', {name: 'Pre-launch check'});
    for (const name of ['Recorder before first contact', 'Launch–orbit compatibility', 'Development schedule', 'Injected mass', 'Mission budget', 'Maneuver reserve', 'Peak solar margin', 'Eclipse endurance', 'Contact capacity']) expect(within(sheet).getByText(name)).toBeTruthy();
    expect(within(sheet).getAllByText(/^(PASS|WARN|FAIL)$/).length).toBeGreaterThanOrEqual(10);
    expect(within(sheet).getByText(/recorder may fill before the first contact/)).toBeTruthy();
  });

  it('launching is a hold-to-confirm: a tap only arms it, and the flight starts after the confirmation', async () => {
    a()['game-accept'](); render(<App />); const user = userEvent.setup();
    await user_open();
    const sheet = await screen.findByRole('dialog', {name: 'Pre-launch check'});
    const go = within(sheet).getByRole('button', {name: /authorize launch/i});
    fireKey(go);
    expect(useGame.getState().run).toBeNull();
    expect(go.dataset.armed).toBe('true'); // "Press again to confirm"
    fireKey(go);
    await waitFor(() => expect(useGame.getState().run).toBeTruthy());
    expect(useGame.getState().screen).toBe('flight'); void user;
  });

  it('a design with a hard failure cannot be authorized and the reason is exposed', async () => {
    a()['game-accept'](); a().setField('inclination', 30); render(<App />);
    act(() => a().openSheet('launch-check'));
    const sheet = await screen.findByRole('dialog', {name: 'Pre-launch check'});
    const go = within(sheet).getByRole('button', {name: /authorize launch/i});
    expect(go.getAttribute('aria-disabled')).toBe('true'); expect(go).toHaveAccessibleDescription('Fix 1 failed check to launch');
    expect(within(sheet).getByText('FAIL')).toBeTruthy();
  });

  it('in crew mode it shows each role’s sign-off and refuses launch until all four are signed', async () => {
    a()['board-mode']({mode: 'crew'}); a()['board-players']({players: 4}); a()['game-accept'](); render(<App />); const user = userEvent.setup();
    act(() => a()['game-review']());
    const sheet = await screen.findByRole('dialog', {name: 'Pre-launch check'});
    const roll = within(sheet).getByTestId('gonogo');
    expect(within(roll).getAllByRole('button', {name: 'Sign off'})).toHaveLength(4);
    expect(within(sheet).getByRole('button', {name: /authorize launch/i}).getAttribute('aria-disabled')).toBe('true');
    for (const btn of within(roll).getAllByRole('button', {name: 'Sign off'})) await user.click(btn);
    await waitFor(() => expect(within(sheet).getByRole('button', {name: /authorize launch/i}).getAttribute('aria-disabled')).toBeNull());
    expect(within(sheet).queryByRole('button', {name: 'Open the roll call'})).toBeNull(); // shown only once the crew package registers `rollcall`
  });
});

async function user_open() { act(() => a()['game-review']()); }
function fireKey(el) { el.focus(); act(() => { el.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); el.dispatchEvent(new KeyboardEvent('keyup', {key: 'Enter', bubbles: true})); }); }
