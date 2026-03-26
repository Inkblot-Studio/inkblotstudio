import { CatmullRomCurve3, CubicBezierCurve3, Vector3 } from 'three';

/**
 * Samples for a double-helix style spine (two strands).
 */
export function dnaHelixPoints(
  turns: number,
  radius: number,
  height: number,
  segments: number,
  phase = 0,
): Vector3[] {
  const pts: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = t * turns * Math.PI * 2 + phase;
    const y = (t - 0.5) * height;
    pts.push(new Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius));
  }
  return pts;
}

export function catmullFromPoints(points: Vector3[], closed = false): CatmullRomCurve3 {
  return new CatmullRomCurve3(points, closed, 'catmullrom', 0.5);
}

/**
 * Organic stem from origin toward `tip` with one bend.
 */
export function stemPoints(tip: Vector3, sag = 0.35, segments = 24): Vector3[] {
  const mid = new Vector3(
    tip.x * 0.45 + sag,
    tip.y * 0.35,
    tip.z * 0.45 - sag * 0.2,
  );
  const curve = new CubicBezierCurve3(
    new Vector3(0, 0, 0),
    new Vector3(0, tip.y * 0.22, 0),
    mid,
    tip.clone(),
  );
  const pts: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(curve.getPoint(i / segments));
  }
  return pts;
}

/**
 * World-space end point for a side branch leaving the main stem at `u` (0–1).
 */
export function branchTip(main: CatmullRomCurve3, u: number, length: number): Vector3 {
  const p = main.getPointAt(u);
  const tan = main.getTangentAt(u).normalize();
  const side = new Vector3(-tan.z, 0.2, tan.x).normalize();
  return p.clone().add(side.multiplyScalar(length)).add(new Vector3(0, length * 0.35, 0));
}
