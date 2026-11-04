import { ALL_NODES } from "../data/regions";
import { NODE_META, filesOfNode } from "./data";
import { pickL, type Lang } from "../i18n";

/* 列出区域内的数据服务器。 */

export type ScanState = "idle" | "scanning" | "done";
export type ResultKind = "empty" | "text" | "payload";

export interface VaultResult {
  kind: ResultKind;
  title: string;
  body: string[];
  
  fileId?: string;
}

export interface VaultFile {
  id: string;
  name: string;      // DOS 8.3 命名格式
  size: string;
  date: string;
  scan: ScanState;
  result: VaultResult | null;
  
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

/**
 * 文件系统的 WARDEN 倒计时：从 T2 起生效，等级越高留给玩家的时间越少。
 * 返回 0 表示该主机没有防护，可以从容翻找。
 */
export function vaultTimer(warden: number): number {
  const table: Record<number, number> = { 2: 75, 3: 60, 4: 45, 5: 32 };
  return table[warden] ?? 0;
}

interface Theme {
  vol: string;
  folders: string[];
  files: string[];
  people: string[];
  
  texts: [string, string, string, string, string?, string?][];
}

const GENERIC_TEXTS: Theme["texts"] = [
  ["SHIFT NOTE", "ЗАПИСКА СМЕНЫ",
   "night shift log: nothing moved. coffee machine down again. someone please requisition a new element.",
   "журнал ночной смены: ничего не происходило. кофемашина снова сдохла. закажите кто-нибудь новый тэн.",
      "值班字条",
      "夜班日志：屁事没有。咖啡机又挂了，谁来走行政流程领个新加热管吧。"],
  ["BACKUP REPORT", "ОТЧЁТ О РЕЗЕРВЕ",
   "weekly spool verified. 2 bad blocks remapped. tape 14 is getting thin — rotate it out next quarter.",
   "еженедельная катушка проверена. 2 сбойных блока переразмечены. лента 14 истончается — вывести в следующем квартале.",
      "备份报告",
      "每周卷带已核验。2 个坏块已重映射。14 号带快磨穿了——下季度轮换下线。"],
  ["PRINTER QUEUE", "ОЧЕРЕДЬ ПЕЧАТИ",
   "job 0041 stuck for six days. nobody has claimed it. it is 400 pages of the letter 'K'.",
   "задание 0041 висит шесть дней. хозяина нет. это 400 страниц буквы «К».",
      "打印队列",
      "作业 0041 卡了六天。没人认领。内容是 400 页的字母「K」。"],
  ["MAINTENANCE", "ОБСЛУЖИВАНИЕ",
   "fan bearing replaced on rack 3. noise complaint from accounting withdrawn.",
   "заменён подшипник вентилятора в стойке 3. жалоба бухгалтерии на шум отозвана.",
      "维护",
      "3 号机架风扇轴承已换。财务处撤回了噪声投诉。"],
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
       "R.VOSS: дочернюю структуру в публичную отчётность не вносим. проводите через обычного посредника и моё имя рядом не ставьте.",
      "董事会备忘",
      "R.VOSS：子公司这条线不进公开报表。走老中介，别把我的名字放边上。"],
      ["INTERNAL MAIL", "ВНУТРЕННЯЯ ПОЧТА",
       "M.AKERS: whoever keeps badging into the sublevel at 0300 — the log sees you. this is your one warning.",
       "M.AKERS: тот, кто ходит по пропуску на минус-этаж в 03:00 — журнал вас видит. это единственное предупреждение.",
      "内部邮件",
      "M.AKERS：凌晨 03:00 老往地下层刷卡的那位——日志看着你呢。警告只此一次。"],
      ["HR COMPLAINT", "ЖАЛОБА В КАДРЫ",
       "the synthetics division keeps requisitioning 'consumables' with no inventory code. accounting refuses to sign again.",
       "отдел синтетики снова заказывает «расходники» без инвентарного кода. бухгалтерия опять отказывается подписывать.",
      "人事投诉",
      "合成部又在申购没编号的「耗材」了。财务这次照旧不签。"],
      ["PERSONAL", "ЛИЧНОЕ",
       "sable: i am not on the payroll. i am in the payroll. there is a difference and it took me two years to see it.",
       "sable: я не в платёжной ведомости. я внутри неё. разница есть, и мне понадобилось два года, чтобы её увидеть.",
      "私人",
      "sable：我不在工资单上。我在工资单里面。有区别，这区别我花了两年才看懂。"],
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
       "уровни warden выше 3 в реестре не фигурируют. если спросит аудитор — это «экологический мониторинг».",
      "行动指令",
      "3 级以上的 warden 不进台账。审计问起来，就说是「环境监测设备」。"],
      ["FIELD REPORT", "ПОЛЕВОЙ ОТЧЁТ",
       "the contested sector is costing more than it returns. recommend we keep it anyway. the map matters more than the margin.",
       "спорный сектор обходится дороже, чем приносит. рекомендую удержать. карта важнее маржи.",
      "外勤报告",
      "争议扇区亏的比赚的多。建议继续攥着。地图比利润值钱。"],
      ["DENIAL DRAFT", "ЧЕРНОВИК ОПРОВЕРЖЕНИЯ",
       "'slayer incorporated does not operate unregistered defence systems.' hold this ready. we will need it.",
       "«slayer incorporated не эксплуатирует незарегистрированные системы защиты». держать наготове. понадобится.",
      "辟谣草稿",
      "「slayer incorporated 未运营任何未登记的防御系统。」备着，迟早用得上。"],
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
       "арендатор 12-го этажа платит вперёд, полностью, и ни разу не присылал человека. проверку не назначать.",
      "租赁备忘",
      "12 层租户预付、全款，从没派过一个活人来。别安排巡检。"],
      ["FINANCE", "ФИНАНСЫ",
       "the escrow account reconciles to the cent every month. that is the part that worries me.",
       "эскроу-счёт сходится до цента каждый месяц. именно это меня и беспокоит.",
      "财务",
      "托管账户每月分毫不差。这才是让我睡不着的部分。"],
      ["BUILDING OPS", "ЭКСПЛУАТАЦИЯ",
       "the cable landing has no documented shutoff. the original contractor dissolved in '91.",
       "у кабельного ввода нет задокументированного рубильника. подрядчик ликвидирован в '91.",
      "楼务",
      "电缆上岸点没有文档化的总闸。原承包商 91 年就注销了。"],
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
       "вышка 14 сообщила о скачке давления, которого нет в телеметрии. телеметрия считается достоверной.",
      "安全通报",
      "14 号井架上报了一次遥测里不存在的压力尖峰。以遥测为准。"],
      ["CREW LOG", "ЖУРНАЛ ЭКИПАЖА",
       "storm shift. everyone accounted for. the sea sounds like a modem tonight, which is not comforting.",
       "штормовая смена. все на месте. море сегодня звучит как модем, и это не успокаивает.",
      "班组日志",
      "风暴班。全员到齐。今晚大海的声音像调制解调器，一点也不治愈。"],
      ["WORK ORDER", "НАРЯД",
       "replace valve housing on pump 6. part is three years back-ordered. improvise, log it as 'inspected'.",
       "заменить корпус клапана на насосе 6. деталь в заказе три года. импровизируйте, запишите «осмотрено».",
      "工单",
      "给 6 号泵换阀体。配件缺货三年了。自己想办法，记录写成「已检」。"],
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
       "кофейная книга — прикрытие для хеджевой. хеджевая и есть настоящий бизнес. держите их в разных томах.",
      "交易台",
      "咖啡账本是给对冲账本打掩护的。对冲才是真生意。两本账分开放。"],
      ["LEGAL", "ЮРИДИЧЕСКОЕ",
       "our lawyers are instructed to be patient rather than correct. patience has a better win rate.",
       "нашим юристам предписано быть терпеливыми, а не правыми. у терпения выше процент побед.",
      "法务",
      "要求我方律师耐心，不要求正确。耐心的胜率更高。"],
      ["CUSTOMS", "ТАМОЖНЯ",
       "crate manifest 88 lists 'agricultural equipment' weighing four tonnes. it is one tonne of equipment.",
       "в манифесте 88 указано «сельхозоборудование» весом четыре тонны. оборудования там тонна.",
      "海关",
      "88 号舱单写着四吨「农用设备」。设备其实只有一吨。"],
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
       "плановое отключение перенесено в четвёртый раз. подстанция старше бумаг, которые её описывают.",
      "公告",
      "计划停电第四次推迟。变电站比描述它的文件还老。"],
      ["INTERNAL", "СЛУЖЕБНОЕ",
       "operator_17: i log everything. that is the job. what happens to the logs afterwards is not the job.",
       "operator_17: я журналирую всё. это работа. что происходит с журналами потом — уже не работа.",
      "内部",
      "operator_17：我全都记日志。这就是工作。日志之后的遭遇不归我管。"],
      ["FORM 7-C", "ФОРМА 7-C",
       "unauthorized access to grid trunks is punishable under section 7-C. nobody has ever been charged under section 7-C.",
       "несанкционированный доступ к магистралям карается по разделу 7-C. по разделу 7-C ещё никого не привлекали.",
      "表格 7-C",
      "擅闯骨干干线按 7-C 条惩处。迄今没人真被 7-C 条办过。"],
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
       "судно у причала 7 без зарегистрированного владельца, платит сборы заранее и выходит только ночью.",
      "泊位日志",
      "7 号泊位的船没有注册船东，费用提前交，只在夜里出航。"],
      ["CUSTOMS", "ТАМОЖНЯ",
       "seal 4471 was intact on arrival and intact on departure. the weight differs by 900 kilograms.",
       "пломба 4471 цела при прибытии и цела при отходе. вес отличается на 900 килограммов.",
      "海关",
      "4471 号封条到港完好，离港也完好。重量差了 900 公斤。"],
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
       "koma: если доля поровну — кто-то врёт. поровну не бывает. ни разу не было поровну.",
      "群聊",
      "koma：要是分得均，那准有人撒谎。就没均过。一次都没有。"],
      ["DROP NOTE", "ЗАПИСКА О ТОЧКЕ",
       "the kingdom buys spools, not stories. bring the tape, keep the anecdote.",
       "королевство покупает катушки, а не истории. неси плёнку, байку оставь себе.",
      "投放备忘",
      "王国收磁带，不收故事。带子拿来，段子自己留着。"],
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

const PAYLOAD_TEXT: Record<string, [string, string, string?]> = {
  f_queue_memo: [
    "QUEUE OVERRIDE — SALES PRIORITY\nPremium client (tier A, retainer paid) is dissatisfied with the casing colour of his current implant and demands a replacement unit this month. Stock is allocated. Accordingly, pull one recipient from the top of the public waiting list.\nSelection criteria: close enough to the front that a unit is reserved in their name, and insignificant enough that the deferral will not create problems — no legal cover, no press contacts, no family able to escalate. Candidate selected and moved to the next annual cycle. Notify by standard force-majeure template; do not state a reason.",
    "ПОДМЕНА ОЧЕРЕДИ — ПРИОРИТЕТ ОТДЕЛА ПРОДАЖ\nПремиум-клиент (категория A, абонентская плата внесена) недоволен цветом корпуса своего импланта и требует замену уже в этом месяце. Склад распределён. Соответственно, снимаем одного получателя из начала общей очереди.\nКритерии отбора: достаточно близко к началу, чтобы за ним уже был закреплён блок, и достаточно незначительный, чтобы перенос не создал проблем — нет юридической поддержки, нет связей с прессой, нет родственников, способных поднять шум. Кандидат отобран и перенесён на следующий годовой цикл. Уведомить стандартным шаблоном о форс-мажоре; причину не указывать.",
    "队位调包——销售部优先级\n某高级客户（A 级，年费已缴）对现有植入体的外壳颜色不满，要求本月换新。库存已分配。因此，从公共等候队列顶部撤下一名受赠者。\n筛选标准：排名够靠前，名下已预留机组；又足够无足轻重，延期不会惹出麻烦——没有法律靠山、没有媒体关系、没有能闹事的家人。候选人已选定并顺延至下个年度周期。按标准不可抗力模板通知；不要说明理由。",
  ],
  f_wardenpass: [
    "DO NOT KEEP THIS ON THE SERVER!\nThe corporates decided to sponsor us — they gave us access to WARDEN PASS. No idea why; maybe they are covering up a mess of their own. Remember to circulate the temporary key to staff: \"CORE1MAX32\". There is other data on this server worth lifting, same as we did before.",
    "НЕ ХРАНИТЬ НА СЕРВЕРЕ!\nКорпораты решили проспонсировать нас, дали нам доступ к WARDEN PASS. Не знаю зачем им это, может решили скрыть какие-то свои косяки. Нужно не забыть разослать сотрудникам временный пароль \"CORE1MAX32\". Также на сервере есть и другие данные которые можно украсть, как мы делали ранее.",
    "别存服务器上！\n企业那边决定当我们的金主——给了我们 WARDEN PASS 权限。不知道图啥，可能是想盖自己的烂摊子。记得把临时密码 \"CORE1MAX32\" 群发给员工。服务器上还有别的数据，跟上次一样，值得顺走。",
  ],
  f_icx_payroll: [
    "Q4 payroll routing. Nine salary lines terminate at a holding company with no staff and no address. The transfer schedule matches Slayer Incorporated's procurement calendar to the day.",
    "Маршруты зарплат за Q4. Девять строк уходят в холдинг без сотрудников и без адреса. График переводов день в день совпадает с закупочным календарём Slayer Incorporated.",
    "Q4 薪资路由。九条工资线汇入一家没员工、没地址的控股公司。转账日期和 Slayer Incorporated 的采购日历一天不差。",
  ],
  f_icx_memo: [
    "Board memo, unsigned. 'The subsidiary line stays off the public filing.' Attached: an intermediary account and the name of the officer who opened it.",
    "Записка правления, без подписи. «Дочернюю структуру в публичную отчётность не вносим». Приложены счёт посредника и имя открывшего его руководителя.",
    "董事会字条，无署名。「子公司这条线不进公开报表。」附件：一个中间账户，以及开户高管的名字。",
  ],
  f_meters: [
    "Northline meter archive. A continuous unbilled draw runs from a substation into the Midland Exchange. It has been running for eleven months.",
    "Архив счётчиков Northline. С подстанции в Midland Exchange идёт непрерывное невыставленное потребление. Уже одиннадцать месяцев.",
    "Northline 电表档案。一条从没开过账单的持续用电，从变电站直通 Midland Exchange。已经跑了十一个月。",
  ],
  f_fin_mirror: [
    "Mirrored settlement batch. The 0200 window carries transfers that never appear in the 0400 reconciliation.",
    "Зеркало расчётного пакета. В окне 02:00 проходят переводы, которых нет в сверке 04:00.",
    "结算批次镜像。02:00 窗口跑的转账，永远不会出现在 04:00 的对账里。",
  ],
  f_grain: [
    "Commodity ledger. Positions are opened minutes before public harvest reports. Every single time.",
    "Сырьевой реестр. Позиции открываются за минуты до публикации отчётов об урожае. Каждый раз.",
    "大宗商品台账。仓位总在公开收成报告发布前几分钟建好。次次如此。",
  ],
  f_pressure: [
    "Well pressure set. Rig 14 logged three spikes that were manually flattened before export.",
    "Набор данных по давлению. Вышка 14 зафиксировала три скачка, сглаженных вручную перед выгрузкой.",
    "井压数据集。14 号井架记到三次尖峰，导出前被人手工抹平。",
  ],
  f_manifest: [
    "Port manifests. Sealed crates arrive 900 kg heavier than they left. The discrepancy is logged as 'moisture'.",
    "Портовые манифесты. Опломбированные ящики приходят на 900 кг тяжелее. Расхождение списано на «влажность».",
    "港口舱单。铅封箱子到港比离港时重 900 公斤。差值记作「受潮」。",
  ],
};

const genericPayload = (lang: Lang): string =>
  pickL(
    lang,
    "Contents indexed and extracted. Enough for the client to work with.",
    "Содержимое проиндексировано и извлечено. Для заказчика этого достаточно.",
    "内容已索引并提取。够客户用的了。"
  );

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

const EXTS = ["DAT", "DOC", "MSG", "LOG", "TXT", "BIN"];

export function generateVault(nodeId: string, ownedFiles: string[], burnedFiles: string[] = []): VaultFS {
  const meta = NODE_META[nodeId];
  const theme = (meta && THEMES[meta.owner]) || FALLBACK;

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

  folders.forEach((f) => {
    const n = ri(3, 6);
    for (let i = 0; i < n; i++) f.files.push(mkFile(Math.random() < 0.55 ? "empty" : "text"));
  });

  shuffle(pending).forEach((pid, i) => {
    const target = folders[i % folders.length];
    const file = mkFile("payload", pid);
    target.files.splice(ri(0, target.files.length), 0, file);
  });

  return { volume: theme.vol, folders, payloads: pending };
}

/** 仓库里任何一份文件的正文——用于「状态 → 数据仓库」的阅读窗口。 */
export function payloadTextOf(fileId: string, lang: Lang): string {
  const pt = PAYLOAD_TEXT[fileId];
  return pt ? pickL(lang, pt[0], pt[1], pt[2]) : genericPayload(lang);
}

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
      body: [pt ? pickL(lang, pt[0], pt[1], pt[2]) : genericPayload(lang)],
      fileId: file.payloadId,
    };
  }

  if (file.seedKind === "text") {
    const pool = theme.texts.length ? [...theme.texts, ...GENERIC_TEXTS] : GENERIC_TEXTS;
    const t = pool[file.seedIdx % pool.length];
    return {
      kind: "text",
      title: pickL(lang, t[0], t[1], t[4]),
      body: [pickL(lang, t[2], t[3], t[5]), `— ${pick(theme.people)}`],
    };
  }

  return { kind: "empty", title: "", body: [] };
}
