import { ALL_NODES } from "../data/regions";
import { REGION_DATA } from "../data/regions";
import type {
  CodexEntry,
  ContactDef,
  ContractDef,
  DataFile,
  Faction,
  NodeClass,
  NodeMeta,
  RegionUpgrade,
  ScriptDef,
} from "./types";

/* 可调参数。 */

export const CFG = {
  opsLimit: 5,            // GENIUS 重置前允许的成功入侵次数
  recoveryMs: 4200,       // 重置持续时间
  repeatMult: 0,          // 重复入侵不再获得任何 REP
  repPerWarden: 6,        // REP 计算公式
  relHitPerWarden: -3,    // 每级 WARDEN 对所有者关系的影响
  relRepeatMult: 0.4,     // 重复入侵时的关系影响倍率
  startCredits: 250,
  startRep: 0,
  marketPrice: 1500,       // 解锁黑市所需信用点
  sellBonusQuest: 1.9,     // 出售合同数据时的价格倍率
  sellRelHit: -14,         // 与数据所有者的关系损失
  betrayRelHit: -25,       // 背叛委托方时的关系损失
  betrayCrewGain: 12,      // 与地下组织的关系增益
  resellMult: 0.07,        // 已出售文件再次出售时几乎没有价值
};

/* 组织与派系。 */

export const FACTIONS: Faction[] = [
  { id: "intercell", name: "Intercell Synthetics", nameRu: "Intercell Synthetics", kind: "CORP", codex: "f_intercell" },
  { id: "slayer", name: "Slayer Incorporated", nameRu: "Slayer Incorporated", kind: "CORP", codex: "f_slayer" },
  { id: "agogee", name: "Agogee Heights", nameRu: "Agogee Heights", kind: "CORP", codex: "f_agogee" },
  { id: "fusion", name: "Fusion Cybernetics", nameRu: "Fusion Cybernetics", kind: "CORP", codex: "f_fusion" },
  { id: "takamuri", name: "Takamuri Global", nameRu: "Takamuri Global", kind: "CORP", codex: "f_takamuri" },
  { id: "scavenger", name: "Scavenger Kingdom", nameRu: "Scavenger Kingdom", kind: "CREW", codex: "f_scavenger" },
  { id: "broken", name: "The Broken Connection", nameRu: "The Broken Connection", kind: "CREW", codex: "f_broken" },
  { id: "civic", name: "Civic Grid Authority", nameRu: "Гражданское сетевое управление", kind: "GOV", codex: "f_civic" },
  { id: "harbor", name: "Harbor & Shelf Authority", nameRu: "Портовое управление шельфа", kind: "GOV", codex: "f_harbor" },
  { id: "gexogen", name: "Gexogen Medical", nameRu: "Gexogen Medical", kind: "CORP", codex: "f_gexogen" },
  { id: "indep", name: "Independent Operators", nameRu: "Независимые операторы", kind: "CREW" },
];

export const factionById = (id: string) => FACTIONS.find((f) => f.id === id);

/* 节点元数据。 */

const CLASS_BY_TYPE: Record<string, NodeClass> = {
  ACCESS: "PUBLIC",
  RELAY: "PUBLIC",
  "DATA SERVER": "CORPORATE",
  CORPORATE: "CORPORATE",
  PRIVATE: "PRIVATE",
  ARCHIVE: "GOVERNMENT",
  RESEARCH: "GOVERNMENT",
  SECURITY: "CORPORATE",
};

/* 按扇区分配所有者，以保持世界设定一致。 */
const SECTOR_OWNER: Record<string, string> = {
  w1_arct: "civic",
  w1_north: "civic",
  w1_pac: "intercell",
  w1_mid: "slayer",
  w1_atl: "agogee",
  w1_gulf: "fusion",
  wl_eq: "takamuri",
  wl_amz: "slayer",
  wl_and: "civic",
  wl_atl: "harbor",
  wl_pam: "takamuri",
  wl_cape: "indep",
};

/* 重要剧情节点使用手工编写的元数据。 */
const OVERRIDES: Record<string, Partial<NodeMeta>> = {
  
  w1p_acc: { owner: "civic", cls: "PUBLIC", warden: 1, rep: 6, start: true, codex: ["n_warden", "l_pacific"] },
  w1n_acc: { owner: "civic", cls: "PUBLIC", warden: 1, rep: 6, start: true, codex: ["l_northline"] },

  /* 教程目标：T1 无防护，玩家可以从容熟悉文件系统 */
  w1p_dsv: {
    owner: "intercell", cls: "CORPORATE", warden: 1, rep: 18,
    files: ["f_icx_payroll", "f_icx_memo"],
    codex: ["f_intercell", "c_sable"],
    intel: "Payroll routing exposes a shell subsidiary feeding Slayer Incorporated.",
  },
  w1p_prv: { owner: "indep", cls: "UNDERGROUND", warden: 2, rep: 12, files: ["f_scav_list"], codex: ["f_scavenger"] },
  w1p_sec: {
    owner: "takamuri", cls: "CORPORATE", warden: 1, rep: 12,
    files: ["f_seismic"],
    intel: "External firewall for the freight desk. Drop it and CRP-P06 answers directly.",
  },

  w1n_rly: { owner: "civic", cls: "PUBLIC", warden: 1, rep: 10 },
  w1n_dsv: {
    owner: "civic", cls: "GOVERNMENT", warden: 2, rep: 12,
    files: ["f_meters", "f_wardenpass"], codex: ["f_civic"],
    intel: "Meter archives show an unbilled draw routed into Midland Exchange.",
  },
  
  w1n_arc: {
    owner: "civic", cls: "GOVERNMENT", warden: 2, rep: 16,
    files: [], password: "CORE1MAX32", passwordFrom: "f_wardenpass",
  },

  w1m_sec: {
    owner: "slayer", cls: "CORPORATE", warden: 5, rep: 32, restricted: true,
    req: { rep: 45 },
    files: ["f_warden_keyset"],
    codex: ["f_slayer", "n_conflict"],
    intel: "Slayer runs an unregistered WARDEN tier here. Someone is paying for silence.",
  },
  w1m_dsv: { owner: "slayer", cls: "CORPORATE", warden: 3, rep: 16, files: ["f_grain"] },
  w1m_crp: { owner: "intercell", cls: "CORPORATE", warden: 4, rep: 22, codex: ["c_sable"], intel: "Clearing host for the shell subsidiary. Shutting it down would be felt in two boardrooms." },
  w1p_crp2: {
    owner: "takamuri", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_takamuri"],
    /* 外层 SEC 防火墙：不先拿下 SEC-P03 就连不进来 */
    req: { node: "w1p_sec" },
    firewall: "w1p_sec",
    sabotageGate: "sb_projector",
    intel: "Freight desk and the hall it books. Projector rigs hang off the same controller as the index.",
  },
  w1m_prv: { owner: "indep", cls: "UNDERGROUND", warden: 2, rep: 14, files: ["f_cbgate"], codex: ["c_koma"] },

  w1e_crp: {
    owner: "agogee", cls: "CORPORATE", warden: 4, rep: 24,
    req: { rep: 25 },
    files: ["f_agg_ledger"], codex: ["f_agogee"],
    intel: "Agogee Heights leases tower space to a client that does not legally exist.",
  },
  w1e_sec: { owner: "agogee", cls: "CORPORATE", warden: 4, rep: 20, files: ["f_watchlog"], codex: ["n_warden"] },
  w1e_dsv: { owner: "agogee", cls: "CORPORATE", warden: 3, rep: 16, files: ["f_fin_mirror"] },

  w1g_acc: { owner: "fusion", cls: "PUBLIC", warden: 2, rep: 12, req: { rep: 100 } },
  w1g_dsv: {
    owner: "fusion", cls: "CORPORATE", warden: 3, rep: 16,
    files: ["f_queue_memo"], codex: ["f_fusion"],
    intel: "Bio-implant sales. The waiting list is edited by hand whenever a premium client gets impatient.",
  },
  w1g_prv2: { owner: "civic", cls: "GOVERNMENT", warden: 5, rep: 30, restricted: true, req: { rep: 70 }, files: ["f_range"] },

  /* ---- 北极区域 ---- */
  w1a_rly: { owner: "indep", cls: "UNDERGROUND", warden: 3, rep: 18, files: ["f_echo"], codex: ["f_broken", "c_ghost"], intel: "The 61-second beacon is a dead-drop used by The Broken Connection." },
  w1a_res: { owner: "civic", cls: "GOVERNMENT", warden: 2, rep: 12, files: ["f_aurora"] },

  wlq_acc: { owner: "takamuri", cls: "PUBLIC", warden: 2, rep: 10, start: true, codex: ["f_takamuri", "l_wetlow"] },
  wlz_arc: {
    owner: "indep", cls: "UNDERGROUND", warden: 4, rep: 26,
    files: ["f_mission"], codex: ["c_msm", "i_presignal"],
    intel: "Mission tapes predate the grid. Someone was already transmitting in 1961.",
  },
  wlz_sec: { owner: "slayer", cls: "CORPORATE", warden: 5, rep: 30, restricted: true, req: { rep: 55 }, files: ["f_concession"], codex: ["n_conflict"] },
  wlz_prv: { owner: "indep", cls: "UNDERGROUND", warden: 3, rep: 16, files: ["f_jungle"], codex: ["c_count"] },
  wls_crp: { owner: "harbor", cls: "GOVERNMENT", warden: 3, rep: 16, files: ["f_manifest"], codex: ["f_harbor"] },
  wlc_rly: { owner: "indep", cls: "UNDERGROUND", warden: 4, rep: 24, files: ["f_capeecho"], codex: ["i_reverse"], intel: "Packets return reversed. The cape relay answers in a language nobody typed." },
  wld_res: { owner: "civic", cls: "GOVERNMENT", warden: 3, rep: 14, files: ["f_skydump"] },

  /* ---- Gexogen Medical：遍布各扇区的诊所与中央档案 ---- */
  w1a_gex: { owner: "gexogen", cls: "CORPORATE", warden: 2, rep: 14, codex: ["f_gexogen"] },
  w1n_gex: { owner: "gexogen", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_gexogen"] },
  w1p_gex: { owner: "gexogen", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_gexogen"] },
  w1m_gex: { owner: "gexogen", cls: "CORPORATE", warden: 4, rep: 22, codex: ["f_gexogen"] },
  w1e_gex: {
    owner: "gexogen", cls: "CORPORATE", warden: 5, rep: 34, req: { rep: 140 },
    codex: ["f_gexogen"],
    intel: "Central patient archive. Every clinic reports here, and the scoring that decides a queue position is computed in this room.",
  },
  w1g_gex: { owner: "gexogen", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_gexogen"] },
  wlq_gex: { owner: "gexogen", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_gexogen"] },
  wlz_gex: { owner: "gexogen", cls: "CORPORATE", warden: 4, rep: 22, codex: ["f_gexogen"] },
  wld_gex: { owner: "gexogen", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_gexogen"] },
  wls_gex: { owner: "gexogen", cls: "CORPORATE", warden: 4, rep: 22, codex: ["f_gexogen"] },
  wlp_gex: { owner: "gexogen", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_gexogen"] },
  wlc_gex: { owner: "gexogen", cls: "CORPORATE", warden: 2, rep: 14, codex: ["f_gexogen"] },

  /* ---- 独立网格：入口需要 1000 REP，其余节点沿网格依次解锁 ---- */
  w1m_z01: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 60, start: true, req: { rep: 1000 } },
  w1n_z02: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 55 },
  w1a_z03: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 55 },
  w1e_z04: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 60 },
  w1g_z05: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 60 },
  wlq_z06: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 60, start: true, req: { node: "w1m_z01" } },
  wlz_z07: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 55 },
  wld_z08: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 55 },
  wls_z09: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 60 },
  wlp_z10: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 55 },
  wlc_z11: { owner: "indep", cls: "UNDERGROUND", warden: 5, rep: 60 },
};

/* 使用确定性哈希生成稳定属性。 */
const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const NODE_META: Record<string, NodeMeta> = (() => {
  const out: Record<string, NodeMeta> = {};
  ALL_NODES.forEach((n) => {
    const o = OVERRIDES[n.id] ?? {};
    const cls = o.cls ?? CLASS_BY_TYPE[n.type] ?? "PUBLIC";
    const warden = o.warden ?? 1 + (hash(n.id) % 3) + (cls === "CORPORATE" ? 1 : 0);
    out[n.id] = {
      id: n.id,
      cls,
      owner: o.owner ?? SECTOR_OWNER[n.sector] ?? "indep",
      warden: Math.min(5, warden),
      rep: o.rep ?? 6 + warden * 2,
      start: o.start ?? false,
      restricted: o.restricted ?? false,
      req: o.req,
      files: o.files ?? [],
      codex: o.codex ?? [],
      intel: o.intel,
      password: o.password,
      passwordFrom: o.passwordFrom,
      sabotageGate: o.sabotageGate,
      firewall: o.firewall,
    };
  });
  return out;
})();

export const SECTOR_REP: Record<string, number> = {
  w1_pac: 0,
  w1_north: 0,
  w1_gulf: 45,
  w1_atl: 80,
  w1_arct: 120,
  w1_mid: 160,
  wl_eq: 60,
  wl_and: 90,
  wl_pam: 110,
  wl_atl: 130,
  wl_amz: 170,
  wl_cape: 200,
};

/* 记录每个节点所属的区域。 */
export const NODE_REGION: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  Object.entries(REGION_DATA).forEach(([rid, rd]) => rd.nodes.forEach((n) => (map[n.id] = rid)));
  return map;
})();

/** 列出区域内的数据服务器。 */
export const dataServersOf = (regionId: string): string[] =>
  (REGION_DATA[regionId]?.nodes ?? []).filter((n) => n.type === "DATA SERVER").map((n) => n.id);

/* 根据现有链路图构建邻接关系，入侵后会解锁相邻节点。 */
export const NEIGHBOURS: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  Object.values(REGION_DATA).forEach((rd) => {
    rd.links.forEach((l) => {
      (map[l.a] ??= []).push(l.b);
      (map[l.b] ??= []).push(l.a);
    });
  });
  return map;
})();

/* 数据文件。 */

const F = (
  id: string, name: string, nameRu: string, nameZh: string, cat: DataFile["cat"],
  source: string, owner: string, value: number
): DataFile => ({ id, name, nameRu, nameZh, cat, source, owner, value });

export const FILES: DataFile[] = [
  F("f_icx_payroll", "ICX-PAYROLL-Q4", "ICX-ЗАРПЛАТЫ-Q4", "ICX-薪资单-Q4", "CORPORATE DATA", "w1p_dsv", "intercell", 420),
  F("f_icx_memo", "ICX-INTERNAL-MEMO", "ICX-ВНУТР-ЗАПИСКА", "ICX-内部备忘", "CLASSIFIED DATA", "w1p_dsv", "intercell", 560),
  F("f_scav_list", "SCAV-DROP-LIST", "SCAV-СПИСОК-ТОЧЕК", "SCAV-投放点清单", "INTEL", "w1p_prv", "indep", 260),
  F("f_seismic", "FIREWALL-RULESET-P03", "ПРАВИЛА-ФАЙРВОЛЛА-P03", "防火墙规则集-P03", "INTEL", "w1p_sec", "takamuri", 140),
  F("f_meters", "NORTHLINE-METERS", "NORTHLINE-СЧЁТЧИКИ", "NORTHLINE-电表档", "CORPORATE DATA", "w1n_dsv", "civic", 300),
  F("f_wardenpass", "STAFF-NOTE-DONOTKEEP", "СЛУЖЕБНАЯ-ЗАПИСКА", "内部字条-勿留档", "INTEL", "w1n_dsv", "civic", 180),
  F("f_termlist", "TERMINATION-SCHEDULE-30Y", "ГРАФИК-УВОЛЬНЕНИЙ-30Л", "裁撤时间表-30年", "CLASSIFIED DATA", "w1n_arc", "intercell", 1400),
  F("f_access_restored", "ARCHIVE-ACCESS-KEY", "КЛЮЧ-ДОСТУПА-АРХИВА", "档案库-访问密钥", "CORPORATE DATA", "w1n_arc", "civic", 60),
  F("f_taparchive", "TAPE-ARCHIVE-93", "ЛЕНТ-АРХИВ-93", "磁带档案-93", "CLASSIFIED DATA", "w1n_arc", "civic", 480),
  F("f_warden_keyset", "WARDEN-KEYSET", "WARDEN-НАБОР-КЛЮЧЕЙ", "WARDEN-密钥组", "CLASSIFIED DATA", "w1m_sec", "slayer", 900),
  F("f_grain", "GRAIN-FUTURES", "ЗЕРНОВЫЕ-ФЬЮЧЕРСЫ", "谷物期货", "CORPORATE DATA", "w1m_dsv", "slayer", 280),
  F("f_cbgate", "CB-GATE-DUMP", "CB-ШЛЮЗ-ДАМП", "CB网关-转储", "PERSONAL DATA", "w1m_prv", "indep", 180),
  F("f_agg_ledger", "AGOGEE-LEASE-LEDGER", "AGOGEE-РЕЕСТР-АРЕНДЫ", "AGOGEE-租赁台账", "CORPORATE DATA", "w1e_crp", "agogee", 640),
  F("f_watchlog", "WATCHDOG-LOGS", "ЖУРНАЛ-СТОРОЖА", "看门狗日志", "CLASSIFIED DATA", "w1e_sec", "agogee", 520),
  F("f_fin_mirror", "FIN-MIRROR-0200", "ФИН-ЗЕРКАЛО-0200", "金融镜像-0200", "CORPORATE DATA", "w1e_dsv", "agogee", 340),
  F("f_queue_memo", "IMPLANT-QUEUE-OVERRIDE", "ПОДМЕНА-ОЧЕРЕДИ", "植入体队位-调包", "CLASSIFIED DATA", "w1g_dsv", "fusion", 520),
  F("f_range", "RANGE-TELEMETRY", "ТЕЛЕМЕТРИЯ-ПОЛИГОНА", "靶场遥测", "CLASSIFIED DATA", "w1g_prv2", "civic", 880),
  F("f_echo", "BEACON-ECHO-61", "ЭХО-МАЯКА-61", "信标回波-61", "INTEL", "w1a_rly", "indep", 400),
  F("f_aurora", "AURORA-TELEMETRY", "ТЕЛЕМЕТРИЯ-СИЯНИЯ", "极光遥测", "INTEL", "w1a_res", "civic", 200),
  F("f_mission", "MISSION-TAPES-61", "МИССИОНЕР-ЛЕНТЫ-61", "传教士磁带-61", "CLASSIFIED DATA", "wlz_arc", "indep", 760),
  F("f_concession", "CONCESSION-GRID-MAP", "КАРТА-КОНЦЕССИИ", "林区特许地图", "CLASSIFIED DATA", "wlz_sec", "slayer", 820),
  F("f_jungle", "JUNGLE-HOST-KEYS", "КЛЮЧИ-ХОСТА-ДЖУНГЛЕЙ", "丛林主机密钥", "PERSONAL DATA", "wlz_prv", "indep", 240),
  F("f_manifest", "PORT-MANIFESTS", "ПОРТОВЫЕ-МАНИФЕСТЫ", "港口舱单", "CORPORATE DATA", "wls_crp", "harbor", 320),
  F("f_capeecho", "CAPE-REVERSE-ECHO", "ЭХО-МЫСА-ОБРАТНОЕ", "岬角-倒置回波", "INTEL", "wlc_rly", "indep", 540),
  F("f_skydump", "OBSERVATORY-SKYDUMP", "ВЫГРУЗКА-НЕБА", "天文台-夜空转储", "INTEL", "wld_res", "civic", 220),
];

export const fileById = (id: string) => FILES.find((f) => f.id === id);

/* 为其他企业或政府节点生成通用文件。 */
export function genericFileFor(nodeId: string): DataFile | null {
  const m = NODE_META[nodeId];
  if (!m || m.files.length) return null;
  
  if (m.password) return null;
  if (m.cls === "PUBLIC" || m.cls === "PRIVATE") return null;
  const n = ALL_NODES.find((x) => x.id === nodeId)!;
  const cat: DataFile["cat"] = m.cls === "GOVERNMENT" ? "CLASSIFIED DATA" : "CORPORATE DATA";
  return {
    id: `gen_${nodeId}`,
    name: `${n.code}-SPOOL`,
    nameRu: `${n.code}-ВЫГРУЗКА`,
    nameZh: `${n.code}-转储`,
    cat,
    source: nodeId,
    owner: m.owner,
    value: 90 + m.warden * 60,
  };
}

export const resolveFile = (id: string): DataFile | null => {
  const f = fileById(id);
  if (f) return f;
  if (id.startsWith("gen_")) return genericFileFor(id.slice(4));
  return null;
};

export const filesOfNode = (nodeId: string): DataFile[] => {
  const m = NODE_META[nodeId];
  if (!m) return [];
  if (m.files.length) return m.files.map((f) => fileById(f)!).filter(Boolean);
  const g = genericFileFor(nodeId);
  return g ? [g] : [];
};

/* 知识库。 */

const C = (
  id: string, cat: CodexEntry["cat"], title: string, titleRu: string, titleZh: string,
  body: string, bodyRu: string, bodyZh: string, extra: Partial<CodexEntry> = {}
): CodexEntry => ({ id, cat, title, titleRu, titleZh, body, bodyRu, bodyZh, ...extra });

export const CODEX: CodexEntry[] = [
  /* ---- 网络 ---- */
  C("n_genius", "NETWORK", "GENIUS", "GENIUS", "GENIUS",
    "Hacker slang for the GNS-9000 operator suite. Runs the intrusion stack, then needs a manual recovery cycle once its operation buffer fills.",
    "Хакерский жаргон для комплекса GNS-9000. Держит стек проникновения, но после заполнения буфера операций требует ручного восстановления.",
    "骇客黑话，指 GNS-9000 操作员套件。跑入侵堆栈，操作缓冲一塞满就得手动恢复一轮。",
    { start: true }),
  C("n_world", "NETWORK", "WORLD", "WORLD", "WORLD",
    "The global carrier fabric. Regions hang off satellite uplinks; most operators only ever see the two they can afford to route into.",
    "Глобальная несущая ткань. Регионы висят на спутниковых каналах; большинство операторов видит лишь те два, до которых хватает маршрута.",
    "全球载波网。各区域挂在卫星链路上；大多数操手一辈子只进得起两个区域。",
    { start: true }),
  C("n_warden", "NETWORK", "WARDEN", "WARDEN", "WARDEN",
    "Node defence system. Tiers 1-5. Higher tiers log intrusions and report to the owning organisation, which sours relations fast.",
    "Система защиты узлов. Уровни 1-5. Высокие уровни журналируют проникновение и докладывают владельцу, что быстро портит отношения.",
    "节点防御系统。1-5 级。等级越高越爱记日志，还会跟属主打小报告，关系掉得飞快。"),
  C("n_conflict", "NETWORK", "CONFLICT ZONE", "ЗОНА КОНФЛИКТА", "冲突区",
    "A sector claimed by more than one operator. WARDEN signatures overlap, routing is unstable, and nobody admits who owns what.",
    "Сектор, на который претендует несколько операторов. Сигнатуры WARDEN накладываются, маршруты нестабильны, владельца никто не признаёт.",
    "好几家运营商都声称归自己的扇区。WARDEN 特征码互相打架，路由飘忽，谁也不认领产权。"),

  /* 组织与派系。 */
  C("f_intercell", "FACTIONS", "Intercell Synthetics", "Intercell Synthetics", "Intercell Synthetics",
    "Corporate operator of the Pacific Exchange. Polite front office, aggressive WARDEN deployment.",
    "Корпоративный оператор Pacific Exchange. Вежливый фронт-офис, агрессивное развёртывание WARDEN.",
    "Pacific Exchange 的企业运营方。前台客气，WARDEN 部署凶狠。", { faction: "intercell" }),
  C("f_slayer", "FACTIONS", "Slayer Incorporated", "Slayer Incorporated", "Slayer Incorporated",
    "Holds the Midland Exchange and the Amazon Circuit concession. Runs WARDEN tiers it never registered.",
    "Держит Midland Exchange и концессию Amazon Circuit. Эксплуатирует незарегистрированные уровни WARDEN.",
    "握着 Midland Exchange 和 Amazon Circuit 特许区。跑着从来没登记过的 WARDEN 层级。", { faction: "slayer" }),
  C("f_agogee", "FACTIONS", "Agogee Heights", "Agogee Heights", "Agogee Heights",
    "Atlantic tower landlord. Leases rack space to clients it declines to name.",
    "Владелец атлантических башен. Сдаёт стойки клиентам, которых отказывается называть.",
    "大西洋机楼包租公。把机柜租给不肯透露姓名的客户。", { faction: "agogee" }),
  C("f_fusion", "FACTIONS", "Fusion Cybernetics", "Fusion Cybernetics", "Fusion Cybernetics",
    "Gulf Relay industrial telemetry. Storm-hardened hardware, lax internal auditing.",
    "Промышленная телеметрия Gulf Relay. Железо выдержит ураган, внутренний аудит — нет.",
    "Gulf Relay 工业遥测。硬件扛得住飓风，内审扛不住。", { faction: "fusion" }),
  C("f_takamuri", "FACTIONS", "Takamuri Global", "Takamuri Global", "Takamuri Global",
    "Equatorial and Pampa trunk holder. Trades in commodities data and very patient lawyers.",
    "Держатель экваториальной и степной магистралей. Торгует сырьевыми данными и очень терпеливыми юристами.",
    "赤道和草原干线的持有者。做大宗商品数据买卖，养了一帮特别有耐心的律师。", { faction: "takamuri" }),
  C("f_scavenger", "FACTIONS", "Scavenger Kingdom", "Scavenger Kingdom", "Scavenger Kingdom",
    "Bandit confederation with hackers on the payroll. Sells access, resells it, then sells the buyer.",
    "Бандитская конфедерация с хакерами в составе. Продаёт доступ, перепродаёт его, затем продаёт и покупателя.",
    "养着黑客的匪帮联盟。卖接入，转手再卖一次，最后把买家也卖了。", { faction: "scavenger" }),
  C("f_broken", "FACTIONS", "The Broken Connection", "The Broken Connection", "The Broken Connection",
    "Informal crew that forms around a goal and dissolves after it. Membership rotates constantly; nobody keeps a roster.",
    "Неформальная группировка, собирающаяся вокруг цели и распадающаяся после неё. Состав постоянно меняется, списков никто не ведёт.",
    "围着目标凑起来、目标一完就散伙的草台班子。成员天天换，没人记名册。", { faction: "broken" }),
  C("f_civic", "FACTIONS", "Civic Grid Authority", "Гражданское сетевое управление", "市政网格管理局",
    "Public utility operator. Underfunded, over-logged, and surprisingly easy to read.",
    "Государственный оператор коммунальной сети. Недофинансирован, перегружен журналами и удивительно легко читается.",
    "市政公用网络运营方。缺钱，日志成山，意外地好读。", { faction: "civic" }),
  C("f_gexogen", "FACTIONS", "Gexogen Medical", "Gexogen Medical", "Gexogen Medical",
    "Private medical conglomerate. Owns a chain of clinics on every continent and, through them, a practical monopoly on health: diagnostics, implants, transplant queues, insurance scoring. Its grid presence is modest and immaculate — one quiet host per sector, all of them reporting to the same archive.",
    "Частный медицинский конгломерат. Владеет сетью клиник на всех континентах и через них — фактической монополией на здоровье: диагностика, импланты, очереди на пересадку, страховой скоринг. В сети присутствует скромно и безупречно: по одному тихому узлу на сектор, и все они отчитываются в один архив.",
    "私营医疗集团。各大洲都有连锁诊所，靠它们握着实质的健康垄断：诊断、植入体、移植排队、保险评分。网上存在感克制而干净 —— 每个扇区一台安静主机，全都向同一个档案库汇报。",
    { faction: "gexogen" }),
  C("f_harbor", "FACTIONS", "Harbor & Shelf Authority", "Портовое управление шельфа", "港务与陆架管理局",
    "Port bureaucracy of the Atlantic Shelf. Every crate accounted for, every account mirrored.",
    "Портовая бюрократия атлантического шельфа. Каждый ящик учтён, каждый счёт зеркалирован.",
    "大西洋陆架的港口衙门。每个箱子都上账，每个账户都有镜像。", { faction: "harbor" }),

  /* ---- 人物 ---- */
  C("c_ghost", "CHARACTERS", "Ghost_404", "Ghost_404", "Ghost_404",
    "Long-running go-between. Claims no affiliation, routes work for The Broken Connection anyway.",
    "Давний посредник. Утверждает, что ни с кем не связан, но раздаёт работу от The Broken Connection.",
    "老牌中间人。自称无门无派，反正都是替 The Broken Connection 派活。", { faction: "broken" }),
  C("c_lilith", "CHARACTERS", "lilith_x", "lilith_x", "lilith_x",
    "Archive diver. Trades in pre-collapse tape and knows which government spools were never erased.",
    "Ныряльщица по архивам. Торгует плёнкой доколлапсной эпохи и знает, какие госкатушки так и не стёрли.",
    "档案潜水员。倒腾崩溃前时代的磁带，哪盘政府卷带没消磁她门儿清。", { faction: "indep" }),
  C("c_sable", "CHARACTERS", "sable", "sable", "sable",
    "Signature appears inside Intercell payroll routing. Either an employee or something wearing one.",
    "Подпись встречается в маршрутах зарплат Intercell. Либо сотрудник, либо нечто, надевшее сотрудника.",
    "签名出现在 Intercell 的薪资路由里。不是员工，就是披着员工皮的什么东西。", { faction: "intercell" }),
  C("c_koma", "CHARACTERS", "koma", "koma", "koma",
    "Scavenger-adjacent relay jockey. Talks constantly, occasionally says something true.",
    "Ретранслятор-болтун, близкий к Scavenger Kingdom. Говорит постоянно, изредка — правду.",
    "挨着 Scavenger Kingdom 混的中继快手。嘴就没停过，偶尔蹦句真话。", { faction: "scavenger" }),
  C("c_msm", "CHARACTERS", "msm_ghost", "msm_ghost", "msm_ghost",
    "Counts beacons. Believes the cape relay is answering something older than the grid.",
    "Считает маяки. Уверен, что ретранслятор на мысе отвечает чему-то старше сети.",
    "数信标的人。坚信岬角中继在应答比这张网更老的东西。", { faction: "broken" }),
  C("c_count", "CHARACTERS", "tallyman", "tallyman", "tallyman",
    "Market broker. Buys classified spools, never asks the source, always knows it.",
    "Рыночный брокер. Покупает секретные катушки, источник не спрашивает, но всегда знает.",
    "黑市掮客。收机密卷带，从不问来路，但永远知道来路。", { faction: "scavenger" }),

  /* ---- 地点 ---- */
  C("l_pacific", "LOCATIONS", "Pacific Exchange", "Pacific Exchange", "Pacific Exchange",
    "West coast access belt of WEST1. Dense dial-in pools, university shells and one very corporate tower.",
    "Пояс доступа западного побережья WEST1. Плотные пулы дозвона, университетские шеллы и одна очень корпоративная башня.",
    "WEST1 的西海岸接入带。拨号池密密麻麻、大学 shell，外加一座特别企业范儿的塔。"),
  C("l_northline", "LOCATIONS", "Northline", "Northline", "Northline",
    "Canadian backbone mesh of WEST1. Reliable, frozen, and quietly over-metered.",
    "Канадская магистральная сетка WEST1. Надёжная, промёрзшая и незаметно перемеренная.",
    "WEST1 的加拿大骨干网。可靠、冻透了，计量表还悄悄多转。"),
  C("l_wetlow", "LOCATIONS", "WETLOW", "WETLOW", "WETLOW",
    "Southern hemisphere region. River relays, a contested jungle circuit and beacons at the cape that bend wrong.",
    "Регион южного полушария. Речные ретрансляторы, спорный контур в джунглях и маяки на мысе, что гнут сигнал.",
    "南半球区域。河道中继、丛林里的争议回路，还有岬角上把信号掰弯的信标。"),

  /* ---- 情报 ---- */
  C("i_presignal", "INTEL", "Pre-grid transmission", "Досетевая передача", "网络前的传输",
    "Mission tapes from the Amazon Circuit carry a carrier tone dated before the first backbone was laid.",
    "Миссионерские ленты Amazon Circuit несут тон несущей, датированный до прокладки первой магистрали.",
    "Amazon Circuit 的传教士磁带上有一段载波音，日期比第一条骨干铺设还早。"),
  C("i_reverse", "INTEL", "Reversed packets", "Перевёрнутые пакеты", "倒置数据包",
    "South Cape returns probes inverted. The payload is not noise; it is structured and nobody authored it.",
    "Южный мыс возвращает зонды инвертированными. Полезная нагрузка не шум — она структурирована, и её никто не писал.",
    "南岬把探测包原样倒着吐回来。载荷不是噪声 —— 它有结构，而且没人写过它。"),
];

export const codexById = (id: string) => CODEX.find((c) => c.id === id);

/* 联系人和合同。 */

export const CONTACTS: ContactDef[] = [
  {
    id: "ghost", nick: "Ghost_404", faction: "broken", role: "go-between", roleRu: "посредник", roleZh: "中间人", repReq: 0,
    intro: "you are on the wire. good. i have work that pays better than lurking.",
    introRu: "ты в сети. хорошо. у меня есть работа, которая платит лучше, чем просто сидеть и смотреть.",
    introZh: "你上线了。好。我这儿有活，比干瞪眼挣得多。",
  },
  {
    id: "op17", nick: "operator_17", faction: "civic", role: "grid operator", roleRu: "оператор сети", roleZh: "网格运营员", repReq: 0,
    intro: "",
    introRu: "",
    introZh: "",
    silent: true,
  },
  {
    id: "freddy", nick: "Freddy", faction: "indep", role: "petitioner", roleRu: "проситель", roleZh: "请愿人", repReq: 9999,
    intro: "", introRu: "", introZh: "", silent: true,
  },
  {
    id: "marla", nick: "m4rla", faction: "indep", role: "spiteful ex", roleRu: "мстительная бывшая", roleZh: "记仇的前任", repReq: 9999,
    intro: "", introRu: "", introZh: "", silent: true,
  },
  {
    id: "sablec", nick: "sable", faction: "intercell", role: "unknown", roleRu: "неизвестно", roleZh: "不明", repReq: 9999,
    intro: "",
    introRu: "",
    introZh: "",
    silent: true,
  },
];

export const FREDDY = "freddy";
export const MARLA = "marla";

export const contactById = (id: string) => CONTACTS.find((c) => c.id === id);

export const CONTRACTS: ContractDef[] = [
  {
    id: "ct_payroll", kind: "DATA", contact: "ghost", client: "broken",
    title: "PAYROLL SHADOW", titleRu: "ТЕНЬ ЗАРПЛАТ", titleZh: "薪资阴影",
    brief: "Breach the Intercell records host on the Pacific Exchange, then dig through its volume by hand. The Q4 payroll spool is filed in there somewhere. I want the routing, not the numbers.",
    briefRu: "Вскрой учётный хост Intercell на Pacific Exchange и перерой его том вручную. Зарплатная катушка за Q4 лежит где-то внутри. Мне нужны маршруты, а не суммы.",
    briefZh: "破开 Pacific Exchange 上 Intercell 的账务主机，手动翻它的卷。Q4 薪资卷带就藏在里面。我要的是路由，不是数字。",
    target: "w1p_dsv", file: "f_icx_payroll", credits: 450, rep: 14, relation: 8, repReq: 0,
  },
  {
    id: "ct_archive", kind: "DATA", contact: "op17", client: "civic",
    title: "LOCKED OUT", titleRu: "ПОТЕРЯННЫЙ ДОСТУП", titleZh: "权限丢了",
    brief: "One of our people lost access to the archive on a corporate terminal. Restore it.",
    briefRu: "Один из наших сотрудников потерял доступ к архиву на корпоративном терминале. Нужно восстановить доступ.",
    briefZh: "我们一个同事把企业终端上的档案权限弄丢了。去把它恢复。",
    target: "w1n_arc", file: "f_access_restored", credits: 200, rep: 12, relation: 10, repReq: 0,
    scripted: true,
  },
  {
    id: "ct_implant", kind: "DATA", contact: "freddy", client: "indep",
    title: "QUEUE JUMPED", titleRu: "ОЧЕРЕДЬ СДВИНУЛИ", titleZh: "队被插队了",
    brief: "Break into the Fusion Cybernetics sales host and find out why my sister's implant slot moved.",
    briefRu: "Вскрой сервер отдела продаж Fusion Cybernetics и выясни, почему очередь моей сестры сдвинули.",
    briefZh: "黑进 Fusion Cybernetics 的销售主机，查查我妹妹的植入体队位为什么被挪走了。",
    target: "w1g_dsv", file: "f_queue_memo", credits: 350, rep: 14, relation: 12, repReq: 45,
    scripted: true,
  },
  {
    id: "sb_projector", kind: "SABOTAGE", contact: "marla", client: "indep",
    title: "HOUSE LIGHTS", titleRu: "СВЕТ В ЗАЛЕ", titleZh: "场灯全灭",
    brief: "Knock out the projectors at the Takamuri freight desk for a few hours. There is a presentation today.",
    briefRu: "Вырубить проекторы в грузовом отделе Takamuri на несколько часов. Сегодня там презентация.",
    briefZh: "把 Takamuri 货运部的投影掐掉几个小时。今天那儿有场演示。",
    target: "w1p_crp2", credits: 300, rep: 12, relation: 10, repReq: 0, scripted: true,
  },
];

export const contractById = (id: string) => CONTRACTS.find((c) => c.id === id);

/* 区域升级。 */

export const SCRIPTS: ScriptDef[] = [
  {
    id: "sc_freeze",
    name: "WARDEN STALL", nameRu: "СТОПОР WARDEN", nameZh: "冻结 WARDEN",
    desc: "Feeds the trace a loop of its own packets. Freezes the WARDEN countdown for 5 seconds.",
    descRu: "Скармливает трассировке петлю из её же пакетов. Замораживает отсчёт WARDEN на 5 секунд.",
    descZh: "给追踪喂一圈它自己的包。WARDEN 倒计时冻结 5 秒。",
    price: 1000, cooldown: 10, freeze: 5,
  },
  {
    id: "sc_spike",
    name: "KEY SPIKE", nameRu: "КЛЮЧЕВОЙ ПРОБОЙ", nameZh: "密钥钉",
    desc: "Precomputed hash table. Solves the current cell instantly, whatever its cost.",
    descRu: "Готовая таблица хешей. Мгновенно решает текущий узел, какой бы ни была его цена.",
    descZh: "预算好的哈希表。无论多贵，瞬间解开当前格子。",
    price: 2000, cooldown: 20,
  },
];

export const scriptById = (id: string) => SCRIPTS.find((s) => s.id === id);

export const UPGRADES: RegionUpgrade[] = [
  {
    id: "up_wetlow", region: "wetlow",
    name: "SOUTHERN UPLINK LICENCE", nameRu: "ЛИЦЕНЗИЯ ЮЖНОГО КАНАЛА", nameZh: "南部链路执照",
    desc: "Buys routing rights through SAT-0 into WETLOW. Opens the southern hemisphere region on WORLD.",
    descRu: "Покупает права маршрутизации через SAT-0 в WETLOW. Открывает регион южного полушария на карте WORLD.",
    descZh: "买到经 SAT-0 进 WETLOW 的路由权。解锁 WORLD 上的南半球区域。",
    credits: 1200, repReq: 25,
  },
];

export const upgradeById = (id: string) => UPGRADES.find((u) => u.id === id);
