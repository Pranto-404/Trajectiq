import {useState} from 'react';
import {motion} from 'motion/react';
import {ROLES} from '@data/scenarios.js';
import {Chip, Panel, Segmented} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {enterProps} from './motionUtil.js';
import s from './board.module.css';

const OWN = {launch: 'Launch', bus: 'Bus', propulsion: 'Propulsion', payload: 'Payload', power: 'Power', comms: 'Comms', storage: 'Recorder'};

/** One player's name field. The text is held locally so a half-typed or empty name never snaps back; the store keeps the last valid name. */
function NameField({index, player, label, placeholder, disabled}) {
  const t = useT();
  const a = useGame(st => st.actions);
  const [draft, setDraft] = useState(player.name);
  const id = `crew-name-${index}`;
  return (
    <div className={s.crewRow}>
      <label htmlFor={id} className={s.crewLabel}>
        <span>{label}</span>
        <span className={s.roleChips}>
          {player.roles.map(r => <Chip key={r} kind="role" size="sm" tone={`var(--role-${r})`} icon="assistant">{t(ROLES[r]?.short || r)}</Chip>)}
        </span>
      </label>
      <input id={id} className={s.input} data-team-name={index} maxLength={24} value={draft} autoComplete="off" placeholder={placeholder} disabled={disabled}
        onChange={e => { setDraft(e.target.value); a.setTeamName(index, e.target.value); }}
        onBlur={() => { if (!draft.trim()) setDraft(player.name); }} />
      <p className={s.owns}>{player.roles.flatMap(r => ROLES[r]?.owns || []).map(k => t(OWN[k] || k)).join(' · ')}</p>
    </div>
  );
}

/** Crew setup: 2-4 players, a name each, roles assigned by the engine. Shown only in Crew mode. */
export function CrewSetup({reduced, locked}) {
  const t = useT();
  const team = useGame(st => st.team), a = useGame(st => st.actions);
  const n = team.players.length;
  return (
    <motion.div {...enterProps(0, reduced)}>
      <Panel kicker={`${n} ${n === 1 ? t('player') : t('players')}`} title={t('Your crew')} data-testid="crew-setup" className={s.crewPanel}>
        <Segmented label={t('Number of players')} value={n} onChange={v => a['board-players']({players: v})}
          options={[2, 3, 4].map(k => ({value: k, label: `${k} ${t('players')}`, disabled: locked}))} />
        <div className={s.crewList}>
          {team.players.map((p, i) => <NameField key={i} index={i} player={p} label={`${t('Player')} ${i + 1}`} placeholder={`${t('Player')} ${i + 1}`} disabled={locked} />)}
        </div>
        <p className={s.note}>{t('Pass the controls on one device. Each role owns different subsystems, so you will have to negotiate.')}</p>
      </Panel>
    </motion.div>
  );
}
