import {createGame} from '@/store/createGame.js';

/** An isolated store over an in-memory storage. `saved` may be an object (JSON-encoded) or a raw string. */
export function makeStore(saved, extra = {}) {
  const data = new Map();
  if (saved !== undefined) data.set('trajectiq-v1', typeof saved === 'string' ? saved : JSON.stringify(saved));
  const downloads = [], copies = [];
  let n = 0;
  const intervals = new Map(), timeouts = new Map();
  const timers = {
    setInterval: (fn, ms) => { intervals.set(++n, {fn, ms}); return n; }, clearInterval: id => intervals.delete(id),
    setTimeout: (fn, ms) => { timeouts.set(++n, {fn, ms}); return n; }, clearTimeout: id => timeouts.delete(id)
  };
  const storage = {getItem: k => data.has(k) ? data.get(k) : null, setItem: (k, v) => { data.set(k, v); }};
  const store = createGame({storage, timers, matchMedia: () => ({matches: false}), uuid: (() => { let i = 0; return () => `run-${++i}`; })(), now: () => 1_700_000_000_000,
    document: () => null, location: () => ({hash: '', pathname: '/', search: '', origin: 'http://test'}), history: () => ({replaceState() {}}),
    io: {download: (d, t, name) => downloads.push({data: d, type: t, name}), copy: async text => { copies.push(text); return true; }, print() {}}, ...extra});
  const a = store.getState().actions;
  return {
    store, a, get: () => store.getState(), data, downloads, copies, intervals, timeouts,
    stored: () => JSON.parse(data.get('trajectiq-v1')), raw: () => data.get('trajectiq-v1'),
    tickTimer: () => { const [, t] = [...intervals.entries()][0] || []; t?.fn(); },
    nextTimeout: () => { const [id, t] = timeouts.entries().next().value || []; if (t) { timeouts.delete(id); t.fn(); } }
  };
}

/** Fly with the autopilot that runToEnd uses (default policy), through the store's own actions. */
export function flyThrough(h, {policy = {propulsion: 'nominal', eclipse: 'continue', storage: 'continue', link: 'wait', weather: 'ride'}} = {}) {
  for (let i = 0; i < 200 && !h.get().run.done; i++) {
    const run = h.get().run;
    if (run.crisis) {
      const want = policy[run.crisis.id];
      const opt = run.crisis.actions.find(x => x.id === want && !x.disabled) || run.crisis.actions.find(x => !x.disabled);
      h.a.resolve(opt.id);
    } else h.a.fast();
  }
  return h.get().run;
}
