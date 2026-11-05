// Placeholder screens. They render the LIVE store through the real design system, so the whole loop
// (board -> hangar -> flight -> report) is already playable. Feature packages replace them one by one by exporting
// `screens: {hangar: HangarScreen}` from src/features/<name>/index.js. Keep these simple: they are scaffolding.
import {CATALOG, CATEGORIES} from '@data/catalog.js';
import {SCENARIOS, DIFFICULTY} from '@data/scenarios.js';
import {useGame, selectMargins, selectPreview, selectTelemetry, selectCrisis, selectLaunchGate, selectScore, selectReportRun, selectDebrief, selectReview, selectObjective} from '../store/index.js';
import {Button, Panel, Gauge, PartCard, Segmented, Slider, Chip, Concept} from '../ds/index.js';
import {useT} from '../i18n/index.js';
import s from './shell.module.css';

const act = () => useGame.getState().actions;

function Board() {
  const t = useT();
  const design = useGame(st => st.design), team = useGame(st => st.team);
  const mode = team.mode === 'crew' ? 'crew' : design.sandbox ? 'sandbox' : 'solo';
  return (
    <div className={s.screen} data-screen="board">
      <Panel kicker={t('Mission board')} title={t('Plan your mission')}>
        <Segmented label={t('Mode')} value={mode} onChange={v => act()['board-mode']({mode: v})} options={[{value: 'solo', label: t('Solo')}, {value: 'crew', label: t('Crew')}, {value: 'sandbox', label: t('Sandbox')}]} />
        <div className={s.cards} role="group" aria-label={t('Scenario')}>
          {Object.values(SCENARIOS).map(sc => (
            <button key={sc.id} type="button" className={s.card} aria-pressed={design.scenario === sc.id} onClick={() => act()['board-scenario']({scenario: sc.id})}>
              <span className="kicker">{sc.tag}</span><strong>{sc.title}</strong><span className={s.muted}>{sc.summary}</span>
            </button>
          ))}
        </div>
        <Segmented label={t('Difficulty')} value={design.difficulty || 'engineer'} onChange={v => act()['board-difficulty']({difficulty: v})} options={Object.values(DIFFICULTY).map(d => ({value: d.id, label: d.label}))} />
        <div className={s.row}><Button variant="primary" size="lg" iconEnd="arrow-right" onClick={() => act()['game-accept']()}>{t('Accept mission · enter hangar')}</Button></div>
      </Panel>
    </div>
  );
}

function MarginGauges({rows, ghost}) {
  return rows.map(r => {
    const g = ghost?.margins.rows.find(x => x.id === r.id);
    return <Gauge key={r.id} kind="margin" label={r.title} value={r.value} max={r.max} unit={r.unit} digits={r.digits} status={r.status === 'pass' ? 'nominal' : r.status === 'warn' ? 'warning' : 'critical'} preview={g ? g.value : null} help={r.learn ? <Concept id={r.learn} label={r.title} /> : null} />;
  });
}

function Hangar() {
  const t = useT();
  const design = useGame(st => st.design), category = useGame(st => st.category);
  const margins = useGame(selectMargins), ghost = useGame(selectPreview), gate = useGame(selectLaunchGate), locked = useGame(st => !!(st.run && !st.run.done));
  const a = act();
  const installed = CATALOG[category].find(p => p.id === design[category]);
  return (
    <div className={s.screen} data-screen="hangar">
      <div className={s.grid3}>
        <Panel kicker={t('Assembly bay')} title={t('Parts')} state={locked ? 'locked' : 'default'}>
          <div className={s.tabs} role="group" aria-label={t('Subsystem')}>
            {CATEGORIES.map(([key, title]) => <Chip key={key} selectable selected={key === category} icon={key} onClick={() => a.setCategory(key)}>{title}</Chip>)}
          </div>
          <div className={s.list}>
            {CATALOG[category].map(p => <PartCard key={p.id} part={p} installed={installed} kind={category} draggable disabled={locked} disabledReason={locked ? t('Hardware is locked after launch') : undefined} onInstall={() => a.install(category, p.id)} onPreview={id => a.previewPart(id ? category : null, id)} />)}
          </div>
        </Panel>
        <Panel kicker={t('Spacecraft')} title={design.name}><p className={s.muted}>{t('The 3D stage goes here.')}</p><div className={s.row}><Button variant="ghost" size="sm" onClick={() => a['preset-balanced']()}>{t('Balanced build')}</Button><Button variant="ghost" size="sm" onClick={() => a['preset-fragile']()}>{t('High-science challenge')}</Button></div></Panel>
        <Panel kicker={t('Mission constraints')} title={t('Margins')}>
          <MarginGauges rows={margins.rows} ghost={ghost} />
          <Slider label={t('Propellant')} unit="kg" min={0} max={160} value={design.fuel} onChange={v => a.setField('fuel', v)} disabled={locked} disabledReason={locked ? t('Hardware is locked after launch') : undefined} />
          <Button variant="primary" disabled={!gate.ok} disabledReason={gate.reason} onClick={() => a['game-review']()}>{t('Launch readiness →')}</Button>
        </Panel>
      </div>
    </div>
  );
}

const MODES = [['science', 'Map in sunlight'], ['aggressive', 'Map through shadow'], ['coast', 'Conserve energy'], ['downlink', 'Return priority']];

function Flight() {
  const t = useT();
  const tel = useGame(selectTelemetry), crisis = useGame(selectCrisis), playing = useGame(st => st.playing), speed = useGame(st => st.speed), run = useGame(st => st.run);
  const a = act();
  if (!tel) return <div className={s.screen} data-screen="flight"><Panel title={t('No mission in flight')}><Button variant="primary" onClick={() => a.go('hangar')}>{t('Back to hangar')}</Button></Panel></div>;
  const ops = run.phase === 'operations' && !crisis;
  return (
    <div className={s.screen} data-screen="flight">
      <div className={s.grid3}>
        <Panel kicker={t('Live telemetry')} title={t('Telemetry')} state={crisis ? 'incident' : 'default'}>
          {tel.gauges.map(g => <Gauge key={g.id} kind={g.id === 'battery' ? 'arc' : g.id === 'recorder' ? 'segments' : 'linear'} label={t(g.label)} value={g.value} max={g.max} unit={g.unit} digits={g.digits} status={g.status === 'warn' ? 'warning' : 'nominal'} thresholds={g.id === 'battery' ? [{at: g.max * .15, label: t('Safe mode 15%')}] : g.id === 'recorder' ? [{at: g.max * .75, label: t('Warning 75%')}] : []} />)}
          <p className={s.muted}>{t('Lost data')} {Math.round(tel.lostMB)} MB · {t('Safe mode')} {tel.safeMinutes.toFixed(1)} min · {tel.inContact ? t('In contact') : t('Out of contact')}</p>
        </Panel>
        <Panel kicker={t('Campaign clock')} title={`T+${tel.minute.toFixed(1)} min · ${t(tel.phase)}`}>
          <div className={s.row}>
            <Button variant="primary" icon={playing ? 'pause' : 'play'} disabled={!!crisis} disabledReason={crisis ? t('Choose a crisis response first') : undefined} onClick={() => a.play()}>{playing ? t('Ⅱ Pause') : t('▶ Resume')}</Button>
            <Button icon="step" disabled={!!crisis} onClick={() => a.step()}>{t('+5 min / next phase')}</Button>
            <Button icon="fast" disabled={!!crisis} onClick={() => a.fast()}>{t('Next event ⇥')}</Button>
          </div>
          <Segmented label={t('Speed')} value={speed} onChange={v => a.setSpeed(v)} options={[1, 3, 10].map(n => ({value: n, label: `${n}×`}))} />
          <Segmented label={t('Operations')} value={run.mode} onChange={v => a.command(v)} options={MODES.map(([id, label]) => ({value: id, label: t(label), disabled: !ops}))} />
          {!ops ? <p className={s.muted}>{crisis ? t('Commands unlock after the decision.') : t('Commands unlock in the operations phase.')}</p> : null}
        </Panel>
        <Panel kicker={t('Mission log')} title={t('Latest events')}>
          <ul className={s.log}>{run.logs.slice(-4).reverse().map((l, i) => <li key={i}><span className="num">T+{l.minute.toFixed(1)}</span> <strong>{l.title}</strong></li>)}</ul>
        </Panel>
      </div>
      {crisis ? (
        <Panel state="incident" kicker={t('Decision required · simulation paused')} title={crisis.crisis.title} className={s.incident}>
          <p>{crisis.crisis.body}</p>
          {crisis.crewMode ? <p className={s.muted}>{t('In crew mode the team votes: every role adds its vote.')}</p> : null}
          <div className={s.row}>
            {crisis.crisis.actions.map(o => (
              <Button key={o.id} variant="commit" disabled={o.disabled || crisis.crewMode} disabledReason={o.disabled ? t('Unavailable: insufficient capability.') : undefined} onConfirm={() => a.resolve(o.id)}>{o.name}</Button>
            ))}
          </div>
          <ul className={s.log}>{crisis.crisis.actions.map(o => <li key={o.id}><strong>{o.name}</strong> {o.effect}</li>)}</ul>
        </Panel>
      ) : null}
    </div>
  );
}

function Report() {
  const t = useT();
  const run = useGame(selectReportRun), score = useGame(selectScore), review = useGame(selectReview), debrief = useGame(selectDebrief), obj = useGame(selectObjective);
  const a = act();
  if (!run) return <div className={s.screen} data-screen="report"><Panel title={t('No finished mission yet')}><Button variant="primary" onClick={() => a.go('board')}>{t('Mission board')}</Button></Panel></div>;
  const o = run.outcome;
  return (
    <div className={s.screen} data-screen="report">
      <Panel kicker={`${t('Mission complete')} / ${run.label}`} title={o.achieved ? t('You brought the science home.') : t('Your mission has a lesson.')} badge={<Chip kind={o.achieved ? 'pass' : 'warn'}>{o.achieved ? t('Objective achieved') : t('Objective incomplete')}</Chip>}>
        <p className="num">{Math.round(o.science)} / {obj.target} {t('science units')} · {Math.round(o.returned)} MB {t('returned')} · {Math.round(o.lostMB)} MB {t('discarded')}</p>
        {score ? <p>{t('Mission score')}: <strong className="num">{score.total}</strong> · {score.grade}</p> : null}
        <p className={s.muted}>{review.length} {t('decisions reviewed')} · {debrief?.items.length || 0} {t('causal events')}</p>
        <div className={s.row}>
          <Button variant="primary" iconEnd="arrow-right" onClick={() => a['game-redesign']()}>{t('Redesign & play again →')}</Button>
          <Button variant="secondary" icon="share" onClick={() => a['copy-code']()}>{t('Copy mission code')}</Button>
          <Button variant="ghost" onClick={() => a.start()}>{t('Discard / new mission')}</Button>
        </div>
      </Panel>
    </div>
  );
}

export const Placeholders = {board: Board, hangar: Hangar, flight: Flight, report: Report};
