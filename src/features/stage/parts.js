// Procedural spacecraft description for every catalog variant. Pure data derived from a design.
// Geometry is schematic and fictional; the engine owns all engineering state (as in the legacy renderer).
// Craft frame: +y up (antenna side), +z forward (instrument face, nadir in orbit), +x right (solar wings along x).

export const KINDS = Object.freeze(['bus', 'payload', 'power', 'propulsion', 'comms', 'storage', 'launch']);

/** Socket (attachment) points, exploded-view offsets and the label of each part group. */
export const SOCKETS = Object.freeze({
  bus:        {pos: [0, 0, 0],       explode: [0, 0, 0],      label: 'Spacecraft bus'},
  payload:    {pos: [0, 0.05, 0.28], explode: [0, 0.1, 0.9], label: 'Science payload'},
  power:      {pos: [0.26, 0, 0],    explode: [0.7, 0, 0],   label: 'Power system'},
  propulsion: {pos: [0, -0.37, 0],   explode: [0, -0.8, 0],   label: 'Propulsion'},
  comms:      {pos: [0, 0.37, 0],    explode: [0, 0.9, 0],    label: 'Communications'},
  storage:    {pos: [0, -0.1, -0.27],explode: [0, -0.1, -0.9], label: 'Avionics and storage'},
  launch:     {pos: [0, -0.95, 0],   explode: [0, -1.5, 0],   label: 'Launch provider'}
});

const LIVERY = {cyan: '#3dc7db', coral: '#e66b52', lime: '#b8e068', white: '#d9e0e6'};
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Variant tables. The first entry of each table is the fallback for unknown ids.
export const VARIANTS = Object.freeze({
  bus: {
    precision: {size: [0.52, 0.72, 0.5], color: '#d8b65f', foil: true},
    compact:   {size: [0.44, 0.6, 0.42], color: '#a1b8c7', foil: false}
  },
  payload: {
    survey: {lens: 0.1, length: 0.2, baffle: false, color: '#7f97b0'},
    hires:  {lens: 0.17, length: 0.36, baffle: true, color: '#6a86a6'}
  },
  power: {
    balanced:  {span: 1.8,  cells: 3, battery: [0.18, 0.2, 0.18]},
    compact:   {span: 1.45, cells: 2, battery: [0.14, 0.14, 0.14]},
    endurance: {span: 2.1,  cells: 4, battery: [0.22, 0.26, 0.22]}
  },
  propulsion: {
    standard:  {nozzle: 0.19, bell: 0.24, tank: 0.16, color: '#8c9aa4'},
    efficient: {nozzle: 0.12, bell: 0.2,  tank: 0.22, color: '#7e8f9c', ion: true}
  },
  comms: {
    medium:   {dish: 0.4,  mast: 0.22, feed: false},
    compact:  {dish: 0.24, mast: 0.14, feed: false},
    highgain: {dish: 0.62, mast: 0.3,  feed: true}
  },
  storage: {
    standard: {boxes: 1, size: [0.3, 0.2, 0.12]},
    medium:   {boxes: 1, size: [0.4, 0.26, 0.14]},
    expanded: {boxes: 2, size: [0.4, 0.22, 0.14]}
  },
  launch: {
    rideshare: {ring: 0.5, fairing: 0.62, clamps: 0, stack: 0.36},
    dedicated: {ring: 0.7, fairing: 0.86, clamps: 4, stack: 0.5}
  }
});

/** Spec for one part. Unknown kind returns null; unknown id returns the fallback variant with known:false. */
export function partSpec(kind, id) {
  if (!own(VARIANTS, kind)) return null;
  const table = VARIANTS[kind], ok = typeof id === 'string' && own(table, id), key = ok ? id : Object.keys(table)[0];
  return {kind, id: key, known: ok, ...table[key]};
}

/** Whole-craft spec from a design. Always complete; hostile or partial designs fall back per part. */
export function craftSpec(design = {}) {
  const parts = {};
  for (const k of KINDS) parts[k] = partSpec(k, design?.[k]);
  const scale = Number.isFinite(design?.arrayScale) && design.arrayScale > 0 ? design.arrayScale : 1;
  const wingSpan = parts.power.span * Math.sqrt(Math.min(5, Math.max(0.5, scale)));
  const livery = own(LIVERY, design?.livery) ? LIVERY[design.livery] : null;
  return {parts, wingSpan, busColor: livery || parts.bus.color, livery: livery ? design.livery : null};
}

/** One-sentence description for assistive technology. */
export function describeCraft(design, bodyName, phase) {
  const c = craftSpec(design), bits = KINDS.filter(k => k !== 'launch').map(k => `${SOCKETS[k].label.toLowerCase()}: ${c.parts[k].id}`);
  return `Schematic 3D spacecraft (${bits.join(', ')}; launch: ${c.parts.launch.id}) at ${bodyName || 'the destination'}, ${phase || 'hangar'} view. Not a flight trajectory.`;
}
