import {CATALOG, CATEGORIES} from '@data/catalog.js';
import {ROLES} from '@data/scenarios.js';
import {canEdit, ownerOf} from '@engine/crew.js';
import {Chip, PartCard} from '@/ds/index.js';
import {useGame, selectActiveDesign} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {useLocked} from './hooks.js';
import s from './hangar.module.css';

/** One-line capability of a part (what it does, as opposed to what it costs). */
export function capabilityLine(kind, c) {
  switch (kind) {
    case 'power': return `${c.solar} W · ${c.battery} Wh`;
    case 'payload': return `${c.dataMbps} Mb/s`;
    case 'comms': return `${c.downlinkMbps} Mb/s`;
    case 'propulsion': return `${c.isp} s Isp`;
    case 'storage': return `${c.capacity} MB`;
    case 'bus': return `${c.pointing}″ pointing`;
    case 'launch': return `${c.capacity} kg capacity`;
    default: return '';
  }
}

/**
 * The parts tray: subsystem tabs, then one PartCard per class with signed delta chips against the installed part.
 * Hover or keyboard focus on a card previews its effect on the gauges (ghost segments) before anything is committed.
 * Click, Enter, Space and touch install; in crew mode a non-owner's install becomes a suggestion (the store decides).
 * Cards keep stable keys, so keyboard focus stays on the same card after an install.
 */
export function PartsTray({onInstall, ref, part = 'all'}) {
  const t = useT();
  const locked = useLocked();
  const category = useGame(st => st.category), design = useGame(selectActiveDesign), team = useGame(st => st.team), a = useGame(st => st.actions);
  const crew = team.mode === 'crew';
  const mine = !crew || canEdit(team, category);
  const owner = crew ? ROLES[ownerOf(category)] : null;
  const installed = CATALOG[category].find(p => p.id === design[category]) || null;
  const meta = CATEGORIES.find(c => c[0] === category);
  const lockedWhy = t('Locked after launch');
  return (
    <div className={s.tray} ref={ref} data-tour={part === 'all' ? 'tray' : undefined} data-testid="parts-tray">
      {part !== 'list' ? <div className={s.tabs} role="group" aria-label={t('Subsystem')}>
        {CATEGORIES.map(([key, title]) => (
          <Chip key={key} selectable selected={key === category} icon={key} onClick={() => a.setCategory(key)} data-category={key}>{t(title)}</Chip>
        ))}
      </div> : null}
      {part === 'tabs' ? null : (
        <>
          <div className={s.trayHead}>
            <h3 className={s.trayTitle}>{t(meta?.[2] || '')}</h3>
            <span className="kicker">{t('Select one class')}</span>
          </div>
          {locked ? <p className={s.lockNote} role="note"><Chip kind="info" icon="lock" size="sm">{t('Locked')}</Chip> {t('Hardware is locked after launch. Finish or discard this flight to edit.')}</p> : null}
          {crew && !locked ? (
            <p className={s.ownerNote} role="note" data-owner={mine ? 'me' : 'other'}>
              <Chip kind="role" size="sm" tone={`var(--role-${ownerOf(category)})`} icon="assistant">{owner?.short}</Chip>
              {mine ? t('You hold this role: installs apply right away.') : t('Another role owns this subsystem. Installing sends them a suggestion instead.')}
            </p>
          ) : null}
          <ul className={s.partList} aria-label={t(meta?.[1] || '')}>
            {CATALOG[category].map(p => (
              <li key={p.id} className={s.partItem}>
                <PartCard part={p} installed={installed} kind={category} draggable={!locked}
                  disabled={locked} disabledReason={locked ? lockedWhy : undefined}
                  onInstall={part => onInstall(category, part)}
                  onPreview={id => { if (!locked) a.previewPart(id ? category : null, id); }} />
                <p className={s.spec}>{capabilityLine(category, p)}</p>
              </li>
            ))}
          </ul>
          <p className={s.fine}>{t('Fictional teaching hardware. Drag a module onto the spacecraft, or select it here.')}</p>
        </>
      )}
    </div>
  );
}
