import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
} from 'three';

export interface ParticleMistHandle {
  readonly points: Points;
  update(elapsed: number): void;
  dispose(): void;
}

export interface ParticleMistOptions {
  /** Cylindrical radius min (world units in local space). Default 0.4 */
  radialMin?: number;
  /** Cylindrical radius max. Default 3.2 */
  radialMax?: number;
  /** Vertical extent: y = yMin + random * (yMax - yMin). Default yMin -0.2, yMax 2.2 */
  yMin?: number;
  yMax?: number;
  /** Peak fragment alpha (multiplies soft disc). Default 0.22 */
  fragAlpha?: number;
  /** Scales vertex sway amplitude. Default 1 */
  motionScale?: number;
}

export function createParticleMist(
  count: number,
  colorA: Color,
  colorB: Color,
  options: ParticleMistOptions = {},
): ParticleMistHandle {
  const r0 = options.radialMin ?? 0.4;
  const r1 = options.radialMax ?? 3.2;
  const yMin = options.yMin ?? -0.2;
  const yMax = options.yMax ?? 2.2;
  const fragAlpha = options.fragAlpha ?? 0.22;
  const motionScale = options.motionScale ?? 1;

  const vert = `
  attribute float aPhase;
  uniform float uTime;
  uniform float uMotionScale;
  varying float vFade;

  void main() {
    vec3 p = position;
    float w = uTime * 0.55;
    float m = uMotionScale;
    p.x += sin(w + aPhase * 6.283) * 0.22 * m;
    p.y += sin(w * 0.8 + aPhase * 12.0) * 0.12 * m;
    p.z += cos(w * 0.65 + aPhase * 8.0) * 0.2 * m;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFade = smoothstep(-6.0, -1.5, -mv.z);
    gl_PointSize = mix(2.2, 5.5, aPhase) * (220.0 / max(-mv.z, 0.35));
    gl_Position = projectionMatrix * mv;
  }
`;

  const frag = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uFragAlpha;
  varying float vFade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c) * 2.0;
    if (r > 1.0) discard;
    float s = smoothstep(1.0, 0.15, r);
    vec3 col = mix(uColorA, uColorB, gl_PointCoord.y);
    gl_FragColor = vec4(col, uFragAlpha * s * vFade);
  }
`;

  const geo = new BufferGeometry();
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const rr = r0 + Math.random() * Math.max(1e-4, r1 - r0);
    pos[i * 3] = Math.cos(u) * rr;
    pos[i * 3 + 1] = yMin + Math.random() * Math.max(1e-4, yMax - yMin);
    pos[i * 3 + 2] = Math.sin(u) * rr;
    phase[i] = Math.random();
  }
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new BufferAttribute(phase, 1));

  const mat = new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 },
      uMotionScale: { value: motionScale },
      uFragAlpha: { value: fragAlpha },
      uColorA: { value: colorA.clone() },
      uColorB: { value: colorB.clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geo, mat);
  points.frustumCulled = false;

  return {
    points,
    update(elapsed: number) {
      mat.uniforms.uTime.value = elapsed;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
