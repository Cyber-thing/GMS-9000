import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpFromLine, ChevronLeft } from "lucide-react";
import { cn } from "../utils/cn";
import { MAP_H, MAP_W, TYPE_GLYPH, type NetLink, type NetNode, type Sector } from "../data/network";
import type { NodeState } from "../game/types";
import { regionGrid, type RegionDef } from "../data/world";
import { landShape } from "../data/landshape";
import { Brackets, Panel, STATUS_COLOR, StatusDot } from "./chrome";
import { alfa } from "../lib/util";
import { useT } from "../i18n";
import { regionContinent, sectorName } from "../i18n/content";
import { useTut } from "../game/tutorial";
import { isHostileFaction, useGame } from "../game/state";
import { NODE_META } from "../game/data";
import { useMapView } from "../hooks/useMapView";
import { shapeClass } from "./NetworkMap";
import NodeQuickPopup from "./NodeQuickPopup";

/**
 * Мобильная карта региона. Два уровня, без визуального шума:
 *  1) обзор — каждый район показан подписанной точкой (как узел);
 *  2) район — крупным планом только его узлы, остального на экране нет.
 */
export default function MobileRegionMap({
  region,
  sectors,
  nodes,
  links,
  statuses,
  connected,
  connectingId,
  selectedSector,
  selectedNode,
  hackPct,
  onSelectSector,
  onSelectNode,
  onBackToSectors,
  onBackToWorld,
  onQuickHack,
  onQuickVault,
  onQuickArchive,
  onQuickSabotage,
  onShowDossier,
  onDeselectNode,
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
  hackPct: number;
  onSelectSector: (id: string) => void;
  onSelectNode: (id: string) => void;
  onBackToSectors: () => void;
  onBackToWorld: () => void;
  onQuickHack: (id: string) => void;
  onQuickVault: (id: string) => void;
  onQuickArchive: (id: string) => void;
  onQuickSabotage: (id: string) => void;
  onShowDossier: () => void;
  onDeselectNode: () => void;
}) {
  const { t, lang } = useT();
  const { isHl, gating } = useTut();
  const { g } = useGame();
  const { frameRef, view, dragging, onPointerDown, consumedDrag, reset } = useMapView();

  const sector = selectedSector ? sectors.find((s) => s.id === selectedSector) ?? null : null;

  /* при входе в район и возврате сбрасываем масштаб: каждый уровень начинается «как есть» */
  useEffect(() => { reset(); }, [selectedSector, reset]);

  const land = useMemo(() => landShape(regionGrid(region.box, 2), MAP_W, MAP_H, 2), [region]);

  /* ---------- уровень 1: районы как подписанные точки ---------- */
  const dots = useMemo(
    () =>
      sectors.map((s) => ({
        s,
        cx: ((s.x + s.w / 2) / MAP_W) * 100,
        cy: ((s.y + s.h / 2) / MAP_H) * 100,
        count: nodes.filter((n) => n.sector === s.id).length,
        owned: nodes.filter((n) => n.sector === s.id && connected.has(n.id)).length,
      })),
    [sectors, nodes, connected]
  );

  /* ---------- уровень 2: узлы выбранного района крупным планом ---------- */
  const close = useMemo(() => {
    if (!sector) return null;
    const own = nodes.filter((n) => n.sector === sector.id);
    if (!own.length) return { nodes: [] as { n: NetNode; x: number; y: number }[], links: [] as NetLink[] };
    /* рамку строим по самим узлам — так район всегда занимает весь экран */
    const xs = own.map((n) => n.x);
    const ys = own.map((n) => n.y);
    const padX = Math.max(60, (Math.max(...xs) - Math.min(...xs)) * 0.18);
    const padY = Math.max(50, (Math.max(...ys) - Math.min(...ys)) * 0.22);
    const bx = Math.min(...xs) - padX;
    const by = Math.min(...ys) - padY;
    const bw = Math.max(1, Math.max(...xs) + padX - bx);
    const bh = Math.max(1, Math.max(...ys) + padY - by);
    const pos = (n: NetNode) => ({ x: ((n.x - bx) / bw) * 100, y: ((n.y - by) / bh) * 100 });
    const ids = new Set(own.map((n) => n.id));
    return {
      nodes: own.map((n) => ({ n, ...pos(n) })),
      links: links.filter((l) => ids.has(l.a) && ids.has(l.b)),
      pos,
    };
  }, [sector, nodes, links]);

  const posOf = (id: string) => close?.nodes.find((e) => e.n.id === id) ?? null;
  const popupEntry = selectedNode ? posOf(selectedNode) : null;

  const stageRef = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => force((v) => v + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sectorColor = sector ? STATUS_COLOR[sector.status] : "var(--color-phos)";

  return (
    <Panel
      title={sector ? sectorName(lang, sector.id, sector.name) : t("panel.regional")}
      accent={sector ? sectorColor : "var(--color-phos)"}
      className="h-full"
      bodyClassName="relative bg-well"
      right={
        <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em]">
          {sector ? (
            <button
              onClick={onBackToSectors}
              className="flex items-center gap-1 border border-line2 px-1.5 py-[3px] font-bold text-dim transition-colors hover:border-phosdim hover:text-phos"
            >
              <ChevronLeft size={9} /> {t("map.districts")}
            </button>
          ) : (
            <span className="truncate text-faint">
              {region.code} · {regionContinent(lang, region.id, region.continent)}
            </span>
          )}
          <button
            onClick={onBackToWorld}
            className="flex items-center gap-1 border border-line2 px-1.5 py-[3px] font-bold text-dim transition-colors hover:border-phosdim hover:text-phos"
            title={t("map.backTip")}
          >
            <ArrowUpFromLine size={9} /> {t("map.back")}
          </button>
        </div>
      }
    >
      <div
        ref={(el) => {
          frameRef.current = el;
        }}
        data-zone="Map"
        onPointerDown={onPointerDown}
        onClick={() => {
          if (!gating && !consumedDrag()) onDeselectNode();
        }}
        className={cn(
          "relative h-full w-full touch-none overflow-hidden",
          dragging ? "cursor-grabbing" : "cursor-default"
        )}
      >
        <div
          ref={stageRef}
          className="absolute inset-0"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 140ms ease-out",
          }}
        >
          {/* ======== УРОВЕНЬ 1: РАЙОНЫ ======== */}
          {!sector && (
            <>
              {/* контур суши — лёгкий фон, чтобы точки не висели в пустоте */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                preserveAspectRatio="none"
                aria-hidden
              >
                <path d={land.path} fillRule="evenodd" fill="var(--color-panel2)" opacity={0.35} />
                <path
                  d={land.path}
                  fillRule="evenodd"
                  fill="none"
                  stroke="var(--color-line)"
                  strokeWidth={1.2}
                  opacity={0.5}
                />
              </svg>

              {dots.map(({ s, cx, cy, count, owned }) => {
                const col = STATUS_COLOR[s.status];
                const holdsTarget = nodes.some((n) => n.sector === s.id && isHl(`node:${n.id}` as never));
                const flip = cx > 62;
                return (
                  <button
                    key={s.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!consumedDrag()) onSelectSector(s.id);
                    }}
                    data-sfx="uiNode"
                    className={cn(
                      "group absolute z-20 outline-none",
                      holdsTarget && "tut-ring",
                      gating && !holdsTarget && "tut-dim"
                    )}
                    style={{ left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%,-50%)" }}
                  >
                    {/* маркер района */}
                    <span className="relative block h-[26px] w-[26px]">
                      <Brackets color={col} size={8} />
                      <span
                        className="absolute left-1/2 top-1/2 block h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rotate-45 border"
                        style={{ borderColor: col, background: alfa(col, 26) }}
                      />
                      {owned > 0 && (
                        <span className="absolute left-1/2 top-1/2 block h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 animate-softpulse bg-phosbrite" />
                      )}
                    </span>
                    {/* подпись района */}
                    <span
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-left",
                        flip ? "right-full mr-1.5 text-right" : "left-full ml-1.5"
                      )}
                    >
                      <span
                        className="block text-[9px] font-bold leading-none tracking-[0.14em]"
                        style={{ color: col }}
                      >
                        {s.code}
                      </span>
                      {/* название тем же кеглем, что и код — без пиксельного крупного шрифта */}
                      <span className="mt-[3px] block text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-dim">
                        {sectorName(lang, s.id, s.name)}
                      </span>
                      <span className="mt-[2px] flex items-center gap-1 text-[7.5px] tracking-[0.16em] text-faint"
                        style={flip ? { justifyContent: "flex-end" } : undefined}
                      >
                        <StatusDot color={col} pulse={s.status !== "ONLINE"} />
                        {t("map.nd", { n: count })}
                        {owned > 0 && <span className="text-viole">· {owned}◆</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* ======== УРОВЕНЬ 2: УЗЛЫ РАЙОНА КРУПНО ======== */}
          {sector && close && (
            <>
              {/* связи внутри района */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                {close.links.map((l, i) => {
                  const a = posOf(l.a);
                  const b = posOf(l.b);
                  if (!a || !b) return null;
                  const active = selectedNode === l.a || selectedNode === l.b;
                  const down = statuses[l.a] === "LOCKED" || statuses[l.b] === "LOCKED" || l.state === "down";
                  return (
                    <line
                      key={i}
                      x1={`${a.x}%`}
                      y1={`${a.y}%`}
                      x2={`${b.x}%`}
                      y2={`${b.y}%`}
                      stroke={active ? "var(--color-phos)" : down ? "#3a332b" : "var(--color-line2)"}
                      strokeWidth={active ? 1.8 : 1.2}
                      strokeDasharray={active ? "7 5" : down ? "2 7" : l.backbone ? "11 6" : "none"}
                      className={cn(active && "anim-dashflow")}
                      opacity={active ? 0.95 : down ? 0.4 : 0.75}
                    />
                  );
                })}
              </svg>

              {/* узлы района */}
              {close.nodes.map(({ n, x, y }) => {
                const st = statuses[n.id] ?? "LOCKED";
                const isConn = connected.has(n.id);
                const isBusy = connectingId === n.id;
                const burning = g.burning?.includes(n.id) ?? false;
                const hostile = isHostileFaction(NODE_META[n.id]?.owner ?? "indep", g.relations);
                const col = burning
                  ? "#e0634a"
                  : isBusy
                    ? STATUS_COLOR.CONNECTING
                    : isConn
                      ? STATUS_COLOR.CONNECTED
                      : STATUS_COLOR[st];
                const sel = selectedNode === n.id;
                const glyph = TYPE_GLYPH[n.type];
                const hl = isHl(`node:${n.id}` as never);
                const below = y < 26;
                return (
                  <button
                    key={n.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!consumedDrag()) onSelectNode(n.id);
                    }}
                    data-sfx="uiNode"
                    className={cn(
                      "group absolute z-20 outline-none",
                      hl && "tut-ring",
                      gating && !hl && "tut-dim"
                    )}
                    style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }}
                  >
                    {/* крупная зона нажатия — палец попадает уверенно */}
                    <span className="relative block h-[30px] w-[30px]">
                      {hostile && (
                        <span
                          className="pointer-events-none absolute inset-[2px] animate-softpulse border-2 border-[#ff3b3b]"
                          style={{ boxShadow: "0 0 9px rgba(255,59,59,0.6)" }}
                        />
                      )}
                      {isConn && (
                        <span
                          className="pointer-events-none absolute inset-[3px] animate-[spin_7s_linear_infinite] border border-dashed"
                          style={{ borderColor: alfa(col, 60) }}
                        />
                      )}
                      {sel && <Brackets color={isBusy ? "#cfa04b" : "var(--color-phos)"} size={9} />}
                      <span
                        className={cn(
                          "absolute left-1/2 top-1/2 block h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 border",
                          shapeClass(glyph),
                          isBusy && "animate-softpulse",
                          st === "RESTRICTED" && !isConn && !isBusy && "anim-denote"
                        )}
                        style={{
                          borderColor: col,
                          borderWidth: glyph === "box" ? 1.4 : 2,
                          background: st === "LOCKED" ? "transparent" : alfa(col, isConn ? 40 : 18),
                          boxShadow: sel || isConn ? `0 0 9px ${alfa(col, 45)}` : "none",
                        }}
                      >
                        {glyph === "box" && (
                          <span className="absolute inset-[3px]" style={{ background: alfa(col, 35) }} />
                        )}
                      </span>
                    </span>
                    {/* подпись узла */}
                    <span
                      className={cn(
                        "pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink/85 px-[3px] py-[1px] text-[8.5px] font-semibold leading-none tracking-[0.08em]",
                        below ? "top-full mt-[3px]" : "bottom-full mb-[3px]",
                        sel ? "text-phosbrite" : st === "LOCKED" ? "text-faint" : "text-dim"
                      )}
                    >
                      {n.code}
                      {st === "LOCKED" && <span className="text-faint"> [L]</span>}
                      {st === "RESTRICTED" && <span className="text-amberdim"> [R]</span>}
                      {st === "COMPROMISED" && <span className="text-viole"> ◆</span>}
                      {isBusy && <span className="animate-blink text-amber"> ::SYN</span>}
                    </span>
                  </button>
                );
              })}

              {/* всплывающее окно с действиями у выбранного узла */}
              {popupEntry && (
                <div
                  className="pointer-events-none absolute z-40"
                  style={{
                    left: `${popupEntry.x}%`,
                    top: `${popupEntry.y}%`,
                    transform: `scale(${1 / view.scale})`,
                    transformOrigin: `${popupEntry.x > 55 ? "right" : "left"} ${popupEntry.y < 38 ? "top" : "bottom"}`,
                  }}
                >
                  <div
                    style={{
                      transform: `translate(${popupEntry.x > 55 ? "calc(-100% - 16px)" : "16px"}, ${
                        popupEntry.y < 38 ? "18px" : "calc(-100% - 18px)"
                      })`,
                    }}
                  >
                    <NodeQuickPopup
                      node={popupEntry.n}
                      status={statuses[popupEntry.n.id] ?? "LOCKED"}
                      hackingId={connectingId}
                      hackPct={hackPct}
                      onHack={onQuickHack}
                      onEnterVault={onQuickVault}
                      onOpenArchive={onQuickArchive}
                      onSabotage={onQuickSabotage}
                      onDossier={onShowDossier}
                      onClose={() => { if (!gating) onDeselectNode(); }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* подсказка уровня 1 */}
        {!sector && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[6px] flex justify-center px-3">
            <span className="border border-line3 bg-ink/90 px-2.5 py-[5px] text-center text-[8px] font-bold uppercase tracking-[0.18em] text-dim">
              {t("map.pickSector")}
            </span>
          </div>
        )}

        {/* шапка уровня 2: состояние района */}
        {sector && (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 border-b border-line bg-ink/85 px-2 py-[4px] text-[7.5px] uppercase tracking-[0.16em]">
            <span className="font-bold" style={{ color: sectorColor }}>{sector.code}</span>
            <StatusDot color={sectorColor} pulse={sector.status !== "ONLINE"} />
            <span className="text-faint">{t(`st.${sector.status}`)}</span>
            <span className="ml-auto text-faint">
              {t("map.nd", { n: close?.nodes.length ?? 0 })}
            </span>
          </div>
        )}
      </div>
    </Panel>
  );
}
