import { BookLock, MessagesSquare, UserRound, Activity } from "lucide-react";
import { cn } from "../utils/cn";
import { Panel } from "./chrome";
import { useT } from "../i18n";
import { useGame, TABS } from "../game/state";
import type { TabId } from "../game/types";
import type { ChannelId, ChatMsg } from "../data/chat";
import ChatPage from "./pages/ChatPage";
import { CodexPage, ContactsPage, StatusPage } from "./pages/GamePages";
import { useTut } from "../game/tutorial";

const ICONS: Record<TabId, React.ReactNode> = {
  CHAT: <MessagesSquare size={11} />,
  CODEX: <BookLock size={11} />,
  CONTACTS: <UserRound size={11} />,
  STATUS: <Activity size={11} />,
};

export default function SidePanel({
  tab,
  onTab,
  messages,
  activeCh,
  onSwitchCh,
  chUnread,
  onSend,
  operator,
  occupancy,
  contactsHome,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  messages: Record<ChannelId, ChatMsg[]>;
  activeCh: ChannelId;
  onSwitchCh: (ch: ChannelId) => void;
  chUnread: Record<ChannelId, number>;
  onSend: (text: string) => void;
  operator: string;
  occupancy: number;
  contactsHome: number;
}) {
  const { t } = useT();
  const { g } = useGame();
  const { hl, isHl, gating } = useTut();

  return (
    <Panel
      title={t(`tab.${tab}`)}
      accent={tab === "CHAT" ? "#cfa04b" : tab === "CODEX" ? "#7f95a8" : tab === "CONTACTS" ? "#8f86b8" : "#8fb56d"}
      className={cn("h-full", hl === "sidepanel" && "tut-ring")}
      bodyClassName="flex min-h-0 flex-col"
      right={
        tab === "STATUS" ? (
          <span className="flex items-center gap-2 text-[8px] tracking-[0.14em]">
            <span className="text-amber">{g.credits}cr</span>
            <span className="text-phos">{g.rep} REP</span>
          </span>
        ) : undefined
      }
    >
      {/* ---- 主标签栏 ---- */}
      <div className="flex shrink-0 border-b border-line2 bg-soot">
        {TABS.map((id) => {
          const active = id === tab;
          const badge = g.unread[id];
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-1 border-r border-line px-1 py-[7px] text-[8.5px] font-bold uppercase tracking-[0.1em] transition-colors last:border-r-0",
                active
                  ? "bg-panel text-phosbrite shadow-[inset_0_-2px_0_#8fb56d]"
                  : "text-faint hover:bg-panel2 hover:text-dim",
                isHl(`tab:${id}` as never) && "tut-ring",
                gating && hl !== "sidepanel" && !isHl(`tab:${id}` as never) && "tut-dim"
              )}
            >
              {ICONS[id]}
              <span className="hidden sm:inline">{t(`tab.${id}`)}</span>
              {badge > 0 && !active && (
                <span className="absolute right-[3px] top-[3px] h-[6px] w-[6px] animate-softpulse bg-amber" />
              )}
            </button>
          );
        })}
      </div>

      {/* ---- 页面 ---- */}
      {tab === "CHAT" && (
        <ChatPage
          messages={messages}
          active={activeCh}
          onSwitch={onSwitchCh}
          unread={chUnread}
          onSend={onSend}
          operator={operator}
          occupancy={occupancy}
        />
      )}
      {tab === "CODEX" && <CodexPage />}
      {tab === "CONTACTS" && <ContactsPage home={contactsHome} />}
      {tab === "STATUS" && <StatusPage operator={operator} />}
    </Panel>
  );
}
