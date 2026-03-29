import { Group, type Camera, type Texture } from 'three';
import type { BloomLod } from '../bloom-core/types';
import {
  BloomGraphBuilder,
  DEFAULT_CITRON_BLOOM_GRAPH,
  type BloomSceneGraph,
} from '../bloom-runtime/bloomSceneGraph';

export interface CreateCitronBloomSceneOptions {
  lod?: BloomLod;
  /** Static mist particles near “ground” level — no solid mesh (default true). */
  enableGroundMist?: boolean;
  /** When set, used instead of the default single-node graph (e.g. flower + glass pollen). */
  graph?: BloomSceneGraph;
}

export interface CitronBloomSceneHandle {
  readonly root: Group;
  update(delta: number, elapsed: number): void;
  /** Drive flower opening: 0 = buds, 1 = full bloom (smoothly animated). */
  setBloomTarget(main: number, branch?: number, bud?: number): void;
  setPointerWorld?(x: number, z: number, delta?: number, pointerVelocity?: number): void;
  syncEnvCamera?(camera: Camera): void;
  setEnvMap?(texture: Texture | null, intensity?: number): void;
  /** Section-0 pollen: gate [0,1], normalized scroll position [0,1] from host. */
  setPollenScrollDrive?(gate01: number, journeyProgress01: number): void;
  dispose(): void;
}

/**
 * DNA spines, micro-leaves, floral assembly, and optional static fog-mist specks (no solid ground)
 * generated from a serializable JSON node graph.
 */
export function createCitronBloomScene(options: CreateCitronBloomSceneOptions): CitronBloomSceneHandle {
  const lod = options.lod ?? 'high';

  const graph: BloomSceneGraph = options.graph
    ? options.graph
    : JSON.parse(JSON.stringify(DEFAULT_CITRON_BLOOM_GRAPH));

  if (!options.graph && options.enableGroundMist === false) {
    const mistNode = graph.nodes.find((n: { type?: string }) => n.type === 'FogMist');
    if (mistNode) mistNode.params = { ...mistNode.params, enable: false };
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
    syncEnvCamera(camera: Camera) {
      builder.syncGlassPollenCamera(camera);
    },
    setPollenScrollDrive(gate01: number, journeyProgress01: number) {
      builder.setPollenScrollDrive(gate01, journeyProgress01);
    },
    dispose() {
      builder.dispose();
    },
  };
}
