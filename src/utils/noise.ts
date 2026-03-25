/**
 * Simplex-style 2D/3D noise utilities.
 *
 * For production quality, consider importing a dedicated library
 * (e.g. simplex-noise) or a GPU-side implementation via shader includes.
 * The functions below are CPU-side helpers for procedural placement, animation
 * offsets, and system-level randomness that doesn't need GPU throughput.
 */

/** Deterministic pseudo-random hash — suitable for seeded noise. */
export function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h ^ (h >> 16)) >>> 0;
}

/** Normalized hash → [0, 1). */
export function hashNorm(x: number, y: number): number {
  return hash(x, y) / 4294967296;
}

/**
 * 2D value noise (bi-linear interpolation of lattice hashes).
 * Returns value in [0, 1).
 */
export function valueNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hashNorm(ix, iy);
  const n10 = hashNorm(ix + 1, iy);
  const n01 = hashNorm(ix, iy + 1);
  const n11 = hashNorm(ix + 1, iy + 1);

  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);

  return nx0 + sy * (nx1 - nx0);
}

/**
 * Fractional Brownian Motion — layered value noise.
 * `octaves` controls detail; `persistence` controls amplitude falloff.
 */
export function fbm(
  x: number,
  y: number,
  octaves = 4,
  persistence = 0.5,
  lacunarity = 2.0,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxAmplitude = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise2D(x * frequency, y * frequency);
    maxAmplitude += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxAmplitude;
}
