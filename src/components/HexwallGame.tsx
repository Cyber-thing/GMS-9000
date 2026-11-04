import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldAlert, X, RotateCcw } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { StatusDot } from "./chrome";
import WardenClock from "./WardenClock";
import {
  HEX_COLORS, generateHexwall, hexPath, hexPixel, isCleared, isStuck,
  legalCells, placeStack, unkey, handLeft,
  type HexBoard, type HexTier,
} from "../game/hexwall";

const SIZE = 21;          // 六边形外接圆半径
const LIFT = 5;           // 堆叠时每层的抬高量

/** 单枚六边形瓦片。 */
function Tile({
  cx, cy, color, dim, top, burst,
}: { cx: number; cy: number; color: string; dim?: boolean; top?: boolean; burst?: boolean }) {
  return (
    <g className={burst ? "anim-hexburst" : undefined}>
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
  cx, cy, stack, dim, burst,
}: { cx: number; cy: number; stack: number[]; dim?: boolean; burst?: boolean }) {
  return (
    <>
      {stack.map((c, i) => (
        <Tile
          key={i}
          cx={cx}
          cy={cy - i * LIFT}
          color={HEX_COLORS[c % HEX_COLORS.length]}
          top={i === stack.length - 1}
          dim={dim}
          burst={burst}
        />
      ))}
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
  const [burst, setBurst] = useState<string[]>([]);
  const [won, setWon] = useState(false);
  const [ejected, setEjected] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const cleared = isCleared(board);
  const stuck = !cleared && isStuck(board);
  const spots = useMemo(() => (picked === null ? [] : legalCells(board)), [board, picked]);

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
    onLog?.("hx.logDown", { code: nodeCode });
    timers.current.push(window.setTimeout(onWin, 1150));
  }, [cleared, won, onWin, onLog, nodeCode]);

  const put = useCallback((cell: string) => {
    if (picked === null || won || ejected) return;
    const next = placeStack(board, cell, picked);
    if (!next) return;
    /* 对比前后，找出被打掉的格子做闪光 */
    const gone = Object.keys(board.field).filter((k) => !next.field[k]);
    setBurst([...gone, cell]);
    timers.current.push(window.setTimeout(() => setBurst([]), 420));
    setBoard(next);
    setPicked(next.hand.findIndex(Boolean) >= 0 ? next.hand.findIndex(Boolean) : null);
    onLog?.("hx.logPlace", { n: handLeft(next) });
  }, [board, picked, won, ejected, onLog]);

  const retry = () => {
    setBoard(generateHexwall(tier));
    setPicked(null);
    setBurst([]);
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
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-ink/85 p-3">
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

            {/* 墙上的堆：不拦截点击，免得挡住上一格的落点 */}
            <g style={{ pointerEvents: "none" }}>
              {Object.entries(board.field).map(([k, stack]) => {
                const [q, r] = unkey(k);
                const { x, y } = hexPixel(q, r, SIZE);
                return <Stack key={`s${k}`} cx={x} cy={y} stack={stack} burst={burst.includes(k)} />;
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
