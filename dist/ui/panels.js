// Pure HTML builders for the mission board, crew mode, scoring, sharing and credits.
// They take plain data and return strings, so they are easy to test and never touch application state.
const uiEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const uiFmt = (v, n = 0) => Number(v).toLocaleString('en-US', {maximumFractionDigits: n, minimumFractionDigits: n});
const uiBtn = (text, action, cls = '', attrs = '') => `<button class="btn ${cls}" data-action="${action}" ${attrs}>${text}</button>`;
const CRITICAL = {data: 'Data & recorder', mass: 'Mass', comms: 'Communications', power: 'Power', budget: 'Budget', time: 'Schedule'};
const ARROW = v => v >= 3 ? '↑↑↑' : v === 2 ? '↑↑' : v === 1 ? '↑' : v === 0 ? '≈' : v === -1 ? '↓' : v === -2 ? '↓↓' : '↓↓↓';
export const uiArrow = ARROW;

export function uiLearnButton(id, label = 'What is this?') {
  return `<button class="learn-btn" data-action="learn" data-topic="${uiEsc(id)}" aria-label="${uiEsc(label)}" title="${uiEsc(label)}">?</button>`;
}
export function uiLearnHTML(card) {
  if (!card) return '';
  return `<div class="modal-top"><div><div class="eyebrow">CONCEPT CARD</div><h2>${uiEsc(card.title)}</h2></div>${uiBtn('Close', 'close', 'ghost small')}</div>
  <div class="mentor-fact"><h3>In plain words</h3><p>${uiEsc(card.simple)}</p></div>
  <div class="mentor-fact"><h3>Why it changes your mission</h3><p>${uiEsc(card.why)}</p></div>
  <div class="mentor-fact"><h3>Try this</h3><p>${uiEsc(card.tryThis)}</p></div>`;
}

// ---- Mission board ---------------------------------------------------------------------------------------------
export function uiBoardHTML({design, mission, team, scenarios, difficulties, roles, roleOrder, need}) {
  const crew = team.mode === 'crew', sandbox = design.sandbox === true;
  const modes = [['solo', 'Solo', 'You play every role'], ['crew', 'Crew', '2–4 players, shared decisions'], ['sandbox', 'Sandbox', 'No budget cap, unranked']];
  const active = sandbox ? 'sandbox' : crew ? 'crew' : 'solo';
  const cards = Object.values(scenarios).map((s, i) => `<button class="scenario-card ${s.id === mission.scenarioId ? 'selected' : ''}" style="--i:${i}" data-tilt data-action="board-scenario" data-scenario="${s.id}" aria-pressed="${s.id === mission.scenarioId}">
    <span class="eyebrow">${uiEsc(s.tag)}</span><h3>${uiEsc(s.title)}</h3><p>${uiEsc(s.summary)}</p>
    <span class="scenario-meta"><span>${s.budget} cr</span><span>${s.scienceTarget} units</span><span class="critical-tag">Critical: ${CRITICAL[s.critical] || s.critical}</span></span></button>`).join('');
  const diffs = Object.values(difficulties).map(d => `<button class="seg ${d.id === mission.difficulty ? 'selected' : ''}" data-action="board-difficulty" data-difficulty="${d.id}" aria-pressed="${d.id === mission.difficulty}"><strong>${uiEsc(d.label)}</strong><small>${uiEsc(d.blurb)}</small></button>`).join('');
  const roster = crew ? `<div class="roster panel-pad"><div class="section-title"><h3>Your crew</h3><span class="kicker">${team.players.length} PLAYER${team.players.length === 1 ? '' : 'S'}</span></div>
    <div class="seg-row" role="group" aria-label="Number of players">${[2, 3, 4].map(n => `<button class="seg small ${team.players.length === n ? 'selected' : ''}" data-action="board-players" data-players="${n}" aria-pressed="${team.players.length === n}"><strong>${n} players</strong></button>`).join('')}</div>
    ${team.players.map((p, i) => `<label class="crew-name"><span>Player ${i + 1} · ${p.roles.map(r => uiEsc(roles[r].short)).join(' + ')}</span><input data-team-name="${i}" maxlength="24" value="${uiEsc(p.name)}" autocomplete="off" placeholder="Player ${i + 1}"></label>`).join('')}
    <p class="note-line">Pass the controls on one device. Each role owns different subsystems, so you will have to negotiate.</p></div>` : '';
  const reqs = [['Budget', `${mission.budget} credits`], ['Science target', `${need} of ${mission.scienceTarget} units returned`], ['Campaign', `${mission.duration} minutes after capture`], ['Schedule', `ready within ${mission.deadline} months`], ['Orbit', `${mission.altitudeMin}–${mission.altitudeMax} km; polar targets need ~90°`]];
  return `<div class="board-main">
    <div><div class="eyebrow">STEP 1 / DEFINE YOUR MISSION</div><h2>Choose how you play</h2></div>
    <div class="seg-row" role="group" aria-label="Play mode">${modes.map(([id, label, note]) => `<button class="seg ${active === id ? 'selected' : ''}" data-action="board-mode" data-mode="${id}" aria-pressed="${active === id}"><strong>${label}</strong><small>${note}</small></button>`).join('')}</div>
    ${roster}
    <div><div class="eyebrow">OBJECTIVE</div></div>
    <div class="scenario-grid">${cards}</div>
    <div><div class="eyebrow">DIFFICULTY</div></div>
    <div class="seg-row" role="group" aria-label="Difficulty">${diffs}</div>
    <div class="charter panel"><div class="section-title"><h3>Mission charter</h3><span class="badge">${sandbox ? 'SANDBOX · UNRANKED' : uiEsc(mission.difficultyLabel).toUpperCase()}</span></div>
      <p>${uiEsc(mission.scenarioSummary)}</p>
      <ul class="req-list">${reqs.map(([k, v]) => `<li><span>${k}</span><strong>${uiEsc(v)}</strong></li>`).join('')}</ul>
      <p class="critical-line"><strong>Most critical resource:</strong> ${CRITICAL[mission.critical] || mission.critical}. ${uiLearnButton(mission.critical === 'comms' ? 'contact' : mission.critical === 'time' ? 'schedule' : mission.critical, 'Learn about this resource')}</p>
      ${mission.weather ? `<p class="critical-line warning">Expect the unexpected: a ${uiEsc(mission.weather.title.toLowerCase())} can strike mid-campaign.</p>` : ''}
    </div></div>`;
}

// ---- Crew mode --------------------------------------------------------------------------------------------------
const OWN_LABEL = {launch: 'Launch', bus: 'Bus', propulsion: 'Propulsion', payload: 'Payload', power: 'Power', comms: 'Comms', storage: 'Recorder'};
export function uiCrewStrip({team, roles, suggestions, mission}) {
  if (team.mode !== 'crew') return '';
  const active = team.players[team.active];
  const chips = team.players.map((p, i) => `<div class="crew-chip ${i === team.active ? 'active' : ''}" ${i === team.active ? 'aria-current="true"' : ''}><strong>${uiEsc(p.name)}</strong><span>${p.roles.map(r => uiEsc(roles[r].short)).join(' + ')}</span><small>${p.roles.flatMap(r => roles[r].owns).map(k => OWN_LABEL[k]).join(' · ')}</small></div>`).join('');
  const mine = active.roles.map(r => roles[r].label).join(' + ');
  const pending = suggestions.filter(s => s.status === 'pending');
  const cards = pending.map(s => {
    const canAnswer = active.roles.includes(s.owner);
    return `<div class="suggestion"><div><strong>${uiEsc(s.fromName)}</strong> suggests <b>${uiEsc(s.label)}</b> <small>for ${uiEsc(roles[s.owner].label)}</small></div>${canAnswer ? `<div class="button-group">${uiBtn('Accept', 'suggest-accept', 'small primary', `data-id="${uiEsc(s.id)}"`)}${uiBtn('Decline', 'suggest-decline', 'small ghost', `data-id="${uiEsc(s.id)}"`)}</div>` : '<small class="dim">Waiting for the owner</small>'}</div>`;
  }).join('');
  return `<section class="crew-strip panel" aria-label="Crew table"><div class="crew-top"><div><span class="eyebrow">CREW MODE · SHARED DECISIONS</span><p><strong>${uiEsc(active.name)}</strong> has the controls as <strong>${uiEsc(mine)}</strong>. Change only what your role owns; use a part’s button to <em>suggest</em> a change to its owner.</p></div>${uiBtn('Pass the controls ▸', 'crew-pass', 'primary small')}</div><div class="crew-chips">${chips}</div>${cards ? `<div class="suggestions"><span class="kicker">PROPOSALS (${pending.length})</span>${cards}</div>` : ''}</section>`;
}

export function uiGoNoGo({verdicts, team, signed, roles}) {
  const label = {go: 'GO', concern: 'GO WITH CONCERN', nogo: 'NO-GO'}, cls = {go: 'pass', concern: 'warn', nogo: 'fail'};
  const rows = verdicts.map(v => {
    const done = signed[v.role], holder = team.players.find(p => p.roles.includes(v.role));
    return `<div class="gng-row"><span class="status ${cls[v.status]}">${label[v.status]}</span><div><h3>${uiEsc(roles[v.role].label)} <small>· ${uiEsc(holder?.name || '')}</small></h3><p>${v.issues.length ? v.issues.map(i => `${uiEsc(i.name)}: ${uiEsc(i.value)}`).join('; ') : 'Nothing in this role’s area needs attention.'}</p></div>${v.status === 'nogo' ? '<small class="bad">Cannot sign off</small>' : done ? '<span class="good">✓ Signed off</span>' : uiBtn('Sign off', 'crew-signoff', 'small', `data-role="${v.role}"`)}</div>`;
  }).join('');
  return `<div class="gng"><div class="eyebrow">GO / NO-GO ROLL CALL</div><p>Every role checks readiness through its own lens. A NO-GO needs a redesign; a concern can be accepted by signing off. The Commander cannot launch alone.</p>${rows}</div>`;
}

export function uiCrewVote({crisis, advice, votes, team, roles, roleOrder, decided}) {
  const rows = roleOrder.map(r => {
    const holder = team.players.find(p => p.roles.includes(r)), adv = advice.find(a => a.role === r);
    const text = adv?.optionId ? `advises <b>${uiEsc(adv.optionName)}</b> because it ${uiEsc(adv.why)}.` : `${uiEsc(adv?.why || 'has no strong view')}.`;
    return `<div class="vote-row"><div class="vote-who"><strong>${uiEsc(roles[r].short)}</strong><small>${uiEsc(holder?.name || '')}</small><p>${text}</p></div><div class="vote-options" role="group" aria-label="${uiEsc(roles[r].label)} vote">${crisis.actions.map(a => `<button class="vote ${votes[r] === a.id ? 'selected' : ''}" data-action="crew-vote" data-role="${r}" data-option="${uiEsc(a.id)}" aria-pressed="${votes[r] === a.id}" ${a.disabled ? 'disabled' : ''}>${uiEsc(a.name)}</button>`).join('')}</div></div>`;
  }).join('');
  const chosen = crisis.actions.find(a => a.id === decided);
  const status = decided ? `Team decision: <strong>${uiEsc(chosen?.name || decided)}</strong>` : Object.keys(votes).length >= roleOrder.length ? 'No majority. The Commander’s vote decides a tie; discuss and vote again.' : `${Object.keys(votes).length} of ${roleOrder.length} roles have voted`;
  return `<div class="crew-vote"><div class="eyebrow">TEAM DECISION · EACH ROLE ADVISES FROM ITS OWN PRIORITY</div>${rows}<div class="vote-foot"><span>${status}</span>${uiBtn('Apply team decision', 'crew-resolve', 'primary', decided ? '' : 'disabled')}</div></div>`;
}

// ---- Rough preview chips for the free forecast --------------------------------------------------------------
export function uiDirectionChips(directions, forecastAvailable) {
  if (!directions.length) return '';
  const cls = v => v > 0 ? 'good' : v < 0 ? 'warning' : 'muted';
  return `<div class="direction-box"><div class="kicker">ROUGH PREVIEW · DIRECTION ONLY</div>${directions.map(r => `<div class="direction-row"><strong>${uiEsc(r.name)}</strong><span>${r.chips.map(c => `<span class="chip ${cls(c.dir)}" title="${uiEsc(c.key)}">${uiEsc(c.key)} <b>${ARROW(c.dir)}</b></span>`).join('')}</span></div>`).join('')}${forecastAvailable ? `<button class="btn ghost small" data-ask="Use my one forecast">Spend my one forecast for ranges</button>` : '<small class="dim">Your forecast for this mission is used.</small>'}</div>`;
}

// ---- Score, decision review, share, leaderboard ----------------------------------------------------------------------
export function uiScorePanel(score, label = '', fresh = '') {
  if (!score) return '';
  const rows = score.dims.map((d, i) => `<div class="dim-row" style="--i:${i}"><div class="dim-top"><strong>${uiEsc(d.label)}</strong><span>${uiFmt(d.value)} / ${d.max}</span></div><div class="bar"><i style="--w:${Math.max(2, d.value / d.max * 100)}%"></i></div><small>${uiEsc(d.note)}</small></div>`).join('');
  return `<section class="score-panel panel"><div class="score-head"><div class="score-ring ${fresh ? 'fresh' : ''}" style="--p:${score.total / 10}" role="img" aria-label="Mission Score ${score.total} out of 1000, grade ${score.grade}"><strong ${fresh ? `data-countup="${score.total}" data-run="${uiEsc(fresh)}"` : ''}>${score.total}</strong><small>/ 1000</small></div><div><div class="eyebrow">MISSION SCORE ${label ? '· ' + uiEsc(label) : ''}</div><h2>Grade <span class="grade-letter">${score.grade}</span></h2><p>${score.ranked ? 'Ranked run.' : 'Sandbox run: not ranked.'} ${score.crew ? 'Includes team collaboration.' : 'Solo run.'} Scored on what the challenge rewards: performance, scientific value, efficient resource use, decision quality${score.crew ? ' and collaboration' : ''}.</p></div></div><div class="dim-list ${fresh ? 'fresh' : ''}">${rows}</div></section>`;
}

export function uiDecisionReview(reviews) {
  if (!reviews.length) return `<div class="panel cause-card"><h3>No crisis decision this time</h3><p>Margins that avoid a crisis are good decisions too. Try a leaner design to find where the reserves start to matter.</p></div>`;
  return reviews.map(r => `<div class="panel cause-card decision-card"><div class="section-title"><h3>${uiEsc(r.title)}</h3><span class="badge ${r.material ? '' : 'dim'}">${r.material ? 'HIGH STAKES' : 'LOW STAKES'} · T+${uiFmt(r.minute)}</span></div>
    <p>${uiEsc(r.explanation)}</p>
    <div class="table-scroll" tabindex="0" aria-label="Replayed alternatives"><table class="comparison-table"><thead><tr><th>Response</th><th>Rank</th><th>Science</th><th>Battery</th><th>Data lost</th></tr></thead><tbody>${r.options.map(o => o.disabled ? `<tr><td>${uiEsc(o.name)}</td><td colspan="4" class="muted">Unavailable for this design</td></tr>` : `<tr class="${o.id === r.chosenId ? 'chosen' : ''}"><td>${uiEsc(o.name)}${o.id === r.chosenId ? ' <small class="cyan">your choice</small>' : o.id === r.bestId ? ' <small class="good">best</small>' : ''}</td><td>#${o.rank}</td><td>${uiFmt(o.science)}</td><td>${uiFmt(o.battery)}%</td><td>${uiFmt(o.lostMB)} MB</td></tr>`).join('')}</tbody></table></div>
    <small class="dim">Isolated replay from the paused moment; later choices held equal.</small></div>`).join('');
}

export function uiSharePanel({code, hasRun}) {
  return `<div class="panel panel-pad share-panel"><h3>Save, share and compare</h3><p style="font-size:12px;margin:10px 0">A mission code holds your whole design. Send it to a friend or another team: they paste it into <em>Trade space → Compare a mission code</em> and the same engine flies both designs fairly on their machine.</p><label class="kicker" for="share-code">MISSION CODE</label><textarea id="share-code" class="code-box" readonly rows="3" aria-label="Mission code">${uiEsc(code)}</textarea><div class="button-group">${uiBtn('Copy code', 'copy-code', 'small primary')}${uiBtn(hasRun ? 'Add to leaderboard' : 'Fly first to rank', 'board-add', 'small ghost', hasRun ? '' : 'disabled')}${uiBtn('Print report', 'print', 'small ghost')}</div></div>`;
}

export function uiLeaderboard(board, current) {
  const rows = board.slice().sort((a, b) => b.score - a.score).slice(0, 10);
  return `<div class="panel panel-pad"><div class="section-title"><h3>Local leaderboard</h3><span class="kicker">THIS BROWSER · SELF-REPORTED</span></div><div class="table-scroll" tabindex="0" aria-label="Leaderboard"><table class="comparison-table"><thead><tr><th>#</th><th>Team</th><th>Scenario</th><th>Mode</th><th>Score</th></tr></thead><tbody>${rows.length ? rows.map((r, i) => `<tr class="${r.id === current ? 'chosen' : ''}"><td>${i + 1}</td><td>${uiEsc(r.team)}<br><small class="dim">${uiEsc(r.label)}</small></td><td>${uiEsc(r.scenarioTitle)}<br><small class="dim">${uiEsc(r.difficulty)}</small></td><td>${uiEsc(r.mode)}</td><td><strong>${r.score}</strong> <small>${uiEsc(r.grade)}</small></td></tr>`).join('') : '<tr><td colspan="5" class="muted">Finish a ranked mission and add it here. Scores in codes are self-reported; the engine re-flies shared designs to check them.</td></tr>'}</tbody></table></div></div>`;
}

export function uiCompare({mine, theirs, theirName, claimed, error}) {
  if (error) return `<p class="warning" role="alert">${uiEsc(error)}</p>`;
  if (!theirs) return '';
  const cell = (v, f = v => uiFmt(v, 1)) => v === undefined || v === null ? '—' : f(v);
  const row = (label, k, f) => `<tr><td>${label}</td><td>${mine.launchable ? cell(mine[k], f) : '—'}</td><td>${theirs.launchable ? cell(theirs[k], f) : '—'}</td></tr>`;
  return `<div class="compare-result" role="status"><p><strong>${uiEsc(theirName || 'Their design')}</strong> flown on this device with the same seed and autopilot${claimed !== null ? ` (their code claims ${claimed} points; verify instead of trusting)` : ''}.</p><div class="table-scroll" tabindex="0" aria-label="Design comparison"><table class="comparison-table"><thead><tr><th>Autopilot result</th><th>Your design</th><th>Their design</th></tr></thead><tbody>${row('Returned science', 'science')}${row('Final battery %', 'battery', v => uiFmt(v))}${row('Cost · cr', 'cost')}${row('Mass · kg', 'mass')}<tr><td>Objective</td><td>${mine.launchable ? (mine.achieved ? 'Achieved' : 'Incomplete') : 'Cannot launch'}</td><td>${theirs.launchable ? (theirs.achieved ? 'Achieved' : 'Incomplete') : 'Cannot launch'}</td></tr></tbody></table></div></div>`;
}

export function uiMenu({language, reduced}) {
  const item = (label, action, extra = '') => `<button type="button" class="menu-item" data-action="${action}" ${extra}>${label}</button>`;
  return `<div class="menu-wrap"><button type="button" class="btn ghost small menu-trigger" id="menu-trigger" aria-haspopup="menu" aria-expanded="false" aria-controls="top-menu" commandfor="top-menu" command="toggle-popover" data-menu-toggle>Menu <span aria-hidden="true">▾</span></button><div id="top-menu" class="menu-pop" popover="auto" role="menu" aria-labelledby="menu-trigger">${item('How to play', 'game-help')}${item('Concept cards', 'learn-index')}${item('Sources &amp; method', 'game-sources')}${item('Pitch demo ↗', 'pitch')}${item('Focus view ⛶', 'focus')}<hr>${item(reduced ? '✓ Reduce animation' : 'Reduce animation', 'toggle-motion')}${item(language === 'bn' ? 'English' : 'বাংলা', 'toggle-language')}</div></div>`;
}

export function uiLaunchOverlay(name) {
  return `<div class="launch-overlay" aria-hidden="true"><div class="countdown"><span>T-3</span><span>T-2</span><span>T-1</span><span class="go">IGNITION</span></div><p>${uiEsc(name)}</p></div>`;
}
