import {act, render} from '@testing-library/react';
import {MotionProvider} from '@/ds/index.js';
import {useGame} from '@/store/index.js';

export const initial = useGame.getState();
export const actions = () => useGame.getState().actions;

/** Reset the singleton store between tests. */
export function resetStore(prefs = {}) {
  localStorage.clear();
  useGame.getState().actions.dispose();
  useGame.setState({...initial, prefs: {...initial.prefs, reducedMotion: true, ...prefs}}, true);
}

/** Render inside the reduced-motion provider (the real app is wrapped by the shell). */
export function renderMotion(ui, {reduced = true} = {}) {
  return render(ui, {wrapper: ({children}) => <MotionProvider reduced={reduced}>{children}</MotionProvider>});
}

/** Launch the fragile preset (it reaches a recorder crisis quickly) and pause the clock. */
export function launch({crew = 0, preset = 'preset-fragile'} = {}) {
  const a = actions();
  act(() => {
    if (crew) { a['board-mode']({mode: 'crew'}); a['board-players']({players: crew}); }
    a['game-accept'](); a[preset]();
    if (crew) for (const r of ['commander', 'engineer', 'science', 'power']) a['crew-signoff']({role: r});
    a['game-launch'](); a.pause();
  });
  return useGame.getState().run;
}

/** Advance (without playing) until the first crisis or the end of the mission. */
export function toCrisis() {
  act(() => actions().fast());
  return useGame.getState().run;
}

/** Step until the operations phase. */
export function toOperations() {
  for (let i = 0; i < 12 && useGame.getState().run.phase !== 'operations'; i++) act(() => actions().step());
  return useGame.getState().run;
}
