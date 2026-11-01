import { useEffect, useMemo, useRef, useState } from "react";
import { Database } from "lucide-react";
import { useT } from "../i18n";

/* Scrolling roster of handles that finally lands on the operator's own. */

const POOL = [
  "NULLBYTE","Ghost_404","deadlink","rootkit","SYNTH","coldboot","BlackRelay","koma","irq0",
  "modemmike","VHS_girl","patchbay","lilith_x","tallyman","sable","msm_ghost","fuzzbar","tapeworm",
  "ledger","junkjockey","nightshift","ctrl_alt","operator_04","operator_31","ops_dana","TEETH",
  "wirecutter","halfpipe","dead_air","nullset","pagefault","blinkenlight","grepwitch","sawtooth",
  "lowbaud","hexhound","parityerr","coldfront","dialtone","stackrot","ohm","kilohertz","splice",
  "ferrite","oxide_","carrier9","handshake","nopsled","bitrot","faraday","tapehead","driftwood",
];

export default function HackerExchange({
  operator,
  onDone,
}: {
  operator: string;
  onDone: () => void;
}) {
  const { t } = useT();
  const [offset, setOffset] = useState(0);
  const [landed, setLanded] = useState(false);
  const [badge, setBadge] = useState(false);
  const timers = useRef<number[]>([]);

  /* a long roster so the scroll reads as "thousands of names" */
  const rows = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 90; i++) out.push(POOL[(i * 7 + 3) % POOL.length] + (i % 5 === 0 ? `_${i}` : ""));
    out.push(operator.toUpperCase());
    return out;
  }, [operator]);

  useEffect(() => {
    const total = rows.length - 9;
    let i = 0;
    /* fast at first, easing to a stop on the operator's line */
    const tick = () => {
      i += 1;
      setOffset(Math.min(i, total));
      if (i >= total) {
        setLanded(true);
        timers.current.push(window.setTimeout(() => setBadge(true), 900));
        timers.current.push(window.setTimeout(onDone, 3400));
        return;
      }
      const left = total - i;
      const delay = left < 6 ? 150 + (6 - left) * 70 : left < 16 ? 70 : 26;
      timers.current.push(window.setTimeout(tick, delay));
    };
    timers.current.push(window.setTimeout(tick, 300));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = rows.slice(offset, offset + 10);

  return (
    <div className="pointer-events-none fixed inset-0 z-[108] flex items-center justify-center bg-ink/88 p-4 backdrop-blur-[2px]">
      {!badge ? (
        <div className="anim-msgin w-[min(380px,94%)] border border-line3 bg-panel shadow-[0_0_60px_rgba(0,0,0,0.8)]">
          <div className="flex h-[24px] items-center gap-2 border-b border-line2 bg-header px-2.5">
            <Database size={11} className="text-phosdim" />
            <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-dim">
              {t("ex.title")}
            </span>
            <span className="ml-auto animate-blink text-[8px] text-phosdim">●</span>
          </div>
          <div className="relative h-[188px] overflow-hidden bg-well px-3 py-1.5">
            {view.map((n, i) => {
              const isMe = n === operator.toUpperCase();
              return (
                <div
                  key={`${n}_${offset}_${i}`}
                  className="flex items-baseline gap-2 py-[2px] text-[11px] leading-tight"
                  style={{
                    color: isMe ? "#b3d98d" : "#5b6450",
                    textShadow: isMe ? "0 0 10px rgba(143,181,109,0.6)" : "none",
                    opacity: isMe ? 1 : landed ? 0.4 : 0.75,
                  }}
                >
                  <span className="w-[42px] shrink-0 tabular-nums text-[8px] text-faint">
                    {String(offset + i + 1).padStart(5, "0")}
                  </span>
                  <span className={isMe ? "font-bold tracking-[0.1em]" : ""}>{n}</span>
                  {isMe && <span className="ml-auto text-[8px] tracking-[0.16em] text-phos">◄ {t("ex.you")}</span>}
                </div>
              );
            })}
            {/* scan veil */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(11,13,9,0.9) 0%, transparent 22%, transparent 78%, rgba(11,13,9,0.9) 100%)",
              }}
            />
          </div>
          <div className="border-t border-line bg-soot px-2.5 py-[4px] text-[7.5px] uppercase tracking-[0.18em] text-faint">
            {landed ? t("ex.listed") : t("ex.indexing")}
          </div>
        </div>
      ) : (
        <div className="anim-msgin text-center">
          <div className="text-[9px] uppercase tracking-[0.4em] text-faint">{t("ex.statusLabel")}</div>
          <div
            className="pixel mt-1 text-[46px] leading-none text-phosbrite"
            style={{ textShadow: "0 0 22px rgba(143,181,109,0.45)" }}
          >
            {t("ex.rookie")}
          </div>
        </div>
      )}
    </div>
  );
}
