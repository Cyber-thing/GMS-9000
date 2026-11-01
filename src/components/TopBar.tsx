import { useEffect, useRef, useState } from "react";
import { Activity, Check, Languages, LogOut, MonitorDot, Pencil, ScanEye, X } from "lucide-react";
import { clockNow, fmtUptime, randInt, store } from "../lib/util";
import { StatusDot } from "./chrome";
import { useT } from "../i18n";
import { useGame, CFG } from "../game/state";
import { useTut } from "../game/tutorial";
import { cn } from "../utils/cn";

function useClock() {
  const [now, setNow] = useState(clockNow());
  useEffect(() => {
    const t = setInterval(() => setNow(clockNow()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function Field({ label, value, color = "#bcc4ae" }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[10.5px] uppercase tracking-[0.2em] text-faint">{label}</span>
      <span className="text-[13px] font-medium leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export default function TopBar({
  sessions,
  fx,
  onToggleFx,
  operator,
  onSetOperator,
  networkName,
  onLogout,
}: {
  sessions: number;
  fx: boolean;
  onToggleFx: () => void;
  operator: string;
  onSetOperator: (v: string) => void;
  networkName: string;
  onLogout: () => void;
}) {
  const { t, lang, setLang } = useT();
  const { g, recover } = useGame();
  const { isHl, fire } = useTut();
  const tutAnon = isHl("anonymity");
  const now = useClock();

  /* persistent boot time so uptime survives reloads */
  const [boot] = useState(() => {
    const b = store.get<number | null>("boot", null);
    if (b) return b;
    const nb = Date.now() - randInt(7, 62) * 3600_000;
    store.set("boot", nb);
    return nb;
  });
  const [uptime, setUptime] = useState(Date.now() - boot);
  useEffect(() => {
    const t = setInterval(() => setUptime(Date.now() - boot), 1000);
    return () => clearInterval(t);
  }, [boot]);

  /* network activity: fluctuating throughput + bar levels */
  const [kb, setKb] = useState(4.2);
  const [bars, setBars] = useState<number[]>([3, 5, 2, 6, 4, 7, 3]);
  useEffect(() => {
    const t = setInterval(() => {
      setKb((k) => Math.max(0.4, Math.min(56, k + (Math.random() - 0.52) * 3.4)));
      setBars((b) => {
        const n = [...b.slice(1), randInt(1, 8)];
        return n;
      });
    }, 640);
    return () => clearInterval(t);
  }, []);

  /* operator handle inline edit */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(operator);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const v = draft.trim().replace(/\s+/g, "_").slice(0, 16);
    onSetOperator(v || "UNKNOWN");
    setEditing(false);
  };

  return (
    <div className="relative z-30 flex h-[38px] shrink-0 items-stretch border-b border-line2 bg-header">
      {/* identity chip — reverse video */}
      <div className="flex items-center gap-2.5 border-r border-line2 bg-phos px-3 text-ink">
        <ScanEye size={14} strokeWidth={2.2} />
        <div className="leading-none">
          <div className="text-[13px] font-bold tracking-[0.14em]">GNS-9000</div>
          <div className="mt-[2px] text-[9.5px] font-semibold uppercase tracking-[0.28em] opacity-80">
            {t("brand.sub")}
          </div>
        </div>
        <span className="ml-1 border border-ink/40 px-1 py-[1px] text-[10px] font-bold tracking-widest">v2.4.1</span>
      </div>

      {/* status fields */}
      <div className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-1 overflow-x-auto px-3 md:gap-x-5">
        <Field
          label={t("top.system")}
          value={
            <span className="inline-flex items-center gap-1.5">
              <StatusDot color="#8fb56d" pulse /> {t("top.online")}
            </span>
          }
          color="#b3d98d"
        />
        <span className="hidden h-3 w-px bg-line2 sm:block" />
        <Field label={t("top.network")} value={networkName} />
        <span className="hidden h-3 w-px bg-line2 sm:block" />
        <Field label={t("top.conn")} value={t("top.stable")} color="#8fb56d" />
        <span className="hidden h-3 w-px bg-line2 lg:block" />
        <Field label="REP" value={String(g.rep)} color="#b3d98d" />
        <span className="hidden h-3 w-px bg-line2 sm:block" />
        <Field label="CR" value={String(g.credits)} color="#cfa04b" />
        <span className="hidden h-3 w-px bg-line2 lg:block" />
        <div className="hidden lg:block">
          <Field label={t("top.sessions")} value={String(sessions).padStart(2, "0")} color="#8f86b8" />
        </div>
        <span className="hidden h-3 w-px bg-line2 xl:block" />
        <div className="hidden xl:block">
          <Field label={t("top.uptime")} value={fmtUptime(uptime)} />
        </div>
        <span className="hidden h-3 w-px bg-line2 md:block" />
        <Field
          label={t("top.local")}
          value={
            <span className="tabular-nums">
              {now.split(":").map((p, i) => (
                <span key={i}>
                  {i > 0 && <span className="animate-blink">:</span>}
                  {p}
                </span>
              ))}
            </span>
          }
          color="#8fb56d"
        />
      </div>

      {/* activity meter */}
      <div className="hidden items-center gap-2 border-l border-line2 px-3 sm:flex">
        <Activity size={12} className="text-phosdim" />
        <div className="flex h-[14px] items-end gap-[2px]" aria-hidden>
          {bars.map((v, i) => (
            <span
              key={i}
              className="w-[3px] transition-all duration-500"
              style={{ height: `${(v / 8) * 100}%`, background: i === bars.length - 1 ? "#b3d98d" : "#5f7a4b" }}
            />
          ))}
        </div>
        <span className="w-[52px] tabular-nums text-[12px] text-dim">{kb.toFixed(1)}kb/s</span>
      </div>

      {/* operator handle */}
      <div className="flex items-center gap-2 border-l border-line2 px-3">
        <span className="hidden text-[10.5px] uppercase tracking-[0.2em] text-faint md:inline">{t("top.operator")}</span>
        {editing ? (
          <span className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={16}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="h-[20px] w-[110px] border border-line3 bg-well px-1 text-[13px] uppercase text-phosbrite placeholder:text-faint"
              placeholder={t("top.handlePh")}
            />
            <button onClick={commit} className="text-phos hover:text-phosbrite" aria-label={t("top.save")}>
              <Check size={12} />
            </button>
            <button onClick={() => setEditing(false)} className="text-dim hover:text-fog" aria-label={t("top.cancel")}>
              <X size={12} />
            </button>
          </span>
        ) : (
          <button
            onClick={() => {
              setDraft(operator);
              setEditing(true);
            }}
            className="group flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-amber hover:text-phosbrite"
            title={t("top.handleTip")}
          >
            {operator}
            <Pencil size={9} className="opacity-0 transition-opacity group-hover:opacity-70" />
          </button>
        )}
      </div>

      {/* GENIUS operation buffer */}
      <div className="flex shrink-0 items-center gap-2 border-l border-line2 px-2.5">
        <div className="leading-none">
          <div className="text-[10px] uppercase tracking-[0.18em] text-faint">{t("genius.title")}</div>
          <div className="mt-[2px] flex items-center gap-[2px]">
            {Array.from({ length: CFG.opsLimit }, (_, i) => (
              <span
                key={i}
                className="block h-[7px] w-[6px] border"
                style={{
                  borderColor: i < g.ops ? "#c25b46" : "#39422d",
                  background: i < g.ops ? "#c25b4688" : "transparent",
                }}
              />
            ))}
          </div>
        </div>
        {g.ops >= CFG.opsLimit || g.recovering || tutAnon ? (
          <button
            onClick={() => {
              if (g.recovering) return;
              recover();
              fire("anonymity");
            }}
            disabled={g.recovering}
            className={cn(
              "border px-1.5 py-[3px] text-[10px] font-bold uppercase tracking-[0.12em] transition-colors",
              g.recovering
                ? "animate-softpulse border-amberdim text-amber"
                : "border-oxide bg-oxide/15 text-oxide hover:bg-oxide hover:text-ink",
              tutAnon && !g.recovering && "tut-ring"
            )}
            title={g.ops >= CFG.opsLimit ? t("genius.required") : t("genius.anonTip")}
          >
            {g.recovering ? t("genius.recovering") : t("genius.recover")}
          </button>
        ) : (
          <span className="hidden text-[10px] uppercase tracking-[0.14em] text-phosdim xl:inline">
            {t("genius.ready")}
          </span>
        )}
      </div>

      {/* language toggle */}
      <button
        onClick={() => setLang(lang === "en" ? "ru" : "en")}
        className="flex w-[58px] items-center justify-center gap-1 border-l border-line2 text-[11px] font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:bg-panel2 hover:text-phos"
        title={t("top.langTip")}
      >
        <Languages size={12} />
        {lang === "en" ? "EN" : "RU"}
      </button>

      {/* fx toggle */}
      <button
        onClick={onToggleFx}
        className={`flex w-[64px] items-center justify-center gap-1.5 border-l border-line2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
          fx ? "bg-panel2 text-phos" : "text-faint hover:text-dim"
        }`}
        title={t("top.crtTip")}
      >
        <MonitorDot size={12} />
        CRT
      </button>

      {/* disconnect */}
      <button
        onClick={onLogout}
        title={t("top.logoutTip")}
        className="flex shrink-0 items-center justify-center gap-1.5 border-l border-line2 px-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:bg-oxide hover:text-ink"
      >
        <LogOut size={12} />
        <span className="hidden md:inline">{t("top.logout")}</span>
      </button>
    </div>
  );
}
