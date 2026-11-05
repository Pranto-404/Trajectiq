// Shared-element hand-off from the chosen scenario card (board) to the hangar title. The two screens are never mounted at
// the same time (the shell cross-fades with AnimatePresence mode="wait"), so a layoutId cannot connect them. Instead the
// board records the title's screen rectangle just before leaving and the hangar title animates from it on mount (FLIP).
let pending = null;

/** Remember where an element is on screen. Call right before leaving the board. */
export function captureFlip(el) {
  if (!el?.getBoundingClientRect) { pending = null; return; }
  const r = el.getBoundingClientRect();
  pending = r.width > 0 ? {x: r.left, y: r.top, width: r.width, height: r.height, at: Date.now()} : null;
}

/** The recorded rectangle if it is fresh (the hand-off must start within 2.5 s), else null. Consumed once. */
export function takeFlip(maxAgeMs = 2500) {
  const p = pending; pending = null;
  return p && Date.now() - p.at < maxAgeMs ? p : null;
}

/** Forget a pending hand-off (tests, and navigation that is not the accept path). */
export const clearFlip = () => { pending = null; };

/** Transform that moves an element currently at `to` so that it appears at `from`. */
export function flipDelta(from, to) {
  const sx = to.width > 0 ? Math.min(2, Math.max(0.5, from.width / to.width)) : 1;
  return {x: from.x - to.x, y: from.y - to.y, scale: sx};
}
