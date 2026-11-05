// Public entry of the store package. Feature code imports from '@/store' only.
//
//   const design = useGame(s => s.design);              // subscribe to a slice
//   const analysis = useGame(selectAnalysis);           // memoised calculate()
//   useGame.getState().actions.install('power', 'compact');
import {createGame} from './createGame.js';

export {createGame, SCREENS} from './createGame.js';
export * from './selectors.js';
export {SAVE_KEY, validSavedRun, validCheckpoint, validBoardEntry, loadTeam, freshTeam} from './validators.js';
export {QUESTIONS} from './quiz.js';
export {analyze, runCode, runScore, runReview, teamLabel, PHASES, PHASE_LABEL} from './derive.js';

/** The game store for the running app (browser localStorage). Tests build their own with createGame({storage, ...}). */
export const useGame = createGame();
/** Shorthand: the action table of the singleton store. */
export const actions = useGame.getState().actions;
