import {normalize} from '@engine/model.js';
import {neededScience, missionFor} from '@data/catalog.js';
import {Button, Chip, Icon, Concept} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {ExternalLink} from '../report/ExternalLink.jsx';
import {ARROW, clean, fmt} from '../report/format.js';
import s from './sheets.module.css';

/** Has the player's design moved on since this proposal was previewed? Compares exactly the keys the proposal was based on. */
export function proposalStale(proposal, design) {
  if (!proposal?.base) return true;
  const now = normalize(design);
  return Object.keys(proposal.base).some(k => proposal.base[k] !== now[k]);
}

/** Direction chips (arrow + words, never colour alone). Pure text from the engine. */
export function DirectionChips({directions}) {
  const t = useT();
  return (
    <ul className={s.directions} aria-label={t('Direction of each response')}>
      {directions.map(r => (
        <li key={r.id}>
          <strong>{clean(r.name, 60)}</strong>
          <span className={s.chipRow}>
            {(r.chips || []).map(c => <Chip key={c.key} kind={c.dir > 0 ? 'pass' : c.dir < 0 ? 'warn' : 'info'} size="sm" icon={null} title={c.key}>{t(c.key)} <b aria-hidden="true">{ARROW(c.dir)}</b><span className="sr-only"> {c.dir > 0 ? t('better') : c.dir < 0 ? t('worse') : t('about equal')}</span></Chip>)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ComparisonTable({rows, design}) {
  const t = useT();
  let need = '';
  try { need = neededScience(missionFor(design)); } catch { /* optional */ }
  return (
    <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Simulated design comparison')}>
      <table className={s.table}>
        <caption>{t('Game simulation results · science threshold {n}', {n: need})}</caption>
        <thead><tr><th scope="col">{t('Scenario')}</th><th scope="col">{t('Returned science')}</th><th scope="col">{t('Final battery')}</th><th scope="col">{t('Discarded data')}</th><th scope="col">{t('Cost')}</th><th scope="col">{t('Mass')}</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row">{clean(r.label, 60)}<br /><small className={r.achieved ? s.good : s.warnText}>{clean(r.status, 40)}</small></th>
              <td className="num">{r.science === null ? '–' : fmt(r.science, 1)}</td><td className="num">{r.battery === null ? '–' : `${fmt(r.battery, 1)}%`}</td>
              <td className="num">{r.lostMB === null ? '–' : `${fmt(r.lostMB, 1)} MB`}</td><td className="num">{fmt(r.cost, 1)} cr</td><td className="num">{fmt(r.mass, 1)} kg</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.filter(r => r.launchable === false).map((r, i) => <p key={i} className={s.warnText}>{clean(r.label, 60)}: {(r.warnings || []).filter(w => w.status === 'fail').map(w => `${clean(w.name, 40)}: ${clean(w.value, 40)}`).join('; ')}</p>)}
    </div>
  );
}

/** What an experiment would change: base -> patch, read-only, so Apply is never a surprise. */
function ProposalPreview({proposal}) {
  const t = useT();
  const keys = Object.keys(proposal.patch || {});
  return (
    <ul className={s.plain} aria-label={t('What would change in the draft')}>
      {keys.map(k => <li key={k}><span className="kicker">{clean(k, 20)}</span> <span className="num">{clean(proposal.base?.[k], 30)} → <strong>{clean(proposal.patch[k], 30)}</strong></span></li>)}
    </ul>
  );
}

/**
 * One assistant answer. All text comes from the local engine or the player and renders as text.
 * - proposal: read-only preview, then "Apply to draft". Disabled while a flight is active and when the design
 *   changed since the preview (a stale proposal can never overwrite a newer design).
 * - level: Beginner hides tables behind a disclosure; Engineer shows evidence class and tables open.
 */
const AI_ERRORS = {
  not_configured: 'The AI backup is not set up on this site yet.', rate_limited: 'Too many AI requests right now. Try again in a few minutes.',
  offline: 'The AI backup needs an internet connection and the hosted site. The verified assistant still works offline.',
  blocked: 'The AI backup declined to answer that.', upstream: 'The AI backup did not respond. The verified answers still work.'
};

/** One-line "thinking" bubble while the automatic AI backup answers. */
function Typing() {
  const t = useT();
  return (
    <article className={s.answer} data-known="yes" data-testid="ai-loading" role="status" aria-live="polite">
      <span className={s.typing} aria-hidden="true"><i /><i /><i /></span>
      <span className={s.muted}>{t('Thinking…')}</span>
    </article>
  );
}

/** The AI backup's answer, shown like any other answer; only a small badge tells the player where it came from. */
function AIAnswer({ai, suggestions, onAsk, showSuggestions}) {
  const t = useT();
  return (
    <article className={s.answer} data-known="yes" data-ai="yes" data-testid="ai-answer">
      <Chip kind="info" size="sm" icon="assistant" className={s.evidence}>{t('AI backup · not verified by the game')}</Chip>
      <p className={s.answerText}>{String(ai.text)}</p>
      <small className={s.muted}>{t('Generated by an AI model. It can be wrong; check anything that matters against the NASA sources.')}</small>
      {showSuggestions && Array.isArray(suggestions) && suggestions.length ? <div className={s.chipRow}>{suggestions.map(q => <Button key={q} size="sm" variant="ghost" onClick={() => onAsk(q)}>{t(clean(q, 60))}</Button>)}</div> : null}
    </article>
  );
}

/** The optional AI backup for a refused question: the button (automatic switch off) or the retry after an error. */
function AIBackup({ai, onAsk}) {
  const t = useT();
  return (
    <div className={s.aiAsk}>
      {ai?.status === 'error' ? <p className={s.warnText} role="alert">{t(AI_ERRORS[ai.error] || AI_ERRORS.upstream)}</p> : null}
      <Button size="sm" variant="secondary" icon="assistant" onClick={onAsk}>{ai?.status === 'error' ? t('Try the AI backup again') : t('Ask the AI backup')}</Button>
      {ai?.status === 'error' ? null : <small className={s.muted}>{t('Sends your question and a short summary of your mission to Google Gemini through this site. Nothing is sent until you press the button. The answer is not verified by the game engine.')}</small>}
    </div>
  );
}

export function AnswerCard({answer, index, design, locked, level, onApply, onAsk, onAI, ai, language, showSuggestions = true}) {
  const t = useT();
  const bn = language === 'bn';
  const stale = answer.proposal ? proposalStale(answer.proposal, design) : false;
  const reason = locked ? t('Hardware is locked until this flight ends.') : stale ? t('Your design has changed. Ask again to refresh this preview.') : '';
  const engineer = level === 'Engineer';
  const refusal = !answer.known && answer.evidence === 'OUTSIDE VERIFIED KNOWLEDGE';
  if (refusal && ai?.status === 'loading') return <Typing />;
  if (refusal && ai?.status === 'done') return <AIAnswer ai={ai} suggestions={answer.suggestions} onAsk={onAsk} showSuggestions={showSuggestions} />;
  const table = answer.comparisons ? <ComparisonTable rows={answer.comparisons} design={design} /> : null;
  return (
    <article className={s.answer} data-known={answer.known ? 'yes' : 'no'} data-testid="answer">
      <strong className={s.answerTitle}>{t(String(answer.title ?? ''))}</strong>
      <p className={s.answerText}>{String(answer.text ?? '')}</p>
      {Array.isArray(answer.directions) && answer.directions.length ? <DirectionChips directions={answer.directions} /> : null}
      {Array.isArray(answer.ranges) && answer.ranges.length ? (
        <ul className={s.plain} aria-label={t('Forecast ranges')}>{answer.ranges.map(r => <li key={r.id}><strong>{clean(r.name, 60)}</strong>: {t('science')} <span className="num">{r.science?.[0]}–{r.science?.[1]}</span>, {t('battery')} <span className="num">{r.battery?.[0]}–{r.battery?.[1]}%</span></li>)}</ul>
      ) : null}
      {table ? (engineer ? table : <details className={s.disclosure}><summary>{t('Show the simulation table')}</summary>{table}</details>) : null}
      {answer.proposal ? (
        <div className={s.proposal}>
          <ProposalPreview proposal={answer.proposal} />
          <Button variant="primary" size="sm" icon="check" disabled={!!reason} disabledReason={reason} onClick={() => onApply(index)}>{bn ? 'Draft-এ প্রয়োগ করুন' : t('Apply to draft')} · {clean(answer.proposal.label, 40)}</Button>
          <small className={s.muted}>{reason || t('Changes the design only; does not launch.')}</small>
        </div>
      ) : null}
      {Array.isArray(answer.sources) && answer.sources.length ? <p className={s.links}>{answer.sources.map((x, i) => <ExternalLink key={i} href={x.url}>{clean(x.title, 80)}</ExternalLink>)}</p> : null}
      {refusal && typeof onAI === 'function' ? <AIBackup ai={ai} onAsk={onAI} auto={ai?.status === 'error'} /> : null}
      {showSuggestions && Array.isArray(answer.suggestions) && answer.suggestions.length ? (
        <div className={s.chipRow}>{answer.suggestions.map(q => <Button key={q} size="sm" variant="ghost" onClick={() => onAsk(q)}>{t(clean(q, 60))}</Button>)}</div>
      ) : null}
      {answer.evidence ? <small className={`${s.evidenceLine} ${answer.known ? '' : s.warnText}`}><Icon name={answer.known ? 'check' : 'warning'} size={12} /> {String(answer.evidence)}</small> : null}
      {answer.topic === 'battery' || answer.topic === 'data' ? <Concept id={answer.topic === 'battery' ? 'power' : 'datarate'} label={t('the idea behind this')} /> : null}
      {!engineer ? null : <small className={s.muted}><Icon name="info" size={12} /> {t('Answer {n}', {n: index + 1})}</small>}
    </article>
  );
}
