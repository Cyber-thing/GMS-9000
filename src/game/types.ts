export type NodeState = "LOCKED" | "AVAILABLE" | "COMPROMISED" | "RESTRICTED";
export type NodeClass = "CORPORATE" | "GOVERNMENT" | "PRIVATE" | "PUBLIC" | "UNDERGROUND";

export type CodexCat = "FACTIONS" | "CHARACTERS" | "LOCATIONS" | "NETWORK" | "INTEL";
export type CodexState = "UNKNOWN" | "DISCOVERED" | "UPDATED";

export type DataCat = "CORPORATE DATA" | "CLASSIFIED DATA" | "PERSONAL DATA" | "INTEL";

export type ContractState =
  | "AVAILABLE"
  | "ACCEPTED"
  | "TARGET ACCESSED"
  | "DATA ACQUIRED"
  | "SABOTAGED"
  | "DELIVERED"
  | "COMPLETED"
  | "FAILED";

export type ContractKind = "DATA" | "SABOTAGE";

export type FactionKind = "CORP" | "CREW" | "GOV";

export interface Faction {
  id: string;
  name: string;
  nameRu: string;
  kind: FactionKind;
  codex?: string;
}

/* access requirement for a node */
export interface Requirement {
  rep?: number;
  node?: string;        // must have compromised this node
  file?: string;        // must hold this file
  contract?: string;    // must have completed this contract
  upgrade?: string;     // must own this upgrade
}

export interface NodeMeta {
  id: string;
  cls: NodeClass;
  owner: string;        // faction id
  warden: number;       // 1..5
  rep: number;          // base REP reward
  start?: boolean;      // available from the beginning
  restricted?: boolean; // shown as RESTRICTED until requirement met
  req?: Requirement;
  files: string[];
  codex: string[];      // codex ids revealed on first successful hack
  intel?: string;       // short intel line written into the codex entry
}

export interface DataFile {
  id: string;
  name: string;
  nameRu: string;
  cat: DataCat;
  source: string;       // node id
  owner: string;        // faction id
  value: number;        // credits worth on the black market
}

export interface CodexEntry {
  id: string;
  cat: CodexCat;
  title: string;
  titleRu: string;
  body: string;
  bodyRu: string;
  faction?: string;
  start?: boolean;      // known from the start
}

export interface ContractDef {
  id: string;
  kind: ContractKind;
  contact: string;
  client: string;       // faction id
  title: string;
  titleRu: string;
  brief: string;
  briefRu: string;
  target: string;       // node id
  /** required file id — DATA contracts only */
  file?: string;
  credits: number;
  rep: number;
  relation: number;     // relation delta with the client
  repReq: number;
  /** offered through the black market instead of CONTACTS */
  market?: boolean;
  /** only offered once this region has been licensed */
  regionReq?: string;
  /** only offered after this contract has been completed */
  afterReq?: string;
}

/* ---------------- black market ---------------- */

export interface ScriptDef {
  id: string;
  name: string;
  nameRu: string;
  desc: string;
  descRu: string;
  price: number;
  /** cooldown in seconds */
  cooldown: number;
  /** freeze duration, seconds (freeze script only) */
  freeze?: number;
}

export interface ContactDef {
  id: string;
  nick: string;
  faction: string;
  role: string;
  roleRu: string;
  repReq: number;
  intro: string;
  introRu: string;
}

export interface RegionUpgrade {
  id: string;
  region: string;
  name: string;
  nameRu: string;
  desc: string;
  descRu: string;
  credits: number;
  repReq: number;
}

/* ---------------- notifications ---------------- */

export type NotifKind =
  | "NEW CODEX ENTRY"
  | "CODEX UPDATED"
  | "NEW CONTACT MESSAGE"
  | "NEW CONTRACT"
  | "CONTRACT COMPLETED"
  | "NODE UNLOCKED"
  | "NEW REGION AVAILABLE"
  | "REP INCREASED"
  | "FACTION RELATIONS CHANGED"
  | "DATA ACQUIRED"
  | "SYSTEM RECOVERY REQUIRED"
  | "WARDEN LOCKOUT"
  | "CONTRACT FAILED"
  | "DATA SOLD"
  | "SCRIPT ACQUIRED"
  | "BLACK MARKET ONLINE"
  | "SABOTAGE COMPLETE";

export type TabId = "CHAT" | "CODEX" | "CONTACTS" | "STATUS";

export interface Notif {
  id: number;
  kind: NotifKind;
  text: string;
  tab?: TabId;
  t: string;
}

/* ---------------- persisted game state ---------------- */

export interface ContractProgress {
  state: ContractState;
  accepted?: boolean;
}

export interface MarketState {
  unlocked: boolean;
  scripts: string[];
}

export interface GameState {
  rep: number;
  credits: number;
  relations: Record<string, number>;
  nodeStates: Record<string, NodeState>;
  hackCount: Record<string, number>;     // per node
  ops: number;                            // successful ops since last recovery
  recovering: boolean;
  codex: Record<string, CodexState>;
  codexSeen: Record<string, boolean>;
  codexLog: { id: string; t: string; updated: boolean }[];
  files: string[];                        // owned file ids
  contracts: Record<string, ContractProgress>;
  contacts: string[];                     // unlocked contact ids
  threads: Record<string, ThreadMsg[]>;
  upgrades: string[];
  regions: string[];                      // unlocked region ids
  market: MarketState;
  sabotaged: string[];                    // node ids knocked out
  stats: {
    hacks: number; contracts: number; files: number; nodes: number;
    sold: number; sabotage: number; failed: number;
  };
  unread: Record<TabId, number>;
}

export interface ThreadMsg {
  id: number;
  from: string;   // contact id or "OP"
  text: string;
  t: string;
  contract?: string;
  action?: "offer" | "deliver" | "done";
  /** small-talk awaiting a yes/no — stores the prompt id once answered */
  ask?: string;
  answered?: "yes" | "no";
}
