export type VrPhase =
  | "dive"
  | "materialize"
  | "playing"
  | "finale"
  | "blackout"
  | "paused"
  | "victory"
  | "defeat";

export type WeaponId = "pistol" | "shotgun" | "smg";
export type DoorColor = "red" | "blue" | "green";
export type EnemyKind = "thug" | "heavy" | "drone" | "turret";
/** Вариант моба: swift — частые выстрелы, plated — +броня, volley — быстрые снаряды. */
export type EnemyVariant = "std" | "swift" | "plated" | "volley";
export type EnemyAIState = "patrol" | "alert" | "attack" | "retreat" | "dead";
export type PropKind = "crate" | "monitor" | "barrel";
export type PickupKind = "health" | "shotgun" | "smg" | "ammo";
export type AimMode = "straight" | "upDiag" | "up" | "downDiag" | "down";

export type CorpThemeId =
  | "takamuri"
  | "intercell"
  | "slayer"
  | "agogee"
  | "fusion"
  | "gexogen"
  | "indep";

export type VrFinaleKind =
  | "BLACKOUT_SWITCH"
  | "SIGNAL_ROUTING"
  | "HEX_PURGE"
  | "CIPHER_DECODE"
  | "DATA_HEIST"
  | "CORE_EXTRACTION";

export interface VrCorpTheme {
  id: CorpThemeId;
  corpLabel: string;
  realityName: string;
  skyTop: string;
  skyBot: string;
  horizonGlow: string;
  gridColor: string;
  skylineFar: string;
  skylineNear: string;
  towerAccent: string;
  tileCore: string;
  tileRecess: string;
  tileRim: string;
  tileWire: string;
  onewayTop: string;
  onewayGlow: string;
  primary: string;
  secondary: string;
  danger: string;
  ok: string;
  enemyAccent: string;
  windowTint: string;
  motif: "orbital" | "helix" | "monolith" | "prism" | "reactor" | "biomed" | "glitch";
}

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  shortName: string;
  fireRate: number;
  damage: number;
  bulletSpeed: number;
  pellets: number;
  spreadRad: number;
  knockback: number;
  muzzleColor: string;
  bulletColor: string;
  recoil: number;
  maxAmmo: number;
  auto: boolean;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  shootHeld: boolean;
  shootPressed: boolean;
  dashPressed: boolean;
  interactPressed: boolean;
  cycleWeaponPressed: boolean;
  selectWeapon: WeaponId | null;
}

export interface DoorDef {
  id: string;
  color: DoorColor;
  col: number;
  topRow: number;
  heightTiles: number;
  timedSeconds: number | null;
}

export interface ButtonDef {
  id: string;
  color: DoorColor;
  col: number;
  row: number;
  label: string;
}

export interface ElevatorDef {
  id: string;
  col: number;
  widthTiles: number;
  topRow: number;
  bottomRow: number;
  speed: number;
}

export interface EnemySpawnDef {
  kind: EnemyKind;
  col: number;
  row: number;
  facing: 1 | -1;
  patrolMinCol: number;
  patrolMaxCol: number;
  variant?: EnemyVariant;
}

export interface PropSpawnDef {
  kind: PropKind;
  col: number;
  row: number;
  drop?: PickupKind;
}

export interface PickupSpawnDef {
  kind: PickupKind;
  col: number;
  row: number;
}

export interface WindowZoneDef {
  col: number;
  row: number;
  wCols: number;
  hRows: number;
}

export interface HoloSignDef {
  col: number;
  row: number;
  text: string;
  color?: string;
}

export interface TierTuning {
  tier: 1 | 2 | 3 | 4 | 5;
  playerMaxHp: number;
  enemyHpBonus: number;
  enemyFireRateMult: number;
  enemyBulletSpeedMult: number;
  timedDoorSec: number;
  failRep: number;
  overloadEscapeSec: number;
  bassBpm: number;
}

export interface VrLevelDef {
  nodeId: string;
  nodeCode: string;
  tier: 1 | 2 | 3 | 4 | 5;
  tuning: TierTuning;
  theme: VrCorpTheme;
  finaleKind: VrFinaleKind;
  isSabotageBlackout: boolean;
  ascii: string[];
  spawn: { col: number; row: number };
  checkpoint: { col: number; row: number };
  coreTerminal: { col: number; row: number; label: string };
  extractionGate: { col: number; row: number } | null;
  elevators: ElevatorDef[];
  doors: DoorDef[];
  buttons: ButtonDef[];
  /** Верхние строки этажей (сверху вниз по индексу = снизу вверх). */
  floorRows: number[];
  enemies: EnemySpawnDef[];
  props: PropSpawnDef[];
  pickups: PickupSpawnDef[];
  windows: WindowZoneDef[];
  signs: HoloSignDef[];
  steamVents: Array<{ col: number; row: number; dir: "up" | "down" }>;
}

export interface DoorStatusHud {
  color: DoorColor;
  isOpen: boolean;
  timerRemaining: number | null;
  timerTotal: number | null;
}

export interface VrHudSnapshot {
  phase: VrPhase;
  tier: number;
  corpLabel: string;
  realityName: string;
  finaleKind: VrFinaleKind;
  isSabotageBlackout: boolean;
  overloadActive: boolean;
  overloadRemaining: number | null;
  blackoutActive: boolean;
  hp: number;
  maxHp: number;
  weapon: WeaponId;
  unlockedWeapons: WeaponId[];
  ammo: Record<WeaponId, number>;
  kills: number;
  totalEnemies: number;
  propsDestroyed: number;
  elapsedTime: number;
  damageTaken: number;
  checkpointSaved: boolean;
  doors: DoorStatusHud[];
  promptText: string | null;
  bannerText: string | null;
  crtEnabled: boolean;
  floorNumber: number;
  diveProgress: number;
  buildProgress: number;
}
