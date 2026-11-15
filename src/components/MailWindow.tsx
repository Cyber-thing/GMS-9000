import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, Mail, Trash2 } from "lucide-react";
import { cn } from "../utils/cn";
import { pickL, useT } from "../i18n";
import { sfx } from "../lib/sfx";
import { useGame } from "../game/state";
import type { MailThread, MARROW_MAILBOX } from "../game/mail";

type Mailbox = typeof MARROW_MAILBOX;

/** Почтовый клиент на личной станции: список переписок и чат-подобный просмотр. */
export default function MailWindow({
  nodeCode,
  mailbox,
  onClose,
}: {
  nodeCode: string;
  mailbox: Mailbox;
  onClose: () => void;
}) {
  const { t, lang } = useT();
  const { g, setFlag, revealKey } = useGame();
  const [openId, setOpenId] = useState<string | null>(null);
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [confirmDel, setConfirmDel] = useState(false);

  const threads = useMemo(
    () => mailbox.threads.filter((th) => g.flags[`mail_del_${th.id}`] !== true),
    [mailbox, g.flags]
  );
  const open: MailThread | undefined = threads.find((th) => th.id === openId);

  /* Чтение письма с паролем: внизу экрана появляется уведомление с ключом. */
  useEffect(() => {
    if (!open?.revealsKeyOf) return;
    const h = window.setTimeout(() => revealKey(open.revealsKeyOf!), 700);
    return () => clearTimeout(h);
  }, [open, revealKey]);

  const keyShown = !!open?.revealsKeyOf && typeof g.flags[`key_${open.revealsKeyOf}`] === "string";

  const pick = (th: MailThread) => {
    sfx("click");
    setOpenId(th.id);
    setConfirmDel(false);
    setRead((r) => ({ ...r, [th.id]: true }));
  };

  const del = (th: MailThread) => {
    sfx("deny");
    setFlag(`mail_del_${th.id}`, true);
    setOpenId(null);
    setConfirmDel(false);
  };

  const last = (th: MailThread) => th.msgs[th.msgs.length - 1];

  return (
    <div className="anim-msgin absolute inset-0 z-10 flex min-h-0 flex-col bg-well">
      {/* верхняя панель */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel2 px-2.5 py-[5px] text-[8px] uppercase tracking-[0.16em]">
        <Mail size={10} className="text-phos" />
        <span className="text-phosbrite">{t("mail.title")}</span>
        <span className="truncate text-faint">{mailbox.address} · {nodeCode}</span>
        <button
          onClick={onClose}
          className="ml-auto flex shrink-0 items-center gap-1 border border-line3 px-2 py-[2px] text-[8px] font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:border-phos hover:text-phosbrite"
        >
          <ArrowLeft size={9} /> {t("mail.close")}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* список переписок */}
        <div
          className={cn(
            "min-h-0 shrink-0 overflow-y-auto border-r border-line bg-soot",
            open ? "hidden w-[190px] sm:block" : "w-full sm:w-[190px]"
          )}
        >
          <div className="border-b border-line px-2.5 py-[4px] text-[7.5px] uppercase tracking-[0.18em] text-faint">
            {t("mail.inbox", { n: threads.length })}
          </div>
          {threads.length === 0 && (
            <p className="px-2.5 py-3 text-[9.5px] text-faint">{t("mail.empty")}</p>
          )}
          {threads.map((th) => {
            const unread = !read[th.id];
            const active = th.id === openId;
            return (
              <button
                key={th.id}
                onClick={() => pick(th)}
                className={cn(
                  "block w-full border-b border-line/60 px-2.5 py-[7px] text-left transition-colors",
                  active ? "bg-phos/12 shadow-[inset_2px_0_0_var(--color-phos)]" : "hover:bg-panel2"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {unread && <span className="h-[5px] w-[5px] shrink-0 bg-amber" />}
                  <span className={cn("truncate text-[10px] font-bold tracking-[0.08em]", active ? "text-phosbrite" : "text-fog")}>
                    {th.with}
                  </span>
                  <span className="ml-auto shrink-0 text-[8px] text-faint">{last(th).at}</span>
                </div>
                <div className="mt-[1px] truncate text-[9.5px] text-dim">
                  {pickL(lang, th.subject.en, th.subject.ru, th.subject.zh)}
                </div>
                <div className="truncate text-[8.5px] text-faint">
                  {pickL(lang, last(th).text.en, last(th).text.ru, last(th).text.zh).replace(/\n+/g, " ")}
                </div>
              </button>
            );
          })}
        </div>

        {/* просмотр переписки */}
        <div className={cn("min-h-0 min-w-0 flex-1 flex-col", open ? "flex" : "hidden sm:flex")}>
          {open ? (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel2/70 px-2.5 py-[6px]">
                <button
                  onClick={() => setOpenId(null)}
                  className="flex shrink-0 items-center gap-1 border border-line3 px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.12em] text-dim hover:border-phos hover:text-phosbrite sm:hidden"
                >
                  <ArrowLeft size={9} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10.5px] font-bold text-fog">
                    {pickL(lang, open.subject.en, open.subject.ru, open.subject.zh)}
                  </div>
                  <div className="truncate text-[8px] uppercase tracking-[0.14em] text-faint">
                    {open.with} · {pickL(lang, open.role.en, open.role.ru, open.role.zh)}
                  </div>
                </div>
                {confirmDel ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => del(open)}
                      className="border border-oxide bg-oxide/20 px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.12em] text-oxide hover:bg-oxide hover:text-ink"
                    >
                      {t("mail.confirmDel")}
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="border border-line3 px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.12em] text-dim hover:text-fog"
                    >
                      {t("mail.cancel")}
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmDel(true)}
                    title={t("mail.delete")}
                    className="flex shrink-0 items-center gap-1 border border-line3 px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.12em] text-dim transition-colors hover:border-oxide hover:text-oxide"
                  >
                    <Trash2 size={9} /> {t("mail.delete")}
                  </button>
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2.5">
                {open.msgs.map((m) => (
                  <div key={m.id} className={cn("flex", m.who === "me" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[88%] border px-2.5 py-[6px]",
                        m.who === "me"
                          ? "border-phosdim/60 bg-phos/10"
                          : "border-line2 bg-panel/70"
                      )}
                    >
                      <div className="flex items-baseline gap-2 text-[8px] uppercase tracking-[0.14em]">
                        <span className={m.who === "me" ? "text-phosbrite" : "text-steel"}>
                          {m.who === "me" ? mailbox.owner : open.with}
                        </span>
                        <span className="text-faint">{m.at}</span>
                      </div>
                      <p className="mt-[3px] whitespace-pre-wrap text-[10.5px] leading-snug text-fog/90">
                        {pickL(lang, m.text.en, m.text.ru, m.text.zh)}
                      </p>
                    </div>
                  </div>
                ))}

                {keyShown && (
                  <div className="anim-msgin flex items-start gap-2 border border-amberdim bg-amber/10 px-2.5 py-2">
                    <KeyRound size={13} className="mt-[1px] shrink-0 text-amber" />
                    <p className="text-[9.5px] uppercase leading-relaxed tracking-[0.1em] text-amber">
                      {t("mail.keyNote")}
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-line bg-soot px-2.5 py-[6px] text-[8px] uppercase tracking-[0.14em] text-faint">
                {t("mail.readOnly")}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 text-center text-[9px] uppercase tracking-[0.16em] text-faint">
              {t("mail.pick")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
