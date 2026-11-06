import {Button, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {criticalLabel} from './missionInfo.js';
import {PlanetOrb} from './PlanetOrb.jsx';
import s from './board.module.css';

/** Original mission-patch illustration. Decorative orbits are schematic, never trajectory data. */
export function MissionHero({mission, card, need, locked, onBuild, onHelp}) {
  const t = useT();
  return <header className={s.missionHero}>
    <div className={s.heroCopy}>
      <span className={s.eyebrow}><i aria-hidden="true" /> {t('MISSION DESIGN LAB')} <span>/ 01</span></span>
      <h1>{t('Plan your mission.')}<br /><em>{t('Make every choice count.')}</em></h1>
      <p>{t('Build a spacecraft. Balance the trade-offs. Bring the science home.')}</p>
      <div className={s.heroActions}>
        <Button variant="primary" size="lg" iconEnd="arrow-right" disabled={locked} disabledReason={locked ? t('Finish or discard the active flight first.') : undefined} onClick={onBuild}>{t('Build selected mission')}</Button>
        <Button variant="ghost" icon="help" onClick={onHelp}>{t('How to play')}</Button>
      </div>
      <div className={s.selectedBrief} aria-live="polite">
        <span>{t('YOUR OBJECTIVE')}</span><strong>{mission.title}</strong>
        <small>{t('Watch your')} {t(criticalLabel(card?.critical))}. {t('Only science returned to Earth counts.')}</small>
      </div>
    </div>
    <div className={s.missionArt} aria-hidden="true">
      <div className={s.artGrid} />
      <span className={s.artCoordinates}>TRAJECTIQ / {mission.destination.toUpperCase()}</span>
      <div className={s.orbitalSystem} key={mission.destination}>
        <div className={s.orbitTrack} /><div className={s.orbitTrackOuter} />
        <div className={s.heroPlanet}><PlanetOrb body={mission.destination} colors={card?.body?.colors} size={180} /></div>
        <div className={s.satelliteOrbit}><span><Icon name="bus" size={24} /></span></div>
        <div className={s.signalRing} /><div className={s.signalRing} />
      </div>
      <div className={s.artReadout}><span>{t('SCIENCE TARGET')}<strong>{need} <small>{t('units')}</small></strong></span><span>{t('MISSION BUDGET')}<strong>{mission.budget} <small>cr</small></strong></span></div>
      <span className={s.artFoot}>{t('Schematic mission artwork · not a trajectory')}</span>
    </div>
    <ol className={s.missionSteps} aria-label={t('Your mission journey')}>
      {['Choose a science goal', 'Engineer your spacecraft', 'Fly & make decisions', 'Learn & redesign'].map((step, i) => <li key={step}><span>0{i + 1}</span>{t(step)}<Icon name={['orbit', 'bus', 'launch', 'check'][i]} size={18} /></li>)}
    </ol>
  </header>;
}
