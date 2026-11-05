import {useId, useState} from 'react';
import {Icon} from './Icon.jsx';
import {Chip} from './Chip.jsx';
import s from './Panel.module.css';

/**
 * Translucent surface. state: default | selected (cyan edge) | locked (hatched overlay + lock chip, used for flight hardware)
 * | warning (amber edge) | incident (red edge with scan line). `collapsible` adds a disclosure button (mobile panels).
 * `as` changes the element (default section). With a `title` the section is a labelled region.
 */
export function Panel({kicker, title, badge, actions, state = 'default', collapsible = false, defaultOpen = true, as: Tag = 'section', className = '', children, ...rest}) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;
  return (
    <Tag className={`${s.panel} ${s[state]} ${className}`} data-state={state} aria-labelledby={title ? `${id}-t` : undefined} {...rest}>
      {state === 'locked' ? <span className={s.hatch} aria-hidden="true" /> : null}
      {state === 'incident' ? <span className={s.scan} aria-hidden="true" /> : null}
      {kicker || title || badge || actions || collapsible ? (
        <header className={s.header}>
          <div className={s.titles}>
            {kicker ? <span className="kicker">{kicker}</span> : null}
            {title ? <h2 id={`${id}-t`} className={s.title}>{title}</h2> : null}
          </div>
          <div className={s.right}>
            {state === 'locked' ? <Chip kind="info" icon="lock" size="sm">Locked</Chip> : null}
            {badge ? (typeof badge === 'string' ? <Chip kind="info" size="sm" icon={null}>{badge}</Chip> : badge) : null}
            {actions}
            {collapsible ? <button type="button" className={s.toggle} aria-expanded={open} aria-controls={`${id}-b`} aria-label={`${open ? 'Collapse' : 'Expand'} ${typeof title === 'string' ? title : 'panel'}`} onClick={() => setOpen(o => !o)}><Icon name="chevron-down" size={18} className={open ? s.flip : ''} /></button> : null}
          </div>
        </header>
      ) : null}
      {showBody ? <div id={`${id}-b`} className={s.body}>{children}</div> : null}
    </Tag>
  );
}
