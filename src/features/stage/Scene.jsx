// The scene graph and its per-frame driver (three.js side, inside <Canvas>).
// Frame order: driver (-2) -> camera (-1) -> craft animator, orbit layer, planets (0).
import {useEffect, useMemo, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {Object3D, Quaternion, Vector3} from 'three';
import {missionFor} from '@data/catalog.js';
import {bodyIdFor, bodyRadiusFor, bodyVisualFor} from './bodyVisuals.js';
import {sceneModeFor} from './camera.js';
import {GLIDE_LAMBDA, LAUNCH_MARKS, LAYOUTS, POSE_SETTLE_S, TRACK_LAMBDA, rocketY, transferPoint} from './layout.js';
import {damp, springStep} from './motionMath.js';
import {eclipseGeometry, orbitGeometry, orbitPoint, orbitRadiusVisual} from './orbit.js';
import {KINDS, SOCKETS, craftSpec} from './parts.js';
import {Craft, createCraftApi} from './Craft.jsx';
import {Arrow, Planet, Stars, SunMarker} from './Planet.jsx';
import {LinkBeam, OrbitLayer} from './OrbitLayer.jsx';
import {Rocket} from './Rocket.jsx';
import {CameraRig} from './CameraRig.jsx';
import {createParticles} from './particles.js';
import {TIER_SETTINGS} from './quality.js';
import {spring} from '../../motion/presets.js';

const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
const Yv = V(0, 1, 0);
const HIGHLIGHT_SEL = '#ccff6b', HIGHLIGHT_HOV = '#7cdbf3';

export function createAnim() {
  return {t: 0, mode: 'hangar', modeSince: -10, minute: 0, launchP: null, rocketY: 0, orbitFade: 0, transferK: 0, drift: 0,
    explode: 0, dim: 1, dimApplied: 1, xrayApplied: false, seats: {}, flash: {}, user: {yaw: 0, pitch: 0, zoom: 1},
    cam: {id: 'init', reset: 0, cur: null, from: null, to: null, t0: 0},
    sunDir: V(-0.7, 0.8, 1).normalize(), craftWorld: V(), earthTarget: V(8.5, -1.5, -7)};
}

export function Scene({props, ctx, tier}) {
  ctx.p.current = props; ctx.reduced.current = !!props.reduced;
  const settings = TIER_SETTINGS[tier] || TIER_SETTINGS.medium;
  const mission = useMemo(() => missionFor(props.design || {}), [props.design]);
  const visual = useMemo(() => bodyVisualFor(bodyIdFor(props.design, mission)), [props.design, mission]);
  const spec = useMemo(() => craftSpec(props.design), [props.design]);
  const bodyR = bodyRadiusFor(visual), isEarth = visual.id === 'earth';
  const orbit = useMemo(() => {
    const geom = orbitGeometry(mission, props.design), rVis = orbitRadiusVisual(geom.altitude, geom.radiusKm, bodyR);
    return {geom, rVis, ecl: eclipseGeometry({period: geom.period, eclipseMinutes: geom.eclipseMinutes, orbitRadius: rVis, inclination: geom.inclination, bodyRadiusKm: geom.radiusKm, altitude: geom.altitude})};
  }, [mission, props.design, bodyR]);
  ctx.orbit = orbit;
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => { ctx.runtime.wake = invalidate; invalidate(); return () => { if (ctx.runtime.wake === invalidate) ctx.runtime.wake = null; }; }, [ctx, invalidate]);
  useEffect(() => { invalidate(); });   // any prop change redraws (frameloop demand)

  const refs = ctx.refs, light = useRef(), fill = useRef();
  const plume = useMemo(() => createParticles(settings.plume, {color: '#ffb45a', size: 1.6}), [settings.plume]);
  const dust = useMemo(() => createParticles(settings.dust * 2, {color: '#cfd8e0', size: 0.9}), [settings.dust]);
  useEffect(() => () => { plume.dispose(); dust.dispose(); }, [plume, dust]);
  const tmp = useMemo(() => ({obj: new Object3D(), q: new Quaternion(), v: V(), v2: V(), arr: [0, 0, 0], bodyPos: V(), p3: V()}), []);

  // ---------------- driver ----------------
  useFrame((state, dtRaw) => {
    const A = ctx.A, rt = ctx.runtime, red = ctx.reduced.current, dt = Math.min(dtRaw, 0.1), now = state.clock.elapsedTime, p = ctx.p.current;
    A.t += dt; if (red) A.t = 0;
    const run = p.run;
    // launch cinematic
    const L = rt.launch; let lp = null;
    if (L.active) lp = red ? 0.3 : rt.stepLaunch(dt);
    A.launchP = L.active ? lp : null; A.dt = dt;
    A.rocketY = A.launchP != null ? rocketY(A.launchP) : -0.6;
    const baseMode = sceneModeFor(p.phase || run?.phase || 'hangar'), mode = L.active ? 'launch' : baseMode;
    if (mode !== A.mode) { A.mode = mode; A.modeSince = now; if (mode === 'transfer') A.transferK = 0; }
    const lam = red ? Infinity : now - A.modeSince < POSE_SETTLE_S ? GLIDE_LAMBDA : TRACK_LAMBDA, lay = LAYOUTS[mode];
    // minute smoothing
    const target = run?.minute || 0;
    A.minute = red || target < A.minute - 1e-6 || mode !== 'orbit' && A.minute > target ? target : damp(A.minute, target, 8, dt);
    // sun direction
    const orbitMode = mode === 'orbit';
    const wantSun = orbitMode ? tmp.v.set(...orbit.ecl.sunDir) : tmp.v.set(...lay.sun).normalize();
    A.sunDir.set(damp(A.sunDir.x, wantSun.x, red ? Infinity : 4, dt), damp(A.sunDir.y, wantSun.y, red ? Infinity : 4, dt), damp(A.sunDir.z, wantSun.z, red ? Infinity : 4, dt)).normalize();
    if (light.current) light.current.position.copy(A.sunDir).multiplyScalar(30);
    if (fill.current) fill.current.position.copy(A.sunDir).multiplyScalar(-14).add(V(0, 6, 4));
    // body + earth poses
    const b = refs.body, e = refs.earth;
    if (b) {
      b.position.set(damp(b.position.x, lay.body.pos[0], lam, dt), damp(b.position.y, lay.body.pos[1], lam, dt), damp(b.position.z, lay.body.pos[2], lam, dt));
      const s = damp(b.scale.x, bodyR * lay.body.k, lam, dt); b.scale.set(s, s * (visual.flatten ?? 1), s);
      tmp.bodyPos.copy(b.position);
    }
    if (e) {
      const hide = isEarth && mode !== 'launch', er = hide ? 0.0001 : lay.earth.r;
      e.position.set(damp(e.position.x, lay.earth.pos[0], lam, dt), damp(e.position.y, lay.earth.pos[1], lam, dt), damp(e.position.z, lay.earth.pos[2], lam, dt));
      const s = damp(e.scale.x, er, lam, dt); e.scale.setScalar(Math.max(0.0001, s)); e.visible = s > 0.01;
      // beam target: the Earth backdrop, or a ground station on the body when the body IS Earth
      if (isEarth) A.earthTarget.copy(tmp.bodyPos).add(tmp.v2.set(0.3, 0.45, 0.85).normalize().multiplyScalar(bodyR)); else A.earthTarget.copy(e.position);
    }
    A.orbitFade = damp(A.orbitFade, orbitMode ? 1 : 0, red ? Infinity : 6, dt);
    if (refs.orbit) refs.orbit.position.copy(tmp.bodyPos);
    if (refs.sun) { refs.sun.visible = orbitMode; refs.sun.position.copy(A.sunDir).multiplyScalar(34); }
    // arrows (Sun and Earth direction), shown in the orbit view
    const origin = tmp.bodyPos, arrowR = orbit.rVis + 0.45;
    for (const [key, dir] of [['sunArrow', A.sunDir], ['earthArrow', tmp.v2.copy(A.earthTarget).sub(origin).normalize()]]) {
      const a = refs[key]; if (!a) continue;
      a.visible = orbitMode && A.orbitFade > 0.5;
      a.position.copy(origin).addScaledVector(dir, arrowR); a.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
    }
    // rocket
    const rk = refs.rocket;
    if (rk) { rk.visible = mode === 'launch'; rk.position.set(0, A.rocketY, 0); }
    if (refs.pad) { refs.pad.visible = mode === 'hangar' || mode === 'launch'; refs.pad.position.y = mode === 'launch' ? -2.45 : -1.75; }
    // craft pose
    const c = refs.craft;
    if (c) {
      let pos = tmp.arr, sc = lay.craft.scale; const q = tmp.q.identity(); tmp.obj.up.set(0, 1, 0);
      if (mode === 'orbit') {
        orbitPoint(A.minute, orbit.geom.period, orbit.rVis, orbit.geom.inclination, pos); pos[0] += tmp.bodyPos.x; pos[1] += tmp.bodyPos.y; pos[2] += tmp.bodyPos.z;
        tmp.obj.position.set(pos[0], pos[1], pos[2]); tmp.obj.lookAt(tmp.bodyPos); q.copy(tmp.obj.quaternion);
      } else if (mode === 'transfer') {
        A.transferK = Math.min(1, A.transferK + dt / 5); transferPoint(A.transferK, pos);
        const nx = transferPoint(Math.min(1, A.transferK + 0.05), [0, 0, 0]); tmp.obj.position.set(pos[0], pos[1], pos[2]); tmp.obj.lookAt(nx[0], nx[1], nx[2]); q.copy(tmp.obj.quaternion);
      } else if (mode === 'launch') {
        const past = A.launchP != null && A.launchP > LAUNCH_MARKS.separation; sc = past ? 0.32 : 0.001; pos[0] = 0; pos[1] = A.rocketY + 2.2; pos[2] = 0;
      } else { pos[0] = pos[1] = pos[2] = 0; }
      const k = Number.isFinite(lam) ? 1 - Math.exp(-lam * dt) : 1;
      c.position.set(c.position.x + (pos[0] - c.position.x) * k, c.position.y + (pos[1] - c.position.y) * k, c.position.z + (pos[2] - c.position.z) * k);
      const s = damp(c.scale.x, sc, lam, dt); c.scale.setScalar(Math.max(0.001, s)); c.quaternion.slerp(q, k); c.visible = s > 0.01;
      A.craftWorld.copy(c.position);
    }
    // continuous work keeps the demand loop alive
    if (L.active || A.orbitFade > 0.01 && A.orbitFade < 0.99 || plume.live || dust.live) invalidate();
    plume.update(dt, state.gl.getPixelRatio()); dust.update(dt, state.gl.getPixelRatio());
    // plume: engine exhaust during liftoff, in world space so it trails the rocket
    if (L.active && A.launchP > LAUNCH_MARKS.ignite && !red) {
      const n = Math.max(1, Math.round(plume.count * dt * 1.4));
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = 0.3 + Math.random() * 0.9; plume.emit(Math.cos(a) * 0.18, A.rocketY - 2.1, Math.sin(a) * 0.18, Math.cos(a) * sp, -2.5 - Math.random() * 2.5, Math.sin(a) * sp, 0.7 + Math.random() * 0.7, 1 + Math.random()); }
    }
  }, -2);

  // ---------------- craft animator: emphasis, seat, wings, dish, x-ray, dim ----------------
  const api = ctx.craftApi;
  useFrame(state => {
    const A = ctx.A, rt = ctx.runtime, red = ctx.reduced.current, p = ctx.p.current, t = A.t;
    const hangar = A.mode === 'hangar', run = p.run, craft = refs.craft; if (!craft) return;
    const step = A.dt || 1 / 60;
    A.explode = damp(A.explode, rt.exploded ? 1 : 0, red ? Infinity : 6, step);
    // consume seat requests
    while (rt.seatQueue.length) {
      const q = rt.seatQueue.shift(), home = SOCKETS[q.kind]?.pos; if (!home || !api.groups[q.kind]) { q.resolve?.(false); continue; }
      if (red) { A.flash[q.kind] = 1; setTimeout(() => q.resolve?.(true), 120); continue; }
      const from = V(0, 2.2, 1.2);
      if (q.rect) {
        const el = state.gl.domElement, r = el.getBoundingClientRect(), cx = q.rect.left + q.rect.width / 2, cy = q.rect.top + q.rect.height / 2;
        const ndc = V(((cx - r.left) / Math.max(1, r.width)) * 2 - 1, -(((cy - r.top) / Math.max(1, r.height)) * 2 - 1), 0.5).unproject(state.camera);
        const homeW = V(...home); craft.localToWorld(homeW);
        const dir = ndc.sub(state.camera.position).normalize(), dist = state.camera.position.distanceTo(homeW) * 0.92;
        const pt = state.camera.position.clone().addScaledVector(dir, dist); craft.worldToLocal(pt); from.copy(pt).sub(V(...home));
        if (from.length() > 8) from.setLength(8);
      }
      A.seats[q.kind] = {s: {x: 0, v: 0}, from, landed: false, resolve: q.resolve};
    }
    for (const kind of KINDS) {
      const g = api.groups[kind]; if (!g) continue;
      const ex = SOCKETS[kind].explode, seat = A.seats[kind];
      let ox = kind === 'power' ? 0 : ex[0] * A.explode, oy = ex[1] * A.explode, oz = ex[2] * A.explode, sc = 1;
      if (seat) {
        springStep(seat.s, 1, spring.snap, step);
        const k = 1 - seat.s.x; ox += seat.from.x * k; oy += seat.from.y * k; oz += seat.from.z * k; sc = 0.7 + 0.3 * Math.min(1.1, seat.s.x);
        if (!seat.landed && seat.s.x >= 1) {
          seat.landed = true; A.flash[kind] = 1; seat.resolve?.(true);
          const w = V(...SOCKETS[kind].pos); craft.localToWorld(w);
          for (let i = 0; i < Math.round(dust.count / 2); i++) { const a = Math.random() * 6.283, sp = 0.25 + Math.random() * 0.6; dust.emit(w.x, w.y, w.z, Math.cos(a) * sp, (Math.random() - 0.3) * sp, Math.sin(a) * sp, 0.3, 0.8 + Math.random() * 0.6); }
          invalidate();
        }
        if (seat.landed && Math.abs(seat.s.x - 1) < 0.002 && Math.abs(seat.s.v) < 0.02) delete A.seats[kind]; else invalidate();
      }
      g.position.set(ox, oy, oz); g.scale.setScalar(sc);
    }
    // wings tilt toward the Sun, dish tracks Earth during contact
    tmp.q.copy(craft.quaternion).invert(); tmp.v.copy(A.sunDir).applyQuaternion(tmp.q);
    // wings track the Sun in flight; in the hangar they rest at a fixed, readable tilt so they stay easy to pick
    const theta = hangar ? 0.5 : Math.atan2(tmp.v.z, tmp.v.y);
    for (const w of api.wings) { w.rotation.x = damp(w.rotation.x, theta, red ? Infinity : 4, step); const sign = w.position.x < 0 ? -1 : 1; w.position.x = sign * (0.26 + 0.7 * A.explode); }
    if (api.dish) {
      const contact = !!run?.contact && A.mode === 'orbit';
      if (contact) { tmp.v2.copy(A.earthTarget).sub(craft.position).normalize().applyQuaternion(tmp.q); tmp.q.setFromUnitVectors(Yv, tmp.v2); } else tmp.q.identity();
      api.dish.quaternion.slerp(tmp.q, red ? 1 : 1 - Math.exp(-4 * step));
    }
    // dim: eclipse, safe mode
    const dimTarget = run?.safe ? 0.5 : run?.eclipse && A.mode === 'orbit' ? 0.2 : 1;
    A.dim = damp(A.dim, dimTarget, red ? Infinity : 5, step);
    const xray = !!rt.xray, dimChanged = Math.abs(A.dim - A.dimApplied) > 0.002;
    for (const kind of KINDS) {
      const sel = p.selected === kind, hov = p.hoverPart === kind && !sel, flash = A.flash[kind] || 0;
      const pulse = sel ? (red ? 0.28 : 0.22 + 0.14 * Math.sin(t * 4)) : hov ? 0.16 : 0, extra = pulse + flash * 0.8;
      if (flash > 0) A.flash[kind] = Math.max(0, flash - step / 0.18);
      const opacity = xray ? (sel ? 0.95 : 0.26) : 1;
      for (const m of api.mats[kind]) {
        const base = m.userData.base; if (!base) continue;
        if (base.emissive.getHex() === 0) { m.emissive.set(sel ? HIGHLIGHT_SEL : HIGHLIGHT_HOV); m.emissiveIntensity = extra; } else m.emissiveIntensity = base.emissiveIntensity + extra * 0.5;
        if (dimChanged || A.xrayApplied !== xray) m.color.copy(base.color).multiplyScalar(A.dim);
        if (A.xrayApplied !== xray) { m.transparent = xray || base.transparent; m.depthWrite = !xray; m.needsUpdate = true; }
        m.opacity = xray ? opacity : base.opacity;
      }
      const ring = api.sockets[kind];
      if (ring) {
        const want = hangar ? (sel ? 0.9 : hov ? 0.8 : A.explode > 0.1 || xray ? 0.35 : 0) : 0, o = Math.max(want, flash);
        ring.material.opacity = damp(ring.material.opacity, o, red ? Infinity : 14, step); ring.scale.setScalar(1 + (hov || sel ? 0.12 * Math.sin(t * 5) : 0) + flash * 0.5);
      }
    }
    A.dimApplied = A.dim; A.xrayApplied = xray;
    // beacon blinks red; safe mode blinks amber and faster
    if (api.beacon) { const safe = !!run?.safe, on = red ? true : Math.sin(t * (safe ? 9 : 3)) > 0.4; api.beacon.material.emissive.set(safe ? '#ffb347' : '#ff3030'); api.beacon.material.color.set(safe ? '#ffb347' : '#ff5a5a'); api.beacon.material.emissiveIntensity = on ? 1.2 : 0.15; }
    // engine plume on the craft during burns
    if (api.plume) { const burn = (run?.phase === 'transfer' || run?.phase === 'capture') && (A.mode === 'transfer' || A.mode === 'orbit'); api.plume.visible = burn; if (burn) api.plume.scale.set(1, 0.8 + (red ? 0 : 0.2 * Math.sin(t * 38)), 1); }
  });

  const onPick = useRef(k => ctx.p.current.onPick?.(k)).current, onHover = useRef(k => ctx.p.current.onSocketHover?.(k)).current;
  const hangar = sceneModeFor(props.phase || props.run?.phase || 'hangar') === 'hangar';
  const earthVis = useMemo(() => bodyVisualFor('earth'), []);
  return (
    <>
      <color attach="background" args={['#05080f']} />
      <ambientLight intensity={hangar ? 0.85 : 0.4} color="#9db4d4" />
      {hangar ? <hemisphereLight args={['#d4eaff', '#536581', 1.4]} /> : null}
      <directionalLight ref={light} intensity={2.2} color="#fff4e0" position={[-8, 10, 12]} />
      <directionalLight ref={fill} intensity={hangar ? 1.1 : 0.35} color="#6aa7d8" position={[6, 3, -8]} />
      <Stars count={settings.stars} ctx={ctx} />
      <Planet visual={visual} segments={settings.segments} ctx={ctx} group={n => { refs.body = n; }} />
      <Planet visual={earthVis} segments={Math.max(24, settings.segments - 16)} ctx={ctx} group={n => { refs.earth = n; }} />
      <SunMarker group={n => { refs.sun = n; }} />
      <Arrow group={n => { refs.sunArrow = n; }} color="#ffd27a" />
      <Arrow group={n => { refs.earthArrow = n; }} color="#7cdbf3" />
      <group ref={n => { refs.orbit = n; }}>
        <OrbitLayer ctx={ctx} orbit={orbit} />
      </group>
      <LinkBeam ctx={ctx} orbit={orbit} />
      <group ref={n => { refs.craft = n; }}>
        <Craft spec={spec} api={api} hangar={hangar} fairing={props.selected === 'launch' && hangar} onPick={onPick} onHover={onHover} />
      </group>
      <group ref={n => { refs.pad = n; }} position={[0, -1.75, 0]}>
        <mesh><cylinderGeometry args={[2.3, 2.3, 0.05, 56]} /><meshStandardMaterial color="#14212f" metalness={0.5} roughness={0.55} /></mesh>
        <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.3, 0.018, 6, 72]} /><meshBasicMaterial color="#7cdbf3" transparent opacity={0.45} /></mesh>
      </group>
      <Rocket spec={spec} ctx={ctx} group={n => { refs.rocket = n; }} />
      <primitive object={plume.points} /><primitive object={dust.points} />
      <CameraRig ctx={ctx} />
    </>
  );
}
