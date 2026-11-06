// Feature entry for the 3D stage (WP6). It registers no screen: screens render <Stage3D/> themselves.
// Everything here is light; three.js and react-three-fiber live in the lazy chunk behind StageCanvas.jsx.
export {Stage3D} from './Stage3D.jsx';
export {SceneFallback} from './SceneFallback.jsx';
export {ASSET_CREDITS, ASSET_NOTICE} from './credits.js';
export {CAMERA_PRESETS, PRESET_IDS} from './camera.js';
export {bodyVisualFor, BODY_VISUALS} from './bodyVisuals.js';
export {KINDS as STAGE_PART_KINDS} from './parts.js';
export {disposeHost as disposeStage} from './host.js';

export const strings = {
  bn: {
    'Schematic view': 'পরিকল্পিত দৃশ্য',
    'Planetary maps: NASA, NASA/JPL-Caltech, NASA Goddard SVS, NASA Earth Observatory and the NASA 3D Resources collection.': 'গ্রহের মানচিত্র: NASA, NASA/JPL-Caltech, NASA Goddard SVS, NASA Earth Observatory এবং NASA 3D Resources সংগ্রহ।'
  }
};
