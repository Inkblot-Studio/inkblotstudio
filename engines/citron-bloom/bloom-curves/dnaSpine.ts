import { Mesh, ShaderMaterial, TubeGeometry, Vector3 } from 'three';
import type { Curve } from 'three';
import dnaTubeVert from './shaders/dnaTube.vert';
import dnaTubeFrag from './shaders/dnaTube.frag';
import { BloomTokens } from '../bloom-core/tokens';

export interface DnaSpineOptions {
  curve: Curve<Vector3>;
  tubularSegments: number;
  radialSegments: number;
  radius?: number;
  twist?: number;
}

/**
 * Extruded tube along a curve with vertex deformation (wind / organic bend).
 */
export function createDnaSpineMesh(options: DnaSpineOptions): Mesh {
  const radius = options.radius ?? 0.045;
  const geo = new TubeGeometry(
    options.curve,
    options.tubularSegments,
    radius,
    options.radialSegments,
    false,
  );

  const mat = new ShaderMaterial({
    vertexShader: dnaTubeVert,
    fragmentShader: dnaTubeFrag,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: 1 },
      uTwist: { value: options.twist ?? 2.5 },
      uColorNear: { value: BloomTokens.citron600.clone() },
      uColorFar: { value: BloomTokens.citron400.clone() },
      uRimColor: { value: BloomTokens.citron300.clone() },
      uRimPower: { value: 2.2 },
    },
  });

  return new Mesh(geo, mat);
}

export function updateDnaSpineTime(mesh: Mesh, elapsed: number, wind = 1): void {
  const m = mesh.material as ShaderMaterial;
  if (m.uniforms?.uTime) m.uniforms.uTime.value = elapsed;
  if (m.uniforms?.uWind) m.uniforms.uWind.value = wind;
}

export function disposeDnaSpine(mesh: Mesh): void {
  mesh.geometry.dispose();
  (mesh.material as ShaderMaterial).dispose();
  mesh.removeFromParent();
}
