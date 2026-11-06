import {Button, Chip} from '@/ds/index.js';
import {useGame, selectCrisis} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {ROLES, ROLE_ORDER, holderOf, voteSummary} from './crewModel.js';
import {RoleBadge} from './RoleBadge.jsx';
import s from './crew.module.css';

/**
 * Crisis team vote (the `<CrewVote/>` slot used by the flight incident takeover). Each role console shows that role's advice
 * (crew.js roleAdvice, computed by the store selector) and its vote buttons. Majority wins; a tie goes to the Commander's vote
 * (crew.js tallyVotes); "Apply team decision" is a hold-to-confirm Commit button and calls `crew-resolve`.
 * Collaboration inputs (contributions, followed-expert) are recorded by the store's crew-resolve action exactly as in v6.
 */
export function CrewVote({onResolved}) {
  const t = useT();
  const crisis = useGame(selectCrisis);
  const team = useGame(st => st.team);
  const actions = useGame(st => st.actions);
  if (!crisis) return null;
  const {crisis: c, advice, votes} = crisis;
  const sum = voteSummary(votes);
  const chosen = c.actions.find(a => a.id === sum.decided);
  const nameOf = id => c.actions.find(a => a.id === id)?.name || id;
  const status = sum.decided
    ? (sum.tieBroken ? t('Tie broken by the Commander: {name}', {name: chosen?.name || sum.decided}) : t('Team decision: {name}', {name: chosen?.name || sum.decided}))
    : sum.deadlock ? (sum.complete ? t('No majority. The Commander’s vote decides a tie; discuss and vote again.') : t('{n} of {total} roles have voted. A tie is decided by the Commander.', {n: sum.cast, total: sum.total}))
      : t('{n} of {total} roles have voted', {n: sum.cast, total: sum.total});
  return (
    <section className={s.vote} aria-label={t('Team decision')} data-testid="crew-vote">
      <span className="kicker">{t('Team decision · each role advises from its own priority')}</span>
      <div className={s.voteRows}>
        {ROLE_ORDER.map(role => {
          const holder = holderOf(team, role), adv = advice.find(a => a.role === role);
          const text = adv?.optionId ? t('advises {name} because it {why}.', {name: adv.optionName, why: adv.why}) : `${adv?.why || t('has no strong view')}.`;
          return (
            <div key={role} className={s.voteRow} data-role={role}>
              <div className={s.voteWho}>
                <RoleBadge role={role} />
                <small>{holder?.name}</small>
                <p>{text}</p>
              </div>
              <div className={s.voteOptions} role="group" aria-label={`${ROLES[role].label} ${t('vote')}`}>
                {c.actions.map(a => (
                  <Chip key={a.id} selectable kind="mode" icon={votes[role] === a.id ? 'check' : null} selected={votes[role] === a.id} disabled={a.disabled} aria-disabled={a.disabled || undefined}
                    onClick={() => { if (!a.disabled) actions['crew-vote']({role, option: a.id}); }} data-option={a.id}>{a.name}</Chip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className={s.tally} aria-label={t('Vote count')}>
        {Object.entries(sum.counts).map(([id, n]) => <Chip key={id} kind={sum.decided === id ? 'pass' : 'info'} size="sm" icon={null}>{nameOf(id)} · {n}</Chip>)}
      </div>
      <div className={s.voteFoot}>
        <span role="status" data-decided={sum.decided || undefined}>{status}</span>
        <Button variant="commit" icon="check" disabled={!sum.decided} disabledReason={sum.decided ? undefined : t('Finish the vote, or break the tie with the Commander.')}
          holdLabel={t('Keep holding')} onConfirm={() => { actions['crew-resolve'](); onResolved?.(sum.decided); }}>{t('Hold to apply team decision')}</Button>
      </div>
    </section>
  );
}
