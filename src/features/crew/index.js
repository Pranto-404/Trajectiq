// Crew mode (WP8). Screens: none. Sheets: `rollcall`, `crew-setup`. Components for other packages:
//   <CrewVote/>   crisis team vote slot (flight's incident takeover renders it in crew mode)
//   <RollCall/>   animated Go / No-Go roll call (hangar's launch sheet embeds it)
//   <CrewStrip/>  crew table with pass-the-controls and proposals (flight, hangar)
import {RollCallSheet} from './RollCall.jsx';
import {CrewSetup} from './CrewSetup.jsx';
import {strings} from './strings.js';

export {CrewVote} from './CrewVote.jsx';
export {RollCall} from './RollCall.jsx';
export {CrewStrip} from './CrewStrip.jsx';
export {RoleBadge} from './RoleBadge.jsx';
export {voteSummary} from './crewModel.js';

export const sheets = {
  rollcall: {component: RollCallSheet, variant: 'side', title: 'Go / No-Go roll call'},
  'crew-setup': {component: CrewSetup, variant: 'side', title: 'Crew setup'}
};
export {strings};
