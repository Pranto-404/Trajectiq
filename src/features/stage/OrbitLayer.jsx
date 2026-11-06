// Orbit ring, eclipse arc and umbra cone, spacecraft trail, link beam with pulses (three.js side).
// The ring is schematic (altitude spacing is exaggerated); phases and the eclipse arc come from the engine's numbers.
import {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, Line, LineBasicMaterial, Mesh, MeshBasicMaterial, Quaternion, TubeGeometry, Vector3} from 'three';
import {orbitPoint, orbitPointAngle} from './orbit.js';

const Y = new Vector3(0, 1, 0), TRAIL = 28;

function useLine(points, color, opacity) {
  const line = useMemo(() => {
    const geo = new BufferGeometry(); geo.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
    return new Line(geo, new LineBasicMaterial({color, transparent: true, opacity}));
  }, [points, color, opacity]);
  useEffect(() => () => { line.geometry.dispose(); line.material.dispose(); }, [line]);
  return line;
}

export function OrbitLayer({ctx, orbit}) {
  const group = useRef();
  const {rVis, geom, ecl} = orbit;
  const ringPts = useMemo(() => { const out = []; for (let i = 0; i <= 120; i++) out.push(...orbitPoint(i / 120 * geom.period, geom.period, rVis, geom.inclination)); return out; }, [rVis, geom.period, geom.inclination]);
  const arcPts = useMemo(() => { const out = []; const n = 32; for (let i = 0; i <= n; i++) out.push(...orbitPointAngle(ecl.centerAngle - ecl.halfAngle + (2 * ecl.halfAngle * i) / n, rVis, geom.inclination)); return out; }, [ecl, rVis, geom.inclination]);
  const ring = useLine(ringPts, '#3d7f9c', 0.7);
  // the eclipse arc is a thin tube so it stays visible at any resolution
  const arc = useMemo(() => { const pts = []; for (let i = 0; i < arcPts.length; i += 3) pts.push(new Vector3(arcPts[i], arcPts[i + 1], arcPts[i + 2])); return new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.03, 5, false), new MeshBasicMaterial({color: '#ffbc6e', transparent: true, opacity: 0.95})); }, [arcPts]);
  useEffect(() => () => { arc.geometry.dispose(); arc.material.dispose(); }, [arc]);
  const trail = useMemo(() => { const geo = new BufferGeometry(); geo.setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3)); return new Line(geo, new LineBasicMaterial({color: '#ccff6b', transparent: true, opacity: 0.8})); }, []);
  useEffect(() => () => { trail.geometry.dispose(); trail.material.dispose(); }, [trail]);

  const cone = useRef(), coneMat = useRef();
  const q = useMemo(() => new Quaternion(), []), tmp = useMemo(() => new Vector3(), []), anti = useMemo(() => new Vector3(), []);
  const CONE_LEN = 9;
  useEffect(() => {
    anti.set(-ecl.sunDir[0], -ecl.sunDir[1], -ecl.sunDir[2]);
    if (cone.current) { cone.current.quaternion.copy(q.setFromUnitVectors(Y, anti)); cone.current.position.copy(anti).multiplyScalar(CONE_LEN / 2); }
  }, [ecl, anti, q]);

  const p = useMemo(() => [0, 0, 0], []);
  useFrame(() => {
    const A = ctx.A, run = ctx.p.current.run, fade = A.orbitFade, red = ctx.reduced.current;
    if (group.current) group.current.visible = fade > 0.01;
    ring.material.opacity = 0.7 * fade; arc.material.opacity = 0.95 * fade * (run?.eclipse && !red ? 0.6 + 0.4 * Math.sin(A.t * 6) : 0.9);
    trail.material.opacity = 0.8 * fade;
    if (coneMat.current) coneMat.current.opacity = (run?.eclipse ? 0.24 : 0.09) * fade;
    // trail: recent points behind the craft
    const pos = trail.geometry.attributes.position, minute = A.minute;
    for (let i = 0; i < TRAIL; i++) { orbitPoint(Math.max(0, minute - (TRAIL - 1 - i) * geom.period / 110), geom.period, rVis, geom.inclination, p); pos.setXYZ(i, p[0], p[1], p[2]); }
    pos.needsUpdate = true;
  });
  return (
    <group ref={group} visible={false}>
      <primitive object={ring} /><primitive object={arc} /><primitive object={trail} />
      <mesh ref={cone}><cylinderGeometry args={[ecl.shadowRadius, ecl.shadowRadius, CONE_LEN, 28, 1, true]} /><meshBasicMaterial ref={coneMat} color="#26407a" transparent opacity={0.09} depthWrite={false} side={DoubleSide} /></mesh>
    </group>
  );
}

/** The beam lives in world space (it ends at Earth), outside the orbit group. */
export function LinkBeam({ctx, orbit}) {
  const beam = useMemo(() => { const geo = new BufferGeometry(); geo.setAttribute('position', new BufferAttribute(new Float32Array(6), 3)); return new Line(geo, new LineBasicMaterial({color: '#7cdbf3', transparent: true, opacity: 0.9})); }, []);
  const pulses = useRef([]);
  useEffect(() => () => { beam.geometry.dispose(); beam.material.dispose(); }, [beam]);
  useFrame(() => {
    const A = ctx.A, run = ctx.p.current.run, red = ctx.reduced.current, on = !!run?.contact && A.orbitFade > 0.5;
    beam.visible = on; pulses.current.forEach(m => { if (m) m.visible = on && !red; });
    if (!on) return;
    const c = A.craftWorld, e = A.earthTarget, bp = beam.geometry.attributes.position;
    bp.setXYZ(0, c.x, c.y, c.z); bp.setXYZ(1, e.x, e.y, e.z); bp.needsUpdate = true;
    beam.material.opacity = red ? 0.8 : 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(A.t * 5));
    const down = run?.history?.at?.(-1)?.mode === 'downlink';
    pulses.current.forEach((m, i) => { if (!m) return; const u = (A.t * (down ? 0.9 : 0.35) + i / 3) % 1; m.position.set(c.x + (e.x - c.x) * u, c.y + (e.y - c.y) * u, c.z + (e.z - c.z) * u); m.scale.setScalar(down ? 1 : 0.6); });
  });
  return (
    <group>
      <primitive object={beam} />
      {[0, 1, 2].map(i => <mesh key={i} ref={n => { pulses.current[i] = n; }} visible={false}><sphereGeometry args={[0.07, 10, 8]} /><meshBasicMaterial color="#9fe8ff" /></mesh>)}
    </group>
  );
}
