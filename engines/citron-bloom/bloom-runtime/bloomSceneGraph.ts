import { Group, type Texture, Vector3 } from 'three';
import { catmullFromPoints, dnaHelixPoints } from '../bloom-curves/curveUtils';
import { createDnaSpineMesh, updateDnaSpineTime, disposeDnaSpine } from '../bloom-curves/dnaSpine';
import { InstancedMicroLeaves } from '../bloom-core/instancedMicroLeaves';
import { BloomPhaseController } from '../bloom-flora/bloomPhase';
import { createFlowerAmbientMotes } from '../bloom-flora/createFlowerAmbientMotes';
import { createFlowerFogMistParticles } from '../bloom-flora/createFlowerFogMistParticles';
import { FloralAssembly } from '../bloom-flora/floralAssembly';
import { BLOOM_LOD_PROFILES, type BloomLod } from '../bloom-core/types';

export type BloomNodeType = 
  | 'FogMist' 
  | 'AmbientMotes' 
  | 'DnaSpine' 
  | 'MicroLeaves' 
  | 'FloralAssembly';

export interface BloomSceneNode {
  id: string;
  type: BloomNodeType;
  params?: Record<string, any>;
}

export interface BloomSceneGraph {
  nodes: BloomSceneNode[];
}

export const DEFAULT_CITRON_BLOOM_GRAPH: BloomSceneGraph = {
  nodes: [
    { id: 'floral', type: 'FloralAssembly' }
  ]
};

export class BloomGraphBuilder {
  root = new Group();
  private fogMist: any = null;
  private ambientMotes: any = null;
  private spines: any[] = [];
  private leaves: any = null;
  private floral: any = null;
  
  phaseMain = new BloomPhaseController({ smoothSpeed: 0.178, pulseSpeed: 0.32 });
  phaseBranch = new BloomPhaseController({ smoothSpeed: 0.165, pulseSpeed: 0.29 });
  phaseBud = new BloomPhaseController({ smoothSpeed: 0.154, pulseSpeed: 0.27 });

  constructor(public graph: BloomSceneGraph, public lod: BloomLod) {
    const profile = BLOOM_LOD_PROFILES[lod];
    this.phaseMain.snapTo(0);
    this.phaseBranch.snapTo(0);
    this.phaseBud.snapTo(0);

    for (const node of graph.nodes) {
      if (node.type === 'FogMist') {
        if (node.params?.enable !== false) {
          this.fogMist = createFlowerFogMistParticles(lod);
          this.root.add(this.fogMist.group);
        }
      } else if (node.type === 'AmbientMotes') {
        this.ambientMotes = createFlowerAmbientMotes(lod);
        this.root.add(this.ambientMotes.group);
      } else if (node.type === 'DnaSpine') {
        const offset = node.params?.offset || [0, 0, 0];
        const phase = node.params?.phase || 0;
        const pts = dnaHelixPoints(2.8, 0.22, 1.35, profile.spineTubularSegments, phase);
        const curve = catmullFromPoints(
          pts.map((p) => p.clone().add(new Vector3(offset[0], offset[1], offset[2]))),
          false
        );
        const spine = createDnaSpineMesh({
          curve,
          tubularSegments: profile.spineTubularSegments,
          radialSegments: profile.spineRadialSegments,
          radius: 0.036,
          twist: 2.4,
        });
        this.spines.push(spine);
        this.root.add(spine);
      } else if (node.type === 'MicroLeaves') {
        const leafCurve = catmullFromPoints(
          dnaHelixPoints(3.2, 0.55, 1.6, 64, 0.4).map((p) => p.clone().multiplyScalar(1.05)),
          false
        );
        this.leaves = new InstancedMicroLeaves({
          count: profile.microLeafInstances,
          curve: leafCurve,
          wind: 0.72,
        });
        this.root.add(this.leaves.mesh);
      } else if (node.type === 'FloralAssembly') {
        this.floral = new FloralAssembly({ profile }, [this.phaseMain, this.phaseBranch, this.phaseBud]);
        this.root.add(this.floral);
      }
    }
  }

  update(delta: number, elapsed: number, wind: number) {
    this.phaseMain.update(delta);
    this.phaseBranch.update(delta);
    this.phaseBud.update(delta);

    if (this.floral) {
      this.floral.applyBloomFromPhases();
      this.floral.update(elapsed, wind);
    }
    
    for (const s of this.spines) {
      updateDnaSpineTime(s, elapsed, wind);
    }
    
    if (this.leaves) this.leaves.update(elapsed);
    if (this.fogMist) this.fogMist.update(elapsed, delta, this.phaseMain.progress);
    if (this.ambientMotes) this.ambientMotes.update(elapsed, delta, this.phaseMain.progress);
    
    if (this.floral) {
      if (this.fogMist) {
        const { phase, strength } = this.fogMist.getPetalRippleShimmer(elapsed);
        this.floral.setRippleShimmer(phase, strength);
      } else {
        this.floral.setRippleShimmer(0, 0);
      }
    }
  }

  setPointerWorld(x: number, z: number, delta = 0, pointerVelocity = 0) {
    if (this.fogMist) this.fogMist.queuePointer(x, z, delta, pointerVelocity);
  }

  setBloomTarget(main: number, branch = main * 0.85, bud = main * 0.4) {
    this.phaseMain.setTarget(main);
    this.phaseBranch.setTarget(branch);
    this.phaseBud.setTarget(bud);
  }

  setEnvMap(texture: Texture | null, intensity?: number) {
    if (this.floral) this.floral.setEnvMap(texture, intensity);
  }

  dispose() {
    if (this.fogMist) this.fogMist.dispose();
    if (this.ambientMotes) this.ambientMotes.dispose();
    for (const s of this.spines) disposeDnaSpine(s);
    if (this.leaves) this.leaves.dispose();
    if (this.floral) this.floral.dispose();
    this.root.removeFromParent();
  }
}
