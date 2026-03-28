import type { Camera, Texture } from 'three';
import { Group } from 'three';
import type { BloomLod } from '../bloom-core/types';
import { BloomGraphBuilder, DEFAULT_CITRON_BLOOM_GRAPH } from '../bloom-runtime/bloomSceneGraph';

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
  setEnvMap?(texture: Texture | null, intensity?: number): void;
  dispose(): void;
}

/**
 * DNA spines, micro-leaves, floral assembly, and optional static fog-mist specks (no solid ground)
 * generated from a serializable JSON node graph.
 */
export function createCitronBloomScene(options: CreateCitronBloomSceneOptions): CitronBloomSceneHandle {
  const lod = options.lod ?? 'high';
  
  // Clone default graph to modify if needed
  const graph = JSON.parse(JSON.stringify(DEFAULT_CITRON_BLOOM_GRAPH));
  if (options.enableGroundMist === false) {
    const mistNode = graph.nodes.find((n: any) => n.type === 'FogMist');
    if (mistNode) mistNode.params.enable = false;
  }

  const builder = new BloomGraphBuilder(graph, lod);
  const wind = { value: 1 };

  return {
    root: builder.root,
    update(delta: number, elapsed: number) {
      builder.update(delta, elapsed, wind.value);
    },
    setPointerWorld(x: number, z: number, delta = 0, pointerVelocity = 0) {
      builder.setPointerWorld(x, z, delta, pointerVelocity);
    },
    setBloomTarget(main: number, branch = main * 0.85, bud = main * 0.4) {
      builder.setBloomTarget(main, branch, bud);
    },
    setEnvMap(texture: Texture | null, intensity?: number) {
      builder.setEnvMap(texture, intensity);
    },
    dispose() {
      builder.dispose();
    },
  };
}
