// Board feature entry (WP4). Picked up by the shell's feature discovery: no shared file is edited.
import {BoardScreen} from './BoardScreen.jsx';
import {BOARD_BN} from './strings.js';

export const screens = {board: BoardScreen};
export const strings = {bn: BOARD_BN};
export {PitchBanner} from './PitchBanner.jsx';
export {captureFlip, takeFlip, flipDelta} from './flip.js';
export {quickLaunch} from './quickLaunch.js';
