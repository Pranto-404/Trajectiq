import {beforeEach, it, expect} from 'vitest';
import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {DesignAdvisor, priorityCheck} from '@/features/hangar/DesignAdvisor.jsx';
import {resetStore, renderIn, a} from './util.jsx';
import {useGame} from '@/store/index.js';

beforeEach(() => resetStore());
it('prioritizes hard failures, then the mission-critical warning', () => {
  const schedule = {id: 'schedule', status: 'warn'}, power = {id: 'power', status: 'warn'}, mass = {id: 'mass', status: 'fail'};
  expect(priorityCheck([schedule, power], 'power')).toBe(power);
  expect(priorityCheck([schedule, power, mass], 'power')).toBe(mass);
  expect(priorityCheck([{id: 'power', status: 'pass'}], 'power')).toBeNull();
});
it('opens diagnostics for a blocked design while keeping launch blocked', async () => {
  a().setField('inclination', 30); renderIn(<DesignAdvisor />);
  const user = userEvent.setup();
  expect(screen.getByRole('heading', {name: 'Launch–orbit compatibility'})).toBeTruthy();
  await user.click(screen.getByRole('button', {name: 'View all checks'}));
  expect(useGame.getState().sheet.id).toBe('launch-check');
  a()['game-launch'](); expect(useGame.getState().run).toBeNull();
});
it('science path controls select actual spacecraft subsystems', async () => {
  renderIn(<DesignAdvisor />); const user = userEvent.setup();
  const path = screen.getByLabelText('Science data path');
  await user.click(within(path).getByRole('button', {name: /Return/}));
  expect(useGame.getState().category).toBe('comms');
  await user.click(within(path).getByRole('button', {name: /Store/}));
  expect(useGame.getState().category).toBe('storage');
});
