import { ALL_NODES } from "../../data/regions";
import { NODE_META, NODE_REGION } from "../data";
import { themeForOwner } from "./themes";
import type {
  ButtonDef,
  DoorDef,
  ElevatorDef,
  EnemySpawnDef,
  HoloSignDef,
  PickupSpawnDef,
  PropSpawnDef,
  TierTuning,
  VrFinaleKind,
  VrLevelDef,
  WindowZoneDef,
} from "./types";

export const VR_TIER_TUNING: Record<1 | 2 | 3 | 4 | 5, TierTuning> = {
  1: {
    tier: 1,
    playerMaxHp: 6,
    enemyHpBonus: 0,
    enemyFireRateMult: 1.26,
    enemyBulletSpeedMult: 0.82,
    timedDoorSec: 22,
    failRep: 6,
    overloadEscapeSec: 26,
    bassBpm: 108,
  },
  2: {
    tier: 2,
    playerMaxHp: 5,
    enemyHpBonus: 0,
    enemyFireRateMult: 1.12,
    enemyBulletSpeedMult: 0.9,
    timedDoorSec: 18,
    failRep: 10,
    overloadEscapeSec: 24,
    bassBpm: 114,
  },
  3: {
    tier: 3,
    playerMaxHp: 5,
    enemyHpBonus: 1,
    enemyFireRateMult: 1.0,
    enemyBulletSpeedMult: 1.0,
    timedDoorSec: 16,
    failRep: 16,
    overloadEscapeSec: 24,
    bassBpm: 118,
  },
  4: {
    tier: 4,
    playerMaxHp: 5,
    enemyHpBonus: 1,
    enemyFireRateMult: 0.84,
    enemyBulletSpeedMult: 1.12,
    timedDoorSec: 14,
    failRep: 24,
    overloadEscapeSec: 22,
    bassBpm: 124,
  },
  5: {
    tier: 5,
    playerMaxHp: 5,
    enemyHpBonus: 2,
    enemyFireRateMult: 0.72,
    enemyBulletSpeedMult: 1.24,
    timedDoorSec: 12,
    failRep: 34,
    overloadEscapeSec: 24,
    bassBpm: 130,
  },
};

/**
 * Prototype scope: Virtuality Breach runs on all CORPORATE (CRP) nodes inside WEST1.
 */
export function usesVirtualityBreach(nodeId: string): boolean {
  const n = ALL_NODES.find((x) => x.id === nodeId);
  if (!n) return false;
  return NODE_REGION[nodeId] === "west1" && n.type === "CORPORATE";
}

export function finaleForNode(nodeId: string, tier: 1 | 2 | 3 | 4 | 5): VrFinaleKind {
  if (nodeId === "w1p_crp2") return "BLACKOUT_SWITCH";
  if (nodeId === "w1n_crp") return "SIGNAL_ROUTING";
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

function makeGrid(cols: number, rows: number) {
  const g: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "."));
  const fill = (c1: number, r1: number, c2: number, r2: number, ch: string) => {
    for (let r = Math.max(0, r1); r <= Math.min(rows - 1, r2); r++) {
      for (let c = Math.max(0, c1); c <= Math.min(cols - 1, c2); c++) {
        g[r][c] = ch;
      }
    }
  };
  // Outer containment perimeter
  fill(0, 0, cols - 1, 1, "#");
  fill(0, rows - 2, cols - 1, rows - 1, "#");
  fill(0, 0, 1, rows - 1, "#");
  fill(cols - 2, 0, cols - 1, rows - 1, "#");
  return { g, fill };
}

function buildTier1(
  nodeId: string,
  nodeCode: string,
  owner: string,
  tuning: TierTuning,
  finaleKind: VrFinaleKind
): VrLevelDef {
  const cols = 72;
  const rows = 28;
  const { g, fill } = makeGrid(cols, rows);
  const theme = themeForOwner(owner);

  // Ground is rows 26..27
  // Floor 2 deck at rows 11..12 (left dead zone cols 2..11, elev-a at 12..15, main deck 16..69)
  fill(2, 11, 11, 12, "#");
  fill(16, 11, 69, 12, "#");
  fill(32, 9, 40, 9, "=");
  fill(45, 7, 54, 7, "=");
  fill(56, 9, 63, 9, "=");

  // Mezzanine (row 20), Elev-A rests at row 20, bottom shaft sealed at row 21
  fill(11, 13, 11, 20, "#");
  fill(2, 20, 11, 21, "#");
  fill(12, 21, 15, 21, "#");
  fill(16, 20, 19, 21, "#");
  // Red Gate wall at col 18 (rows 13..16 solid, 17..19 gate)
  fill(18, 13, 18, 16, "#");
  fill(20, 20, 32, 20, "#");
  fill(35, 20, 47, 20, "=");
  fill(50, 20, 69, 20, "#");

  // Climb from ground row 26 up to mezzanine row 20 on far right (step = 2 tiles each!)
  fill(61, 24, 68, 24, "=");
  fill(53, 22, 60, 22, "=");
  fill(28, 25, 30, 25, "#");

  const elevators: ElevatorDef[] = [
    { id: "elev-a", col: 12, widthTiles: 4, topRow: 11, bottomRow: 20, speed: 95 },
  ];
  const doors: DoorDef[] = [
    { id: "door-red", color: "red", col: 18, topRow: 17, heightTiles: 3, timedSeconds: null },
  ];
  const buttons: ButtonDef[] = [
    { id: "btn-red", color: "red", col: 66, row: 20, label: "GATE-01 OVERRIDE" },
  ];
  const enemies: EnemySpawnDef[] = [
    { kind: "thug", col: 25, row: 26, facing: -1, patrolMinCol: 20, patrolMaxCol: 34 },
    { kind: "thug", col: 44, row: 26, facing: -1, patrolMinCol: 36, patrolMaxCol: 54 },
    { kind: "drone", col: 40, row: 17, facing: -1, patrolMinCol: 30, patrolMaxCol: 52 },
    { kind: "thug", col: 28, row: 20, facing: 1, patrolMinCol: 21, patrolMaxCol: 31 },
    { kind: "thug", col: 36, row: 11, facing: -1, patrolMinCol: 28, patrolMaxCol: 48 },
    { kind: "drone", col: 54, row: 5, facing: -1, patrolMinCol: 42, patrolMaxCol: 64 },
  ];
  const props: PropSpawnDef[] = [
    { kind: "crate", col: 11, row: 26, drop: "ammo" },
    { kind: "barrel", col: 38, row: 26 },
    { kind: "monitor", col: 55, row: 20 },
    { kind: "crate", col: 30, row: 11, drop: "health" },
    { kind: "barrel", col: 50, row: 11 },
  ];
  const pickups: PickupSpawnDef[] = [
    { kind: "shotgun", col: 52, row: 20 },
    { kind: "health", col: 63, row: 26 },
    { kind: "ammo", col: 48, row: 7 },
  ];
  const windows: WindowZoneDef[] = [
    { col: 24, row: 14, wCols: 16, hRows: 5 },
    { col: 28, row: 3, wCols: 18, hRows: 5 },
  ];
  const signs: HoloSignDef[] = [
    { col: 4, row: 22, text: `${theme.corpLabel.split(" ")[0]} // VR-T1` },
    { col: 58, row: 16, text: "GATE KEY" },
    { col: 56, row: 5, text: "CORE KERNEL" },
  ];

  return {
    nodeId,
    nodeCode,
    tier: 1,
    tuning,
    theme,
    finaleKind,
    isSabotageBlackout: false,
    ascii: g.map((r) => r.join("")),
    spawn: { col: 4, row: 26 },
    checkpoint: { col: 20, row: 11 },
    coreTerminal: { col: 65, row: 11, label: "ROUTE KERNEL" },
    extractionGate: null,
    elevators,
    doors,
    buttons,
    enemies,
    props,
    pickups,
    windows,
    signs,
    steamVents: [
      { col: 34, row: 26, dir: "up" },
      { col: 42, row: 11, dir: "up" },
    ],
  };
}

function buildTier2(
  nodeId: string,
  nodeCode: string,
  owner: string,
  tuning: TierTuning,
  finaleKind: VrFinaleKind
): VrLevelDef {
  const cols = 86;
  const rows = 34;
  const { g, fill } = makeGrid(cols, rows);
  const theme = themeForOwner(owner);

  // Floor 3 (rows 9..10) — Elev B shaft open at cols 74..77
  fill(2, 9, 73, 10, "#");
  fill(78, 9, 83, 10, "#");
  fill(26, 7, 36, 7, "=");
  fill(46, 7, 58, 7, "=");

  // Floor 2 (rows 18..19)
  fill(2, 18, 11, 19, "#");
  fill(12, 18, 15, 19, "."); // Clear Elev A top shaft
  fill(16, 18, 73, 19, "#");
  fill(74, 19, 77, 19, "#"); // Solid floor beneath Elev B bottom stop (row 18)
  fill(78, 18, 83, 19, "#");
  // Floor 2 West Vault steps for Blue Key
  fill(9, 16, 11, 16, "=");
  fill(3, 14, 9, 14, "=");
  // Floor 2 Blue Door at col 68 (rows 15..17)
  fill(68, 11, 68, 14, "#");

  // Floor 1 Mezzanine (row 26)
  fill(11, 20, 11, 26, "#");
  fill(2, 26, 11, 27, "#");
  fill(12, 27, 15, 27, "#");
  fill(16, 26, 19, 27, "#");
  fill(18, 20, 18, 22, "#"); // Red Door above wall
  fill(20, 26, 36, 26, "#");
  fill(39, 26, 52, 26, "=");
  fill(55, 26, 83, 26, "#");

  // Climb from Ground (row 32) up to Mezzanine (row 26)
  fill(76, 30, 82, 30, "=");
  fill(68, 28, 75, 28, "=");
  fill(40, 30, 46, 30, "=");
  fill(34, 28, 39, 28, "=");

  return {
    nodeId,
    nodeCode,
    tier: 2,
    tuning,
    theme,
    finaleKind,
    isSabotageBlackout: false,
    ascii: g.map((r) => r.join("")),
    spawn: { col: 4, row: 32 },
    checkpoint: { col: 19, row: 18 },
    coreTerminal: { col: 8, row: 9, label: "BREACH HEXLATTICE" },
    extractionGate: null,
    elevators: [
      { id: "elev-a", col: 12, widthTiles: 4, topRow: 18, bottomRow: 26, speed: 98 },
      { id: "elev-b", col: 74, widthTiles: 4, topRow: 9, bottomRow: 18, speed: 105 },
    ],
    doors: [
      { id: "door-red", color: "red", col: 18, topRow: 23, heightTiles: 3, timedSeconds: null },
      { id: "door-blue", color: "blue", col: 68, topRow: 15, heightTiles: 3, timedSeconds: null },
    ],
    buttons: [
      { id: "btn-red", color: "red", col: 80, row: 26, label: "GATE-01 OVERRIDE" },
      { id: "btn-blue", color: "blue", col: 5, row: 14, label: "COBALT LOCK" },
    ],
    enemies: [
      { kind: "thug", col: 25, row: 32, facing: -1, patrolMinCol: 18, patrolMaxCol: 34 },
      { kind: "heavy", col: 50, row: 32, facing: -1, patrolMinCol: 42, patrolMaxCol: 60 },
      { kind: "thug", col: 70, row: 32, facing: -1, patrolMinCol: 62, patrolMaxCol: 78 },
      { kind: "drone", col: 44, row: 22, facing: -1, patrolMinCol: 32, patrolMaxCol: 58 },
      { kind: "thug", col: 28, row: 26, facing: 1, patrolMinCol: 21, patrolMaxCol: 35 },
      { kind: "thug", col: 6, row: 14, facing: 1, patrolMinCol: 3, patrolMaxCol: 9 },
      { kind: "heavy", col: 40, row: 18, facing: -1, patrolMinCol: 30, patrolMaxCol: 52 },
      { kind: "turret", col: 60, row: 11, facing: -1, patrolMinCol: 60, patrolMaxCol: 60 },
      { kind: "drone", col: 52, row: 5, facing: 1, patrolMinCol: 38, patrolMaxCol: 66 },
      { kind: "heavy", col: 28, row: 9, facing: 1, patrolMinCol: 18, patrolMaxCol: 40 },
    ],
    props: [
      { kind: "crate", col: 10, row: 32, drop: "ammo" },
      { kind: "barrel", col: 46, row: 32 },
      { kind: "monitor", col: 66, row: 26 },
      { kind: "crate", col: 25, row: 18, drop: "health" },
      { kind: "barrel", col: 56, row: 18 },
      { kind: "crate", col: 62, row: 9, drop: "ammo" },
      { kind: "barrel", col: 22, row: 9 },
    ],
    pickups: [
      { kind: "shotgun", col: 42, row: 32 },
      { kind: "smg", col: 8, row: 18 },
      { kind: "health", col: 81, row: 18 },
      { kind: "ammo", col: 52, row: 7 },
    ],
    windows: [
      { col: 24, row: 21, wCols: 16, hRows: 4 },
      { col: 26, row: 12, wCols: 18, hRows: 5 },
      { col: 18, row: 3, wCols: 20, hRows: 4 },
    ],
    signs: [
      { col: 4, row: 28, text: `${theme.corpLabel.split(" ")[0]} // VR-T2` },
      { col: 72, row: 22, text: "OVERRIDE" },
      { col: 14, row: 4, text: "HEX FIREWALL" },
    ],
    steamVents: [
      { col: 36, row: 32, dir: "up" },
      { col: 34, row: 18, dir: "up" },
      { col: 44, row: 9, dir: "up" },
    ],
  };
}

function buildTier3Plus(
  nodeId: string,
  nodeCode: string,
  owner: string,
  tuning: TierTuning,
  finaleKind: VrFinaleKind
): VrLevelDef {
  const tier = tuning.tier;
  const isSabotageBlackout = nodeId === "w1p_crp2";
  const cols = tier === 3 ? 104 : 120;
  const rows = 44;
  const { g, fill } = makeGrid(cols, rows);
  const theme = themeForOwner(owner);

  const elevACol = 16;
  const elevBCol = cols - 20; // 84 for T3, 100 for T4/T5
  const blueDoorCol = elevBCol - 6;
  const greenDoorCol = 26;

  // Floor 3 (rows 11..13) — Elev B shaft open at cols elevBCol..elevBCol+3
  fill(2, 11, elevBCol - 1, 13, "#");
  fill(elevBCol + 4, 11, cols - 3, 13, "#");
  // Green timed gate wall at col 26
  fill(greenDoorCol, 2, greenDoorCol, 7, "#");
  // Floor 3 combat catwalks
  fill(48, 7, 62, 7, "=");
  fill(38, 9, 46, 9, "=");
  fill(64, 9, 72, 9, "=");

  // Floor 2 (rows 23..25)
  fill(2, 23, elevACol - 1, 25, "#");
  fill(elevACol + 4, 23, elevBCol - 1, 25, "#");
  fill(elevBCol, 24, elevBCol + 3, 25, "#");
  fill(elevBCol + 4, 23, cols - 3, 25, "#");
  // Blue door wall above row 20..22
  fill(blueDoorCol, 14, blueDoorCol, 19, "#");
  // Left Server Vault platforms (cols 3..14)
  fill(11, 21, 14, 21, "=");
  fill(3, 19, 10, 19, "=");
  // Mid Floor 2 combat catwalks
  fill(36, 21, 44, 21, "=");
  fill(48, 19, 62, 19, "=");
  fill(66, 21, 74, 21, "=");

  // Floor 1 Mezzanine (row 36)
  fill(15, 26, 15, 36, "#");
  fill(2, 36, 15, 37, "#");
  fill(elevACol, 37, elevACol + 3, 37, "#");
  fill(20, 36, 23, 37, "#");
  fill(21, 26, 21, 32, "#"); // Red door above col 21 (rows 33..35 open for door)
  fill(24, 36, 38, 36, "#");
  fill(42, 36, 56, 36, "=");
  fill(60, 36, 78, 36, "#");
  fill(81, 36, cols - 10, 36, "=");
  fill(cols - 9, 36, cols - 3, 36, "#");

  // Climb Ground (row 42) -> Mezzanine (row 36)
  fill(cols - 9, 40, cols - 4, 40, "=");
  fill(cols - 17, 38, cols - 11, 38, "=");
  fill(51, 40, 56, 40, "=");
  fill(43, 38, 49, 38, "=");
  fill(28, 41, 30, 41, "#");
  fill(68, 41, 70, 41, "#");

  const elevators: ElevatorDef[] = [
    { id: "elev-a", col: elevACol, widthTiles: 4, topRow: 23, bottomRow: 36, speed: 98 },
    { id: "elev-b", col: elevBCol, widthTiles: 4, topRow: 11, bottomRow: 23, speed: 108 },
  ];

  const doors: DoorDef[] = [
    { id: "door-red", color: "red", col: 21, topRow: 33, heightTiles: 3, timedSeconds: null },
    { id: "door-blue", color: "blue", col: blueDoorCol, topRow: 20, heightTiles: 3, timedSeconds: null },
    { id: "door-green", color: "green", col: greenDoorCol, topRow: 8, heightTiles: 3, timedSeconds: tuning.timedDoorSec },
  ];

  const buttons: ButtonDef[] = [
    { id: "btn-red", color: "red", col: cols - 6, row: 36, label: "GATE-01 OVERRIDE" },
    { id: "btn-blue", color: "blue", col: 6, row: 19, label: "GATE-02 OVERRIDE" },
    { id: "btn-green", color: "green", col: 56, row: 7, label: `CORE LOCK (${tuning.timedDoorSec}S)` },
  ];

  const enemies: EnemySpawnDef[] = [
    // Floor 1 Ground
    { kind: "thug", col: 26, row: 42, facing: -1, patrolMinCol: 22, patrolMaxCol: 34 },
    { kind: "thug", col: 44, row: 42, facing: -1, patrolMinCol: 35, patrolMaxCol: 54 },
    { kind: "heavy", col: 66, row: 42, facing: -1, patrolMinCol: 58, patrolMaxCol: 76 },
    { kind: "thug", col: cols - 20, row: 42, facing: -1, patrolMinCol: cols - 30, patrolMaxCol: cols - 10 },
    // Floor 1 Mezzanine
    { kind: "turret", col: cols - 24, row: 26, facing: -1, patrolMinCol: cols - 24, patrolMaxCol: cols - 24 },
    { kind: "heavy", col: 70, row: 36, facing: 1, patrolMinCol: 61, patrolMaxCol: 77 },
    { kind: "thug", col: 33, row: 36, facing: 1, patrolMinCol: 25, patrolMaxCol: 37 },
    { kind: "drone", col: 52, row: 31, facing: -1, patrolMinCol: 42, patrolMaxCol: 62 },
    // Floor 2
    { kind: "thug", col: 8, row: 19, facing: 1, patrolMinCol: 4, patrolMaxCol: 10 },
    { kind: "drone", col: 30, row: 17, facing: -1, patrolMinCol: 22, patrolMaxCol: 40 },
    { kind: "heavy", col: 54, row: 23, facing: -1, patrolMinCol: 44, patrolMaxCol: 66 },
    { kind: "thug", col: 53, row: 19, facing: -1, patrolMinCol: 49, patrolMaxCol: 61 },
    { kind: "turret", col: blueDoorCol - 12, row: 14, facing: -1, patrolMinCol: blueDoorCol - 12, patrolMaxCol: blueDoorCol - 12 },
    { kind: "heavy", col: blueDoorCol - 8, row: 23, facing: -1, patrolMinCol: blueDoorCol - 16, patrolMaxCol: blueDoorCol - 2 },
    // Floor 3
    { kind: "thug", col: elevBCol - 12, row: 11, facing: 1, patrolMinCol: elevBCol - 20, patrolMaxCol: elevBCol - 4 },
    { kind: "turret", col: 70, row: 2, facing: 1, patrolMinCol: 70, patrolMaxCol: 70 },
    { kind: "drone", col: 60, row: 5, facing: 1, patrolMinCol: 48, patrolMaxCol: 72 },
    { kind: "heavy", col: 44, row: 11, facing: 1, patrolMinCol: 33, patrolMaxCol: 55 },
    { kind: "thug", col: 34, row: 11, facing: 1, patrolMinCol: 28, patrolMaxCol: 42 },
  ];

  // Higher tiers add extra turrets & ambush guards
  if (tier >= 4) {
    enemies.push(
      { kind: "turret", col: 38, row: 26, facing: 1, patrolMinCol: 38, patrolMaxCol: 38 },
      { kind: "drone", col: 84, row: 18, facing: -1, patrolMinCol: 72, patrolMaxCol: 94 },
      { kind: "heavy", col: 18, row: 11, facing: 1, patrolMinCol: 10, patrolMaxCol: 24 }
    );
  }
  if (tier >= 5) {
    enemies.push(
      { kind: "turret", col: 46, row: 2, facing: -1, patrolMinCol: 46, patrolMaxCol: 46 },
      { kind: "turret", col: 86, row: 2, facing: -1, patrolMinCol: 86, patrolMaxCol: 86 },
      { kind: "drone", col: 18, row: 6, facing: 1, patrolMinCol: 8, patrolMaxCol: 24 }
    );
  }

  const props: PropSpawnDef[] = [
    { kind: "crate", col: 11, row: 42, drop: "ammo" },
    { kind: "barrel", col: 38, row: 42 },
    { kind: "monitor", col: 58, row: 42 },
    { kind: "barrel", col: 64, row: 42 },
    { kind: "crate", col: 80, row: 42, drop: "health" },
    { kind: "monitor", col: cols - 12, row: 36 },
    { kind: "barrel", col: 66, row: 36 },
    { kind: "monitor", col: 12, row: 23 },
    { kind: "crate", col: 34, row: 23, drop: "ammo" },
    { kind: "barrel", col: 49, row: 23 },
    { kind: "monitor", col: 60, row: 19 },
    { kind: "crate", col: elevBCol + 6, row: 23, drop: "health" },
    { kind: "crate", col: elevBCol + 6, row: 11, drop: "ammo" },
    { kind: "barrel", col: 40, row: 11 },
    { kind: "crate", col: 20, row: 11, drop: "health" },
  ];

  const pickups: PickupSpawnDef[] = [
    { kind: "shotgun", col: 60, row: 42 },
    { kind: "health", col: cols - 16, row: 42 },
    { kind: "smg", col: 8, row: 23 },
    { kind: "ammo", col: 55, row: 19 },
    { kind: "health", col: elevBCol + 5, row: 11 },
    { kind: "ammo", col: 75, row: 11 },
  ];

  const windows: WindowZoneDef[] = [
    { col: 28, row: 29, wCols: 14, hRows: 5 },
    { col: 66, row: 29, wCols: 16, hRows: 5 },
    { col: 28, row: 15, wCols: 18, hRows: 6 },
    { col: 60, row: 15, wCols: 16, hRows: 6 },
    { col: 6, row: 4, wCols: 14, hRows: 5 },
    { col: 36, row: 4, wCols: 18, hRows: 5 },
    { col: 72, row: 4, wCols: 14, hRows: 5 },
  ];

  const signs: HoloSignDef[] = isSabotageBlackout
    ? [
        { col: 4, row: 38, text: "TAKAMURI HALL // WR-3" },
        { col: 44, row: 31, text: "PROJECTOR SUBGRID" },
        { col: cols - 14, row: 32, text: "RELAY-01" },
        { col: 28, row: 17, text: "POWER DISTRIBUTION" },
        { col: 8, row: 5, text: "LIGHTING BREAKER" },
      ]
    : [
        { col: 4, row: 38, text: `${theme.corpLabel.split(" ")[0]} // VR-T${tier}` },
        { col: 44, row: 31, text: "ICE SECTOR" },
        { col: cols - 14, row: 32, text: "OVERRIDE" },
        { col: 28, row: 17, text: "MEMORY VAULT" },
        { col: 10, row: 5, text: finaleKind === "CORE_EXTRACTION" ? "OVERLOAD CORE" : "CORE TERMINAL" },
      ];

  const coreLabel =
    finaleKind === "BLACKOUT_SWITCH"
      ? "LIGHTS BREAKER"
      : finaleKind === "CORE_EXTRACTION"
        ? "TRIGGER OVERLOAD"
        : finaleKind === "CIPHER_DECODE"
          ? "DECODE KERNEL"
          : finaleKind === "HEX_PURGE"
            ? "PURGE LATTICE"
            : "ROUTE CORE";

  return {
    nodeId,
    nodeCode,
    tier,
    tuning,
    theme,
    finaleKind,
    isSabotageBlackout,
    ascii: g.map((r) => r.join("")),
    spawn: { col: 4, row: 42 },
    checkpoint: { col: 23, row: 23 },
    coreTerminal: { col: 10, row: 11, label: coreLabel },
    extractionGate:
      finaleKind === "CORE_EXTRACTION"
        ? { col: cols - 8, row: 11 }
        : null,
    elevators,
    doors,
    buttons,
    enemies,
    props,
    pickups,
    windows,
    signs:
      finaleKind === "CORE_EXTRACTION"
        ? [...signs, { col: cols - 13, row: 5, text: "EXTRACT GATE" }]
        : signs,
    steamVents: [
      { col: 9, row: 37, dir: "down" },
      { col: 57, row: 42, dir: "up" },
      { col: 38, row: 23, dir: "up" },
      { col: blueDoorCol - 10, row: 14, dir: "down" },
      { col: 48, row: 11, dir: "up" },
    ],
  };
}

export function buildVrLevel(nodeId: string): VrLevelDef {
  const n = ALL_NODES.find((x) => x.id === nodeId);
  const meta = NODE_META[nodeId];
  const nodeCode = n?.code ?? nodeId.toUpperCase();
  const owner = meta?.owner ?? "indep";
  const rawTier = Math.max(1, Math.min(5, meta?.warden ?? 1)) as 1 | 2 | 3 | 4 | 5;
  const tuning = VR_TIER_TUNING[rawTier];
  const finaleKind = finaleForNode(nodeId, rawTier);

  if (rawTier === 1) return buildTier1(nodeId, nodeCode, owner, tuning, finaleKind);
  if (rawTier === 2) return buildTier2(nodeId, nodeCode, owner, tuning, finaleKind);
  return buildTier3Plus(nodeId, nodeCode, owner, tuning, finaleKind);
}
