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

/* ================================================================== */
/* tunables                                                            */
/* ================================================================== */

export const CFG = {
  opsLimit: 5,            // successful hacks before GENIUS recovery
  recoveryMs: 4200,       // recovery duration
  repeatMult: 0,          // repeat intrusions pay no REP at all
  repPerWarden: 6,        // REP = rep + warden * repPerWarden
  relHitPerWarden: -3,    // owner relation hit per warden level
  relRepeatMult: 0.4,     // relation hit multiplier on repeats
  startCredits: 250,
  startRep: 0,
  marketPrice: 1500,       // credits to open the black market
  sellBonusQuest: 1.9,     // multiplier when fencing contracted data
  sellRelHit: -14,         // relation damage with the data owner
  betrayRelHit: -25,       // relation damage with a betrayed client
  betrayCrewGain: 12,      // relation gain with the underworld
};

/* ================================================================== */
/* factions                                                            */
/* ================================================================== */

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
  { id: "indep", name: "Independent Operators", nameRu: "Независимые операторы", kind: "CREW" },
];

export const factionById = (id: string) => FACTIONS.find((f) => f.id === id);

/* ================================================================== */
/* node metadata                                                       */
/* ================================================================== */

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

/* owner by sector — keeps the world politically coherent */
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

/* hand-authored metadata for story-relevant nodes */
const OVERRIDES: Record<string, Partial<NodeMeta>> = {
  /* ---- WEST1 starting foothold ---- */
  w1p_acc: { owner: "civic", cls: "PUBLIC", warden: 1, rep: 6, start: true, codex: ["n_warden", "l_pacific"] },
  w1n_acc: { owner: "civic", cls: "PUBLIC", warden: 1, rep: 6, start: true, codex: ["l_northline"] },

  /* ---- Intercell: Pacific Exchange ---- */
  w1p_dsv: {
    owner: "intercell", cls: "CORPORATE", warden: 3, rep: 18,
    files: ["f_icx_payroll", "f_icx_memo"],
    codex: ["f_intercell", "c_sable"],
    intel: "Payroll routing exposes a shell subsidiary feeding Slayer Incorporated.",
  },
  w1p_prv: { owner: "scavenger", cls: "UNDERGROUND", warden: 2, rep: 12, files: ["f_scav_list"], codex: ["f_scavenger"] },
  w1p_res: { owner: "civic", cls: "GOVERNMENT", warden: 2, rep: 10, files: ["f_seismic"] },

  /* ---- Northline ---- */
  w1n_dsv: {
    owner: "civic", cls: "GOVERNMENT", warden: 2, rep: 12,
    files: ["f_meters"], codex: ["f_civic"],
    intel: "Meter archives show an unbilled draw routed into Midland Exchange.",
  },
  w1n_arc: { owner: "civic", cls: "GOVERNMENT", warden: 3, rep: 14, files: ["f_taparchive"], codex: ["c_lilith"] },

  /* ---- Midland Exchange (conflict zone) ---- */
  w1m_sec: {
    owner: "slayer", cls: "CORPORATE", warden: 5, rep: 32, restricted: true,
    req: { rep: 45 },
    files: ["f_warden_keyset"],
    codex: ["f_slayer", "n_conflict"],
    intel: "Slayer runs an unregistered WARDEN tier here. Someone is paying for silence.",
  },
  w1m_dsv: { owner: "slayer", cls: "CORPORATE", warden: 3, rep: 16, files: ["f_grain"] },
  w1m_crp: { owner: "intercell", cls: "CORPORATE", warden: 4, rep: 22, codex: ["c_sable"], intel: "Clearing host for the shell subsidiary. Shutting it down would be felt in two boardrooms." },
  w1p_crp2: { owner: "takamuri", cls: "CORPORATE", warden: 3, rep: 18, codex: ["f_takamuri"], intel: "Freight index cross-references port manifests the Harbor Authority never published." },
  w1m_prv: { owner: "scavenger", cls: "UNDERGROUND", warden: 2, rep: 14, files: ["f_cbgate"], codex: ["c_koma"] },

  /* ---- Agogee: Atlantic ---- */
  w1e_crp: {
    owner: "agogee", cls: "CORPORATE", warden: 4, rep: 24,
    req: { rep: 25 },
    files: ["f_agg_ledger"], codex: ["f_agogee"],
    intel: "Agogee Heights leases tower space to a client that does not legally exist.",
  },
  w1e_sec: { owner: "agogee", cls: "CORPORATE", warden: 4, rep: 20, files: ["f_watchlog"], codex: ["n_warden"] },
  w1e_dsv: { owner: "agogee", cls: "CORPORATE", warden: 3, rep: 16, files: ["f_fin_mirror"] },

  /* ---- Fusion: Gulf Relay ---- */
  w1g_dsv: { owner: "fusion", cls: "CORPORATE", warden: 3, rep: 16, files: ["f_pressure"], codex: ["f_fusion"] },
  w1g_prv2: { owner: "civic", cls: "GOVERNMENT", warden: 5, rep: 30, restricted: true, req: { rep: 70 }, files: ["f_range"] },

  /* ---- Arctic ---- */
  w1a_rly: { owner: "indep", cls: "UNDERGROUND", warden: 3, rep: 18, files: ["f_echo"], codex: ["f_broken", "c_ghost"], intel: "The 61-second beacon is a dead-drop used by The Broken Connection." },
  w1a_res: { owner: "civic", cls: "GOVERNMENT", warden: 2, rep: 12, files: ["f_aurora"] },

  /* ---- WETLOW ---- */
  wlq_acc: { owner: "takamuri", cls: "PUBLIC", warden: 2, rep: 10, start: true, codex: ["f_takamuri", "l_wetlow"] },
  wlz_arc: {
    owner: "indep", cls: "UNDERGROUND", warden: 4, rep: 26,
    files: ["f_mission"], codex: ["c_msm", "i_presignal"],
    intel: "Mission tapes predate the grid. Someone was already transmitting in 1961.",
  },
  wlz_sec: { owner: "slayer", cls: "CORPORATE", warden: 5, rep: 30, restricted: true, req: { rep: 55 }, files: ["f_concession"], codex: ["n_conflict"] },
  wlz_prv: { owner: "scavenger", cls: "UNDERGROUND", warden: 3, rep: 16, files: ["f_jungle"], codex: ["c_count"] },
  wls_crp: { owner: "harbor", cls: "GOVERNMENT", warden: 3, rep: 16, files: ["f_manifest"], codex: ["f_harbor"] },
  wlc_rly: { owner: "indep", cls: "UNDERGROUND", warden: 4, rep: 24, files: ["f_capeecho"], codex: ["i_reverse"], intel: "Packets return reversed. The cape relay answers in a language nobody typed." },
  wld_res: { owner: "civic", cls: "GOVERNMENT", warden: 3, rep: 14, files: ["f_skydump"] },
};

/* deterministic hash for generated stats */
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
    };
  });
  return out;
})();

/* which region each node belongs to */
export const NODE_REGION: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  Object.entries(REGION_DATA).forEach(([rid, rd]) => rd.nodes.forEach((n) => (map[n.id] = rid)));
  return map;
})();

/** DATA SERVER hosts of a region — these light up once an ACCESS node falls */
export const dataServersOf = (regionId: string): string[] =>
  (REGION_DATA[regionId]?.nodes ?? []).filter((n) => n.type === "DATA SERVER").map((n) => n.id);

/* adjacency from the existing link graph — hacking opens neighbours */
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

/* ================================================================== */
/* data files                                                          */
/* ================================================================== */

const F = (
  id: string, name: string, nameRu: string, cat: DataFile["cat"],
  source: string, owner: string, value: number
): DataFile => ({ id, name, nameRu, cat, source, owner, value });

export const FILES: DataFile[] = [
  F("f_icx_payroll", "ICX-PAYROLL-Q4", "ICX-ЗАРПЛАТЫ-Q4", "CORPORATE DATA", "w1p_dsv", "intercell", 420),
  F("f_icx_memo", "ICX-INTERNAL-MEMO", "ICX-ВНУТР-ЗАПИСКА", "CLASSIFIED DATA", "w1p_dsv", "intercell", 560),
  F("f_scav_list", "SCAV-DROP-LIST", "SCAV-СПИСОК-ТОЧЕК", "INTEL", "w1p_prv", "scavenger", 260),
  F("f_seismic", "SEISMIC-LOGS-88", "СЕЙСМОЖУРНАЛ-88", "INTEL", "w1p_res", "civic", 140),
  F("f_meters", "NORTHLINE-METERS", "NORTHLINE-СЧЁТЧИКИ", "CORPORATE DATA", "w1n_dsv", "civic", 300),
  F("f_taparchive", "TAPE-ARCHIVE-93", "ЛЕНТ-АРХИВ-93", "CLASSIFIED DATA", "w1n_arc", "civic", 480),
  F("f_warden_keyset", "WARDEN-KEYSET", "WARDEN-НАБОР-КЛЮЧЕЙ", "CLASSIFIED DATA", "w1m_sec", "slayer", 900),
  F("f_grain", "GRAIN-FUTURES", "ЗЕРНОВЫЕ-ФЬЮЧЕРСЫ", "CORPORATE DATA", "w1m_dsv", "slayer", 280),
  F("f_cbgate", "CB-GATE-DUMP", "CB-ШЛЮЗ-ДАМП", "PERSONAL DATA", "w1m_prv", "scavenger", 180),
  F("f_agg_ledger", "AGOGEE-LEASE-LEDGER", "AGOGEE-РЕЕСТР-АРЕНДЫ", "CORPORATE DATA", "w1e_crp", "agogee", 640),
  F("f_watchlog", "WATCHDOG-LOGS", "ЖУРНАЛ-СТОРОЖА", "CLASSIFIED DATA", "w1e_sec", "agogee", 520),
  F("f_fin_mirror", "FIN-MIRROR-0200", "ФИН-ЗЕРКАЛО-0200", "CORPORATE DATA", "w1e_dsv", "agogee", 340),
  F("f_pressure", "WELL-PRESSURE-SET", "ДАВЛЕНИЕ-СКВАЖИН", "CORPORATE DATA", "w1g_dsv", "fusion", 300),
  F("f_range", "RANGE-TELEMETRY", "ТЕЛЕМЕТРИЯ-ПОЛИГОНА", "CLASSIFIED DATA", "w1g_prv2", "civic", 880),
  F("f_echo", "BEACON-ECHO-61", "ЭХО-МАЯКА-61", "INTEL", "w1a_rly", "indep", 400),
  F("f_aurora", "AURORA-TELEMETRY", "ТЕЛЕМЕТРИЯ-СИЯНИЯ", "INTEL", "w1a_res", "civic", 200),
  F("f_mission", "MISSION-TAPES-61", "МИССИОНЕР-ЛЕНТЫ-61", "CLASSIFIED DATA", "wlz_arc", "indep", 760),
  F("f_concession", "CONCESSION-GRID-MAP", "КАРТА-КОНЦЕССИИ", "CLASSIFIED DATA", "wlz_sec", "slayer", 820),
  F("f_jungle", "JUNGLE-HOST-KEYS", "КЛЮЧИ-ХОСТА-ДЖУНГЛЕЙ", "PERSONAL DATA", "wlz_prv", "scavenger", 240),
  F("f_manifest", "PORT-MANIFESTS", "ПОРТОВЫЕ-МАНИФЕСТЫ", "CORPORATE DATA", "wls_crp", "harbor", 320),
  F("f_capeecho", "CAPE-REVERSE-ECHO", "ЭХО-МЫСА-ОБРАТНОЕ", "INTEL", "wlc_rly", "indep", 540),
  F("f_skydump", "OBSERVATORY-SKYDUMP", "ВЫГРУЗКА-НЕБА", "INTEL", "wld_res", "civic", 220),
];

export const fileById = (id: string) => FILES.find((f) => f.id === id);

/* generated filler file for any other corporate/gov node */
export function genericFileFor(nodeId: string): DataFile | null {
  const m = NODE_META[nodeId];
  if (!m || m.files.length) return null;
  if (m.cls === "PUBLIC" || m.cls === "PRIVATE") return null;
  const n = ALL_NODES.find((x) => x.id === nodeId)!;
  const cat: DataFile["cat"] = m.cls === "GOVERNMENT" ? "CLASSIFIED DATA" : "CORPORATE DATA";
  return {
    id: `gen_${nodeId}`,
    name: `${n.code}-SPOOL`,
    nameRu: `${n.code}-ВЫГРУЗКА`,
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

/* ================================================================== */
/* codex                                                               */
/* ================================================================== */

const C = (
  id: string, cat: CodexEntry["cat"], title: string, titleRu: string,
  body: string, bodyRu: string, extra: Partial<CodexEntry> = {}
): CodexEntry => ({ id, cat, title, titleRu, body, bodyRu, ...extra });

export const CODEX: CodexEntry[] = [
  /* ---- NETWORK ---- */
  C("n_genius", "NETWORK", "GENIUS", "GENIUS",
    "Hacker slang for the GNS-9000 operator suite. Runs the intrusion stack, then needs a manual recovery cycle once its operation buffer fills.",
    "Хакерский жаргон для комплекса GNS-9000. Держит стек проникновения, но после заполнения буфера операций требует ручного восстановления.",
    { start: true }),
  C("n_world", "NETWORK", "WORLD", "WORLD",
    "The global carrier fabric. Regions hang off satellite uplinks; most operators only ever see the two they can afford to route into.",
    "Глобальная несущая ткань. Регионы висят на спутниковых каналах; большинство операторов видит лишь те два, до которых хватает маршрута.",
    { start: true }),
  C("n_warden", "NETWORK", "WARDEN", "WARDEN",
    "Node defence system. Tiers 1-5. Higher tiers log intrusions and report to the owning organisation, which sours relations fast.",
    "Система защиты узлов. Уровни 1-5. Высокие уровни журналируют проникновение и докладывают владельцу, что быстро портит отношения."),
  C("n_conflict", "NETWORK", "CONFLICT ZONE", "ЗОНА КОНФЛИКТА",
    "A sector claimed by more than one operator. WARDEN signatures overlap, routing is unstable, and nobody admits who owns what.",
    "Сектор, на который претендует несколько операторов. Сигнатуры WARDEN накладываются, маршруты нестабильны, владельца никто не признаёт."),

  /* ---- FACTIONS ---- */
  C("f_intercell", "FACTIONS", "Intercell Synthetics", "Intercell Synthetics",
    "Corporate operator of the Pacific Exchange. Polite front office, aggressive WARDEN deployment.",
    "Корпоративный оператор Pacific Exchange. Вежливый фронт-офис, агрессивное развёртывание WARDEN.", { faction: "intercell" }),
  C("f_slayer", "FACTIONS", "Slayer Incorporated", "Slayer Incorporated",
    "Holds the Midland Exchange and the Amazon Circuit concession. Runs WARDEN tiers it never registered.",
    "Держит Midland Exchange и концессию Amazon Circuit. Эксплуатирует незарегистрированные уровни WARDEN.", { faction: "slayer" }),
  C("f_agogee", "FACTIONS", "Agogee Heights", "Agogee Heights",
    "Atlantic tower landlord. Leases rack space to clients it declines to name.",
    "Владелец атлантических башен. Сдаёт стойки клиентам, которых отказывается называть.", { faction: "agogee" }),
  C("f_fusion", "FACTIONS", "Fusion Cybernetics", "Fusion Cybernetics",
    "Gulf Relay industrial telemetry. Storm-hardened hardware, lax internal auditing.",
    "Промышленная телеметрия Gulf Relay. Железо выдержит ураган, внутренний аудит — нет.", { faction: "fusion" }),
  C("f_takamuri", "FACTIONS", "Takamuri Global", "Takamuri Global",
    "Equatorial and Pampa trunk holder. Trades in commodities data and very patient lawyers.",
    "Держатель экваториальной и степной магистралей. Торгует сырьевыми данными и очень терпеливыми юристами.", { faction: "takamuri" }),
  C("f_scavenger", "FACTIONS", "Scavenger Kingdom", "Scavenger Kingdom",
    "Bandit confederation with hackers on the payroll. Sells access, resells it, then sells the buyer.",
    "Бандитская конфедерация с хакерами в составе. Продаёт доступ, перепродаёт его, затем продаёт и покупателя.", { faction: "scavenger" }),
  C("f_broken", "FACTIONS", "The Broken Connection", "The Broken Connection",
    "Informal crew that forms around a goal and dissolves after it. Membership rotates constantly; nobody keeps a roster.",
    "Неформальная группировка, собирающаяся вокруг цели и распадающаяся после неё. Состав постоянно меняется, списков никто не ведёт.", { faction: "broken" }),
  C("f_civic", "FACTIONS", "Civic Grid Authority", "Гражданское сетевое управление",
    "Public utility operator. Underfunded, over-logged, and surprisingly easy to read.",
    "Государственный оператор коммунальной сети. Недофинансирован, перегружен журналами и удивительно легко читается.", { faction: "civic" }),
  C("f_harbor", "FACTIONS", "Harbor & Shelf Authority", "Портовое управление шельфа",
    "Port bureaucracy of the Atlantic Shelf. Every crate accounted for, every account mirrored.",
    "Портовая бюрократия атлантического шельфа. Каждый ящик учтён, каждый счёт зеркалирован.", { faction: "harbor" }),

  /* ---- CHARACTERS ---- */
  C("c_ghost", "CHARACTERS", "Ghost_404", "Ghost_404",
    "Long-running go-between. Claims no affiliation, routes work for The Broken Connection anyway.",
    "Давний посредник. Утверждает, что ни с кем не связан, но раздаёт работу от The Broken Connection.", { faction: "broken" }),
  C("c_lilith", "CHARACTERS", "lilith_x", "lilith_x",
    "Archive diver. Trades in pre-collapse tape and knows which government spools were never erased.",
    "Ныряльщица по архивам. Торгует плёнкой доколлапсной эпохи и знает, какие госкатушки так и не стёрли.", { faction: "indep" }),
  C("c_sable", "CHARACTERS", "sable", "sable",
    "Signature appears inside Intercell payroll routing. Either an employee or something wearing one.",
    "Подпись встречается в маршрутах зарплат Intercell. Либо сотрудник, либо нечто, надевшее сотрудника.", { faction: "intercell" }),
  C("c_koma", "CHARACTERS", "koma", "koma",
    "Scavenger-adjacent relay jockey. Talks constantly, occasionally says something true.",
    "Ретранслятор-болтун, близкий к Scavenger Kingdom. Говорит постоянно, изредка — правду.", { faction: "scavenger" }),
  C("c_msm", "CHARACTERS", "msm_ghost", "msm_ghost",
    "Counts beacons. Believes the cape relay is answering something older than the grid.",
    "Считает маяки. Уверен, что ретранслятор на мысе отвечает чему-то старше сети.", { faction: "broken" }),
  C("c_count", "CHARACTERS", "tallyman", "tallyman",
    "Market broker. Buys classified spools, never asks the source, always knows it.",
    "Рыночный брокер. Покупает секретные катушки, источник не спрашивает, но всегда знает.", { faction: "scavenger" }),

  /* ---- LOCATIONS ---- */
  C("l_pacific", "LOCATIONS", "Pacific Exchange", "Pacific Exchange",
    "West coast access belt of WEST1. Dense dial-in pools, university shells and one very corporate tower.",
    "Пояс доступа западного побережья WEST1. Плотные пулы дозвона, университетские шеллы и одна очень корпоративная башня."),
  C("l_northline", "LOCATIONS", "Northline", "Northline",
    "Canadian backbone mesh of WEST1. Reliable, frozen, and quietly over-metered.",
    "Канадская магистральная сетка WEST1. Надёжная, промёрзшая и незаметно перемеренная."),
  C("l_wetlow", "LOCATIONS", "WETLOW", "WETLOW",
    "Southern hemisphere region. River relays, a contested jungle circuit and beacons at the cape that bend wrong.",
    "Регион южного полушария. Речные ретрансляторы, спорный контур в джунглях и маяки на мысе, что гнут сигнал."),

  /* ---- INTEL ---- */
  C("i_presignal", "INTEL", "Pre-grid transmission", "Досетевая передача",
    "Mission tapes from the Amazon Circuit carry a carrier tone dated before the first backbone was laid.",
    "Миссионерские ленты Amazon Circuit несут тон несущей, датированный до прокладки первой магистрали."),
  C("i_reverse", "INTEL", "Reversed packets", "Перевёрнутые пакеты",
    "South Cape returns probes inverted. The payload is not noise; it is structured and nobody authored it.",
    "Южный мыс возвращает зонды инвертированными. Полезная нагрузка не шум — она структурирована, и её никто не писал."),
];

export const codexById = (id: string) => CODEX.find((c) => c.id === id);

/* ================================================================== */
/* contacts & contracts                                                */
/* ================================================================== */

export const CONTACTS: ContactDef[] = [
  {
    id: "sablec", nick: "sable", faction: "broken", role: "insider", roleRu: "инсайдер", repReq: 165,
    intro: "you have been reading my name in other people's files. let us skip the part where you pretend otherwise.",
    introRu: "ты читал моё имя в чужих файлах. давай пропустим ту часть, где ты делаешь вид, что это не так.",
  },
  {
    id: "ghost", nick: "Ghost_404", faction: "broken", role: "go-between", roleRu: "посредник", repReq: 0,
    intro: "you are on the wire. good. i have work that pays better than lurking.",
    introRu: "ты в сети. хорошо. у меня есть работа, которая платит лучше, чем просто сидеть и смотреть.",
  },
  {
    id: "op17", nick: "operator_17", faction: "civic", role: "grid operator", roleRu: "оператор сети", repReq: 22,
    intro: "i log everything, including this. that said — the authority needs a quiet audit.",
    introRu: "я журналирую всё, включая это. и всё же — управлению нужна тихая проверка.",
  },
  {
    id: "lilith", nick: "lilith_x", faction: "indep", role: "archive diver", roleRu: "ныряльщица архивов", repReq: 88,
    intro: "heard you can reach places. i want a keyset, not a conversation.",
    introRu: "слышала, ты достаёшь до мест. мне нужен набор ключей, а не беседа.",
  },
  {
    id: "count", nick: "tallyman", faction: "scavenger", role: "broker", roleRu: "брокер", repReq: 115,
    intro: "the kingdom buys spools. the deeper the source, the fatter the transfer.",
    introRu: "королевство покупает катушки. чем глубже источник, тем жирнее перевод.",
  },
];

export const contactById = (id: string) => CONTACTS.find((c) => c.id === id);


export const CONTRACTS: ContractDef[] = [
  /* ============ DATA — corporate & civic clients ============ */
  {
    id: "ct_payroll", kind: "DATA", contact: "ghost", client: "broken",
    title: "PAYROLL SHADOW", titleRu: "ТЕНЬ ЗАРПЛАТ",
    brief: "Breach the Intercell records host on the Pacific Exchange, then dig through its volume by hand. The Q4 payroll spool is filed in there somewhere. I want the routing, not the numbers.",
    briefRu: "Вскрой учётный хост Intercell на Pacific Exchange и перерой его том вручную. Зарплатная катушка за Q4 лежит где-то внутри. Мне нужны маршруты, а не суммы.",
    target: "w1p_dsv", file: "f_icx_payroll", credits: 450, rep: 14, relation: 8, repReq: 0,
  },
  {
    id: "ct_meters", kind: "DATA", contact: "op17", client: "civic",
    title: "QUIET AUDIT", titleRu: "ТИХАЯ ПРОВЕРКА",
    brief: "Northline reports a draw we never billed. Get inside the records host and find the meter archive yourself — I cannot be seen requesting it.",
    briefRu: "Northline показывает потребление, которое мы не выставляли. Зайди в учётный хост и найди архив счётчиков сам — меня не должны видеть в запросе.",
    target: "w1n_dsv", file: "f_meters", credits: 320, rep: 10, relation: 10, repReq: 26,
  },
  {
    id: "ct_mirror", kind: "DATA", contact: "op17", client: "civic",
    title: "SETTLEMENT GAP", titleRu: "РАЗРЫВ В РАСЧЁТАХ",
    brief: "Agogee's financial mirror runs a batch at 0200 that never reconciles at 0400. Pull the mirror file. The authority wants to know where the difference sleeps.",
    briefRu: "Финансовое зеркало Agogee гоняет пакет в 02:00, который не сходится в 04:00. Достань файл зеркала. Управление хочет знать, где ночует разница.",
    target: "w1e_dsv", file: "f_fin_mirror", credits: 540, rep: 16, relation: 9, afterReq: "ct_meters", repReq: 62,
  },
  {
    id: "ct_grain", kind: "DATA", contact: "lilith", client: "indep",
    title: "AHEAD OF HARVEST", titleRu: "РАНЬШЕ УРОЖАЯ",
    brief: "Slayer's commodity host opens positions minutes before the public reports. Bring me the ledger and I will know who is whispering to them.",
    briefRu: "Сырьевой хост Slayer открывает позиции за минуты до публикации отчётов. Принеси мне реестр, и я узнаю, кто им нашёптывает.",
    target: "w1m_dsv", file: "f_grain", credits: 600, rep: 18, relation: 10, repReq: 95,
  },
  {
    id: "ct_keyset", kind: "DATA", contact: "lilith", client: "indep",
    title: "WARDEN KEYSET", titleRu: "НАБОР КЛЮЧЕЙ WARDEN",
    brief: "Slayer keeps an unregistered WARDEN tier in the Midland Exchange. Bring me the keyset. Do not read it on the way.",
    briefRu: "Slayer держит незарегистрированный уровень WARDEN в Midland Exchange. Принеси набор ключей. По дороге не читай.",
    target: "w1m_sec", file: "f_warden_keyset", credits: 900, rep: 24, relation: 12, afterReq: "ct_grain", repReq: 150,
  },
  {
    id: "ct_mission", kind: "DATA", contact: "count", client: "scavenger",
    title: "OLDER THAN THE WIRE", titleRu: "СТАРШЕ ПРОВОДА",
    brief: "The Amazon Circuit archive holds mission tapes from before the backbone. The kingdom pays well for impossible dates.",
    briefRu: "В архиве Amazon Circuit лежат миссионерские ленты старше магистрали. Королевство хорошо платит за невозможные даты.",
    target: "wlz_arc", file: "f_mission", credits: 1100, rep: 28, relation: 10,
    repReq: 120, market: true, regionReq: "wetlow",
  },

  /* ============ SABOTAGE — corporate hosts ============ */
  {
    id: "sb_tower", kind: "SABOTAGE", contact: "ghost", client: "broken",
    title: "DARK THE TOWER", titleRu: "ПОГАСИТЬ БАШНЮ",
    brief: "Agogee's east tower logs every operator in the Atlantic grid. Get inside the corporate host and burn its logging stack. No files, no copies — just make it stop.",
    briefRu: "Восточная башня Agogee журналирует каждого оператора атлантической сети. Проберись в корпоративный хост и выжги его стек журналирования. Никаких файлов и копий — просто пусть замолчит.",
    target: "w1e_crp", credits: 700, rep: 20, relation: 12, afterReq: "ct_payroll", repReq: 44,
  },
  {
    id: "sb_meridian", kind: "SABOTAGE", contact: "op17", client: "civic",
    title: "UNSCHEDULED OUTAGE", titleRu: "ВНЕПЛАНОВОЕ ОТКЛЮЧЕНИЕ",
    brief: "Officially the authority has no opinion about Intercell's west HQ. Unofficially, its guest port has been scanning our substations for a month. Knock it over.",
    briefRu: "Официально у управления нет мнения о западной штаб-квартире Intercell. Неофициально её гостевой порт месяц сканирует наши подстанции. Опрокинь его.",
    target: "wls_crp", credits: 620, rep: 18, relation: 11, afterReq: "ct_mirror", repReq: 78, regionReq: "wetlow",
  },
  {
    id: "sb_port", kind: "SABOTAGE", contact: "count", client: "scavenger",
    title: "CRATE AMNESIA", titleRu: "АМНЕЗИЯ ЯЩИКОВ",
    brief: "The port authority host remembers a shipment the kingdom would rather it forgot. Do not steal the manifest — destroy the index that points at it.",
    briefRu: "Хост портового управления помнит партию, о которой королевству лучше бы забыли. Манифест не воруй — уничтожь индекс, который на него указывает.",
    target: "w1p_crp2", credits: 840, rep: 22, relation: 12, afterReq: "ct_mission", repReq: 135, market: true,
  },
  {
    id: "sb_helix", kind: "SABOTAGE", contact: "sablec", client: "broken",
    title: "CUT THE SUBSIDIARY", titleRu: "ОТРЕЗАТЬ ДОЧКУ",
    brief: "You read the memo. Now end the arrangement. The corporate host routing those shell transfers goes dark tonight — and the Connection remembers who did it.",
    briefRu: "Записку ты читал. Теперь прекрати эту схему. Корпоративный хост, который гоняет переводы через подставную контору, сегодня погаснет — и Connection запомнит, кто это сделал.",
    target: "w1m_crp", credits: 1300, rep: 32, relation: 15, repReq: 185, market: true,
  },
];

export const contractById = (id: string) => CONTRACTS.find((c) => c.id === id);

/* ================================================================== */
/* region upgrades                                                     */
/* ================================================================== */

export const SCRIPTS: ScriptDef[] = [
  {
    id: "sc_freeze",
    name: "WARDEN STALL", nameRu: "СТОПОР WARDEN",
    desc: "Feeds the trace a loop of its own packets. Freezes the WARDEN countdown for 5 seconds.",
    descRu: "Скармливает трассировке петлю из её же пакетов. Замораживает отсчёт WARDEN на 5 секунд.",
    price: 1000, cooldown: 10, freeze: 5,
  },
  {
    id: "sc_spike",
    name: "KEY SPIKE", nameRu: "КЛЮЧЕВОЙ ПРОБОЙ",
    desc: "Precomputed hash table. Solves the current cell instantly, whatever its cost.",
    descRu: "Готовая таблица хешей. Мгновенно решает текущий узел, какой бы ни была его цена.",
    price: 2000, cooldown: 20,
  },
];

export const scriptById = (id: string) => SCRIPTS.find((s) => s.id === id);

export const UPGRADES: RegionUpgrade[] = [
  {
    id: "up_wetlow", region: "wetlow",
    name: "SOUTHERN UPLINK LICENCE", nameRu: "ЛИЦЕНЗИЯ ЮЖНОГО КАНАЛА",
    desc: "Buys routing rights through SAT-0 into WETLOW. Opens the southern hemisphere region on WORLD.",
    descRu: "Покупает права маршрутизации через SAT-0 в WETLOW. Открывает регион южного полушария на карте WORLD.",
    credits: 1200, repReq: 25,
  },
];

export const upgradeById = (id: string) => UPGRADES.find((u) => u.id === id);
