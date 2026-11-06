// Procedural spacecraft (three.js side). Every catalog variant has geometry; materials are lit (standard PBR) and are
// registered per part kind so the scene can pulse, dim, x-ray or flash them without re-rendering React.
import {createContext, useCallback, useContext, useMemo} from 'react';
import {DoubleSide, AdditiveBlending} from 'three';
import {KINDS, SOCKETS} from './parts.js';
import {solarTexture} from './textures.js';

export const CraftCtx = createContext(null);

/** Registry the animator uses: materials by kind, group refs by kind, special nodes (wings, dish, beacon, plume). */
export function createCraftApi() {
  const api = {
    mats: Object.fromEntries(KINDS.map(k => [k, new Set()])), groups: {}, sockets: {}, hits: {},
    wings: new Set(), dish: null, beacon: null, plume: null, root: null,
    addMat(kind, m) { m.userData.base = {color: m.color.clone(), emissive: m.emissive.clone(), emissiveIntensity: m.emissiveIntensity, opacity: m.opacity, transparent: m.transparent}; api.mats[kind]?.add(m); },
    removeMat(kind, m) { api.mats[kind]?.delete(m); },
    ref: key => node => { if (node) api.groups[key] = node; else delete api.groups[key]; }
  };
  return api;
}

function Mat({k, c, m = 0.55, r = 0.45, e = '#000000', ei = 1, map, side, transparent, opacity}) {
  const api = useContext(CraftCtx);
  const ref = useCallback(node => { if (!node) return undefined; api.addMat(k, node); return () => api.removeMat(k, node); }, [api, k]);
  return <meshStandardMaterial ref={ref} color={c} metalness={m} roughness={r} emissive={e} emissiveIntensity={ei} map={map} side={side} transparent={transparent} opacity={opacity} />;
}
const Box = ({p = [0, 0, 0], s, rot, ...mat}) => <mesh position={p} rotation={rot}><boxGeometry args={s} /><Mat {...mat} /></mesh>;
const Cyl = ({p = [0, 0, 0], a, rot, seg = 24, ...mat}) => <mesh position={p} rotation={rot}><cylinderGeometry args={[a[0], a[1], a[2], seg]} /><Mat {...mat} /></mesh>;

function Bus({spec, color}) {
  const b = spec.parts.bus, [w, h, d] = b.size;
  return (
    <group>
      <Box k="bus" s={[w, h, d]} c={color} m={b.foil ? 0.75 : 0.45} r={b.foil ? 0.32 : 0.5} />
      <Box k="bus" s={[w + 0.02, 0.04, d + 0.02]} p={[0, h / 2 - 0.02, 0]} c="#2b3744" m={0.3} r={0.6} />
      <Box k="bus" s={[w + 0.02, 0.04, d + 0.02]} p={[0, -h / 2 + 0.02, 0]} c="#2b3744" m={0.3} r={0.6} />
      <Cyl k="bus" a={[0.035, 0.035, 0.1]} p={[-w / 2 + 0.08, h / 2 + 0.04, -d / 2 + 0.08]} c="#1a222c" />
      <Box k="bus" s={[0.015, 0.2, 0.2]} p={[-w / 2 - 0.007, 0.05, 0]} c="#e8edf0" m={0.2} r={0.7} />
    </group>
  );
}

function Payload({spec}) {
  const p = spec.parts.payload;
  return (
    <group position={SOCKETS.payload.pos}>
      <Box k="payload" s={[0.3, 0.26, 0.16]} p={[0, 0, 0.04]} c={p.color} m={0.5} r={0.4} />
      <Cyl k="payload" a={[p.lens, p.lens, p.length]} p={[0, 0, 0.12 + p.length / 2]} rot={[Math.PI / 2, 0, 0]} c="#9fb4c8" m={0.7} r={0.3} />
      {p.baffle && <Cyl k="payload" a={[p.lens * 1.35, p.lens * 1.1, p.length * 0.55]} p={[0, 0, 0.12 + p.length * 0.9]} rot={[Math.PI / 2, 0, 0]} c="#243445" m={0.4} r={0.7} seg={20} />}
      <mesh position={[0, 0, 0.13 + p.length]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[p.lens * 0.82, 20]} /><Mat k="payload" c="#04101c" m={0.9} r={0.1} e="#2aa6c8" ei={0.35} /></mesh>
      {p.baffle && <Box k="payload" s={[0.22, 0.04, 0.2]} p={[0, 0.15, 0.02]} c="#dfe7ee" m={0.2} r={0.8} />}
    </group>
  );
}

function Wings({spec, api}) {
  const pw = spec.parts.power, span = spec.wingSpan, cellW = span / pw.cells, tex = useMemo(() => solarTexture(), []);
  return (
    <group>
      {[-1, 1].map(sign => (
        <group key={sign} position={[sign * 0.26, 0, 0]} ref={n => { if (n) api.wings.add(n); }}>
          <Box k="power" s={[0.12, 0.03, 0.03]} p={[sign * 0.06, 0, 0]} c="#c7d0d8" m={0.6} r={0.4} />
          {Array.from({length: pw.cells}, (_, i) => (
            <mesh key={i} position={[sign * (0.14 + cellW * (i + 0.5) + i * 0.012), 0, 0]}>
              <boxGeometry args={[cellW, 0.022, 0.5]} />
              <meshStandardMaterial ref={n => { if (!n) return undefined; n.map = tex; api.addMat('power', n); return () => api.removeMat('power', n); }} color="#ffffff" metalness={0.55} roughness={0.35} emissive="#000000" />
            </mesh>
          ))}
        </group>
      ))}
      <Box k="power" s={pw.battery} p={[0, -0.12 - pw.battery[1] / 2 + 0.08, -0.12]} c="#394a5a" m={0.4} r={0.55} />
    </group>
  );
}

function Propulsion({spec, api}) {
  const pr = spec.parts.propulsion;
  return (
    <group>
      <mesh position={[0, -0.47, 0]}><sphereGeometry args={[pr.tank, 20, 14]} /><Mat k="propulsion" c={pr.color} m={0.8} r={0.3} /></mesh>
      <Cyl k="propulsion" a={[0.05, pr.bell * 0.6, 0.26]} p={[0, -0.7, 0]} c="#59656f" m={0.7} r={0.35} />
      {pr.ion && <mesh position={[0, -0.84, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[pr.bell * 0.55, 20]} /><Mat k="propulsion" c="#0b1a2a" m={0.9} r={0.2} e="#5fd0ff" ei={0.9} /></mesh>}
      <mesh position={[0, -1.12, 0]} ref={n => { api.plume = n; }} visible={false}><coneGeometry args={[pr.bell * 0.6, 0.55, 14, 1, true]} /><meshBasicMaterial color="#ffb45a" transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} /></mesh>
    </group>
  );
}

function Comms({spec, api}) {
  const c = spec.parts.comms, y = SOCKETS.comms.pos[1];
  return (
    <group>
      <Cyl k="comms" a={[0.018, 0.018, c.mast]} p={[0, y + c.mast / 2, 0]} c="#cdd6dd" m={0.6} r={0.4} seg={10} />
      <group position={[0, y + c.mast, 0]} ref={n => { api.dish = n; }}>
        <mesh position={[0, 0.02 + c.dish * 0.35, 0]} rotation={[Math.PI, 0, 0]}><sphereGeometry args={[c.dish * 1.6, 28, 10, 0, Math.PI * 2, 0, 0.675]} /><Mat k="comms" c="#dfe6eb" m={0.45} r={0.38} side={DoubleSide} /></mesh>
        <Cyl k="comms" a={[0.012, 0.012, c.dish * 0.7]} p={[0, c.dish * 0.35, 0]} c="#aebbc6" seg={8} />
        {c.feed && <mesh position={[0, c.dish * 0.72, 0]}><sphereGeometry args={[0.04, 12, 8]} /><Mat k="comms" c="#f2c87a" m={0.7} r={0.3} /></mesh>}
      </group>
    </group>
  );
}

function Storage({spec}) {
  const s = spec.parts.storage;
  return (
    <group position={SOCKETS.storage.pos}>
      {Array.from({length: s.boxes}, (_, i) => <Box key={i} k="storage" s={s.size} p={[0, -0.02 - i * (s.size[1] + 0.03), -s.size[2] / 2]} c="#3a5870" m={0.35} r={0.55} />)}
      {Array.from({length: s.boxes}, (_, i) => <Box key={'l' + i} k="storage" s={[0.04, 0.03, 0.01]} p={[s.size[0] / 2 - 0.05, -0.02 - i * (s.size[1] + 0.03), -s.size[2] - 0.006]} c="#0b1a2a" e="#7cdbf3" ei={0.9} />)}
    </group>
  );
}

function Launch({spec, fairing}) {
  const l = spec.parts.launch;
  return (
    <group position={SOCKETS.launch.pos}>
      <Cyl k="launch" a={[l.ring * 0.78, l.ring, 0.14]} c="#46535f" m={0.7} r={0.4} seg={32} />
      <Cyl k="launch" a={[l.ring * 0.5, l.ring * 0.78, 0.12]} p={[0, 0.13, 0]} c="#5c6a76" m={0.6} r={0.45} seg={32} />
      {Array.from({length: l.clamps}, (_, i) => { const a = (i / l.clamps) * Math.PI * 2 + Math.PI / 4; return <Box key={i} k="launch" s={[0.07, 0.2, 0.07]} p={[Math.cos(a) * l.ring * 0.92, 0.1, Math.sin(a) * l.ring * 0.92]} c="#d0d8de" m={0.5} r={0.4} />; })}
      {fairing && <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[l.fairing, l.fairing, 2.6, 28, 1, true]} /><meshBasicMaterial color="#7cdbf3" wireframe transparent opacity={0.22} /></mesh>}
    </group>
  );
}

function Socket({kind, api, visible}) {
  const pos = SOCKETS[kind].pos, rot = kind === 'power' ? [0, Math.PI / 2, 0] : kind === 'storage' || kind === 'payload' ? [0, 0, 0] : [Math.PI / 2, 0, 0];
  return (
    <group position={pos} visible={visible}>
      <mesh ref={n => { if (n) api.sockets[kind] = n; else delete api.sockets[kind]; }} rotation={rot}>
        <torusGeometry args={[kind === 'launch' ? 0.34 : 0.13, 0.012, 8, 32]} />
        <meshBasicMaterial color="#7cdbf3" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** The whole craft. Interaction handlers are attached per part group (bubbling from any child mesh). */
export function Craft({spec, api, hangar, fairing, onPick, onHover}) {
  const handlers = kind => ({
    onClick: e => { if (!hangar || e.delta > 6) return; e.stopPropagation(); onPick?.(kind); },
    onPointerOver: e => { if (!hangar) return; e.stopPropagation(); document.body.style.cursor = 'pointer'; onHover?.(kind); },
    onPointerOut: () => { document.body.style.cursor = ''; onHover?.(null); }
  });
  const hit = kind => ( // generous invisible target for small parts and touch
    <mesh position={SOCKETS[kind].pos} {...handlers(kind)}><sphereGeometry args={[kind === 'launch' ? 0.45 : 0.2, 8, 6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
  );
  return (
    <CraftCtx.Provider value={api}>
      <group ref={n => { api.root = n; }}>
        <group ref={api.ref('bus')} {...handlers('bus')}><Bus spec={spec} color={spec.busColor} /><mesh position={[0, 0.5, 0]} ref={n => { api.beacon = n; }}><sphereGeometry args={[0.04, 10, 8]} /><meshStandardMaterial color="#ff5a5a" emissive="#ff3030" emissiveIntensity={1} /></mesh></group>
        <group ref={api.ref('payload')} {...handlers('payload')}><Payload spec={spec} />{hit('payload')}</group>
        <group ref={api.ref('power')} {...handlers('power')}><Wings spec={spec} api={api} /></group>
        <group ref={api.ref('propulsion')} {...handlers('propulsion')}><Propulsion spec={spec} api={api} />{hit('propulsion')}</group>
        <group ref={api.ref('comms')} {...handlers('comms')}><Comms spec={spec} api={api} /></group>
        <group ref={api.ref('storage')} {...handlers('storage')}><Storage spec={spec} />{hit('storage')}</group>
        <group ref={api.ref('launch')} {...handlers('launch')}><Launch spec={spec} fairing={fairing} />{hit('launch')}</group>
        {KINDS.map(k => <Socket key={k} kind={k} api={api} visible={hangar} />)}
      </group>
    </CraftCtx.Provider>
  );
}
