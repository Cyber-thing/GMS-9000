import { useEffect, useRef, useState } from "react";
import { MessageSquareDot, X } from "lucide-react";
import { useT } from "../i18n";
import { useGame } from "../game/state";
import { contactById } from "../game/data";

/** Bottom-right pop-up announcing a fresh line in a contact thread. */
export default function MessageToast({ onOpen }: { onOpen: () => void }) {
  const { t } = useT();
  const { g, isThreadOpen } = useGame();
  const [shown, setShown] = useState<{ nick: string; text: string } | null>(null);
  const seen = useRef<Record<string, number>>({});
  const primed = useRef(false);
  const hide = useRef<number | null>(null);

  useEffect(() => {
    /* first pass only records the baseline, so a reload does not fire toasts */
    if (!primed.current) {
      Object.entries(g.threads).forEach(([k, v]) => (seen.current[k] = v.length));
      primed.current = true;
      return;
    }
    for (const [contact, list] of Object.entries(g.threads)) {
      const was = seen.current[contact] ?? 0;
      if (list.length <= was) continue;
      seen.current[contact] = list.length;
      const last = list[list.length - 1];
      if (!last || last.from === "OP") continue;
      /* already on screen — no point announcing it */
      if (isThreadOpen(contact)) continue;
      setShown({ nick: contactById(contact)?.nick ?? contact, text: last.text });
      if (hide.current) clearTimeout(hide.current);
      hide.current = window.setTimeout(() => setShown(null), 6000);
    }
  }, [g.threads, isThreadOpen]);

  useEffect(() => () => { if (hide.current) clearTimeout(hide.current); }, []);

  if (!shown) return null;

  return (
    <div className="pointer-events-none fixed bottom-[86px] right-3 z-[118] flex justify-end">
      <button
        onClick={() => { onOpen(); setShown(null); }}
        className="anim-msgin pointer-events-auto flex w-[244px] items-start gap-2 border-2 border-amberdim bg-panel px-2.5 py-[7px] text-left shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_8px_30px_rgba(0,0,0,0.9)] transition-colors hover:bg-panel2"
      >
        <MessageSquareDot size={13} className="mt-[1px] shrink-0 animate-softpulse text-amber" />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-amber">
            {t("nf.newmsg")}
          </span>
          <span className="block truncate text-[12px] font-bold text-phosbrite">{shown.nick}</span>
          <span className="block truncate text-[11px] text-dim">{shown.text}</span>
        </span>
        <X
          size={10}
          className="shrink-0 text-faint hover:text-fog"
          onClick={(e) => { e.stopPropagation(); setShown(null); }}
        />
      </button>
    </div>
  );
}
