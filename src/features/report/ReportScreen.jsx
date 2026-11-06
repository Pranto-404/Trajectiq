import {useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {pareto} from '@engine/model.js';
import {missionFor, neededScience, VERSION} from '@data/catalog.js';
import {useGame, selectReportRun, selectScore, selectReview, selectDebrief} from '@/store/index.js';
import {Button, Chip, Panel, useReducedMotion, ease} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {Chain, CausalCards, Diagnosis, Tips} from './CausalChain.jsx';
import {Comparison} from './Comparison.jsx';
import {Count} from './Count.jsx';
import {DecisionReview} from './DecisionReview.jsx';
import {Leaderboard} from './Leaderboard.jsx';
import {Rise} from './Rise.jsx';
import {Robustness} from './Robustness.jsx';
import {RunArchive} from './RunArchive.jsx';
import {ScoreReveal} from './ScoreReveal.jsx';
import {SharePanel} from './SharePanel.jsx';
import {TabPanel, Tabs} from './Tabs.jsx';
import {TradePlot} from './TradePlot.jsx';
import {clean, finite, fmt} from './format.js';
import s from './report.module.css';

export const REPORT_TABS = ['score', 'debrief', 'trade', 'share'];
const scenarioOf = design => missionFor(design).scenarioId;

function Stat({label, value, digits = 0, unit, note, i}) {
  return (
    <Rise i={i} className={s.stat}>
      <dl>
        <dt className="kicker">{label}</dt>
        <dd><strong className={s.statValue}><Count value={finite(value)} digits={digits} delay={i * 0.08} /><span className="sr-only">{fmt(value, digits)}</span></strong>{unit ? <span className={s.unit}> {unit}</span> : null}</dd>
        {note ? <dd className={s.muted}>{note}</dd> : null}
      </dl>
    </Rise>
  );
}

function ScoreTab({run, score, review}) {
  const t = useT();
  const reduced = useReducedMotion();
  const scoreSeen = useGame(st => st.scoreSeen);
  const a = useGame.getState().actions;
  const [fresh] = useState(() => !!run.id && scoreSeen !== run.id);
  const [revealed, setRevealed] = useState(!fresh || !score);
  return (
    <div className={s.stack}>
      {score
        ? <ScoreReveal score={score} label={run.label} fresh={fresh} onSeen={() => a.markScoreSeen(run.id)} onDone={() => setRevealed(true)} />
        : <div className={s.card}><h3>{t('No Mission Score for this run')}</h3><p className={s.muted}>{t('This run was saved by an older model version, so it cannot be scored fairly. Fly a new mission to get a score.')}</p></div>}
      <motion.div className={s.stack} initial={reduced || !fresh ? false : {opacity: 0, y: 24}} animate={{opacity: revealed ? 1 : 0.35, y: revealed ? 0 : 12}} transition={reduced ? {duration: 0} : {duration: 0.42, ease: ease.enter}}>
        <h2 className={s.sectionTitle}>{t('Decision review')}</h2>
        <DecisionReview review={review} />
      </motion.div>
    </div>
  );
}

function DebriefTab({run, debrief, previous}) {
  const t = useT();
  const a = useGame.getState().actions;
  return (
    <div className={s.twoCol}>
      <div className={s.stack}>
        <h2 className={s.sectionTitle}>{t('Here is why it happened')}</h2>
        <CausalCards items={debrief?.items || []} />
        <Diagnosis causes={debrief?.causes} primary={debrief?.primary} />
      </div>
      <div className={s.stack}>
        <Rise className={s.card}>
          <header className={s.cardHead}><h3>{t('Change the design. Test the result.')}</h3><Chip kind="info" size="sm" icon="info">{t('Rule-based')}</Chip></header>
          <Tips tips={debrief?.tips || []} />
          <Button variant="primary" icon="power" onClick={() => a['game-fix']()}>{t('Preview power + comms fix')}</Button>
          <p className={s.muted}>{t('Changes only power and communications after confirmation. Your custom settings are retained. A stronger design still needs an effective operating policy.')}</p>
        </Rise>
        <Rise i={1} className={s.card}>
          <h3>{t('Your redesign evidence')}</h3>
          {previous ? <Comparison before={previous} after={run} /> : <p className={s.muted}>{t('Play a second mission in this scenario. Its result will be compared against this run.')}</p>}
        </Rise>
        <Rise i={2} className={s.card}>
          <h3>{t('What did you learn?')}</h3>
          <p className={s.muted}>{t('Check whether you can explain why stored data does not complete a science objective.')}</p>
          <Button variant="secondary" size="sm" onClick={() => a.quiz()}>{t('Take the 3-question check')}</Button>
        </Rise>
      </div>
    </div>
  );
}

function TradeTab({run, scenarioRuns}) {
  const t = useT();
  const board = useGame(st => st.board);
  const a = useGame.getState().actions;
  const [all, setAll] = useState(false);
  const mission = missionFor(run.design);
  const frontier = useMemo(() => { try { return pareto(scenarioRuns); } catch { return scenarioRuns.map(() => false); } }, [scenarioRuns]);
  const shown = all ? board : board.filter(e => e.scenarioTitle === mission.title);
  return (
    <div className={s.stack}>
      <div className={s.twoCol}>
        <Rise className={s.card}>
          <header className={s.cardHead}><h3>{t('Returned science vs mission cost')}</h3><Chip kind="mode" size="sm">{scenarioRuns.length} {t('saved runs')}</Chip></header>
          <TradePlot runs={scenarioRuns} frontier={frontier} onReview={r => a.loadRun(r.id)} />
          <p className={s.muted}>{t('Saved outcomes include your commands, recovery choices and uncertainty factors, so this is an observational comparison, not a controlled hardware benchmark. A run is non-dominated when no saved run returns at least as much science for an equal or lower cost with one strict improvement. Bubble size is time in safe mode, not real-world risk.')}</p>
        </Rise>
        <Rise i={1} className={s.card}>
          <header className={s.cardHead}><h3>{t('Robustness to uncertainty')}</h3></header>
          <Robustness />
        </Rise>
      </div>
      <Rise className={s.card}>
        <header className={s.cardHead}>
          <h3>{t('Mission archive')}</h3>
          <Button variant="ghost" size="sm" disabled={!scenarioRuns.length && !useGame.getState().runs.length} onClick={() => a['clear-history']()}>{t('Clear run history')}</Button>
        </header>
        <p className={s.muted}>{t('Showing {n} runs of {title} on model {v}. Other scenarios and versions stay saved.', {n: scenarioRuns.length, title: clean(mission.title, 40), v: VERSION})}</p>
        <RunArchive runs={scenarioRuns} activeId={run.id} onReview={r => a.loadRun(r.id)} />
      </Rise>
      <Rise className={s.card}>
        <header className={s.cardHead}>
          <h3>{t('Local leaderboard')}</h3>
          <Chip kind="info" size="sm" icon={null}>{t('This browser · self-reported')}</Chip>
        </header>
        <div className={s.row}>
          <Chip selectable selected={!all} onClick={() => setAll(false)}>{t('This scenario')}</Chip>
          <Chip selectable selected={all} onClick={() => setAll(true)}>{t('All scenarios')}</Chip>
        </div>
        <Leaderboard board={shown} currentId={run.id} />
      </Rise>
    </div>
  );
}

/** Text-only summary that appears only when printing. */
function PrintSummary({run, score, review, debrief}) {
  const t = useT();
  const o = run.outcome, m = missionFor(run.design);
  return (
    <section className={s.printOnly} aria-hidden="true">
      <h1>TRAJECTIQ · {clean(m.title, 40)} · {clean(run.label, 12)}</h1>
      <p>{o.achieved ? t('Objective achieved') : t('Objective incomplete')}: {fmt(o.science)} / {m.scienceTarget} {t('science units')} · {fmt(o.returned)} MB {t('returned')} · {fmt(o.lostMB)} MB {t('discarded')} · {t('cost')} {fmt(o.cost)} / {m.budget}</p>
      {score ? <p>{t('Mission Score')}: {score.total} / 1000 · {t('Grade')} {score.grade}</p> : null}
      <ul>{(score?.dims || []).map(d => <li key={d.id}>{d.label}: {fmt(d.value)} / {d.max}</li>)}</ul>
      <h2>{t('Decision review')}</h2>
      <ul>{review.map((r, i) => <li key={i}>{clean(r.title, 80)}: {String(r.explanation)}</li>)}</ul>
      <h2>{t('Here is why it happened')}</h2>
      <ul>{(debrief?.items || []).map((e, i) => <li key={i}>{clean(e.title, 80)}: {(e.chain || []).map(x => clean(x, 120)).join(' → ')}. {String(e.impact)}</li>)}</ul>
      <p>{t('Educational model; not a real-world mission probability.')}</p>
    </section>
  );
}

/** The Report screen: hero with the outcome, then Score / Debrief / Trade space / Share tabs. */
export function ReportScreen() {
  const t = useT();
  const run = useGame(selectReportRun), score = useGame(selectScore), review = useGame(selectReview), debrief = useGame(selectDebrief);
  const runs = useGame(st => st.runs), tabId = useGame(st => st.reportTab), active = useGame(st => !!st.run?.done);
  const a = useGame.getState().actions;
  const tab = REPORT_TABS.includes(tabId) ? tabId : 'score';
  const scenarioRuns = useMemo(() => (run ? runs.filter(r => r.modelVersion === VERSION && scenarioOf(r.design) === scenarioOf(run.design)) : []), [runs, run]);
  const previous = useMemo(() => (run ? runs.filter(r => r.id !== run.id && r.modelVersion === run.modelVersion && scenarioOf(r.design) === scenarioOf(run.design)).at(-1) || null : null), [runs, run]);

  if (!run) {
    return (
      <div className={s.screen} data-screen="report">
        <Panel title={t('No finished mission yet')}><p className={s.muted}>{t('Fly a mission to see its score, decision review and causal debrief.')}</p><div className={s.row}><Button variant="primary" onClick={() => a.go('board')}>{t('Mission board')}</Button></div></Panel>
      </div>
    );
  }
  const o = run.outcome || {}, m = missionFor(run.design), achieved = !!o.achieved;
  const tabs = [{id: 'score', label: t('Score & decisions'), icon: 'check'}, {id: 'debrief', label: t('Causal debrief'), icon: 'orbit'}, {id: 'trade', label: t('Trade space'), icon: 'signal'}, {id: 'share', label: t('Share & export'), icon: 'share'}];
  return (
    <div className={s.screen} data-screen="report">
      <Panel kicker={`${t('Mission complete')} / ${clean(run.label, 12)}`} title={achieved ? t('You brought the science home.') : t('Your mission has a lesson.')}
        className={s.hero}
>
        <div><Chip kind={achieved ? 'pass' : 'warn'}>{achieved ? t('Objective achieved') : t('Objective incomplete')}</Chip></div>
        <p className={s.muted}>{clean(m.title, 50)} · {clean(run.design?.name, 40)} · {t('Return threshold')} {neededScience(m)} {t('units')} · {t('Budget')} {fmt(o.cost)} / {m.budget} {t('credits')}</p>
        <div className={s.heroActions}><Button variant="primary" iconEnd="arrow-right" onClick={() => (active ? a['game-redesign']() : a.redesign())}>{t('Redesign & play again →')}</Button><Button variant="ghost" onClick={() => a.start()}>{t('Discard / new mission')}</Button></div>
        <div className={s.stats}>
          <Stat i={0} label={t('Science returned')} value={o.science} digits={0} unit={`/ ${m.scienceTarget}`} note={`${fmt(finite(o.science) / Math.max(1, m.scienceTarget) * 100, 1)}% ${t('of target')}`} />
          <Stat i={1} label={t('Data returned')} value={o.returned} unit="MB" note={`${fmt(o.retainedMB)} MB ${t('left onboard')} · ${fmt(o.lostMB)} MB ${t('discarded')}`} />
          <Stat i={2} label={t('Final battery')} value={o.finalBattery} unit="%" note={`${fmt(o.safeMinutes, 1)} ${t('minutes in safe mode')}`} />
          <Stat i={3} label={t('Mission cost')} value={o.cost} unit="cr" note={`${fmt(o.efficiency, 1)} ${t('science units / credit')}`} />
        </div>
      </Panel>
      <Tabs tabs={tabs} value={tab} onChange={a.setReportTab} label={t('Report sections')} idPrefix="report-tab" />
      <TabPanel id="score" active={tab === 'score'} idPrefix="report-tab"><ScoreTab key={run.id} run={run} score={score} review={review} /></TabPanel>
      <TabPanel id="debrief" active={tab === 'debrief'} idPrefix="report-tab"><DebriefTab run={run} debrief={debrief} previous={previous} /></TabPanel>
      <TabPanel id="trade" active={tab === 'trade'} idPrefix="report-tab"><TradeTab run={run} scenarioRuns={scenarioRuns} /></TabPanel>
      <TabPanel id="share" active={tab === 'share'} idPrefix="report-tab"><SharePanel run={run} /></TabPanel>
      <PrintSummary run={run} score={score} review={review} debrief={debrief} />
    </div>
  );
}
