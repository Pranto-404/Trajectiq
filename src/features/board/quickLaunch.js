// Quick launch: accept the mission with the Balanced build and open the launch sheet ("three taps to launch").
// The store's preset action loads the destination's Balanced parts from scratch, which drops the scenario, difficulty and
// sandbox choices made on the board, so they are re-applied through their own guarded actions afterwards. Nothing here
// writes the design directly: every guard (flight lock, damaged save, crew ownership) still decides.

/** Runs the quick-launch sequence against a store hook. Returns true when the launch sheet was requested. */
export function quickLaunch(store) {
  const {scenario, difficulty, sandbox} = store.getState().design;
  const a = store.getState().actions;
  a['preset-balanced']();
  if (store.getState().screen !== 'hangar') return false; // blocked; the store already told the player why
  if (scenario && store.getState().design.scenario !== scenario) a['board-scenario']({scenario});
  if (difficulty && store.getState().design.difficulty !== difficulty) a['board-difficulty']({difficulty});
  if (!!sandbox !== !!store.getState().design.sandbox) a['board-mode']({mode: sandbox ? 'sandbox' : 'solo'});
  a['game-review']();
  return true;
}
