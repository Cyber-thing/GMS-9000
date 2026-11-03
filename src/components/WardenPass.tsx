import { useEffect, useRef, useState } from "react";
import { KeyRound, Lock, ShieldAlert, X } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { StatusDot } from "./chrome";

/** WARDEN PASS：保护节点的字面密码输入窗口。 */
export default function WardenPass({
  nodeCode,
  expected,
  onPass,
  onClose,
}: {
  nodeCode: string;
  expected: string;
  onPass: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "denied" | "granted">("idle");
  const [tries, setTries] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const submit = () => {
    if (state === "checking" || state === "granted") return;
    const typed = value.trim().toUpperCase();
    if (!typed) return;
    setState("checking");
    timers.current.push(
      window.setTimeout(() => {
        if (typed === expected.toUpperCase()) {
          setState("granted");
          timers.current.push(window.setTimeout(onPass, 1000));
        } else {
          setState("denied");
          setTries((n) => n + 1);
          setValue("");
          timers.current.push(window.setTimeout(() => inputRef.current?.focus(), 50));
        }
      }, 900)
    );
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-ink/88 p-3 backdrop-blur-[2px]">
      <div
        className="anim-msgin w-[min(420px,96%)] border bg-panel shadow-[0_0_70px_rgba(0,0,0,0.8)]"
        style={{ borderColor: state === "granted" ? "var(--color-phos)" : "#cfa04b88" }}
      >
        <div className="flex h-[26px] items-center gap-2 border-b border-line2 bg-header px-2.5">
          <StatusDot color={state === "granted" ? "var(--color-phos)" : "#cfa04b"} pulse />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-dim">
            {nodeCode}
          </span>
          <button onClick={onClose} className="ml-auto shrink-0 text-dim transition-colors hover:text-fog">
            <X size={11} />
          </button>
        </div>

        <div className="px-4 py-4">
          {/* 横幅 */}
          <div className="flex items-center gap-2 border border-amberdim/60 bg-amber/8 px-2.5 py-2">
            <ShieldAlert size={16} className="shrink-0 text-amber" />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber">
                {t("wp.banner")}
              </div>
              <div className="text-[8px] uppercase tracking-[0.14em] text-amberdim">
                {t("wp.sub")}
              </div>
            </div>
          </div>

          {/* 输入字段 */}
          <label className="mt-3 block text-[9px] uppercase tracking-[0.24em] text-faint">
            {t("wp.prompt")}
          </label>
          <div
            className="mt-1.5 flex items-center gap-2 border bg-well px-2.5"
            style={{ borderColor: state === "denied" ? "#c25b46" : "var(--color-line3)" }}
          >
            <KeyRound size={12} className="shrink-0 text-phosdim" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              maxLength={32}
              spellCheck={false}
              autoComplete="off"
              disabled={state === "checking" || state === "granted"}
              onChange={(e) => { setValue(e.target.value); if (state === "denied") setState("idle"); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={t("wp.ph")}
              className="h-[34px] w-full bg-transparent text-[13px] font-semibold uppercase tracking-[0.18em] text-phosbrite placeholder:text-[9px] placeholder:tracking-[0.18em] placeholder:text-faint"
            />
            <span className="h-[13px] w-[7px] shrink-0 animate-blink bg-phosdim" />
          </div>

          {/* 验证结果 */}
          <div className="mt-2 min-h-[16px] text-[10px] uppercase tracking-[0.16em]">
            {state === "checking" && <span className="animate-softpulse text-amber">{t("wp.checking")}</span>}
            {state === "denied" && (
              <span className="text-oxide">
                ✕ {t("wp.denied")}
                {tries > 1 && <span className="ml-1 text-faint">· {t("wp.tries", { n: tries })}</span>}
              </span>
            )}
            {state === "granted" && <span className="text-phosbrite">✓ {t("wp.granted")}</span>}
          </div>

          <button
            onClick={submit}
            disabled={state === "checking" || state === "granted" || !value.trim()}
            className={cn(
              "mt-2 flex w-full items-center justify-center gap-2 border px-3 py-[8px] text-[10px] font-bold uppercase tracking-[0.2em] transition-colors",
              value.trim() && state !== "checking" && state !== "granted"
                ? "border-amberdim bg-amber/12 text-amber hover:bg-amber hover:text-ink"
                : "cursor-not-allowed border-line text-faint"
            )}
          >
            <Lock size={11} /> {t("wp.submit")}
          </button>

          <p className="mt-2 text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-faint">
            {t("wp.foot")}
          </p>
        </div>
      </div>
    </div>
  );
}
