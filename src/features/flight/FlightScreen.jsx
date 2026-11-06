import {useEffect, useRef, useState} from 'react';
import {motion} from 'motion/react';
import {Button, Panel, useAnnounce, useReducedMotion} from '@/ds/index.js';
import {useMediaQuery} from '@/shell/hooks.js';
import {useGame, selectTelemetry, selectCrisis, selectObjective, analyze} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {CrewStrip} from '../crew/CrewStrip.jsx';
import {PhaseRibbon, StatusChip, ClockControls} from './Clock.jsx';
import {CommandDeck} from './CommandDeck.jsx';
import {EventLog} from './EventLog.jsx';
import {IncidentTakeover} from './IncidentTakeover.jsx';
import {OrbitTimeline} from './OrbitTimeline.jsx';
import {ResourceFlow} from './ResourceFlow.jsx';
import {StageSlot} from './StageSlot.jsx';
import {Telemetry} from './Telemetry.jsx';
import {pastView} from './flightModel.js';
import {useTickInterpolation, tickPeriod} from './useTickInterpolation.js';
import s from './flight.module.css';

/** Polite announcements for what the eye sees on the schematic: contact windows, shadow, safe mode. Critical battery/recorder/crisis are announced by the store and the Gauge. */
function useFlightAnnouncements(run) {
  const say = useAnnounce();
  const prev = useRef(null);
  useEffect(() => {
    const p = prev.current; prev.current = {contact: run.contact, eclipse: run.eclipse, phase: run.phase};
    if (!p || run.phase !== 'operations' || p.phase !== 'operations') return;
    if (!p.contact && run.contact) say('Ground contact window open. The recorder can downlink.');
    else if (p.contact && !run.contact) say('Ground contact window closed.');
    if (!p.eclipse && run.eclipse) say('Entering shadow. Solar power is off.');
    else if (p.eclipse && !run.eclipse) say('Back in sunlight.');
  }, [run.contact, run.eclipse, run.phase, say]);
}

function Empty() {
  const t = useT();
  const a = useGame(st => st.actions);
  return (
    <div className={s.empty} data-screen="flight">
      <Panel title={t('No mission in flight')} kicker={t('Mission control')}>
        <p>{t('Review your design and authorize launch to open mission control.')}</p>
        <div><Button variant="primary" onClick={() => a.go('hangar')}>{t('Back to hangar')}</Button></div>
      </Panel>
    </div>
  );
}

function FlightLive({run}) {
  const t = useT();
  const reduced = useReducedMotion();
  const tel = useGame(selectTelemetry), crisis = useGame(selectCrisis), objective = useGame(selectObjective);
  const playing = useGame(st => st.playing), speed = useGame(st => st.speed), crew = useGame(st => st.team.mode === 'crew'), actions = useGame(st => st.actions);
  const a = analyze(run.design);
  const [scrub, setScrub] = useState(null);
  const crisisRef = useRef(null);
  const tight = useMediaQuery('(max-height: 960px)');
  const last = run.history.length - 1;
  useEffect(() => { if (scrub != null && scrub >= last) setScrub(null); }, [scrub, last]);
  const entry = scrub != null ? run.history[scrub] : null;
  const view = entry ? pastView(run, entry, a.c.power.battery) : run;
  const target = [view.battery, view.backlog, view.science, view.fuel, view.minute];
  const [battery, backlog, science, fuel, minute] = useTickInterpolation(target, {running: playing && !entry && !crisis, periodMs: tickPeriod(run.phase, speed), reduced});
  useFlightAnnouncements(run);
  const afterResolve = () => setTimeout(() => document.querySelector('[data-flight-play]')?.focus(), 80);

  return (
    <div className={s.flight} data-screen="flight" data-crew={crew || undefined} data-tight={tight || undefined} data-crisis={crisis ? 'true' : undefined}>
      {crew ? <div className={s.crew}><CrewStrip /></div> : null}
      <div className={`${s.top} ${s.topbar}`}>
        <PhaseRibbon phase={run.phase} />
        <span className={s.objective}><strong>{objective.name}</strong><span>{t('Return ≥{n} of {target} units', {n: objective.needed, target: objective.target})}</span></span>
        <span className={s.spacer} />
        <ClockControls run={run} crisis={crisis} playing={playing} speed={speed} minute={minute} duration={tel.duration} actions={actions} className={s.clockBar} />
      </div>

      <div className={s.left}>
        <div className={s.flow}><ResourceFlow run={view} analysis={a} /></div>
        <div className={s.log}><EventLog logs={run.logs} /></div>
      </div>

      <div className={s.stage} data-past={entry ? 'true' : undefined} aria-label={t('Mission scene')} role="group">
        <div className={s.stageBody}><StageSlot run={view} design={run.design} analysis={a} reduced={reduced} /></div>
        {crisis ? <motion.div className={s.desat} aria-hidden="true" initial={{opacity: 0}} animate={{opacity: 1}} transition={{duration: reduced ? 0.12 : 0.24}} /> : null}
        <div className={s.stageHud}>
          <StatusChip run={view} />
          {entry ? <span className={s.pastBanner}>{t('Past view · read-only')}</span> : null}
          {crisis ? <span className={s.pastBanner}>{t('Simulation paused')}</span> : null}
        </div>
        <div className={s.stageFoot}><span>{a.m.bodyName} · {run.design.altitude} km · {run.design.inclination}° · {a.period.toFixed(1)} min {t('period')}</span></div>
      </div>

      <div className={s.gauges}><Telemetry values={[battery, backlog, science, fuel]} run={view} analysis={a} crisis={!!crisis} past={!!entry} /></div>
      <div className={s.timeline}><OrbitTimeline run={run} analysis={a} minute={minute} scrub={scrub} setScrub={setScrub} crisis={!!crisis} crisisRef={crisisRef} /></div>
      <div className={s.commands}><CommandDeck run={run} crisis={crisis} actions={actions} /></div>

      <IncidentTakeover crisis={crisis} originRef={crisisRef} onResolved={afterResolve} />
    </div>
  );
}

/** Mission control. A viewport-fit grid on desktop; stage on top with a gauge strip on phones. */
export function FlightScreen() {
  const run = useGame(st => st.run), tel = useGame(selectTelemetry);
  if (!run || run.done || !tel) return <Empty />;
  return <FlightLive run={run} />;
}
