import { NODE_META } from "./data";
import { ALL_NODES } from "../data/regions";

/* ================================================================== */
/* BREACH：节点入侵小游戏                                   */
/* ------------------------------------------------------------------ */
/* 每个格子都带有一个十六进制表达式；解出它即得到 */
/* 该格子加载所需的秒数。WARDEN 在进入 10 秒后苏醒（或在   */
/* 第一次解出跳转后立即苏醒），然后开始追捕操作员。*/
/* 等级会使需要覆盖的路程翻倍：1、2、4、8、16 个格子。       */
/* ================================================================== */

export interface BreachTier {
  /** ENTRY 与 ACCESS 之间必须穿过的格子数 */
  hops: number;
  /** WARDEN 倒计时，单位为秒 */
  timerSec: number;
  /** 在地图中停留这么多毫秒后，倒计时也会自行启动 */
  alarmMs: number;
  /** 锁定时扣除的 REP */
  failRep: number;
  /** 拨号握手时长，单位为毫秒 */
  dialMs: number;
  /** 示意图最宽可以到多宽 */
  maxRows: number;
}

export const BREACH_TIERS: Record<number, BreachTier> = {
  1: { hops: 1,  timerSec: 25, alarmMs: 10000, failRep: 8,  dialMs: 2600, maxRows: 2 },
  2: { hops: 2,  timerSec: 28, alarmMs: 10000, failRep: 12, dialMs: 2600, maxRows: 3 },
  3: { hops: 4,  timerSec: 40, alarmMs: 10000, failRep: 18, dialMs: 2800, maxRows: 3 },
  4: { hops: 8,  timerSec: 68, alarmMs: 10000, failRep: 26, dialMs: 3000, maxRows: 4 },
  5: { hops: 16, timerSec: 118, alarmMs: 10000, failRep: 36, dialMs: 3200, maxRows: 4 },
};

export const MAX_CELL_SECONDS = 15;

/** ACCESS 主机始终进行小游戏，支持所有等级 */
export function usesBreach(nodeId: string): boolean {
  const n = ALL_NODES.find((x) => x.id === nodeId);
  const m = NODE_META[nodeId];
  if (!n || !m) return false;
  return n.type === "ACCESS" && BREACH_TIERS[m.warden] !== undefined;
}

export const tierOf = (nodeId: string): BreachTier | null => {
  const m = NODE_META[nodeId];
  return m ? BREACH_TIERS[m.warden] ?? null : null;
};

/* ------------------------------------------------------------------ */

export type CellKind = "ENTRY" | "RELAY" | "JUNCTION" | "BUFFER" | "GATEWAY" | "CIPHER" | "ACCESS";

export interface BreachCell {
  id: string;
  col: number;
  row: number;
  rows: number;
  kind: CellKind;
  /** 显示的十六进制表达式，例如 "0A-04" */
  expr: string;
  /** 该格子耗费的秒数，1..15 */
  cost: number;
}

export interface BreachLink {
  a: string;
  b: string;
}

export interface BreachMap {
  cells: BreachCell[];
  links: BreachLink[];
  entry: string;
  access: string;
  cols: number;
  tier: BreachTier;
}

const MID_KINDS: CellKind[] = ["RELAY", "JUNCTION", "BUFFER", "GATEWAY", "CIPHER"];

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const hex = (v: number) => v.toString(16).toUpperCase().padStart(2, "0");

/**
 * 构建一个值为 `want` 秒的十六进制表达式。
 * 混用加法和减法，使棋盘读起来像真实的算术。
 */
export function hexExpr(want: number): string {
  if (Math.random() < 0.5) {
    /* a - b = want */
    const b = ri(1, 12);
    return `${hex(want + b)}-${hex(b)}`;
  }
  /* a + b = want */
  const a = ri(1, Math.max(1, want - 1));
  return `${hex(a)}+${hex(want - a)}`;
}

/** 成本曲线：前面的格子便宜，后面的越来越贵，永不超过 15 秒 */
const costFor = (col: number, cols: number): number => {
  const depth = cols <= 2 ? 0 : (col - 1) / Math.max(1, cols - 2);
  const lo = Math.round(2 + depth * 3);
  const hi = Math.round(5 + depth * 7);
  return Math.max(1, Math.min(MAX_CELL_SECONDS, ri(lo, Math.min(MAX_CELL_SECONDS, hi))));
};

/**
 * 分层示意图：ENTRY → `hops` 列 → ACCESS。
 * 每列包含 1..maxRows 个格子，连线保证存在多条不同路线，
 * 同时每条路线的跳数相同。
 */
export function generateBreach(tier: BreachTier): BreachMap {
  const cells: BreachCell[] = [];
  const links: BreachLink[] = [];
  const cols = tier.hops + 2;

  cells.push({ id: "entry", col: 0, row: 0, rows: 1, kind: "ENTRY", expr: "", cost: 0 });

  const columns: string[][] = [];
  for (let c = 1; c <= tier.hops; c++) {
    /* 棋盘中间加宽，两端保持窄 */
    const t = tier.hops === 1 ? 1 : Math.sin((c / (tier.hops + 1)) * Math.PI);
    const maxHere = Math.max(1, Math.round(tier.maxRows * t));
    const n = tier.hops === 1 ? 1 : ri(Math.min(2, maxHere), Math.max(1, maxHere));
    const ids: string[] = [];
    for (let r = 0; r < n; r++) {
      const id = `c${c}_${r}`;
      ids.push(id);
      const cost = costFor(c, cols);
      cells.push({
        id, col: c, row: r, rows: n,
        kind: pick(MID_KINDS),
        expr: hexExpr(cost),
        cost,
      });
    }
    columns.push(ids);
  }

  cells.push({ id: "access", col: cols - 1, row: 0, rows: 1, kind: "ACCESS", expr: "", cost: 0 });

  const link = (a: string, b: string) => {
    if (!links.some((l) => l.a === a && l.b === b)) links.push({ a, b });
  };

  columns[0].forEach((id) => link("entry", id));

  for (let c = 0; c < columns.length - 1; c++) {
    const from = columns[c];
    const to = columns[c + 1];
    /* 每个格子都有一条向前的边 */
    from.forEach((a, i) => link(a, to[Math.min(i, to.length - 1)]));
    /* 下一列中的每个格子都保持可达 */
    to.forEach((b, j) => {
      if (!links.some((l) => l.b === b)) link(from[Math.min(j, from.length - 1)], b);
    });
    /* 额外的对角线，让操作员有真正的路线选择 */
    from.forEach((a, i) => {
      if (to.length > 1 && Math.random() < 0.62) {
        const alt = to[(i + 1) % to.length];
        link(a, alt);
      }
      if (to.length > 2 && Math.random() < 0.3) link(a, to[(i + 2) % to.length]);
    });
  }

  columns[columns.length - 1].forEach((id) => link(id, "access"));

  return { cells, links, entry: "entry", access: "access", cols, tier };
}

/** 从某个格子可到达的邻居（链路从左向右） */
export function neighboursOf(map: BreachMap, id: string): string[] {
  return map.links.filter((l) => l.a === id).map((l) => l.b);
}

/** 从 ENTRY 到 ACCESS 的最小总秒数，用于平衡性检查 */
export function cheapestRoute(map: BreachMap): number {
  const byId = new Map(map.cells.map((c) => [c.id, c]));
  const best = new Map<string, number>([[map.entry, 0]]);
  const order = [...map.cells].sort((a, b) => a.col - b.col);
  order.forEach((c) => {
    const base = best.get(c.id);
    if (base === undefined) return;
    neighboursOf(map, c.id).forEach((nb) => {
      const cost = base + (byId.get(nb)?.cost ?? 0);
      if (cost < (best.get(nb) ?? Infinity)) best.set(nb, cost);
    });
  });
  return best.get(map.access) ?? Infinity;
}

/* 布局辅助：绘图空间随棋盘增长 */
export const BOARD_H = 320;
export const boardWidth = (cols: number) => Math.max(560, Math.min(1080, 150 + cols * 86));

export function cellPos(cell: BreachCell, cols: number, boardW: number) {
  const x = 66 + (cell.col * (boardW - 132)) / Math.max(1, cols - 1);
  const span = 116;
  const y =
    cell.rows === 1
      ? BOARD_H / 2
      : BOARD_H / 2 - span / 2 + (cell.row * span) / (cell.rows - 1);
  return { x, y };
}
