import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, TerminalSquare } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";

export interface TermLine {
  id: number;
  t: string;
  text: string;
  tone?: "ok" | "warn" | "err" | "dim";
  /** 可选事件标签，例如“NEW CODEX ENTRY”。 */
  tag?: string;
}

const TONE_COLOR: Record<NonNullable<TermLine["tone"]>, string> = {
  ok: "#8fb56d",
  warn: "#cfa04b",
  err: "#b36a52",
  dim: "#5c6553",
};

export default function TerminalBar({
  lines,
  expanded,
  onToggle,
}: {
  lines: TermLine[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useT();
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, expanded]);

  /* 统计控制台折叠期间经过的消息数量。 */
  const [missed, setMissed] = useState(0);
  const seen = useRef(lines.length);
  useEffect(() => {
    if (expanded) {
      seen.current = lines.length;
      setMissed(0);
    } else {
      setMissed(Math.max(0, lines.length - seen.current));
    }
  }, [lines.length, expanded]);

  const last = lines[lines.length - 1];

  return (
    <div className="relative z-30 shrink-0 border-t border-line2 bg-[#0d100a]">
      {/* 标题条 */}
      <div className="flex h-[24px] items-center gap-2 border-b border-line px-2">
        <TerminalSquare size={11} className="shrink-0 text-phosdim" />
        <span className="truncate text-[9px] font-bold uppercase tracking-[0.22em] text-dim">{t("term.title")}</span>
        <span className="h-px flex-1 bg-line" />
        {!expanded && missed > 0 && (
          <span className="shrink-0 animate-softpulse bg-amber px-[4px] text-[8px] font-bold tracking-[0.12em] text-ink">
            +{missed > 99 ? "99" : missed}
          </span>
        )}
        <span className="hidden shrink-0 text-[8px] tracking-[0.16em] text-faint sm:inline">{t("term.hint")}</span>
        <button
          onClick={onToggle}
          className="flex items-center gap-1 border border-line2 px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:border-line3 hover:text-fog"
        >
          {expanded ? (
            <>
              {t("term.collapse")} <ChevronDown size={9} />
            </>
          ) : (
            <>
              {t("term.expand")} <ChevronUp size={9} />
            </>
          )}
        </button>
      </div>

      {/* 日志主体 */}
      <div
        ref={boxRef}
        className={cn(
          "overflow-y-auto px-2.5 font-mono transition-all duration-300",
          expanded ? "h-[150px] py-1.5" : "h-[26px] py-0"
        )}
      >
        {(expanded ? lines.slice(-90) : lines.slice(-1)).map((l) => (
          <div key={l.id} className="flex items-baseline gap-2 whitespace-nowrap text-[10.5px] leading-[1.65]">
            <span className="shrink-0 tabular-nums text-faint">[{l.t}]</span>
            <span style={{ color: l.tone ? TONE_COLOR[l.tone] : "#99a18c" }}>
              <span className="text-faint">&gt; </span>
              {l.tag && <span className="font-bold">[{l.tag}] </span>}
              {l.text}
            </span>
          </div>
        ))}
        {!expanded && !last && <span className="text-[10.5px] text-faint">&gt; {t("term.ready")}</span>}
        {expanded && (
          <div className="flex items-baseline gap-2 text-[10.5px] leading-[1.65]">
            <span className="shrink-0 tabular-nums text-faint">[--:--:--]</span>
            <span className="text-faint">
              &gt; <span className="ml-0 inline-block h-[10px] w-[6px] translate-y-[1px] animate-blink bg-phosdim" />
            </span>
          </div>
        )}
      </div>

      {/* 状态条 */}
      <div className="flex h-[18px] items-center gap-3 border-t border-line bg-soot px-2.5 text-[8px] uppercase tracking-[0.16em] text-faint">
        <span>{t("term.mem")}</span>
        <span>{t("term.buf", { n: lines.length })}</span>
        <span className="hidden sm:inline">{t("term.line")}</span>
        <span className="ml-auto hidden md:inline">{t("term.rom")}</span>
      </div>
    </div>
  );
}
