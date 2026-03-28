/**
 * Single-input filtering scene index — same role as HdSingleInputFilteringSceneIndexBase in Hydra 2.0:
 * observe an upstream index, optionally transform {@link getBloomPrimFromFilter} results, and forward
 * notices to downstream observers. See
 * [Hydra 2.0 — Filtering Scene Indices](https://openusd.org/dev/api/_page__hydra__getting__started__guide.html).
 */

import type {
  BloomPrimPath,
  BloomPrimAddedEntry,
  BloomPrimDirtiedEntry,
  BloomPrimRemovedEntry,
  BloomSceneIndexObserver,
  BloomSceneIndexPrim,
} from './bloomSceneIndex';

/** Read-only facet of {@link BloomCitronSceneIndex} used by filters. */
export interface BloomSceneIndexInput {
  getPrim(path: BloomPrimPath): BloomSceneIndexPrim | null;
  getChildPrimPaths(parentPath: BloomPrimPath): BloomPrimPath[];
  addObserver(o: BloomSceneIndexObserver): void;
  removeObserver(o: BloomSceneIndexObserver): void;
}

/**
 * Thin wrapper: delegates topology to `input`, overrides prim *data* for one path only.
 * Demonstrates overlay composition similar to HdOverlayContainerDataSource.
 */
export class BloomDataOverlayFilter implements BloomSceneIndexInput {
  private readonly downstreamObservers = new Set<BloomSceneIndexObserver>();
  private readonly upstreamObserver: BloomSceneIndexObserver;

  constructor(
    private readonly input: BloomSceneIndexInput,
    private readonly overlayPath: BloomPrimPath,
    private readonly overlay: Readonly<Record<string, unknown>>,
  ) {
    this.upstreamObserver = {
      primsAdded: (sender, entries) => this.forwardAdded(sender, entries),
      primsRemoved: (sender, entries) => this.forwardRemoved(sender, entries),
      primsDirtied: (sender, entries) => this.forwardDirtied(sender, entries),
    };
    this.input.addObserver(this.upstreamObserver);
  }

  dispose(): void {
    this.input.removeObserver(this.upstreamObserver);
    this.downstreamObservers.clear();
  }

  addObserver(o: BloomSceneIndexObserver): void {
    this.downstreamObservers.add(o);
  }

  removeObserver(o: BloomSceneIndexObserver): void {
    this.downstreamObservers.delete(o);
  }

  getChildPrimPaths(parentPath: BloomPrimPath): BloomPrimPath[] {
    return [...this.input.getChildPrimPaths(parentPath)];
  }

  getPrim(path: BloomPrimPath): BloomSceneIndexPrim | null {
    const base = this.input.getPrim(path);
    if (!base || path !== this.overlayPath) return base;
    return {
      primType: base.primType,
      data: { ...base.data, ...this.overlay },
    };
  }

  private forwardAdded(sender: unknown, entries: readonly BloomPrimAddedEntry[]): void {
    for (const o of this.downstreamObservers) o.primsAdded(sender, entries);
  }

  private forwardRemoved(sender: unknown, entries: readonly BloomPrimRemovedEntry[]): void {
    for (const o of this.downstreamObservers) o.primsRemoved(sender, entries);
  }

  private forwardDirtied(sender: unknown, entries: readonly BloomPrimDirtiedEntry[]): void {
    for (const o of this.downstreamObservers) o.primsDirtied(sender, entries);
  }
}
