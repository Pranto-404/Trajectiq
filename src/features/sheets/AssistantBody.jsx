import {useEffect, useId, useRef, useState} from 'react';
import {CATALOG, CATEGORIES, missionFor} from '@data/catalog.js';
import {distanceOptions} from '@data/nasa.js';
import {HELP_TOPICS} from '@engine/assistant.js';
import {EXPERIMENT_FIELDS} from '@engine/copilot.js';
import {useGame, selectAssistantContext, selectCrisis, analyze} from '@/store/index.js';
import {Button, Chip, Segmented, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {AnswerCard, DirectionChips} from './AnswerCard.jsx';
import {clean, fmt} from '../report/format.js';
import s from './sheets.module.css';

const QUICK = ['Mission status', 'Review my design', 'Compare presets', 'Compare crisis choices', 'How do I play?'];

function ContextCard({ctx}) {
  const t = useT();
  const a = analyze(ctx.run?.design || ctx.design), r = ctx.run;
  return (
    <div className={s.context} data-testid="assistant-context">
      <Chip kind={r ? 'mode' : 'info'} size="sm" icon={r ? 'orbit' : 'assistant'}>{r ? (r.done ? t('Completed mission') : t('Paused mission')) : t('Current draft')}</Chip>
      <strong>{clean(a.d.name, 40)}</strong>
      <span className="num">{r ? `T+${fmt(r.minute, 1)} min · ${fmt(r.science)} ${t('science returned')}` : `${fmt(a.cost, 1)} / ${a.m.budget} cr · ${fmt(a.wet, 1)} kg`}</span>
      <small className={s.muted}>{t('Answers use this context. Older answers are snapshots from when you asked.')}</small>
    </div>
  );
}

function Experiments({ctx, onAsk, busy}) {
  const t = useT();
  const id = useId();
  const design = ctx.run?.design || ctx.design;
  const a = analyze(design), mission = missionFor(design);
  const [field, setField] = useState(EXPERIMENT_FIELDS[0][0]);
  const [value, setValue] = useState('45');
  const def = EXPERIMENT_FIELDS.find(f => f[0] === field);
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
            <select id={`${id}-f`} value={field} onChange={e => { setField(e.target.value); const f = EXPERIMENT_FIELDS.find(x => x[0] === e.target.value); setValue(String(f[0] === 'fuel' ? 45 : f[2] <= 1 && f[3] <= 2 ? 1 : f[2])); }}>
              {EXPERIMENT_FIELDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </label>
          <label className={s.field} htmlFor={`${id}-v`}>{t('New value')}
            <input id={`${id}-v`} type="number" step="any" min={def[2]} max={def[3]} value={value} onChange={e => setValue(e.target.value)} required />
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
  const ctx = useGame(selectAssistantContext), chat = useGame(st => st.chat), level = useGame(st => st.mentorLevel), crisis = useGame(selectCrisis), language = useGame(st => st.prefs.language);
  const locked = useGame(st => !!(st.run && !st.run.done));
  const act = useGame.getState().actions;
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const log = useRef(null), inputId = useId();
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [chat.length]);
  const ask = async text => {
    if (!String(text).trim()) return;
    setBusy(true);
    try { await act.ask(text); } finally { setBusy(false); }
  };
  const onSubmit = async e => { e.preventDefault(); const text = q; setQ(''); await ask(text); };
  const design = ctx.run?.design || ctx.design;
  return (
    <div className={s.sheet}>
      <p>{t('Ask about playing, your spacecraft, NASA data or a mission problem.')} <strong>{t('Flight pauses while you read.')}</strong> <span className={s.muted}>{t('Local reasoning and the game engine; no generative AI, no API key. I say when I cannot answer.')}</span></p>
      <div className={s.row}>
        <Segmented size="sm" label={t('Level')} value={level} onChange={v => act.setMentorLevel(v)} options={[{value: 'Beginner', label: t('Beginner'), hint: t('Plain language; tables folded')}, {value: 'Engineer', label: t('Engineer'), hint: t('Evidence class and full tables')}]} />
        <Segmented size="sm" label={t('Answer language')} value={language} onChange={v => act.setPref('language', v)} options={[{value: 'en', label: 'English'}, {value: 'bn', label: 'বাংলা'}]} />
      </div>
      <ContextCard ctx={ctx} />
      {crisis ? (
        <section className={s.crisis} aria-label={t('Rough preview of the pending decision')}>
          <span className="kicker">{t('Rough preview · direction only')}</span>
          <DirectionChips directions={crisis.directions} />
          <p className={s.muted}>{t('Provenance: each response was rehearsed to campaign end from this exact paused state by the game engine. Only directions are shown so the decision stays yours.')}</p>
          {crisis.forecastAvailable ? <Button size="sm" variant="secondary" onClick={() => ask('Use my one forecast')}>{t('Spend my one forecast for ranges')}</Button> : <small className={s.muted}>{t('Your one forecast for this mission is used.')}</small>}
        </section>
      ) : null}
      <div className={s.chipRow} role="group" aria-label={t('Quick questions')}>{QUICK.map(x => <Button key={x} size="sm" variant="ghost" disabled={busy} onClick={() => ask(x)}>{t(x)}</Button>)}</div>
      <Experiments ctx={ctx} onAsk={ask} busy={busy} />
      <div ref={log} className={s.thread} role="log" aria-live="polite" aria-label={t('Conversation')} tabIndex={0}>
        {chat.length ? chat.map((m, i) => (
          <div key={i} className={s.exchange}>
            <p className={s.question}><Icon name="arrow-right" size={12} /> {String(m.q)}</p>
            <AnswerCard answer={m.answer} index={i} design={design} locked={locked} level={level} language={language} onApply={n => act.applyAssistant(n)} onAsk={ask} />
          </div>
        )) : <p className={s.muted}>{t('I can simulate a change, compare decisions and explain your mission. Try “What if fuel = 45” or “Review my design”.')}</p>}
        {busy ? <p className={s.muted} role="status">{t('Thinking with the game engine…')}</p> : null}
      </div>
      <form onSubmit={onSubmit} className={s.askForm}>
        <label className={s.field} htmlFor={inputId}>{t('Your question')}
          <input id={inputId} name="question" maxLength={500} autoComplete="off" placeholder={t('e.g. How can I avoid losing data?')} value={q} onChange={e => setQ(e.target.value)} required />
        </label>
        <Button type="submit" variant="primary" loading={busy}>{t('Ask')}</Button>
      </form>
      <div className={s.row}>
        <Button variant="ghost" size="sm" disabled={!chat.length} onClick={() => act['clear-chat']()}>{t('Clear conversation')}</Button>
      </div>
      <details className={s.disclosure}>
        <summary>{t('Browse everything I can explain')}</summary>
        <div className={s.chipRow}>{HELP_TOPICS.map(topic => <Button key={topic[0]} size="sm" variant="ghost" disabled={busy} onClick={() => ask(topic[1])}>{clean(topic[1], 80)}</Button>)}</div>
      </details>
    </div>
  );
}
