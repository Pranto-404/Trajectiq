import {useEffect, useId, useRef, useState} from 'react';
import {decodeDesign} from '@engine/share.js';
import {getBody} from '@engine/api.js';
import {missionFor} from '@data/catalog.js';
import {useGame, selectShareCode, runScore} from '@/store/index.js';
import {defaultIo} from '@/store/io.js';
import {Button, Chip} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {clean, fmt} from './format.js';
import {PATCH_SIZE, drawPatch, patchModel, renderPatchBlob} from './patch.js';
import s from './report.module.css';

/** Result of `compare-run`: an error from the decoder, or both designs flown with the same seed and autopilot. */
export function CompareResult({compare}) {
  const t = useT();
  if (!compare) return null;
  if (compare.error) return <p className={s.error} role="alert"><Chip kind="fail" size="sm">{t('Rejected')}</Chip> {String(compare.error)}</p>;
  if (!compare.theirs) return null;
  const {mine, theirs, theirName, claimed} = compare;
  const cell = (v, n = 1) => (v === undefined || v === null ? '–' : fmt(v, n));
  const row = (label, k, n) => <tr key={k}><th scope="row">{label}</th><td className="num">{mine.launchable ? cell(mine[k], n) : '–'}</td><td className="num">{theirs.launchable ? cell(theirs[k], n) : '–'}</td></tr>;
  const verdict = r => (r.launchable ? (r.achieved ? t('Achieved') : t('Incomplete')) : t('Cannot launch'));
  return (
    <div className={s.compare} role="status" data-testid="compare-result">
      <p><strong>{clean(theirName || t('Their design'), 40)}</strong> {t('flown on this device with the same seed and autopilot')}{claimed !== null && claimed !== undefined ? ` (${t('their code claims {n} points; verify instead of trusting', {n: claimed})})` : ''}.</p>
      <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Design comparison')}>
        <table className={s.table}>
          <thead><tr><th scope="col">{t('Autopilot result')}</th><th scope="col">{t('Your design')}</th><th scope="col">{t('Their design')}</th></tr></thead>
          <tbody>
            {row(t('Returned science'), 'science', 1)}{row(t('Final battery %'), 'battery', 0)}{row(t('Cost · cr'), 'cost', 1)}{row(t('Mass · kg'), 'mass', 1)}
            <tr><th scope="row">{t('Objective')}</th><td>{verdict(mine)}</td><td>{verdict(theirs)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Mission patch preview (canvas) with a PNG download. All drawing is local; nothing leaves the device. */
export function PatchCard({run, score, code}) {
  const t = useT();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const mission = missionFor(run.design);
  const model = patchModel({run, score, mission, body: getBody(run.design?.destination), code});
  const key = JSON.stringify(model);
  useEffect(() => {
    const ctx = ref.current?.getContext?.('2d');
    if (ctx) drawPatch(ctx, model, PATCH_SIZE);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const download = async () => {
    setBusy(true);
    const blob = await renderPatchBlob(model);
    setBusy(false);
    const a = useGame.getState().actions;
    if (!blob) { a.toast('Could not draw the patch in this browser. Copy the mission code instead.'); return; }
    defaultIo.download(blob, 'image/png', `TRAJECTIQ_patch_${clean(run.label, 8).replace(/[^A-Za-z0-9_-]/g, '') || 'run'}.png`);
    a.toast('Mission patch saved as a PNG.');
  };
  return (
    <div className={s.patch}>
      <canvas ref={ref} width={PATCH_SIZE} height={PATCH_SIZE} className={s.patchCanvas} role="img" aria-label={t('Mission patch for {name}: grade {grade}, {total} points', {name: model.name, grade: model.grade, total: model.total})} />
      <div className={s.patchSide}>
        <h3>{t('Mission patch')}</h3>
        <p className={s.muted}>{t('A PNG drawn on this device from your result: spacecraft, mission, grade and score. Nothing is uploaded.')}</p>
        <Button variant="secondary" icon="share" loading={busy} onClick={download}>{t('Download patch (PNG)')}</Button>
      </div>
    </div>
  );
}

/** Paste a TQ6 code: compare it with the current design, or stage it for import. Both formats (v1 and v2) are accepted by the decoder. */
export function CodeImport() {
  const t = useT();
  const id = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const compare = useGame(st => st.compare);
  const a = useGame.getState().actions;
  const onCompare = () => { setError(''); a['compare-run']({code}); };
  const onImport = () => {
    const r = decodeDesign(code);
    if (!r.ok) { setError(r.error); return; }
    setError('');
    useGame.setState({pendingImport: r.design});
    a.openSheet('import-confirm', {});
  };
  return (
    <div className={s.stackSm}>
      <label className="kicker" htmlFor={id}>{t('Paste a TQ6 code')}</label>
      <textarea id={id} className={s.code} rows={3} maxLength={2400} autoComplete="off" spellCheck={false} placeholder="TQ6.…" value={code} onChange={e => { setCode(e.target.value); setError(''); }} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} />
      {error ? <p id={`${id}-e`} className={s.error} role="alert"><Chip kind="fail" size="sm">{t('Rejected')}</Chip> {error}</p> : null}
      <div className={s.row}>
        <Button variant="primary" size="sm" disabled={!code.trim()} disabledReason={t('Paste a code first')} onClick={onCompare}>{t('Compare with my design')}</Button>
        <Button variant="secondary" size="sm" disabled={!code.trim()} disabledReason={t('Paste a code first')} onClick={onImport}>{t('Load into my hangar')}</Button>
      </div>
      <CompareResult compare={compare} />
    </div>
  );
}

/** The share tab body for a finished run. */
export function SharePanel({run}) {
  const t = useT();
  const code = useGame(selectShareCode), board = useGame(st => st.board);
  const a = useGame.getState().actions;
  const score = runScore(run);
  const onBoard = board.some(e => e.id === run.id);
  const reason = run.design?.sandbox ? t('Sandbox runs are not ranked') : !score ? t('This run has no score (older model version)') : onBoard ? t('Already on the leaderboard') : '';
  const codeId = useId();
  return (
    <div className={s.stack}>
      <section className={s.card} aria-labelledby={`${codeId}-t`}>
        <h3 id={`${codeId}-t`}>{t('Save, share and compare')}</h3>
        <p className={s.muted}>{t('A mission code holds your whole design. Send it to a friend or another team: they paste it below and the same engine flies both designs fairly on their machine.')}</p>
        <label className="kicker" htmlFor={codeId}>{t('Mission code')}</label>
        <textarea id={codeId} className={s.code} readOnly rows={3} value={code} aria-label={t('Mission code')} onFocus={e => e.currentTarget.select()} />
        <div className={s.row}>
          <Button variant="primary" size="sm" icon="share" onClick={() => a['copy-code']()}>{t('Copy code')}</Button>
          <Button variant="secondary" size="sm" onClick={() => a['copy-challenge']()}>{t('Copy challenge link')}</Button>
          <Button variant="secondary" size="sm" disabled={!!reason} disabledReason={reason} onClick={() => a['board-add']()}>{t('Add to leaderboard')}</Button>
        </div>
      </section>
      {score ? <section className={s.card}><PatchCard run={run} score={score} code={code} /></section> : null}
      <section className={s.card} aria-label={t('Compare or import a code')}>
        <h3>{t('Compare or import a code')}</h3>
        <p className={s.muted}>{t('Codes are checked and limited to valid parts and ranges. A claimed score is never trusted: the engine re-flies the design.')}</p>
        <CodeImport />
      </section>
      <section className={s.card} aria-label={t('Export and print')}>
        <h3>{t('Report file')}</h3>
        <p className={s.muted}>{t('The download is a read-only JSON report. It cannot restore a flight and holds no team names.')}</p>
        <div className={s.row}>
          <Button variant="secondary" size="sm" onClick={() => a.export()}>{t('Download read-only report')}</Button>
          <Button variant="secondary" size="sm" onClick={() => a.print()}>{t('Print report')}</Button>
        </div>
      </section>
    </div>
  );
}
