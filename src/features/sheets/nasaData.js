// NASA data helpers shared by the NASA data sheet and the Sources sheet. Generic over every body in the registry:
// nothing here names a particular planet. Each row carries its source URL, verification date and an honest flag.
import {nasaDataset} from '@data/nasa.js';
import {BODIES, listBodies, getBody, bodyRows, isBodyId, ATTRIBUTION} from '@data/bodies.js';
import {datasetCSV} from '@data/nasa.js';
import {REAL_MISSIONS_CONVENTIONS, REAL_MISSIONS_VERIFIED, missionsFor} from '@data/real-missions.js';
import {defaultIo} from '@/store/io.js';
import {safeUrl} from '../report/format.js';

export {BODIES, listBodies, getBody, isBodyId, ATTRIBUTION, REAL_MISSIONS_CONVENTIONS, REAL_MISSIONS_VERIFIED, missionsFor};

const EVIDENCE = {direct: 'NASA / JPL', derived: 'Derived from NASA / JPL data', assumption: 'Game assumption'};

/** Rows of the data table for a body id: bodyRows() normalised, plus the Moon/Mars learning references when they exist. */
export function dataRows(bodyId) {
  const id = isBodyId(bodyId) ? bodyId : 'moon';
  const rows = bodyRows(id).map(r => ({
    id: r.id, label: String(r.label), value: r.value, unit: r.unit, use: r.use || '', url: safeUrl(r.url), verified: r.verifiedOn || '', note: r.note || '',
    unverified: r.unverified === true || r.kind === 'assumption', evidence: EVIDENCE[r.kind] || 'NASA / JPL'
  }));
  // The original Moon and Mars snapshots also carry two learning references that the registry does not.
  try {
    const legacy = nasaDataset({destination: id});
    for (const r of legacy.rows || []) {
      if (!['gravity', 'escape'].includes(r.id)) continue;
      rows.push({id: r.id, label: String(r.label), value: r.value, unit: r.unit, use: r.use || '', url: safeUrl(r.source === 'jpl' ? legacy.jplURL : legacy.factURL), verified: legacy.verified || '', note: '', unverified: r.source === 'assumption', evidence: r.source === 'assumption' ? EVIDENCE.assumption : EVIDENCE.direct});
    }
  } catch { /* the registry rows are enough */ }
  return rows;
}

/** CSV text and file name for a body (engine datasetCSV: RFC 4180, with source URL, verified date and unverified flag). */
export function csvFor(bodyId) {
  const id = isBodyId(bodyId) ? bodyId : 'moon';
  return {text: datasetCSV(id), name: `TRAJECTIQ_NASA_${String(BODIES[id].name).replace(/[^A-Za-z0-9]+/g, '_')}_data.csv`};
}

/** Download the CSV through the shared I/O layer (Blob URL, no network). */
export function exportCsv(bodyId) {
  const {text, name} = csvFor(bodyId);
  defaultIo.download(text, 'text/csv', name);
  return name;
}
