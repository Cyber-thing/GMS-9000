/* ==================================================================
   NETWORK ROUTING — relay mini-game.
   A grid of pipe segments: rotate them until an unbroken line runs
   from the inlet to the outlet, then press RUN to push the signal.
   Only tier 1 is wired up; the table is ready for harder boards.
   ================================================================== */

export interface RoutingTier {
  cols: number;
  rows: number;
  /** extra decoy cells sprinkled off the solution path */
  decoys: number;
  failRep: number;
}

export const ROUTING_TIERS: Record<number, RoutingTier> = {
  1: { cols: 5, rows: 3, decoys: 4, failRep: 0 },
};

export const usesRouting = (type: string, warden: number) =>
  type === "RELAY" && ROUTING_TIERS[warden] !== undefined;

/* ------------------------------------------------------------------ */
/* a cell is a set of open sides: 0=N 1=E 2=S 3=W                      */
/* ------------------------------------------------------------------ */

export type Side = 0 | 1 | 2 | 3;

export interface Cell {
  id: string;
  col: number;
  row: number;
  /** open sides in the cell's *current* orientation */
  sides: Side[];
  /** how many quarter-turns the player has applied */
  turns: number;
  /** on the intended solution path (debug / hinting) */
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

/** carves a random walk from the left edge to the right edge */
function carvePath(cols: number, rows: number): { c: number; r: number }[] {
  const startRow = ri(0, rows - 1);
  const path = [{ c: 0, r: startRow }];
  const seen = new Set([key(0, startRow)]);
  let cur = { c: 0, r: startRow };
  let guard = 0;

  while (cur.c < cols - 1 && guard++ < 400) {
    /* bias strongly to the right so the run always terminates */
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
  /* make sure we really touched the right edge */
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

  /* every step opens the side it came from and the side it leaves by */
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
    if (i === 0) sides.push(3);                       // inlet faces the left edge
    if (i === path.length - 1) sides.push(1);         // outlet faces the right edge
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
        /* scramble everything except the two terminals */
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

  /* decoy segments on empty tiles — they can never complete a circuit */
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

/** sides a cell currently presents, after the player's rotations */
export const liveSides = (cell: Cell): Side[] => rotateSides(cell.sides, cell.turns);

/**
 * Walks the circuit from the inlet. Returns the connected cell ids and
 * whether the signal reaches the outlet.
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
      /* the neighbour must open the facing side back at us */
      if (!liveSides(nb).includes(OPP[side])) return;
      lit.add(nk);
      queue.push(nk);
    });
  }
  return { lit, solved: lit.has(board.outlet) };
}

/** ordered inlet → outlet run, used to animate the signal */
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
