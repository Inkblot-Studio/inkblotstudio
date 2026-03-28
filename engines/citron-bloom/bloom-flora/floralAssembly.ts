import { Group, Mesh, Vector3 } from 'three';
import { catmullFromPoints, stemPoints, branchTip } from '../bloom-curves/curveUtils';
import { createDnaSpineMesh, disposeDnaSpine, updateDnaSpineTime } from '../bloom-curves/dnaSpine';
import type { BloomLodProfile } from '../bloom-core/types';
import { defaultFlowerLayers, ProceduralFlower } from './proceduralFlower';
import type { BloomPhaseController } from './bloomPhase';

export interface FloralAssemblyOptions {
  profile: BloomLodProfile;
  /** World-space tips for primary and secondary flower heads (relative to assembly origin). */
  mainTip?: Vector3;
  branchFrom?: number;
}

/**
 * Multi-stem arrangement with primary + branching flowers for complex blooming compositions.
 */
export class FloralAssembly extends Group {
  private readonly stems: Mesh[] = [];
  private readonly flowers: ProceduralFlower[] = [];
  private readonly phases: BloomPhaseController[];

  constructor(
    options: FloralAssemblyOptions,
    phases: BloomPhaseController[],
  ) {
    super();
    this.phases = phases;
    const p = options.profile;
    const mainTip = options.mainTip ?? new Vector3(0.35, 1.55, 0.12);
    const branchFrom = options.branchFrom ?? 0.52;

    const mainPts = stemPoints(mainTip, 0.42, p.spineTubularSegments);
    const mainCurve = catmullFromPoints(mainPts, false);
    const mainStem = createDnaSpineMesh({
      curve: mainCurve,
      tubularSegments: p.spineTubularSegments,
      radialSegments: p.spineRadialSegments,
      radius: 0.038,
      twist: 2.2,
    });
    this.stems.push(mainStem);
    this.add(mainStem);

    const mainFlower = new ProceduralFlower({
      layers: defaultFlowerLayers(),
      maxPetals: p.maxPetals,
      coreScale: 1.05,
    });
    const end = mainCurve.getPointAt(1);
    const tan = mainCurve.getTangentAt(1).normalize();
    mainFlower.position.copy(end);
    mainFlower.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), tan);
    this.flowers.push(mainFlower);
    this.add(mainFlower);

    const startB = mainCurve.getPointAt(branchFrom);
    const branchEnd = branchTip(mainCurve, branchFrom, 0.62);
    const branchPts = stemPoints(
      branchEnd.clone().sub(startB),
      0.28,
      Math.floor(p.spineTubularSegments * 0.65),
    );
    for (let i = 0; i < branchPts.length; i++) {
      branchPts[i].add(startB);
    }
    const branchCurve = catmullFromPoints(branchPts, false);
    const branchStem = createDnaSpineMesh({
      curve: branchCurve,
      tubularSegments: Math.floor(p.spineTubularSegments * 0.65),
      radialSegments: Math.max(5, p.spineRadialSegments - 2),
      radius: 0.028,
      twist: 3.0,
    });
    this.stems.push(branchStem);
    this.add(branchStem);

    const branchFlower = new ProceduralFlower({
      layers: defaultFlowerLayers().map((l) => ({
        ...l,
        radius: l.radius * 0.72,
        petalCount: Math.max(5, Math.floor(l.petalCount * 0.75)),
        scale: l.scale * 0.88,
      })),
      maxPetals: Math.floor(p.maxPetals * 0.65),
      coreScale: 0.82,
    });
    const bEnd = branchCurve.getPointAt(1);
    const bTan = branchCurve.getTangentAt(1).normalize();
    branchFlower.position.copy(bEnd);
    branchFlower.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), bTan);
    this.flowers.push(branchFlower);
    this.add(branchFlower);

    const budStart = mainCurve.getPointAt(0.22).clone().add(new Vector3(-0.06, 0.04, 0));
    const budTarget = budStart.clone().add(new Vector3(-0.42, 0.5, 0.18));
    const budPts = stemPoints(
      budTarget.clone().sub(budStart),
      0.2,
      Math.floor(p.spineTubularSegments * 0.45),
    );
    for (let i = 0; i < budPts.length; i++) {
      budPts[i].add(budStart);
    }
    const budCurve = catmullFromPoints(budPts, false);
    const budStem = createDnaSpineMesh({
      curve: budCurve,
      tubularSegments: Math.floor(p.spineTubularSegments * 0.45),
      radialSegments: Math.max(5, p.spineRadialSegments - 3),
      radius: 0.02,
      twist: 4.0,
    });
    this.stems.push(budStem);
    this.add(budStem);

    const budFlower = new ProceduralFlower({
      layers: defaultFlowerLayers().map((l) => ({
        ...l,
        radius: l.radius * 0.38,
        petalCount: Math.max(4, Math.floor(l.petalCount * 0.45)),
        scale: l.scale * 0.55,
        tilt: l.tilt * 1.25,
      })),
      maxPetals: Math.floor(p.maxPetals * 0.35),
      coreScale: 0.45,
    });
    const budEnd = budCurve.getPointAt(1);
    const budTan = budCurve.getTangentAt(1).normalize();
    budFlower.position.copy(budEnd);
    budFlower.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), budTan);
    this.flowers.push(budFlower);
    this.add(budFlower);
  }

  applyBloomFromPhases(): void {
    this.flowers.forEach((f, i) => {
      const phase = this.phases[i % this.phases.length];
      f.setBloom(phase.progress, phase.pulse);
    });
  }

  update(elapsed: number, wind: number): void {
    for (const s of this.stems) {
      updateDnaSpineTime(s, elapsed, wind);
    }
    for (const f of this.flowers) {
      f.update(elapsed);
      f.setWind(wind);
    }
  }

  /** Ground ripple shimmer on instanced petals (aggregate signal from mist). */
  setRippleShimmer(phase: number, strength: number): void {
    for (const f of this.flowers) {
      f.setRippleShimmer(phase, strength);
    }
  }

  dispose(): void {
    for (const s of this.stems) disposeDnaSpine(s);
    for (const f of this.flowers) f.dispose();
  }
}
