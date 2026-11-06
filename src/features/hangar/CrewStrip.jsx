import {useEffect, useRef} from 'react';
import {ROLES} from '@data/scenarios.js';
import {Button, Chip, Panel} from '@/ds/index.js';
import {useGame, selectCrew} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import s from './hangar.module.css';

/**
 * Crew table: who holds the controls, each player's roles, and the proposals waiting for their owner. Accepting or declining
 * removes the buttons that had focus, so focus is moved to the next proposal, or to the strip itself, never dropped on <body>.
 */
export function CrewStrip() {
  const t = useT();
  const crew = useGame(selectCrew), a = useGame(st => st.actions);
  const region = useRef(null), list = useRef(null), after = useRef(null);
  const pending = crew.pendingSuggestions;
  useEffect(() => {
    if (!after.current) return;
    const target = after.current; after.current = null;
    const next = target.nextId && list.current?.querySelector(`li[data-suggestion="${target.nextId}"] button`);
    (next || region.current)?.focus();
  }, [pending.length]);
  if (!crew.crew) return null;
  const active = crew.active;
  const answer = (id, accept) => {
    const ids = pending.map(p => p.id), i = ids.indexOf(id);
    after.current = {nextId: ids[i + 1] || ids[i - 1] || null};
    a[accept ? 'suggest-accept' : 'suggest-decline']({id});
    if (useGame.getState().team.suggestions.find(x => x.id === id)?.status === 'pending') after.current = null; // refused (locked flight, wrong owner): nothing moved
  };
  return (
    <Panel kicker={t('Crew mode · shared decisions')} title={t('Crew table')} ref={region} tabIndex={-1} className={s.crew} data-testid="crew-strip"
      actions={<Button size="sm" variant="primary" icon="arrow-right" onClick={() => a['crew-pass']()}>{t('Pass the controls')}</Button>}>
      <p>
        <strong>{active.name}</strong> {t('has the controls as')} <strong>{active.roles.map(r => ROLES[r].label).join(' + ')}</strong>. {t('Change only what your role owns; use a part’s button to suggest a change to its owner.')}
      </p>
      <ul className={s.players} aria-label={t('Players')}>
        {crew.players.map((p, i) => (
          <li key={i} aria-current={p === active ? 'true' : undefined} className={p === active ? s.playerActive : s.player}>
            <strong>{p.name}</strong>
            <span className={s.roleChips}>{p.roles.map(r => <Chip key={r} kind="role" size="sm" icon="assistant" tone={`var(--role-${r})`}>{ROLES[r].short}</Chip>)}</span>
          </li>
        ))}
      </ul>
      {pending.length ? (
        <div>
          <span className="kicker">{t('Proposals')} ({pending.length})</span>
          <ul className={s.proposals} ref={list}>
            {pending.map(p => {
              const mine = active.roles.includes(p.owner);
              return (
                <li key={p.id} data-suggestion={p.id} className={s.proposal}>
                  <span><strong>{p.fromName}</strong> {t('suggests')} <b>{p.label}</b> <small>{t('for')} {ROLES[p.owner]?.label}</small></span>
                  {mine ? (
                    <span className={s.row}>
                      <Button size="sm" variant="primary" onClick={() => answer(p.id, true)}>{t('Accept')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => answer(p.id, false)}>{t('Decline')}</Button>
                    </span>
                  ) : <small className={s.fine}>{t('Waiting for the owner')}</small>}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
