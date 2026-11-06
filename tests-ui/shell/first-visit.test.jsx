import {it, expect} from 'vitest';
import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {FirstVisitGuide} from '@/shell/FirstVisitGuide.jsx';
import {useGame} from '@/store/index.js';
import {wrap, resetStore} from '../sheets/helpers.jsx';

it('gives new players a short guide and dismisses it without changing their design', async () => {
  resetStore({firstVisit: true});
  const design = useGame.getState().design;
  wrap(<FirstVisitGuide />);
  expect(screen.getByRole('region', {name: 'Your first mission'})).toBeTruthy();
  await userEvent.setup().click(screen.getByRole('button', {name: 'Start exploring'}));
  expect(screen.queryByRole('region', {name: 'Your first mission'})).toBeNull();
  expect(useGame.getState().design).toEqual(design);
  expect(useGame.getState().prefs.overviewSeen).toBe(true);
});
