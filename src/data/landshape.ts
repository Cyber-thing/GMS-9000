import type { LandGrid } from "./world";

/* 将粗略陆地位图转换为连续海岸线轮廓。 */
/* 将与水域相邻的单元边连接成闭合环。 */
/* 对阶梯状边角进行圆滑处理。 */
/* 使大陆显示为连续形状而非方块拼图。 */

export type Pt = [number, number];

/** 遍历单元边界并连接成闭合轮廓，陆地位于右侧。 */
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

/** 删除直线段中的冗余点，仅保留海岸线拐角。 */
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

/** 使用闭合二次样条连接多边形中点。 */
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
  /** 所有陆地的填充轮廓，包含内部孔洞。 */
  path: string;
  /** 记录生成的独立闭合轮廓数量。 */
  rings: number;
}

/** 在指定尺寸内生成大陆轮廓。 */
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
