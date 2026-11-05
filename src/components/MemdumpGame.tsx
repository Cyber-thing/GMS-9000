import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HardDrive, Mail, Power, Settings2, ShieldAlert, Terminal, X } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { StatusDot } from "./chrome";
import WardenClock from "./WardenClock";
import {
  DESK_ICONS, generateDump, scoreGuess, triesLeft,
  type Attempt, type DeskIcon, type DumpBoard, type DumpTier,
} from "../game/memdump";

/* ---------- 口令界面 ---------- */

const GLITCH_CHARS = "!@#$%^&*()[]{}<>|/\\=+-_.,:;?~`".split("");

function DumpView({
  board, attempts, onPick, hover, setHover, disabled,
}: {
  board: DumpBoard;
  attempts: Attempt[];
  onPick: (w: string) => void;
  hover: string | null;
  setHover: (w: string | null) => void;
  disabled: boolean;
}) {
  const tried = useMemo(() => new Set(attempts.map((a) => a.word)), [attempts]);

  /* 内存在抖：每隔一会儿随机挑几个垃圾字节换掉，并让它们闪一下 */
  const [flips, setFlips] = useState<Record<number, string>>({});
  useEffect(() => {
    const iv = window.setInterval(() => {
      const next: Record<number, string> = {};
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const at = Math.floor(Math.random() * board.body.length);
        /* 不碰候选词，免得玩家看花眼 */
        const inWord = board.words.some((w) => at >= w.at && at < w.at + w.word.length);
        if (inWord) continue;
        next[at] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setFlips(next);
    }, 420);
    return () => clearInterval(iv);
  }, [board]);

  /* 把转储切成「垃圾字节」和「候选词」两种片段 */
  const chunks = useMemo(() => {
    const out: { text: string; word?: string; at: number }[] = [];
    let cur = 0;
    board.words.forEach((w) => {
      if (w.at > cur) out.push({ text: board.body.slice(cur, w.at), at: cur });
      out.push({ text: w.word, word: w.word, at: w.at });
      cur = w.at + w.word.length;
    });
    if (cur < board.body.length) out.push({ text: board.body.slice(cur), at: cur });
    return out;
  }, [board]);

  /* 按列宽折行，同时保留片段信息和绝对下标（下标用于定位闪烁的字节） */
  const lines = useMemo(() => {
    const rows: { text: string; word?: string; at: number }[][] = [];
    let row: { text: string; word?: string; at: number }[] = [];
    let used = 0;
    chunks.forEach((c) => {
      let rest = c.text;
      let off = 0;
      while (rest.length) {
        const space = board.cols - used;
        const take = rest.slice(0, space);
        row.push({ text: take, word: c.word, at: c.at + off });
        used += take.length;
        off += take.length;
        rest = rest.slice(take.length);
        if (used >= board.cols) { rows.push(row); row = []; used = 0; }
      }
    });
    if (row.length) rows.push(row);
    return rows;
  }, [chunks, board.cols]);

  return (
    <div className="font-mono text-[11px] leading-[1.45]">
      {lines.map((row, i) => (
        <div key={i} className="flex gap-2 whitespace-pre">
          <span className="shrink-0 select-none text-faint">
            0x{(board.baseAddr + i * board.cols).toString(16).toUpperCase().padStart(4, "0")}
          </span>
          <span>
            {row.map((seg, j) =>
              seg.word ? (
                <button
                  key={j}
                  disabled={disabled || tried.has(seg.word)}
                  onClick={() => onPick(seg.word!)}
                  onMouseEnter={() => setHover(seg.word!)}
                  onMouseLeave={() => setHover(null)}
                  className={cn(
                    "transition-colors",
                    tried.has(seg.word)
                      ? "text-faint line-through"
                      : hover === seg.word
                        ? "bg-phos text-ink"
                        : "anim-wordjitter bg-phos/15 text-phosbrite hover:bg-phos hover:text-ink"
                  )}
                >
                  {seg.text}
                </button>
              ) : (
                <span key={j} className="text-dim/70">
                  {seg.text.split("").map((ch, k) => {
                    const at = seg.at + k;
                    const flip = flips[at];
                    return (
                      <span key={k} className={flip ? "anim-bitflip text-phos/80" : undefined}>
                        {flip ?? ch}
                      </span>
                    );
                  })}
                </span>
              )
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 破解成功后的桌面 ---------- */

const ICON_OF: Record<DeskIcon, typeof Mail> = {
  mail: Mail,
  control: Settings2,
  disk: HardDrive,
};

function Desktop({ nodeCode, onExit }: { nodeCode: string; onExit: () => void }) {
  const { t } = useT();
  const [denied, setDenied] = useState<DeskIcon | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const tap = (ic: DeskIcon) => {
    setDenied(ic);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDenied(null), 2200);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-well">
      {/* 桌面顶栏 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel2 px-2.5 py-[5px] text-[8px] uppercase tracking-[0.16em]">
        <Terminal size={10} className="text-phos" />
        <span className="text-phosbrite">{t("md.desktop")}</span>
        <span className="truncate text-faint">{nodeCode} · {t("md.localUser")}</span>
        <span className="ml-auto flex items-center gap-1.5 text-faint">
          <StatusDot color="var(--color-phos)" pulse /> {t("md.session")}
        </span>
      </div>

      {/* 图标区 */}
      <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {DESK_ICONS.map((ic) => {
            const Icon = ICON_OF[ic];
            return (
              <button
                key={ic}
                onClick={() => tap(ic)}
                className="group flex flex-col items-center gap-1.5 border border-line2 bg-panel/60 px-2 py-3 transition-colors hover:border-phosdim hover:bg-panel2"
              >
                <Icon size={26} className="text-dim transition-colors group-hover:text-phosbrite" />
                <span className="text-center text-[8.5px] uppercase tracking-[0.14em] text-dim group-hover:text-fog">
                  {t(`md.icon.${ic}`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* 被 WARDEN MAX 挡住 */}
        {denied && (
          <div className="anim-msgin mt-4 flex items-start gap-2 border border-oxide/60 bg-oxide/10 px-3 py-2.5">
            <ShieldAlert size={13} className="mt-[1px] shrink-0 animate-softpulse text-oxide" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-oxide">
                {t("md.denied")}
              </div>
              <p className="mt-[2px] text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-faint">
                {t("md.deniedBody", { what: t(`md.icon.${denied}`) })}
              </p>
            </div>
          </div>
        )}

        <p className="mt-4 text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-faint">
          {t("md.deskHint")}
        </p>
      </div>

      {/* 退出 */}
      <div className="flex shrink-0 items-center gap-2 border-t border-line2 bg-soot px-2.5 py-[6px]">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 border border-line3 px-2.5 py-[5px] text-[9px] font-bold uppercase tracking-[0.16em] text-dim transition-colors hover:border-oxide hover:bg-oxide hover:text-ink"
        >
          <Power size={10} /> {t("md.logout")}
        </button>
        <span className="ml-auto text-[8px] uppercase tracking-[0.14em] text-faint">
          {t("md.footer")}
        </span>
      </div>
    </div>
  );
}

/* ---------- 主组件 ---------- */

export default function MemdumpGame({
  nodeCode, warden, tier, known = false, onCracked, onWin, onLose, onAbort, onLog,
}: {
  nodeCode: string;
  warden: number;
  tier: DumpTier;
  /** 口令已经记在本子上了：直接进桌面，不再重猜。 */
  known?: boolean;
  /** 口令一破就立刻算攻陷——哪怕玩家随后直接叉掉窗口。 */
  onCracked?: () => void;
  onWin: () => void;
  onLose: () => void;
  onAbort: () => void;
  onLog?: (key: string, params?: Record<string, string | number>) => void;
}) {
  const { t } = useT();
  const [board, setBoard] = useState<DumpBoard>(() => generateDump(tier));
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [typed, setTyped] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [cracked, setCracked] = useState(known);
  /* 破解瞬间先播一段「ACCESS GRANTED」，再推桌面 */
  const [granted, setGranted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);
  /* 正在把选中的词敲进输入框 */
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const left = triesLeft(board, attempts);
  const done = cracked || locked || granted;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [attempts]);

  /* 真正的结算：输入框里已经是完整口令了 */
  const commit = useCallback((guess: string) => {
    const at = scoreGuess(board, guess);
    const next = [...attempts, at];
    setAttempts(next);

    if (guess === board.secret) {
      onLog?.("md.logCracked", { pw: guess });
      /* 立刻记账：节点此刻就算拿下，相邻节点随之解锁 */
      onCracked?.();
      /* 先打出 ACCESS GRANTED，再滑进桌面 */
      setGranted(true);
      timers.current.push(window.setTimeout(() => { setCracked(true); setGranted(false); }, 1500));
      return;
    }
    setTyped("");
    onLog?.("md.logTry", { w: guess, e: at.exact, n: at.letters });
    /* 答错就抖一下 */
    setShake(true);
    timers.current.push(window.setTimeout(() => setShake(false), 420));
    if (triesLeft(board, next) <= 0) {
      setLocked(true);
      timers.current.push(window.setTimeout(onLose, 1800));
    }
  }, [board, attempts, onLose, onLog, onCracked]);

  /* 手动提交 */
  const submit = useCallback((raw: string) => {
    const guess = raw.trim().toUpperCase();
    if (!guess || done || typing) return;
    if (guess.length !== tier.wordLen) {
      setShake(true);
      timers.current.push(window.setTimeout(() => setShake(false), 420));
      return;
    }
    if (attempts.some((a) => a.word === guess)) return;
    commit(guess);
  }, [attempts, done, typing, tier.wordLen, commit]);

  /* 从转储里点词：先一个字母一个字母敲进输入框，再结算 */
  const pickWord = useCallback((w: string) => {
    if (done || typing) return;
    if (attempts.some((a) => a.word === w)) return;
    setTyping(true);
    setTyped("");
    const SPEED = 55;
    for (let i = 1; i <= w.length; i++) {
      timers.current.push(window.setTimeout(() => setTyped(w.slice(0, i)), i * SPEED));
    }
    timers.current.push(window.setTimeout(() => {
      setTyping(false);
      commit(w);
    }, w.length * SPEED + 320));
  }, [done, typing, attempts, commit]);

  const reseed = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBoard(generateDump(tier));
    setAttempts([]);
    setTyped("");
    setCracked(false);
    setLocked(false);
  };

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-ink/85 p-3">
      <div className="anim-msgin flex max-h-[94vh] w-[min(660px,97%)] flex-col border border-line3 bg-panel shadow-[0_0_80px_rgba(0,0,0,0.75)]">
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-line2 bg-header px-2.5 py-[6px]">
          <Terminal size={12} className="text-phos" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-phosbrite">
            {cracked ? t("md.titleIn") : t("md.title")}
          </span>
          <span className="truncate text-[8px] uppercase tracking-[0.16em] text-faint">
            {nodeCode}
            {known && <span className="ml-1.5 text-phosdim">· {t("md.known")}</span>}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <StatusDot color={cracked ? "var(--color-phos)" : "#cfa04b"} pulse={!done} />
            <span className="text-[8px] uppercase tracking-[0.14em] text-dim">W{warden}</span>
          </span>
          <button
            onClick={cracked || granted ? onWin : onAbort}
            className="shrink-0 text-dim transition-colors hover:text-oxide"
            title={cracked ? t("md.logout") : t("bg.abort")}
          >
            <X size={13} />
          </button>
        </div>

        {cracked ? (
          <Desktop nodeCode={nodeCode} onExit={onWin} />
        ) : (
          <>
            {/* 状态条 */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-soot px-2.5 py-[5px] text-[8.5px] uppercase tracking-[0.14em]">
              <span className="text-faint">
                {t("md.tries")}:{" "}
                <span className={left <= 1 ? "text-oxide" : "text-amber"}>{left}</span>
                <span className="text-faint">/{board.tries}</span>
              </span>
              <span className="text-faint">
                {t("md.len")}: <span className="text-phosbrite">{tier.wordLen}</span>
              </span>
              {tier.timerSec > 0 && !done && (
                <span className="ml-auto">
                  <WardenClock
                    seconds={tier.timerSec}
                    warden={warden}
                    running={!done}
                    onExpire={() => {
                      setLocked(true);
                      timers.current.push(window.setTimeout(onLose, 1600));
                    }}
                  />
                </span>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
              {/* 内存转储 */}
              <div className="min-h-0 flex-1 overflow-auto bg-well px-2.5 py-2">
                <div className="mb-1.5 text-[8px] uppercase tracking-[0.18em] text-faint">
                  {t("md.dump")}
                </div>
                <DumpView
                  board={board}
                  attempts={attempts}
                  onPick={pickWord}
                  hover={hover}
                  setHover={setHover}
                  disabled={done}
                />
              </div>

              {/* 尝试记录 */}
              <div className="flex w-full shrink-0 flex-col border-t border-line bg-panel2 sm:w-[190px] sm:border-l sm:border-t-0">
                <div className="border-b border-line px-2.5 py-[5px] text-[8px] uppercase tracking-[0.18em] text-faint">
                  {t("md.log")}
                </div>
                <div ref={logRef} className="min-h-[88px] flex-1 overflow-y-auto px-2.5 py-1.5">
                  {attempts.length === 0 && (
                    <p className="text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-faint">
                      {t("md.hint")}
                    </p>
                  )}
                  {attempts.map((a, i) => (
                    <div key={i} className="anim-msgin mb-1 border-l-2 border-line3 pl-1.5">
                      <div className="font-mono text-[10.5px] text-fog">&gt; {a.word}</div>
                      <div className="text-[8px] uppercase tracking-[0.1em] text-dim">
                        <span className="text-phos">{a.exact}</span> {t("md.exact")} ·{" "}
                        <span className="text-amber">{a.letters}</span> {t("md.letters")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 手动输入 */}
                <div className="border-t border-line px-2.5 py-2">
                  <div className={cn("flex items-center gap-1 border border-line3 bg-well px-1.5", shake && "anim-shake")}>
                    <span className="shrink-0 text-[11px] text-phos">&gt;</span>
                    <input
                      value={typed}
                      maxLength={tier.wordLen}
                      disabled={done || typing}
                      onChange={(e) => setTyped(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && submit(typed)}
                      placeholder={t("md.ph")}
                      className="h-[26px] w-full bg-transparent font-mono text-[12px] tracking-[0.18em] text-phosbrite placeholder:text-[8px] placeholder:tracking-[0.14em] placeholder:text-faint"
                    />
                    {typing && (
                      <span className="mr-1 inline-block h-[12px] w-[6px] shrink-0 animate-blink bg-phos" />
                    )}
                  </div>
                  <button
                    onClick={() => submit(typed)}
                    disabled={done || typing || typed.length !== tier.wordLen}
                    className={cn(
                      "mt-1.5 w-full border py-[5px] text-[9px] font-bold uppercase tracking-[0.14em] transition-colors",
                      typed.length === tier.wordLen && !done && !typing
                        ? "border-phosdim bg-phos/15 text-phosbrite hover:bg-phos hover:text-ink"
                        : "cursor-not-allowed border-line text-faint"
                    )}
                  >
                    {t("md.submit")}
                  </button>
                </div>
              </div>
            </div>

            {/* 成功：和其它小游戏一致的「ДОСТУП ПОЛУЧЕН」 */}
            {granted && (
              <div className="absolute inset-0 z-[6] flex items-center justify-center bg-ink/85">
                <div className="anim-msgin border border-phosdim bg-phos/10 px-6 py-4 text-center">
                  <div className="pixel anim-grant text-[30px] leading-none text-phosbrite">
                    {t("md.granted")}
                  </div>
                  <div className="mt-1.5 font-mono text-[11px] tracking-[0.3em] text-phos">
                    {board.secret}
                  </div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-dim">
                    {t("md.grantedSub")}
                  </div>
                </div>
              </div>
            )}

            {/* 失败遮罩 */}
            {locked && (
              <div className="absolute inset-0 z-[5] flex items-center justify-center bg-ink/85">
                <div className="anim-msgin border border-oxide bg-oxide/12 px-5 py-3 text-center">
                  <div className="pixel text-[26px] leading-none text-[#e0634a]">{t("md.locked")}</div>
                  <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-dim">{t("md.lockedSub")}</div>
                  <button
                    onClick={reseed}
                    className="mt-2 border border-line3 px-3 py-[5px] text-[9px] font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:border-phosdim hover:text-phos"
                  >
                    {t("hx.retry")}
                  </button>
                </div>
              </div>
            )}

            <div className="flex h-[22px] shrink-0 items-center gap-2 border-t border-line bg-soot px-2.5 text-[8px] uppercase tracking-[0.14em] text-faint">
              {t("md.foot")}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
