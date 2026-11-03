import { useEffect, useRef } from "react";
import { cn } from "../utils/cn";
import { TYPE_GLYPH, type NetNode, type Sector } from "../data/network";
import type { NodeState } from "../game/types";
import { KV, Panel, STATUS_COLOR } from "./chrome";
import { alfa, blockBar, stampNow } from "../lib/util";
import { useT } from "../i18n";
import { sectorDesc, sectorName } from "../i18n/content";
import { useTut } from "../game/tutorial";

function shapeCls(g: string) {
  return g === "circle"
    ? "rounded-full"
    : g === "diamond"
      ? "rotate-45"
      : g === "trapezoid"
        ? "[clip-path:polygon(22%_0,78%_0,100%_100%,0_100%)]"
      : g === "hex"
        ? "[clip-path:polygon(25%_0,75%_0,100%_50%,75%_100%,25%_100%,0_50%)]"
        : g === "tri"
          ? "[clip-path:polygon(50%_0,100%_100%,0_100%)]"
          : g === "pent"
            ? "[clip-path:polygon(50%_0,100%_38%,81%_100%,19%_100%,0_38%)]"
            : g === "oct"
              ? "[clip-path:polygon(30%_0,70%_0,100%_30%,100%_70%,70%_100%,30%_100%,0_70%,0_30%)]"
              : "";
}

/* 扇区列表和节点详情共用的图形样式 */
export function TypeGlyphShape({ type, color, size = 8, hollow = false }: { type: NetNode["type"]; color: string; size?: number; hollow?: boolean }) {
  return (
    <span
      className={cn("block shrink-0 border", shapeCls(TYPE_GLYPH[type]))}
      style={{
        width: size,
        height: size,
        borderColor: color,
        background: hollow ? "transparent" : alfa(color, 27),
      }}
    />
  );
}

/* 扇区面板 */

export function SectorPanel({
  sector,
  nodes,
  statuses,
  selectedNode,
  onSelectNode,
  emptyHint,
}: {
  sector: Sector | null;
  nodes: NetNode[];
  statuses: Record<string, NodeState>;
  selectedNode: string | null;
  onSelectNode: (id: string) => void;
  emptyHint: string;
}) {
  const { t, lang } = useT();
  const { isHl, gating } = useTut();
  if (!sector) {
    return (
      <Panel title={t("panel.sector")} className="shrink-0" bodyClassName="p-3">
        <p className="text-[10.5px] leading-relaxed text-faint">
          &gt; {t("sec.none")}
          <span className="ml-1 inline-block h-[10px] w-[6px] translate-y-[1px] animate-blink bg-faint" />
          <br />
          {emptyHint}
        </p>
      </Panel>
    );
  }

  const sectorNodes = nodes.filter((n) => n.sector === sector.id);
  const live = (n: NetNode): NodeState => statuses[n.id] ?? "LOCKED";
  const online = sectorNodes.filter((n) => live(n) !== "LOCKED").length;
  const integrity =
    sector.status === "ONLINE"
      ? 84 + (sector.id.length * 7) % 12
      : sector.status === "RESTRICTED"
        ? 64
        : sector.status === "CONTESTED"
          ? 46
          : 31;

  return (
    <Panel
      title={t("panel.sector")}
      className="shrink-0"
      accent={STATUS_COLOR[sector.status]}
      right={<span className="text-[8px] tracking-[0.2em] text-faint">{sector.code}</span>}
    >
      <div className="px-3 pb-2 pt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="pixel text-[19px] leading-none tracking-[0.06em] text-fog">
            {sectorName(lang, sector.id, sector.name)}
          </span>
          <span
            className="shrink-0 border px-1.5 py-[2px] text-[8px] font-bold tracking-[0.18em]"
            style={{ color: STATUS_COLOR[sector.status], borderColor: `${STATUS_COLOR[sector.status]}55` }}
          >
            {t(`st.${sector.status}`)}
          </span>
        </div>
        <div className="mt-2 space-y-px border-y border-line py-1.5">
          <KV k={t("sec.nodes")} v={t("sec.indexed", { n: sectorNodes.length })} />
          <KV k={t("sec.reach")} v={`${online} / ${sectorNodes.length}`} vc={online > 0 ? "var(--color-phos)" : "var(--color-moss)"} />
          <KV
            k={t("sec.integrity")}
            v={
              <span className="blocksbar" style={{ color: STATUS_COLOR[sector.status] }}>
                {blockBar(integrity, 12)} {integrity}%
              </span>
            }
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-dim">
          {sectorDesc(lang, sector.id, sector.desc)}
        </p>
      </div>

      <div className="max-h-[168px] overflow-y-auto border-t border-line">
        {sectorNodes.map((n) => {
          const st = live(n);
          const sel = selectedNode === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onSelectNode(n.id)}
              className={cn(
                "flex w-full items-center gap-2 border-b border-line/60 px-3 py-[5px] text-left transition-colors",
                sel ? "bg-phos/10" : "hover:bg-panel2",
                isHl(`node:${n.id}` as never) && "tut-ring",
                gating && !isHl(`node:${n.id}` as never) && "tut-dim"
              )}
            >
              <TypeGlyphShape
                type={n.type}
                color={STATUS_COLOR[st]}
                hollow={st === "LOCKED"}
              />
              <span className={cn("w-[66px] shrink-0 text-[10px] tracking-[0.08em]", sel ? "text-phosbrite" : "text-fog")}>
                {n.code}
              </span>
              <span className="hidden min-w-0 flex-1 truncate text-[8.5px] uppercase tracking-[0.12em] text-faint xl:inline">
                {t(`tshort.${n.type}`)}
              </span>
              <span className="ml-auto shrink-0 text-[8px] tracking-[0.14em]" style={{ color: STATUS_COLOR[st] }}>
                {t(`nst.${st}`)}
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/* 节点面板 */

/* 事件日志 */

export interface NetEvent {
  id: number;
  t: string;
  text: string;
  kind: "info" | "warn" | "good" | "odd" | "bad";
}

const EV_COLOR: Record<NetEvent["kind"], string> = {
  info: "var(--color-dim)",
  good: "var(--color-phos)",
  warn: "#cfa04b",
  odd: "#8f86b8",
  bad: "#c25b46",
};

const EV_MARK: Record<NetEvent["kind"], string> = {
  info: "·",
  good: "+",
  warn: "!",
  odd: "?",
  bad: "×",
};

export function EventLog({ events }: { events: NetEvent[] }) {
  const { t } = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <Panel
      title={t("panel.events")}
      className="min-h-[110px] flex-1"
      accent="#7f95a8"
      right={<span className="text-[8px] tracking-[0.2em] text-faint">{t("ev.entries", { n: events.length })}</span>}
      bodyClassName="relative"
    >
      <div ref={boxRef} className="absolute inset-0 overflow-y-auto px-2.5 py-1.5">
        {events.map((e) => (
          <div key={e.id} className="anim-msgin flex items-baseline gap-1.5 py-[1.5px] text-[10px] leading-snug">
            <span className="shrink-0 tabular-nums text-faint">{e.t}</span>
            <span className="shrink-0 font-bold" style={{ color: EV_COLOR[e.kind] }}>
              {EV_MARK[e.kind]}
            </span>
            <span style={{ color: EV_COLOR[e.kind] }}>{e.text}</span>
          </div>
        ))}
        {events.length === 0 && <p className="py-2 text-[10px] text-faint">{t("ev.waiting")}</p>}
      </div>
    </Panel>
  );
}

export const mkEvent = (id: number, text: string, kind: NetEvent["kind"]): NetEvent => ({
  id,
  t: stampNow(),
  text,
  kind,
});
