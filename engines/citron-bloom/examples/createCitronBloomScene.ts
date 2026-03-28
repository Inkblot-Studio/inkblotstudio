import type { Camera } from 'three';
import { Group, Vector3 } from 'three';
import { BLOOM_LOD_PROFILES, type BloomLod } from '../bloom-core/types';
import { dnaHelixPoints, catmullFromPoints } from '../bloom-curves/curveUtils';
import { createDnaSpineMesh, disposeDnaSpine, updateDnaSpineTime } from '../bloom-curves/dnaSpine';
import { InstancedMicroLeaves } from '../bloom-core/instancedMicroLeaves';
import { BloomPhaseController } from '../bloom-flora/bloomPhase';
import { createFlowerAmbientMotes } from '../bloom-flora/createFlowerAmbientMotes';
import { createFlowerFogMistParticles } from '../bloom-flora/createFlowerFogMistParticles';
import { FloralAssembly } from '../bloom-flora/floralAssembly';

export interface CreateCitronBloomSceneOptions {
  lod?: BloomLod;
  /** Static mist particles near “ground” level — no solid mesh (default true). */
  enableGroundMist?: boolean;
}

export interface CitronBloomSceneHandle {
  readonly root: Group;
  update(delta: number, elapsed: number): void;
  /** Drive flower opening: 0 = buds, 1 = full bloom (smoothly animated). */
  setBloomTarget(main: number, branch?: number, bud?: number): void;
  setPointerWorld?(x: number, z: number, delta?: number, pointerVelocity?: number): void;
  syncEnvCamera?(camera: Camera): void;
  dispose(): void;
}

/**
 * DNA spines, micro-leaves, floral assembly, and optional static fog-mist specks (no solid ground).
 */
export function createCitronBloomScene(options: CreateCitronBloomSceneOptions): CitronBloomSceneHandle {
  const lod = options.lod ?? 'high';
  const profile = BLOOM_LOD_PROFILES[lod];
  const root = new Group();

  const enableMist = options.enableGroundMist !== false;
  const fogMist = enableMist ? createFlowerFogMistParticles(lod) : null;
  if (fogMist) {
    root.add(fogMist.group);
  }

  const ambientMotes = createFlowerAmbientMotes(lod);
  root.add(ambientMotes.group);

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
    wind: 0.72,
  });
  root.add(leaves.mesh);

  const phaseMain = new BloomPhaseController({ smoothSpeed: 0.178, pulseSpeed: 0.32 });
  const phaseBranch = new BloomPhaseController({ smoothSpeed: 0.165, pulseSpeed: 0.29 });
  const phaseBud = new BloomPhaseController({ smoothSpeed: 0.154, pulseSpeed: 0.27 });
  phaseMain.snapTo(0);
  phaseBranch.snapTo(0);
  phaseBud.snapTo(0);

  const floral = new FloralAssembly({ profile }, [phaseMain, phaseBranch, phaseBud]);
  root.add(floral);

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
      fogMist?.update(elapsed, delta, phaseMain.progress);
      ambientMotes.update(elapsed, delta, phaseMain.progress);
      if (fogMist) {
        const { phase, strength } = fogMist.getPetalRippleShimmer(elapsed);
        floral.setRippleShimmer(phase, strength);
      } else {
        floral.setRippleShimmer(0, 0);
      }
    },
    setPointerWorld(x: number, z: number, delta = 0, pointerVelocity = 0) {
      fogMist?.queuePointer(x, z, delta, pointerVelocity);
    },
    setBloomTarget(main: number, branch = main * 0.85, bud = main * 0.4) {
      phaseMain.setTarget(main);
      phaseBranch.setTarget(branch);
      phaseBud.setTarget(bud);
    },
    dispose() {
      fogMist?.dispose();
      ambientMotes.dispose();
      disposeDnaSpine(spineA);
      disposeDnaSpine(spineB);
      leaves.dispose();
      floral.dispose();
      root.removeFromParent();
    },
  };
}
