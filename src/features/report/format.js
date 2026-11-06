// Small pure helpers shared by the report and sheets packages. Everything here treats its input as untrusted text.

/** en-US number with fixed decimals (tabular digits come from the global font settings). */
export const fmt = (v, n = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x.toLocaleString('en-US', {maximumFractionDigits: n, minimumFractionDigits: n}) : '–';
};

/** Signed number: +12.5 / −3 / 0. */
export const signed = (v, n = 0) => {
  const x = Number(v);
  if (!Number.isFinite(x)) return '–';
  return `${x > 0 ? '+' : x < 0 ? '−' : ''}${fmt(Math.abs(x), n)}`;
};

/** Strip control characters and cap the length of a piece of user-influenced text (it is still rendered as text by React). */
export const clean = (s, max = 60) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);

/** Only plain https links are ever rendered as links; anything else from data is shown as text. */
export const safeUrl = u => (typeof u === 'string' && /^https:\/\/[^\s"'<>\\]+$/i.test(u) ? u : null);

/** The arrow used in direction chips (kept in step with the engine's chips: -3..3). */
export const ARROW = v => (v >= 3 ? '↑↑↑' : v === 2 ? '↑↑' : v === 1 ? '↑' : v === 0 ? '≈' : v === -1 ? '↓' : v === -2 ? '↓↓' : '↓↓↓');

/** Finite number or the default, for values read from persisted runs. */
export const finite = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
