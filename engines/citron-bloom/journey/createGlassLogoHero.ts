import {
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PointLight,
  Shape,
  SpotLight,
  TorusGeometry,
} from 'three';

export interface GlassLogoHeroHandle {
  readonly group: Group;
  update(elapsed: number): void;
  dispose(): void;
}

function createGlassMaterial(): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    color: new Color(0x1c3a5c),
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.72,
    thickness: 0.48,
    ior: 1.52,
    iridescence: 0.82,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 480],
    transparent: true,
    opacity: 1,
    side: DoubleSide,
    emissive: new Color(0x3b82f6),
    emissiveIntensity: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1.45,
  });

  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      vec2 d = vUv - 0.5;
      float edge = smoothstep(0.2, 0.92, abs(d.x) + abs(d.y));
      vec3 abr = vec3(0.005, 0.002, -0.004) * edge;
      gl_FragColor.rgb += abr;
      #include <dithering_fragment>
      `,
    );
  };

  return m;
}

const extrudeOpts = {
  depth: 0.14,
  bevelEnabled: true,
  bevelThickness: 0.022,
  bevelSize: 0.018,
  bevelSegments: 2,
  curveSegments: 10,
};

/**
 * Matches `public/inkblotstudio_logo.svg` `#tri`: `points="0,0 80,40 0,80"`.
 * Zigzag: even rows (0,2) sit on the **left** spine at x=0, apex toward +X. Odd rows (1,3) use
 * `scale.x = -1` and `position.x = triWidth` like SVG `scale(-1,1) translate(-120,0)` so the **right**
 * spine aligns and apexes aim −X — inward toward the channel between columns.
 */
function inkblotTriangleShape(w = 0.8, h = 0.8): Shape {
  const s = new Shape();
  s.moveTo(0, 0);
  s.lineTo(w, h * 0.5);
  s.lineTo(0, h);
  s.closePath();
  return s;
}

const SLAB_COUNT = 4;

export function createGlassLogoHero(): GlassLogoHeroHandle {
  const group = new Group();
  const mat = createGlassMaterial();

  const W = 0.56;
  const H = 0.56;
  /**
   * Vertical step between slabs: use shape height `H`, not bbox `triHeight`.
   * Bevel inflates the mesh bbox upward, so triHeight-based pitch leaves large
   * visible gaps between the glass faces; H + gap matches the inkblot leg length.
   */
  const verticalGap = -0.08;
  const pitch = H + verticalGap;

  const key = new PointLight(0xffffff, 56, 30, 1.6);
  key.position.set(3.6, 1.2, 6.4);
  key.decay = 2;
  group.add(key);

  const fill = new PointLight(0x93c5fd, 38, 24, 1.5);
  fill.position.set(-4, 0.2, 5.8);
  fill.decay = 2;
  group.add(fill);

  const rim = new PointLight(0x60a5fa, 32, 22, 1.45);
  rim.position.set(0.5, -0.5, -5.8);
  rim.decay = 2;
  group.add(rim);

  const spot = new SpotLight(0xe0f2fe, 110, 36, 0.4, 0.32, 1);
  spot.position.set(0.8, 2.8, 8.2);
  spot.target.position.set(0, 0, 0);
  group.add(spot);
  group.add(spot.target);

  const column = new Group();
  column.rotation.set(0, 0, 0);
  group.add(column);

  /** Torus must match `TorusGeometry(major, tube, …)` — used to size slabs for the hole. */
  const torusMajor = 1.3392;
  const torusTube = 0.08208;
  const torusHoleRadius = torusMajor - torusTube;
  const holeMargin = 0.1188;

  const template = new ExtrudeGeometry(inkblotTriangleShape(W, H), extrudeOpts);
  template.computeBoundingBox();
  const bb = template.boundingBox!;
  template.translate(-bb.min.x, -bb.min.y, -bb.min.z);
  template.computeBoundingBox();
  const bbN = template.boundingBox!;
  const triWidth = bbN.max.x;
  const triHeight = bbN.max.y;
  const midX = triWidth * 0.5;
  const zHalf = Math.max(Math.abs(bbN.min.z), Math.abs(bbN.max.z));
  /** Max distance from stack Y axis in XZ (slabs centered on x = midX before column offset). */
  const slabClearRadius = Math.hypot(midX, zHalf);
  const logoFitScale = Math.min(
    1,
    (torusHoleRadius - holeMargin) / Math.max(slabClearRadius, 1e-4),
  );

  const slabStack = new Group();
  for (let i = 0; i < SLAB_COUNT; i++) {
    const geo = template.clone();
    const mesh = new Mesh(geo, mat.clone());
    mesh.rotation.set(0, 0, 0);
    const y = -i * pitch;
    if (i % 2 === 1) {
      mesh.scale.x = -1;
      mesh.position.set(triWidth, y, 0);
    } else {
      mesh.position.set(0, y, 0);
    }
    slabStack.add(mesh);
  }
  template.dispose();

  slabStack.scale.setScalar(logoFitScale);
  /** Camera at +Z: −X is screen-left; shift glass vs torus (torus stays centered). */
  slabStack.position.x = -0.64 * triWidth * logoFitScale;
  column.add(slabStack);

  column.position.set(
    -midX * logoFitScale,
    (logoFitScale * (3 * pitch - triHeight)) / 2,
    0,
  );

  /** Default torus lies in XY; hole faces ±Z. Camera in hero (section 1) is at +Z, so the ring reads face-on around the Y stack — not edge-on (that was rotation.x = π/2 → XZ plane). */
  const torus = new Mesh(new TorusGeometry(torusMajor, torusTube, 26, 128), mat.clone());
  torus.rotation.set(0, 0, 0);
  torus.position.set(0, (logoFitScale * (triHeight - 3 * pitch)) / 2, 0.025);
  column.add(torus);

  group.scale.setScalar(1.38);
  group.position.set(0.85, 0.42, 0);

  return {
    group,
    update(elapsed: number) {
      group.rotation.y = Math.sin(elapsed * 0.12) * 0.018;
      group.position.y = 0.42 + Math.sin(elapsed * 0.22) * 0.022;
      torus.rotation.z = elapsed * 0.11;
    },
    dispose() {
      spot.target.removeFromParent();
      group.traverse((obj) => {
        if (!(obj instanceof Mesh)) return;
        obj.geometry.dispose();
        const mat0 = obj.material;
        if (Array.isArray(mat0)) mat0.forEach((mm) => mm.dispose());
        else mat0.dispose();
      });
    },
  };
}
