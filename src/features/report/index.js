// WP9 Report feature entry (picked up automatically by src/shell/features.js).
import {ReportScreen} from './ReportScreen.jsx';
import {PowerFixSheet} from './PowerFixSheet.jsx';
import {strings} from './strings.js';

export const screens = {report: ReportScreen};
// Replaces the built-in `power-fix` dialog with a before/after preview; the confirm action is unchanged.
export const sheets = {'power-fix': {component: PowerFixSheet, variant: 'dialog', title: 'Preview power + communications change', size: 'md'}};
export {strings};
