import { useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { useGame } from "../game/state";
import { ALL_NODES } from "../data/regions";

/** 已恢复的 WARDEN PASS 密钥固定显示在所有弹窗上方，便于在密码窗口中使用。 */
export default function KeyBanner() {
  const { t } = useT();
  const { g, setFlag } = useGame();
  const [copied, setCopied] = useState<string | null>(null);

  const keys = Object.entries(g.flags)
    .filter(([k, v]) => k.startsWith("key_") && typeof v === "string" && !g.flags[`${k}_hid`])
    .map(([k, v]) => {
      const nodeId = k.slice(4);
      const node = ALL_NODES.find((n) => n.id === nodeId);
      const open = g.nodeStates[nodeId] === "COMPROMISED";
      return { flag: k, nodeId, code: node?.code ?? nodeId, key: String(v), open };
    });

  if (!keys.length) return null;

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(value);
    setTimeout(() => setCopied(null), 1400);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[54px] z-[120] flex flex-col items-center gap-1 px-2">
      {keys.map((k) => (
        <div
          key={k.flag}
          className={cn(
            "anim-msgin pointer-events-auto flex w-[min(380px,100%)] items-center gap-2 border-2 px-2.5 py-[6px]",
            "shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_8px_28px_rgba(0,0,0,0.9)]",
            k.open ? "border-phosdim bg-panel" : "border-amberdim bg-[#17140c]"
          )}
        >
          <KeyRound size={13} className={k.open ? "shrink-0 text-phos" : "shrink-0 animate-softpulse text-amber"} />
          <div className="min-w-0 flex-1">
            <div className="text-[7.5px] font-bold uppercase tracking-[0.2em] text-faint">
              {t("nf.KEY RECOVERED")} · {k.code}
            </div>
            <button
              onClick={() => copy(k.key)}
              title={t("kb.copy")}
              className="group flex items-center gap-1.5 text-left"
            >
              <span
                className="pixel text-[19px] leading-none tracking-[0.14em]"
                style={{
                  color: k.open ? "var(--color-phosbrite)" : "#e8c478",
                  textShadow: k.open ? "none" : "0 0 10px rgba(207,160,75,0.45)",
                }}
              >
                {k.key}
              </span>
              {copied === k.key ? (
                <Check size={10} className="text-phos" />
              ) : (
                <Copy size={9} className="text-faint opacity-0 transition-opacity group-hover:opacity-100" />
              )}
            </button>
          </div>
          <button
            onClick={() => setFlag(`${k.flag}_hid`, true)}
            title={t("kb.dismiss")}
            className="shrink-0 text-faint transition-colors hover:text-fog"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}

