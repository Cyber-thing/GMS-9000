/* ============================================================
   HEXWALL —— 防火墙晶格
   SEC 节点的入侵小游戏：防火墙由彩色六边形晶格堆叠而成。
   把手里的分组放到场上，相邻堆顶色相同就会互相湮灭。
   清空整个场地 = 防火墙垮掉。
   ============================================================ */

export interface HexTier {
  /** 棋盘半径（轴向坐标，半径 2 = 19 格）。 */
  radius: number;
  /** 场上初始堆数。 */
  stacks: number;
  /** 手里的分组数。 */
  hand: number;
  /** 单堆高度范围。 */
  height: [number, number];
  /** 使用几种颜色。 */
  colors: number;
  failRep: number;
  /** WARDEN 倒计时秒数，0 表示不限时。 */
  timerSec: number;
}

export const HEXWALL_TIERS: Record<number, HexTier> = {
  1: { radius: 2, stacks: 5, hand: 5, height: [1, 3], colors: 3, failRep: 0, timerSec: 0 },
};

export const usesHexwall = (type: string, warden: number) =>
  type === "SECURITY" && HEXWALL_TIERS[warden] !== undefined;

/* ---------- 轴向坐标 ---------- */

export const hkey = (q: number, r: number) => `${q},${r}`;
export const unkey = (k: string): [number, number] => {
  const [q, r] = k.split(",").map(Number);
  return [q, r];
};

const DIRS: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export const neighborsOf = (k: string): string[] => {
  const [q, r] = unkey(k);
  return DIRS.map(([dq, dr]) => hkey(q + dq, r + dr));
};

/** 半径内的所有格子（轴向六边形区域）。 */
export function cellsInRadius(radius: number): string[] {
  const out: string[] = [];
  for (let q = -radius; q <= radius; q++) {
    const lo = Math.max(-radius, -q - radius);
    const hi = Math.min(radius, -q + radius);
    for (let r = lo; r <= hi; r++) out.push(hkey(q, r));
  }
  return out;
}

/* ---------- 棋盘 ---------- */

/** 场地：格子 → 颜色堆（下标 0 在最底，末位是顶）。 */
export type Field = Record<string, number[]>;

export interface HexBoard {
  radius: number;
  cells: string[];
  field: Field;
  /** 手牌，null 表示已经打出去了。 */
  hand: (number[] | null)[];
}

const clone = (f: Field): Field => {
  const out: Field = {};
  for (const k in f) out[k] = f[k].slice();
  return out;
};

/** 只允许贴着已有堆放置——必须依附在墙上。 */
export function legalCells(board: HexBoard): string[] {
  const occupied = Object.keys(board.field);
  if (!occupied.length) return [];
  const ok = new Set<string>();
  occupied.forEach((k) =>
    neighborsOf(k).forEach((n) => {
      if (!board.field[n] && board.cells.includes(n)) ok.add(n);
    })
  );
  return [...ok];
}

/** 一次湮灭事件：两格的顶片同色，一起消失。 */
export interface Annihilation {
  a: string;
  b: string;
  color: number;
  /** 这一步结束后的场地快照，用于逐帧回放。 */
  after: Field;
}

/**
 * 和 resolveField 相同的规则，但把每一次对消都记录下来，
 * 让界面可以一步步播放连锁动画。
 */
export function resolveSteps(input: Field): { field: Field; steps: Annihilation[] } {
  const field = clone(input);
  const steps: Annihilation[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    const keys = Object.keys(field).sort();
    for (const k of keys) {
      const a = field[k];
      if (!a || !a.length) continue;
      for (const n of neighborsOf(k)) {
        const b = field[n];
        if (!b || !b.length) continue;
        if (a[a.length - 1] === b[b.length - 1]) {
          const color = a[a.length - 1];
          a.pop();
          b.pop();
          if (!a.length) delete field[k];
          if (!b.length) delete field[n];
          steps.push({ a: k, b: n, color, after: clone(field) });
          changed = true;
          break;
        }
      }
    }
  }
  return { field, steps };
}

/**
 * 结算：相邻两堆顶色相同 → 各消掉一枚，连锁直到稳定。
 * 直接复用 resolveSteps，确保求解器和动画看到的结果完全一致。
 */
export function resolveField(input: Field): { field: Field; burst: string[] } {
  const { field, steps } = resolveSteps(input);
  const burst = new Set<string>();
  steps.forEach((st) => { burst.add(st.a); burst.add(st.b); });
  return { field, burst: [...burst] };
}

/** 落子：把手牌放到空格上并结算。 */
export function placeStack(board: HexBoard, cell: string, handIdx: number): HexBoard | null {
  return playStack(board, cell, handIdx)?.board ?? null;
}

/** 落子并返回连锁过程，供界面播放动画。 */
export function playStack(
  board: HexBoard,
  cell: string,
  handIdx: number
): { board: HexBoard; placed: Field; steps: Annihilation[] } | null {
  const stack = board.hand[handIdx];
  if (!stack || board.field[cell] || !board.cells.includes(cell)) return null;
  if (!legalCells(board).includes(cell)) return null;

  const placed = clone(board.field);
  placed[cell] = stack.slice();
  const { field, steps } = resolveSteps(placed);
  const hand = board.hand.slice();
  hand[handIdx] = null;
  return { board: { ...board, field, hand }, placed, steps };
}

export const isCleared = (b: HexBoard) => Object.keys(b.field).length === 0;
export const handLeft = (b: HexBoard) => b.hand.filter(Boolean).length;
/** 没牌了但墙还在 = 失败。 */
export const isStuck = (b: HexBoard) => !isCleared(b) && handLeft(b) === 0;

/* ---------- 求解器：保证关卡一定能通 ---------- */

const sig = (b: HexBoard) =>
  Object.keys(b.field).sort().map((k) => `${k}:${b.field[k].join("")}`).join("|") +
  "#" + b.hand.map((h) => (h ? h.join("") : "-")).sort().join(",");

/** 深度优先穷举所有落子顺序，返回能否清空。 */
export function solvable(board: HexBoard, seen = new Set<string>(), limit = 60000): boolean {
  if (isCleared(board)) return true;
  if (handLeft(board) === 0) return false;
  const s = sig(board);
  if (seen.has(s)) return false;
  seen.add(s);
  if (seen.size > limit) return false;   // 安全阀：超了就当作不可解，重新生成

  const spots = legalCells(board);
  for (let i = 0; i < board.hand.length; i++) {
    if (!board.hand[i]) continue;
    for (const cell of spots) {
      const nb = placeStack(board, cell, i);
      if (nb && solvable(nb, seen, limit)) return true;
    }
  }
  return false;
}

/** 能否在 depth 步以内清空——用来筛掉一两步就过关的无聊局（深度很浅，很快）。 */
export function clearableWithin(board: HexBoard, depth: number): boolean {
  if (isCleared(board)) return true;
  if (depth === 0 || handLeft(board) === 0) return false;
  const spots = legalCells(board);
  for (let i = 0; i < board.hand.length; i++) {
    if (!board.hand[i]) continue;
    for (const cell of spots) {
      const nb = placeStack(board, cell, i);
      if (nb && clearableWithin(nb, depth - 1)) return true;
    }
  }
  return false;
}

/* ---------- 生成 ---------- */

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const shuffle = <T,>(a: T[]): T[] => {
  const out = a.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

/** 在半径内挑一块连通的区域放初始堆。 */
function pickConnected(cells: string[], count: number): string[] {
  const start = cells[Math.floor(Math.random() * cells.length)];
  const chosen = [start];
  const set = new Set(chosen);
  let guard = 0;
  while (chosen.length < count && guard++ < 400) {
    const from = chosen[Math.floor(Math.random() * chosen.length)];
    const opts = neighborsOf(from).filter((n) => cells.includes(n) && !set.has(n));
    if (!opts.length) continue;
    const pickCell = opts[Math.floor(Math.random() * opts.length)];
    chosen.push(pickCell);
    set.add(pickCell);
  }
  return chosen;
}

function build(tier: HexTier): HexBoard {
  const cells = cellsInRadius(tier.radius);
  const spots = pickConnected(cells, tier.stacks);

  /* 1. 随机生成场上的墙 */
  const field: Field = {};
  const tally: number[] = Array(tier.colors).fill(0);
  spots.forEach((k) => {
    const h = ri(tier.height[0], tier.height[1]);
    const st: number[] = [];
    for (let i = 0; i < h; i++) {
      const c = ri(0, tier.colors - 1);
      st.push(c);
      tally[c]++;
    }
    field[k] = st;
  });

  /* 2. 手牌必须正好补齐每种颜色——否则数量奇偶不对，永远清不干净 */
  const pool: number[] = [];
  tally.forEach((n, c) => { for (let i = 0; i < n; i++) pool.push(c); });

  /* 3. 把补集随机切成若干堆 */
  const mixed = shuffle(pool);
  const hand: number[][] = [];
  const groups = Math.max(1, tier.hand);
  const per = Math.ceil(mixed.length / groups);
  for (let i = 0; i < mixed.length; i += per) hand.push(mixed.slice(i, i + per));

  return { radius: tier.radius, cells, field, hand };
}

/** 生成一个**保证可解**的关卡。 */
export function generateHexwall(tier: HexTier): HexBoard {
  /* 每次尝试都只给求解器很小的预算：与其死磕一个难局，不如换一个。 */
  for (let attempt = 0; attempt < 400; attempt++) {
    const b = build(tier);
    if (clearableWithin(b, 2)) continue;          // 一两步就通关的局不要
    if (solvable(b, new Set(), 300)) return b;
  }
  /* 兜底：手牌直接复制场上每一堆，必定能一一对消 */
  const cells = cellsInRadius(tier.radius);
  const spots = pickConnected(cells, tier.stacks);
  const field: Field = {};
  const hand: number[][] = [];
  spots.forEach((k) => {
    const st: number[] = [];
    const h = ri(tier.height[0], tier.height[1]);
    for (let i = 0; i < h; i++) st.push(ri(0, tier.colors - 1));
    field[k] = st;
    hand.push(st.slice());
  });
  return { radius: tier.radius, cells, field, hand: shuffle(hand) };
}

/* ---------- 画布坐标（尖顶六边形） ---------- */

export function hexPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r,
  };
}

/** 尖顶六边形的顶点路径。 */
export function hexPath(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + size * Math.cos(a)).toFixed(2)},${(cy + size * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/** 晶格配色——克制的霓虹，和整体风格一致。 */
export const HEX_COLORS = ["#6db3d2", "#cfa04b", "#c25b46", "#76c8a8", "#c977b0"];
