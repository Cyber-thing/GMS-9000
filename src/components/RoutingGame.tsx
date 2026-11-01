import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCw, Unplug } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { StatusDot } from "./chrome";
import {
  generateRouting, liveSides, signalPath, traceCircuit,
  type Cell, type RoutingBoard, type RoutingTier, type Side,
} from "../game/routing";

const TILE = 64;
const GAP = 6;

/* ------------------------------------------------------------------ */

function Segment({
  cell, lit, flowing, onRotate, disabled,
}: {
  cell: Cell; lit: boolean; flowing: boolean;
  onRotate: () => void; disabled: boolean;
}) {
  const sides = liveSides(cell);
  const terminal = cell.kind !== "pipe";
  const col = flowing ? "#b3d98d" : lit ? "#8fb56d" : terminal ? "#7f95a8" : "#56624a";
  const c = TILE / 2;

  /* a stub from the centre toward each open side */
  const stub = (s: Side) => {
    const to: Record<Side, [number, number]> = {
      0: [c, 0], 1: [TILE, c], 2: [c, TILE], 3: [0, c],
    };
    const [x, y] = to[s];
    return <line key={s} x1={c} y1={c} x2={x} y2={y} stroke={col} strokeWidth={flowing ? 4 : 3} strokeLinecap="round" />;
  };

  return (
    <button
      onClick={onRotate}
      disabled={disabled || cell.fixed}
      title={cell.fixed ? undefined : "rotate"}
      className={cn(
        "group relative",
        !disabled && !cell.fixed && "cursor-pointer hover:brightness-125",
        (disabled || cell.fixed) && "cursor-default"
      )}
      style={{ width: TILE, height: TILE }}
    >
      {/* chassis */}
      <span
        className="absolute inset-0 border transition-colors"
        style={{
          borderColor: flowing ? "#b3d98d" : lit ? "#5f7a4b" : "#2b3322",
          background: flowing
            ? "rgba(143,181,109,0.14)"
            : lit ? "rgba(143,181,109,0.07)" : "rgba(12,15,9,0.9)",
          boxShadow: flowing ? "0 0 14px rgba(143,181,109,0.35)" : "none",
        }}
      />
      {/* corner notches */}
      {[["left-0 top-0", "border-l border-t"], ["right-0 top-0", "border-r border-t"],
        ["left-0 bottom-0", "border-l border-b"], ["right-0 bottom-0", "border-r border-b"]].map(([pos, b]) => (
        <span key={pos} className={cn("pointer-events-none absolute h-[5px] w-[5px]", pos, b)}
          style={{ borderColor: lit ? "#5f7a4b" : "#39422d" }} />
      ))}

      <svg className="absolute inset-0" width={TILE} height={TILE} aria-hidden>
        {sides.map(stub)}
        {terminal ? (
          <rect x={c - 7} y={c - 7} width={14} height={14} fill={flowing ? "#b3d98d" : col} opacity={0.9} />
        ) : (
          <circle cx={c} cy={c} r={sides.length > 2 ? 5 : 4} fill="#0c0f09" stroke={col} strokeWidth={2} />
        )}
      </svg>

      {!cell.fixed && !disabled && (
        <RotateCw
          size={9}
          className="absolute right-[3px] top-[3px] text-faint opacity-0 transition-opacity group-hover:opacity-100"
        />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export default function RoutingGame({
  nodeCode, tier, onWin, onAbort,
}: {
  nodeCode: string;
  tier: RoutingTier;
  onWin: () => void;
  onAbort: () => void;
}) {
  const { t } = useT();
  const [board, setBoard] = useState<RoutingBoard>(() => generateRouting(tier));
  const [running, setRunning] = useState(false);
  const [front, setFront] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((h) => { clearTimeout(h); clearInterval(h); }), []);

  const { lit, solved } = useMemo(() => traceCircuit(board), [board]);
  const path = useMemo(() => (solved ? signalPath(board) : []), [board, solved]);

  const rotate = useCallback((id: string) => {
    if (running || done) return;
    setBoard((b) => ({
      ...b,
      cells: b.cells.map((c) => (c.id === id && !c.fixed ? { ...c, turns: (c.turns + 1) % 4 } : c)),
    }));
  }, [running, done]);

  const run = () => {
    if (running || done) return;
    setRunning(true);
    setFront(0);
    if (!solved) {
      /* the pulse dies where the circuit breaks */
      timers.current.push(window.setTimeout(() => setRunning(false), 900));
      return;
    }
    let i = 0;
    const iv = window.setInterval(() => {
      i += 1;
      setFront(i);
      if (i >= path.length) {
        clearInterval(iv);
        setDone(true);
        timers.current.push(window.setTimeout(onWin, 1100));
      }
    }, 170);
    timers.current.push(iv);
  };

  const flowing = (id: string) => running && solved && path.slice(0, front).includes(id);
  const w = tier.cols * TILE + (tier.cols - 1) * GAP;
  const h = tier.rows * TILE + (tier.rows - 1) * GAP;

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-ink/88 p-3 backdrop-blur-[2px]">
      <div className="anim-msgin flex max-h-[94vh] w-[min(560px,97%)] flex-col border border-line3 bg-panel shadow-[0_0_80px_rgba(0,0,0,0.75)]">
        {/* title */}
        <div className="flex h-[32px] shrink-0 items-center gap-2 border-b border-line2 bg-header px-2.5">
          <StatusDot color={done ? "#8fb56d" : "#7f95a8"} pulse={!done} />
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-dim">
            {t("rt.title")} :: {nodeCode}
          </span>
          <button
            onClick={onAbort}
            className="ml-auto flex shrink-0 items-center gap-1 border border-line3 px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-[0.12em] text-dim transition-colors hover:border-oxide hover:bg-oxide hover:text-ink"
          >
            <Unplug size={9} /> {t("bg.abort")}
          </button>
        </div>

        {/* hint strip */}
        <div className="flex h-[28px] shrink-0 items-center gap-2 border-b border-line bg-soot px-2.5 text-[10px] uppercase tracking-[0.14em]">
          <span className="truncate text-faint">{t("rt.hint")}</span>
          <span className="ml-auto shrink-0" style={{ color: solved ? "#8fb56d" : "#77806b" }}>
            {solved ? t("rt.ready") : t("rt.broken")}
          </span>
        </div>

        {/* board */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-well p-3">
          <div
            className="relative"
            style={{
              width: w, height: h,
              display: "grid",
              gridTemplateColumns: `repeat(${tier.cols}, ${TILE}px)`,
              gridTemplateRows: `repeat(${tier.rows}, ${TILE}px)`,
              gap: GAP,
            }}
          >
            {/* empty sockets */}
            {Array.from({ length: tier.cols * tier.rows }, (_, i) => (
              <span
                key={`s${i}`}
                className="border border-dashed"
                style={{
                  gridColumn: (i % tier.cols) + 1,
                  gridRow: Math.floor(i / tier.cols) + 1,
                  borderColor: "#1b2115",
                }}
              />
            ))}
            {board.cells.map((c) => (
              <span key={c.id} style={{ gridColumn: c.col + 1, gridRow: c.row + 1 }}>
                <Segment
                  cell={c}
                  lit={lit.has(c.id)}
                  flowing={flowing(c.id)}
                  disabled={running || done}
                  onRotate={() => rotate(c.id)}
                />
              </span>
            ))}

            {done && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/75">
                <div className="anim-msgin border border-phosdim bg-phos/12 px-5 py-3 text-center">
                  <div className="pixel text-[30px] leading-none text-phosbrite">{t("rt.linked")}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-dim">{t("rt.linkedSub")}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* run bar */}
        <div className="flex shrink-0 items-center gap-2 border-t border-line bg-soot px-2.5 py-[6px]">
          <span className="text-[10px] uppercase tracking-[0.14em] text-faint">
            {t("rt.inlet")} → {t("rt.outlet")}
          </span>
          <button
            onClick={run}
            disabled={running || done}
            className={cn(
              "ml-auto flex items-center gap-1.5 border px-4 py-[6px] text-[11.5px] font-bold uppercase tracking-[0.18em] transition-colors",
              running || done
                ? "cursor-not-allowed border-line text-faint"
                : "border-phosdim bg-phos/12 text-phosbrite hover:bg-phos hover:text-ink"
            )}
          >
            <Play size={11} /> {running ? t("rt.running") : t("rt.run")}
          </button>
        </div>
      </div>
    </div>
  );
}
