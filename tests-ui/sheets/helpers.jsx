import {render} from '@testing-library/react';
import {normalize} from '@engine/model.js';
import {presetFor} from '@data/catalog.js';
import {MotionProvider} from '@/ds/index.js';
import {useGame} from '@/store/index.js';

export const EVIL = '<img src=x onerror=alert(1)><script>alert(2)</script>';
export const wrap = ui => render(ui, {wrapper: ({children}) => <MotionProvider reduced>{children}</MotionProvider>});
export const acts = () => useGame.getState().actions;

const initial = useGame.getState();
/** Reset the singleton store to a clean balanced Moon draft (reduced motion on). */
export function resetStore(extra = {}) {
  localStorage.clear();
  useGame.getState().actions.dispose();
  useGame.setState({...initial, prefs: {...initial.prefs, reducedMotion: true}, design: normalize(presetFor('moon', 'balanced')), ...extra}, true);
}

/** Launch the current draft and fly with `fast()` until a decision is pending (or the mission ends). */
export function flyToCrisis() {
  acts()['game-launch']();
  for (let i = 0; i < 40 && !useGame.getState().run.crisis && !useGame.getState().run.done; i++) acts().fast();
  return useGame.getState().run;
}
