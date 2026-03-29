import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  NormalBlending,
  PerspectiveCamera,
  Points,
  ShaderMaterial,
  Vector4,
} from 'three';
import type { FrameContext, IComponent } from '@/types';
import type { AudioSystem } from '@/systems/audioSystem';
import type { BloomLod } from '@citron-bloom-engine/bloom-core/types';

const MAX_WAVES = 8;
const WAVE_LIFETIME = 2.85;

interface CurtainWave {
  startTime: number;
  speed: number;
  hueA: number;
  hueB: number;
}

function countForLod(lod: BloomLod): number {
  if (lod === 'low') return 900;
  if (lod === 'medium') return 1400;
  return 2200;
}

function halfCount(lod: BloomLod): number {
  return Math.max(48, Math.floor(countForLod(lod) / 2));
}

/** NDC x magnitude for curtain strip (near ±1 = true screen edge). */
const NDC_MIN = 0.88;
const NDC_MAX = 0.985;

const vert = `
attribute float aSeed;
uniform float uTime;
uniform float uTanHalfFov;
uniform float uAspect;

varying vec2 vNdc;
varying float vSeed;

void main() {
  vSeed = aSeed;
  /* position.x = target NDC x (signed); y,z = camera-space */
  float ndcX = position.x;
  float y = position.y;
  float z = position.z;
  float d = -z;
  float xe = ndcX * d * uTanHalfFov * uAspect;

  float w = uTime * 0.07;
  xe += sin(w + aSeed * 6.2831853) * 0.004 * d;
  y += cos(w * 0.86 + aSeed * 4.13) * 0.003 * d;

  vec4 mv = modelViewMatrix * vec4(xe, y, z, 1.0);
  vec4 clip = projectionMatrix * mv;
  vNdc = clip.xy / clip.w;
  gl_PointSize = mix(1.4, 3.2, aSeed) * (140.0 / max(-mv.z, 0.25));
  gl_Position = clip;
}
`;

const frag = `
uniform float uTime;
uniform float uAspect;
uniform float uBeatEnvelope;
uniform float uMusicOn;
uniform vec3 uBaseDark;
uniform vec3 uGoldA;
uniform vec3 uGoldB;
uniform vec4 uWave0;
uniform vec4 uWave1;
uniform vec4 uWave2;
uniform vec4 uWave3;
uniform vec4 uWave4;
uniform vec4 uWave5;
uniform vec4 uWave6;
uniform vec4 uWave7;
uniform float uBaseAlpha;

varying vec2 vNdc;
varying float vSeed;

float hash12(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 hsv2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

float waveRing(vec4 data, float r, float tileDelay, float uTime) {
  float speed = data.y;
  if (speed < 0.0001) return 0.0;
  float t = uTime - data.x;
  if (t < 0.0) return 0.0;
  float front = speed * t * 0.44;
  float rEff = r - tileDelay * 0.28;
  float thick = 0.11;
  float tail = 0.24;
  float inner = smoothstep(front - thick, front, rEff);
  float outer = 1.0 - smoothstep(front, front + tail, rEff);
  return max(0.0, inner * outer);
}

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float pr = length(c) * 2.0;
  if (pr > 1.0) discard;
  float disc = smoothstep(1.0, 0.25, pr);

  /* Hard gate: only draw in outer screen strips (no central "pillows"). */
  if (abs(vNdc.x) < 0.72) discard;

  vec2 q = vNdc;
  q.x *= uAspect;
  float r = length(q) * 0.5;

  vec2 tile = floor(vNdc * vec2(15.0, 15.0));
  float tileDelay = hash12(tile + vSeed * 0.01);

  float best = 0.0;
  vec3 bestRgb = vec3(0.0);

  vec4 W;
  float wi;

  W = uWave0;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }
  W = uWave1;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }
  W = uWave2;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }
  W = uWave3;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }
  W = uWave4;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }
  W = uWave5;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }
  W = uWave6;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }
  W = uWave7;
  wi = waveRing(W, r, tileDelay, uTime);
  if (wi > best) {
    best = wi;
    float tloc = uTime - W.x;
    float fr = max(0.001, W.y * tloc * 0.44);
    float hueMid = smoothstep(fr - 0.14, fr + 0.18, r - tileDelay * 0.28);
    float hue = mix(W.z, W.w, hueMid);
    float sat = mix(0.72, 0.92, sin(vSeed * 40.0 + uTime) * 0.5 + 0.5);
    bestRgb = hsv2rgb(vec3(hue, sat, 1.0));
  }

  vec3 gold = mix(uGoldA, uGoldB, vSeed);
  float env = best * mix(0.55, 1.0, uBeatEnvelope);

  vec3 col = uBaseDark;
  float a = uBaseAlpha * disc * (0.55 + 0.45 * abs(vNdc.x));

  if (uMusicOn > 0.5) {
    vec3 lit = mix(gold * 0.45, bestRgb, env);
    float mixAmt = clamp(env * 0.92 + uBeatEnvelope * 0.22, 0.0, 1.0);
    col = mix(uBaseDark, lit, mixAmt);
    a = mix(a, min(0.55, a + 0.35 * mixAmt), mixAmt);
  }

  gl_FragColor = vec4(col, a);
}
`;

function buildHalfGeometry(n: number, signX: 1 | -1): BufferGeometry {
  const geo = new BufferGeometry();
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const z0 = -7.8;
  const z1 = -9.6;
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    const ndcMag = NDC_MIN + Math.random() * Math.max(1e-4, NDC_MAX - NDC_MIN);
    const ndcX = signX * ndcMag;
    const y = -2.85 + Math.random() * 5.7;
    const z = z0 + t * (z1 - z0);
    pos[i * 3] = ndcX;
    pos[i * 3 + 1] = y;
    pos[i * 3 + 2] = z;
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
  return geo;
}

function inactiveWave(): Vector4 {
  return new Vector4(0, 0, 0, 0);
}

function tanHalfVerticalFov(cam: PerspectiveCamera): number {
  const rad = (cam.fov * Math.PI) / 180;
  return Math.tan(rad * 0.5);
}

/**
 * Thin edge curtains: near-black when silent; gold / wave color only while music plays.
 */
export class SideCurtainParticlesComponent implements IComponent {
  readonly group = new Group();
  private material!: ShaderMaterial;
  private left!: Points;
  private right!: Points;
  private waves: CurtainWave[] = [];
  private readonly waveUniforms: Vector4[] = [];
  private audio: AudioSystem | null = null;

  constructor(
    private readonly isFlowerExperience: () => boolean,
    private readonly lod: BloomLod,
  ) {
    for (let i = 0; i < MAX_WAVES; i++) {
      this.waveUniforms.push(inactiveWave());
    }
  }

  setAudioSystem(audio: AudioSystem): void {
    this.audio = audio;
  }

  init(ctx: FrameContext): void {
    const n = halfCount(this.lod);
    const leftGeo = buildHalfGeometry(n, -1);
    const rightGeo = buildHalfGeometry(n, 1);

    const cam = ctx.camera instanceof PerspectiveCamera ? ctx.camera : null;
    const tanHalf = cam ? tanHalfVerticalFov(cam) : Math.tan(((45 * Math.PI) / 180) * 0.5);
    const asp = cam?.aspect ?? 1;

    this.material = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: Math.max(0.25, asp) },
        uTanHalfFov: { value: tanHalf },
        uBeatEnvelope: { value: 0 },
        uMusicOn: { value: 0 },
        uBaseDark: { value: new Color(0x06080d) },
        uGoldA: { value: new Color(0xc9a227) },
        uGoldB: { value: new Color(0xf5e6b8) },
        uWave0: { value: this.waveUniforms[0] },
        uWave1: { value: this.waveUniforms[1] },
        uWave2: { value: this.waveUniforms[2] },
        uWave3: { value: this.waveUniforms[3] },
        uWave4: { value: this.waveUniforms[4] },
        uWave5: { value: this.waveUniforms[5] },
        uWave6: { value: this.waveUniforms[6] },
        uWave7: { value: this.waveUniforms[7] },
        uBaseAlpha: { value: this.lod === 'low' ? 0.07 : 0.09 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: NormalBlending,
    });

    this.left = new Points(leftGeo, this.material);
    this.right = new Points(rightGeo, this.material);
    this.left.frustumCulled = false;
    this.right.frustumCulled = false;
    this.left.renderOrder = 999;
    this.right.renderOrder = 999;
    this.group.name = 'side-curtain-particles';
    this.group.add(this.left, this.right);
    ctx.camera.add(this.group);
  }

  update(ctx: FrameContext): void {
    if (!this.material) return;

    const on = this.isFlowerExperience();
    this.group.visible = on;
    if (!on) return;

    const elapsed = ctx.elapsed;
    const audio = this.audio;
    const playing = Boolean(audio?.isPlaying);

    this.material.uniforms.uTime.value = elapsed;
    const cam = ctx.camera instanceof PerspectiveCamera ? ctx.camera : null;
    const asp = cam ? Math.max(0.25, cam.aspect) : 1;
    this.material.uniforms.uAspect.value = asp;
    if (cam) {
      this.material.uniforms.uTanHalfFov.value = tanHalfVerticalFov(cam);
    }

    this.material.uniforms.uBeatEnvelope.value = playing ? (audio?.beatEnvelope ?? 0) : 0;
    this.material.uniforms.uMusicOn.value = playing ? 1 : 0;

    this.waves = this.waves.filter(
      (w) => (elapsed - w.startTime) * w.speed <= WAVE_LIFETIME,
    );

    if (!playing) {
      this.waves = [];
      for (let j = 0; j < MAX_WAVES; j++) {
        this.waveUniforms[j]!.set(0, 0, 0, 0);
      }
    } else if (audio?.consumeBeatPulse()) {
      if (this.waves.length >= MAX_WAVES) this.waves.shift();
      this.waves.push({
        startTime: elapsed,
        speed: 0.72 + Math.random() * 0.48,
        hueA: Math.random(),
        hueB: Math.random(),
      });
    }

    if (playing) {
      for (let j = 0; j < MAX_WAVES; j++) {
        const w = this.waves[j];
        if (w) this.waveUniforms[j]!.set(w.startTime, w.speed, w.hueA, w.hueB);
        else this.waveUniforms[j]!.set(0, 0, 0, 0);
      }
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    this.left?.geometry.dispose();
    this.right?.geometry.dispose();
    this.material?.dispose();
  }
}
