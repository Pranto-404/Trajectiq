// Texture loading and creation (three.js side). NASA maps are bundled files resolved by Vite (never fetched from a
// remote host: CSP is connect-src 'self'). Everything created here is tracked and released by disposeTextures().
import {CanvasTexture, SRGBColorSpace, TextureLoader, RepeatWrapping, LinearMipmapLinearFilter} from 'three';
import {proceduralPlan} from './bodyVisuals.js';

const URLS = import.meta.glob('../../assets/textures/*.jpg', {query: '?url', import: 'default'});
const urlLoader = name => URLS[`../../assets/textures/${name}.jpg`];

const owned = new Set(), cache = new Map();
export const track = t => { owned.add(t); return t; };
export function disposeTextures() { for (const t of owned) t.dispose(); owned.clear(); cache.clear(); solar = null; foil = null; }
export const ownedTextureCount = () => owned.size;
export const hasBundledTexture = name => typeof urlLoader(name) === 'function';

/** NASA map by name (earth, moon, mars, venus). Resolves null when the file is absent or fails: callers shade procedurally. */
export function loadMapTexture(name) {
  if (cache.has(name)) return cache.get(name);
  const getUrl = urlLoader(name);
  const p = getUrl ? getUrl().then(url => new Promise(resolve => {
    new TextureLoader().load(url, tex => { tex.colorSpace = SRGBColorSpace; tex.anisotropy = 4; tex.minFilter = LinearMipmapLinearFilter; resolve(track(tex)); }, undefined, () => resolve(null));
  })).catch(() => null) : Promise.resolve(null);
  cache.set(name, p);
  return p;
}

const hexToRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (rgb, k) => `rgb(${rgb.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',')})`;

/** Procedural surface (craters, ice lineae) painted on a canvas from the deterministic plan. */
export function proceduralTexture(visual, w = 512, h = 256) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const base = hexToRgb(visual.color), accent = hexToRgb(visual.accent), plan = proceduralPlan(visual);
  ctx.fillStyle = shade(base, 1); ctx.fillRect(0, 0, w, h);
  // low-frequency blotches
  for (let i = 0; i < 46; i++) { const x = ((i * 97) % 100) / 100 * w, y = ((i * 53) % 100) / 100 * h, r = 18 + (i % 7) * 12; const g = ctx.createRadialGradient(x, y, 0, x, y, r); const k = 1 + (i % 2 ? 1 : -1) * plan.contrast * 0.6; g.addColorStop(0, shade(base, k)); g.addColorStop(1, shade(base, 1).replace('rgb', 'rgba').replace(')', ',0)')); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  if (plan.kind === 'ice') { ctx.strokeStyle = shade(accent, 0.8); ctx.globalAlpha = 0.5; for (const l of plan.lines) { ctx.lineWidth = Math.max(0.6, l.w * w); ctx.beginPath(); ctx.moveTo(l.x * w, l.y * h); ctx.quadraticCurveTo((l.x + l.dx / 2) * w, (l.y + l.dy * 1.4) * h, (l.x + l.dx) * w, (l.y + l.dy) * h); ctx.stroke(); } ctx.globalAlpha = 1; }
  for (const c of plan.craters) {
    const x = c.x * w, y = c.y * h, r = Math.max(1.2, c.r * w);
    ctx.fillStyle = shade(base, 1 - plan.contrast * 0.9); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = shade(accent, 0.75 + c.rim * 0.4); ctx.lineWidth = Math.max(0.6, r * 0.18); ctx.beginPath(); ctx.arc(x - r * 0.12, y - r * 0.12, r * 0.95, 0.5, 4.2); ctx.stroke();
  }
  ctx.fillStyle = shade(accent, 1.25); for (const b of plan.bright) { ctx.beginPath(); ctx.arc(b.x * w, b.y * h, Math.max(1.5, b.r * w), 0, 6.2832); ctx.fill(); }
  const tex = new CanvasTexture(canvas); tex.colorSpace = SRGBColorSpace; tex.anisotropy = 2;
  return track(tex);
}

let solar = null, foil = null;
/** Original thermal-blanket seams: one small shared texture, no added geometry or downloads. */
export function foilTexture() {
  if (foil) return foil;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dedbd0'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 24; i++) {
    const x = (i * 47) % 128, y = (i * 71) % 128;
    ctx.strokeStyle = i % 2 ? '#f6f2df' : '#aaa99f'; ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo((x + 37) % 128, (y + 53) % 128); ctx.stroke();
  }
  ctx.strokeStyle = '#7c858b'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, 120, 120);
  foil = new CanvasTexture(canvas); foil.colorSpace = SRGBColorSpace;
  return track(foil);
}
/** Solar-cell grid texture (shared). */
export function solarTexture() {
  if (solar) return solar;
  const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#16335c'; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#1d4a85'; ctx.fillRect(2, 2, 60, 60);
  ctx.strokeStyle = '#7fa8d6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(32, 64); ctx.moveTo(0, 32); ctx.lineTo(64, 32); ctx.stroke();
  solar = new CanvasTexture(canvas); solar.wrapS = solar.wrapT = RepeatWrapping; solar.colorSpace = SRGBColorSpace; solar.anisotropy = 4;
  return track(solar);
}
