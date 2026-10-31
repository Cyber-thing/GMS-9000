import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { MAP_H, MAP_W } from "../data/network";
import {
  DEAD_POINTS,
  REGIONS,
  UPLINK,
  cellJitter,
  latToY,
  lonToX,
  worldGrid,
  type RegionDef,
} from "../data/world";
import { Brackets, Panel, StatusDot } from "./chrome";
import { useTut } from "../game/tutorial";
import { blockBar, pad } from "../lib/util";
import { useT } from "../i18n";
import { regionContinent } from "../i18n/content";

/* ------------------------------------------------------------------ */
/* route trace overlay — "packets in flight"                           */
/* ------------------------------------------------------------------ */

export function RouteTrace({ region }: { region: RegionDef }) {
  const { t, lang } = useT();
  const [pct, setPct] = useState(0);
  const [hops, setHops] = useState<string[]>([]);

  useEffect(() => {
    setPct(0);
    setHops([]);
    const t1 = setInterval(() => setPct((p) => Math.min(96, p + 3 + Math.random() * 7)), 90);
    const hopDefs = [
      t("trace.hop1", { ms: pad(4 + Math.floor(Math.random() * 9), 2) }),
      t("trace.hop2", { ms: pad(20 + Math.floor(Math.random() * 30), 2) }),
      t("trace.hop3", { ms: pad(60 + Math.floor(Math.random() * 60), 2) }),
      t("trace.hop4", { code: region.code, ms: pad(120 + Math.floor(Math.random() * 90), 3) }),
    ];
    const timers = hopDefs.map((h, i) =>
      setTimeout(() => setHops((hs) => [...hs, h]), 420 + i * 380)
    );
    return () => {
      clearInterval(t1);
      timers.forEach(clearTimeout);
    };
  }, [region, t]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/88 backdrop-blur-[1px]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ background: "repeating-linear-gradient(to bottom, transparent 0 3px, #8fb56d 3px 4px)" }} />
      <div className="w-[min(420px,90%)] border border-line2 bg-soot shadow-[0_0_60px_rgba(143,181,109,0.07)]">
        <div className="flex h-[26px] items-center gap-2 border-b border-line bg-header px-2.5">
          <StatusDot color="#cfa04b" pulse />
          <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-dim">
            {t("trace.title")}
          </span>
        </div>
        <div className="px-4 py-3">
          <div className="pixel text-[26px] leading-none text-phosbrite">
            {region.code}{" "}
            <span className="text-[16px] text-dim">// {regionContinent(lang, region.id, region.continent)}</span>
          </div>
          <div className="blocksbar mt-2 text-[18px] text-phos">
            {blockBar(pct, 26)} <span className="text-[12px] text-dim">{Math.floor(pct)}%</span>
          </div>
          <div className="mt-2 min-h-[64px] space-y-[1px] border-t border-line pt-1.5">
            {hops.map((h, i) => (
              <div key={i} className="anim-msgin text-[10px] text-dim">
                <span className="text-phosdim">&gt; </span>
                {h}
                {i === hops.length - 1 && <span className="ml-1 inline-block h-[8px] w-[5px] translate-y-[1px] animate-blink bg-phosdim" />}
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[8px] uppercase tracking-[0.2em] text-faint">
            <span>{t("trace.inject")}</span>
            <span className="animate-softpulse text-amber">{t("trace.dontclose")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* world net map                                                       */
/* ------------------------------------------------------------------ */

export default function WorldMap({
  trace,
  onEnterRegion,
  onDeadPoint,
  connectedCount,
  unlockedRegions,
}: {
  trace: RegionDef | null;
  onEnterRegion: (r: RegionDef) => void;
  onDeadPoint: (code: string, note: string) => void;
  connectedCount: number;
  unlockedRegions: string[];
}) {
  const { t, lang } = useT();
  const { hl } = useTut();
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

  const cells = useMemo(() => {
    const g = worldGrid();
    const out: { c: number; r: number; tone: 0 | 1 | 2 }[] = [];
    for (let r = 0; r < g.rows; r++)
      for (let c = 0; c < g.cols; c++)
        if (g.land[r * g.cols + c]) {
          const j = cellJitter(c, r) % 10;
          out.push({ c, r, tone: j === 0 ? 2 : j < 4 ? 1 : 0 });
        }
    return out;
  }, []);

  const LAND_FILL = ["#313c24", "#3c492c", "#4a5c31"] as const;

  const upl = { x: lonToX(UPLINK.lon) * MAP_W, y: latToY(UPLINK.lat) * MAP_H };
  const tracePt = trace ? { x: lonToX(trace.lon) * MAP_W, y: latToY(trace.lat) * MAP_H } : null;
  const arc = tracePt
    ? `M ${upl.x} ${upl.y} Q ${(upl.x + tracePt.x) / 2} ${Math.min(upl.y, tracePt.y) - 130} ${tracePt.x} ${tracePt.y}`
    : null;

  return (
    <Panel
      title={t("panel.worldnet")}
      accent="#7f95a8"
      className="h-full"
      bodyClassName="relative bg-well"
      right={
        <div className="flex items-center gap-3 text-[8.5px] uppercase tracking-[0.18em] text-faint">
          <span className="hidden sm:inline">{t("world.feed")}</span>
          <span className="shrink-0 tabular-nums text-dim">{t("world.sessions", { n: connectedCount })}</span>
        </div>
      }
    >
      <div ref={hostRef} className="relative flex h-full w-full items-center justify-center overflow-hidden p-1.5">
        <div
          className="relative border border-line2 bg-[#0b0e11]"
          style={{ width: box.w, height: box.h }}
        >
          {/* ======== svg: graticule + land + route arc ======== */}
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" aria-hidden>
            {/* graticule every 30° */}
            {Array.from({ length: 11 }, (_, i) => (
              <line key={`g${i}`} x1={((i + 1) * 30) / 360 * MAP_W} y1={0} x2={((i + 1) * 30) / 360 * MAP_W} y2={MAP_H} stroke="#1b2028" strokeWidth={0.7} />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <line key={`v${i}`} x1={0} y1={((i + 1) * 30) / 180 * MAP_H} x2={MAP_W} y2={((i + 1) * 30) / 180 * MAP_H} stroke="#1b2028" strokeWidth={0.7} />
            ))}
            {/* equator emphasis */}
            <line x1={0} y1={MAP_H / 2} x2={MAP_W} y2={MAP_H / 2} stroke="#25303b" strokeWidth={1} strokeDasharray="6 6" />
            {/* land dots */}
            {cells.map(({ c, r, tone }) => (
              <rect
                key={`${c}_${r}`}
                x={((c + 0.5) / 72) * MAP_W - ((MAP_W / 72) * 0.36)}
                y={((r + 0.5) / 36) * MAP_H - ((MAP_H / 36) * 0.36)}
                width={MAP_W / 72 * 0.72}
                height={MAP_H / 36 * 0.72}
                fill={LAND_FILL[tone]}
              />
            ))}

            {/* uplink rings */}
            <circle cx={upl.x} cy={upl.y} r={10} fill="none" stroke="#8f86b8" opacity={0.5}>
              <animate attributeName="r" values="8;26" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0" dur="2.6s" repeatCount="indefinite" />
            </circle>

            {/* packet stream along route arc during trace */}
            {arc && (
              <>
                <path d={arc} fill="none" stroke="#cfa04b" strokeWidth={1.2} strokeDasharray="5 7" className="anim-dashflow" opacity={0.85} />
                {[0, 0.33, 0.66].map((off, i) => (
                  <circle key={i} r={3.2} fill="#ffe0a3">
                    <animateMotion dur="1.05s" begin={`${off}s`} repeatCount="indefinite" path={arc} />
                  </circle>
                ))}
              </>
            )}
          </svg>

          {/* ======== uplink marker ======== */}
          <div
            className="absolute z-10"
            style={{ left: `${lonToX(UPLINK.lon) * 100}%`, top: `${latToY(UPLINK.lat) * 100}%`, transform: "translate(-50%,-50%)" }}
          >
            <div className="flex flex-col items-center">
              <span className="block h-[9px] w-[9px] rotate-45 border border-viole bg-viole/20" />
              <span className="mt-[4px] whitespace-nowrap text-[7.5px] tracking-[0.2em] text-viole">
                {UPLINK.code} · {t("world.uplink")}
              </span>
            </div>
          </div>

          {/* ======== region gateways ======== */}
          {REGIONS.map((r) => {
            const active = trace?.id === r.id;
            const locked = !unlockedRegions.includes(r.id);
            return (
              <button
                key={r.id}
                disabled={!!trace}
                onClick={() => onEnterRegion(r)}
                className={cn(
                  "group absolute z-20 outline-none",
                  trace && !active && "opacity-30",
                  hl === `world:${r.id}` && "tut-ring"
                )}
                style={{ left: `${lonToX(r.lon) * 100}%`, top: `${latToY(r.lat) * 100}%`, transform: "translate(-50%,-50%)" }}
                title={`${r.code} // ${regionContinent(lang, r.id, r.continent)}`}
              >
                <span className="relative block h-[34px] w-[34px]">
                  <Brackets color={active ? "#cfa04b" : locked ? "#59604f" : "#8fb56d"} size={10} />
                  <span className={cn("absolute inset-0 m-auto h-[11px] w-[11px] border", active && "animate-softpulse")}
                    style={{
                      borderColor: active ? "#cfa04b" : locked ? "#59604f" : "#8fb56d",
                      background: active
                        ? "rgba(207,160,75,0.35)"
                        : locked
                          ? "transparent"
                          : "rgba(143,181,109,0.22)",
                    }}
                  />
                  {!active && !locked && (
                    <span className="absolute inset-0 m-auto h-[3px] w-[3px] animate-softpulse bg-phosbrite" />
                  )}
                  {locked && (
                    <span className="absolute inset-0 m-auto text-center text-[9px] leading-[34px] text-faint">×</span>
                  )}
                </span>
                <span className="absolute left-full top-1/2 ml-1 -translate-y-1/2 whitespace-nowrap text-left">
                  <span
                    className={cn(
                      "block text-[10px] font-bold tracking-[0.18em] transition-colors",
                      locked ? "text-dim" : "text-phosbrite group-hover:bg-phos group-hover:text-ink"
                    )}
                  >
                    &nbsp;{r.code}&nbsp;
                  </span>
                  <span className="block text-[7.5px] tracking-[0.2em] text-dim">
                    {regionContinent(lang, r.id, r.continent)}
                  </span>
                  <span
                    className={cn(
                      "block text-[7px] tracking-[0.14em] transition-opacity",
                      locked ? "text-oxide/80 opacity-100" : "text-faint opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {locked ? t("world.locked") : t("world.enter")}
                  </span>
                </span>
              </button>
            );
          })}

          {/* ======== dead points ======== */}
          {DEAD_POINTS.map((p) => (
            <button
              key={p.code}
              disabled={!!trace}
              onClick={() => onDeadPoint(p.code, p.note)}
              className={cn("group absolute z-10 outline-none", trace && "opacity-30")}
              style={{ left: `${lonToX(p.lon) * 100}%`, top: `${latToY(p.lat) * 100}%`, transform: "translate(-50%,-50%)" }}
              title={`${p.code} · ${t(`dead.${p.code}`)}`}
            >
              <span className="block h-[10px] w-[10px] rotate-45 border border-faint/70 transition-colors group-hover:border-oxide" />
              <span className="absolute left-full top-1/2 ml-1.5 -translate-y-1/2 whitespace-nowrap text-[7px] tracking-[0.18em] text-faint transition-colors group-hover:text-dim">
                {p.code} · {t("world.offline")}
              </span>
            </button>
          ))}

          {/* frame labels */}
          <span className="pointer-events-none absolute left-[6px] top-[5px] text-[7.5px] tracking-[0.22em] text-faint">
            {t("world.fig")}
          </span>
          <span className="pointer-events-none absolute bottom-[5px] right-[6px] text-[7.5px] tracking-[0.22em] text-faint">
            {t("world.reach", { r: REGIONS.length, d: DEAD_POINTS.length })}
          </span>
        </div>

        {/* ======== route trace overlay ======== */}
        {trace && <RouteTrace region={trace} />}
      </div>
    </Panel>
  );
}
