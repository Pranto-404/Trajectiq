// Feature discovery. Each package under src/features/<name>/ exports ONE entry, src/features/<name>/index.js:
//
//   export const screens = {hangar: HangarScreen};                     // optional: replaces the placeholder for board|hangar|flight|report
//   export const sheets  = {assistant: {component, variant, title}};   // optional: sheet registrations (see src/sheets/registry.js)
//   export const strings = {bn: {'English text': 'বাংলা'}};            // optional: extra Bengali strings
//   export default {screens, sheets, strings};                          // either style works
//
// import.meta.glob picks entries up automatically, so adding a feature never edits shared code.
import {registerSheet} from '../sheets/registry.js';
import {registerStrings} from '../i18n/translate.js';
import {registerBuiltinSheets} from './builtinSheets.jsx';
import {Placeholders} from './placeholders.jsx';

const discovered = import.meta.glob('../features/*/index.js', {eager: true});
const screens = {...Placeholders};
let loaded = false;

/** Merge one feature module (exported for tests). */
export function registerFeature(mod, name = 'feature') {
  const f = {...(mod?.default || {}), ...mod};
  for (const [id, Component] of Object.entries(f.screens || {})) { if (!(id in Placeholders)) throw new Error(`${name}: unknown screen "${id}"`); screens[id] = Component; }
  for (const [id, def] of Object.entries(f.sheets || {})) registerSheet(id, typeof def === 'function' ? {component: def, variant: 'auto', title: id} : def);
  for (const [lang, entries] of Object.entries(f.strings || {})) registerStrings(lang, entries);
}

export function loadFeatures(modules = discovered) {
  if (loaded && modules === discovered) return screens;
  registerBuiltinSheets();
  for (const [path, mod] of Object.entries(modules)) registerFeature(mod, path);
  if (modules === discovered) loaded = true;
  return screens;
}

export const getScreen = id => screens[id] || Placeholders.board;
