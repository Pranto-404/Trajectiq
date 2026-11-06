// Tiny external store that carries the latest Stage3D props into the persistent scene (a separate React root).
export function createPropsStore(initial = {}) {
  let state = initial; const subs = new Set();
  return {
    get: () => state,
    set(next) { state = next; for (const f of subs) f(); },
    subscribe(f) { subs.add(f); return () => subs.delete(f); },
    clear() { subs.clear(); }
  };
}
