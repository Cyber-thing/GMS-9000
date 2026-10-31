import type { LandGrid } from "./world";

/* ================================================================== */
/* Turns the coarse land bitmap into continuous coastline outlines.    */
/* Cell edges that border water are chained into closed rings, then    */
/* the staircase corners are rounded off, so the continents read as    */
/* solid shapes instead of a mosaic of squares.                        */
/* ================================================================== */

export type Pt = [number, number];

/** walks cell borders and chains them into closed rings (land on the right) */
export function traceRings(grid: LandGrid): Pt[][] {
  const { cols, rows, land } = grid;
  const isLand = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < cols && r < rows && land[r * cols + c] === 1;

  const key = (x: number, y: number) => `${x},${y}`;
  const edges = new Map<string, Pt[]>();
  const addEdge = (a: Pt, b: Pt) => {
    const k = key(a[0], a[1]);
    const arr = edges.get(k);
    if (arr) arr.push(b);
    else edges.set(k, [b]);
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isLand(c, r)) continue;
      if (!isLand(c, r - 1)) addEdge([c, r], [c + 1, r]);
      if (!isLand(c + 1, r)) addEdge([c + 1, r], [c + 1, r + 1]);
      if (!isLand(c, r + 1)) addEdge([c + 1, r + 1], [c, r + 1]);
      if (!isLand(c - 1, r)) addEdge([c, r + 1], [c, r]);
    }
  }

  const rings: Pt[][] = [];
  let guard = 0;
  while (edges.size && guard++ < 20000) {
    const startKey = edges.keys().next().value as string;
    const [sx, sy] = startKey.split(",").map(Number);
    const ring: Pt[] = [];
    let cur: Pt = [sx, sy];

    for (let step = 0; step < 20000; step++) {
      const k = key(cur[0], cur[1]);
      const arr = edges.get(k);
      if (!arr || arr.length === 0) break;
      const next = arr.pop() as Pt;
      if (arr.length === 0) edges.delete(k);
      ring.push(cur);
      cur = next;
      if (cur[0] === sx && cur[1] === sy) break;
    }
    if (ring.length > 2) rings.push(ring);
  }
  return rings;
}

/** removes points that sit on a straight run, leaving only real corners */
function corners(ring: Pt[]): Pt[] {
  const n = ring.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = ring[i];
    const a = ring[(i - 1 + n) % n];
    const b = ring[(i + 1) % n];
    const cross = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]);
    if (cross !== 0) out.push(p);
  }
  return out.length > 2 ? out : ring;
}

/** Chaikin corner cutting — turns the staircase into an organic coastline */
function chaikin(ring: Pt[], iterations: number): Pt[] {
  let cur = ring;
  for (let it = 0; it < iterations; it++) {
    const next: Pt[] = [];
    const n = cur.length;
    for (let i = 0; i < n; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % n];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    cur = next;
  }
  return cur;
}

/** closed quadratic spline through the midpoints of a polygon */
function splinePath(ring: Pt[]): string {
  const n = ring.length;
  if (n < 3) return "";
  const f = (v: number) => Math.round(v * 10) / 10;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  const start = mid(ring[n - 1], ring[0]);
  let d = `M${f(start[0])} ${f(start[1])}`;
  for (let i = 0; i < n; i++) {
    const cur = ring[i];
    const end = mid(cur, ring[(i + 1) % n]);
    d += `Q${f(cur[0])} ${f(cur[1])} ${f(end[0])} ${f(end[1])}`;
  }
  return d + "Z";
}

export interface LandShape {
  /** filled silhouette of every landmass, holes included */
  path: string;
  /** how many separate rings were traced */
  rings: number;
}

/**
 * Builds the continent silhouette for a grid scaled into a `w x h` box.
 * `smooth` is the number of corner-cutting passes: 0 keeps hard pixel edges,
 * 2-3 produce a natural looking coastline.
 */
export function landShape(grid: LandGrid, w: number, h: number, smooth = 2): LandShape {
  const sx = w / grid.cols;
  const sy = h / grid.rows;
  const rings = traceRings(grid)
    .map(corners)
    .map((r) => r.map(([x, y]) => [x * sx, y * sy] as Pt))
    .map((r) => (smooth > 0 ? chaikin(r, smooth) : r));

  return {
    path: rings.map(splinePath).join(" "),
    rings: rings.length,
  };
}
