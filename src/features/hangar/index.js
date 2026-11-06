// Hangar feature entry (WP5). Picked up by the shell's feature discovery: no shared file is edited.
// The screen and the launch-check sheet load as a lazy chunk (kept out of the initial JS budget); see HangarEntry.jsx.
import {HangarScreen, LaunchCheck, start} from './HangarEntry.jsx';
import {HANGAR_BN} from './strings.js';

export const screens = {hangar: HangarScreen};
// Replaces the shell's basic pre-launch check (same id and title): all engine checks, crew sign-offs, hold-to-confirm launch.
export const sheets = {'launch-check': {component: LaunchCheck, variant: 'side', title: 'Pre-launch check'}};
export const strings = {bn: {...HANGAR_BN, 'Loading the hangar…': 'হ্যাঙ্গার লোড হচ্ছে…'}};
start();
