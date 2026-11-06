// WP10 Sheets feature entry (picked up automatically by src/shell/features.js).
// Heavy bodies (assistant + copilot engine, sources, NASA data) are code-split with React.lazy so the first load stays small.
import {Suspense, lazy, createElement} from 'react';
import {ConceptSheet, conceptTitle} from './ConceptSheet.jsx';
import {HelpSheet} from './HelpSheet.jsx';
import {MenuSheet} from './MenuSheet.jsx';
import {QuizSheet} from './QuizSheet.jsx';
import {HistorySheet} from './HistorySheet.jsx';
import {LabSheet} from './LabSheet.jsx';
import {strings} from './strings.js';

function lazySheet(loader, pick) {
  const Inner = lazy(() => loader().then(m => ({default: m[pick]})));
  const Wrapped = props => createElement(Suspense, {fallback: createElement('p', {role: 'status', className: 'kicker'}, 'Loading…')}, createElement(Inner, props));
  Wrapped.displayName = `Lazy(${pick})`;
  return Wrapped;
}

const AssistantSheet = lazySheet(() => import('./AssistantBody.jsx'), 'AssistantBody');
const SourcesSheet = lazySheet(() => import('./SourcesSheet.jsx'), 'SourcesSheet');
const NasaSheet = lazySheet(() => import('./NasaSheet.jsx'), 'NasaSheet');

export const sheets = {
  assistant: {component: AssistantSheet, variant: 'chat', title: 'Mission assistant'},
  concept: {component: ConceptSheet, variant: 'dialog', title: conceptTitle, size: 'md'},
  quiz: {component: QuizSheet, variant: 'dialog', title: 'Learning check', size: 'md'},
  help: {component: HelpSheet, variant: 'dialog', title: 'How to play', size: 'md'},
  sources: {component: SourcesSheet, variant: 'dialog', title: 'Sources & method', size: 'lg'},
  nasa: {component: NasaSheet, variant: 'dialog', title: 'NASA data & credits', size: 'lg'},
  lab: {component: LabSheet, variant: 'side', title: 'Engineering lab'},
  history: {component: HistorySheet, variant: 'dialog', title: 'Run history', size: 'md'},
  menu: {component: MenuSheet, variant: 'side', title: 'Menu'}
};
export {strings};
