/**
 * Hydra 2.0–inspired scene index (TypeScript sketch for Citron Bloom).
 *
 * Mirrors the ideas in Pixar’s USD Hydra docs: prims addressed by path, hierarchical traversal,
 * and coarse-grained notices ({@link BloomSceneIndexObserver}) analogous to PrimsAdded /
 * PrimsRemoved / PrimsDirtied — see the
 * [Hydra 2.0 Getting Started Guide](https://openusd.org/dev/api/_page__hydra__getting__started__guide.html).
 *
 * This is not USD; it does not load .usda. It exposes the same *shape* of API so tooling,
 * overlays, and future render hints can subscribe without touching Three.js objects directly.
 */

import type { BloomLod } from '../bloom-core/types';

/** SdfPath-style absolute path, e.g. `/registry/flower`. */
export type BloomPrimPath = string;

export interface BloomSceneIndexPrim {
  /** Empty string means “no prim” in Hydra terms; unreachable paths return `null` from {@link BloomCitronSceneIndex.getPrim}. */
  readonly primType: string;
  /**
   * Open-ended payload (Hydra container / datasource facade).
   * Keep JSON-serializable where possible for devtools.
   */
  readonly data: Readonly<Record<string, unknown>>;
}

export interface BloomPrimAddedEntry {
  readonly path: BloomPrimPath;
  readonly primType: string;
}

export interface BloomPrimRemovedEntry {
  /** Subtree root: prim and descendants removed (Hydra semantics). */
  readonly path: BloomPrimPath;
}

export interface BloomPrimDirtiedEntry {
  readonly path: BloomPrimPath;
  /**
   * Hierarchical locators, Hydra-style (`displayColor` → invalidates children).
   * Example: `['experience']`, `['experience', 'lod']`.
   */
  readonly dirtyLocators: readonly string[];
}

export interface BloomSceneIndexObserver {
  primsAdded(sender: unknown, entries: ReadonlyArray<BloomPrimAddedEntry>): void;
  primsRemoved(sender: unknown, entries: ReadonlyArray<BloomPrimRemovedEntry>): void;
  primsDirtied(sender: unknown, entries: ReadonlyArray<BloomPrimDirtiedEntry>): void;
}

const ROOT: BloomPrimPath = '/';
const REGISTRY: BloomPrimPath = '/registry';

function childPath(parent: BloomPrimPath, segment: string): BloomPrimPath {
  if (parent === ROOT) return `/${segment}`;
  return `${parent}/${segment}`;
}

/**
 * Originating scene index for registered experience factories + the active experience prim.
 * Updated only from {@link BloomExperienceRegistry} (single writer).
 */
export class BloomCitronSceneIndex {
  private readonly observers = new Set<BloomSceneIndexObserver>();
  private readonly factoryIds = new Set<string>();
  private activeId: string | null = null;
  private activeLod: BloomLod | null = null;

  addObserver(o: BloomSceneIndexObserver): void {
    this.observers.add(o);
  }

  removeObserver(o: BloomSceneIndexObserver): void {
    this.observers.delete(o);
  }

  /** @internal Called from {@link BloomExperienceRegistry.register}. */
  trackFactory(id: string): void {
    const path = childPath(REGISTRY, id);
    const existed = this.factoryIds.has(id);
    this.factoryIds.add(id);
    // Hydra: PrimsAdded on an existing prim acts as a resync (factory replaced).
    this.sendAdded([{ path, primType: 'bloomExperienceFactory' }]);
    if (existed) {
      this.sendDirtied([{ path, dirtyLocators: ['factory', 'implementation'] }]);
    }
  }

  /** @internal Called from {@link BloomExperienceRegistry.unregister}. */
  untrackFactory(id: string): void {
    if (!this.factoryIds.delete(id)) return;
    this.sendRemoved([{ path: childPath(REGISTRY, id) }]);
  }

  /** @internal Called from {@link BloomExperienceRegistry.activate} after the new scene is active. */
  setActiveExperience(id: string, lod: BloomLod): void {
    const prevId = this.activeId;
    const prevLod = this.activeLod;
    this.activeId = id;
    this.activeLod = lod;
    if (prevId === null) {
      this.sendAdded([{ path: '/active', primType: id }]);
      return;
    }
    if (prevId !== id) {
      this.sendRemoved([{ path: '/active' }]);
      this.sendAdded([{ path: '/active', primType: id }]);
      return;
    }
    if (prevLod !== lod) {
      this.sendDirtied([{ path: '/active', dirtyLocators: ['experience', 'lod'] }]);
    }
  }

  /** @internal Called from {@link BloomExperienceRegistry.disposeActive}. */
  clearActive(): void {
    if (this.activeId === null) return;
    this.activeId = null;
    this.activeLod = null;
    this.sendRemoved([{ path: '/active' }]);
  }

  /**
   * Returns prim data for `path`, or `null` if the path is not part of the index topology
   * (cf. empty prim in Hydra).
   */
  getPrim(path: BloomPrimPath): BloomSceneIndexPrim | null {
    if (path === ROOT) {
      return { primType: 'bloomRoot', data: { engine: 'citron-bloom' } };
    }
    if (path === REGISTRY) {
      return { primType: 'bloomExperienceRegistry', data: { count: this.factoryIds.size } };
    }
    if (path.startsWith(`${REGISTRY}/`)) {
      const id = path.slice(REGISTRY.length + 1);
      if (!id.includes('/') && this.factoryIds.has(id)) {
        return { primType: 'bloomExperienceFactory', data: { id } };
      }
      return null;
    }
    if (path === '/active') {
      if (this.activeId === null || this.activeLod === null) return null;
      return {
        primType: this.activeId,
        data: {
          id: this.activeId,
          lod: this.activeLod,
          role: 'bloomActiveExperience',
        },
      };
    }
    return null;
  }

  getChildPrimPaths(parentPath: BloomPrimPath): BloomPrimPath[] {
    if (parentPath === ROOT) {
      const out: BloomPrimPath[] = [REGISTRY];
      if (this.activeId !== null) out.push('/active');
      return out;
    }
    if (parentPath === REGISTRY) {
      return [...this.factoryIds].sort().map((id) => childPath(REGISTRY, id));
    }
    return [];
  }

  private sendAdded(entries: BloomPrimAddedEntry[]): void {
    for (const o of this.observers) o.primsAdded(this, entries);
  }

  private sendRemoved(entries: BloomPrimRemovedEntry[]): void {
    for (const o of this.observers) o.primsRemoved(this, entries);
  }

  private sendDirtied(entries: BloomPrimDirtiedEntry[]): void {
    for (const o of this.observers) o.primsDirtied(this, entries);
  }
}

/** Shared scene index — kept in sync by {@link BloomExperienceRegistry}. */
export const citronBloomSceneIndex = new BloomCitronSceneIndex();
