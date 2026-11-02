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

/* 节点的访问要求 */
export interface Requirement {
  rep?: number;
  node?: string;        // 必须已入侵此节点
  file?: string;        // 必须持有此文件
  contract?: string;    // 必须已完成此合同
  upgrade?: string;     // 必须拥有此升级
}

export interface NodeMeta {
  id: string;
  cls: NodeClass;
  owner: string;        // 派系 id
  warden: number;       // 1..5
  rep: number;          // 基础 REP 奖励
  start?: boolean;      // 从一开始就可用
  restricted?: boolean; // 在满足要求前显示为 RESTRICTED
  req?: Requirement;
  files: string[];
  codex: string[];      // 首次成功入侵时揭示的 codex id
  intel?: string;       // 写入 codex 条目的简短情报行
  /** WARDEN PASS 门：操作员必须输入的字面密钥 */
  password?: string;
  /** 扫描后会揭示密钥的文件 */
  passwordFrom?: string;
  /** 只有在该合同进行中时才提供 SABOTAGE */
  sabotageGate?: string;
}

export interface DataFile {
  id: string;
  name: string;
  nameRu: string;
  cat: DataCat;
  source: string;       // 节点 id
  owner: string;        // 派系 id
  value: number;        // 在黑市上的点数价值
}

export interface CodexEntry {
  id: string;
  cat: CodexCat;
  title: string;
  titleRu: string;
  body: string;
  bodyRu: string;
  faction?: string;
  start?: boolean;      // 从一开始就已知
}

export interface ContractDef {
  id: string;
  kind: ContractKind;
  contact: string;
  client: string;       // 派系 id
  title: string;
  titleRu: string;
  brief: string;
  briefRu: string;
  target: string;       // 节点 id
  /** 所需的文件 id：仅限 DATA 合同 */
  file?: string;
  credits: number;
  rep: number;
  relation: number;     // 与客户的关系变化量
  repReq: number;
  /** 通过黑市而非 CONTACTS 提供 */
  market?: boolean;
  /** 由手写对话而非通用流程驱动 */
  scripted?: boolean;
  /** 仅在此区域获得许可后才提供 */
  regionReq?: string;
  /** 仅在此合同完成后才提供 */
  afterReq?: string;
}

/* ---------------- 黑市 ---------------- */

export interface ScriptDef {
  id: string;
  name: string;
  nameRu: string;
  desc: string;
  descRu: string;
  price: number;
  /** 冷却时间，单位为秒 */
  cooldown: number;
  /** 冻结时长，单位为秒（仅冻结脚本） */
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
  /** 没有自动问候：该联系人只通过脚本发言 */
  silent?: boolean;
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

/* ---------------- 持久化的游戏状态 ---------------- */

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
  hackCount: Record<string, number>;     // 按节点
  ops: number;                            // 自上次恢复以来的成功操作次数
  recovering: boolean;
  codex: Record<string, CodexState>;
  codexSeen: Record<string, boolean>;
  codexLog: { id: string; t: string; updated: boolean }[];
  files: string[];                        // 已拥有的文件 id
  contracts: Record<string, ContractProgress>;
  contacts: string[];                     // 已解锁的联系人 id
  threads: Record<string, ThreadMsg[]>;
  upgrades: string[];
  regions: string[];                      // 已解锁的区域 id
  market: MarketState;
  sabotaged: string[];                    // 被击溃的节点 id
  /** 仍明显冒烟的主机：下一次身份重置时清除 */
  burning: string[];
  /** 市场价值已耗尽的文件：已卖出一次或已交给客户 */
  burned: string[];
  /** 脚本化任务的记账数据 */
  flags: Record<string, string | boolean>;
  /** 操作员实际看过每个线程的多少条消息 */
  threadRead: Record<string, number>;
  stats: {
    hacks: number; contracts: number; files: number; nodes: number;
    sold: number; sabotage: number; failed: number;
  };
  unread: Record<TabId, number>;
}

export interface ThreadMsg {
  id: number;
  from: string;   // 联系人 id 或 "OP"
  /** 未存储语言变体时渲染的内容（旧存档） */
  text: string;
  /** 语言变体：保留它们，使切换 EN/RU 时能重新渲染旧消息 */
  textEn?: string;
  textRu?: string;
  t: string;
  contract?: string;
  action?: "offer" | "deliver" | "done";
  /** 脚本化回复按钮；选择其中一个会推进对话 */
  choices?: { id: string; en: string; ru: string }[];
  /** 操作员作答后选中的选项 id */
  picked?: string;
}
