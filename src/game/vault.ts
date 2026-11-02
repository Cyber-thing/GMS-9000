import { ALL_NODES } from "../data/regions";
import { NODE_META, filesOfNode } from "./data";
import type { Lang } from "../i18n";

/* ================================================================== */
/* DATA VAULT：面向 DATA SERVER 主机的文件系统小游戏            */
/* ------------------------------------------------------------------ */
/* 操作员遍历文件夹、扫描文件，并搜寻客户   */
/* 所要的载荷。垃圾文件返回噪声或氛围文本；      */
/* 载荷文件会向存储中投放一个真实的 DataFile。                    */
/* ================================================================== */

export type ScanState = "idle" | "scanning" | "done";
export type ResultKind = "empty" | "text" | "payload";

export interface VaultResult {
  kind: ResultKind;
  title: string;
  body: string[];
  /** 载荷命中的 DataFile id */
  fileId?: string;
}

export interface VaultFile {
  id: string;
  name: string;      // DOS 8.3 风格
  size: string;
  date: string;
  scan: ScanState;
  result: VaultResult | null;
  /** 扫描时才惰性解析 */
  seedKind: ResultKind;
  seedIdx: number;
  payloadId?: string;
}

export interface VaultFolder {
  id: string;
  name: string;
  files: VaultFile[];
}

export interface VaultFS {
  volume: string;
  folders: VaultFolder[];
  payloads: string[];
}

export const usesVault = (nodeId: string): boolean =>
  ALL_NODES.find((n) => n.id === nodeId)?.type === "DATA SERVER";

/* ------------------------------------------------------------------ */
/* 按所属组织划分的主题内容                              */
/* ------------------------------------------------------------------ */

interface Theme {
  vol: string;
  folders: string[];
  files: string[];
  people: string[];
  /** 氛围片段：[titleEn, titleRu, bodyEn, bodyRu] */
  texts: [string, string, string, string][];
}

const GENERIC_TEXTS: Theme["texts"] = [
  ["SHIFT NOTE", "ЗАПИСКА СМЕНЫ",
   "night shift log: nothing moved. coffee machine down again. someone please requisition a new element.",
   "журнал ночной смены: ничего не происходило. кофемашина снова сдохла. закажите кто-нибудь новый тэн."],
  ["BACKUP REPORT", "ОТЧЁТ О РЕЗЕРВЕ",
   "weekly spool verified. 2 bad blocks remapped. tape 14 is getting thin — rotate it out next quarter.",
   "еженедельная катушка проверена. 2 сбойных блока переразмечены. лента 14 истончается — вывести в следующем квартале."],
  ["PRINTER QUEUE", "ОЧЕРЕДЬ ПЕЧАТИ",
   "job 0041 stuck for six days. nobody has claimed it. it is 400 pages of the letter 'K'.",
   "задание 0041 висит шесть дней. хозяина нет. это 400 страниц буквы «К»."],
  ["MAINTENANCE", "ОБСЛУЖИВАНИЕ",
   "fan bearing replaced on rack 3. noise complaint from accounting withdrawn.",
   "заменён подшипник вентилятора в стойке 3. жалоба бухгалтерии на шум отозвана."],
];

const THEMES: Record<string, Theme> = {
  intercell: {
    vol: "ICX-VOL1",
    folders: ["PAYROLL", "BOARD", "RND", "LEGAL", "ARCHIVE", "MAILSPL"],
    files: ["Q4PAY", "HEADCNT", "BONUS", "ROSTER", "BUDGET", "PATENT", "LEASE", "NDA", "SYNTH", "PROTO"],
    people: ["R.VOSS", "M.AKERS", "sable", "D.ORTIZ", "K.LUND"],
    texts: [
      ["BOARD MEMO", "ЗАПИСКА ПРАВЛЕНИЯ",
       "R.VOSS: the subsidiary line stays off the public filing. route it through the usual intermediary and do not put my name near it.",
       "R.VOSS: дочернюю структуру в публичную отчётность не вносим. проводите через обычного посредника и моё имя рядом не ставьте."],
      ["INTERNAL MAIL", "ВНУТРЕННЯЯ ПОЧТА",
       "M.AKERS: whoever keeps badging into the sublevel at 0300 — the log sees you. this is your one warning.",
       "M.AKERS: тот, кто ходит по пропуску на минус-этаж в 03:00 — журнал вас видит. это единственное предупреждение."],
      ["HR COMPLAINT", "ЖАЛОБА В КАДРЫ",
       "the synthetics division keeps requisitioning 'consumables' with no inventory code. accounting refuses to sign again.",
       "отдел синтетики снова заказывает «расходники» без инвентарного кода. бухгалтерия опять отказывается подписывать."],
      ["PERSONAL", "ЛИЧНОЕ",
       "sable: i am not on the payroll. i am in the payroll. there is a difference and it took me two years to see it.",
       "sable: я не в платёжной ведомости. я внутри неё. разница есть, и мне понадобилось два года, чтобы её увидеть."],
    ],
  },
  slayer: {
    vol: "SLY-CORE",
    folders: ["CONTRACT", "SECURITY", "FIELD", "WARDEN", "ARCHIVE"],
    files: ["ASSET", "CLAIM", "TIER5", "PATROL", "DENIAL", "GRAIN", "CONCESS", "SILENCE"],
    people: ["CTRL-9", "J.MARROW", "OPS-DESK"],
    texts: [
      ["OPS DIRECTIVE", "ДИРЕКТИВА ОПЕРАЦИЙ",
       "warden tiers above 3 are not to appear in the registry. if an auditor asks, the hardware is 'environmental monitoring'.",
       "уровни warden выше 3 в реестре не фигурируют. если спросит аудитор — это «экологический мониторинг»."],
      ["FIELD REPORT", "ПОЛЕВОЙ ОТЧЁТ",
       "the contested sector is costing more than it returns. recommend we keep it anyway. the map matters more than the margin.",
       "спорный сектор обходится дороже, чем приносит. рекомендую удержать. карта важнее маржи."],
      ["DENIAL DRAFT", "ЧЕРНОВИК ОПРОВЕРЖЕНИЯ",
       "'slayer incorporated does not operate unregistered defence systems.' hold this ready. we will need it.",
       "«slayer incorporated не эксплуатирует незарегистрированные системы защиты». держать наготове. понадобится."],
    ],
  },
  agogee: {
    vol: "AGG-SHELF",
    folders: ["LEASES", "TOWER", "FINANCE", "TENANTS", "ARCHIVE"],
    files: ["RENT", "FLOOR12", "MIRROR", "CLIENT", "INVOICE", "LANDING", "ESCROW"],
    people: ["B.AGOGEE", "LEASE-DESK", "N.REY"],
    texts: [
      ["LEASE NOTE", "ЗАМЕТКА ПО АРЕНДЕ",
       "tenant on floor 12 pays in advance, in full, and has never sent a human. do not schedule an inspection.",
       "арендатор 12-го этажа платит вперёд, полностью, и ни разу не присылал человека. проверку не назначать."],
      ["FINANCE", "ФИНАНСЫ",
       "the escrow account reconciles to the cent every month. that is the part that worries me.",
       "эскроу-счёт сходится до цента каждый месяц. именно это меня и беспокоит."],
      ["BUILDING OPS", "ЭКСПЛУАТАЦИЯ",
       "the cable landing has no documented shutoff. the original contractor dissolved in '91.",
       "у кабельного ввода нет задокументированного рубильника. подрядчик ликвидирован в '91."],
    ],
  },
  fusion: {
    vol: "FUS-GULF",
    folders: ["WELLS", "TELEMTRY", "SAFETY", "CREW", "ARCHIVE"],
    files: ["PRESS", "RIG14", "VALVE", "STORM", "SHIFT", "FLARE", "PUMP"],
    people: ["T.BRUNO", "RIG-14", "SAFETY"],
    texts: [
      ["SAFETY BULLETIN", "БЮЛЛЕТЕНЬ БЕЗОПАСНОСТИ",
       "rig 14 reported a pressure spike that does not appear in the telemetry. the telemetry is considered authoritative.",
       "вышка 14 сообщила о скачке давления, которого нет в телеметрии. телеметрия считается достоверной."],
      ["CREW LOG", "ЖУРНАЛ ЭКИПАЖА",
       "storm shift. everyone accounted for. the sea sounds like a modem tonight, which is not comforting.",
       "штормовая смена. все на месте. море сегодня звучит как модем, и это не успокаивает."],
      ["WORK ORDER", "НАРЯД",
       "replace valve housing on pump 6. part is three years back-ordered. improvise, log it as 'inspected'.",
       "заменить корпус клапана на насосе 6. деталь в заказе три года. импровизируйте, запишите «осмотрено»."],
    ],
  },
  takamuri: {
    vol: "TKM-TRUNK",
    folders: ["COMMOD", "SHIPPING", "LEGAL", "CATTLE", "ARCHIVE"],
    files: ["COFFEE", "FUTURE", "HEDGE", "HERD", "CUSTOMS", "TARIFF", "BROKER"],
    people: ["Y.TAKAMURI", "DESK-3", "LEGAL"],
    texts: [
      ["TRADE DESK", "ТОРГОВЫЙ ОТДЕЛ",
       "the coffee book is a cover for the hedge book. the hedge book is the actual business. keep them in separate volumes.",
       "кофейная книга — прикрытие для хеджевой. хеджевая и есть настоящий бизнес. держите их в разных томах."],
      ["LEGAL", "ЮРИДИЧЕСКОЕ",
       "our lawyers are instructed to be patient rather than correct. patience has a better win rate.",
       "нашим юристам предписано быть терпеливыми, а не правыми. у терпения выше процент побед."],
      ["CUSTOMS", "ТАМОЖНЯ",
       "crate manifest 88 lists 'agricultural equipment' weighing four tonnes. it is one tonne of equipment.",
       "в манифесте 88 указано «сельхозоборудование» весом четыре тонны. оборудования там тонна."],
    ],
  },
  civic: {
    vol: "CIVIC-01",
    folders: ["METERS", "PERMITS", "PUBLIC", "ARCHIVE", "MAILSPL"],
    files: ["BILLING", "GRID", "OUTAGE", "FORM7C", "CENSUS", "SUBSTN", "AUDIT"],
    people: ["operator_17", "ops_dana", "CLERK-4"],
    texts: [
      ["PUBLIC NOTICE", "ОБЪЯВЛЕНИЕ",
       "scheduled outage postponed for the fourth time. the substation is older than the paperwork describing it.",
       "плановое отключение перенесено в четвёртый раз. подстанция старше бумаг, которые её описывают."],
      ["INTERNAL", "СЛУЖЕБНОЕ",
       "operator_17: i log everything. that is the job. what happens to the logs afterwards is not the job.",
       "operator_17: я журналирую всё. это работа. что происходит с журналами потом — уже не работа."],
      ["FORM 7-C", "ФОРМА 7-C",
       "unauthorized access to grid trunks is punishable under section 7-C. nobody has ever been charged under section 7-C.",
       "несанкционированный доступ к магистралям карается по разделу 7-C. по разделу 7-C ещё никого не привлекали."],
    ],
  },
  harbor: {
    vol: "HSA-PORT",
    folders: ["MANIFEST", "BERTHS", "CUSTOMS", "ARCHIVE"],
    files: ["CRATE", "BERTH7", "LADING", "SEAL", "TONNAGE", "PILOT"],
    people: ["PORT-DESK", "H.SALAS"],
    texts: [
      ["BERTH LOG", "ЖУРНАЛ ПРИЧАЛА",
       "vessel at berth 7 has no registered owner, pays its fees early, and sails only at night.",
       "судно у причала 7 без зарегистрированного владельца, платит сборы заранее и выходит только ночью."],
      ["CUSTOMS", "ТАМОЖНЯ",
       "seal 4471 was intact on arrival and intact on departure. the weight differs by 900 kilograms.",
       "пломба 4471 цела при прибытии и цела при отходе. вес отличается на 900 килограммов."],
    ],
  },
  scavenger: {
    vol: "SCAV-DROP",
    folders: ["DROPS", "MARKS", "SPLITS", "JUNK"],
    files: ["LIST", "FENCE", "TAKE", "CUT", "BURNER", "ROUTE"],
    people: ["koma", "tallyman", "TEETH"],
    texts: [
      ["CREW CHAT", "ЧАТ КОМАНДЫ",
       "koma: if the split is even then somebody is lying. it is never even. it has never once been even.",
       "koma: если доля поровну — кто-то врёт. поровну не бывает. ни разу не было поровну."],
      ["DROP NOTE", "ЗАПИСКА О ТОЧКЕ",
       "the kingdom buys spools, not stories. bring the tape, keep the anecdote.",
       "королевство покупает катушки, а не истории. неси плёнку, байку оставь себе."],
    ],
  },
};

const FALLBACK: Theme = {
  vol: "HOST-VOL",
  folders: ["SYSTEM", "USERS", "SPOOL", "ARCHIVE", "TEMP"],
  files: ["DATA", "LOG", "DUMP", "INDEX", "CONFIG", "NOTES"],
  people: ["ADMIN", "GUEST"],
  texts: [],
};

/* ------------------------------------------------------------------ */
/* 发现真实文件时显示的载荷简报             */
/* ------------------------------------------------------------------ */

const PAYLOAD_TEXT: Record<string, [string, string]> = {
  f_queue_memo: [
    "QUEUE OVERRIDE — SALES PRIORITY\nPremium client (tier A, retainer paid) is dissatisfied with the casing colour of his current implant and demands a replacement unit this month. Stock is allocated. Accordingly, pull one recipient from the top of the public waiting list.\nSelection criteria: close enough to the front that a unit is reserved in their name, and insignificant enough that the deferral will not create problems — no legal cover, no press contacts, no family able to escalate. Candidate selected and moved to the next annual cycle. Notify by standard force-majeure template; do not state a reason.",
    "ПОДМЕНА ОЧЕРЕДИ — ПРИОРИТЕТ ОТДЕЛА ПРОДАЖ\nПремиум-клиент (категория A, абонентская плата внесена) недоволен цветом корпуса своего импланта и требует замену уже в этом месяце. Склад распределён. Соответственно, снимаем одного получателя из начала общей очереди.\nКритерии отбора: достаточно близко к началу, чтобы за ним уже был закреплён блок, и достаточно незначительный, чтобы перенос не создал проблем — нет юридической поддержки, нет связей с прессой, нет родственников, способных поднять шум. Кандидат отобран и перенесён на следующий годовой цикл. Уведомить стандартным шаблоном о форс-мажоре; причину не указывать.",
  ],
  f_wardenpass: [
    "DO NOT KEEP THIS ON THE SERVER!\nThe corporates decided to sponsor us — they gave us access to WARDEN PASS. No idea why; maybe they are covering up a mess of their own. Remember to circulate the temporary key to staff: \"CORE1MAX32\". There is other data on this server worth lifting, same as we did before.",
    "НЕ ХРАНИТЬ НА СЕРВЕРЕ!\nКорпораты решили проспонсировать нас, дали нам доступ к WARDEN PASS. Не знаю зачем им это, может решили скрыть какие-то свои косяки. Нужно не забыть разослать сотрудникам временный пароль \"CORE1MAX32\". Также на сервере есть и другие данные которые можно украсть, как мы делали ранее.",
  ],
  f_icx_payroll: [
    "Q4 payroll routing. Nine salary lines terminate at a holding company with no staff and no address. The transfer schedule matches Slayer Incorporated's procurement calendar to the day.",
    "Маршруты зарплат за Q4. Девять строк уходят в холдинг без сотрудников и без адреса. График переводов день в день совпадает с закупочным календарём Slayer Incorporated.",
  ],
  f_icx_memo: [
    "Board memo, unsigned. 'The subsidiary line stays off the public filing.' Attached: an intermediary account and the name of the officer who opened it.",
    "Записка правления, без подписи. «Дочернюю структуру в публичную отчётность не вносим». Приложены счёт посредника и имя открывшего его руководителя.",
  ],
  f_meters: [
    "Northline meter archive. A continuous unbilled draw runs from a substation into the Midland Exchange. It has been running for eleven months.",
    "Архив счётчиков Northline. С подстанции в Midland Exchange идёт непрерывное невыставленное потребление. Уже одиннадцать месяцев.",
  ],
  f_fin_mirror: [
    "Mirrored settlement batch. The 0200 window carries transfers that never appear in the 0400 reconciliation.",
    "Зеркало расчётного пакета. В окне 02:00 проходят переводы, которых нет в сверке 04:00.",
  ],
  f_grain: [
    "Commodity ledger. Positions are opened minutes before public harvest reports. Every single time.",
    "Сырьевой реестр. Позиции открываются за минуты до публикации отчётов об урожае. Каждый раз.",
  ],
  f_pressure: [
    "Well pressure set. Rig 14 logged three spikes that were manually flattened before export.",
    "Набор данных по давлению. Вышка 14 зафиксировала три скачка, сглаженных вручную перед выгрузкой.",
  ],
  f_manifest: [
    "Port manifests. Sealed crates arrive 900 kg heavier than they left. The discrepancy is logged as 'moisture'.",
    "Портовые манифесты. Опломбированные ящики приходят на 900 кг тяжелее. Расхождение списано на «влажность».",
  ],
};

const genericPayload = (lang: Lang): string =>
  lang === "ru"
    ? "Содержимое проиндексировано и извлечено. Для заказчика этого достаточно."
    : "Contents indexed and extracted. Enough for the client to work with.";

/* ------------------------------------------------------------------ */

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

const EXTS = ["DAT", "DOC", "MSG", "LOG", "TXT", "BIN"];

/** 每次进入主机时构建一个全新的、略有不同的文件系统 */
export function generateVault(nodeId: string, ownedFiles: string[], burnedFiles: string[] = []): VaultFS {
  const meta = NODE_META[nodeId];
  const theme = (meta && THEMES[meta.owner]) || FALLBACK;

  /* 仍值得找回的载荷：未持有，且尚未被倒卖出去 */
  const all = filesOfNode(nodeId).map((f) => f.id);
  const pending = all.filter((id) => !ownedFiles.includes(id) && !burnedFiles.includes(id));

  const folderNames = shuffle(theme.folders).slice(0, ri(3, Math.min(5, theme.folders.length)));
  const folders: VaultFolder[] = folderNames.map((name, fi) => ({
    id: `d${fi}`,
    name,
    files: [],
  }));

  let uid = 0;
  const mkFile = (seedKind: ResultKind, payloadId?: string): VaultFile => {
    const stem = pick(theme.files);
    const name = `${stem}${ri(0, 99).toString().padStart(2, "0")}.${pick(EXTS)}`;
    return {
      id: `f${uid++}`,
      name,
      size: `${ri(1, 640)}K`,
      date: `${String(ri(1, 28)).padStart(2, "0")}-${String(ri(1, 12)).padStart(2, "0")}-9${ri(1, 7)}`,
      scan: "idle",
      result: null,
      seedKind,
      seedIdx: ri(0, 99),
      payloadId,
    };
  };

  /* 先放垃圾文件 */
  folders.forEach((f) => {
    const n = ri(3, 6);
    for (let i = 0; i < n; i++) f.files.push(mkFile(Math.random() < 0.55 ? "empty" : "text"));
  });

  /* 散布真实载荷，每个文件夹至多一个 */
  shuffle(pending).forEach((pid, i) => {
    const target = folders[i % folders.length];
    const file = mkFile("payload", pid);
    target.files.splice(ri(0, target.files.length), 0, file);
  });

  return { volume: theme.vol, folders, payloads: pending };
}

/** 解析扫描结果：操作员扫描文件时调用 */
export function resolveScan(
  file: VaultFile,
  nodeId: string,
  lang: Lang,
  fileName: (id: string) => string
): VaultResult {
  const meta = NODE_META[nodeId];
  const theme = (meta && THEMES[meta.owner]) || FALLBACK;

  if (file.seedKind === "payload" && file.payloadId) {
    const pt = PAYLOAD_TEXT[file.payloadId];
    return {
      kind: "payload",
      title: fileName(file.payloadId),
      body: [pt ? (lang === "ru" ? pt[1] : pt[0]) : genericPayload(lang)],
      fileId: file.payloadId,
    };
  }

  if (file.seedKind === "text") {
    const pool = theme.texts.length ? [...theme.texts, ...GENERIC_TEXTS] : GENERIC_TEXTS;
    const t = pool[file.seedIdx % pool.length];
    return {
      kind: "text",
      title: lang === "ru" ? t[1] : t[0],
      body: [lang === "ru" ? t[3] : t[2], `— ${pick(theme.people)}`],
    };
  }

  return { kind: "empty", title: "", body: [] };
}
