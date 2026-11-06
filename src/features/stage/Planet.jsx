// Destination body, Earth backdrop, atmosphere glow, Sun marker, direction arrows and the starfield (three.js side).
import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector3} from 'three';
import {loadMapTexture, proceduralTexture} from './textures.js';
import {rng} from './bodyVisuals.js';

const ATM_VERT = `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const ATM_FRAG = `uniform vec3 uColor; uniform float uStrength; uniform vec3 uSun; varying vec3 vN;
void main(){ float rim = pow(clamp(0.78 - dot(normalize(vN), vec3(0.0,0.0,1.0)), 0.0, 1.0), 3.0); float lit = clamp(dot(normalize(vN), normalize(uSun)) * 0.8 + 0.5, 0.12, 1.0); gl_FragColor = vec4(uColor, clamp(rim * uStrength * lit, 0.0, 1.0)); }`;

/** A sphere with a NASA map (when bundled and loaded) or a procedural surface, plus atmosphere and haze. Unit radius: the parent scales it. */
export function Planet({visual, segments = 48, ctx, group}) {
  const [map, setMap] = useState(null), invalidate = useThree(s => s.invalidate);
  const proc = useMemo(() => (visual.texture ? null : proceduralTexture(visual)), [visual]);
  useEffect(() => {
    let live = true; setMap(null);
    if (visual.texture) loadMapTexture(visual.texture).then(t => { if (!live) return; setMap(t || proceduralTexture(visual)); invalidate(); });
    return () => { live = false; };
  }, [visual, invalidate]);
  const texture = map || proc, spin = useRef(), haze = useRef(), atm = useRef();
  const atmMat = useMemo(() => (visual.atmosphere ? new ShaderMaterial({vertexShader: ATM_VERT, fragmentShader: ATM_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, side: BackSide,
    uniforms: {uColor: {value: new Color(visual.atmosphere.color)}, uStrength: {value: visual.atmosphere.strength}, uSun: {value: new Vector3(0.5, 0.6, 0.8)}}}) : null), [visual]);
  useEffect(() => () => atmMat?.dispose(), [atmMat]);
  const sun = useRef(new Vector3());
  useFrame((state, dt) => {
    if (spin.current && !ctx.reduced.current) spin.current.rotation.y += visual.spin * dt;
    if (haze.current && !ctx.reduced.current) haze.current.rotation.y += visual.spin * 1.6 * dt;
    if (atmMat) { sun.current.copy(ctx.A.sunDir).transformDirection(state.camera.matrixWorldInverse); atmMat.uniforms.uSun.value.copy(sun.current); }
  });
  return (
    <group ref={group}>
      <mesh ref={spin}>
        <sphereGeometry args={[1, segments, Math.round(segments * 0.75)]} />
        <meshStandardMaterial key={texture ? 'map' : 'flat'} map={texture || null} color={texture ? '#ffffff' : visual.color} roughness={1} metalness={0} />
      </mesh>
      {visual.haze && <mesh ref={haze}><sphereGeometry args={[1.018, Math.round(segments * 0.75), 24]} /><meshStandardMaterial color={visual.haze.color} transparent opacity={visual.haze.opacity} roughness={1} depthWrite={false} /></mesh>}
      {atmMat && <mesh ref={atm} scale={1 + visual.atmosphere.thickness * 2.2}><sphereGeometry args={[1, 40, 28]} /><primitive object={atmMat} attach="material" /></mesh>}
    </group>
  );
}

/** Sun marker: a bright disc with additive halos, placed far along the sun direction by the driver. */
export function SunMarker({group}) {
  return (
    <group ref={group}>
      <mesh><sphereGeometry args={[0.9, 20, 14]} /><meshBasicMaterial color="#fff1b8" /></mesh>
      <mesh><sphereGeometry args={[1.7, 20, 14]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} /></mesh>
      <mesh><sphereGeometry args={[2.8, 20, 14]} /><meshBasicMaterial color="#ffb347" transparent opacity={0.09} blending={AdditiveBlending} depthWrite={false} /></mesh>
    </group>
  );
}

/** Direction arrow along +z of its group (the driver orients it). */
export function Arrow({group, color, length = 0.9}) {
  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0, length / 2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, length, 8]} /><meshBasicMaterial color={color} transparent opacity={0.75} /></mesh>
      <mesh position={[0, 0, length + 0.09]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.05, 0.18, 12]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

const STAR_VERT = `attribute float aPhase; attribute float aSize; uniform float uTime; uniform float uPx; varying float vB;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; float tw = 0.65 + 0.35 * sin(uTime * 1.6 + aPhase); vB = tw; gl_PointSize = aSize * uPx * (0.8 + 0.5 * tw); }`;
const STAR_FRAG = `varying float vB; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; gl_FragColor = vec4(0.72, 0.82, 0.96, smoothstep(0.5, 0.1, r) * (0.35 + 0.65 * vB)); }`;

/** Starfield: ONE Points object with a twinkle shader. Twinkle time is frozen under reduced motion. */
export function Stars({count = 700, ctx}) {
  const stars = useMemo(() => {
    const r = rng(7), pos = new Float32Array(count * 3), phase = new Float32Array(count), size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = r() * 2 - 1, t = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), d = 70 + r() * 30;
      pos[i * 3] = s * Math.cos(t) * d; pos[i * 3 + 1] = u * d; pos[i * 3 + 2] = s * Math.sin(t) * d; phase[i] = r() * 6.28; size[i] = r() < 0.08 ? 3.2 : 1.4 + r() * 1.2;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3)); geo.setAttribute('aPhase', new BufferAttribute(phase, 1)); geo.setAttribute('aSize', new BufferAttribute(size, 1));
    const mat = new ShaderMaterial({vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, uniforms: {uTime: {value: 0}, uPx: {value: 1}}});
    const points = new Points(geo, mat); points.frustumCulled = false; points.renderOrder = -10;
    return {points, geo, mat};
  }, [count]);
  useEffect(() => () => { stars.geo.dispose(); stars.mat.dispose(); }, [stars]);
  useFrame(state => { stars.mat.uniforms.uPx.value = state.gl.getPixelRatio(); if (!ctx.reduced.current) stars.mat.uniforms.uTime.value = ctx.A.t; });
  return <primitive object={stars.points} />;
}
