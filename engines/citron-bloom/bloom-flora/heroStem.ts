import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshPhysicalMaterial,
  type Texture,
  Vector3,
} from 'three';
import { createGlassMaterial } from '../bloom-core/glassMaterialFactory';

function createTaperedTube(
  curve: CatmullRomCurve3,
  segs: number,
  radialSegs: number,
  radiusFn: (t: number) => number,
): BufferGeometry {
  const frames = curve.computeFrenetFrames(segs, false);
  const rows = segs + 1;
  const cols = radialSegs + 1;
  const pos = new Float32Array(rows * cols * 3);
  const nrm = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);

  let vi = 0;
  for (let i = 0; i < rows; i++) {
    const t = i / segs;
    const pt = curve.getPointAt(t);
    const r = radiusFn(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    for (let j = 0; j < cols; j++) {
      const a = (j / radialSegs) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);

      const nx = ca * N.x + sa * B.x;
      const ny = ca * N.y + sa * B.y;
      const nz = ca * N.z + sa * B.z;

      pos[vi * 3] = pt.x + r * nx;
      pos[vi * 3 + 1] = pt.y + r * ny;
      pos[vi * 3 + 2] = pt.z + r * nz;
      nrm[vi * 3] = nx;
      nrm[vi * 3 + 1] = ny;
      nrm[vi * 3 + 2] = nz;
      uvs[vi * 2] = j / radialSegs;
      uvs[vi * 2 + 1] = t;
      vi++;
    }
  }

  const idx: number[] = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  return geo;
}

export interface HeroStemOptions {
  height?: number;
  baseRadius?: number;
  tipRadius?: number;
}

/**
 * Tapered stem using the same {@link createGlassMaterial} `hero-glass` preset as the rest of the hero bloom.
 */
export class HeroStem extends Mesh {
  private readonly mat: MeshPhysicalMaterial;
  private readonly _cEmissive = new Color();
  private readonly _cAttn = new Color();
  private readonly _cSurface = new Color();
  private _envIntensityBase = 1.55;

  constructor(opts: HeroStemOptions = {}) {
    const h = opts.height ?? 0.5;
    const rBase = opts.baseRadius ?? 0.015;
    const rTip = opts.tipRadius ?? 0.006;

    const curve = new CatmullRomCurve3([
      new Vector3(-0.004, -h, 0),
      new Vector3(-0.008, -h * 0.6, 0.006),
      new Vector3(0.005, -h * 0.2, 0.003),
      new Vector3(0, 0, 0),
    ]);

    const geo = createTaperedTube(curve, 40, 8, (t) => {
      const r = rBase + (rTip - rBase) * t;
      return r * (1.0 + 0.05 * Math.sin(t * 14));
    });

    const mat = createGlassMaterial('hero-glass', {
      color: new Color(0x0f2430),
      emissive: new Color(0x1a4d38),
      emissiveIntensity: 0.1,
      transmission: 0.94,
      thickness: 0.2,
      roughness: 0.022,
      attenuationColor: new Color(0x6ee7b7),
      attenuationDistance: 0.55,
      envMapIntensity: 1.55,
    });
    mat.transparent = true;
    mat.depthWrite = true;
    mat.side = DoubleSide;

    super(geo, mat);
    this.mat = mat;
    this.matrixAutoUpdate = false;
    this.frustumCulled = false;
    this.updateMatrix();
  }

  setEnvMap(texture: Texture | null, intensity = 1.5): void {
    this.mat.envMap = texture;
    this._envIntensityBase = intensity;
    this.mat.envMapIntensity = texture ? intensity : 0;
    this.mat.needsUpdate = true;
  }

  /**
   * Cool-tone drift (teal → cyan → blue → violet) on emissive, volume tint, iridescence,
   * and env reflection so the glass stem reads lively next to the petals.
   */
  tick(elapsed: number, wind: number): void {
    const w = 0.55 + 0.45 * wind;
    const t = elapsed * 0.28;

    const hue =
      0.48 + 0.2 * Math.sin(t * 0.14) + 0.07 * Math.sin(t * 0.37 + 1.1) + 0.05 * Math.sin(t * 0.61);
    const sat = 0.58 + 0.22 * Math.sin(t * 0.19 + 0.4);
    const eLight = 0.32 + 0.14 * Math.sin(t * 0.31 + 0.2);

    this._cEmissive.setHSL(hue, sat * 0.88, eLight);
    this.mat.emissive.copy(this._cEmissive);
    this.mat.emissiveIntensity = (0.1 + Math.sin(elapsed * 0.42) * 0.045 * w) * w;

    this._cAttn.setHSL(hue + 0.035 * Math.sin(t * 0.47), 0.62 + 0.18 * Math.sin(t * 0.23), 0.58);
    this.mat.attenuationColor.copy(this._cAttn);

    this._cSurface.setHSL(hue - 0.04, 0.38 + 0.2 * Math.sin(t * 0.26), 0.11 + 0.05 * Math.sin(t * 0.33));
    this.mat.color.copy(this._cSurface);

    this.mat.iridescence = 0.16 + 0.42 * (0.5 + 0.5 * Math.sin(t * 0.35 + 0.6));
    this.mat.iridescenceIOR = 1.12 + 0.22 * Math.sin(t * 0.21 + 0.9);
    this.mat.iridescenceThicknessRange = [
      120 + 90 * Math.sin(t * 0.18 + 0.3),
      260 + 120 * Math.sin(t * 0.24 + 1.0),
    ];

    if (this.mat.envMap) {
      this.mat.envMapIntensity =
        this._envIntensityBase * w * (0.88 + 0.2 * Math.sin(t * 0.39 + 0.5));
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.mat.dispose();
  }
}
