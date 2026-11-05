/* ============================================================
   MEMDUMP —— 内存转储口令破解
   PRV 节点保存居民的个人数据：家用机 + 云同步。
   防护不是 WARDEN MAX，所以内存没擦干净——
   口令就埋在这片垃圾字节里。

   玩法（经典终端破解）：
   转储里混着若干等长的候选词。选一个提交，系统回报
   「命中字母数」和「位置正确的字母数」，靠这两个数推出真正的口令。
   ============================================================ */

export interface DumpTier {
  /** 候选词长度。 */
  wordLen: number;
  /** 候选词之间的相似度：越高越容易撞字母，反馈也越含糊。 */
  cohesion?: number;
  /** 候选词数量。 */
  words: number;
  /** 允许尝试次数。 */
  tries: number;
  /** 转储行数。 */
  rows: number;
  /** 每行字节数。 */
  cols: number;
  /** WARDEN 倒计时秒数，0 = 不限时。 */
  timerSec: number;
  failRep: number;
}

export const DUMP_TIERS: Record<number, DumpTier> = {
  /* T1：短口令、次数宽裕、不限时——先让玩家摸清规则 */
  1: { wordLen: 4, words: 6, tries: 4, rows: 14, cols: 16, timerSec: 0, failRep: 0 },
  /* T2：更长、更多干扰项，候选词互相撞字母，而且开始倒计时 */
  2: { wordLen: 6, words: 10, tries: 5, rows: 18, cols: 18, timerSec: 90, failRep: 3, cohesion: 0.75 },
};

export const usesMemdump = (type: string, warden: number) =>
  type === "PRIVATE" && DUMP_TIERS[warden] !== undefined;

/* ---------- 词库：住户机器上该有的东西 ---------- */

const WORDS_4 = [
  "MAIL", "HOME", "NODE", "DISK", "USER", "ROOT", "LOCK", "FILE",
  "DATA", "PORT", "LINK", "BOOT", "TAPE", "ECHO", "WIRE", "CORE",
];

const WORDS_6 = [
  "MAILER", "MODEM1", "SYNCED", "LOCKER", "FOLDER", "BACKUP",
  "TENANT", "CLOUD9", "SUBNET", "DAEMON", "KERNEL", "CIPHER",
  "RECORD", "VAULT7", "PACKET", "SIGNAL", "COPPER", "SOCKET",
];

const WORDS_5 = [
  "CLOUD", "DRIVE", "LOGIN", "PHONE", "ROUTE", "CACHE",
  "TOKEN", "PATCH", "SHELL", "TRACE", "RELAY", "FLASH",
];

const JUNK = "!@#$%^&*()[]{}<>|/\\=+-_.,:;?~`'\"".split("");

const ri = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const shuffle = <T,>(a: T[]): T[] => {
  const o = a.slice();
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
};

const poolFor = (len: number): string[] =>
  len <= 4 ? WORDS_4 : len === 5 ? WORDS_5 : WORDS_6;

/* ---------- 评分 ---------- */

/** 位置正确的字母数（经典终端里的 likeness）。 */
export const exactMatches = (guess: string, secret: string): number => {
  let n = 0;
  for (let i = 0; i < Math.min(guess.length, secret.length); i++) {
    if (guess[i] === secret[i]) n++;
  }
  return n;
};

/** 出现在口令里的字母数（算重复，不看位置）。 */
export const letterMatches = (guess: string, secret: string): number => {
  const pool = secret.split("");
  let n = 0;
  for (const ch of guess) {
    const at = pool.indexOf(ch);
    if (at >= 0) {
      pool.splice(at, 1);
      n++;
    }
  }
  return n;
};

export interface Attempt {
  word: string;
  exact: number;
  letters: number;
}

/* ---------- 转储生成 ---------- */

export interface DumpWord {
  word: string;
  /** 在转储正文里的起始下标。 */
  at: number;
}

export interface DumpBoard {
  /** 整片转储（含候选词），按 cols 切行显示。 */
  body: string;
  rows: number;
  cols: number;
  words: DumpWord[];
  secret: string;
  tries: number;
  /** 左侧地址列的起始地址。 */
  baseAddr: number;
}

export function generateDump(tier: DumpTier): DumpBoard {
  const { wordLen, words: wantWords, rows, cols, tries } = tier;
  const total = rows * cols;

  /* 1. 选出互不相同的候选词 */
  const pool = poolFor(wordLen).filter((w) => w.length === wordLen);
  let chosen: string[];
  if (tier.cohesion && pool.length > wantWords) {
    /* 贪心挑一组字母重合度高的词：反馈会更含糊，必须真的推理 */
    const shared = (a: string, b: string) => letterMatches(a, b);
    const start = pick(pool);
    chosen = [start];
    const rest = pool.filter((w) => w !== start);
    while (chosen.length < Math.min(wantWords, pool.length)) {
      rest.sort((a, b) => {
        const sa = chosen.reduce((n, c) => n + shared(a, c), 0);
        const sb = chosen.reduce((n, c) => n + shared(b, c), 0);
        return sb - sa;
      });
      /* 从最像的前几个里随机取，避免每局都一样 */
      const take = rest.splice(ri(0, Math.min(2, rest.length - 1)), 1)[0];
      chosen.push(take);
    }
  } else {
    chosen = shuffle(pool).slice(0, Math.min(wantWords, pool.length));
  }
  /* 词库不够就用随机字母补齐，保证数量 */
  while (chosen.length < wantWords) {
    let w = "";
    for (let i = 0; i < wordLen; i++) w += String.fromCharCode(65 + ri(0, 25));
    if (!chosen.includes(w)) chosen.push(w);
  }

  /* 2. 均匀分段，每段塞一个词，避免挤在一起 */
  const seg = Math.floor(total / chosen.length);
  const slots: number[] = [];
  chosen.forEach((_, i) => {
    const lo = i * seg;
    const hi = Math.min(total - wordLen, lo + seg - wordLen - 1);
    slots.push(hi > lo ? ri(lo, hi) : lo);
  });

  /* 3. 填满垃圾字节，再把词写进去 */
  const buf: string[] = Array.from({ length: total }, () => pick(JUNK));
  const placed: DumpWord[] = [];
  chosen.forEach((w, i) => {
    const at = slots[i];
    for (let k = 0; k < w.length; k++) buf[at + k] = w[k];
    placed.push({ word: w, at });
  });

  return {
    body: buf.join(""),
    rows,
    cols,
    words: placed.sort((a, b) => a.at - b.at),
    secret: pick(chosen),
    tries,
    baseAddr: 0xf000 + ri(0, 0x0800) * 2,
  };
}

/** 提交一次猜测。 */
export function scoreGuess(board: DumpBoard, guess: string): Attempt {
  const g = guess.toUpperCase();
  return {
    word: g,
    exact: exactMatches(g, board.secret),
    letters: letterMatches(g, board.secret),
  };
}

export const isSolved = (a: Attempt, board: DumpBoard) => a.word === board.secret;

/** 还剩几次机会。 */
export const triesLeft = (board: DumpBoard, attempts: Attempt[]) =>
  Math.max(0, board.tries - attempts.length);

/* ---------- 桌面 ---------- */

export type DeskIcon = "mail" | "control" | "disk";

export const DESK_ICONS: DeskIcon[] = ["mail", "control", "disk"];
