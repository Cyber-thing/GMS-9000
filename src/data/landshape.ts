import type { LandGrid } from "./world";

/* ================================================================== */
/* 将粗糙的陆地位图转换为连续的海岸线轮廓。    */
/* 与水域相邻的格子边缘被串联成闭合的环，然后    */
/* 将阶梯状的拐角磨圆，使大陆看起来    */
/* 是实心形状，而不是方块拼成的马赛克。                        */
/* ================================================================== */

export type Pt = [number, number];

/** 沿着格子边界行走并将其串联成闭合的环（陆地在右侧） */
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

/** 移除位于直线段上的点，只保留真正的拐角 */
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

/** Chaikin 切角：把阶梯状变成有机的海岸线 */
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

/** 穿过多边形各边中点的闭合二次样条 */
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
  /** 所有陆块的填充轮廓，包含孔洞 */
  path: string;
  /** 追踪到的独立环的数量 */
  rings: number;
}

/**
 * 为缩放到 `w x h` 方框中的网格构建大陆轮廓。
 * `smooth` 是切角处理的遍数：0 保留硬像素边缘，
 * 2-3 可生成自然的海岸线。
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
