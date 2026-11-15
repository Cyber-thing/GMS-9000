/* ============================================================
   VR TEXT — локализация надписей внутри уровней Virtuality Breach.
   Уровни и движок хранят английские строки; перевод выбирается
   в момент отрисовки, поэтому смена языка действует сразу.
   Языки: en (как есть), ru, zh.
   ============================================================ */

export type VrLang = "en" | "ru" | "zh";

let current: VrLang = "en";

export const setVrLang = (l: VrLang): void => {
  current = l;
};
export const getVrLang = (): VrLang => current;

/** Шрифт для canvas: кириллица — IBM Plex Mono, иероглифы — Noto Sans SC. */
export const vrFont = (px: number, bold = true): string =>
  `${bold ? "bold " : ""}${px}px "IBM Plex Mono", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", monospace`;

type Pair = [ru: string, zh: string];

const D: Record<string, Pair> = {
  /* вывески и подписи */
  "GATE KEY": ["КЛЮЧ ШЛЮЗА", "闸门钥匙"],
  "CORE LOCK": ["ЗАМОК ЯДРА", "核心锁"],
  "LIGHTING BREAKER": ["РУБИЛЬНИК СВЕТА", "照明断路器"],
  "OVERLOAD CORE": ["ЯДРО ПЕРЕГРУЗКИ", "过载核心"],
  "VAULT UPLINK": ["КАНАЛ ХРАНИЛИЩА", "金库上行链路"],
  "CORE TERMINAL": ["ТЕРМИНАЛ ЯДРА", "核心终端"],
  "TAKAMURI HALL": ["ЗАЛ TAKAMURI", "TAKAMURI 大厅"],
  "PROJECTOR SUBGRID": ["СЕТЬ ПРОЕКТОРОВ", "投影子网"],
  "RELAY-01": ["РЕЛЕ-01", "中继-01"],
  "POWER DISTRIBUTION": ["РАСПРЕДЕЛЕНИЕ ПИТАНИЯ", "配电"],
  "ICE SECTOR": ["СЕКТОР ICE", "ICE 区"],
  "MEMORY VAULT": ["ХРАНИЛИЩЕ ПАМЯТИ", "记忆库"],
  OVERRIDE: ["ОБХОД", "强制接管"],
  "HEX FIREWALL": ["HEX-БРАНДМАУЭР", "HEX 防火墙"],
  "CARGO LIFT": ["ГРУЗОВОЙ ЛИФТ", "货运电梯"],
  "SERVICE BAY": ["ТЕХОТСЕК", "维修舱"],
  /* подсказки у кнопок и терминалов */
  "GATE-01 OVERRIDE": ["ШЛЮЗ-01: ОБХОД", "闸门-01 接管"],
  "GATE-02 OVERRIDE": ["ШЛЮЗ-02: ОБХОД", "闸门-02 接管"],
  "LIGHTS BREAKER": ["РУБИЛЬНИК СВЕТА", "照明断路器"],
  "TRIGGER OVERLOAD": ["ЗАПУСТИТЬ ПЕРЕГРУЗКУ", "触发过载"],
  "DECODE KERNEL": ["РАСШИФРОВАТЬ ЯДРО", "解码内核"],
  "PURGE LATTICE": ["ОЧИСТИТЬ РЕШЁТКУ", "清除晶格"],
  "BREACH THE VAULT": ["ВЗЛОМАТЬ ХРАНИЛИЩЕ", "突破金库"],
  "ROUTE CORE": ["МАРШРУТ ЯДРА", "路由核心"],
  /* баннеры */
  "POWER GRID SEVERED": ["СЕТЬ ПИТАНИЯ ПЕРЕРЕЗАНА", "电网被切断"],
  "LIGHTS OFF": ["СВЕТ ВЫКЛЮЧЕН", "灯光熄灭"],
  "NANO-REPAIR +2 HP": ["НАНО-РЕМОНТ +2 HP", "纳米修复 +2 HP"],
  "SHARD-12 SCATTER ACQUIRED": ["ПОЛУЧЕН ДРОБОВИК SHARD-12", "获得 SHARD-12 霰弹枪"],
  "STREAM-MP9 ACQUIRED": ["ПОЛУЧЕН STREAM-MP9", "获得 STREAM-MP9"],
  "AMMUNITION REFILLED": ["БОЕПРИПАСЫ ПОПОЛНЕНЫ", "弹药已补充"],
  "CHECKPOINT BUFFER SYNCED": ["КОНТРОЛЬНАЯ ТОЧКА СОХРАНЕНА", "检查点缓冲已同步"],
  "BACKUP SHELL RESTORED": ["РЕЗЕРВНАЯ ОБОЛОЧКА ВОССТАНОВЛЕНА", "备用外壳已恢复"],
  "FINAL BUFFER": ["ПОСЛЕДНИЙ БУФЕР", "最后缓冲"],
  "OVERLOAD ARMED": ["ПЕРЕГРУЗКА ЗАПУЩЕНА", "过载已启动"],
  "REACH EXTRACT GATE": ["ДОБЕРИТЕСЬ ДО ВЫХОДА", "前往撤离门"],
  "CONSTRUCTING VIRTUAL ARCHITECTURE ...": ["ПОСТРОЕНИЕ ВИРТУАЛЬНОЙ АРХИТЕКТУРЫ ...", "正在构建虚拟架构 ..."],
  /* цвета дверей */
  CRIMSON: ["АЛЫЙ", "赤红"],
  COBALT: ["КОБАЛЬТ", "钴蓝"],
  MATRIX: ["МАТРИЦА", "矩阵"],
  /* названия реальностей и корпорации */
  "IMPERIAL FREIGHT MATRIX": ["ИМПЕРСКАЯ ГРУЗОВАЯ МАТРИЦА", "帝国货运矩阵"],
  "CHROME HELIX LATTICE": ["ХРОМОВАЯ СПИРАЛЬНАЯ РЕШЁТКА", "铬螺旋晶格"],
  "CRIMSON BASTION": ["АЛЫЙ БАСТИОН", "赤红堡垒"],
  "SOVEREIGN SPIRE VAULT": ["ХРАНИЛИЩЕ СУВЕРЕННОГО ШПИЛЯ", "至尊尖塔金库"],
  "REACTOR TELEMETRY CORE": ["ТЕЛЕМЕТРИЯ РЕАКТОРА", "反应堆遥测核心"],
  "BIOMETRIC CLEANROOM": ["БИОМЕТРИЧЕСКАЯ ЧИСТАЯ КОМНАТА", "生物识别洁净室"],
  "UNLISTED CONSTRUCT": ["НЕУЧТЁННЫЙ КОНСТРУКТ", "未登记构造体"],
  "SHADOW MATRIX": ["ТЕНЕВАЯ МАТРИЦА", "暗影矩阵"],
  "NEURAL LINK": ["НЕЙРОЛИНК", "神经链路"],
  WARDEN: ["WARDEN", "WARDEN"],
};

const pick = (p: Pair): string => (current === "ru" ? p[0] : p[1]);

/** Перевод одного фрагмента без разделителей. */
function part(s: string): string {
  const k = s.trim();
  const hit = D[k];
  if (hit) return pick(hit);
  let m = /^(CORE LOCK) \((\d+)S\)$/.exec(k);
  if (m) return `${pick(D["CORE LOCK"])} (${m[2]}${current === "ru" ? "С" : "秒"})`;
  m = /^(\w+) GATE UNLOCKED$/.exec(k);
  if (m && D[m[1]]) return current === "ru" ? `ШЛЮЗ «${pick(D[m[1]])}» ОТКРЫТ` : `${pick(D[m[1]])}闸门已解锁`;
  return k;
}

/** Переводит строку уровня или движка на текущий язык (en — без изменений). */
export function vtr(text: string): string {
  if (current === "en" || !text) return text;
  let pre = "";
  let body = text;
  if (body.startsWith("[E] ")) {
    pre = "[E] ";
    body = body.slice(4);
  }
  const whole = D[body.trim()];
  if (whole) return pre + pick(whole);
  const m = /^NEURAL LINK :: (.+) \[WARDEN T(\d)\]$/.exec(body);
  if (m) return `${pre}${pick(D["NEURAL LINK"])} :: ${m[1]} [WARDEN T${m[2]}]`;
  const parts = body.split(" // ");
  return pre + parts.map(part).join(" // ");
}
