import {LanguagePicker} from '@/i18n/LanguagePicker.jsx';
import {useEffect, useId, useRef, useState} from 'react';
import {CATALOG, CATEGORIES, missionFor} from '@data/catalog.js';
import {distanceOptions} from '@data/nasa.js';
import {HELP_TOPICS} from '@engine/assistant.js';
import {EXPERIMENT_FIELDS} from '@engine/copilot.js';
import {contextSuggestions} from '@engine/smart.js';
import {useGame, selectAssistantContext, selectCrisis, analyze} from '@/store/index.js';
import {Button, Chip, Segmented, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {AnswerCard, DirectionChips} from './AnswerCard.jsx';
import {clean, fmt} from '../report/format.js';
import s from './sheets.module.css';

/** Starter chips follow the situation (draft, blocked launch, flying, crisis, finished); the same list the engine offers after a greeting. */
const quickQuestions = ctx => ['Mission status', ...contextSuggestions({run: ctx.run, a: analyze(ctx.run?.design || ctx.design)})].filter((x, i, all) => all.indexOf(x) === i).slice(0, 4);
const tryThese = (ctx, body) => ['Orbit period at 150 km', `Tell me about ${body}`, 'What is an eclipse?', 'Which planet has the most sunlight?', 'How much fuel for 700 m/s?'];

function ContextCard({ctx}) {
  const t = useT();
  const a = analyze(ctx.run?.design || ctx.design), r = ctx.run;
  return (
    <p className={s.context} data-testid="assistant-context" title={t('Answers use this context. Older answers are snapshots from when you asked.')}>
      <Chip kind={r ? 'mode' : 'info'} size="sm" icon={r ? 'orbit' : 'assistant'}>{r ? (r.done ? t('Completed mission') : t('Paused mission')) : t('Current draft')}</Chip>
      <strong>{clean(a.d.name, 40)}</strong>
      <span className="num">{r ? `T+${fmt(r.minute, 1)} min · ${fmt(r.science)} ${t('science returned')} · ${t('battery')} ${fmt(r.battery / a.c.power.battery * 100)}%` : `${fmt(a.cost, 1)} / ${a.m.budget} cr · ${fmt(a.wet, 1)} kg`}</span>
    </p>
  );
}

function Experiments({ctx, onAsk, busy}) {
  const t = useT();
  const id = useId();
  const design = ctx.run?.design || ctx.design;
  const a = analyze(design), mission = missionFor(design);
  const [field, setField] = useState(EXPERIMENT_FIELDS[0][0]);
  const [value, setValue] = useState(String(design.fuel));
  const fields = EXPERIMENT_FIELDS.map(f => f[0] === 'altitude' ? [f[0], f[1], mission.altitudeMin, mission.altitudeMax] : f[0] === 'arrayScale' ? [f[0], f[1], f[2], mission.arrayScaleMax] : f[0] === 'fuel' ? [f[0], f[1], f[2], a.c.propulsion.maxFuel] : f);
  const def = fields.find(f => f[0] === field);
  const submit = e => { e.preventDefault(); if (value === '' || !Number.isFinite(Number(value))) return; onAsk(`What if ${field} = ${value}`); };
  return (
    <details className={s.disclosure}>
      <summary>{t('Try a change · no typing needed')}</summary>
      <div className={s.stackSm}>
        <p className={s.muted}>{t('Preview first. Nothing changes until you click Apply to draft.')}</p>
        <label className={s.field} htmlFor={`${id}-p`}>{t('Component or distance')}
          <select id={`${id}-p`} value="" disabled={busy} onChange={e => { if (e.target.value) onAsk(e.target.value); }}>
            <option value="">{t('Choose an experiment…')}</option>
            {CATEGORIES.map(([k, title]) => <optgroup key={k} label={title}>{CATALOG[k].map(p => <option key={p.id} value={`What if ${p.name}`}>{p.name}</option>)}</optgroup>)}
            <optgroup label={`Earth–${mission.bodyName || ''} ${t('distance')}`}>{Object.entries(distanceOptions(design)).map(([k, v]) => <option key={k} value={`What if distance ${k}`}>{v.name} · {fmt(v.km)} km</option>)}</optgroup>
          </select>
        </label>
        <form onSubmit={submit} className={s.expForm}>
          <label className={s.field} htmlFor={`${id}-f`}>{t('Setting')}
            <select id={`${id}-f`} value={field} onChange={e => { setField(e.target.value); const f = fields.find(x => x[0] === e.target.value); setValue(String(design[f[0]] ?? f[2])); }}>
              {fields.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <label className={s.field} htmlFor={`${id}-v`}>{t('New value')}
            <input id={`${id}-v`} type="number" step="any" min={def[2]} max={field === 'fuel' ? a.c.propulsion.maxFuel : def[3]} value={value} onChange={e => setValue(e.target.value)} required />
          </label>
          <Button type="submit" variant="primary" size="sm" disabled={busy}>{t('Preview change')}</Button>
        </form>
        <small className={s.muted}>{t('Range')}: {def[1]} {def[2]}–{field === 'fuel' ? a.c.propulsion.maxFuel : def[3]}.</small>
      </div>
    </details>
  );
}

/** The assistant: local reasoning plus the game engine, no generative AI and no network. */
export function AssistantBody() {
  const t = useT();
  const ctx = useGame(selectAssistantContext), chat = useGame(st => st.chat), level = useGame(st => st.mentorLevel), crisis = useGame(selectCrisis), language = useGame(st => st.prefs.language), aiAuto = useGame(st => st.prefs.aiBackup !== false);
  const locked = useGame(st => !!(st.run && !st.run.done));
  const act = useGame.getState().actions;
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const log = useRef(null), inputId = useId();
  useEffect(() => { log.current?.lastElementChild?.scrollIntoView?.({block: 'nearest'}); }, [chat]);
  const ask = async text => {
    if (!String(text).trim() || pending.current) return false;
    pending.current = true; setBusy(true); setError('');
    try { await act.ask(text); return true; }
    catch { setError(t('Could not prepare an answer. Please try again.')); return false; }
    finally { pending.current = false; setBusy(false); }
  };
  const onSubmit = async e => { e.preventDefault(); const text = q; if (await ask(text)) setQ(current => current === text ? '' : current); };
  const design = ctx.run?.design || ctx.design;
  const a0 = analyze(ctx.run?.design || ctx.design), bodyName = a0.m.bodyName || 'Moon';
  const starters = [...quickQuestions(ctx), ...tryThese(ctx, bodyName).slice(0, 2)].filter((x, k, all) => all.indexOf(x) === k).slice(0, 6);
  return (
    <div className={s.chatBody}>
      <div className={s.chatScroll}>
        <ContextCard ctx={ctx} />
        {!['en', 'bn'].includes(language) && <p className={s.muted}>{t('Detailed assistant explanations are currently in English. Use the translated quick questions.')}</p>}
        {crisis ? (
          <section className={s.crisis} aria-label={t('Rough preview of the pending decision')}>
            <span className="kicker">{t('Rough preview · direction only')}</span>
            <DirectionChips directions={crisis.directions} />
            <p className={s.muted}>{t('Provenance: each response was rehearsed to campaign end from this exact paused state by the game engine. Only directions are shown so the decision stays yours.')}</p>
            {crisis.forecastAvailable ? <Button size="sm" variant="secondary" disabled={busy} onClick={() => ask('Use my one forecast')}>{t('Spend my one forecast for ranges')}</Button> : <small className={s.muted}>{t('Your one forecast for this mission is used.')}</small>}
          </section>
        ) : null}
        {chat.length ? null : (
          <div className={s.hello} data-testid="assistant-try">
            <span className={s.helloMark} aria-hidden="true"><Icon name="assistant" size={22} /></span>
            <h3 className={s.helloTitle}>{t('How can I help, Commander?')}</h3>
            <p className={s.helloSub}>{t('Ask about your design, the flight, the maths or NASA data.')}</p>
            <div className={s.starters} role="group" aria-label={t('Quick questions')}>
              {starters.map(x => <button key={x} type="button" className={s.starter} disabled={busy} onClick={() => ask(x)}>{t(x)}</button>)}
            </div>
          </div>
        )}
        <div ref={log} className={s.thread} role="log" aria-live="polite" aria-label={t('Conversation')} tabIndex={0}>
          {chat.map((m, i) => (
            <div key={i} className={s.exchange}>
              <p className={s.question}>{String(m.q)}</p>
              <AnswerCard answer={m.answer} index={i} design={design} locked={locked} level={level} language={language} onApply={n => act.applyAssistant(n)} onAsk={ask} onAI={() => act.askAI(i)} ai={m.ai} showSuggestions={i === chat.length - 1} />
            </div>
          ))}
          {busy ? <p className={s.muted} role="status">{t('Thinking with the game engine…')}</p> : null}
        </div>
      </div>
      <div role="alert">{error}</div>
      <form onSubmit={onSubmit} className={s.composer}>
        <label className="sr-only" htmlFor={inputId}>{t('Your question')}</label>
        <input id={inputId} name="question" maxLength={500} autoComplete="off" placeholder={t('e.g. Am I ready to launch?')} value={q} onChange={e => setQ(e.target.value)} required />
        <Button type="submit" variant="primary" iconOnly icon="arrow-right" label={t('Ask')} loading={busy} />
      </form>
      <div className={s.composerMeta}>
        {aiAuto ? <small className={s.muted} data-testid="ai-notice">{t('If I cannot answer, an AI backup may reply. Answers from it are labelled.')}</small> : <span />}
        <details className={s.tools}>
          <summary>{t('Tools & preferences')}</summary>
          <div className={s.toolsBody}>
            <label className={s.switchRow} data-testid="ai-auto">
              <input type="checkbox" checked={aiAuto} onChange={e => act.setPref('aiBackup', e.target.checked)} />
              <span><strong>{t('Automatic AI backup')}</strong><small className={s.muted}>{t('When the verified assistant cannot answer, an AI model answers instead. Your question and a short mission summary are sent to Google Gemini through this site. Turn off to be asked first.')}</small></span>
            </label>
            <div className={s.row}>
              <Segmented size="sm" label={t('Level')} value={level} onChange={v => act.setMentorLevel(v)} options={[{value: 'Beginner', label: t('Beginner'), hint: t('Plain language; tables folded')}, {value: 'Engineer', label: t('Engineer'), hint: t('Evidence class and full tables')}]} />
              <LanguagePicker />
            </div>
            <Experiments ctx={ctx} onAsk={ask} busy={busy} />
            <p className={s.muted}>{t('Local reasoning and the game engine; no generative AI, no API key. I say when I cannot answer.')}</p>
            <Button variant="ghost" size="sm" disabled={!chat.length} onClick={() => act['clear-chat']()}>{t('Clear conversation')}</Button>
            <details className={s.disclosure}><summary>{t('Browse everything I can explain')}</summary><div className={s.chipRow}>{HELP_TOPICS.map(topic => <Button key={topic[0]} size="sm" variant="ghost" disabled={busy} onClick={() => ask(topic[1])}>{clean(topic[1], 80)}</Button>)}</div></details>
          </div>
        </details>
      </div>
    </div>
  );
}
