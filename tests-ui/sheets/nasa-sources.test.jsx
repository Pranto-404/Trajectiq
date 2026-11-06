import {describe, it, expect, beforeEach, vi} from 'vitest';
import {screen, within, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {normalize} from '@engine/model.js';
import {presetFor} from '@data/catalog.js';
import {defaultIo} from '@/store/io.js';
import {useGame} from '@/store/index.js';
import {ExternalLink} from '@/features/report/ExternalLink.jsx';
import {safeUrl} from '@/features/report/format.js';
import {NasaSheet, NasaTable, RealMissions, Attribution} from '@/features/sheets/NasaSheet.jsx';
import {SourcesSheet} from '@/features/sheets/SourcesSheet.jsx';
import {dataRows, csvFor, listBodies, ATTRIBUTION} from '@/features/sheets/nasaData.js';
import {ASSET_CREDITS} from '@/features/sheets/assetCredits.js';
import {wrap, acts, resetStore, EVIL} from './helpers.jsx';

beforeEach(() => resetStore());

describe('NASA data is generic over every body', () => {
  const bodies = listBodies();
  it('has more than the two original bodies', () => { expect(bodies.length).toBeGreaterThanOrEqual(8); });

  it.each(bodies.map(b => [b.id]))('%s: every value has a source URL or an explicit game-assumption flag, and a verified date', id => {
    const rows = dataRows(id);
    expect(rows.length).toBeGreaterThanOrEqual(8);
    for (const r of rows) {
      expect(Number.isFinite(Number(r.value)), `${id}.${r.id} value`).toBe(true);
      expect(r.verified, `${id}.${r.id} verified`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.url || r.unverified, `${id}.${r.id} needs a URL or the assumption flag`).toBeTruthy();
      if (r.url) expect(r.url).toMatch(/^https:\/\//);
    }
  });

  it('the table shows a source link per sourced value and a warning flag with words for assumptions', () => {
    resetStore({design: normalize(presetFor('mercury', 'balanced', 'mercury-thermal'))});
    wrap(<NasaTable bodyId="mercury" />);
    const rows = dataRows('mercury'), table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(rows.length + 1);
    expect(within(table).getAllByRole('link').every(a => a.getAttribute('rel') === 'noopener noreferrer' && a.getAttribute('target') === '_blank')).toBe(true);
    const assumed = rows.filter(r => r.unverified).length;
    expect(within(table).queryAllByText('Unverified · game assumption')).toHaveLength(assumed);
    expect(assumed).toBeGreaterThan(0);
  });

  it('the sheet switches body, exports the engine CSV through the shared download, and lists real missions with sources', async () => {
    const dl = vi.spyOn(defaultIo, 'download').mockImplementation(() => {});
    wrap(<NasaSheet />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Body'), 'europa');
    expect(screen.getByRole('table').textContent).toMatch(/Mean radius/);
    expect(screen.getByRole('heading', {name: 'How real NASA missions were designed'})).toBeTruthy();
    expect(screen.getAllByText(/Europa Clipper/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', {name: 'Export dataset (CSV)'}));
    expect(dl).toHaveBeenCalledTimes(1);
    const [text, type, name] = dl.mock.calls[0];
    expect(type).toBe('text/csv'); expect(name).toMatch(/Europa.*\.csv$/); expect(text).toMatch(/^"parameter","value","unit","evidence","source_url","verified_utc","unverified","note"/);
    expect(csvFor('mars').text).toContain('"false"');
    expect(screen.getByRole('status').textContent).toMatch(/Saved/);
  });

  it('every real mission card names what was not found in a NASA source, and links only to https', () => {
    wrap(<RealMissions bodyId="mars" />);
    expect(screen.getAllByRole('heading', {level: 4}).length).toBeGreaterThan(1);
    expect(screen.getAllByText(/Not found in a NASA source/).length).toBeGreaterThan(0);
    for (const a of screen.getAllByRole('link')) expect(a.getAttribute('href')).toMatch(/^https:\/\//);
  });

  it('shows the attribution list and the asset credits slot', () => {
    wrap(<Attribution />);
    for (const a of ATTRIBUTION) expect(screen.getByText(a.name)).toBeTruthy();
    expect(screen.getAllByText(/not endorsed by or affiliated with NASA/).length).toBeGreaterThan(0);
    if (!ASSET_CREDITS.length) expect(screen.getByTestId('asset-credits-empty')).toBeTruthy(); else expect(screen.getByTestId('asset-credits')).toBeTruthy();
  });
});

describe('links from data are only ever safe https links', () => {
  it('safeUrl and ExternalLink refuse other schemes and render them as text', () => {
    const bad = ['java' + 'script:alert(1)', 'data:text/html,<b>', 'http://nasa.gov', '//nasa.gov', 'https://a b', 'https://x"onmouseover=1', null, 5];
    for (const u of bad) expect(safeUrl(u)).toBeNull();
    expect(safeUrl('https://science.nasa.gov/mission/lro/')).toBe('https://science.nasa.gov/mission/lro/');
    const {container} = wrap(<ExternalLink href={bad[0]}>{EVIL}</ExternalLink>);
    expect(container.querySelector('a')).toBeNull(); expect(container.textContent).toContain('<img');
  });
});

describe('sources and method', () => {
  it('explains the method, lists references for the active body, the catalog and the data table with CSV export', async () => {
    resetStore({design: normalize(presetFor('mercury', 'balanced', 'mercury-thermal'))});
    const dl = vi.spyOn(defaultIo, 'download').mockImplementation(() => {});
    wrap(<SourcesSheet />);
    expect(screen.getByText(/preparation prototype/)).toBeTruthy();
    for (const h of ['Mass and propulsion', 'Circular orbit period', 'Battery integration', 'Uncertainty is not mission probability', 'Assumption register']) expect(screen.getByRole('heading', {name: h})).toBeTruthy();
    expect(screen.getByRole('heading', {name: /NASA and JPL reference map · Mercury/})).toBeTruthy();
    expect(screen.getByRole('region', {name: 'Component catalog'})).toBeTruthy();
    await userEvent.setup().click(screen.getByRole('button', {name: 'Export dataset (CSV)'}));
    expect(dl.mock.calls[0][2]).toMatch(/Mercury/);
    await userEvent.setup().click(screen.getByRole('button', {name: 'All bodies, missions and credits'}));
    expect(useGame.getState().sheet?.id).toBe('nasa');
  });
  it('works for the original bodies too and never shows markup from data as elements', () => {
    const { container } = wrap(<SourcesSheet />);
    expect(container.querySelector('img,script')).toBeNull();
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
