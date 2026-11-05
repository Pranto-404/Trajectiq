import {Icon} from './Icon.jsx';
import s from './Chip.module.css';

const KIND_ICON = {pass: 'check', warn: 'warning', fail: 'close', info: 'info', role: 'assistant', mode: 'orbit'};
const KIND_WORD = {pass: 'Pass', warn: 'Warning', fail: 'Fail', info: 'Info'};

/**
 * Status chip. Always icon + text (never colour alone). kind: pass | warn | fail | info | role | mode.
 * `selectable` renders a toggle button (aria-pressed) for filters. `tone` (role chips) is a CSS colour for the role hue.
 */
export function Chip({kind = 'info', size = 'md', icon, children, selectable = false, selected = false, onClick, tone, className = '', ...rest}) {
  const name = icon === null ? null : icon || KIND_ICON[kind];
  const content = (
    <>
      {name ? <Icon name={name} size={size === 'sm' ? 12 : 14} /> : null}
      <span className={s.text}>{children ?? KIND_WORD[kind]}</span>
    </>
  );
  const cls = `${s.chip} ${s[kind]} ${s[size]} ${selectable ? s.selectable : ''} ${className}`;
  const style = tone ? {'--chip-tone': tone} : undefined;
  if (selectable) return <button type="button" className={cls} style={style} aria-pressed={selected} data-selected={selected || undefined} onClick={onClick} {...rest}>{content}</button>;
  return <span className={cls} style={style} {...rest}>{content}</span>;
}
