// WP9 Report feature entry (picked up automatically by src/shell/features.js).
// The report screen loads as a lazy chunk so the first visit (the board) stays small.
import {Suspense, lazy, createElement} from 'react';
import {PowerFixSheet} from './PowerFixSheet.jsx';
import {strings} from './strings.js';

const Inner = lazy(() => import('./ReportScreen.jsx').then(m => ({default: m.ReportScreen})));
function ReportScreenLazy(props) {
  return createElement(Suspense, {fallback: createElement('p', {role: 'status', className: 'kicker'}, 'Loading the report…')}, createElement(Inner, props));
}

export const screens = {report: ReportScreenLazy};
// Replaces the built-in `power-fix` dialog with a before/after preview; the confirm action is unchanged.
export const sheets = {'power-fix': {component: PowerFixSheet, variant: 'dialog', title: 'Preview power + communications change', size: 'md'}};
export {strings};
