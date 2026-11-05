// Built-in sheets that belong to the store's safety flows (damaged saves, resume, discard, import, pre-launch check,
// power fix, clear history, menu). Feature packages may replace any of them by registering the same id.
import {useGame, selectLaunchCheck, selectLaunchGate, analyze} from '../store/index.js';
import {missionFor} from '@data/catalog.js';
import {ROLES, ROLE_ORDER} from '@data/scenarios.js';
import {Button, Chip, Segmented, Panel} from '../ds/index.js';
import {useT} from '../i18n/index.js';
import {registerSheet, SHEET_OWNERS} from '../sheets/registry.js';
import s from './shell.module.css';

const fmt = (v, n = 1) => Number(v).toLocaleString('en-US', {maximumFractionDigits: n, minimumFractionDigits: n});
const act = () => useGame.getState().actions;

function RejectedSave({kind}) {
  const t = useT();
  return (
    <>
      <p>{kind === 'save'
        ? t('The browser save is damaged. Its original text is preserved. Download it before discarding; new flights are blocked until you choose.')
        : t('This checkpoint is incompatible or damaged. Export the original before discarding it. New flights are blocked until you choose what to do.')}</p>
      <div className={s.row}>
        <Button variant="secondary" icon="share" onClick={() => act()['export-rejected-save']()}>{t('Download original save')}</Button>
        <Button variant="danger" onClick={() => act()['discard-rejected-save']()}>{kind === 'save' ? t('Discard damaged save') : t('Discard invalid checkpoint')}</Button>
      </div>
    </>
  );
}

function Resume({minute = 0}) {
  const t = useT();
  return (
    <>
      <p>{t('Checkpoint: T+{minute} min.', {minute: fmt(minute)})} {t('It stays paused until you press Resume. Browser storage is local to this device.')}</p>
      <div className={s.row}>
        <Button variant="primary" data-autofocus onClick={() => act()['resume-checkpoint']()}>{t('Review paused flight')}</Button>
        <Button variant="ghost" onClick={() => act()['discard-checkpoint']()}>{t('Discard saved flight')}</Button>
      </div>
    </>
  );
}

function DiscardFlight() {
  const t = useT();
  return (
    <>
      <p>{t('Your paused flight is saved in this browser. Cancel keeps it. Discard permanently removes this unfinished run and continues.')}</p>
      <div className={s.row}>
        <Button variant="primary" data-autofocus onClick={() => act().close()}>{t('Keep flight')}</Button>
        <Button variant="danger" onClick={() => act()['confirm-discard']()}>{t('Discard and continue')}</Button>
      </div>
    </>
  );
}

function ImportConfirm() {
  const t = useT();
  const design = useGame(st => st.pendingImport);
  if (!design) return <p>{t('Nothing to import.')}</p>;
  const a = analyze(design);
  return (
    <>
      <p><strong>{design.name}</strong> · {missionFor(design).title} · {a.c.payload.name}, {a.c.power.name}, {a.c.comms.name}</p>
      <p>{a.launchable ? t('It can launch.') : t('It has a hard launch blocker you will need to fix.')} {t('Loading it replaces your current draft. Codes are checked and limited to valid parts and ranges.')}</p>
      <div className={s.row}>
        <Button variant="primary" data-autofocus onClick={() => act()['import-design']()}>{t('Load into my hangar')}</Button>
        <Button variant="ghost" onClick={() => act()['cancel-import']()}>{t('Cancel')}</Button>
      </div>
    </>
  );
}

function LaunchCheck() {
  const t = useT();
  const lc = useGame(selectLaunchCheck);
  const gate = useGame(selectLaunchGate);
  return (
    <>
      <ul className={s.checks}>
        {lc.checks.map(c => (
          <li key={c.id} className={s.check}>
            <Chip kind={c.status === 'pass' ? 'pass' : c.status === 'warn' ? 'warn' : 'fail'} size="sm">{c.status.toUpperCase()}</Chip>
            <div><strong>{c.name}</strong><p className={s.muted}>{c.why}</p></div>
            <span className="num">{c.value}</span>
          </li>
        ))}
      </ul>
      {lc.crew ? (
        <Panel kicker={t('Go / No-Go')} title={t('Each role signs off')}>
          <ul className={s.checks}>
            {ROLE_ORDER.map(role => {
              const v = lc.verdicts.find(x => x.role === role);
              return (
                <li key={role} className={s.check}>
                  <Chip kind={v?.status === 'nogo' ? 'fail' : lc.signed[role] ? 'pass' : 'warn'} size="sm">{v?.status === 'nogo' ? t('NO-GO') : lc.signed[role] ? t('GO') : t('Waiting')}</Chip>
                  <div><strong>{ROLES[role].label}</strong></div>
                  <Button size="sm" variant="secondary" disabled={v?.status === 'nogo' || !!lc.signed[role]} disabledReason={v?.status === 'nogo' ? t('This role sees a hard failure') : undefined} onClick={() => act()['crew-signoff']({role})}>{t('Sign off')}</Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}
      <p>{lc.launchable ? t('Hardware is locked after launch. Warnings become operational consequences. You can recover only using the capabilities you selected.') : t('Resolve the hard failures in the hangar. Impossible mass, budget or interfaces cannot launch.')}</p>
      <div className={s.row}>
        <Button variant="ghost" onClick={() => act().close()}>{t('Back to hangar')}</Button>
        <Button variant="commit" icon="launch" disabled={!lc.canLaunch} disabledReason={gate.reason || lc.blockReason} onConfirm={() => act()['game-launch']()}>{t('Hold to authorize launch')}</Button>
      </div>
    </>
  );
}

function PowerFix() {
  const t = useT();
  const design = useGame(st => st.design);
  const before = analyze(design), after = analyze({...design, power: 'endurance', comms: 'highgain'});
  const m = missionFor(design);
  return (
    <>
      <p>{t('Only Power system → Endurance and Communications → High-gain are changed. Orbit, fuel, destination, payload, name, color and custom scaling stay as selected.')}</p>
      <p>{t('Wet mass')}: {fmt(before.wet)} → {fmt(after.wet)} kg. {t('Budget')}: {fmt(before.cost)} → {fmt(after.cost)} / {m.budget} {t('credits')}.</p>
      <p>{after.launchable ? t('Feasible hardware; warnings and operating choices can still prevent mission success.') : t('This change exceeds a hard constraint. Adjust your design before launching.')}</p>
      <div className={s.row}><Button variant="ghost" onClick={() => act().close()}>{t('Cancel')}</Button><Button variant="primary" data-autofocus onClick={() => act()['confirm-power-fix']()}>{t('Apply these two changes')}</Button></div>
    </>
  );
}

function ConfirmClear() {
  const t = useT();
  return (
    <>
      <p>{t('This removes the local comparison archive. Your current spacecraft design remains available.')}</p>
      <div className={s.row}><Button variant="ghost" data-autofocus onClick={() => act().close()}>{t('Cancel')}</Button><Button variant="danger" onClick={() => act()['confirm-clear']()}>{t('Clear history')}</Button></div>
    </>
  );
}

function Menu() {
  const t = useT();
  const prefs = useGame(st => st.prefs);
  const a = act();
  return (
    <div className={s.menu}>
      <Segmented label={t('Language')} value={prefs.language} onChange={v => a.setPref('language', v)} options={[{value: 'en', label: 'English'}, {value: 'bn', label: 'বাংলা'}]} />
      <Button variant="secondary" icon={prefs.sound ? 'sound-on' : 'sound-off'} aria-pressed={prefs.sound} onClick={() => a['toggle-sound']()}>{prefs.sound ? t('Sound on') : t('Sound off')}</Button>
      <Button variant="secondary" icon="vibration" aria-pressed={prefs.haptics} onClick={() => a['toggle-haptics']()}>{t('Haptics')}: {prefs.haptics ? t('On') : t('Off')}</Button>
      <Button variant="secondary" icon="motion" aria-pressed={prefs.reducedMotion} onClick={() => a['toggle-motion']()}>{t('Reduce animation')}: {prefs.reducedMotion ? t('On') : t('Off')}</Button>
      <Button variant="ghost" icon="help" onClick={() => a['game-help']()}>{t('How to play')}</Button>
      <Button variant="ghost" icon="assistant" onClick={() => a.mentor()}>{t('Assistant')}</Button>
      <Button variant="ghost" onClick={() => a.sources()}>{t('Sources')}</Button>
    </div>
  );
}

/** Shown for any sheet id nobody has registered yet, so a missing feature is obvious instead of silent. */
export function PlaceholderSheet({sheetId, ...props}) {
  const t = useT();
  return (
    <>
      <p>{t('This panel is not built yet.')} <code>{sheetId}</code> {SHEET_OWNERS[sheetId] ? `(${SHEET_OWNERS[sheetId]})` : ''}</p>
      <pre className={s.pre}>{JSON.stringify(props, null, 2)}</pre>
      <Button variant="secondary" onClick={() => act().close()}>{t('Close')}</Button>
    </>
  );
}

export function registerBuiltinSheets() {
  registerSheet('rejected-save', {component: RejectedSave, variant: 'dialog', title: 'Saved flight needs attention', size: 'sm'});
  registerSheet('resume', {component: Resume, variant: 'dialog', title: 'Resume your saved mission?', size: 'sm'});
  registerSheet('discard-flight', {component: DiscardFlight, variant: 'dialog', title: 'Discard the active flight?', size: 'sm', alert: true});
  registerSheet('import-confirm', {component: ImportConfirm, variant: 'dialog', title: 'Open a shared design?', size: 'sm'});
  registerSheet('launch-check', {component: LaunchCheck, variant: 'side', title: 'Pre-launch check'});
  registerSheet('power-fix', {component: PowerFix, variant: 'dialog', title: 'Preview power + communications change', size: 'sm'});
  registerSheet('confirm-clear', {component: ConfirmClear, variant: 'dialog', title: 'Clear saved mission runs?', size: 'sm', alert: true});
  registerSheet('menu', {component: Menu, variant: 'side', title: 'Menu'});
}
