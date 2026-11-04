import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpFromLine, Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "../utils/cn";
import {
  MAP_H,
  MAP_W,
  TYPE_GLYPH,
  type NetLink,
  type NetNode,
  type Sector,
} from "../data/network";
import type { NodeState } from "../game/types";
import { regionGrid } from "../data/world";
import { landShape } from "../data/landshape";
import type { RegionDef } from "../data/world";
import { Brackets, Panel, STATUS_COLOR, StatusDot } from "./chrome";
import { alfa, pad } from "../lib/util";
import { useT } from "../i18n";
import { regionContinent, sectorName } from "../i18n/content";
import { useTut } from "../game/tutorial";
import { useGame } from "../game/state";
import { useMapView, ZOOM } from "../hooks/useMapView";

const CH_COLORS = { phos: "var(--color-phos)", amber: "#cfa04b" };

export function shapeClass(glyph: string) {
  switch (glyph) {
    case "circle": return "rounded-full";
    case "diamond": return "rotate-45";
    case "trapezoid": return "[clip-path:polygon(22%_0,78%_0,100%_100%,0_100%)]";
    case "hex": return "[clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]";
    case "tri": return "[clip-path:polygon(50%_0,100%_100%,0_100%)]";
    case "pent": return "[clip-path:polygon(50%_0,100%_38%,81%_100%,19%_100%,0_38%)]";
    case "oct": return "[clip-path:polygon(30%_0,70%_0,100%_30%,100%_70%,70%_100%,30%_100%,0_70%,0_30%)]";
    case "box": return "";
    default: return "";
  }
}

function NodeMarker({
  node,
  status,
  selected,
  connected,
  connecting,
  dimmed,
  side,
  onSelect,
  burst,
  spot,
  dim,
  burning,
}: {
  node: NetNode;
  status: NodeState;
  selected: boolean;
  connected: boolean;
  connecting: boolean;
  dimmed: boolean;
  burst: boolean;
  spot: boolean;
  dim: boolean;
  burning: boolean;
  /** 标签摆放方向，由上层按邻居密度算好，避免互相压字。 */
  side: "right" | "left" | "top" | "bottom";
  onSelect: () => void;
}) {
  const { t } = useT();
  const color = burning
    ? "#e0634a"
    : connecting
      ? STATUS_COLOR.CONNECTING
      : connected
        ? STATUS_COLOR.CONNECTED
        : STATUS_COLOR[status];

  const glyph = TYPE_GLYPH[node.type];

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={`${node.code} · ${t("node.suffix", { t: t(`type.${node.type}`) })} · ${connected ? t("st.CONNECTED") : t(`st.${status}`)}`}
      className={cn(
        "group absolute z-20 cursor-crosshair outline-none transition-opacity duration-500",
        spot && "tut-ring",
        dim && "tut-dim"
      )}
      style={{
        left: `${(node.x / MAP_W) * 100}%`,
        top: `${(node.y / MAP_H) * 100}%`,
        transform: "translate(-50%,-50%)",
        opacity: dimmed ? 0.32 : 1,
      }}
    >
      <span className="relative block h-[20px] w-[20px]">
        {burst && (
          <span
            className="anim-ringout pointer-events-none absolute inset-0 border"
            style={{ borderColor: STATUS_COLOR.CONNECTED }}
          />
        )}
        {burning && (
          <span
            className="pointer-events-none absolute inset-[-5px] animate-softpulse rounded-full"
            style={{ background: "radial-gradient(circle, rgba(224,99,74,0.45), transparent 70%)" }}
          />
        )}
        {connected && (
          <span
            className="pointer-events-none absolute inset-[-3px] animate-[spin_7s_linear_infinite] border border-dashed"
            style={{ borderColor: alfa(color, 60) }}
          />
        )}
        {selected && <Brackets color={connecting ? CH_COLORS.amber : CH_COLORS.phos} size={7} />}
        <span
          className={cn(
            "absolute left-1/2 top-1/2 block h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 border transition-transform duration-150 group-hover:scale-125",
            shapeClass(glyph),
            connecting && "animate-softpulse",
            status === "RESTRICTED" && !connected && !connecting && "anim-denote"
          )}
          style={{
            borderColor: color,
            borderWidth: glyph === "box" ? 1 : 1.5,
            background:
              status === "LOCKED"
                ? "transparent"
                : alfa(color, connected ? 40 : 18),
            boxShadow: selected || connected ? `0 0 7px ${alfa(color, 35)}` : "none",
          }}
        >
          {glyph === "box" && (
            <span className="absolute inset-[2px]" style={{ background: alfa(color, 35) }} />
          )}
        </span>
      </span>
      <span
        className={cn(
          "pointer-events-none absolute whitespace-nowrap rounded-[1px] bg-ink/80 px-[2px] py-[1px] text-[7px] leading-none tracking-[0.06em] transition-colors",
          "group-hover:z-30 group-hover:bg-ink",
          side === "bottom"
            ? "left-1/2 top-full mt-[4px] -translate-x-1/2"
            : side === "top"
              ? "bottom-full left-1/2 mb-[4px] -translate-x-1/2"
              : side === "left"
                ? "right-full top-1/2 mr-[3px] -translate-y-1/2"
                : "left-full top-1/2 ml-[3px] -translate-y-1/2",
          selected ? "text-phosbrite" : status === "LOCKED" ? "text-faint" : "text-dim group-hover:text-fog"
        )}
      >
        {node.code}
        {status === "LOCKED" && <span className="text-faint"> [L]</span>}
        {status === "RESTRICTED" && <span className="text-amberdim"> [R]</span>}
        {status === "COMPROMISED" && <span className="text-viole"> ◆</span>}
        {connecting && <span className="animate-blink text-amber"> ::SYN</span>}
      </span>
    </button>
  );
}

function SectorHatch({ status }: { status: Sector["status"] }) {
  if (status === "ONLINE") return null;
  const cfg =
    status === "CONTESTED"
      ? "repeating-linear-gradient(45deg, rgba(194,91,70,0.13) 0 1.5px, transparent 1.5px 9px)"
      : status === "RESTRICTED"
        ? "repeating-linear-gradient(-45deg, rgba(207,160,75,0.1) 0 1.5px, transparent 1.5px 10px)"
        : "repeating-linear-gradient(45deg, rgba(143,134,184,0.1) 0 1.5px, transparent 1.5px 8px)";
  return <div className="pointer-events-none absolute inset-0" style={{ background: cfg }} />;
}

export default function NetworkMap({
  region,
  sectors,
  nodes,
  links,
  statuses,
  connected,
  connectingId,
  selectedSector,
  selectedNode,
  onSelectSector,
  onSelectNode,
  onBackToWorld,
}: {
  region: RegionDef;
  sectors: Sector[];
  nodes: NetNode[];
  links: NetLink[];
  statuses: Record<string, NodeState>;
  connected: Set<string>;
  connectingId: string | null;
  selectedSector: string | null;
  selectedNode: string | null;
  onSelectSector: (id: string) => void;
  onSelectNode: (id: string) => void;
  onBackToWorld: () => void;
}) {
  const { t, lang } = useT();
  const { isHl, gating } = useTut();
  const { g } = useGame();
  const { frameRef, view, dragging, onPointerDown, zoomBy, reset, consumedDrag } = useMapView();
  
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 300, h: 190 });
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const scale = Math.max(0.18, Math.min(r.width / MAP_W, r.height / MAP_H) * 0.97);
      setBox({ w: MAP_W * scale, h: MAP_H * scale });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const land = useMemo(
    () => landShape(regionGrid(region.box, 2), MAP_W, MAP_H, 2),
    [region]
  );

  /* ---- 十字准星 + 坐标读数 ---- */
  const stageRef = useRef<HTMLDivElement>(null);
  const hLine = useRef<HTMLDivElement>(null);
  const vLine = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const st = stageRef.current;
    if (!st) return;
    const r = st.getBoundingClientRect();           // 该矩形已经包含缩放效果
    const fx = (e.clientX - r.left) / r.width;      // 在面板范围内归一化为 0 到 1
    const fy = (e.clientY - r.top) / r.height;
    const ux = Math.round(fx * MAP_W);
    const uy = Math.round(fy * MAP_H);
    
    if (hLine.current) hLine.current.style.top = `${fy * st.offsetHeight}px`;
    if (vLine.current) vLine.current.style.left = `${fx * st.offsetWidth}px`;
    if (readout.current)
      readout.current.textContent = `X:${pad(Math.max(0, Math.min(MAP_W, ux)), 4)} Y:${pad(Math.max(0, Math.min(MAP_H, uy)), 4)}`;
  };
  const onLeave = () => {
    if (hLine.current) hLine.current.style.top = `-10px`;
    if (vLine.current) vLine.current.style.left = `-10px`;
    if (readout.current) readout.current.textContent = "X:---- Y:----";
  };

  const [bursts, setBursts] = useState<Record<string, number>>({});
  const prevConn = useRef<Set<string>>(connected);
  useEffect(() => {
    const fresh: string[] = [];
    connected.forEach((id) => {
      if (!prevConn.current.has(id)) fresh.push(id);
    });
    if (fresh.length) {
      setBursts((b) => {
        const n = { ...b };
        fresh.forEach((id) => (n[id] = Date.now()));
        return n;
      });
      const t = setTimeout(
        () =>
          setBursts((b) => {
            const n = { ...b };
            fresh.forEach((id) => delete n[id]);
            return n;
          }),
        1000
      );
      prevConn.current = connected;
      return () => clearTimeout(t);
    }
    prevConn.current = connected;
  }, [connected]);

  const nodeIdx = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const wired = useMemo(
    () =>
      links.map((l) => {
        const a = nodeIdx[l.a];
        const b = nodeIdx[l.b];
        const touchSelected = selectedNode === l.a || selectedNode === l.b;
        const touchConnecting = connectingId === l.a || connectingId === l.b;
        const dead =
          statuses[l.a] === "LOCKED" || statuses[l.b] === "LOCKED" ? "down" : l.state;
        return { ...l, na: a, nb: b, touchSelected, touchConnecting, dead };
      }),
    [links, nodeIdx, selectedNode, connectingId, statuses]
  );

  /* 标签自动选边：朝邻居最少、且不出画布的一侧展开，避免编号互相压字。 */
  const labelSides = useMemo(() => {
    const out: Record<string, "right" | "left" | "top" | "bottom"> = {};
    const DX = 108, DY = 26;      // 一个标签大致占的范围
    nodes.forEach((n) => {
      const score = (dx: number, dy: number) =>
        nodes.reduce((acc, o) => {
          if (o.id === n.id) return acc;
          const tx = n.x + dx, ty = n.y + dy;
          return Math.abs(o.x - tx) < DX && Math.abs(o.y - ty) < DY ? acc + 1 : acc;
        }, 0);
      const cands: { side: "right" | "left" | "top" | "bottom"; pen: number }[] = [
        { side: "right",  pen: score(DX / 2, 0) + (n.x > MAP_W - 150 ? 6 : 0) },
        { side: "left",   pen: score(-DX / 2, 0) + (n.x < 150 ? 6 : 0) + 0.3 },
        { side: "bottom", pen: score(0, DY) + (n.y > MAP_H - 40 ? 6 : 0) + 0.6 },
        { side: "top",    pen: score(0, -DY) + (n.y < 40 ? 6 : 0) + 0.6 },
      ];
      cands.sort((a, b) => a.pen - b.pen);
      out[n.id] = cands[0].side;
    });
    return out;
  }, [nodes]);

  const rulerX = useMemo(() => Array.from({ length: 13 }, (_, i) => i * 100), []);
  const rulerY = useMemo(() => Array.from({ length: 8 }, (_, i) => i * 100), []);

  return (
    <Panel
      title={t("panel.regional")}
      accent="var(--color-phos)"
      className="h-full"
      bodyClassName="relative bg-well"
      right={
        <div className="flex items-center gap-2 text-[8.5px] uppercase tracking-[0.18em]">
          <button
            onClick={onBackToWorld}
            className="flex items-center gap-1 border border-line2 px-1.5 py-[2px] text-[8px] font-bold tracking-[0.14em] text-dim transition-colors hover:border-phosdim hover:text-phos"
            title={t("map.backTip")}
          >
            <ArrowUpFromLine size={9} /> {t("map.back")}
          </button>
          <span className="hidden text-faint sm:inline">
            {region.code} // {regionContinent(lang, region.id, region.continent)}
          </span>
          <span className="flex items-center gap-px">
            <button
              onClick={() => zoomBy(1 / ZOOM.step)}
              disabled={view.scale <= ZOOM.min}
              title={t("map.zoomOut")}
              className={cn(
                "flex h-[15px] w-[15px] items-center justify-center border border-line2 transition-colors",
                view.scale > ZOOM.min ? "text-dim hover:border-phosdim hover:text-phos" : "text-faint/50"
              )}
            >
              <Minus size={9} />
            </button>
            <button
              onClick={() => zoomBy(ZOOM.step)}
              disabled={view.scale >= ZOOM.max}
              title={t("map.zoomIn")}
              className={cn(
                "flex h-[15px] w-[15px] items-center justify-center border border-line2 transition-colors",
                view.scale < ZOOM.max ? "text-dim hover:border-phosdim hover:text-phos" : "text-faint/50"
              )}
            >
              <Plus size={9} />
            </button>
            <button
              onClick={reset}
              disabled={view.scale === 1 && view.x === 0 && view.y === 0}
              title={t("map.zoomReset")}
              className={cn(
                "flex h-[15px] w-[15px] items-center justify-center border border-line2 transition-colors",
                view.scale !== 1 || view.x || view.y ? "text-dim hover:border-phosdim hover:text-phos" : "text-faint/50"
              )}
            >
              <Maximize2 size={8} />
            </button>
            <span className="ml-1 w-[30px] tabular-nums text-[8px] text-dim">
              {view.scale.toFixed(1)}x
            </span>
          </span>
          <span ref={readout} className="hidden w-[104px] tabular-nums text-dim lg:inline">X:---- Y:----</span>
        </div>
      }
    >
      <div
        ref={(el) => {
          hostRef.current = el;
          frameRef.current = el;
        }}
        onPointerDown={onPointerDown}
        className={cn(
          "relative flex h-full w-full touch-none items-center justify-center overflow-hidden p-1.5",
          dragging ? "cursor-grabbing" : view.scale > 1 ? "cursor-grab" : "cursor-default"
        )}
      >
        <div
          ref={stageRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="relative border border-line2 bg-[var(--color-ink)]"
          style={{
            width: box.w,
            height: box.h,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 140ms ease-out",
            cursor: dragging ? "grabbing" : "crosshair",
          }}
        >
          {}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <pattern id="regionGrain" width="12" height="12" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.7" fill="var(--color-line)" opacity="0.4" />
                <circle cx="8" cy="8" r="0.5" fill="var(--color-line)" opacity="0.32" />
              </pattern>
              <clipPath id="regionLand">
                <path d={land.path} fillRule="evenodd" />
              </clipPath>
            </defs>

            {}
            <g opacity={0.5}>
              <path d={land.path} fillRule="evenodd" fill="var(--color-panel2)" />
              <g clipPath="url(#regionLand)">
                <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="url(#regionGrain)" />
              </g>
              <path
                d={land.path}
                fillRule="evenodd"
                fill="none"
                stroke="var(--color-line)"
                strokeWidth={1}
                strokeLinejoin="round"
                opacity={0.7}
              />
            </g>
            {/* 次级网格 */}
            {Array.from({ length: MAP_W / 90 - 1 }, (_, i) => (
              <line key={`gx${i}`} x1={(i + 1) * 90} y1={0} x2={(i + 1) * 90} y2={MAP_H} stroke="var(--color-panel2)" strokeWidth={0.5} opacity={0.65} />
            ))}
            {Array.from({ length: Math.floor(MAP_H / 95) }, (_, i) => (
              <line key={`gy${i}`} x1={0} y1={(i + 1) * 95} x2={MAP_W} y2={(i + 1) * 95} stroke="var(--color-panel2)" strokeWidth={0.5} opacity={0.65} />
            ))}

            {/* 连接线 */}
            {wired.map((l, i) => {
              if (!l.na || !l.nb) return null;
              const active = l.touchSelected || l.touchConnecting;
              const color = l.touchConnecting
                ? CH_COLORS.amber
                : l.touchSelected
                  ? CH_COLORS.phos
                  : l.backbone
                    ? "var(--color-moss)"
                    : l.dead === "down"
                      ? "#3a332b"
                      : "var(--color-line2)";
              return (
                <line
                  key={i}
                  x1={l.na.x} y1={l.na.y} x2={l.nb.x} y2={l.nb.y}
                  stroke={color}
                  strokeWidth={active ? 1.6 : l.backbone ? 1.3 : 1}
                  strokeDasharray={
                    active
                      ? "7 5"
                      : l.dead === "down"
                        ? "2 7"
                        : l.dead === "weak"
                          ? "4 5"
                          : l.backbone
                            ? "11 6"
                            : "none"
                  }
                  className={cn(active && "anim-dashflow", !active && l.dead === "weak" && "anim-dashflow-slow")}
                  opacity={active ? 0.95 : l.dead === "down" ? 0.45 : l.backbone ? 0.7 : 0.85}
                />
              );
            })}
          </svg>

          {/* ======== 扇区 区域 ======== */}
          {sectors.map((s) => {
            const sel = selectedSector === s.id;
            const col = STATUS_COLOR[s.status];
            /* 教程期间保留目标节点所在扇区的可读性。 */
            const holdsTarget = nodes.some(
              (n) => n.sector === s.id && isHl(`node:${n.id}` as never)
            );
            const secDim = gating && !holdsTarget;
            return (
              <div
                key={s.id}
                onClick={() => { if (!consumedDrag()) onSelectSector(s.id); }}
                className={cn(
                  "group absolute z-10 cursor-pointer transition-all duration-200",
                  secDim && "tut-dim"
                )}
                style={{
                  left: `${(s.x / MAP_W) * 100}%`,
                  top: `${(s.y / MAP_H) * 100}%`,
                  width: `${(s.w / MAP_W) * 100}%`,
                  height: `${(s.h / MAP_H) * 100}%`,
                  border: `1px solid ${sel ? col : alfa(col, 30)}`,
                  background: sel
                    ? alfa(col, 12)
                    : alfa(col, 5),
                  boxShadow: sel
                    ? `inset 0 0 26px ${alfa(col, 13)}, 0 0 0 1px ${alfa(col, 33)}`
                    : `inset 0 0 18px ${alfa(col, 6)}`,
                }}
              >
                <SectorHatch status={s.status} />
                {!sel && (
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    style={{ background: alfa(col, 7), boxShadow: `inset 0 0 0 1px ${alfa(col, 60)}` }}
                  />
                )}
                {sel && <Brackets color={col} size={10} />}
                {/* 标签块 */}
                <div className="pointer-events-none absolute left-[16px] top-[15px] flex items-center gap-1.5">
                  <span
                    className="px-1 py-[1px] text-[7.5px] font-bold tracking-[0.16em]"
                    style={
                      sel
                        ? { background: col, color: "var(--color-ink)" }
                        : { background: "rgba(11,13,9,0.85)", color: col, boxShadow: `inset 0 0 0 1px ${alfa(col, 40)}` }
                    }
                  >
                    {s.code}
                  </span>
                  <span
                    className="pixel text-[15px] uppercase leading-none tracking-[0.1em] transition-colors"
                    style={{
                      color: sel ? col : "var(--color-sage)",
                      textShadow: sel ? `0 0 10px ${alfa(col, 40)}` : "0 1px 2px rgba(0,0,0,0.9)",
                    }}
                  >
                    {sectorName(lang, s.id, s.name)}
                  </span>
                  <StatusDot color={col} pulse={s.status !== "ONLINE"} />
                  <span className="hidden text-[7.5px] tracking-[0.2em] md:inline" style={{ color: col }}>
                    {t(`st.${s.status}`)}
                  </span>
                </div>
                <span
                  className="pointer-events-none absolute bottom-[4px] right-[6px] bg-ink/70 px-[3px] text-[8px] tracking-[0.14em]"
                  style={{ color: sel ? col : "var(--color-dim)" }}
                >
                  {t("map.nd", { n: nodes.filter((n) => n.sector === s.id).length })}
                </span>
              </div>
            );
          })}

          {}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-[11px] justify-between px-[1px] text-[7px] leading-[11px] text-faint sm:flex">
            {rulerX.map((x) => (
              <span key={x} className="tabular-nums">{pad(x, 3)}</span>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-[14px] flex-col justify-between py-[1px] text-[7px] leading-none text-faint sm:flex">
            {rulerY.map((y) => (
              <span key={y} className="tabular-nums">{pad(y, 3)}</span>
            ))}
          </div>

          {/* ======== 十字准星 ======== */}
          <div ref={hLine} className="pointer-events-none absolute left-0 right-0 top-[-10px] z-[5] h-px bg-phos/15" />
          <div ref={vLine} className="pointer-events-none absolute bottom-0 left-[-10px] top-0 z-[5] w-px bg-phos/15" />

          {/* ======== 缓慢扫描线 ======== */}
          <div className="pointer-events-none absolute inset-0 z-[6] overflow-hidden">
            <div
              className="net-sweep absolute left-0 right-0 h-[3px]"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, rgb(var(--phosrgb) / 0.09), rgb(var(--phosrgb) / 0.16), rgb(var(--phosrgb) / 0.09), transparent)",
              }}
            />
          </div>

          {/* ======== 节点 ======== */}
          {nodes.map((n) => (
            <NodeMarker
              key={n.id}
              node={n}
              status={statuses[n.id] ?? "LOCKED"}
              selected={selectedNode === n.id}
              connected={connected.has(n.id)}
              connecting={connectingId === n.id}
              dimmed={!!selectedSector && n.sector !== selectedSector}
              burst={!!bursts[n.id]}
              burning={g.burning?.includes(n.id) ?? false}
              side={labelSides[n.id] ?? "right"}
              spot={isHl(`node:${n.id}` as never)}
              dim={gating && !isHl(`node:${n.id}` as never)}
              onSelect={() => { if (!consumedDrag()) onSelectNode(n.id); }}
            />
          ))}

          {/* ======== 图例 (悬停展开) ======== */}
          <div
            className={cn("absolute bottom-[5px] left-[16px] z-[15] hidden md:block", gating && "tut-dim")}
            style={{
              transform: `scale(${1 / view.scale})`,
              transformOrigin: "bottom left",
              opacity: view.scale > 2.2 ? 0 : 1,
              transition: "opacity 140ms",
            }}
          >
            <div className="group relative">
              <div className="border border-line bg-ink/90 px-1.5 py-[3px] text-[7.5px] font-bold tracking-[0.24em] text-faint transition-colors group-hover:text-dim">
                {t("map.legend")}
              </div>
              <div className="pointer-events-none absolute bottom-full left-0 mb-1 hidden w-[172px] border border-line bg-ink/95 p-1.5 group-hover:block">
                <div className="grid grid-cols-2 gap-x-3 gap-y-[3px]">
                  {(
                    [
                      ["ACCESS", "circle"],
                      ["RELAY", "trapezoid"],
                      ["DATA SERVER", "box"],
                      ["CORPORATE", "hex"],
                      ["PRIVATE", "diamond"],
                      ["ARCHIVE", "tri"],
                      ["RESEARCH", "oct"],
                      ["SECURITY", "pent"],
                    ] as const
                  ).map(([ty, g]) => (
                    <div key={ty} className="flex items-center gap-1.5">
                      <span className={cn("block h-[7px] w-[7px] shrink-0 border border-dim", shapeClass(g))} />
                      <span className="truncate text-[7px] tracking-[0.14em] text-faint">{t(`tshort.${ty}`)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 border-t border-line pt-1 text-[7px] tracking-[0.14em] text-faint">
                  {t("map.links")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
