// Launch vehicle for the cinematic (procedural, fictional): rideshare is slim, dedicated is wider. The driver in Scene.jsx
// moves it; this file only builds it and animates the flame.
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import {AdditiveBlending, DoubleSide} from 'three';

export function Rocket({spec, ctx, group}) {
  const r = spec.parts.launch.stack, flame = useRef(), core = useRef(), flash = useRef();
  useFrame(() => {
    const L = ctx.A.launchP, on = L != null && L > 0.1 && !ctx.reduced.current, t = ctx.A.t;
    if (flame.current) { flame.current.visible = on; const f = 0.85 + Math.sin(t * 40) * 0.12 + Math.sin(t * 23) * 0.06; flame.current.scale.set(1, f * (0.7 + Math.min(1, (L ?? 0) * 3) * 0.6), 1); }
    if (core.current) core.current.visible = on;
    if (flash.current) { const d = L == null ? 9 : Math.abs(L - 0.62); flash.current.visible = !ctx.reduced.current && d < 0.04; flash.current.scale.setScalar(0.4 + (0.04 - d) * 40); }
  });
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0, 0]}><cylinderGeometry args={[r, r, 3.0, 28]} /><meshStandardMaterial color="#e6ebef" metalness={0.35} roughness={0.4} /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[r * 1.005, r * 1.005, 0.22, 28]} /><meshStandardMaterial color="#1d2a3a" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0, 1.95, 0]}><coneGeometry args={[r, 0.9, 28]} /><meshStandardMaterial color="#f1f4f6" metalness={0.3} roughness={0.35} /></mesh>
      <mesh position={[0, -1.6, 0]}><cylinderGeometry args={[r * 0.55, r * 0.85, 0.32, 20]} /><meshStandardMaterial color="#4a5560" metalness={0.8} roughness={0.35} /></mesh>
      {[0, 1, 2, 3].map(i => { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; return <mesh key={i} position={[Math.cos(a) * (r + 0.08), -1.2, Math.sin(a) * (r + 0.08)]} rotation={[0, -a, 0]}><boxGeometry args={[0.2, 0.7, 0.04]} /><meshStandardMaterial color="#8d99a3" metalness={0.5} roughness={0.5} /></mesh>; })}
      <mesh ref={flame} position={[0, -2.45, 0]} rotation={[Math.PI, 0, 0]} visible={false}><coneGeometry args={[r * 0.62, 1.7, 16, 1, true]} /><meshBasicMaterial color="#ffae4d" transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} /></mesh>
      <mesh ref={core} position={[0, -2.0, 0]} visible={false}><sphereGeometry args={[r * 0.42, 14, 10]} /><meshBasicMaterial color="#fff2c8" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} /></mesh>
      <mesh ref={flash} position={[0, 1.2, 0]} visible={false}><sphereGeometry args={[1, 16, 12]} /><meshBasicMaterial color="#cfeaff" transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} /></mesh>
    </group>
  );
}
