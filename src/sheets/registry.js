// Sheet registry. Anything that is a dialog or drawer over the game is a "sheet" with an id.
//
//   import {openSheet} from '@/sheets/registry';
//   openSheet('concept', {topic: 'eclipse'});
//
// A feature registers its sheets from its src/features/<name>/index.js (see src/shell/features.js):
//   export const sheets = {assistant: {component: AssistantSheet, variant: 'side', title: 'Mission assistant'}};
// A registration replaces the built-in placeholder with the same id; nothing in shared code changes.
//
// def: {component, variant: 'dialog' | 'side' | 'bottom' | 'auto', title: string | (props) => string, size?: 'sm'|'md'|'lg', dismissible?: boolean}
// The component renders only the body. It receives the sheet props plus `close()`.
import {useGame} from '../store/index.js';

/** Ids reserved by the plan, with their owners. Unregistered ids render a clearly labelled placeholder. */
export const SHEET_OWNERS = {
  assistant: 'WP10', help: 'WP10', sources: 'WP10', lab: 'WP10', nasa: 'WP10', history: 'WP10', quiz: 'WP10', concept: 'WP10',
  'crew-setup': 'WP8', rollcall: 'WP8', menu: 'WP4',
  'launch-check': 'WP5/WP1', 'power-fix': 'WP1', 'import-confirm': 'WP1', 'confirm-clear': 'WP1', 'rejected-save': 'WP1', resume: 'WP1', 'discard-flight': 'WP1'
};

const defs = new Map();

export function registerSheet(id, def) {
  if (!id || typeof id !== 'string') throw new Error('registerSheet needs an id');
  if (!def || !(typeof def.component === 'function' || (typeof def.component === 'object' && def.component))) throw new Error(`registerSheet(${id}) needs a component`);
  defs.set(id, {variant: 'auto', ...def, id});
}
export const getSheet = id => defs.get(id) || null;
export const listSheets = () => [...defs.keys()];
export const hasSheet = id => defs.has(id);

export const openSheet = (id, props) => useGame.getState().actions.openSheet(id, props);
export const closeSheet = () => useGame.getState().actions.closeSheet();
