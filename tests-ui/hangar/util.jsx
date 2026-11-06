import {render} from '@testing-library/react';
import {MotionProvider} from '@/ds/index.js';
import {useGame} from '@/store/index.js';

export const initial = useGame.getState();
export const a = () => useGame.getState().actions;

/** Reset the singleton store between tests (the same approach as tests-ui/shell/app.test.jsx). */
export function resetStore(prefs = {}) {
  localStorage.clear();
  useGame.setState(initial, true);
  a().dispose();
  useGame.setState({prefs: {...initial.prefs, reducedMotion: true, guided: false, ...prefs}});
}

export const renderIn = (ui, {reduced = true} = {}) => render(ui, {wrapper: ({children}) => <MotionProvider reduced={reduced}>{children}</MotionProvider>});

/** Pretend to be a phone (max-width media queries match) for the duration of a test. Returns a restore function. */
export function mockViewport({narrow = false, fine = false} = {}) {
  const prev = window.matchMedia;
  window.matchMedia = q => ({matches: /max-width: 760px/.test(q) ? narrow : /hover: hover/.test(q) ? fine : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}});
  return () => { window.matchMedia = prev; };
}

/** A crew store with 4 players: player 0 is the Commander and does not own power (the Power & Comms officer does). */
export function crewOf(n = 4) {
  a()['board-mode']({mode: 'crew'});
  a()['board-players']({players: n});
}
