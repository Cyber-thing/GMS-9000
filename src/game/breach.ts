import { NODE_META } from "./data";
import { ALL_NODES } from "../data/regions";

/* ================================================================== */
/* BREACH — node intrusion mini-game                                   */
/* ------------------------------------------------------------------ */
/* Every cell carries a hex expression; solving it gives the number of */
/* seconds that cell takes to load. WARDEN wakes 10s after entry (or   */
/* immediately after the first solved hop) and then hunts the operator.*/
/* Tier doubles the amount of ground to cover: 1,2,4,8,16 cells.       */
/* ================================================================== */

export interface BreachTier {
  /** cells that must be crossed between ENTRY and ACCESS */
  hops: number;
  /** WARDEN countdown, seconds */
  timerSec: number;
  /** countdown also wakes on its own after this many ms in the map */
  alarmMs: number;
  /** REP burned on a lockout */
  failRep: number;
  /** dial-up handshake duration, ms */
  dialMs: number;
  /** how wide the schematic may get */
  maxRows: number;
}

export const BREACH_TIERS: Record<number, BreachTier> = {
  1: { hops: 1,  timerSec: 30, alarmMs: 10000, failRep: 8,  dialMs: 2600, maxRows: 2 },
  2: { hops: 2,  timerSec: 34, alarmMs: 10000, failRep: 12, dialMs: 2600, maxRows: 3 },
  3: { hops: 4,  timerSec: 48, alarmMs: 10000, failRep: 18, dialMs: 2800, maxRows: 3 },
  4: { hops: 8,  timerSec: 80, alarmMs: 10000, failRep: 26, dialMs: 3000, maxRows: 4 },
  5: { hops: 16, timerSec: 140, alarmMs: 10000, failRep: 36, dialMs: 3200, maxRows: 4 },
};

export const MAX_CELL_SECONDS = 15;

/** ACCESS hosts always play the mini-game, every tier is supported */
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
  /** displayed hex expression, e.g. "0A-04" */
  expr: string;
  /** seconds this cell costs, 1..15 */
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
 * Builds a hex expression whose value is `want` seconds.
 * Mixes addition and subtraction so the board reads like real arithmetic.
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

/** cost curve: early cells are cheap, later ones bite, never above 15s */
const costFor = (col: number, cols: number): number => {
  const depth = cols <= 2 ? 0 : (col - 1) / Math.max(1, cols - 2);
  const lo = Math.round(2 + depth * 3);
  const hi = Math.round(5 + depth * 7);
  return Math.max(1, Math.min(MAX_CELL_SECONDS, ri(lo, Math.min(MAX_CELL_SECONDS, hi))));
};

/**
 * Layered schematic: ENTRY → `hops` columns → ACCESS.
 * Columns hold 1..maxRows cells, wired so that several distinct routes exist
 * while every route costs the same number of hops.
 */
export function generateBreach(tier: BreachTier): BreachMap {
  const cells: BreachCell[] = [];
  const links: BreachLink[] = [];
  const cols = tier.hops + 2;

  cells.push({ id: "entry", col: 0, row: 0, rows: 1, kind: "ENTRY", expr: "", cost: 0 });

  const columns: string[][] = [];
  for (let c = 1; c <= tier.hops; c++) {
    /* widen the middle of the board, keep the ends narrow */
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
    /* every cell gets a forward edge */
    from.forEach((a, i) => link(a, to[Math.min(i, to.length - 1)]));
    /* every cell in the next column stays reachable */
    to.forEach((b, j) => {
      if (!links.some((l) => l.b === b)) link(from[Math.min(j, from.length - 1)], b);
    });
    /* extra diagonals so the operator has a real choice of routes */
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

/** neighbours reachable from a cell (links run left → right) */
export function neighboursOf(map: BreachMap, id: string): string[] {
  return map.links.filter((l) => l.a === id).map((l) => l.b);
}

/** cheapest total seconds from ENTRY to ACCESS — used for balance checks */
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

/* layout helpers — drawing space grows with the board */
export const BOARD_H = 340;
export const boardWidth = (cols: number) => Math.max(600, Math.min(1120, 160 + cols * 96));

export function cellPos(cell: BreachCell, cols: number, boardW: number) {
  const x = 72 + (cell.col * (boardW - 144)) / Math.max(1, cols - 1);
  const span = 124;
  const y =
    cell.rows === 1
      ? BOARD_H / 2
      : BOARD_H / 2 - span / 2 + (cell.row * span) / (cell.rows - 1);
  return { x, y };
}
