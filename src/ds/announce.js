// Framework-free announcement bus behind <LiveRegion/> and useAnnounce(). The store imports this module too, so
// telemetry thresholds and installs reach screen readers without the store depending on React.
const listeners = new Set();
let seq = 0;

/** Queue a polite (default) or assertive message for assistive technology. */
export function announce(text, {assertive = false} = {}) {
  if (!text) return;
  const message = {id: ++seq, text: String(text), assertive};
  for (const fn of [...listeners]) fn(message);
}

export function subscribeAnnouncements(fn) { listeners.add(fn); return () => listeners.delete(fn); }
