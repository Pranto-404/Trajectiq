import {useId, useMemo, useState} from 'react';
import {useGame} from '@/store/index.js';
import {Button, Chip, Icon} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {ExternalLink} from '../report/ExternalLink.jsx';
import {Rise} from '../report/Rise.jsx';
import {clean, fmt} from '../report/format.js';
import {ASSET_CREDITS} from './assetCredits.js';
import {ATTRIBUTION, REAL_MISSIONS_CONVENTIONS, REAL_MISSIONS_VERIFIED, dataRows, exportCsv, getBody, listBodies, missionsFor} from './nasaData.js';
import s from './sheets.module.css';

/** Flag used for every value that has no NASA number behind it. Icon plus words, never colour alone. */
export function EvidenceFlag({row}) {
  const t = useT();
  return row.unverified
    ? <Chip kind="warn" size="sm" icon="warning">{t('Unverified · game assumption')}</Chip>
    : <Chip kind="pass" size="sm" icon="check">{t(row.evidence)}</Chip>;
}

/** The data table for one body: value, evidence flag, source link, verification date and use in the game. */
export function NasaTable({bodyId}) {
  const t = useT();
  const rows = useMemo(() => dataRows(bodyId), [bodyId]);
  return (
    <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('NASA reference data')}>
      <table className={s.table}>
        <caption className="sr-only">{t('NASA and JPL reference values with source, verification date and evidence class')}</caption>
        <thead><tr><th scope="col">{t('Parameter')}</th><th scope="col">{t('Value')}</th><th scope="col">{t('Evidence')}</th><th scope="col">{t('Source')}</th><th scope="col">{t('Verified')}</th><th scope="col">{t('Use in TRAJECTIQ')}</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} data-unverified={r.unverified || undefined}>
              <th scope="row">{r.label}</th>
              <td className="num">{fmt(r.value, Number.isInteger(r.value) ? 0 : 3)} {r.unit}</td>
              <td><EvidenceFlag row={r} /></td>
              <td>{r.url ? <ExternalLink href={r.url}>{t('Source')}</ExternalLink> : <span className={s.muted}>{t('No NASA source')}</span>}</td>
              <td className="num">{r.verified || '–'}</td>
              <td>{r.use}{r.note ? <small className={s.muted}> · {r.note}</small> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function bits(m) {
  const out = [];
  if (m.launch_mass_kg != null) out.push(['Launch mass', `${fmt(m.launch_mass_kg)} kg`]);
  if (m.dry_mass_kg != null) out.push(['Dry mass', `${fmt(m.dry_mass_kg)} kg`]);
  if (m.power?.solar_array_area_m2 != null) out.push(['Solar array', `${fmt(m.power.solar_array_area_m2, 1)} m²`]);
  if (typeof m.power?.power_w === 'number') out.push(['Array power', `${fmt(m.power.power_w)} W`]);
  if (m.cost_musd?.value != null) out.push(['Cost (as printed)', `$${fmt(m.cost_musd.value)} M`]);
  if (m.orbit?.altitude_km != null) out.push(['Orbit altitude', `${m.orbit.altitude_km} km`]);
  if (m.comm?.downlink_rate_mbps != null) out.push(['Downlink', `${m.comm.downlink_rate_mbps} Mb/s`]);
  return out;
}

/** "How real NASA missions were designed": the sourced missions for a body, with what is unverified stated plainly. */
export function RealMissions({bodyId}) {
  const t = useT();
  const list = missionsFor(bodyId);
  const body = getBody(bodyId);
  return (
    <section className={s.block} aria-labelledby="rm-title">
      <h3 id="rm-title">{t('How real NASA missions were designed')}</h3>
      <p className={s.muted}>{t('Reference missions for this body, read from NASA and JPL pages on {date}. “Not found” means the number was not in a fetched NASA source; nothing was guessed.', {date: REAL_MISSIONS_VERIFIED})} {REAL_MISSIONS_CONVENTIONS?.cost ? clean(REAL_MISSIONS_CONVENTIONS.cost, 200) : ''}</p>
      {body?.realReference ? <p><strong>{t('Behind the game scenario')}:</strong> {clean(body.realReference.mission, 40).toUpperCase()} · {clean(body.realReference.note, 200)}</p> : null}
      {list.length ? (
        <ul className={s.cards}>
          {list.map((m, i) => (
            <li key={m.id}><Rise i={i} className={s.miniCard}>
              <h4>{clean(m.name, 60)}</h4>
              <span className={s.muted}>{clean(m.type, 60)} · {clean(m.launch_date, 12)}</span>
              <dl className={s.facts}>{bits(m).map(([k, v]) => <div key={k}><dt>{t(k)}</dt><dd className="num">{clean(v, 80)}</dd></div>)}</dl>
              {Array.isArray(m.design_lessons) ? <ul className={s.plain}>{m.design_lessons.slice(0, 3).map((l, j) => <li key={j}>{clean(l, 160)}</li>)}</ul> : null}
              {m.provenance?.unverified?.length ? <p className={s.muted}><Icon name="warning" size={13} /> {t('Not found in a NASA source')}: {m.provenance.unverified.map(x => clean(x, 60)).join('; ')}</p> : null}
              <p className={s.links}>{(m.provenance?.sources || []).slice(0, 3).map((u, j) => <ExternalLink key={j} href={u}>{t('Source')} {j + 1}</ExternalLink>)}</p>
            </Rise></li>
          ))}
        </ul>
      ) : <p className={s.muted}>{t('No sourced real mission is recorded for this body.')}</p>}
    </section>
  );
}

export function Attribution() {
  const t = useT();
  return (
    <section className={s.block} aria-labelledby="attr-title">
      <h3 id="attr-title">{t('Data and asset credits')}</h3>
      <ul className={s.plain}>
        {ATTRIBUTION.map(a => (
          <li key={a.id}><strong>{clean(a.name, 100)}</strong>: {clean(a.credit, 200)} <span className={s.muted}>{clean(a.use, 300)}</span> <ExternalLink href={a.url}>{t('Open')}</ExternalLink></li>
        ))}
      </ul>
      <h4>{t('Imagery and 3D models')}</h4>
      {ASSET_CREDITS.length ? (
        <ul className={s.plain} data-testid="asset-credits">
          {ASSET_CREDITS.map(c => <li key={c.id}><strong>{clean(c.title, 100)}</strong>: {clean(c.credit, 300)}{c.licence ? ` · ${clean(c.licence, 80)}` : ''} {c.url ? <ExternalLink href={c.url}>{t('Open')}</ExternalLink> : null}</li>)}
        </ul>
      ) : <p className={s.muted} data-testid="asset-credits-empty">{t('No NASA imagery or 3D models are bundled in this build. If any are added, their credits appear here.')}</p>}
      <p className={s.muted}>{t('NASA acknowledged as the source of data. This game is not endorsed by or affiliated with NASA, and the NASA insignia are not used.')}</p>
    </section>
  );
}

/** NASA data and attributions, for any body. Opens on the body of the current design. */
export function NasaSheet({body}) {
  const t = useT();
  const current = useGame(st => (st.run && !st.run.done ? st.run.design : st.design).destination);
  const [pick, setPick] = useState(body || current);
  const id = useId();
  const b = getBody(pick) || getBody('moon');
  const bodies = listBodies();
  const [exported, setExported] = useState('');
  return (
    <div className={s.sheet}>
      <p className={s.muted}>{t('Offline numeric snapshot. Every value shows where it came from and when it was checked. Values with no NASA number are flagged as game assumptions. No live ephemeris or telemetry is loaded.')}</p>
      <label className={s.field} htmlFor={`${id}-b`}>{t('Body')}
        <select id={`${id}-b`} value={b.id} onChange={e => { setPick(e.target.value); setExported(''); }}>
          {bodies.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      {b.simplification ? <p className={s.notice}><Icon name="info" size={14} /> {clean(b.simplification, 400)}</p> : null}
      <NasaTable bodyId={b.id} />
      <div className={s.row}>
        <Button variant="secondary" size="sm" icon="share" onClick={() => setExported(exportCsv(b.id))}>{t('Export dataset (CSV)')}</Button>
        <span role="status" className={s.muted}>{exported ? `${t('Saved')} ${exported}` : ''}</span>
      </div>
      {b.hazards ? (
        <ul className={s.plain} aria-label={t('Environment notes')}>{Object.entries(b.hazards).map(([k, v]) => <li key={k}><strong>{clean(k, 20)}:</strong> {clean(v, 240)}</li>)}</ul>
      ) : null}
      <RealMissions bodyId={b.id} />
      <Attribution />
    </div>
  );
}
