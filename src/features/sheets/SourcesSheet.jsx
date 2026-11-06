import {CATALOG, UNCERTAINTY, missionFor, sourcesFor} from '@data/catalog.js';
import {useGame, selectMission} from '@/store/index.js';
import {Button, Chip} from '@/ds/index.js';
import {useT} from '@/i18n/index.js';
import {ExternalLink} from '../report/ExternalLink.jsx';
import {Rise} from '../report/Rise.jsx';
import {clean, fmt} from '../report/format.js';
import {NasaTable} from './NasaSheet.jsx';
import {exportCsv} from './nasaData.js';
import s from './sheets.module.css';

function Method({kicker, title, formula, children, i}) {
  return (
    <Rise i={i} className={s.method}>
      <span className="kicker">{kicker}</span>
      <h3>{title}</h3>
      <pre className={s.formula} tabIndex={0}>{formula}</pre>
      <p>{children}</p>
    </Rise>
  );
}

/** Sources and method: equations, assumptions, the references behind the active body, the data table and the catalog. */
export function SourcesSheet() {
  const t = useT();
  const M = useGame(selectMission);
  const act = useGame.getState().actions;
  const body = clean(M.bodyName, 30) || t('this body');
  const refs = (() => { try { return sourcesFor(M.destination); } catch { return []; } })();
  return (
    <div className={s.sheet}>
      <p className={s.notice}>{t('This is a preparation prototype. NASA references inform the model; NASA has not approved this game. A NASA/JPL numeric snapshot is bundled offline. No live ephemeris, measured hardware specification or terrain raster is loaded.')}</p>
      <div className={s.cards}>
        <Method i={0} kicker={t('Derived · physics')} title={t('Mass and propulsion')} formula={'m₀ = Σ hardware + structure + propellant\nΔv = Isp × 9.80665 × ln(m₀ / mf)'}>
          {t('Mass in kg, specific impulse in seconds, Δv in m/s. Maneuver propellant is consumed using the inverse rocket equation. No thrust-duration or multi-body trajectory calculation is performed.')}
        </Method>
        <Method i={1} kicker={t('Derived · orbit')} title={t('Circular orbit period')} formula={'T = 2π √((R + h)³ / μ)'}>
          R = {fmt(M.radius, 1)} km, μ = {fmt(M.mu, 3)} km³/s² ({body}). {t('Divide T by 60 for minutes. Shadow uses a central cylindrical bound ({m} min at the reference altitude); contact windows ({c} min) are fixed teaching schedules, not dated ground geometry.', {m: fmt(M.eclipseMinutes, 1), c: M.contactMinutes})}
        </Method>
        <Method i={2} kicker={t('Derived · energy')} title={t('Battery integration')} formula={'E(next) = clamp(E + (Pgen − Pload) × Δt / 60, 0, capacity)'}>
          {t('E in Wh, power in W, Δt ≤ 1 minute, split at orbit window boundaries. Generation is zero in eclipse; operations apply an 85% derating. Safe mode begins at 15% state of charge and ends above 40%.')}
        </Method>
        <Method i={3} kicker={t('Derived · information')} title={t('Data → returned science')} formula={'MB = Mb/s × seconds / 8\nGenerated science = quality × duty × minutes × 10'}>
          {t('Only accepted data is stored. Overflow discards new data. Science depends on payload quality, pointing, inclination and altitude. Unreturned observations do not count.')}
          {' '}{t('The factor 10 sets the educational score scale; it is not a physical constant. Stored science is reduced by the accepted-data fraction, and earns points only when downlinked.')}
        </Method>
      </div>

      <section className={s.block} aria-labelledby="src-ref"><h3 id="src-ref">{t('NASA and JPL reference map')} · {body}</h3>
        <ul className={s.plain}>{refs.map(r => (
          <li key={r.id}><Chip kind={/assumption/i.test(String(r.type)) ? 'warn' : 'info'} size="sm" icon={/assumption/i.test(String(r.type)) ? 'warning' : 'info'}>{clean(r.type, 40)}</Chip> <ExternalLink href={r.url}>{clean(r.title, 120)}</ExternalLink><br /><span className={s.muted}>{clean(r.use, 500)}</span></li>
        ))}</ul>
      </section>

      <section className={s.block}><h3>{t('Uncertainty is not mission probability')}</h3>
        <p>{t('{n} fixed-seed samples vary independent uniform solar {a}, link {b}, Isp {c} and pointing-error {d} multipliers. A fixed conservative policy handles every event. The index is the fraction achieving at least {pct}% of the target science with battery above zero in this model.', {n: UNCERTAINTY.samples, a: `[${UNCERTAINTY.solar.join(', ')}]`, b: `[${UNCERTAINTY.link.join(', ')}]`, c: `[${UNCERTAINTY.isp.join(', ')}]`, d: `[${UNCERTAINTY.pointing.join(', ')}]`, pct: M.scienceSuccess})}</p>
        <p className={s.muted}>{t('It is an educational robustness indicator, not a real-world chance of success. It does not estimate hardware failure probability, certification or safety.')}</p>
      </section>

      <section className={s.block}><h3>{t('Assumption register')}</h3>
        <p>{clean(M.assumption, 1500)}</p>
        <p className={s.muted}>{t('All costs are fictional credits. Payload science scores, derating, safe-mode thresholds and the degraded-link contact are game assumptions. Components are fictional classes. Limitations: no thermal solver, radiation model, detailed RF budget, n-body propagation or real ground stations. The assistant is a deterministic explanation tool; no paid AI service is used.')}</p>
      </section>

      <section className={s.block} aria-labelledby="src-data"><h3 id="src-data">{t('NASA / JPL data')} · {body}</h3>
        <NasaTable bodyId={M.destination} />
        <div className={s.row}>
          <Button variant="secondary" size="sm" icon="share" onClick={() => exportCsv(M.destination)}>{t('Export dataset (CSV)')}</Button>
          <Button variant="ghost" size="sm" onClick={() => act['nasa-data']()}>{t('All bodies, missions and credits')}</Button>
        </div>
      </section>

      <section className={s.block}><h3>{t('Versioned component catalog · educational values')}</h3>
        <div className={s.tableScroll} tabIndex={0} role="region" aria-label={t('Component catalog')}>
          <table className={s.table}>
            <thead><tr><th scope="col">{t('Class')}</th><th scope="col">{t('Mass · kg')}</th><th scope="col">{t('Load · W')}</th><th scope="col">{t('Cost · cr')}</th><th scope="col">{t('Evidence classification')}</th></tr></thead>
            <tbody>{Object.values(CATALOG).flat().map(c => <tr key={c.id + c.name}><th scope="row">{clean(c.name, 60)}</th><td className="num">{c.mass}</td><td className="num">{c.power}</td><td className="num">{c.cost}</td><td>{t('Educational assumption')}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
