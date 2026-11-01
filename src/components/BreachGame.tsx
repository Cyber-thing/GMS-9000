import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Siren, Snowflake, Unplug, Zap } from "lucide-react";
import { cn } from "../utils/cn";
import { blockBar, pad } from "../lib/util";
import { useT } from "../i18n";
import { StatusDot } from "./chrome";
import { useGame } from "../game/state";
import { SCRIPTS, scriptById } from "../game/data";
import {
  BOARD_H, boardWidth, cellPos, generateBreach, neighboursOf,
  type BreachCell, type BreachMap, type BreachTier,
} from "../game/breach";

type Phase = "DIAL" | "RUN" | "WIN" | "LOSE";
type CellState = "idle" | "ready" | "loading" | "done" | "current";

const DIAL_KEYS = ["bg.dial1", "bg.dial2", "bg.dial3", "bg.dial4", "bg.dial5"];

/* ------------------------------------------------------------------ */

function Cell({
  cell, cols, boardW, state, pct, onPick,
}: {
  cell: BreachCell; cols: number; boardW: number;
  state: CellState; pct: number; onPick: () => void;
}) {
  const { t } = useT();
  const { x, y } = cellPos(cell, cols, boardW);
  const isAccess = cell.kind === "ACCESS";
  const isEntry = cell.kind === "ENTRY";
  const terminal = isAccess || isEntry;

  const color =
    state === "done" || state === "current" ? "#8fb56d"
    : state === "loading" ? "#cfa04b"
    : state === "ready" ? (isAccess ? "#b3d98d" : "#7f95a8")
    : "#3e4733";

  const w = terminal ? 82 : 70;
  const h = terminal ? 34 : 34;
  const lit = state !== "idle";

  /* a tiny schematic glyph per node class */
  const Glyph = () => {
    const c = color;
    if (cell.kind === "RELAY")
      return <svg viewBox="0 0 10 10" className="h-[7px] w-[7px]"><path d="M1 5h2M7 5h2M5 1v8" stroke={c} strokeWidth="1.2" fill="none"/><circle cx="5" cy="5" r="1.6" fill="none" stroke={c} strokeWidth="1.1"/></svg>;
    if (cell.kind === "JUNCTION")
      return <svg viewBox="0 0 10 10" className="h-[7px] w-[7px]"><path d="M5 1v8M1 5h8M2.5 2.5l5 5M7.5 2.5l-5 5" stroke={c} strokeWidth="1" fill="none"/></svg>;
    if (cell.kind === "BUFFER")
      return <svg viewBox="0 0 10 10" className="h-[7px] w-[7px]"><rect x="1.5" y="2.5" width="7" height="5" fill="none" stroke={c} strokeWidth="1.1"/><path d="M3.5 4.5h3M3.5 6h2" stroke={c} strokeWidth="0.9"/></svg>;
    if (cell.kind === "GATEWAY")
      return <svg viewBox="0 0 10 10" className="h-[7px] w-[7px]"><path d="M2 8V3.5L5 1.5l3 2V8" fill="none" stroke={c} strokeWidth="1.1"/><path d="M4 8V5.5h2V8" fill="none" stroke={c} strokeWidth="1"/></svg>;
    if (cell.kind === "CIPHER")
      return <svg viewBox="0 0 10 10" className="h-[7px] w-[7px]"><rect x="2" y="4.5" width="6" height="4" fill="none" stroke={c} strokeWidth="1.1"/><path d="M3.5 4.5V3a1.5 1.5 0 013 0v1.5" fill="none" stroke={c} strokeWidth="1"/></svg>;
    return null;
  };

  return (
    <button
      disabled={state !== "ready"}
      onClick={onPick}
      title={terminal ? undefined : t("bg.solve", { expr: cell.expr, n: cell.cost })}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 outline-none transition-transform",
        state === "ready" ? "cursor-pointer hover:scale-110" : "cursor-default"
      )}
      style={{ left: `${(x / boardW) * 100}%`, top: `${(y / BOARD_H) * 100}%` }}
    >
      <span
        className={cn(
          "relative flex items-stretch transition-colors",
          state === "ready" && "animate-softpulse",
          state === "current" && "shadow-[0_0_16px_rgba(143,181,109,0.45)]"
        )}
        style={{
          width: w, height: h,
          border: `${state === "current" || state === "ready" ? 2 : 1}px solid ${color}`,
          background:
            state === "done" || state === "current"
              ? "linear-gradient(180deg, rgba(143,181,109,0.2), rgba(143,181,109,0.07))"
              : state === "loading"
                ? "linear-gradient(180deg, rgba(207,160,75,0.2), rgba(207,160,75,0.06))"
                : state === "ready"
                  ? "linear-gradient(180deg, rgba(127,149,168,0.18), rgba(127,149,168,0.05))"
                  : "linear-gradient(180deg, rgba(18,22,14,0.95), rgba(10,12,8,0.95))",
          clipPath: terminal
            ? "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)"
            : "polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)",
        }}
      >
        {/* left pin rail */}
        <span className="flex shrink-0 flex-col justify-center gap-[2px] px-[2px]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-[1px] w-[4px]" style={{ background: lit ? color : "#2f3726", opacity: 0.8 }} />
          ))}
        </span>

        {/* core */}
        <span className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none">
          {terminal ? (
            <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: lit ? color : "#59604f" }}>
              {isEntry ? t("bg.entry") : t("bg.access")}
            </span>
          ) : (
            <>
              <span className="flex items-center gap-[3px]">
                <Glyph />
                <span className="text-[11px] font-bold tracking-[0.04em]" style={{ color: lit ? color : "#59604f" }}>
                  {cell.expr}
                </span>
              </span>
              <span
                className="mt-[1px] text-[9.5px] uppercase tracking-[0.08em]"
                style={{ color: state === "done" || state === "current" ? "#8fb56d" : "#4c5545" }}
              >
                {state === "done" || state === "current" ? t("bg.cost", { n: cell.cost }) : t(`bg.kind.${cell.kind}`)}
              </span>
            </>
          )}
        </span>

        {/* right pin rail + status lamp */}
        <span className="flex shrink-0 flex-col items-center justify-between py-[2px] pr-[2px]" aria-hidden>
          <span
            className={cn("block h-[3px] w-[3px]", state === "loading" && "animate-softpulse")}
            style={{ background: lit ? color : "#2f3726", boxShadow: lit ? `0 0 4px ${color}` : "none" }}
          />
          <span className="flex flex-col gap-[2px]">
            {[0, 1].map((i) => (
              <span key={i} className="block h-[1px] w-[4px]" style={{ background: lit ? color : "#2f3726", opacity: 0.7 }} />
            ))}
          </span>
        </span>

        {state === "loading" && (
          <span
            className="absolute bottom-0 left-0 h-[3px] bg-amber transition-[width] duration-100"
            style={{ width: `${pct}%` }}
          />
        )}
        {state === "current" && (
          <span className="absolute -right-[4px] -top-[4px] h-[6px] w-[6px] animate-softpulse bg-phosbrite" />
        )}
      </span>

    </button>
  );
}

/* ------------------------------------------------------------------ */

export default function BreachGame({
  nodeCode, warden, tier, onWin, onLose, onAbort, onLog,
}: {
  nodeCode: string; warden: number; tier: BreachTier;
  onWin: () => void;
  onLose: (reason: "timeout" | "abort") => void;
  onAbort: () => void;
  onLog: (key: string, params?: Record<string, string | number>) => void;
}) {
  const { t, lang } = useT();
  const { g } = useGame();
  const map = useMemo<BreachMap>(() => generateBreach(tier), [tier]);
  const boardW = boardWidth(map.cols);

  const [phase, setPhase] = useState<Phase>("DIAL");
  const [dialStep, setDialStep] = useState(0);
  const [dialPct, setDialPct] = useState(0);

  const [current, setCurrent] = useState(map.entry);
  const [done, setDone] = useState<string[]>([map.entry]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [hopPct, setHopPct] = useState(0);
  const [depth, setDepth] = useState(0);

  const [timerOn, setTimerOn] = useState(false);
  const [left, setLeft] = useState(tier.timerSec);
  const [frozen, setFrozen] = useState(0);
  const [cool, setCool] = useState<Record<string, number>>({});

  const timers = useRef<number[]>([]);
  const settled = useRef(false);
  const hopTimer = useRef<{ to: number; iv: number } | null>(null);
  const add = (h: number) => timers.current.push(h);
  const clearAll = () => {
    timers.current.forEach((h) => { clearTimeout(h); clearInterval(h); });
    timers.current = [];
  };
  useEffect(() => clearAll, []);

  const owned = SCRIPTS.filter((s) => g.market.scripts.includes(s.id));

  /* ---------------- dial-up ---------------- */
  useEffect(() => {
    DIAL_KEYS.forEach((_, i) =>
      add(window.setTimeout(() => setDialStep(i + 1), 200 + i * (tier.dialMs / DIAL_KEYS.length)))
    );
    const iv = window.setInterval(
      () => setDialPct((p) => Math.min(100, p + 100 / (tier.dialMs / 90))), 90
    );
    add(iv);
    add(window.setTimeout(() => {
      clearInterval(iv);
      setDialPct(100);
      setPhase("RUN");
    }, tier.dialMs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- WARDEN wakes on a timer of its own ---------------- */
  useEffect(() => {
    if (phase !== "RUN" || timerOn) return;
    const h = window.setTimeout(() => setTimerOn(true), tier.alarmMs);
    add(h);
    return () => clearTimeout(h);
  }, [phase, timerOn, tier.alarmMs]);

  /* ---------------- countdown ---------------- */
  useEffect(() => {
    if (!timerOn || phase !== "RUN") return;
    const iv = window.setInterval(() => {
      setFrozen((f) => {
        if (f > 0) return f - 1;
        setLeft((v) => Math.max(0, v - 1));
        return 0;
      });
      setCool((c) => {
        const n: Record<string, number> = {};
        Object.entries(c).forEach(([k, v]) => { if (v > 1) n[k] = v - 1; });
        return n;
      });
    }, 1000);
    add(iv);
    return () => clearInterval(iv);
  }, [timerOn, phase]);

  /* cooldowns also tick before the alarm */
  useEffect(() => {
    if (phase !== "RUN" || timerOn) return;
    const iv = window.setInterval(() => {
      setCool((c) => {
        const n: Record<string, number> = {};
        Object.entries(c).forEach(([k, v]) => { if (v > 1) n[k] = v - 1; });
        return n;
      });
    }, 1000);
    add(iv);
    return () => clearInterval(iv);
  }, [phase, timerOn]);

  useEffect(() => {
    if (phase !== "RUN" || !timerOn || left > 0 || settled.current) return;
    settled.current = true;
    setPhase("LOSE");
  }, [left, timerOn, phase]);

  useEffect(() => {
    if (phase === "WIN") add(window.setTimeout(onWin, 1400));
    if (phase === "LOSE") add(window.setTimeout(() => onLose("timeout"), 1700));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---------------- hop ---------------- */
  const land = useCallback(
    (id: string) => {
      setLoadingId(null);
      setHopPct(0);
      hopTimer.current = null;
      setCurrent(id);
      setDone((d) => (d.includes(id) ? d : [...d, id]));
      setDepth((v) => v + 1);
      setTimerOn(true); // first solved cell always wakes WARDEN
      if (id === map.access && !settled.current) {
        settled.current = true;
        setPhase("WIN");
      }
    },
    [map.access]
  );

  const step = useCallback(
    (id: string) => {
      if (phase !== "RUN" || loadingId || settled.current) return;
      const cell = map.cells.find((c) => c.id === id);
      if (!cell) return;
      const ms = Math.max(300, cell.cost * 1000);
      setLoadingId(id);
      setHopPct(0);
      const iv = window.setInterval(
        () => setHopPct((p) => Math.min(100, p + 100 / (ms / 80))), 80
      );
      add(iv);
      const to = window.setTimeout(() => { clearInterval(iv); land(id); }, ms);
      add(to);
      hopTimer.current = { to, iv };
    },
    [phase, loadingId, map.cells, land]
  );

  /* ---------------- scripts ---------------- */
  const fire = (id: string) => {
    if (phase !== "RUN" || cool[id]) return;
    const sc = scriptById(id);
    if (!sc) return;

    if (sc.id === "sc_freeze") {
      if (!timerOn) return;
      setFrozen(sc.freeze ?? 5);
    } else if (sc.id === "sc_spike") {
      if (!loadingId || !hopTimer.current) return;
      clearTimeout(hopTimer.current.to);
      clearInterval(hopTimer.current.iv);
      setHopPct(100);
      land(loadingId);
    }
    setCool((c) => ({ ...c, [id]: sc.cooldown }));
    onLog("t.scriptUse", { name: lang === "ru" ? sc.nameRu : sc.name });
  };

  const abort = () => {
    if (settled.current) return;
    settled.current = true;
    clearAll();
    onAbort();
  };

  const reachable = useMemo(
    () => (phase === "RUN" && !loadingId ? neighboursOf(map, current).filter((n) => !done.includes(n)) : []),
    [phase, loadingId, map, current, done]
  );

  const stateOf = (id: string): CellState => {
    if (loadingId === id) return "loading";
    if (id === current) return "current";
    if (done.includes(id)) return "done";
    if (reachable.includes(id)) return "ready";
    return "idle";
  };

  const danger = timerOn && left <= 10;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-ink/88 p-3 backdrop-blur-[2px]">
      <div
        className="anim-msgin flex max-h-[94vh] w-full flex-col border border-line3 bg-panel shadow-[0_0_80px_rgba(0,0,0,0.75)]"
        style={{ maxWidth: Math.min(boardW + 40, 1120) }}
      >
        {/* title bar */}
        <div className="flex h-[32px] shrink-0 items-center gap-2 border-b border-line2 bg-header px-2.5">
          <StatusDot color={phase === "LOSE" ? "#c25b46" : phase === "WIN" ? "#8fb56d" : "#cfa04b"} pulse />
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-dim">
            {t("bg.title")} :: {nodeCode}
          </span>
          <span className="mx-1 hidden h-px flex-1 bg-line sm:block" />
          <span className="ml-auto shrink-0 text-[10px] tracking-[0.14em] text-amberdim">WARDEN T{warden}</span>
          <button
            onClick={abort}
            className="flex shrink-0 items-center gap-1 border border-line3 px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-[0.12em] text-dim transition-colors hover:border-oxide hover:bg-oxide hover:text-ink"
          >
            <Unplug size={9} /> {t("bg.abort")}
          </button>
        </div>

        {/* dial-up */}
        {phase === "DIAL" && (
          <div className="px-4 py-5 sm:px-6">
            <div className="min-h-[116px]">
              {DIAL_KEYS.slice(0, dialStep).map((k, i) => (
                <div key={k} className="anim-msgin text-[12.5px] leading-[1.75] text-dim">
                  <span className="text-phosdim">&gt; </span>
                  {t(k, { code: nodeCode, w: warden })}
                  {i === dialStep - 1 && (
                    <span className="ml-1 inline-block h-[9px] w-[5px] translate-y-[1px] animate-blink bg-phosdim" />
                  )}
                </div>
              ))}
            </div>
            <div className="blocksbar mt-2 text-[19px] text-phos">
              {blockBar(dialPct, 30)} <span className="text-[14px] text-dim">{Math.floor(dialPct)}%</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-faint">{t("bg.dialHint")}</div>
          </div>
        )}

        {(phase === "RUN" || phase === "WIN" || phase === "LOSE") && (
          <>
            {/* warden strip */}
            <div
              className={cn(
                "flex h-[34px] shrink-0 items-center gap-2 border-b px-2.5 transition-colors",
                timerOn ? "border-oxide/50 bg-oxide/10" : "border-line bg-soot"
              )}
            >
              {timerOn ? (
                <>
                  <Siren size={12} className={cn("text-oxide", danger && "animate-softpulse")} />
                  <span className="hidden text-[11px] font-bold uppercase tracking-[0.2em] text-oxide sm:inline">
                    WARDEN
                  </span>
                  <span
                    className={cn(
                      "pixel text-[24px] leading-none tabular-nums",
                      frozen > 0 ? "text-steel"
                      : danger ? "animate-softpulse text-[#ff5f45]" : "text-[#e0634a]"
                    )}
                    style={{ textShadow: "0 0 10px rgba(194,91,70,0.5)" }}
                  >
                    {Math.floor(left / 60)}:{pad(left % 60, 2)}
                  </span>
                  {frozen > 0 && (
                    <span className="flex items-center gap-1 border border-steel/60 bg-steel/15 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-steel">
                      <Snowflake size={9} /> {t("bg.frozen")} {frozen}s
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Siren size={11} className="text-faint" />
                  <span className="truncate text-[10.5px] uppercase tracking-[0.16em] text-faint">
                    {t("bg.alarmSoon")}
                  </span>
                </>
              )}
              <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] text-faint">
                {t("bg.depth", { a: depth, b: map.tier.hops })}
              </span>
            </div>

            {/* board */}
            <div className="min-h-0 flex-1 overflow-auto bg-well px-2 py-2">
              <div
                className="relative mx-auto"
                style={{ width: "100%", maxWidth: boardW, aspectRatio: `${boardW} / ${BOARD_H}`, minWidth: 320 }}
              >
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox={`0 0 ${boardW} ${BOARD_H}`}
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <pattern id="bgDots" width="16" height="16" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="0.6" fill="#1e2417" />
                    </pattern>
                  </defs>
                  <rect x={0} y={0} width={boardW} height={BOARD_H} fill="url(#bgDots)" />
                  {Array.from({ length: Math.floor(boardW / 80) }, (_, i) => (
                    <line key={`v${i}`} x1={(i + 1) * 80} y1={0} x2={(i + 1) * 80} y2={BOARD_H}
                      stroke="#161a11" strokeWidth={0.6} />
                  ))}
                  {Array.from({ length: 4 }, (_, i) => (
                    <line key={`h${i}`} x1={0} y1={(i + 1) * 76} x2={boardW} y2={(i + 1) * 76}
                      stroke="#161a11" strokeWidth={0.6} />
                  ))}
                  {map.links.map((l, i) => {
                    const A = map.cells.find((c) => c.id === l.a)!;
                    const B = map.cells.find((c) => c.id === l.b)!;
                    const p1 = cellPos(A, map.cols, boardW);
                    const p2 = cellPos(B, map.cols, boardW);
                    const live = done.includes(l.a) && done.includes(l.b);
                    const arming = l.a === current && loadingId === l.b;
                    const open = l.a === current && reachable.includes(l.b);
                    const col = live ? "#8fb56d" : arming ? "#cfa04b" : open ? "#7f95a8" : "#2b3322";
                    const x1 = p1.x + 32, x2 = p2.x - 32;
                    const mid = (x1 + x2) / 2;
                    const bend = 7;
                    const dir = Math.sign(p2.y - p1.y);
                    /* right-angle trace with chamfered corners, like a real board */
                    const d =
                      Math.abs(p2.y - p1.y) < 2
                        ? `M${x1} ${p1.y} L${x2} ${p2.y}`
                        : `M${x1} ${p1.y} L${mid - bend} ${p1.y} L${mid} ${p1.y + bend * dir}` +
                          ` L${mid} ${p2.y - bend * dir} L${mid + bend} ${p2.y} L${x2} ${p2.y}`;
                    return (
                      <g key={i} opacity={live || arming || open ? 1 : 0.5}>
                        {(live || arming) && (
                          <path d={d} fill="none" stroke={col} strokeWidth={4} opacity={0.14} strokeLinejoin="round" />
                        )}
                        <path
                          d={d}
                          fill="none"
                          stroke={col}
                          strokeWidth={live || arming ? 1.7 : 1.1}
                          strokeLinejoin="round"
                          strokeDasharray={arming ? "6 4" : open ? "5 4" : "none"}
                          className={cn(arming && "anim-dashflow")}
                        />
                        {/* via pads at both ends */}
                        <circle cx={x1} cy={p1.y} r={1.9} fill="#0c0f09" stroke={col} strokeWidth={0.9} />
                        <circle cx={x2} cy={p2.y} r={1.9} fill="#0c0f09" stroke={col} strokeWidth={0.9} />
                      </g>
                    );
                  })}
                </svg>

                {map.cells.map((c) => (
                  <Cell
                    key={c.id}
                    cell={c}
                    cols={map.cols}
                    boardW={boardW}
                    state={stateOf(c.id)}
                    pct={loadingId === c.id ? hopPct : 0}
                    onPick={() => step(c.id)}
                  />
                ))}

                {(phase === "WIN" || phase === "LOSE") && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/80">
                    <div
                      className="anim-msgin border px-5 py-3 text-center"
                      style={{
                        borderColor: phase === "WIN" ? "#8fb56d" : "#c25b46",
                        background: phase === "WIN" ? "rgba(143,181,109,0.12)" : "rgba(194,91,70,0.12)",
                      }}
                    >
                      <div className="pixel text-[32px] leading-none"
                        style={{ color: phase === "WIN" ? "#b3d98d" : "#e0634a" }}>
                        {phase === "WIN" ? t("bg.granted") : t("bg.lockout")}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-dim">
                        {phase === "WIN" ? t("bg.grantedSub") : t("bg.lockoutSub", { n: tier.failRep })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* script rail + hint */}
            <div className="flex shrink-0 items-center gap-2 border-t border-line bg-soot px-2.5 py-[5px]">
              <span className="hidden truncate text-[10px] uppercase tracking-[0.14em] text-faint md:inline">
                {t("bg.hintHex")}
              </span>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.16em] text-faint">{t("bg.scripts")}:</span>
                {owned.length === 0 && (
                  <span className="text-[10px] uppercase tracking-[0.12em] text-faint/70">{t("bg.noScripts")}</span>
                )}
                {owned.map((sc) => {
                  const cd = cool[sc.id] ?? 0;
                  const usable =
                    phase === "RUN" && !cd &&
                    (sc.id === "sc_freeze" ? timerOn && frozen === 0 : !!loadingId);
                  return (
                    <button
                      key={sc.id}
                      onClick={() => fire(sc.id)}
                      disabled={!usable}
                      title={lang === "ru" ? sc.descRu : sc.desc}
                      className={cn(
                        "flex items-center gap-1 border px-1.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.1em] transition-colors",
                        usable
                          ? "border-viole bg-viole/15 text-viole hover:bg-viole hover:text-ink"
                          : "cursor-not-allowed border-line text-faint"
                      )}
                    >
                      {sc.id === "sc_freeze" ? <Snowflake size={9} /> : <Zap size={9} />}
                      <span className="hidden sm:inline">{lang === "ru" ? sc.nameRu : sc.name}</span>
                      {cd > 0 && <span className="tabular-nums">{t("bg.cooldown", { n: cd })}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
