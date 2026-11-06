import {useMemo, useRef, useState} from 'react';
import {motion} from 'motion/react';
import {neededScience, missionFor} from '@data/catalog.js';
import {Button, Panel, Segmented, useReducedMotion} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {captureFlip} from './flip.js';
import {enterProps, useFinePointer} from './motionUtil.js';
import {playMode, scenarioGroups, scenarioCards, difficultyList, unverifiedRows} from './missionInfo.js';
import {quickLaunch} from './quickLaunch.js';
import {ScenarioCard} from './ScenarioCard.jsx';
import {CrewSetup} from './CrewSetup.jsx';
import {Charter} from './Charter.jsx';
import {PitchBanner} from './PitchBanner.jsx';
import {Stage3D} from '../stage/index.js';
import s from './board.module.css';

/** Mission board: mode, scenarios (every scenario the engine offers, grouped by body), difficulty, charter, crew setup, quick launch. */
export function BoardScreen() {
  const t = useT();
  const reduced = useReducedMotion();
  const tilt = useFinePointer();
  const root = useRef(null);
  const [destination, setDestination] = useState('all');
  const design = useGame(st => st.design), team = useGame(st => st.team), run = useGame(st => st.run), a = useGame(st => st.actions);
  const locked = !!(run && !run.done);
  const mission = useMemo(() => missionFor(design), [design]);
  const need = neededScience(mission);
  const groups = useMemo(() => scenarioGroups(mission.difficulty), [mission.difficulty]);
  const selectedCard = useMemo(() => scenarioCards(mission.difficulty).find(c => c.id === mission.scenarioId), [mission.difficulty, mission.scenarioId]);
  const unverified = useMemo(() => unverifiedRows(mission.destination), [mission.destination]);
  const colors = selectedCard?.body?.colors || null;
  const mode = playMode(design, team);
  const diffs = difficultyList();
  const diff = diffs.find(d => d.id === mission.difficulty);
  const lockReason = t('Finish or discard the active flight first.');

  const remember = () => captureFlip(root.current?.querySelector('[data-flip-source]'));
  const accept = () => { remember(); a['game-accept'](); };
  const quick = () => { remember(); quickLaunch(useGame); };

  let index = 0;
  return (
    <div className={s.screen} data-screen="board" ref={root}>
      <PitchBanner />
      <motion.header className={s.hero} {...enterProps(0, reduced)}>
        <div>
          <span className="kicker">{t('Step 1 / Define your mission')}</span>
          <h1>{t('Plan your mission.')}</h1>
          <p className={s.lede}>{t('Pick how you play, choose an objective, then build the spacecraft that can reach it.')}</p>
        </div>
        <div className={s.row}>
          <Button variant="ghost" size="sm" icon="payload" onClick={() => a.customize()} disabled={locked} disabledReason={locked ? lockReason : undefined}>{t('Engineering lab')}</Button>
        </div>
      </motion.header>

      {locked ? (
        <Panel state="warning" kicker={t('Flight in progress')} title={t('Hardware is locked')} data-testid="flight-lock">
          <p>{t('Finish or discard the active flight to change the mission.')}</p>
          <div className={s.row}>
            <Button variant="primary" size="sm" onClick={() => a.go('flight')}>{t('Back to flight')}</Button>
            <Button variant="danger" size="sm" onClick={() => a.start()}>{t('Discard / new mission')}</Button>
          </div>
        </Panel>
      ) : null}

      <div className={s.layout}>
        <div className={s.main}>
          <motion.section className={s.block} aria-label={t('Play mode')} {...enterProps(1, reduced)}>
            <span className="kicker">{t('How you play')}</span>
            <Segmented label={t('Mode')} value={mode} onChange={v => a['board-mode']({mode: v})} fullWidth
              options={[{value: 'solo', label: t('Solo'), icon: 'assistant', hint: t('You play every role')}, {value: 'crew', label: t('Crew'), icon: 'share', hint: t('2–4 players, shared decisions')}, {value: 'sandbox', label: t('Sandbox'), icon: 'motion', hint: t('No budget cap, unranked')}].map(o => ({...o, disabled: locked}))} />
            <p className={s.note}>{mode === 'solo' ? t('You play every role') : mode === 'crew' ? t('2–4 players, shared decisions') : t('No budget cap, unranked')}</p>
          </motion.section>

          {mode === 'crew' ? <CrewSetup reduced={reduced} locked={locked} /> : null}

          <section className={s.block} aria-label={t('Difficulty')}>
            <span className="kicker">{t('Difficulty')}</span>
            <Segmented label={t('Difficulty')} value={mission.difficulty} onChange={v => a['board-difficulty']({difficulty: v})} fullWidth
              options={diffs.map(d => ({value: d.id, label: d.label, hint: d.blurb, disabled: locked}))} />
            {diff ? <p className={s.note}>{diff.blurb}</p> : null}
          </section>

          <section className={s.block} aria-label={t('Objective')}>
            <span className="kicker">{t('Objective')}</span>
            <div className={s.destinations} role="group" aria-label={t('Filter destinations')}>
              <button type="button" aria-pressed={destination === 'all'} onClick={() => setDestination('all')}>{t('All destinations')}</button>
              {groups.map(g => <button type="button" key={g.destination} aria-pressed={destination === g.destination} onClick={() => setDestination(g.destination)}>{g.label}</button>)}
            </div>
            <div className={s.groups} role="group" aria-label={t('Scenario')}>
              {groups.filter(g => destination === 'all' || g.destination === destination).map(g => (
                <div key={g.destination} className={s.groupBlock}>
                  <h2 className={s.groupTitle}>{g.label}</h2>
                  <div className={s.cards}>
                    {g.cards.map(card => (
                      <ScenarioCard key={card.id} card={card} index={index++} reduced={reduced} tilt={tilt} locked={locked}
                        selected={card.id === mission.scenarioId} assumed={unverifiedRows(card.destination).length > 0}
                        onSelect={id => a['board-scenario']({scenario: id})} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        <motion.aside className={s.side} aria-label={t('Mission charter')} {...enterProps(1, reduced)}>
          <div className={s.preview}>
            <Stage3D design={design} phase="board" quality="auto" reduced={reduced} onPick={kind => { if (!locked) { accept(); a.setCategory(kind); } }} />
            <span className={s.previewCaption}>{t('Drag to explore your spacecraft')}</span>
          </div>
          <Charter mission={mission} need={need} card={selectedCard} colors={colors} unverified={unverified} sandbox={mode === 'sandbox'}>
            <div className={s.actions}>
              <Button variant="primary" size="lg" iconEnd="arrow-right" onClick={accept} disabled={locked} disabledReason={locked ? lockReason : undefined}>{t('Accept mission · enter hangar')}</Button>
              <Button variant="secondary" icon="launch" onClick={quick} disabled={locked} disabledReason={locked ? lockReason : undefined}>{t('Quick launch')}</Button>
              <p className={s.note}>{t('Quick launch: the Balanced build, straight to the launch check.')}</p>
              <Button variant="ghost" size="sm" icon="play" onClick={() => a.pitch()}>{t('Try the consequence demo')}</Button>
            </div>
          </Charter>
        </motion.aside>
      </div>
      <div className={s.mobileAction}>
        <span>{mission.title}</span>
        <Button variant="primary" size="sm" iconEnd="arrow-right" disabled={locked} disabledReason={locked ? lockReason : undefined} onClick={accept}>{t('Build this mission')}</Button>
      </div>
    </div>
  );
}
