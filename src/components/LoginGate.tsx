import { useEffect, useRef, useState } from "react";
import { ChevronRight, Globe2, ScanEye, ShieldAlert, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "../utils/cn";
import { StatusDot } from "./chrome";
import { useT, type Lang } from "../i18n";
import { store } from "../lib/util";

const BOOT_KEYS = ["login.boot1", "login.boot2", "login.boot3", "login.boot4", "login.boot5"];

const LANGS: { id: Lang; label: string; sub: string }[] = [
  { id: "en", label: "ENGLISH", sub: "en · international" },
  { id: "ru", label: "РУССКИЙ", sub: "ru · русский язык" },
];

export default function LoginGate({
  onEnter,
  savedHandle,
}: {
  onEnter: (handle: string) => void;
  savedHandle: string;
}) {
  const { t, lang, setLang } = useT();
  const [handle, setHandle] = useState(savedHandle === "UNKNOWN" ? "" : savedHandle);
  const [booted, setBooted] = useState(0);
  const [phase, setPhase] = useState<"form" | "grant">("form");
  const [armed, setArmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* the arm state disarms itself so a stray click can never wipe a save */
  useEffect(() => {
    if (!armed) return;
    const h = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(h);
  }, [armed]);

  const wipeAll = () => {
    store.wipe();
    window.location.reload();
  };

  useEffect(() => {
    const timers = BOOT_KEYS.map((_, i) => setTimeout(() => setBooted(i + 1), 260 + i * 300));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (booted >= BOOT_KEYS.length) inputRef.current?.focus();
  }, [booted]);

  const submit = (asUnknown = false) => {
    if (phase === "grant") return;
    const h = asUnknown
      ? "UNKNOWN"
      : handle.trim().replace(/\s+/g, "_").slice(0, 16).toUpperCase() || "UNKNOWN";
    setHandle(h === "UNKNOWN" ? "" : h);
    setPhase("grant");
    setTimeout(() => onEnter(h), 1350);
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-y-auto bg-ink p-4">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(#151a10 1px, transparent 1px), linear-gradient(90deg, #151a10 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="anim-msgin relative my-auto w-full max-w-[520px]">
        <div className="border border-line2 bg-panel shadow-[0_0_80px_rgba(143,181,109,0.06),inset_0_0_0_1px_rgba(0,0,0,0.6)]">
          {/* header */}
          <div className="flex h-[30px] items-center gap-2 border-b border-line2 bg-header px-2.5">
            <StatusDot color="#8fb56d" pulse />
            <span className="truncate text-[9px] font-bold uppercase tracking-[0.26em] text-dim">
              {t("login.title")}
            </span>
            <span className="mx-1 h-px flex-1 bg-line" />
            <span className="shrink-0 text-[8px] tracking-[0.2em] text-faint">{t("login.guest")}</span>
          </div>

          <div className="px-5 py-4 sm:px-7 sm:py-5">
            {/* logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border border-phosdim bg-phos/10 text-phosbrite">
                <ScanEye size={24} strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <div className="pixel text-[38px] leading-[0.9] tracking-[0.04em] text-phosbrite txt-glow-green">
                  GNS-9000
                </div>
                <div className="mt-[2px] truncate text-[8.5px] uppercase tracking-[0.3em] text-faint">
                  {t("login.sub")}
                </div>
              </div>
            </div>

            {/* boot log */}
            <div className="mt-4 min-h-[86px] border-y border-line py-2">
              {BOOT_KEYS.slice(0, booted).map((k, i) => (
                <div key={k} className="anim-msgin text-[10px] leading-[1.7] text-dim">
                  <span className="text-faint">&gt; </span>
                  {t(k)}
                  {i === booted - 1 && booted < BOOT_KEYS.length && (
                    <span className="ml-1 inline-block h-[9px] w-[5px] translate-y-[1px] animate-blink bg-phosdim" />
                  )}
                </div>
              ))}
            </div>

            {phase === "form" ? (
              <div
                className={cn(
                  "transition-opacity duration-500",
                  booted < BOOT_KEYS.length && "pointer-events-none opacity-30"
                )}
              >
                {/* language select */}
                <div className="mt-3.5">
                  <label className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.26em] text-faint">
                    <Globe2 size={10} /> {t("login.lang")}
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {LANGS.map((l) => {
                      const active = lang === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => setLang(l.id)}
                          className={cn(
                            "group relative border px-2.5 py-[7px] text-left transition-all",
                            active
                              ? "border-phosdim bg-phos/15 shadow-[0_0_14px_rgba(143,181,109,0.14)]"
                              : "border-line2 hover:border-line3 hover:bg-panel2"
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="block h-[7px] w-[7px] shrink-0 border"
                              style={{
                                borderColor: active ? "#b3d98d" : "#4c5545",
                                background: active ? "#8fb56d" : "transparent",
                              }}
                            />
                            <span
                              className={cn(
                                "text-[11px] font-bold tracking-[0.16em]",
                                active ? "text-phosbrite" : "text-dim"
                              )}
                            >
                              {l.label}
                            </span>
                          </span>
                          <span className="mt-[2px] block pl-[13px] text-[7.5px] tracking-[0.18em] text-faint">
                            {l.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* handle */}
                <div className="mt-3.5">
                  <label className="block text-[9px] uppercase tracking-[0.26em] text-faint">
                    {t("login.handle")}
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 border border-line3 bg-well px-2.5">
                    <ChevronRight size={12} className="shrink-0 text-phos" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={handle}
                      maxLength={16}
                      spellCheck={false}
                      autoComplete="off"
                      onChange={(e) => setHandle(e.target.value.replace(/[^\w.\-]/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && submit(false)}
                      placeholder={t("login.ph")}
                      className="h-[34px] w-full bg-transparent text-[13px] font-semibold uppercase tracking-[0.12em] text-phosbrite placeholder:text-[9px] placeholder:tracking-[0.18em] placeholder:text-faint"
                    />
                    <span className="h-[13px] w-[7px] shrink-0 animate-blink bg-phosdim" />
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1.5 sm:flex-row">
                  <button
                    onClick={() => submit(false)}
                    className="flex-1 border border-phosdim bg-phos/15 px-4 py-[9px] text-[10px] font-bold uppercase tracking-[0.2em] text-phosbrite transition-all hover:bg-phos hover:text-ink hover:shadow-[0_0_18px_rgba(143,181,109,0.3)]"
                  >
                    {t("login.jack")}
                  </button>
                  <button
                    onClick={() => submit(true)}
                    className="flex-1 border border-line3 px-4 py-[9px] text-[10px] font-bold uppercase tracking-[0.2em] text-dim transition-colors hover:bg-panel2 hover:text-fog"
                  >
                    {t("login.unknown")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 border border-phosdim/50 bg-phos/5 px-3 py-3">
                <div className="text-[10px] leading-[1.8] text-phosbrite">
                  <span className="text-phosdim">&gt; </span>
                  {t("login.auth", { h: handle ? handle.toUpperCase() : "UNKNOWN" })}
                </div>
                <div
                  className="anim-msgin text-[10px] leading-[1.8] text-phosbrite"
                  style={{ animationDelay: "0.45s", opacity: 0 }}
                >
                  <span className="text-phosdim">&gt; </span>
                  {t("login.granted")}
                </div>
              </div>
            )}

            {/* warning */}
            <div className="mt-4 flex items-start gap-2 border border-amberdim/40 bg-amber/5 px-2.5 py-2">
              <ShieldAlert size={12} className="mt-[1px] shrink-0 text-amber" />
              <p className="text-[8.5px] uppercase leading-relaxed tracking-[0.1em] text-amberdim">
                {t("login.notice")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-line2 bg-soot px-3 py-[5px] text-[8px] uppercase tracking-[0.16em] text-faint">
            <span>{t("login.f1")}</span>
            <span className="hidden sm:inline">{t("login.f2")}</span>
            <span className="ml-auto">{t("login.f3")}</span>
          </div>
        </div>

        <p className="mt-2 text-center text-[8px] uppercase tracking-[0.24em] text-faint">
          {t("login.foot")}
        </p>

        {/* ---- cold boot / wipe save ---- */}
        <div className="mt-2 border border-line bg-panel/70">
          {!armed ? (
            <button
              onClick={() => setArmed(true)}
              className="group flex w-full items-center gap-2 px-2.5 py-[7px] text-left transition-colors hover:bg-oxide/10"
            >
              <Trash2 size={11} className="shrink-0 text-faint transition-colors group-hover:text-oxide" />
              <span className="min-w-0 flex-1">
                <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-dim transition-colors group-hover:text-oxide">
                  {t("wipe.label")}
                </span>
                <span className="block truncate text-[7.5px] uppercase tracking-[0.14em] text-faint">
                  {t("wipe.hint")}
                </span>
              </span>
            </button>
          ) : (
            <div className="anim-msgin px-2.5 py-2">
              <div className="flex items-start gap-2">
                <TriangleAlert size={12} className="mt-[1px] shrink-0 animate-softpulse text-oxide" />
                <p className="text-[8.5px] uppercase leading-relaxed tracking-[0.12em] text-oxide">
                  {t("wipe.warn")}
                </p>
              </div>
              <div className="mt-1.5 flex gap-1.5">
                <button
                  onClick={wipeAll}
                  className="flex-1 border border-oxide bg-oxide/15 px-2 py-[6px] text-[9px] font-bold uppercase tracking-[0.14em] text-oxide transition-colors hover:bg-oxide hover:text-ink"
                >
                  {t("wipe.confirm")}
                </button>
                <button
                  onClick={() => setArmed(false)}
                  className="border border-line3 px-3 py-[6px] text-[9px] font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:bg-panel2 hover:text-fog"
                >
                  {t("wipe.cancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
