import {Suspense, useState} from 'react';
import {CATALOG} from '@data/catalog.js';
import {announce, useReducedMotion} from '@/ds/index.js';
import {useGame, selectActiveDesign} from '@/store/index.js';
import {useT} from '@/i18n/index.js';
import {SchematicStage} from './SchematicStage.jsx';
import s from './hangar.module.css';

// The 3D stage is built by another package (src/features/stage). It is picked up if present, without a hard import, so this
// package builds and runs with or without it. Contract (plan 5.2): <Stage3D design selected hoverPart run phase quality
// reduced onPick onSocketHover ref> with an imperative ref {seatPart(kind, id, fromRect), cameraTo(preset), launchSequence(skip)}.
const stageModules = import.meta.glob('../stage/index.js', {eager: true});
const stageEntry = Object.values(stageModules)[0];
export const Stage3D = stageEntry?.Stage3D || stageEntry?.default?.Stage3D || null;

const MIME = 'application/x-trajectiq';

/** Parse a drag payload; only a real catalog part is accepted. */
export function readDrop(dataTransfer) {
  try {
    const raw = dataTransfer?.getData?.(MIME); if (!raw) return null;
    const {kind, id} = JSON.parse(raw);
    return typeof kind === 'string' && typeof id === 'string' && Object.hasOwn(CATALOG, kind) && CATALOG[kind].some(p => p.id === id) ? {kind, id} : null;
  } catch { return null; }
}

/**
 * The hangar's stage area: the 3D stage when available (else the schematic), and a drop target for dragged part cards.
 * Selection and hover flow through props: `onPick(kind)` selects a subsystem, the store's `preview` becomes `hoverPart`.
 */
export function StageSlot({stageRef, onDropPart, compact}) {
  const t = useT();
  const reduced = useReducedMotion();
  const design = useGame(selectActiveDesign), category = useGame(st => st.category), preview = useGame(st => st.preview), run = useGame(st => st.run), a = useGame(st => st.actions);
  const [over, setOver] = useState(false);
  const pick = kind => { if (!kind || !a.setCategory) return; a.setCategory(kind); announce(t('{name} selected. Choose a module in the parts tray.', {name: kind})); };
  const hoverPart = preview?.kind ? {kind: preview.kind, id: preview.id} : null;
  const accepts = e => Array.from(e.dataTransfer?.types || []).includes(MIME);
  const fallback = <SchematicStage ref={stageRef} design={design} selected={category} hoverPart={hoverPart} onPick={pick} compact={compact} />;
  return (
    <div className={`${s.stageSlot} ${over ? s.dropOver : ''}`} data-tour="stage" data-testid="stage-slot"
      onDragOver={e => { if (accepts(e)) { e.preventDefault(); setOver(true); } }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { setOver(false); const part = readDrop(e.dataTransfer); if (part) { e.preventDefault(); onDropPart?.(part); } }}>
      {Stage3D ? (
        <Suspense fallback={fallback}>
          <Stage3D ref={stageRef} design={design} selected={category} hoverPart={hoverPart} run={run && !run.done ? run : null} phase="hangar" quality="auto" reduced={reduced} onPick={pick} onSocketHover={() => {}} fallback={fallback} />
        </Suspense>
      ) : fallback}
      {over ? <div className={s.dropHint} aria-hidden="true">{t('Drop to install')}</div> : null}
    </div>
  );
}
