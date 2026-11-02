/* ==================================================================
   NETWORK ROUTING：中继小游戏。
   一格格管道段：旋转它们，直到有一条不间断的线路
   从入口通到出口，然后按 RUN 推送信号。
   目前只接通了等级 1；表格已为更难的棋盘做好准备。
   ================================================================== */

export interface RoutingTier {
  cols: number;
  rows: number;
  /** 散布在解路径之外的额外诱饵格子 */
  decoys: number;
  failRep: number;
}

export const ROUTING_TIERS: Record<number, RoutingTier> = {
  1: { cols: 5, rows: 3, decoys: 4, failRep: 0 },
};

export const usesRouting = (type: string, warden: number) =>
  type === "RELAY" && ROUTING_TIERS[warden] !== undefined;

/* ------------------------------------------------------------------ */
/* 一个格子就是一组开放的边：0=N 1=E 2=S 3=W                      */
/* ------------------------------------------------------------------ */

export type Side = 0 | 1 | 2 | 3;

export interface Cell {
  id: string;
  col: number;
  row: number;
  /** 按格子*当前*朝向得到的开放边 */
  sides: Side[];
  /** 玩家已应用的四分之一转数 */
  turns: number;
  /** 位于预期解路径上（调试 / 提示用） */
  onPath: boolean;
  kind: "pipe" | "inlet" | "outlet";
  fixed: boolean;
}

export interface RoutingBoard {
  cols: number;
  rows: number;
  cells: Cell[];
  inlet: string;
  outlet: string;
}

const rot = (s: Side, n: number): Side => (((s + n) % 4) as Side);
export const rotateSides = (sides: Side[], turns: number): Side[] =>
  sides.map((s) => rot(s, turns)).sort();

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const key = (c: number, r: number) => `${c}_${r}`;
const OPP: Record<Side, Side> = { 0: 2, 1: 3, 2: 0, 3: 1 };
const DELTA: Record<Side, [number, number]> = { 0: [0, -1], 1: [1, 0], 2: [0, 1], 3: [-1, 0] };

/** 从左边缘到右边缘开辟一条随机游走路径 */
function carvePath(cols: number, rows: number): { c: number; r: number }[] {
  const startRow = ri(0, rows - 1);
  const path = [{ c: 0, r: startRow }];
  const seen = new Set([key(0, startRow)]);
  let cur = { c: 0, r: startRow };
  let guard = 0;

  while (cur.c < cols - 1 && guard++ < 400) {
    /* 强烈偏向右侧，确保运行总会终止 */
    const opts: { c: number; r: number }[] = [];
    if (cur.c + 1 < cols) opts.push({ c: cur.c + 1, r: cur.r }, { c: cur.c + 1, r: cur.r });
    if (cur.r > 0) opts.push({ c: cur.c, r: cur.r - 1 });
    if (cur.r + 1 < rows) opts.push({ c: cur.c, r: cur.r + 1 });
    const free = opts.filter((o) => !seen.has(key(o.c, o.r)));
    if (!free.length) break;
    cur = free[Math.floor(Math.random() * free.length)];
    seen.add(key(cur.c, cur.r));
    path.push(cur);
  }
  /* 确保确实触及右边缘 */
  while (cur.c < cols - 1) {
    cur = { c: cur.c + 1, r: cur.r };
    if (seen.has(key(cur.c, cur.r))) break;
    seen.add(key(cur.c, cur.r));
    path.push(cur);
  }
  return path;
}

export function generateRouting(tier: RoutingTier): RoutingBoard {
  const { cols, rows } = tier;
  const path = carvePath(cols, rows);
  const onPath = new Map<string, Side[]>();

  /* 每一步都会打开来向的那一侧和去向的那一侧 */
  path.forEach((p, i) => {
    const sides: Side[] = [];
    const prev = path[i - 1];
    const next = path[i + 1];
    const link = (a: { c: number; r: number }, b: { c: number; r: number }): Side => {
      if (b.c > a.c) return 1;
      if (b.c < a.c) return 3;
      return b.r > a.r ? 2 : 0;
    };
    if (prev) sides.push(OPP[link(p, prev)] === link(p, prev) ? link(p, prev) : link(p, prev));
    if (next) sides.push(link(p, next));
    if (i === 0) sides.push(3);                       // 入口朝向左边缘
    if (i === path.length - 1) sides.push(1);         // 出口朝向右边缘
    onPath.set(key(p.c, p.r), [...new Set(sides)].sort() as Side[]);
  });

  const cells: Cell[] = [];
  const first = path[0];
  const last = path[path.length - 1];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = key(c, r);
      const sol = onPath.get(k);
      const isIn = c === first.c && r === first.r;
      const isOut = c === last.c && r === last.r;
      if (sol) {
        /* 打乱除两个端点之外的所有格子 */
        const turns = isIn || isOut ? 0 : ri(1, 3);
        cells.push({
          id: k, col: c, row: r,
          sides: sol, turns,
          onPath: true,
          kind: isIn ? "inlet" : isOut ? "outlet" : "pipe",
          fixed: isIn || isOut,
        });
      }
    }
  }

  /* 空格上的诱饵段：它们永远无法构成回路 */
  const empty: { c: number; r: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) if (!onPath.has(key(c, r))) empty.push({ c, r });
  empty.sort(() => Math.random() - 0.5).slice(0, tier.decoys).forEach(({ c, r }) => {
    const shapes: Side[][] = [[0, 2], [1, 3], [0, 1], [1, 2], [2, 3], [3, 0], [0, 1, 2]];
    cells.push({
      id: key(c, r), col: c, row: r,
      sides: shapes[Math.floor(Math.random() * shapes.length)],
      turns: ri(0, 3), onPath: false, kind: "pipe", fixed: false,
    });
  });

  return { cols, rows, cells, inlet: key(first.c, first.r), outlet: key(last.c, last.r) };
}

/** 玩家旋转之后，格子当前呈现的各边 */
export const liveSides = (cell: Cell): Side[] => rotateSides(cell.sides, cell.turns);

/**
 * 从入口开始遍历回路。返回相连的格子 id，
 * 以及信号是否到达出口。
 */
export function traceCircuit(board: RoutingBoard): { lit: Set<string>; solved: boolean } {
  const at = new Map(board.cells.map((c) => [c.id, c]));
  const lit = new Set<string>();
  const queue = [board.inlet];
  lit.add(board.inlet);

  while (queue.length) {
    const id = queue.shift()!;
    const cell = at.get(id);
    if (!cell) continue;
    liveSides(cell).forEach((side) => {
      const [dc, dr] = DELTA[side];
      const nk = key(cell.col + dc, cell.row + dr);
      const nb = at.get(nk);
      if (!nb || lit.has(nk)) return;
      /* 相邻格子必须在朝向我们的一侧也开放 */
      if (!liveSides(nb).includes(OPP[side])) return;
      lit.add(nk);
      queue.push(nk);
    });
  }
  return { lit, solved: lit.has(board.outlet) };
}

/** 按入口 → 出口排序的路径，用于信号动画 */
export function signalPath(board: RoutingBoard): string[] {
  const at = new Map(board.cells.map((c) => [c.id, c]));
  const prev = new Map<string, string>();
  const seen = new Set([board.inlet]);
  const queue = [board.inlet];

  while (queue.length) {
    const id = queue.shift()!;
    if (id === board.outlet) break;
    const cell = at.get(id);
    if (!cell) continue;
    liveSides(cell).forEach((side) => {
      const [dc, dr] = DELTA[side];
      const nk = key(cell.col + dc, cell.row + dr);
      const nb = at.get(nk);
      if (!nb || seen.has(nk) || !liveSides(nb).includes(OPP[side])) return;
      seen.add(nk);
      prev.set(nk, id);
      queue.push(nk);
    });
  }

  if (!seen.has(board.outlet)) return [];
  const out: string[] = [];
  let cur: string | undefined = board.outlet;
  while (cur) { out.unshift(cur); cur = prev.get(cur); }
  return out;
}
