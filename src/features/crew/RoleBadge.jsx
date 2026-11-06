import {Icon} from '@/ds/index.js';
import {ROLES, ROLE_VAR, ROLE_ICON, roleInitial} from './crewModel.js';
import s from './crew.module.css';

/** Role identity: hue + icon + initial + short name (never colour alone). */
export function RoleBadge({role, compact = false}) {
  const r = ROLES[role];
  if (!r) return null;
  return (
    <span className={s.roleBadge} style={{'--tone': ROLE_VAR[role]}} data-role={role}>
      <span className={s.roleDot} aria-hidden="true"><Icon name={ROLE_ICON[role]} size={14} /></span>
      <span className={s.roleInitial} aria-hidden="true">{roleInitial(role)}</span>
      {compact ? <span className="sr-only">{r.short}</span> : <span>{r.short}</span>}
    </span>
  );
}
