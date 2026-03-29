import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  ShaderMaterial,
  Vector3,
  type PerspectiveCamera,
  type Scene,
  type Vector2,
} from 'three';

export interface PointerLiquidRibbonHandle {
  readonly group: Group;
  update(params: {
    elapsed: number;
    delta: number;
    camera: PerspectiveCamera;
    pointerNdc: Vector2;
    pointerVelocityNdc: number;
    enabled: boolean;
    journeySection: number;
    scene: Scene;
  }): void;
  dispose(): void;
}

/** Short trail — few segments */
const POINTS_COUNT = 8;
const RADIAL_SEGS = 6;
/** Followers: base spring/damp (scaled per-frame by pointer “stress”) */
const SPRING_K = 128;
const DAMPING = 17.5;
/** Head: chases pointer with damping (no snap) */
const HEAD_SPRING_K = 158;
const HEAD_DAMPING = 19;
/** Max dt per physics sub-step — large frame gaps won’t explode the integrator */
const PHYSICS_STEP_MAX = 1 / 200;
/** Pointer speed (NDC/s) above this ramps in extra smoothing — keeps fast swipes fluid */
const POINTER_STRESS_REF = 72;
const BASE_RADIUS = 0.095;
const RADIUS_VEL_FLOOR = 0.42;
/** World distance along the ray — further back reads smaller and less “in your face”. */
const POINTER_TARGET_DISTANCE = 5.75;
/** Sort after typical scene meshes so transparent overlay draws last in the main pass. */
const RIBBON_RENDER_ORDER = 1200;

const glowVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}
`;

const glowFrag = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uCore;
uniform float uSwipe;
varying vec3 vNormal;
varying vec3 vView;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float rim = pow(1.0 - ndv, 2.0);
  float along = vUv.y;
  float headBright = 1.0 - smoothstep(0.0, 0.12, along);
  float tailFade = 1.0 - smoothstep(0.22, 0.48, along);
  float body = 0.22 + 0.78 * tailFade;
  float pulse = 0.9 + 0.1 * sin(uTime * 2.6 + along * 8.0);
  vec3 rgb = mix(uCore, uColor, rim) * pulse;
  float a = (0.55 * body + 0.85 * rim + 0.72 * headBright) * (0.5 + 0.75 * uSwipe);
  gl_FragColor = vec4(rgb * a, 1.0);
}
`;

function makeTubeGeometry(rows: number, cols: number, idxArray: number[]): BufferGeometry {
  const n = rows * cols;
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('normal', new Float32BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(n * 2), 2));
  g.setIndex([...idxArray]);
  return g;
}

/**
 * Spring ribbon: unlit solid tube + additive glow.
 * Each mesh owns its own BufferGeometry (same vertex data copied each frame) so WebGL
 * attribute updates are not shared across materials — avoids invisible meshes when
 * paired with physical/transmission or multi-pass quirks.
 */
export function createPointerLiquidRibbon(): PointerLiquidRibbonHandle {
  const group = new Group();
  group.name = 'pointer-liquid-ribbon';
  group.renderOrder = RIBBON_RENDER_ORDER;

  const points = Array.from({ length: POINTS_COUNT }, () => new Vector3());
  const vels = Array.from({ length: POINTS_COUNT }, () => new Vector3());

  let initialized = false;
  const ray = new Raycaster();
  const target = new Vector3();

  const rows = POINTS_COUNT;
  const cols = RADIAL_SEGS + 1;
  const posArray = new Float32Array(rows * cols * 3);
  const normArray = new Float32Array(rows * cols * 3);
  const uvArray = new Float32Array(rows * cols * 2);

  const idxArray: number[] = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < RADIAL_SEGS; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idxArray.push(a, c, b, b, c, d);
    }
  }

  const geoSolid = makeTubeGeometry(rows, cols, idxArray);
  const geoGlow = makeTubeGeometry(rows, cols, idxArray);

  const solidPos = geoSolid.getAttribute('position') as Float32BufferAttribute;
  const solidNorm = geoSolid.getAttribute('normal') as Float32BufferAttribute;
  const solidUv = geoSolid.getAttribute('uv') as Float32BufferAttribute;

  const glowPos = geoGlow.getAttribute('position') as Float32BufferAttribute;
  const glowNorm = geoGlow.getAttribute('normal') as Float32BufferAttribute;
  const glowUv = geoGlow.getAttribute('uv') as Float32BufferAttribute;

  const solidMat = new MeshBasicMaterial({
    color: new Color(0x5eead4),
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    toneMapped: true,
    fog: false,
  });

  const solidMesh = new Mesh(geoSolid, solidMat);
  solidMesh.frustumCulled = false;
  solidMesh.name = 'pointer-liquid-ribbon-solid';
  solidMesh.renderOrder = RIBBON_RENDER_ORDER;
  group.add(solidMesh);

  const glowMat = new ShaderMaterial({
    vertexShader: glowVert,
    fragmentShader: glowFrag,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(0x5eead4) },
      uCore: { value: new Color(0x22d3ee) },
      uSwipe: { value: 0.75 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    fog: false,
  });
  const glowMesh = new Mesh(geoGlow, glowMat);
  glowMesh.frustumCulled = false;
  glowMesh.name = 'pointer-liquid-ribbon-glow';
  glowMesh.renderOrder = RIBBON_RENDER_ORDER + 1;
  group.add(glowMesh);

  const _dir = new Vector3();
  const _n = new Vector3();
  const _b = new Vector3();
  const cEmissive = new Color();
  const cGlowA = new Color();
  const cGlowB = new Color();
  const rowMax = POINTS_COUNT - 1;

  return {
    group,
    update({ elapsed, delta, camera, pointerNdc, pointerVelocityNdc, enabled, journeySection, scene: _scene }) {
      void _scene;
      if (!enabled) {
        solidMesh.visible = false;
        glowMesh.visible = false;
        group.visible = false;
        return;
      }
      solidMesh.visible = true;
      glowMesh.visible = true;
      group.visible = true;

      ray.setFromCamera(pointerNdc, camera);
      target.copy(ray.ray.origin).addScaledVector(ray.ray.direction, POINTER_TARGET_DISTANCE);

      if (!initialized) {
        for (let i = 0; i < POINTS_COUNT; i++) {
          points[i].copy(target);
          vels[i].set(0, 0, 0);
        }
        initialized = true;
      }

      const stress = Math.min(1, (pointerVelocityNdc / POINTER_STRESS_REF) ** 2);
      const kBody = SPRING_K * (1 - 0.5 * stress);
      const dBody = DAMPING * (1 + 1.35 * stress);
      const kHead = HEAD_SPRING_K * (1 - 0.18 * stress);
      const dHead = HEAD_DAMPING * (1 + 0.55 * stress);

      const cappedDelta = Math.min(delta, 0.08);
      const nSteps = Math.min(14, Math.max(1, Math.ceil(cappedDelta / PHYSICS_STEP_MAX)));
      const h = cappedDelta / nSteps;

      for (let step = 0; step < nSteps; step++) {
        for (let i = 0; i < POINTS_COUNT; i++) {
          const current = points[i];
          const vel = vels[i];
          const ax = i === 0 ? target.x : points[i - 1].x;
          const ay = i === 0 ? target.y : points[i - 1].y;
          const az = i === 0 ? target.z : points[i - 1].z;
          const k = i === 0 ? kHead : kBody;
          const d = i === 0 ? dHead : dBody;

          const fx = (ax - current.x) * k - vel.x * d;
          const fy = (ay - current.y) * k - vel.y * d;
          const fz = (az - current.z) * k - vel.z * d;

          vel.x += fx * h;
          vel.y += fy * h;
          vel.z += fz * h;

          current.x += vel.x * h;
          current.y += vel.y * h;
          current.z += vel.z * h;
        }
      }

      const velScale = Math.max(
        RADIUS_VEL_FLOOR,
        Math.min(0.82, 0.12 + Math.sqrt(pointerVelocityNdc * 0.45) * 0.018),
      );

      for (let i = 0; i < POINTS_COUNT; i++) {
        const pt = points[i];

        if (i < POINTS_COUNT - 1) {
          _dir.subVectors(points[i + 1], pt);
        } else {
          _dir.subVectors(pt, points[i - 1]);
        }

        if (_dir.lengthSq() < 0.0001) {
          _dir.set(0, 0, 1);
        } else {
          _dir.normalize();
        }

        if (i === 0) {
          _n.set(0, 1, 0);
          if (Math.abs(_dir.dot(_n)) > 0.99) _n.set(1, 0, 0);
        }

        _b.crossVectors(_dir, _n);
        if (_b.lengthSq() < 1e-6) {
          _n.set(Math.abs(_dir.y) < 0.9 ? 0 : 1, Math.abs(_dir.y) < 0.9 ? 1 : 0, 0);
          _b.crossVectors(_dir, _n);
        }
        _b.normalize();
        _n.crossVectors(_b, _dir).normalize();

        const t = i / rowMax;
        const radius = BASE_RADIUS * (1 - Math.pow(t, 2.45)) * velScale;
        const vAlong = i / rowMax;

        let vi = i * cols;
        for (let j = 0; j < cols; j++) {
          const a = (j / RADIAL_SEGS) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);

          const nx = ca * _n.x + sa * _b.x;
          const ny = ca * _n.y + sa * _b.y;
          const nz = ca * _n.z + sa * _b.z;

          posArray[vi * 3] = pt.x + radius * nx;
          posArray[vi * 3 + 1] = pt.y + radius * ny;
          posArray[vi * 3 + 2] = pt.z + radius * nz;

          normArray[vi * 3] = nx;
          normArray[vi * 3 + 1] = ny;
          normArray[vi * 3 + 2] = nz;

          uvArray[vi * 2] = j / RADIAL_SEGS;
          uvArray[vi * 2 + 1] = vAlong;
          vi++;
        }
      }

      solidPos.array.set(posArray);
      solidNorm.array.set(normArray);
      solidUv.array.set(uvArray);
      solidPos.needsUpdate = true;
      solidNorm.needsUpdate = true;
      solidUv.needsUpdate = true;

      glowPos.array.set(posArray);
      glowNorm.array.set(normArray);
      glowUv.array.set(uvArray);
      glowPos.needsUpdate = true;
      glowNorm.needsUpdate = true;
      glowUv.needsUpdate = true;

      const isAltScene = journeySection > 1 && journeySection < 5;
      const baseHue = isAltScene ? 0.65 : 0.48;

      const hue = baseHue + 0.15 * Math.sin(elapsed * 0.2) + 0.05 * Math.sin(elapsed * 0.5);
      const sat = 0.6 + 0.2 * Math.sin(elapsed * 0.3);

      const swipeGlow = Math.min(1, pointerVelocityNdc * 0.18);

      cEmissive.setHSL(hue, sat * 0.85, 0.42 + 0.12 * Math.sin(elapsed * 0.35));
      solidMat.color.copy(cEmissive);
      solidMat.opacity = 0.38 + swipeGlow * 0.18 + 0.04 * Math.sin(elapsed * 0.75);

      glowMat.uniforms.uTime.value = elapsed;
      cGlowA.setHSL(hue, 0.78, 0.62);
      cGlowB.setHSL(hue + 0.05, 0.55, 0.74);
      (glowMat.uniforms.uColor.value as Color).copy(cGlowA);
      (glowMat.uniforms.uCore.value as Color).copy(cGlowB);
      glowMat.uniforms.uSwipe.value = Math.min(1, 0.42 + swipeGlow * 0.95);
    },

    dispose() {
      geoSolid.dispose();
      geoGlow.dispose();
      solidMat.dispose();
      glowMat.dispose();
      group.removeFromParent();
    },
  };
}
