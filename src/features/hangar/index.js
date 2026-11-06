// Hangar feature entry (WP5). Picked up by the shell's feature discovery: no shared file is edited.
import {HangarScreen} from './HangarScreen.jsx';
import {LaunchCheckSheet} from './LaunchCheckSheet.jsx';
import {HANGAR_BN} from './strings.js';

export const screens = {hangar: HangarScreen};
// Replaces the shell's basic pre-launch check (same id and title): all engine checks, crew sign-offs, hold-to-confirm launch.
export const sheets = {'launch-check': {component: LaunchCheckSheet, variant: 'side', title: 'Pre-launch check'}};
export const strings = {bn: HANGAR_BN};
