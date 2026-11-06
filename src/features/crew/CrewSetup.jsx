import {Segmented} from '@/ds/index.js';
import {useGame} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {ROLES} from './crewModel.js';
import {RoleBadge} from './RoleBadge.jsx';
import s from './crew.module.css';

/** `crew-setup` sheet: number of players (2-4), names, and which roles each player holds. Hostile names stay text. */
export function CrewSetup() {
  const t = useT();
  const team = useGame(st => st.team), a = useGame(st => st.actions), locked = useGame(st => !!(st.run && !st.run.done));
  if (team.mode !== 'crew') return <p>{t('Choose Crew on the mission board to play with 2 to 4 players.')}</p>;
  return (
    <div className={s.setup}>
      <Segmented label={t('Number of players')} value={team.players.length} onChange={n => a.setPlayers(n)} options={[2, 3, 4].map(n => ({value: n, label: t('{n} players', {n}), disabled: locked}))} />
      {team.players.map((p, i) => (
        <label key={i} className={s.nameField}>
          <span>{t('Player {n}', {n: i + 1})} · {p.roles.map(r => ROLES[r].short).join(' + ')}</span>
          <input maxLength={24} autoComplete="off" defaultValue={p.name} placeholder={t('Player {n}', {n: i + 1})} onBlur={e => a.setTeamName(i, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          <span className={s.playerRoles}>{p.roles.map(r => <RoleBadge key={r} role={r} />)}</span>
        </label>
      ))}
      <p className={s.note}>{t('Pass the controls on one device. Each role owns different subsystems, so you will have to negotiate.')}</p>
    </div>
  );
}
