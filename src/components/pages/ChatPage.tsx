import { useEffect, useRef, useState } from "react";
import { ChevronRight, Hash, Users } from "lucide-react";
import { cn } from "../../utils/cn";
import { CHANNELS, nickColor, type ChannelId, type ChatMsg } from "../../data/chat";
import { useT } from "../../i18n";

export default function ChatPage({
  messages,
  active,
  onSwitch,
  unread,
  onSend,
  operator,
  occupancy,
}: {
  messages: Record<ChannelId, ChatMsg[]>;
  active: ChannelId;
  onSwitch: (ch: ChannelId) => void;
  unread: Record<ChannelId, number>;
  onSend: (text: string) => void;
  operator: string;
  occupancy: number;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);

  useEffect(() => {
    const el = listRef.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, active]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    onSend(v.slice(0, 220));
    setDraft("");
    nearBottom.current = true;
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const list = messages[active];

  return (
    <div className="flex min-h-0 flex-1">
      {/* ---- 频道栏 ---- */}
      <div className="flex w-[82px] shrink-0 flex-col border-r border-line bg-soot sm:w-[94px]">
        <div className="border-b border-line px-2 py-[5px] text-[7.5px] uppercase tracking-[0.2em] text-faint">
          channels
        </div>
        {CHANNELS.map((ch) => {
          const isActive = ch === active;
          const u = unread[ch];
          return (
            <button
              key={ch}
              onClick={() => onSwitch(ch)}
              className={cn(
                "group flex items-center gap-1 border-b border-line/60 px-1.5 py-[7px] text-left transition-colors",
                isActive ? "bg-phos/12 shadow-[inset_2px_0_0_var(--color-phos)]" : "hover:bg-panel2"
              )}
            >
              <Hash size={9} className={cn("shrink-0", isActive ? "text-phos" : "text-faint")} />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[8.5px] font-bold uppercase tracking-[0.08em]",
                  isActive ? "text-phosbrite" : "text-dim group-hover:text-fog"
                )}
              >
                {t(`chs.${ch}`)}
              </span>
              {u > 0 && !isActive && (
                <span className="shrink-0 bg-amber/20 px-[3px] text-[7px] text-amber">{u > 99 ? "99" : u}</span>
              )}
            </button>
          );
        })}
        <div className="mt-auto flex items-center gap-1 border-t border-line px-2 py-[5px] text-[7.5px] tracking-[0.14em] text-faint">
          <Users size={9} /> {occupancy}
        </div>
      </div>

      {/* ---- 会话 ---- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel2 px-2 py-[4px]">
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-phosbrite">
            #{t(`ch.${active}`)}
          </span>
          <span className="truncate text-[8px] uppercase tracking-[0.12em] text-faint">
            {t(`topic.${active}`)}
          </span>
        </div>

        <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
          {list.map((m) => (
            <div key={m.id} className="anim-msgin py-[2px] text-[10.5px] leading-[1.45]">
              <span className="tabular-nums text-faint">{m.t}</span>{" "}
              <span
                className={cn("font-semibold", m.corp && "uppercase")}
                style={{ color: m.self ? "#cfa04b" : m.corp ? "#cfa04b" : nickColor(m.nick) }}
              >
                {m.self ? `[${m.nick}]` : m.corp ? `«${m.nick}»` : `<${m.nick}>`}
              </span>{" "}
              <span className={cn(m.corp ? "text-[#c9b183]" : m.self ? "text-[#ddd3ae]" : "text-fog/90")}>
                {m.text}
              </span>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-4 text-center text-[10px] text-faint">{t("chat.quiet")}</p>
          )}
        </div>

        <div className="flex h-[30px] shrink-0 items-center border-t border-line2 bg-well">
          <span className="flex shrink-0 items-center gap-1 pl-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-amber">
            <ChevronRight size={10} />
            <span className="hidden sm:inline">{operator.toLowerCase()}</span>
          </span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            maxLength={220}
            placeholder={t("chat.ph", { ch: t(`ch.${active}`).toLowerCase() })}
            className="h-full min-w-0 flex-1 bg-transparent px-2 text-[11px] text-fog placeholder:text-faint"
            spellCheck={false}
            autoComplete="off"
          />
          <button
            onClick={submit}
            className="h-full shrink-0 border-l border-line2 bg-panel px-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-phos transition-colors hover:bg-phos hover:text-ink"
          >
            {t("chat.send")}
          </button>
        </div>
      </div>
    </div>
  );
}
