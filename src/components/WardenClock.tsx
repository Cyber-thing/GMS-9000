import { useEffect, useRef, useState } from "react";
import { ShieldAlert, Siren } from "lucide-react";
import { cn } from "../utils/cn";
import { pad } from "../lib/util";
import { useT } from "../i18n";

/**
 * 迷你游戏通用的 WARDEN 倒计时条。
 * seconds 为 0 时表示该主机没有防护，只显示一行静态提示。
 */
export default function WardenClock({
  seconds,
  warden,
  running,
  onExpire,
  right,
}: {
  seconds: number;
  warden: number;
  /** 结算画面出现后停表 */
  running: boolean;
  onExpire: () => void;
  right?: React.ReactNode;
}) {
  const { t } = useT();
  const [left, setLeft] = useState(seconds);
  const fired = useRef(false);

  useEffect(() => {
    if (!seconds || !running) return;
    const iv = window.setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(iv);
  }, [seconds, running]);

  useEffect(() => {
    if (!seconds || !running || left > 0 || fired.current) return;
    fired.current = true;
    onExpire();
  }, [left, seconds, running, onExpire]);

  /* 没有防护的主机：给出一行说明，避免界面空缺 */
  if (!seconds) {
    return (
      <div className="flex h-[24px] shrink-0 items-center gap-2 border-b border-line bg-soot px-2.5">
        <ShieldAlert size={11} className="text-faint" />
        <span className="truncate text-[8.5px] uppercase tracking-[0.16em] text-faint">
          {t("wc.none")}
        </span>
        <span className="ml-auto shrink-0">{right}</span>
      </div>
    );
  }

  const danger = left <= 10;

  return (
    <div
      className={cn(
        "flex h-[24px] shrink-0 items-center gap-2 border-b px-2.5 transition-colors",
        danger ? "border-oxide/60 bg-oxide/12" : "border-amberdim/40 bg-amber/8"
      )}
    >
      <Siren size={11} className={cn(danger ? "text-oxide" : "text-amber", danger && "animate-softpulse")} />
      <span className="hidden text-[8.5px] font-bold uppercase tracking-[0.18em] text-amber sm:inline">
        WARDEN T{warden}
      </span>
      <span
        className={cn(
          "pixel text-[19px] leading-none tabular-nums",
          danger ? "animate-softpulse text-[#ff5f45]" : "text-[#e0634a]"
        )}
        style={{ textShadow: "0 0 10px rgba(194,91,70,0.5)" }}
      >
        {Math.floor(left / 60)}:{pad(left % 60, 2)}
      </span>
      <span className="ml-auto shrink-0">{right}</span>
    </div>
  );
}
