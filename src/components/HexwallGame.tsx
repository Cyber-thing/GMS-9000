import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, X, RotateCcw } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { sfx } from "../lib/sfx";
import { StatusDot } from "./chrome";
import WardenClock from "./WardenClock";
import {
  HEX_COLORS, generateHexwall, hexPath, hexPixel, isCleared, isStuck,
  legalCells, playStack, unkey, handLeft,
  type Annihilation, type Field, type HexBoard, type HexTier,
} from "../game/hexwall";

const SIZE = 21;          // 六边形外接圆半径
const LIFT = 5;           // 堆叠时每层的抬高量

/** 单枚六边形瓦片。 */
function Tile({
  cx, cy, color, dim, top, dying, toward,
}: {
  cx: number; cy: number; color: string; dim?: boolean; top?: boolean;
  /** 正在湮灭：朝着对方滑过去并炸开 */
  dying?: boolean;
  toward?: { x: number; y: number };
}) {
  const shift = dying && toward ? { dx: (toward.x - cx) * 0.42, dy: (toward.y - cy) * 0.42 } : null;
  return (
    <g
      className={dying ? "anim-hexkill" : undefined}
      style={shift ? ({ ["--kx" as string]: `${shift.dx}px`, ["--ky" as string]: `${shift.dy}px` }) : undefined}
    >
      <path
        d={hexPath(cx, cy, SIZE)}
        fill={`color-mix(in srgb, ${color} ${top ? 34 : 22}%, #06080c)`}
        stroke={color}
        strokeWidth={top ? 1.6 : 1}
        opacity={dim ? 0.5 : 1}
      />
      {/* 顶面高光，让堆看起来有体积 */}
      {top && (
        <>
          <path d={hexPath(cx, cy, SIZE * 0.62)} fill="none" stroke={color} strokeWidth={0.9} opacity={0.65} />
          <circle cx={cx} cy={cy} r={2.4} fill={color} opacity={0.95} />
        </>
      )}
    </g>
  );
}

/** 一摞瓦片。 */
function Stack({
  cx, cy, stack, dim, killTop, toward,
}: {
  cx: number; cy: number; stack: number[]; dim?: boolean;
  /** 顶片正在和邻居同归于尽 */
  killTop?: boolean;
  toward?: { x: number; y: number };
}) {
  return (
    <>
      {stack.map((c, i) => {
        const top = i === stack.length - 1;
        return (
          <Tile
            key={i}
            cx={cx}
            cy={cy - i * LIFT}
            color={HEX_COLORS[c % HEX_COLORS.length]}
            top={top}
            dim={dim}
            dying={top && killTop}
            toward={toward}
          />
        );
      })}
    </>
  );
}

export default function HexwallGame({
  nodeCode, warden, tier, onWin, onLose, onAbort, onLog,
}: {
  nodeCode: string;
  warden: number;
  tier: HexTier;
  onWin: () => void;
  onLose: () => void;
  onAbort: () => void;
  onLog?: (key: string, params?: Record<string, string | number>) => void;
}) {
  const { t } = useT();
  const [board, setBoard] = useState<HexBoard>(() => generateHexwall(tier));
  const [picked, setPicked] = useState<number | null>(null);
  /* 动画播放：把连锁拆成一步步放，而不是瞬间消失 */
  const [anim, setAnim] = useState<{ field: Field; step: Annihilation | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState(false);
  const [ejected, setEjected] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* 播放期间显示动画快照，其余时候显示真实场地 */
  const shown = anim ? anim.field : board.field;
  const active = anim?.step ?? null;
  const cleared = isCleared(board);
  const stuck = !cleared && isStuck(board);
  const spots = useMemo(
    () => (picked === null || busy ? [] : legalCells(board)),
    [board, picked, busy]
  );

  /* 第一手自动选中，少点一次 */
  useEffect(() => {
    if (picked === null && !cleared && !stuck) {
      const i = board.hand.findIndex(Boolean);
      if (i >= 0) setPicked(i);
    }
  }, [board, picked, cleared, stuck]);

  useEffect(() => {
    if (!cleared || won) return;
    setWon(true);
    sfx("hackOk");
    onLog?.("hx.logDown", { code: nodeCode });
    timers.current.push(window.setTimeout(onWin, 1150));
  }, [cleared, won, onWin, onLog, nodeCode]);

  const put = useCallback((cell: string) => {
    if (picked === null || won || ejected || busy) return;
    const res = playStack(board, cell, picked);
    if (!res) return;

    const { board: next, placed, steps } = res;
    onLog?.("hx.logPlace", { n: handLeft(next) });

    /* 没有连锁：直接落子 */
    if (!steps.length) {
      sfx("tick");
      setBoard(next);
      setPicked(next.hand.findIndex(Boolean) >= 0 ? next.hand.findIndex(Boolean) : null);
      return;
    }

    /* 有连锁：先显示刚放下的那一摞，然后逐对湮灭 */
    setBusy(true);
    setAnim({ field: placed, step: null });

    /* 连锁越长，节奏越快，避免长链拖沓 */
    const STEP = steps.length > 5 ? 190 : steps.length > 3 ? 240 : 300;
    steps.forEach((st, i) => {
      /* 高亮这一对 */
      timers.current.push(window.setTimeout(() => {
        setAnim({ field: i === 0 ? placed : steps[i - 1].after, step: st });
        sfx("place");
      }, 160 + i * STEP));
      /* 对消后的快照 */
      timers.current.push(window.setTimeout(() => {
        setAnim({ field: st.after, step: null });
      }, 160 + i * STEP + STEP - 40));
    });

    timers.current.push(window.setTimeout(() => {
      setAnim(null);
      setBusy(false);
      setBoard(next);
      setPicked(next.hand.findIndex(Boolean) >= 0 ? next.hand.findIndex(Boolean) : null);
    }, 160 + steps.length * STEP + 60));
  }, [board, picked, won, ejected, busy, onLog]);

  const retry = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setAnim(null);
    setBusy(false);
    setBoard(generateHexwall(tier));
    setPicked(null);
  };

  /* 画布范围按实际格子算 */
  const view = useMemo(() => {
    const pts = board.cells.map((k) => {
      const [q, r] = unkey(k);
      return hexPixel(q, r, SIZE);
    });
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const pad = SIZE * 1.5 + LIFT * 3;
    const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [board.cells]);

  const remaining = Object.values(board.field).reduce((a, s) => a + s.length, 0);

  return (
    <div data-zone="Game" className="fixed inset-0 z-[115] flex items-center justify-center bg-ink/85 p-3">
      <div className="anim-msgin flex max-h-[94vh] w-[min(640px,97%)] flex-col border border-line3 bg-panel shadow-[0_0_80px_rgba(0,0,0,0.75)]">
        {/* 标题栏 */}
        <div className="flex shrink-0 items-center gap-2 border-b border-line2 bg-header px-2.5 py-[6px]">
          <ShieldAlert size={12} className="text-[#6db3d2]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a5d9ec]">
            {t("hx.title")}
          </span>
          <span className="truncate text-[8px] uppercase tracking-[0.16em] text-faint">
            {t("hx.sub")} · {nodeCode}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <StatusDot color="#6db3d2" pulse={!won} />
            <span className="text-[8px] uppercase tracking-[0.14em] text-dim">W{warden}</span>
          </span>
          <button onClick={onAbort} className="shrink-0 text-dim transition-colors hover:text-oxide" title={t("bg.abort")}>
            <X size={13} />
          </button>
        </div>

        {/* 状态条 */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-soot px-2.5 py-[5px] text-[8.5px] uppercase tracking-[0.14em]">
          <span className="text-faint">
            {t("hx.blocks")}: <span className="text-[#a5d9ec]">{remaining}</span>
          </span>
          <span className="text-faint">
            {t("hx.hand")}: <span className="text-phosbrite">{handLeft(board)}</span>
          </span>
          {tier.timerSec > 0 && !won && (
            <span className="ml-auto">
              <WardenClock seconds={tier.timerSec} warden={warden} running={!won && !ejected} onExpire={() => { setEjected(true); timers.current.push(window.setTimeout(onLose, 1200)); }} />
            </span>
          )}
          <button
            onClick={retry}
            title={t("hx.retry")}
            className="ml-auto flex items-center gap-1 border border-line2 px-1.5 py-[2px] text-[8px] font-bold tracking-[0.12em] text-dim transition-colors hover:border-phosdim hover:text-phos"
          >
            <RotateCcw size={9} /> {t("hx.retry")}
          </button>
        </div>

        {/* 棋盘 */}
        <div className="relative min-h-0 flex-1 overflow-auto bg-well px-2 py-2">
          <svg
            viewBox={`${view.minX} ${view.minY} ${view.w} ${view.h}`}
            className="mx-auto block h-auto w-full max-w-[520px]"
            style={{ maxHeight: "46vh" }}
          >
            {/* 空格：晶格底板 */}
            {board.cells.map((k) => {
              const [q, r] = unkey(k);
              const { x, y } = hexPixel(q, r, SIZE);
              const open = spots.includes(k);
              const taken = !!board.field[k];
              return (
                <g key={`c${k}`}>
                  <path
                    d={hexPath(x, y, SIZE)}
                    fill={open ? "rgb(var(--phosrgb) / 0.10)" : "rgba(10,12,16,0.75)"}
                    stroke={open ? "var(--color-phos)" : "var(--color-line2)"}
                    strokeWidth={open ? 1.4 : 0.8}
                    strokeDasharray={open ? undefined : "3 3"}
                    className={cn(open && "cursor-pointer")}
                    onClick={() => open && put(k)}
                  />
                  {open && !taken && (
                    <text
                      x={x} y={y + 3.5}
                      textAnchor="middle"
                      className="pointer-events-none"
                      fill="var(--color-phos)"
                      fontSize="11"
                      opacity={0.8}
                    >+</text>
                  )}
                </g>
              );
            })}

            {/* 湮灭射线：两格之间的放电 */}
            {active && (() => {
              const [aq, ar] = unkey(active.a);
              const [bq, br] = unkey(active.b);
              const pa = hexPixel(aq, ar, SIZE);
              const pb = hexPixel(bq, br, SIZE);
              const col = HEX_COLORS[active.color % HEX_COLORS.length];
              const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
              return (
                <g style={{ pointerEvents: "none" }}>
                  <line
                    x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                    stroke={col} strokeWidth={3} strokeLinecap="round"
                    className="anim-hexarc"
                  />
                  <circle cx={mx} cy={my} r={SIZE * 0.42} fill="none" stroke={col} strokeWidth={2} className="anim-hexring" />
                  <circle cx={mx} cy={my} r={3} fill={col} className="anim-hexspark" />
                </g>
              );
            })()}

            {/* 墙上的堆：不拦截点击，免得挡住上一格的落点 */}
            <g style={{ pointerEvents: "none" }}>
              {Object.entries(shown).map(([k, stack]) => {
                const [q, r] = unkey(k);
                const { x, y } = hexPixel(q, r, SIZE);
                /* 这一帧里正在对消的两格：顶片朝对方飞过去 */
                let killTop = false;
                let toward: { x: number; y: number } | undefined;
                if (active && (active.a === k || active.b === k)) {
                  killTop = true;
                  const [oq, or_] = unkey(active.a === k ? active.b : active.a);
                  toward = hexPixel(oq, or_, SIZE);
                }
                return (
                  <Stack key={`s${k}`} cx={x} cy={y} stack={stack} killTop={killTop} toward={toward} />
                );
              })}
            </g>
          </svg>

          {/* 结算遮罩 */}
          {won && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/80">
              <div className="anim-msgin border border-phosdim bg-phos/10 px-5 py-3 text-center">
                <div className="pixel text-[26px] leading-none text-phosbrite">{t("hx.down")}</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-phos">{t("hx.downSub")}</div>
              </div>
            </div>
          )}
          {ejected && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/80">
              <div className="anim-msgin border border-oxide bg-oxide/12 px-5 py-3 text-center">
                <div className="pixel text-[26px] leading-none text-[#e0634a]">{t("wc.ejected")}</div>
              </div>
            </div>
          )}
          {stuck && !won && !ejected && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/80">
              <div className="anim-msgin border border-amberdim bg-amber/10 px-5 py-3 text-center">
                <div className="pixel text-[24px] leading-none text-amber">{t("hx.holds")}</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-amberdim">{t("hx.holdsSub")}</div>
                <button
                  onClick={retry}
                  className="mt-2 border border-amberdim bg-amber/15 px-3 py-[5px] text-[9px] font-bold uppercase tracking-[0.14em] text-amber transition-colors hover:bg-amber hover:text-ink"
                >
                  {t("hx.retry")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 手牌 */}
        <div className="shrink-0 border-t border-line2 bg-panel2 px-2.5 py-2">
          <div className="mb-1 text-[8px] uppercase tracking-[0.18em] text-faint">{t("hx.tray")}</div>
          <div className="flex flex-wrap items-end gap-1.5">
            {board.hand.map((stack, i) =>
              !stack ? null : (
                <button
                  key={i}
                  onClick={() => setPicked(i)}
                  disabled={won || ejected}
                  className={cn(
                    "border px-1 pb-1 pt-[2px] transition-all",
                    picked === i
                      ? "border-phos bg-phos/15 shadow-[0_0_12px_rgb(var(--phosrgb)/0.3)]"
                      : "border-line2 hover:border-line3 hover:bg-panel"
                  )}
                >
                  <svg width={SIZE * 2.1} height={SIZE * 2 + stack.length * LIFT} viewBox={`${-SIZE * 1.05} ${-SIZE - stack.length * LIFT} ${SIZE * 2.1} ${SIZE * 2 + stack.length * LIFT}`}>
                    <Stack cx={0} cy={0} stack={stack} />
                  </svg>
                </button>
              )
            )}
          </div>
          <p className="mt-1.5 text-[8.5px] uppercase leading-snug tracking-[0.1em] text-faint">
            {t("hx.hint")}
          </p>
        </div>
      </div>
    </div>
  );
}
