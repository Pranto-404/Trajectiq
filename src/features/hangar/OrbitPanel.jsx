import {useState} from 'react';
import {Chip, Concept, Panel, Segmented, Slider} from '@/ds/index.js';
import {useGame, selectActiveDesign, selectAnalysis, selectMission, selectOrbitOptions} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {destinationOptions} from '../board/missionInfo.js';
import {useLocked, fmt} from './hooks.js';
import s from './hangar.module.css';

/**
 * A numeric hardware field with ghost-then-commit behaviour: while the slider moves (or a number is typed) the gauges show a
 * ghost of the consequence and the design is NOT touched; releasing the thumb, pressing Enter or leaving the field commits it
 * once (so a crew non-owner gets one explanation, not one per pixel).
 */
function useDraftField(field, current) {
  const a = useGame(st => st.actions);
  const [draft, setDraft] = useState(null);
  return {
    value: draft ?? current,
    onChange: v => { setDraft(v); a.previewField(field, v); },
    onCommit: v => { setDraft(null); a.clearPreview(); if (Number.isFinite(v) && v !== current) a.setField(field, v); }
  };
}

const INCLINATIONS = [[90, 'Polar'], [60, 'Mid-inclination'], [30, 'Low-inclination']];

/** Destination, propellant, orbit altitude and inclination, and the four checked orbit options. Disabled with a visible reason in flight. */
export function OrbitPanel({compact = false}) {
  const t = useT();
  const locked = useLocked();
  const a = useGame(st => st.actions);
  const design = useGame(selectActiveDesign), analysis = useGame(selectAnalysis), mission = useGame(selectMission), options = useGame(selectOrbitOptions);
  const fuel = useDraftField('fuel', design.fuel), altitude = useDraftField('altitude', design.altitude);
  const why = locked ? t('Hardware is locked after launch') : undefined;
  const dests = destinationOptions();
  const far = Number.isFinite(mission.referenceDistance) && mission.referenceDistance > 1e7;
  return (
    <Panel kicker={t('Orbit and propellant')} title={t('Mission orbit')} state={locked ? 'locked' : 'default'} className={compact ? `${s.flat} ${s.orbitCompact}` : undefined} data-testid="orbit-panel">
      <div className={s.field}>
        <label htmlFor="mission-destination" className={s.fieldLabel}>{t('Choose destination')}</label>
        <select id="mission-destination" className={s.select} value={design.destination} disabled={locked} aria-describedby="destination-help"
          onChange={e => a.setDestination(e.target.value)}>
          {dests.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          {dests.some(d => d.value === design.destination) ? null : <option value={design.destination}>{design.destination}</option>}
        </select>
        <small id="destination-help" className={s.fine}>
          {t('Switching destination loads its starter design.')}{' '}
          {far ? t('{body} uses a {km} million km reference distance for the link. That is a game choice for normalising the radio link, not a measured average.', {body: mission.bodyName, km: fmt(mission.referenceDistance / 1e6)}) : ''}
        </small>
      </div>
      <Slider label={t('Propellant')} unit="kg" min={0} max={analysis.c.propulsion.maxFuel} step={1} value={fuel.value} onChange={fuel.onChange} onCommit={fuel.onCommit} disabled={locked} disabledReason={why} />
      <Slider label={t('Orbit altitude')} unit="km" min={mission.altitudeMin} max={mission.altitudeMax} step={10} value={altitude.value} onChange={altitude.onChange} onCommit={altitude.onCommit} disabled={locked} disabledReason={why}
        help={<Concept id="altitude" label={t('Orbit altitude')} />} />
      <div className={s.field}>
        <span className={s.fieldLabel} id="incl-label">{t('Inclination')}<Concept id="inclination" label={t('Inclination')} /></span>
        <Segmented label={t('Inclination')} value={design.inclination} onChange={v => a.setField('inclination', v)} fullWidth
          options={INCLINATIONS.map(([v, name]) => ({value: v, label: `${v}° ${t(name)}`, disabled: locked}))} />
      </div>
      <div className={s.orbitOptions} role="group" aria-label={t('Orbit options')}>
        <span className={s.fieldLabel}>{t('Orbit options')}<Concept id="altitude" label={t('About orbits')} /></span>
        {options.map(o => (
          <button key={o.name} type="button" className={s.orbitOption} aria-pressed={o.selected} aria-disabled={locked || undefined} data-inc={o.inclination} data-alt={o.altitude}
            onClick={() => { if (!locked) a['orbit-preset']({inc: o.inclination, alt: o.altitude}); }}>
            <strong>{t(o.name)}</strong>
            <span className="num">{fmt(o.period)} min {t('orbit')} · {fmt(o.shadowMinutes)} min {t('shadow')}</span>
            <small>{t(o.note)}{o.reachable ? null : <> <Chip kind="warn" size="sm">{t('Not reachable by')} {o.launcher}</Chip></>}</small>
          </button>
        ))}
      </div>
      {locked ? <p className={s.lockNote} role="note">{why}. {t('Finish or discard this flight to edit.')}</p> : null}
    </Panel>
  );
}
