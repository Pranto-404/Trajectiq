// Pure helpers for mission control. No React, no store access: everything takes plain run/analysis data so it is easy to test.
// The engine is never changed; watts, MB/s and the orbit bands are derived here from calculate() values and the run state,
// following the same rules model.js applies per step (so the picture agrees with what the simulation does).
import {linkEnvironment} from '@engine/model.js';

export const PHASE_IDS = ['launch', 'transfer', 'capture', 'operations', 'debrief'];

/** Operations commands. `title` and `detail` are English source strings (translated by the caller). */
export const OPERATION_MODES = [
  {id: 'science', icon: 'payload', title: 'Map in sunlight', detail: 'Pause science in eclipse'},
  {id: 'aggressive', icon: 'eclipse', title: 'Map through shadow', detail: 'More observations, more load'},
  {id: 'coast', icon: 'power', title: 'Conserve energy', detail: 'Pause science and transmitter'},
  {id: 'downlink', icon: 'signal', title: 'Return priority', detail: 'Collect less; drain on contact'}
];

/** Why the operations commands are locked, or '' when they are available. Mirrors the store's `command` guard. */
export function commandLock(run, hasCrisis) {
  if (!run || run.done) return 'No mission in flight';
  if (hasCrisis) return 'Choose the crisis response first';
  if (run.phase !== 'operations') return 'Commands unlock in the operations phase';
  return '';
}

/** Why the clock controls are locked, or ''. */
export function clockLock(run, hasCrisis) {
  if (!run || run.done) return 'No mission in flight';
  if (hasCrisis) return 'Choose the crisis response first';
  return '';
}

/**
 * Repeating teaching schedule as bands over the campaign: sunlit collection, ground contact, shadow.
 * The engine evaluates `(minute + dt/2) % period`, so the bands are a pure function of the campaign minute.
 */
export function orbitBands(a, duration) {
  const period = a.period, eclipse = a.m.eclipseMinutes, contact = a.m.contactMinutes;
  const contactStart = period - eclipse - contact, eclipseStart = period - eclipse;
  const bands = [];
  for (let k = 0, t0 = 0; t0 < duration && k < 400; k++, t0 = k * period) {
    const cut = v => Math.min(duration, t0 + v);
    bands.push({kind: 'sun', from: t0, to: cut(contactStart)}, {kind: 'contact', from: cut(contactStart), to: cut(eclipseStart)}, {kind: 'eclipse', from: cut(eclipseStart), to: cut(period)});
  }
  return bands.filter(b => b.to - b.from > 1e-9);
}

/** Position in the orbit and what comes next, for the headline above the timeline. */
export function nextOrbitEvent(a, minute) {
  const period = a.period, eclipse = a.m.eclipseMinutes, contact = a.m.contactMinutes;
  const position = minute % period, contactStart = period - eclipse - contact, eclipseStart = period - eclipse;
  if (position < contactStart) return {label: 'Ground contact', in: contactStart - position, position};
  if (position < eclipseStart) return {label: 'Shadow', in: eclipseStart - position, position};
  return {label: 'Sunlight', in: period - position, position};
}

/** Nearest history entry at or before `minute` (null for an empty history). Read-only. */
export function historyAt(history, minute) {
  if (!history?.length) return null;
  let found = history[0];
  for (const h of history) { if (h.minute <= minute + 1e-9) found = h; else break; }
  return found;
}

/** A read-only view of the run as it was at a history entry (used while the scrubber is in the past). */
export function pastView(run, entry, batteryCapacity = 1) {
  if (!run || !entry) return run;
  return {...run, minute: entry.minute, battery: entry.battery / 100 * batteryCapacity, backlog: entry.backlog, science: entry.science, fuel: entry.fuel, eclipse: entry.eclipse, contact: entry.contact, safe: entry.mode === 'safe', mode: entry.command || run.mode};
}

const nz = v => Number.isFinite(v) ? v : 0;

/**
 * Energy and data flows for the diagram (watts, MB/s). Derived from calculate() values and the run state with the same
 * rules the engine uses per step. `status` is 'flow' (moving), 'idle' (nothing to move) or 'starved' (demand cannot be met).
 */
export function computeFlows(run, a) {
  const c = a.c, f = run.factors || {solar: 1, link: 1}, M = a.m;
  const wx = run.weather && run.minute >= run.weather.start - 1e-9 && run.minute < run.weather.end - 1e-9 ? run.weather : null;
  const shielded = wx?.choice === 'shield';
  const thr = nz(run.throttle) * (wx?.choice === 'reduce' ? 0.5 : 1);
  const solarW = run.eclipse ? 0 : c.power.solar * 0.85 * f.solar * (wx ? wx.solar : 1);
  const modeId = run.mode;
  const science = !run.safe && !run.contact && !shielded && (!run.eclipse || modeId === 'aggressive') && modeId !== 'downlink' && modeId !== 'coast';
  const tx = run.backlog > 0 && run.contact && !run.safe && !shielded && modeId !== 'coast';
  const boost = (run.linkBoost || 1) > 1;
  const busW = run.safe ? a.base * 0.65 : a.base;
  const payloadW = !run.safe && science ? c.payload.power * thr : 0;
  const txW = !run.safe && tx ? c.comms.power * (boost ? 2 : 1) : 0;
  const loadW = busW + payloadW + txW;
  const degraded = run.minute + M.step >= a.period && run.contact;
  const linkMbps = c.comms.downlinkMbps * linkEnvironment(run.design).factor * f.link * (run.linkBoost || 1) * (degraded ? 0.45 : 1);
  const dataInMBs = science ? c.payload.dataMbps * thr / 8 : 0;
  const downMBs = tx ? linkMbps / 8 : 0;
  const netW = solarW - loadW;
  const fill = c.storage.capacity ? run.backlog / c.storage.capacity : 0;
  const batteryFraction = run.battery / c.power.battery;
  const starvedLoads = loadW > solarW && batteryFraction <= 0.15 + 1e-6;
  const status = {
    array: solarW > 0 ? 'flow' : 'starved',
    battery: netW < 0 && batteryFraction <= 0.3 ? 'starved' : Math.abs(netW) > 0.01 ? 'flow' : 'idle',
    loads: starvedLoads || run.safe ? 'starved' : loadW > 0 ? 'flow' : 'idle',
    payload: payloadW > 0 ? 'flow' : 'idle',
    transmitter: txW > 0 ? 'flow' : 'idle',
    recorder: fill > 0.9 ? 'starved' : dataInMBs > 0 || downMBs > 0 ? 'flow' : 'idle',
    downlink: downMBs > 0 ? 'flow' : 'idle'
  };
  return {solarW, busW, payloadW, txW, loadW, netW, dataInMBs, downMBs, linkMbps, fill, batteryFraction, status, science, tx, shielded, degraded};
}

/** Gauge status words for the telemetry panel. */
export function batteryStatus(fraction) { return fraction <= 0.15 ? 'critical' : fraction < 0.3 ? 'warning' : 'nominal'; }
export function recorderStatus(fraction) { return fraction > 0.9 ? 'critical' : fraction > 0.75 ? 'warning' : 'nominal'; }

/** Direction levels (-3..3) in words, so no chip needs a number. Positive is always better. */
export const DIRECTION_WORD = {'3': 'much higher', '2': 'higher', '1': 'slightly higher', '0': 'about the same', '-1': 'slightly lower', '-2': 'lower', '-3': 'much lower'};
export const directionWord = dir => DIRECTION_WORD[String(Math.max(-3, Math.min(3, Math.round(dir || 0))))];

/** Link state label for the readout. */
export function linkState(run) {
  if (run.safe) return 'safe';
  if (run.eclipse) return 'eclipse';
  return run.contact ? 'contact' : 'sunlit';
}

/** Linear interpolation helper shared by the smoothing hook and its tests. */
export const lerp = (from, to, t) => from + (to - from) * Math.min(1, Math.max(0, t));
