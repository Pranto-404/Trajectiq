import {Chip, Concept, Icon, Panel} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {criticalLabel, learnTopicFor} from './missionInfo.js';
import {PlanetOrb} from './PlanetOrb.jsx';
import s from './board.module.css';

const fmt = v => Number(v).toLocaleString('en-US', {maximumFractionDigits: 1});

/**
 * Mission charter: what the player is signing up for. Every number comes from missionFor(design) (nothing assumes the Moon,
 * 240 minutes or a 1.5x array). Shows the critical resource with its "?" concept trigger, the space-weather warning, the
 * body's simplification note and the values the engine flags as game assumptions.
 */
export function Charter({mission, need, card, colors, unverified, sandbox, children}) {
  const t = useT();
  const topic = learnTopicFor(mission.critical);
  const reqs = [
    [t('Budget'), `${fmt(mission.budget)} ${t('credits')}`],
    [t('Science target'), `${need} ${t('of')} ${mission.scienceTarget} ${t('units returned')}`],
    [t('Campaign'), `${mission.duration} ${t('minutes after capture')}`],
    [t('Schedule'), `${t('ready within')} ${mission.deadline} ${t('months')}`],
    [t('Orbit'), `${mission.altitudeMin}–${mission.altitudeMax} km`],
    [t('Ground contact'), `${mission.contactMinutes} ${t('minutes per orbit')}`],
    [t('Array size'), `${t('up to')} ${mission.arrayScaleMax}× ${t('the standard array')}`]
  ];
  return (
    <Panel kicker={t('Mission charter')} title={mission.title} badge={<Chip kind="info" size="sm" icon={null}>{sandbox ? t('SANDBOX · UNRANKED') : String(mission.difficultyLabel).toUpperCase()}</Chip>} className={s.charter} data-testid="charter">
      <div className={s.charterHero}>
        <PlanetOrb body={mission.bodyName} colors={colors} />
        <div className={s.charterIntro}>
          <span className="kicker">{mission.scenarioTag} · {mission.bodyName}</span>
          <p>{mission.scenarioSummary}</p>
        </div>
      </div>
      <ul className={s.reqList}>
        {reqs.map(([k, v]) => <li key={k}><span>{k}</span><strong className="num">{v}</strong></li>)}
      </ul>
      <p className={s.criticalLine}>
        <strong>{t('Most critical resource')}:</strong> {t(criticalLabel(mission.critical))}.
        {topic ? <Concept id={topic} label={t(criticalLabel(mission.critical))} /> : null}
      </p>
      {mission.weather ? <p className={`${s.criticalLine} ${s.warnText}`}><Icon name="warning" size={14} /> {t('Expect the unexpected')}: {t('a')} {String(mission.weather.title).toLowerCase()} {t('can strike mid-campaign.')}</p> : null}
      {mission.simplification ? (
        <p className={s.notice} role="note"><Icon name="info" size={16} /><span><strong>{t('Simplification')}:</strong> {mission.simplification}</span></p>
      ) : null}
      {card?.realMission || card?.assumptions || unverified.length || card?.realNumbers?.length ? (
        <details className={s.details}>
          <summary>{t('Data notes and game assumptions')}</summary>
          {card?.realMission ? <p><strong>{t('Real mission behind it')}:</strong> {String(card.realMission)}</p> : null}
          {card?.realNumbers?.length ? (
            <ul className={s.noteList}>
              {card.realNumbers.map((n, i) => <li key={i}><strong>{n.label}:</strong> {n.value}{n.source ? <> · <a href={n.source} target="_blank" rel="noopener noreferrer">{t('source')}</a></> : null}</li>)}
            </ul>
          ) : null}
          {card?.assumptions ? <p>{card.assumptions}</p> : null}
          {unverified.length ? (
            <>
              <p><strong>{unverified.length} {t('values for this body have no NASA source and are game assumptions')}:</strong></p>
              <ul className={s.noteList}>{unverified.map(r => <li key={r.id}>{r.label}{r.note ? ` · ${r.note}` : ''}</li>)}</ul>
            </>
          ) : null}
        </details>
      ) : null}
      {children}
    </Panel>
  );
}
