import { useEffect, useRef, useState } from "react";
import { Radar, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { sfx } from "../lib/sfx";

/**
 * «ВАС ОТСЛЕЖИВАЮТ» — вход в узел враждебной фракции.
 * Кнопка «Защита» — заглушка будущей мини-игры по отражению кибератак:
 * пока она просто имитирует отбитую атаку и пускает игрока дальше.
 */
export default function TrackedModal({
  nodeCode,
  ownerName,
  onDefended,
  onClose,
}: {
  nodeCode: string;
  ownerName: string;
  /** Вызывается, когда защита (пока заглушка) выдержала атаку. */
  onDefended: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [phase, setPhase] = useState<"idle" | "defending" | "held">("idle");
  const [pct, setPct] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    sfx("alarm");
    return () => timers.current.forEach((h) => { clearTimeout(h); clearInterval(h); });
  }, []);

  const defend = () => {
    if (phase !== "idle") return;
    sfx("click");
    setPhase("defending");
    const iv = window.setInterval(() => setPct((p) => Math.min(100, p + 7)), 110);
    timers.current.push(iv);
    timers.current.push(
      window.setTimeout(() => {
        clearInterval(iv);
        setPct(100);
        setPhase("held");
        sfx("hackOk");
        timers.current.push(window.setTimeout(onDefended, 1100));
      }, 1700)
    );
  };

  return (
    <div
      data-zone="Tracked"
      className="fixed inset-0 z-[97] flex items-center justify-center bg-[#12040499] p-3 backdrop-blur-[2px]"
    >
      <div
        className="anim-msgin relative w-[min(440px,96%)] border-2 border-[#ff3b3b] bg-[#0d0506] shadow-[0_0_80px_rgba(255,59,59,0.35)]"
      >
        <div className="flex h-[26px] items-center gap-2 border-b border-[#ff3b3b]/60 bg-[#2a0a0c] px-2.5">
          <ShieldAlert size={11} className="animate-softpulse text-[#ff5c5c]" />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-[#ff8a8a]">
            {t("trk.header", { code: nodeCode })}
          </span>
          <button
            onClick={onClose}
            title={t("trk.leave")}
            className="ml-auto text-[#ff8a8a]/70 transition-colors hover:text-[#ffd0d0]"
          >
            <X size={12} />
          </button>
        </div>

        <div className="px-5 py-6 text-center">
          <Radar size={30} className="mx-auto animate-softpulse text-[#ff3b3b]" />
          <div
            className="pixel mt-3 text-[34px] leading-none tracking-[0.12em] text-[#ff4b4b]"
            style={{ textShadow: "0 0 18px rgba(255,59,59,0.7)" }}
          >
            {t("trk.title")}
          </div>
          <p className="mt-3 text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[#d99a9a]">
            {t("trk.body", { owner: ownerName })}
          </p>

          {phase !== "idle" && (
            <div className="mt-4">
              <div className="h-[6px] w-full border border-[#ff3b3b]/50 bg-[#1a0707]">
                <div
                  className={cn("h-full transition-[width] duration-100", phase === "held" ? "bg-phos" : "bg-[#ff3b3b]")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div
                className={cn(
                  "mt-1.5 text-[9px] font-bold uppercase tracking-[0.18em]",
                  phase === "held" ? "text-phosbrite" : "text-[#ff8a8a]"
                )}
              >
                {phase === "held" ? t("trk.held") : t("trk.defending")}
              </div>
            </div>
          )}

          <button
            onClick={defend}
            disabled={phase !== "idle"}
            className={cn(
              "mt-5 flex w-full items-center justify-center gap-2 border-2 px-4 py-[10px] text-[12px] font-bold uppercase tracking-[0.28em] transition-all",
              phase === "idle"
                ? "border-[#ff3b3b] bg-[#ff3b3b]/15 text-[#ff7a7a] hover:bg-[#ff3b3b] hover:text-[#1a0505] hover:shadow-[0_0_22px_rgba(255,59,59,0.55)]"
                : "cursor-not-allowed border-[#ff3b3b]/30 text-[#ff7a7a]/50"
            )}
          >
            <ShieldCheck size={14} /> {t("trk.defend")}
          </button>
          <p className="mt-2 text-[8px] uppercase tracking-[0.16em] text-[#a06666]">{t("trk.stub")}</p>
        </div>
      </div>
    </div>
  );
}
