import { ALL_NODES } from "../../data/regions";
import { NODE_META } from "../data";
import { themeForOwner } from "./themes";
import type {
  ButtonDef,
  CorpThemeId,
  DoorDef,
  ElevatorDef,
  EnemyKind,
  EnemySpawnDef,
  EnemyVariant,
  HoloSignDef,
  PickupSpawnDef,
  PropSpawnDef,
  TierTuning,
  VrFinaleKind,
  VrLevelDef,
  WindowZoneDef,
} from "./types";

export const VR_TIER_TUNING: Record<1 | 2 | 3 | 4 | 5, TierTuning> = {
  1: { tier: 1, playerMaxHp: 6, enemyHpBonus: 0, enemyFireRateMult: 1.26, enemyBulletSpeedMult: 0.82, timedDoorSec: 22, failRep: 6, overloadEscapeSec: 26, bassBpm: 108 },
  2: { tier: 2, playerMaxHp: 5, enemyHpBonus: 0, enemyFireRateMult: 1.12, enemyBulletSpeedMult: 0.9, timedDoorSec: 18, failRep: 10, overloadEscapeSec: 24, bassBpm: 114 },
  3: { tier: 3, playerMaxHp: 5, enemyHpBonus: 1, enemyFireRateMult: 1.0, enemyBulletSpeedMult: 1.0, timedDoorSec: 16, failRep: 16, overloadEscapeSec: 24, bassBpm: 118 },
  4: { tier: 4, playerMaxHp: 5, enemyHpBonus: 1, enemyFireRateMult: 0.84, enemyBulletSpeedMult: 1.12, timedDoorSec: 14, failRep: 24, overloadEscapeSec: 22, bassBpm: 124 },
  5: { tier: 5, playerMaxHp: 5, enemyHpBonus: 2, enemyFireRateMult: 0.72, enemyBulletSpeedMult: 1.24, timedDoorSec: 12, failRep: 34, overloadEscapeSec: 24, bassBpm: 130 },
};

/** Virtuality Breach работает на всех CORPORATE (CRP) узлах WEST1. */
export function usesVirtualityBreach(nodeId: string): boolean {
  const n = ALL_NODES.find((x) => x.id === nodeId);
  if (!n) return false;
  return NODE_META[nodeId]?.owner !== undefined && n.type === "CORPORATE" && nodeId.startsWith("w1");
}

export function finaleForNode(nodeId: string, tier: 1 | 2 | 3 | 4 | 5): VrFinaleKind {
  if (nodeId === "w1p_crp2") return "BLACKOUT_SWITCH";
  if (nodeId === "w1n_crp") return "DATA_HEIST";
  if (nodeId === "w1a_gex") return "HEX_PURGE";
  if (nodeId === "w1m_crp") return "CIPHER_DECODE";
  if (nodeId === "w1e_crp") return "HEX_PURGE";
  if (nodeId === "w1m_gex") return "SIGNAL_ROUTING";
  if (nodeId === "w1g_crp" || nodeId === "w1g_z05") return "CORE_EXTRACTION";
  if (tier <= 1) return "SIGNAL_ROUTING";
  if (tier === 2) return "HEX_PURGE";
  if (tier === 3) return "CIPHER_DECODE";
  if (tier === 4) return "HEX_PURGE";
  return "CORE_EXTRACTION";
}

/* ------------------------------------------------------------------ */
/*  Детерминированный генератор: у каждого узла своя архитектура.      */
/* ------------------------------------------------------------------ */

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(a: T[]): T {
    return a[Math.floor(this.next() * a.length)];
  }
  shuffle<T>(a: T[]): T[] {
    const o = a.slice();
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }
  weighted<T>(items: Array<[T, number]>): T {
    const total = items.reduce((a, [, w]) => a + w, 0);
    let r = this.next() * total;
    for (const [v, w] of items) {
      r -= w;
      if (r <= 0) return v;
    }
    return items[items.length - 1][0];
  }
}

class Grid {
  readonly g: string[][];
  constructor(readonly cols: number, readonly rows: number) {
    this.g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "."));
    this.fill(0, 0, cols - 1, 1, "#");
    this.fill(0, rows - 2, cols - 1, rows - 1, "#");
    this.fill(0, 0, 1, rows - 1, "#");
    this.fill(cols - 2, 0, cols - 1, rows - 1, "#");
  }
  fill(c1: number, r1: number, c2: number, r2: number, ch: string): void {
    for (let r = Math.max(0, r1); r <= Math.min(this.rows - 1, r2); r++) {
      for (let c = Math.max(0, c1); c <= Math.min(this.cols - 1, c2); c++) this.g[r][c] = ch;
    }
  }
  at(c: number, r: number): string {
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return "#";
    return this.g[r][c];
  }
  solid(c: number, r: number): boolean {
    return this.at(c, r) === "#";
  }
  /** Можно ли стоять на верхней грани тайла (c, r) с запасом по высоте. */
  stand(c: number, r: number): boolean {
    const t = this.at(c, r);
    return (t === "#" || t === "=") && !this.solid(c, r - 1) && !this.solid(c, r - 2);
  }
}

interface Roster {
  w: Record<EnemyKind, number>;
  v: Record<EnemyKind, EnemyVariant>;
  /** Сколько элементов декора/укрытий любит эта корпорация. */
  cover: number;
  catwalks: number;
}

const ROSTER: Record<CorpThemeId, Roster> = {
  takamuri: { w: { thug: 4, drone: 3, heavy: 1.5, turret: 1 }, v: { thug: "swift", drone: "volley", heavy: "std", turret: "std" }, cover: 1, catwalks: 3 },
  intercell: { w: { thug: 2, drone: 4, heavy: 2, turret: 2 }, v: { thug: "volley", drone: "swift", heavy: "std", turret: "std" }, cover: 2, catwalks: 2 },
  slayer: { w: { thug: 2, drone: 1, heavy: 4, turret: 3 }, v: { thug: "std", drone: "std", heavy: "plated", turret: "volley" }, cover: 3, catwalks: 1 },
  agogee: { w: { thug: 2, drone: 3, heavy: 2, turret: 4 }, v: { thug: "swift", drone: "volley", heavy: "plated", turret: "volley" }, cover: 1, catwalks: 3 },
  fusion: { w: { thug: 3, drone: 2, heavy: 3, turret: 2 }, v: { thug: "volley", drone: "std", heavy: "plated", turret: "std" }, cover: 3, catwalks: 2 },
  gexogen: { w: { thug: 4, drone: 3, heavy: 1, turret: 1 }, v: { thug: "swift", drone: "std", heavy: "std", turret: "std" }, cover: 2, catwalks: 2 },
  indep: { w: { thug: 3, drone: 3, heavy: 3, turret: 2 }, v: { thug: "volley", drone: "swift", heavy: "plated", turret: "std" }, cover: 2, catwalks: 2 },
};

interface Reserve {
  f: number;
  c0: number;
  c1: number;
}

export interface GenOptions {
  nodeId: string;
  nodeCode: string;
  owner: string;
  tuning: TierTuning;
  finaleKind: VrFinaleKind;
}

export function generateVrLevel(opt: GenOptions): VrLevelDef {
  const { nodeId, nodeCode, owner, tuning, finaleKind } = opt;
  const tier = tuning.tier;
  const theme = themeForOwner(owner);
  const roster = ROSTER[theme.id];
  const rng = new Rng(hashStr(`${nodeId}:vr:v2`));
  const isSabotageBlackout = nodeId === "w1p_crp2";

  /* ---------- размеры и состав этажей ---------- */
  const cols =
    tier === 1 ? rng.int(64, 76) : tier === 2 ? rng.int(80, 94) : tier === 3 ? rng.int(98, 110) : tier === 4 ? rng.int(108, 122) : rng.int(114, 128);
  const n = tier === 1 ? 3 : tier === 2 ? rng.pick([3, 4]) : tier === 3 ? 4 : tier === 4 ? rng.pick([4, 5]) : 5;

  const gaps: number[] = [];
  gaps[0] = tier === 1 ? 6 : rng.pick([6, 8]);

  /* режим перехода между этажами k -> k+1 (k >= 1): лифт или подъём по платформам */
  const modes: Array<"lift" | "climb"> = [];
  modes[0] = "climb";
  const trans = n - 2; // переходов с лифтом/подъёмом выше первого этажа
  const mids: Array<"lift" | "climb"> = [];
  if (trans === 1) mids.push("lift");
  else if (trans === 2) mids.push(...(tier <= 2 ? (["lift", "lift"] as const) : rng.pick([["lift", "lift"], ["lift", "climb"], ["climb", "lift"]] as const)));
  else mids.push(...(rng.pick([["lift", "lift", "climb"], ["lift", "climb", "lift"], ["climb", "lift", "lift"]] as const)));
  mids.forEach((m, i) => (modes[i + 1] = m));
  for (let k = 1; k <= n - 2; k++) {
    gaps[k] = modes[k] === "climb" ? rng.pick([10, 12]) : rng.int(10, 13);
  }

  const topRow = rng.int(11, 13);
  const S: number[] = new Array(n);
  S[n - 1] = topRow;
  for (let k = n - 2; k >= 0; k--) S[k] = S[k + 1] + gaps[k];
  const rows = S[0] + 2;
  const grid = new Grid(cols, rows);
  const { fill } = { fill: grid.fill.bind(grid) };

  const reserved: Reserve[] = [];
  const reserve = (f: number, c0: number, c1: number) => reserved.push({ f, c0, c1 });
  const free = (f: number, c0: number, c1: number, margin = 4) =>
    c0 - margin >= 3 &&
    c1 + margin <= cols - 4 &&
    !reserved.some((r) => r.f === f && !(c1 + margin < r.c0 || c0 - margin > r.c1));

  /* перекрытия этажей */
  for (let k = 1; k < n; k++) fill(2, S[k], cols - 3, S[k] + 1, "#");

  const elevators: ElevatorDef[] = [];
  const doors: DoorDef[] = [];
  const buttons: ButtonDef[] = [];
  const noSpawn: Reserve[] = [];
  const liftInfo: Array<{ k: number; side: 0 | 1; ec: number; dc: number; color: "red" | "blue" }> = [];
  const arrival: Array<{ c0: number; c1: number }> = new Array(n);

  const liftSides: Array<0 | 1> = [];
  const firstSide = rng.pick([0, 1]) as 0 | 1;
  for (let i = 0; i < 3; i++) liftSides.push(((firstSide + i) % 2) as 0 | 1);

  /* стартовая сторона: спавн слева или справа */
  const spawnLeft = rng.chance(0.5);
  const spawnCol = spawnLeft ? 4 : cols - 6;
  reserve(0, spawnCol - 5, spawnCol + 5);

  let liftIdx = 0;
  for (let k = 0; k <= n - 2; k++) {
    if (modes[k] === "climb") {
      const wh = rng.int(8, 10);
      let c0 = -1;
      const lo = 22;
      const hi = cols - 22 - wh;
      const pref = spawnLeft && k === 0 ? [Math.floor((lo + hi) / 2), hi] : !spawnLeft && k === 0 ? [lo, Math.floor((lo + hi) / 2)] : [lo, hi];
      for (let t = 0; t < 80 && c0 < 0; t++) {
        const c = rng.int(pref[0], Math.max(pref[0], pref[1]));
        if (free(k, c - 3, c + wh + 2, 5) && free(k + 1, c - 2, c + wh + 1, 5)) c0 = c;
      }
      if (c0 < 0) {
        for (let c = lo; c <= hi && c0 < 0; c++) {
          if (free(k, c - 3, c + wh + 2, 3) && free(k + 1, c - 2, c + wh + 1, 3)) c0 = c;
        }
      }
      if (c0 < 0) c0 = Math.floor((lo + hi) / 2);
      fill(c0, S[k + 1], c0 + wh - 1, S[k + 1] + 1, ".");
      const m = gaps[k] / 2 - 1;
      const topSide = rng.pick([0, 1]);
      for (let j = 1; j <= m; j++) {
        const side = (m - j) % 2 === 0 ? topSide : 1 - topSide;
        const cs = side === 0 ? c0 : c0 + wh - 5;
        fill(cs, S[k] - 2 * j, cs + 4, S[k] - 2 * j, "=");
      }
      reserve(k, c0 - 3, c0 + wh + 2);
      reserve(k + 1, c0 - 2, c0 + wh + 1);
      noSpawn.push({ f: k + 1, c0: c0 - 2, c1: c0 + wh + 1 });
      arrival[k + 1] = { c0, c1: c0 + wh - 1 };
    } else {
      const side = liftSides[liftIdx];
      let ec: number;
      let dc: number;
      if (side === 0) {
        ec = rng.int(4, 7);
        dc = ec + 4 + rng.int(3, 5);
      } else {
        ec = cols - 3 - rng.int(2, 4) - 3;
        dc = ec - 1 - rng.int(3, 5);
      }
      fill(ec, S[k + 1], ec + 3, S[k + 1] + 1, ".");
      fill(ec, S[k], ec + 3, S[k], ".");
      fill(dc, S[k + 1] + 2, dc, S[k] - 4, "#");
      const color = liftIdx === 0 ? "red" : "blue";
      elevators.push({ id: `elev-${"abc"[liftIdx]}`, col: ec, widthTiles: 4, topRow: S[k + 1], bottomRow: S[k], speed: rng.int(94, 110) });
      doors.push({ id: `door-${color}`, color, col: dc, topRow: S[k] - 3, heightTiles: 3, timedSeconds: null });
      const b0 = side === 0 ? 2 : dc;
      const b1 = side === 0 ? dc : cols - 3;
      reserve(k, b0, b1);
      noSpawn.push({ f: k, c0: b0, c1: b1 });
      reserve(k + 1, ec - 2, ec + 5);
      noSpawn.push({ f: k + 1, c0: ec - 2, c1: ec + 5 });
      arrival[k + 1] = { c0: ec, c1: ec + 3 };
      liftInfo.push({ k, side, ec, dc, color });
      liftIdx++;
    }
  }

  /* ---------- верхний этаж: ядро и (с T3) закрытая комната ---------- */
  const top = n - 1;
  const arr = arrival[top];
  const arrCenter = (arr.c0 + arr.c1) / 2;
  const roomRight = arrCenter < cols / 2;
  let coreCol: number;
  let dcore = -1;
  let greenButton: ButtonDef | null = null;
  const nooks: Array<{ f: number; c: number; row: number }> = [];

  const buildNook = (f: number, c: number, dir: 1 | -1): { c: number; row: number } => {
    const hasUpper = gaps[f] === undefined ? true : gaps[f] >= 8;
    const lw = 6;
    const uw = 7;
    const gx = rng.int(0, 1);
    if (dir === 1) {
      fill(c, S[f] - 2, c + lw - 1, S[f] - 2, "=");
      if (hasUpper) {
        const uc = c + lw + gx;
        fill(uc, S[f] - 4, uc + uw - 1, S[f] - 4, "=");
        reserve(f, c - 1, uc + uw);
        return { c: uc + 3, row: S[f] - 4 };
      }
      reserve(f, c - 1, c + lw);
      return { c: c + 2, row: S[f] - 2 };
    }
    fill(c - lw + 1, S[f] - 2, c, S[f] - 2, "=");
    if (hasUpper) {
      const uc = c - lw - gx;
      fill(uc - uw + 1, S[f] - 4, uc, S[f] - 4, "=");
      reserve(f, uc - uw, c + 1);
      return { c: uc - 3, row: S[f] - 4 };
    }
    reserve(f, c - lw, c + 1);
    return { c: c - 2, row: S[f] - 2 };
  };

  if (tier >= 3) {
    const roomW = rng.int(14, 18);
    if (roomRight) {
      dcore = cols - 3 - roomW;
      coreCol = cols - 3 - rng.int(5, 8);
      reserve(top, dcore - 1, cols - 3);
      noSpawn.push({ f: top, c0: dcore - 1, c1: cols - 3 });
    } else {
      dcore = 2 + roomW;
      coreCol = 2 + rng.int(5, 8);
      reserve(top, 2, dcore + 1);
      noSpawn.push({ f: top, c0: 2, c1: dcore + 1 });
    }
    fill(dcore, 2, dcore, S[top] - 4, "#");
    doors.push({ id: "door-green", color: "green", col: dcore, topRow: S[top] - 3, heightTiles: 3, timedSeconds: tuning.timedDoorSec });
    /* кнопка зелёной двери — на платформе между входом на этаж и дверью */
    const dist = rng.int(16, 30);
    let bc = roomRight ? dcore - dist : dcore + dist;
    let placed = false;
    for (let t = 0; t < 40 && !placed; t++) {
      const cand = roomRight ? dcore - rng.int(14, 32) : dcore + rng.int(14, 32);
      if (free(top, cand - 8, cand + 8, 2)) {
        bc = cand;
        placed = true;
      }
    }
    if (placed) {
      const nk = buildNook(top, bc, roomRight ? -1 : 1);
      greenButton = { id: "btn-green", color: "green", col: nk.c, row: nk.row, label: `CORE LOCK (${tuning.timedDoorSec}S)` };
    } else {
      let cc = roomRight ? dcore - 16 : dcore + 16;
      while (grid.solid(cc, S[top] - 1) || !grid.stand(cc, S[top])) cc += roomRight ? -1 : 1;
      greenButton = { id: "btn-green", color: "green", col: cc, row: S[top], label: `CORE LOCK (${tuning.timedDoorSec}S)` };
      reserve(top, cc - 2, cc + 2);
    }
  } else {
    coreCol = roomRight ? cols - 3 - rng.int(6, 10) : 2 + rng.int(6, 10);
    reserve(top, coreCol - 3, coreCol + 3);
  }

  /* ---------- кнопки красной/синей дверей ---------- */
  liftInfo.forEach((li, idx) => {
    const f = li.k;
    const farLo = li.side === 0 ? Math.floor(cols * 0.5) : 16;
    const farHi = li.side === 0 ? cols - 16 : Math.floor(cols * 0.5);
    let bc = -1;
    for (let t = 0; t < 80 && bc < 0; t++) {
      const cand = rng.int(farLo, farHi);
      if (free(f, cand - 8, cand + 8, 2)) bc = cand;
    }
    const label = idx === 0 ? "GATE-01 OVERRIDE" : "GATE-02 OVERRIDE";
    if (bc >= 0 && rng.chance(0.65)) {
      const nk = buildNook(f, bc, rng.pick([1, -1]) as 1 | -1);
      buttons.push({ id: `btn-${li.color}`, color: li.color, col: nk.c, row: nk.row, label });
    } else {
      let cc = bc >= 0 ? bc : Math.floor((farLo + farHi) / 2);
      for (let i = 0; i < 60 && (!grid.stand(cc, S[f]) || !free(f, cc - 1, cc + 1, 0)); i++) cc += i % 2 ? i : -i;
      buttons.push({ id: `btn-${li.color}`, color: li.color, col: cc, row: S[f], label });
      reserve(f, cc - 2, cc + 2);
    }
  });
  if (greenButton) buttons.push(greenButton);

  /* ---------- декор: пары платформ и укрытия ---------- */
  for (let f = 0; f < n; f++) {
    const count = rng.int(1, 1 + roster.catwalks) + (tier >= 3 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      for (let t = 0; t < 30; t++) {
        const c = rng.int(10, cols - 26);
        if (free(f, c - 2, c + 16, 2)) {
          const nk = buildNook(f, c, rng.pick([1, -1]) as 1 | -1);
          nooks.push({ f, c: nk.c, row: nk.row });
          break;
        }
      }
    }
    const blocks = rng.int(0, roster.cover) + (f === 0 ? 1 : 0);
    for (let i = 0; i < blocks; i++) {
      for (let t = 0; t < 30; t++) {
        const c = rng.int(12, cols - 16);
        const w = rng.int(2, 3);
        if (free(f, c - 1, c + w, 4)) {
          fill(c, S[f] - 2, c + w - 1, S[f] - 1, "#");
          reserve(f, c - 1, c + w);
          break;
        }
      }
    }
  }

  /* ---------- вспомогательные функции размещения ---------- */
  const doorCols = new Set<number>(doors.map((d) => d.col));
  const used = new Set<string>();
  const inNoSpawn = (f: number, c: number) => noSpawn.some((r) => r.f === f && c >= r.c0 && c <= r.c1);
  const walkable = (c: number, row: number) => grid.stand(c, row) && !doorCols.has(c);
  const spotsAt = (row: number, f: number, minGap = 0): number[] => {
    const out: number[] = [];
    for (let c = 4; c < cols - 4; c++) {
      if (!walkable(c, row) || !walkable(c - 1, row) || !walkable(c + 1, row)) continue;
      if (inNoSpawn(f, c)) continue;
      if (used.has(`${c},${row}`)) continue;
      if (minGap > 0 && f === 0 && Math.abs(c - spawnCol) < minGap) continue;
      out.push(c);
    }
    return out;
  };
  const claim = (c: number, row: number, span = 2) => {
    for (let d = -span; d <= span; d++) used.add(`${c + d},${row}`);
  };
  const runOf = (row: number, c: number): [number, number] => {
    let l = c;
    let r = c;
    while (walkable(l - 1, row)) l--;
    while (walkable(r + 1, row)) r++;
    return [l, r];
  };
  const floorRowChoices = (f: number): number[] => {
    const rowsAt = [S[f]];
    nooks.filter((nk) => nk.f === f).forEach((nk) => rowsAt.push(nk.row));
    return rowsAt;
  };
  const randomSpot = (f: number, minGap = 0, preferNook = false): { c: number; row: number } | null => {
    const choices = floorRowChoices(f);
    const order = preferNook && choices.length > 1 ? [...choices.slice(1), choices[0]] : rng.shuffle(choices);
    for (const row of order) {
      const s = spotsAt(row, f, minGap);
      if (s.length) return { c: rng.pick(s), row };
    }
    return null;
  };
  const nearSpot = (f: number, want: number): { c: number; row: number } => {
    const s = spotsAt(S[f], f).sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
    return { c: s.length ? s[0] : want, row: S[f] };
  };

  /* ---------- враги ---------- */
  const totals: Record<number, [number, number]> = { 1: [6, 7], 2: [9, 12], 3: [16, 19], 4: [20, 23], 5: [23, 27] };
  const total = rng.int(totals[tier][0], totals[tier][1]);
  const enemies: EnemySpawnDef[] = [];
  const floorWeights: Array<[number, number]> = [];
  for (let f = 0; f < n; f++) floorWeights.push([f, f === 0 ? 0.8 : f === n - 1 ? 1.3 : 1]);

  const variantFor = (kind: EnemyKind): EnemyVariant => {
    if (tier >= 4 && rng.chance(0.18)) return rng.pick(["swift", "plated", "volley"] as EnemyVariant[]);
    return rng.chance(0.65) ? roster.v[kind] : "std";
  };
  const addWalker = (kind: "thug" | "heavy", f: number, row: number, c: number) => {
    const [l, r] = runOf(row, c);
    enemies.push({
      kind, col: c, row, facing: rng.chance(0.5) ? 1 : -1,
      patrolMinCol: Math.max(l, c - rng.int(7, 12)), patrolMaxCol: Math.min(r, c + rng.int(7, 12)),
      variant: variantFor(kind),
    });
    claim(c, row, 3);
    void f;
  };
  const kindWeights = (): Array<[EnemyKind, number]> => {
    const w = roster.w;
    return [["thug", w.thug], ["heavy", tier >= 2 ? w.heavy : 0], ["drone", w.drone], ["turret", tier >= 2 ? w.turret : 0]];
  };
  let guard = 0;
  while (enemies.length < total && guard++ < 400) {
    const f = rng.weighted(floorWeights);
    const kind = rng.weighted(kindWeights().filter(([, w]) => w > 0));
    if (kind === "turret") {
      const rowT = f < n - 1 ? S[f + 1] + 2 : 2;
      const cand: number[] = [];
      for (let c = 6; c < cols - 6; c++) {
        const above = f < n - 1 ? grid.solid(c, S[f + 1]) && grid.solid(c, S[f + 1] + 1) : true;
        if (above && !grid.solid(c, rowT) && !grid.solid(c, rowT + 1) && walkable(c, S[f]) && !inNoSpawn(f, c) && !used.has(`${c},t${f}`) && !(f === 0 && Math.abs(c - spawnCol) < 20)) cand.push(c);
      }
      if (!cand.length) continue;
      const c = rng.pick(cand);
      for (let d = -8; d <= 8; d++) used.add(`${c + d},t${f}`);
      enemies.push({ kind: "turret", col: c, row: rowT, facing: rng.chance(0.5) ? 1 : -1, patrolMinCol: c, patrolMaxCol: c, variant: variantFor("turret") });
      continue;
    }
    const sp = randomSpot(f, 20, rng.chance(0.3));
    if (!sp) continue;
    if (kind === "drone") {
      const dr = Math.max(3, sp.row - rng.int(3, 5));
      const span = rng.int(8, 13);
      enemies.push({
        kind: "drone", col: sp.c, row: dr, facing: rng.chance(0.5) ? 1 : -1,
        patrolMinCol: Math.max(4, sp.c - span), patrolMaxCol: Math.min(cols - 5, sp.c + span), variant: variantFor("drone"),
      });
      claim(sp.c, sp.row, 3);
    } else {
      addWalker(kind, f, sp.row, sp.c);
    }
  }
  /* охранник у каждой кнопки */
  buttons.forEach((b) => {
    const f = S.indexOf(b.row) >= 0 ? S.indexOf(b.row) : nooks.find((nk) => nk.row === b.row && Math.abs(nk.c - b.col) < 6)?.f ?? 0;
    const cands = spotsAt(b.row, f).filter((c) => Math.abs(c - b.col) >= 3 && Math.abs(c - b.col) <= 9);
    if (cands.length) addWalker(rng.chance(0.5) ? "thug" : "heavy", f, b.row, rng.pick(cands));
  });

  /* ---------- предметы и реквизит ---------- */
  const pickups: PickupSpawnDef[] = [];
  const addPickup = (kind: PickupSpawnDef["kind"], f: number, preferNook: boolean, minGap = 0) => {
    const sp = randomSpot(f, minGap, preferNook);
    if (!sp) return;
    pickups.push({ kind, col: sp.c, row: sp.row });
    claim(sp.c, sp.row, 2);
  };
  addPickup("shotgun", rng.pick([0, 1]), true, 16);
  if (tier >= 2) addPickup("smg", rng.int(1, Math.max(1, n - 2)), true);
  for (let f = 0; f < n; f++) {
    if (f === 0 && tier > 1 && rng.chance(0.4)) continue;
    addPickup("health", f, rng.chance(0.4), f === 0 ? 14 : 0);
  }
  for (let f = 1; f < n; f += 1) if (rng.chance(0.7)) addPickup("ammo", f, rng.chance(0.5));
  addPickup("ammo", top, false);
  if (tier >= 3) addPickup("health", top, false);

  const props: PropSpawnDef[] = [];
  for (let f = 0; f < n; f++) {
    const cnt = rng.int(3, 5);
    for (let i = 0; i < cnt; i++) {
      const sp = randomSpot(f, 6, false);
      if (!sp) break;
      const kind = rng.weighted<PropSpawnDef["kind"]>([["crate", 3], ["barrel", 2], ["monitor", 2]]);
      props.push({ kind, col: sp.c, row: sp.row, drop: kind === "crate" ? (rng.chance(0.55) ? "ammo" : "health") : undefined });
      claim(sp.c, sp.row, 1);
    }
  }

  /* ---------- окна, вывески, пар ---------- */
  const windows: WindowZoneDef[] = [];
  for (let f = 0; f < n; f++) {
    const upper = f < n - 1 ? S[f + 1] + 3 : 4;
    const h = f < n - 1 ? Math.min(5, gaps[f] - 6) : Math.min(5, S[f] - 7);
    if (h < 3) continue;
    const cnt = rng.int(1, 2);
    for (let i = 0; i < cnt; i++) windows.push({ col: rng.int(6, cols - 26), row: upper, wCols: rng.int(12, 18), hRows: h });
  }

  const corpName = theme.corpLabel.split(" ")[0];
  const signs: HoloSignDef[] = [{ col: spawnLeft ? 4 : cols - 22, row: S[0] - 4, text: `${corpName} // VR-T${tier}` }];
  buttons.forEach((b) => {
    const key = b.color === "green" ? "CORE LOCK" : "GATE KEY";
    signs.push({ col: Math.max(3, b.col - 2), row: b.row - 6, text: key });
  });
  const coreSign = isSabotageBlackout ? "LIGHTING BREAKER" : finaleKind === "CORE_EXTRACTION" ? "OVERLOAD CORE" : finaleKind === "DATA_HEIST" ? "VAULT UPLINK" : "CORE TERMINAL";
  signs.push({ col: Math.max(3, coreCol - 2), row: S[top] - 6, text: coreSign });
  const extraSigns = isSabotageBlackout
    ? ["TAKAMURI HALL // WR-3", "PROJECTOR SUBGRID", "RELAY-01", "POWER DISTRIBUTION"]
    : ["WADENS SECTOR", "MEMORY VAULT", "OVERRIDE", "HEX FIREWALL", "CARGO LIFT", "SERVICE BAY"];
  for (let f = 0; f < n - 1; f++) {
    if (f >= extraSigns.length) break;
    signs.push({ col: rng.int(8, cols - 24), row: S[f] - 5, text: extraSigns[(f + rng.int(0, 2)) % extraSigns.length] });
  }

  const steamVents: VrLevelDef["steamVents"] = [];
  for (let f = 0; f < n; f++) {
    const s = spotsAt(S[f], f);
    for (let i = 0; i < 2 && s.length; i++) steamVents.push({ col: rng.pick(s), row: S[f], dir: "up" });
    if (f < n - 1 && rng.chance(0.5)) steamVents.push({ col: rng.int(10, cols - 10), row: S[f + 1] + 2, dir: "down" });
  }

  /* ---------- ключевые точки ---------- */
  const firstLift = liftInfo[0];
  const cpFloor = firstLift ? firstLift.k + 1 : 1;
  const cpWant = firstLift ? (firstLift.side === 0 ? firstLift.ec + 9 : firstLift.ec - 6) : Math.floor(cols / 2);
  const cp = nearSpot(cpFloor, cpWant);

  let extractionGate: VrLevelDef["extractionGate"] = null;
  if (finaleKind === "CORE_EXTRACTION") {
    const gateWant = roomRight ? arr.c1 + 12 : arr.c0 - 12;
    const sp = nearSpot(top, gateWant);
    extractionGate = { col: sp.c, row: S[top] };
  }

  const coreLabel =
    finaleKind === "BLACKOUT_SWITCH" ? "LIGHTS BREAKER"
      : finaleKind === "CORE_EXTRACTION" ? "TRIGGER OVERLOAD"
        : finaleKind === "CIPHER_DECODE" ? "DECODE KERNEL"
          : finaleKind === "HEX_PURGE" ? "PURGE LATTICE"
            : finaleKind === "DATA_HEIST" ? "BREACH THE VAULT"
              : "ROUTE CORE";

  return {
    nodeId,
    nodeCode,
    tier,
    tuning,
    theme,
    finaleKind,
    isSabotageBlackout,
    ascii: grid.g.map((r) => r.join("")),
    spawn: { col: spawnCol, row: S[0] },
    checkpoint: { col: cp.c, row: cp.row },
    coreTerminal: { col: coreCol, row: S[top], label: coreLabel },
    extractionGate,
    elevators,
    doors,
    buttons,
    enemies,
    props,
    pickups,
    windows,
    signs,
    steamVents,
    floorRows: S.slice(),
  };
}

export function buildVrLevel(nodeId: string): VrLevelDef {
  const n = ALL_NODES.find((x) => x.id === nodeId);
  const meta = NODE_META[nodeId];
  const nodeCode = n?.code ?? nodeId.toUpperCase();
  const owner = meta?.owner ?? "indep";
  const rawTier = Math.max(1, Math.min(5, meta?.warden ?? 1)) as 1 | 2 | 3 | 4 | 5;
  return generateVrLevel({
    nodeId,
    nodeCode,
    owner,
    tuning: VR_TIER_TUNING[rawTier],
    finaleKind: finaleForNode(nodeId, rawTier),
  });
}
