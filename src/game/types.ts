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
  nameZh?: string;
  kind: FactionKind;
  codex?: string;
}

/* 节点访问条件。 */
export interface Requirement {
  rep?: number;
  node?: string;        // 必须已攻陷此节点
  file?: string;        // 必须持有此文件
  contract?: string;    // 必须已完成此合同
  upgrade?: string;     // 必须拥有此升级
}

export interface NodeMeta {
  id: string;
  cls: NodeClass;
  owner: string;        // 组织标识
  warden: number;       // 范围为 1 到 5
  rep: number;          // 基础 REP 奖励
  start?: boolean;      // 游戏开始时即可用
  restricted?: boolean; // 条件满足前显示为 RESTRICTED
  req?: Requirement;
  files: string[];
  codex: string[];      // 首次成功入侵时解锁的知识库条目标识
  intel?: string;       // 写入知识库条目的简短情报
  /** WARDEN PASS：保护节点的字面密码输入窗口。 */
  password?: string;
  /** 用于揭示密钥的文件。 */
  passwordFrom?: string;
  /** 仅在满足对应条件时提供。 */
  sabotageGate?: string;
  /** 外部防火墙节点：必须先攻破它。 */
  firewall?: string;
}

export interface DataFile {
  id: string;
  name: string;
  nameRu: string;
  nameZh?: string;
  cat: DataCat;
  source: string;       // 节点标识
  owner: string;        // 组织标识
  value: number;        // 在黑市中的信用点价值
}

export interface CodexEntry {
  id: string;
  cat: CodexCat;
  title: string;
  titleRu: string;
  titleZh?: string;
  body: string;
  bodyRu: string;
  bodyZh?: string;
  faction?: string;
  start?: boolean;      // 游戏开始时已知
}

export interface ContractDef {
  id: string;
  kind: ContractKind;
  contact: string;
  client: string;       // 组织标识
  title: string;
  titleRu: string;
  titleZh?: string;
  brief: string;
  briefRu: string;
  briefZh?: string;
  target: string;       // 节点标识
  
  file?: string;
  credits: number;
  rep: number;
  relation: number;     // 与委托方的关系变化
  repReq: number;
  /** 黑市。 */
  market?: boolean;
  /** 由手写对话流程驱动。 */
  scripted?: boolean;
  /** 仅在满足对应条件时提供。 */
  regionReq?: string;
  /** 仅在满足对应条件时提供。 */
  afterReq?: string;
}

/* 黑市。 */

export interface ScriptDef {
  id: string;
  name: string;
  nameRu: string;
  nameZh?: string;
  desc: string;
  descRu: string;
  descZh?: string;
  price: number;
  /** 冷却时间，单位为秒。 */
  cooldown: number;
  /** 冻结持续时间，单位为秒。 */
  freeze?: number;
}

export interface ContactDef {
  id: string;
  nick: string;
  faction: string;
  role: string;
  roleRu: string;
  roleZh?: string;
  repReq: number;
  intro: string;
  introRu: string;
  introZh?: string;
  /** 脚本。 */
  silent?: boolean;
}

export interface RegionUpgrade {
  id: string;
  region: string;
  name: string;
  nameRu: string;
  nameZh?: string;
  desc: string;
  descRu: string;
  descZh?: string;
  credits: number;
  repReq: number;
}

/* ---------------- 通知 ---------------- */

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
  | "SABOTAGE COMPLETE"
  | "KEY RECOVERED";

export type TabId = "CHAT" | "CODEX" | "CONTACTS" | "STATUS";

export interface Notif {
  id: number;
  kind: NotifKind;
  text: string;
  tab?: TabId;
  t: string;
}

/* 持久化游戏状态。 */

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
  hackCount: Record<string, number>;     // 按节点记录
  ops: number;                            // 上次重置后的成功操作次数
  recovering: boolean;
  codex: Record<string, CodexState>;
  codexSeen: Record<string, boolean>;
  codexLog: { id: string; t: string; updated: boolean }[];
  files: string[];                        // 已拥有文件的标识
  contracts: Record<string, ContractProgress>;
  contacts: string[];                     // 已解锁联系人的标识
  threads: Record<string, ThreadMsg[]>;
  upgrades: string[];
  regions: string[];                      // 已解锁区域的标识
  market: MarketState;
  sabotaged: string[];                    // 已被破坏的节点标识
  /** 身份重置前仍在冒烟的节点。 */
  burning: string[];
  /** 已交付或已出售、不能再次按原价变现的文件。 */
  burned: string[];
  /** 剧情任务使用的隐藏状态标记。 */
  flags: Record<string, string | boolean>;
  /** 每个联系人会话中已读到的消息数量。 */
  threadRead: Record<string, number>;
  stats: {
    hacks: number; contracts: number; files: number; nodes: number;
    sold: number; sabotage: number; failed: number;
  };
  unread: Record<TabId, number>;
}

export interface ThreadMsg {
  id: number;
  from: string;   // 联系人标识，或使用“OP”表示操作员
  /** 没有语言变体时使用的回退文本。 */
  text: string;
  /** 双语文本，便于切换语言后重新渲染历史消息。 */
  textEn?: string;
  textRu?: string;
  textZh?: string;
  t: string;
  contract?: string;
  action?: "offer" | "deliver" | "done";
  /** 脚本回复按钮。 */
  choices?: { id: string; en: string; ru: string; zh?: string }[];
  /** 已选择的选项标识。 */
  picked?: string;
  /** 本条消息附带的信用点收入，会以醒目的方式显示。 */
  payout?: number;
}
