import { useEffect, useRef, useState } from "react";
import { Archive, Download, FileText, Radar, ShieldOff, X } from "lucide-react";
import { cn } from "../utils/cn";
import { blockBar } from "../lib/util";
import { useT } from "../i18n";

type Phase = "idle" | "scanning" | "found" | "saved" | "looted";

const SPOOLS = [
  "PERS-ROSTER-7781", "LEAVE-REQ-0042", "SHIFT-ROTA-91", "MEDICAL-CLAIMS", "PENSION-TIER-B",
  "GRIEVANCE-LOG", "PAYSCALE-REV-12", "OVERTIME-Q3", "DISCIPLINE-FILE", "TRAINING-CERTS",
  "HEADCOUNT-FCST", "EXIT-INTERVIEW", "UNION-CORRESP", "BENEFITS-PLAN", "ONBOARD-FORMS",
  "SICK-LEAVE-88", "RELOCATION-REQ", "APPRAISAL-2Q", "SEVERANCE-CALC", "ACCESS-AUDIT",
];

export default function ArchiveWindow({
  nodeCode,
  alreadyTaken,
  onTake,
  onClose,
  onLog,
}: {
  nodeCode: string;
  alreadyTaken: boolean;
  onTake: () => void;
  onClose: () => void;
  onLog: (key: string, params?: Record<string, string | number>) => void;
}) {
  const { t } = useT();
  /* 已经洗过的档案库：再进来只剩一行「已被扒空」的提示 */
  const [phase, setPhase] = useState<Phase>(alreadyTaken ? "looted" : "idle");
  const [pct, setPct] = useState(0);
  const [cursor, setCursor] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((h) => { clearTimeout(h); clearInterval(h); }), []);

  const scan = () => {
    if (phase !== "idle") return;
    setPhase("scanning");
    setPct(0);
    onLog("arc.logScan");
    const iv = window.setInterval(() => {
      setPct((p) => Math.min(100, p + 100 / 26));
      setCursor((c) => (c + 1) % SPOOLS.length);
    }, 110);
    timers.current.push(iv);
    timers.current.push(
      window.setTimeout(() => {
        clearInterval(iv);
        setPct(100);
        setPhase("found");
      }, 3000)
    );
  };

  const take = () => {
    if (phase !== "found") return;
    setPhase("saved");
    onTake();
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-ink/88 p-3 backdrop-blur-[2px]">
      <div className="anim-msgin flex max-h-[92vh] w-[min(560px,97%)] flex-col border border-line3 bg-panel shadow-[0_0_80px_rgba(0,0,0,0.78)]">
        {/* 标题栏 */}
        <div className="flex h-[26px] shrink-0 items-center gap-2 border-b border-line2 bg-header px-2.5">
          <Archive size={11} className="text-steel" />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-dim">
            {t("arc.title")} :: {nodeCode}
          </span>
          <button onClick={onClose} className="ml-auto shrink-0 text-dim transition-colors hover:text-fog">
            <X size={11} />
          </button>
        </div>

        {/* 卷宗列表 */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-well px-2 py-1.5">
          {SPOOLS.map((name, i) => {
            const active = phase === "scanning" && i === cursor;
            return (
              <div
                key={name}
                className={cn(
                  "flex items-center gap-2 border-b border-line/40 px-1 py-[4px] text-[10px] transition-colors",
                  active ? "bg-amber/10 text-amber" : "text-dim"
                )}
              >
                <FileText size={9} className="shrink-0 opacity-70" />
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <span className="shrink-0 tabular-nums text-[8px] text-faint">
                  {((i * 37) % 900) + 40}K
                </span>
              </div>
            );
          })}
        </div>

        {/* 已被扒空：说明这里再没有可拿的东西 */}
        {phase === "looted" && (
          <div className="shrink-0 border-t border-line2 bg-panel2 px-3 py-2.5">
            <div className="flex items-start gap-2 border border-viole/40 bg-viole/8 px-2.5 py-2">
              <ShieldOff size={12} className="mt-[1px] shrink-0 text-viole" />
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-viole">
                  {t("arc.looted")}
                </div>
                <p className="mt-[2px] text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-faint">
                  {t("arc.lootedBody")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 结果 */}
        {(phase === "found" || phase === "saved") && (
          <div className="shrink-0 border-t border-line2 bg-panel2 px-3 py-2.5">
            <div className="text-[8px] uppercase tracking-[0.2em] text-amberdim">{t("arc.sealed")}</div>
            <div className="pixel mt-[2px] text-[17px] leading-tight text-amber">
              {t("arc.termTitle")}
            </div>
            {phase === "saved" ? (
              <div className="mt-2 border border-phosdim/50 bg-phos/10 py-[6px] text-center text-[9px] font-bold uppercase tracking-[0.14em] text-phos">
                ✓ {t("arc.saved")}
              </div>
            ) : (
              <button
                onClick={take}
                className="mt-2 flex w-full items-center justify-center gap-2 border border-amberdim bg-amber/15 py-[7px] text-[9.5px] font-bold uppercase tracking-[0.16em] text-amber transition-colors hover:bg-amber hover:text-ink"
              >
                <Download size={11} /> {t("arc.save")}
              </button>
            )}
          </div>
        )}

        {/* 操作栏 */}
        <div className="flex h-[34px] shrink-0 items-center gap-2 border-t border-line bg-soot px-2.5">
          {phase === "scanning" ? (
            <>
              <Radar size={11} className="animate-softpulse text-amber" />
              <span className="text-[8.5px] uppercase tracking-[0.14em] text-amber">{t("arc.scanning")}</span>
              <span className="blocksbar ml-auto text-[13px] text-amber">{blockBar(pct, 16)}</span>
            </>
          ) : phase === "idle" ? (
            <button
              onClick={scan}
              className="flex w-full items-center justify-center gap-2 border border-phosdim bg-phos/12 py-[7px] text-[9.5px] font-bold uppercase tracking-[0.16em] text-phosbrite transition-colors hover:bg-phos hover:text-ink"
            >
              <Radar size={11} /> {t("arc.scanBtn")}
            </button>
          ) : phase === "looted" ? (
            <span className="flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.14em] text-viole">
              <ShieldOff size={10} /> {t("arc.looted")}
            </span>
          ) : (
            <span className="text-[8.5px] uppercase tracking-[0.14em] text-faint">{t("arc.restored")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
