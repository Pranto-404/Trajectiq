import {fx, configureFx} from './fx.js';

/**
 * Connects the store to fx: preferences feed the synth, the first user gesture unlocks audio, and key game moments
 * play their cue. Returns an unbind function. Nothing plays unless prefs.sound / prefs.haptics are on.
 */
export function bindFx(useGame, instance = fx, target = globalThis) {
  configureFx(() => useGame.getState().prefs);
  const unlock = () => { instance.unlock(); off(); };
  const events = ['pointerdown', 'keydown', 'touchend'];
  const off = () => events.forEach(e => target.removeEventListener?.(e, unlock, true));
  events.forEach(e => target.addEventListener?.(e, unlock, {capture: true, passive: true}));

  const unsubscribe = useGame.subscribe((s, p) => {
    const cue = name => instance.cue(name);
    if (s.prefs.sound && !p.prefs.sound) { instance.unlock(); instance.play('tick'); }
    // a part installed or changed in the hangar
    if (s.design !== p.design && !(s.run && !s.run.done) && ['power', 'payload', 'bus', 'propulsion', 'comms', 'storage', 'launch'].some(k => s.design[k] !== p.design[k])) cue('seat');
    // launch
    if (s.launchCount > p.launchCount) cue('launch');
    // a crisis appears
    if (s.run?.crisis && !p.run?.crisis) cue('warn');
    // finish: success when the objective was met, otherwise the lower warning tone
    if (s.run?.done && !p.run?.done) cue(s.run.outcome?.achieved ? 'success' : 'nogo');
    // crew sign-off
    if (Object.keys(s.team.signed || {}).length > Object.keys(p.team.signed || {}).length) cue('go');
    // clock and command controls
    if (s.speed !== p.speed || (s.run && p.run && s.run.mode !== p.run.mode)) cue('tick');
  });
  return () => { off(); unsubscribe(); };
}
