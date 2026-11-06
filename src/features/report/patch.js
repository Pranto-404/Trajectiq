// Mission patch: a shareable PNG drawn on an offscreen canvas. No network, no images, no fonts to fetch.
// `patchModel` collects plain data; `drawPatch` paints it on any 2D context (tests pass a recording fake);
// `renderPatchBlob` turns it into a PNG Blob. Every string is clipped and drawn as canvas text, never as markup.
import {clean} from './format.js';

export const PATCH_SIZE = 900;
const GRADE_COLOR = {S: '#ccff6b', A: '#7cdbf3', B: '#b5a8ff', C: '#ffbc6e', D: '#ff7b83'};

/** Cheap deterministic hash -> unit random stream (mulberry32), so the same run always gets the same star field. */
export function seededStream(text) {
  let h = 1779033703 ^ String(text).length;
  for (const ch of String(text)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Plain data for the patch. `mission` is missionFor(design), `body` an engine body (or null), `score` the run score. */
export function patchModel({run, score, mission, body, code}) {
  const grade = ['S', 'A', 'B', 'C', 'D'].includes(score?.grade) ? score.grade : 'C';
  return {
    name: clean(run?.design?.name, 28) || 'Spacecraft', title: clean(mission?.title, 34) || 'Mission', label: clean(run?.label, 8),
    body: clean(mission?.bodyName || body?.name, 18) || 'Orbit', grade, total: Number.isFinite(Number(score?.total)) ? Math.round(Number(score.total)) : 0,
    achieved: !!run?.outcome?.achieved, surface: body?.colors?.surface || '#b9b7b0', accent: body?.colors?.accent || '#e3e1da',
    code: clean(code, 400), seed: `${run?.id ?? ''}${code ?? ''}${run?.design?.name ?? ''}`
  };
}

/** Paint the patch. Pure over `ctx`. */
export function drawPatch(ctx, m, size = PATCH_SIZE) {
  const c = size / 2, R = size * 0.46, rnd = seededStream(m.seed), gradeColor = GRADE_COLOR[m.grade];
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.clip();
  const sky = ctx.createRadialGradient(c, c * 0.8, size * 0.05, c, c, R);
  sky.addColorStop(0, '#16263a'); sky.addColorStop(1, '#060a11');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) { // stars
    const x = rnd() * size, y = rnd() * size, r = 0.6 + rnd() * 1.8;
    ctx.globalAlpha = 0.35 + rnd() * 0.55; ctx.fillStyle = '#f1f4f8';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const px = c - R * 0.28, py = c + R * 0.62, pr = R * 0.62; // the body, lit from the upper right
  const planet = ctx.createRadialGradient(px + pr * 0.35, py - pr * 0.35, pr * 0.1, px, py, pr);
  planet.addColorStop(0, m.accent); planet.addColorStop(0.55, m.surface); planet.addColorStop(1, '#0b1018');
  ctx.fillStyle = planet; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(124,219,243,.75)'; ctx.lineWidth = 4; // orbit with the spacecraft
  ctx.beginPath(); ctx.ellipse(px, py, pr * 1.28, pr * 0.46, -0.5, Math.PI * 1.05, Math.PI * 2.05); ctx.stroke();
  const t = -0.15, ox = px + Math.cos(-0.5) * pr * 1.28 * Math.cos(t) - Math.sin(-0.5) * pr * 0.46 * Math.sin(t), oy = py + Math.sin(-0.5) * pr * 1.28 * Math.cos(t) + Math.cos(-0.5) * pr * 0.46 * Math.sin(t);
  ctx.fillStyle = '#ccff6b'; ctx.fillRect(ox - 9, oy - 9, 18, 18);
  ctx.strokeStyle = '#ccff6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox - 26, oy); ctx.lineTo(ox - 9, oy); ctx.moveTo(ox + 9, oy); ctx.lineTo(ox + 26, oy); ctx.stroke();
  ctx.restore();

  ctx.lineWidth = 14; ctx.strokeStyle = gradeColor; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke(); // border
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(241,244,248,.55)'; ctx.beginPath(); ctx.arc(c, c, R - 22, 0, Math.PI * 2); ctx.stroke();

  ctx.textAlign = 'center'; ctx.fillStyle = '#f1f4f8'; ctx.textBaseline = 'middle';
  ctx.font = '700 44px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillText('TRAJECTIQ', c, c - R * 0.76);
  ctx.font = '600 30px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillStyle = '#b6c1ce'; ctx.fillText(m.title.toUpperCase(), c, c - R * 0.64);
  ctx.fillStyle = gradeColor; ctx.font = '800 250px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillText(m.grade, c + R * 0.38, c - R * 0.16);
  ctx.fillStyle = '#f1f4f8'; ctx.font = '700 64px "IBM Plex Mono", ui-monospace, monospace'; ctx.fillText(`${m.total}`, c + R * 0.38, c + R * 0.28);
  ctx.fillStyle = '#b6c1ce'; ctx.font = '500 28px "IBM Plex Mono", ui-monospace, monospace'; ctx.fillText('/ 1000', c + R * 0.38, c + R * 0.4);
  ctx.textAlign = 'left'; ctx.fillStyle = '#f1f4f8'; ctx.font = '700 38px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillText(m.name, c - R * 0.78, c - R * 0.34);
  ctx.fillStyle = '#b6c1ce'; ctx.font = '500 26px "IBM Plex Sans", system-ui, sans-serif';
  ctx.fillText(`${m.body} · ${m.label}${m.achieved ? ' · objective achieved' : ' · objective incomplete'}`, c - R * 0.78, c - R * 0.26);
  ctx.textAlign = 'center'; ctx.font = '500 21px "IBM Plex Mono", ui-monospace, monospace'; ctx.fillStyle = '#8d9bab';
  ctx.fillText('Educational game · not a NASA product', c, c + R * 0.9);
  return m;
}

/** Create a canvas through `create(w, h)` (default: the document), draw the patch and resolve a PNG Blob (or null). */
export function renderPatchBlob(model, create = (w, h) => { const el = globalThis.document?.createElement('canvas'); if (el) { el.width = w; el.height = h; } return el; }) {
  return new Promise(resolve => {
    try {
      const canvas = create(PATCH_SIZE, PATCH_SIZE), ctx = canvas?.getContext?.('2d');
      if (!ctx) { resolve(null); return; }
      drawPatch(ctx, model, PATCH_SIZE);
      if (typeof canvas.toBlob === 'function') canvas.toBlob(b => resolve(b || null), 'image/png');
      else resolve(null);
    } catch { resolve(null); }
  });
}
