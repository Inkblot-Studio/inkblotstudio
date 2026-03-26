import type { WebGLRenderer } from 'three';
import { Group, Vector3 } from 'three';
import { BLOOM_LOD_PROFILES, type BloomLod } from '../bloom-core/types';
import { dnaHelixPoints, catmullFromPoints } from '../bloom-curves/curveUtils';
import { createDnaSpineMesh, disposeDnaSpine, updateDnaSpineTime } from '../bloom-curves/dnaSpine';
import { InstancedMicroLeaves } from '../bloom-core/instancedMicroLeaves';
import { BloomPhaseController } from '../bloom-flora/bloomPhase';
import { FloralAssembly } from '../bloom-flora/floralAssembly';
import { GpgpuParticles } from '../bloom-particles/gpgpuParticles';

export interface CreateCitronBloomSceneOptions {
  lod?: BloomLod;
  renderer: WebGLRenderer;
}

export interface CitronBloomSceneHandle {
  readonly root: Group;
  update(delta: number, elapsed: number): void;
  setPointerWorld(x: number, z: number): void;
  /** Drive flower opening: 0 = buds, 1 = full bloom (smoothly animated). */
  setBloomTarget(main: number, branch?: number, bud?: number): void;
  dispose(): void;
}

/**
 * Wires DNA spines, micro-leaves, multi-head floral assembly, and GPGPU particles.
 * Add `root` to your scene; tick `update` each frame.
 */
export function createCitronBloomScene(options: CreateCitronBloomSceneOptions): CitronBloomSceneHandle {
  const profile = BLOOM_LOD_PROFILES[options.lod ?? 'high'];
  const root = new Group();

  const h1 = dnaHelixPoints(2.8, 0.22, 1.35, profile.spineTubularSegments, 0);
  const h2 = dnaHelixPoints(2.8, 0.22, 1.35, profile.spineTubularSegments, Math.PI);
  const c1 = catmullFromPoints(
    h1.map((p) => p.clone().add(new Vector3(-0.15, 0, 0))),
    false,
  );
  const c2 = catmullFromPoints(
    h2.map((p) => p.clone().add(new Vector3(0.15, 0, 0))),
    false,
  );

  const spineA = createDnaSpineMesh({
    curve: c1,
    tubularSegments: profile.spineTubularSegments,
    radialSegments: profile.spineRadialSegments,
    radius: 0.036,
    twist: 2.4,
  });
  const spineB = createDnaSpineMesh({
    curve: c2,
    tubularSegments: profile.spineTubularSegments,
    radialSegments: profile.spineRadialSegments,
    radius: 0.036,
    twist: 2.4,
  });
  root.add(spineA, spineB);

  const leafCurve = catmullFromPoints(
    dnaHelixPoints(3.2, 0.55, 1.6, 64, 0.4).map((p) => p.clone().multiplyScalar(1.05)),
    false,
  );
  const leaves = new InstancedMicroLeaves({
    count: profile.microLeafInstances,
    curve: leafCurve,
    wind: 1,
  });
  root.add(leaves.mesh);

  // Slower follow = languid, graceful bloom when driven by scroll or external targets.
  const phaseMain = new BloomPhaseController({ smoothSpeed: 0.52, pulseSpeed: 0.55 });
  const phaseBranch = new BloomPhaseController({ smoothSpeed: 0.48, pulseSpeed: 0.5 });
  const phaseBud = new BloomPhaseController({ smoothSpeed: 0.42, pulseSpeed: 0.45 });
  phaseMain.snapTo(0);
  phaseBranch.snapTo(0);
  phaseBud.snapTo(0);

  const floral = new FloralAssembly({ profile }, [phaseMain, phaseBranch, phaseBud]);
  root.add(floral);

  const particles = new GpgpuParticles(options.renderer, {
    textureSize: profile.particleTexSize,
  });
  root.add(particles.points);

  const wind = { value: 1 };

  return {
    root,
    update(delta: number, elapsed: number) {
      phaseMain.update(delta);
      phaseBranch.update(delta);
      phaseBud.update(delta);
      floral.applyBloomFromPhases();
      floral.update(elapsed, wind.value);
      updateDnaSpineTime(spineA, elapsed, wind.value);
      updateDnaSpineTime(spineB, elapsed, wind.value);
      leaves.update(elapsed);
      particles.update(elapsed);
    },
    setPointerWorld(x: number, z: number) {
      particles.setPointerWorld(x, z);
    },
    setBloomTarget(main: number, branch = main * 0.85, bud = main * 0.4) {
      phaseMain.setTarget(main);
      phaseBranch.setTarget(branch);
      phaseBud.setTarget(bud);
    },
    dispose() {
      disposeDnaSpine(spineA);
      disposeDnaSpine(spineB);
      leaves.dispose();
      floral.dispose();
      particles.dispose();
      root.removeFromParent();
    },
  };
}
