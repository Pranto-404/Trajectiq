import {useMemo} from 'react';
import {useGame} from '../store/index.js';
import {fx} from './fx.js';

/** const {play, haptic, cue, enabled, hapticsEnabled, toggleSound} = useFx(); */
export function useFx() {
  const sound = useGame(s => s.prefs.sound), haptics = useGame(s => s.prefs.haptics);
  const actions = useGame(s => s.actions);
  return useMemo(() => ({
    play: name => fx.play(name), haptic: p => fx.haptic(p), cue: name => fx.cue(name),
    enabled: sound, hapticsEnabled: haptics, supported: fx.supported,
    toggleSound: () => { fx.unlock(); actions['toggle-sound'](); }, toggleHaptics: () => { fx.unlock(); actions['toggle-haptics'](); }
  }), [sound, haptics, actions]);
}
