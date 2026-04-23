type EngineOk = { ok: true };
type EngineErr = { ok: false; error: unknown };
export type EngineResult = EngineOk | EngineErr;

let settled: EngineResult | null = null;
const waiters: Array<(r: EngineResult) => void> = [];

/**
 * Fired once when the 3D engine chunk finishes (success or failure).
 * Guarded: additional calls are ignored.
 */
export function reportEngineResult(ok: boolean, error?: unknown): void {
  if (settled) return;
  settled = ok ? { ok: true } : { ok: false, error: error ?? new Error('Engine load failed') };
  for (const w of waiters) w(settled);
  waiters.length = 0;
}

export function getEngineResult(): Promise<EngineResult> {
  if (settled) return Promise.resolve(settled);
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}
