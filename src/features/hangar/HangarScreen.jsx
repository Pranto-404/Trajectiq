import {useLayoutEffect, useRef} from 'react';
import {animate, motion} from 'motion/react';
import {Button, Panel, spring, useReducedMotion} from '@/ds/index.js';
import {useGame, selectMission, selectObjective} from '@/store/index.js';
import {useMediaQuery} from '@/shell/hooks.js';
import {useT} from '@/i18n/index.js';
import {PitchBanner} from '../board/PitchBanner.jsx';
import {takeFlip, flipDelta} from '../board/flip.js';
import {enterProps} from '../board/motionUtil.js';
import {StageSlot} from './StageSlot.jsx';
import {PartsTray} from './PartsTray.jsx';
import {DesignAdvisor} from './DesignAdvisor.jsx';
import {MarginsPanel} from './MarginsPanel.jsx';
import {OrbitPanel} from './OrbitPanel.jsx';
import {CrewStrip} from './CrewStrip.jsx';
import {MobileInspector} from './MobileInspector.jsx';
import {Spotlight} from './Spotlight.jsx';
import {TraySheet} from './TraySheet.jsx';
import {LaunchPanel, LaunchBar} from './LaunchPanel.jsx';
import {useLocked, useClearPreviewOn, fmt} from './hooks.js';
import s from './hangar.module.css';

/** The hangar title. When the player arrives from a scenario card it glides from the card's title position (FLIP, shared element). */
function FlipTitle({children}) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  // Runs once on mount (the hand-off is consumed once). The animation is left to finish: stopping it mid-flight would strand the title off its place.
  useLayoutEffect(() => {
    const from = takeFlip(), el = ref.current;
    if (!from || reducedRef.current || !el) return;
    const to = el.getBoundingClientRect(); if (!to.width) return;
    const d = flipDelta(from, to);
    animate(el, {x: [d.x, 0], y: [d.y, 0], scale: [d.scale, 1]}, spring.soft);
  }, []);
  return <h1 ref={ref} className={s.title} data-flip-target style={{transformOrigin: '0 0'}}>{children}</h1>;
}

const PRESETS = [['preset-balanced', 'Balanced build'], ['preset-fragile', 'High-science challenge'], ['preset-resilient', 'Resilient build']];

/** Hangar: parts tray with ghost-preview gauges, stage, orbit controls, launch. Desktop = three columns, phone = stage on top + bottom-sheet tray. */
export function HangarScreen() {
  const t = useT();
  const reduced = useReducedMotion();
  const narrow = useMediaQuery('(max-width: 760px)');
  const locked = useLocked();
  const a = useGame(st => st.actions), guided = useGame(st => st.prefs.guided);
  const mission = useGame(selectMission), objective = useGame(selectObjective);
  const stageRef = useRef(null), trayRef = useRef(null);
  useClearPreviewOn();

  const seat = (kind, id) => {
    const card = [...(trayRef.current?.querySelectorAll('[data-part]') || [])].find(el => el.dataset.part === id);
    stageRef.current?.seatPart?.(kind, id, card?.getBoundingClientRect?.());
  };
  const install = (kind, part) => { if (a.install(kind, part.id) === 'installed') seat(kind, part.id); };
  const drop = ({kind, id}) => { if (a.install(kind, id, {source: 'drop'}) === 'installed') seat(kind, id); };
  const lockWhy = t('Hardware is locked after launch');

  const head = (
    <motion.header className={s.head} {...enterProps(0, reduced)}>
      <div className={s.headText}>
        <span className="kicker">{mission.scenarioId} / {locked ? t('Live mission (read-only)') : t('Spacecraft hangar')}</span>
        <FlipTitle>{mission.title}</FlipTitle>
        <p className={s.lede}>{t('Build your way to')} {mission.bodyName}. {t('Every installed class changes the engineering model.')}</p>
      </div>
      <div className={s.row}>
        <Button variant="ghost" size="sm" onClick={() => a.start()}>{locked ? t('Discard / new mission') : t('Mission board')}</Button>
        <Button variant="ghost" size="sm" onClick={() => a.customize()} disabled={locked} disabledReason={locked ? lockWhy : undefined}>{t('Engineering lab')}</Button>
        {!guided ? <Button variant="ghost" size="sm" icon="help" iconOnly={narrow} label={narrow ? t('Show guided help') : undefined} onClick={() => a['guide-toggle']()}>{narrow ? null : t('Show guided help')}</Button> : null}
      </div>
    </motion.header>
  );
  const objectiveStrip = (
    <motion.div className={s.objective} data-tour="objective" {...enterProps(1, reduced)}>
      <strong data-testid="design-name">{objective.name}</strong>
      <span>{t('Return at least')} {objective.needed} / {objective.target} {t('science units')} · {t('stay within')} {fmt(objective.budget)} {t('credits')}</span>
    </motion.div>
  );
  const lockPanel = locked ? (
    <Panel state="locked" kicker={t('Flight in progress')} title={t('Hardware is read-only')} data-testid="flight-lock">
      <p>{lockWhy}. {t('Finish or discard this flight to edit.')}</p>
      <div className={s.row}><Button size="sm" variant="primary" onClick={() => a.go('flight')}>{t('Back to flight')}</Button></div>
    </Panel>
  ) : null;
  const presets = (
    <div className={s.presets} role="group" aria-label={t('Start from a preset')}>
      <span className="kicker">{t('Start from a preset')}</span>
      <div className={s.row}>
        {PRESETS.map(([action, label]) => <Button key={action} size="sm" variant="secondary" onClick={() => a[action]()} disabled={locked} disabledReason={locked ? lockWhy : undefined}>{t(label)}</Button>)}
      </div>
    </div>
  );

  if (narrow) {
    return (
      <div className={s.screen} data-screen="hangar" data-layout="mobile">
        <Spotlight />
        <PitchBanner />
        {head}
        {objectiveStrip}
        {lockPanel}
        <div className={s.stageSticky}><StageSlot stageRef={stageRef} onDropPart={drop} compact /></div>
        <MobileInspector presets={presets} />
        <div className={s.mobilePad} aria-hidden="true" />
        <TraySheet header={<PartsTray part="tabs" />}><div ref={trayRef}><PartsTray part="list" onInstall={install} /></div></TraySheet>
        <LaunchBar />
      </div>
    );
  }
  return (
    <div className={s.screen} data-screen="hangar" data-layout="desktop">
      <Spotlight />
      <PitchBanner />
      {head}
      {objectiveStrip}
      {lockPanel}
      <div className={s.grid}>
        <motion.aside className={s.colLeft} {...enterProps(1, reduced)}>
          <Panel kicker={locked ? t('Flight architecture') : t('Assembly bay')} title={t('Parts')} state={locked ? 'locked' : 'default'}>
            <PartsTray ref={trayRef} onInstall={install} />
          </Panel>
        </motion.aside>
        <motion.div className={s.colCenter} {...enterProps(2, reduced)}>
          <StageSlot stageRef={stageRef} onDropPart={drop} />
          <CrewStrip />
          {presets}
          <DesignAdvisor />
        </motion.div>
        <motion.aside className={s.colRight} {...enterProps(3, reduced)}>
          <LaunchPanel />
          <MarginsPanel />
          <OrbitPanel />
        </motion.aside>
      </div>
    </div>
  );
}
