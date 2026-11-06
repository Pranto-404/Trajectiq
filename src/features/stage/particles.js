// CPU particle field rendered as additive Points (plume, dust puffs). A fixed buffer, no per-frame allocation.
import {AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial} from 'three';

const VERT = `attribute float aAlpha; attribute float aSize; uniform float uSize; uniform float uPx; varying float vA;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; vA = aAlpha; gl_PointSize = max(1.0, uSize * aSize * uPx * (60.0 / -mv.z)); }`;
const FRAG = `uniform vec3 uColor; varying float vA;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.0, r) * vA; gl_FragColor = vec4(uColor, a); }`;

export function createParticles(count, {color = '#ffb45a', size = 1} = {}) {
  const pos = new Float32Array(count * 3), vel = new Float32Array(count * 3), age = new Float32Array(count).fill(1e9), life = new Float32Array(count).fill(1);
  const alpha = new Float32Array(count), psize = new Float32Array(count).fill(1);
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3)); geo.setAttribute('aAlpha', new BufferAttribute(alpha, 1)); geo.setAttribute('aSize', new BufferAttribute(psize, 1));
  const mat = new ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: {uColor: {value: new Color(color)}, uSize: {value: size}, uPx: {value: 1}}});
  const points = new Points(geo, mat); points.frustumCulled = false; points.visible = false;
  let cursor = 0, live = 0;
  const api = {
    points, count, get live() { return live; },
    /** Emit one particle at (x,y,z) with velocity (vx,vy,vz), lifetime seconds, size factor. */
    emit(x, y, z, vx, vy, vz, lifeS = 0.8, s = 1) {
      const i = cursor; cursor = (cursor + 1) % count;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz; age[i] = 0; life[i] = lifeS; psize[i] = s;
    },
    update(dt, pixelRatio = 1) {
      live = 0; mat.uniforms.uPx.value = pixelRatio;
      for (let i = 0; i < count; i++) {
        if (age[i] >= life[i]) { alpha[i] = 0; continue; }
        age[i] += dt;
        if (age[i] >= life[i]) { alpha[i] = 0; continue; }
        live++;
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        const k = 1 - age[i] / life[i]; alpha[i] = k > 0 ? k * k : 0;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.aAlpha.needsUpdate = true; geo.attributes.aSize.needsUpdate = true;
      points.visible = live > 0;
    },
    clear() { age.fill(1e9); alpha.fill(0); live = 0; points.visible = false; geo.attributes.aAlpha.needsUpdate = true; },
    dispose() { geo.dispose(); mat.dispose(); }
  };
  return api;
}
