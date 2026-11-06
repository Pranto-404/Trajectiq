import {useEffect, useId, useState} from 'react';
import {linkEnvironment} from '@engine/model.js';
import {missionFor} from '@data/catalog.js';
import {distanceOptions} from '@data/nasa.js';
import {useGame, analyze, isFlightActive} from '@/store/index.js';
import {Button, Chip, Segmented} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {fmt} from '../report/format.js';
import s from './sheets.module.css';

const LIVERY = [['gold', 'Mission gold'], ['cyan', 'Ion cyan'], ['coral', 'Solar coral']];
const BATTERY = [[0.75, 'Light · 75%'], [1, 'Standard · 100%'], [1.25, 'Extra · 125%'], [1.5, 'Deep · 150%']];
const DUTY = [[0.25, '25% · conserve'], [0.5, '50% · cautious'], [0.75, '75% · balanced'], [1, '100% · max']];

/** Array-size choices up to the scenario's own maximum (outer-body scenarios allow larger arrays). Pure; exported for tests. */
export function arrayChoices(max = 1.5) {
  const base = [0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5].filter(v => v <= max + 1e-9);
  if (!base.includes(max) && max > 1.5) base.push(max);
  return base.map(v => [v, `${v === 0.75 ? 'Compact' : v === 1 ? 'Standard' : 'Extended'} · ${Math.round(v * 100)}%`]);
}

function Summary({design}) {
  const t = useT();
  const a = analyze(design), env = linkEnvironment(a.d);
  const rows = [
    [t('Mass'), `${fmt(a.wet, 1)} / ${a.c.launch.capacity} kg`, a.margins.mass < 0], [t('Cost'), `${fmt(a.cost, 1)} / ${a.m.budget} cr`, a.margins.budget < 0],
    [t('Array'), `${fmt(a.c.power.arrayArea, 2)} m² · ${fmt(a.c.power.solar)} W`, false], [t('Battery'), `${fmt(a.c.power.battery)} Wh`, false],
    [t('Link factor'), `${fmt(env.factor * 100, 1)}%`, false], [t('One-way signal'), `${fmt(env.delay, 3)} s`, false]
  ];
  return (
    <div aria-live="polite" className={s.summary}>
      <dl className={s.facts}>{rows.map(([k, v, bad]) => <div key={k} data-bad={bad || undefined}><dt>{k}</dt><dd className="num">{v}{bad ? <Chip kind="fail" size="sm">{t('Over limit')}</Chip> : null}</dd></div>)}</dl>
      <p>{a.launchable ? <Chip kind="pass" size="sm">{t('Can launch')}</Chip> : <Chip kind="fail" size="sm">{t('Blocked')}</Chip>} {a.launchable ? t('Review advisory warnings before committing.') : t('This design has a blocking limit. Reduce mass or cost or fix compatibility before launch.')}</p>
    </div>
  );
}

/** Engineering lab: customize name, colour, array, battery, duty and the Earth distance scenario. Changes save as you make them. */
export function LabSheet() {
  const t = useT();
  const id = useId();
  const design = useGame(st => st.design), prefs = useGame(st => st.prefs), locked = useGame(isFlightActive);
  const act = useGame.getState().actions;
  const mission = missionFor(design);
  const [name, setName] = useState(design.name);
  useEffect(() => { setName(design.name); }, [design.name]);
  const d = {disabled: locked};
  const reason = locked ? t('Hardware is locked after launch') : undefined;
  const set = (field, v) => act.setField(field, v);
  const seg = (field, label, options, note) => (
    <div className={s.field} role="group" aria-label={label}>
      <span>{label}</span>
      <Segmented label={label} value={design[field]} onChange={v => set(field, v)} options={options.map(([v, l]) => ({value: v, label: t(l), disabled: locked}))} />
      <small className={s.muted}>{note}</small>
    </div>
  );
  return (
    <div className={s.sheet}>
      <p>{t('Changes save as you make them. Hardware changes affect the mission; name and colour are cosmetic.')}</p>
      {locked ? <p className={s.notice} role="status">{reason}</p> : null}
      <label className={s.field} htmlFor={`${id}-n`}>{t('Mission name')}
        <input id={`${id}-n`} maxLength={40} value={name} {...d} aria-describedby={`${id}-nh`} onChange={e => { setName(e.target.value); if (e.target.value.trim()) set('name', e.target.value); }} />
        <small id={`${id}-nh`} className={s.muted}>{t('Up to 40 characters. Shown as text everywhere.')}</small>
      </label>
      {seg('livery', t('Spacecraft color'), LIVERY, t('Changes the 3D spacecraft body.'))}
      {seg('arrayScale', t('Solar array size'), arrayChoices(mission.arrayScaleMax || 1.5), t('More panel area means more sunlight power, mass and cost.'))}
      {seg('batteryScale', t('Battery size'), BATTERY, t('More energy storage increases mass and cost.'))}
      {seg('duty', t('Instrument duty'), DUTY, t('Scales instrument power, collected data and science together.'))}
      <label className={s.field} htmlFor={`${id}-d`}>{t('Earth–destination reference distance')}
        <select id={`${id}-d`} value={design.distance} {...d} onChange={e => set('distance', e.target.value)}>
          {Object.entries(distanceOptions(design)).map(([k, v]) => <option key={k} value={k}>{v.name} · {fmt(v.km)} km</option>)}
        </select>
        <small className={s.muted}>{t('Fixed reference values, not a live ephemeris. Farther means a slower modeled link. Labels say when a value is a game assumption.')}</small>
      </label>
      <Summary design={design} />
      <details className={s.disclosure}>
        <summary>{t('How NASA data affects this design')}</summary>
        <p>{t('Solar output = {irr} W/m² × array area × {eff}% assumed cell efficiency; operations apply an additional 85% derating. Link rate scales by (reference / distance)² as a teaching approximation; this is not a complete radio link budget. Signal delay is displayed, not imposed on your controls.', {irr: fmt(mission.solarIrradiance, 1), eff: fmt((mission.arrayEfficiency ?? 0.28) * 100)})}</p>
      </details>
      <div className={s.row}>
        <label className={s.check}><input type="checkbox" checked={prefs.guided} onChange={() => act['guide-toggle']()} /> {t('Show beginner tips')}</label>
        <label className={s.check}><input type="checkbox" checked={prefs.reducedMotion} onChange={() => act['toggle-motion']()} /> {t('Reduce animation')}</label>
      </div>
      <Button variant="primary" data-autofocus onClick={() => act['apply-custom']()}>{t('Save and return to spacecraft')}</Button>
    </div>
  );
}
