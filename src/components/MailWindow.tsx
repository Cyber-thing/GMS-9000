import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Download, KeyRound, Mail, Paperclip, Trash2 } from "lucide-react";
import { cn } from "../utils/cn";
import { pickL, useT } from "../i18n";
import { sfx } from "../lib/sfx";
import { useGame } from "../game/state";
import type { MailThread, Mailbox } from "../game/mail";
import { resolveFile } from "../game/data";

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
  const { g, setFlag, revealKey, mailIntel, download } = useGame();
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

  /* Письмо, которое двигает сюжет (например, про увольнение): отмечаем прочтение. */
  useEffect(() => {
    if (!open?.setsFlag) return;
    const h = window.setTimeout(() => mailIntel(open.setsFlag!), 900);
    return () => clearTimeout(h);
  }, [open, mailIntel]);

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
      <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel2 px-3 py-[7px] text-[9.5px] uppercase tracking-[0.16em]">
        <Mail size={12} className="text-phos" />
        <span className="text-phosbrite">{t("mail.title")}</span>
        <span className="truncate text-faint">{mailbox.address}{mailbox.corp ? ` · ${mailbox.corp}` : ""} · {nodeCode}</span>
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
            open ? "hidden w-[280px] sm:block" : "w-full sm:w-[280px]"
          )}
        >
          <div className="border-b border-line px-3 py-[6px] text-[9px] uppercase tracking-[0.18em] text-faint">
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
                  "block w-full border-b border-line/60 px-3 py-[10px] text-left transition-colors",
                  active ? "bg-phos/12 shadow-[inset_2px_0_0_var(--color-phos)]" : "hover:bg-panel2"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {unread && <span className="h-[5px] w-[5px] shrink-0 bg-amber" />}
                  <span className={cn("truncate text-[12px] font-bold tracking-[0.08em]", active ? "text-phosbrite" : "text-fog")}>
                    {th.with}
                  </span>
                  <span className="ml-auto shrink-0 text-[9.5px] text-faint">{last(th).at}</span>
                </div>
                <div className="mt-[2px] truncate text-[11px] text-dim">
                  {pickL(lang, th.subject.en, th.subject.ru, th.subject.zh)}
                </div>
                <div className="truncate text-[10px] text-faint">
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
                  <div className="truncate text-[13px] font-bold text-fog">
                    {pickL(lang, open.subject.en, open.subject.ru, open.subject.zh)}
                  </div>
                  <div className="truncate text-[9.5px] uppercase tracking-[0.14em] text-faint">
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

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {open.msgs.map((m) => (
                  <div key={m.id} className={cn("flex", m.who === "me" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[92%] border px-3.5 py-[9px] sm:max-w-[80%]",
                        m.who === "me"
                          ? "border-phosdim/60 bg-phos/10"
                          : "border-line2 bg-panel/70"
                      )}
                    >
                      <div className="flex items-baseline gap-2 text-[9.5px] uppercase tracking-[0.14em]">
                        <span className={m.who === "me" ? "text-phosbrite" : "text-steel"}>
                          {m.who === "me" ? mailbox.owner : open.with}
                        </span>
                        <span className="text-faint">{m.at}</span>
                      </div>
                      <p className="mt-[4px] whitespace-pre-wrap text-[12.5px] leading-relaxed text-fog/90">
                        {pickL(lang, m.text.en, m.text.ru, m.text.zh)}
                      </p>
                      {m.attach && (() => {
                        const f = resolveFile(m.attach);
                        if (!f) return null;
                        const have = g.files.includes(f.id);
                        return (
                          <div className="mt-2 flex items-center gap-2 border border-amberdim/70 bg-amber/10 px-2.5 py-[6px]">
                            <Paperclip size={12} className="shrink-0 text-amber" />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11px] font-bold tracking-[0.06em] text-amber">
                                {pickL(lang, f.name, f.nameRu, f.nameZh)}
                              </div>
                              <div className="truncate text-[8.5px] uppercase tracking-[0.14em] text-faint">
                                {t(`dcat.${f.cat}`)} · {t("mail.attachNote")}
                              </div>
                            </div>
                            {have ? (
                              <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-phosbrite">
                                <Check size={11} /> {t("mail.saved")}
                              </span>
                            ) : (
                              <button
                                onClick={() => { sfx("click"); download(f.id); }}
                                className="flex shrink-0 items-center gap-1 border border-amberdim bg-amber/10 px-2 py-[4px] text-[9px] font-bold uppercase tracking-[0.12em] text-amber transition-colors hover:bg-amber hover:text-ink"
                              >
                                <Download size={11} /> {t("mail.download")}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}

                {keyShown && (
                  <div className="anim-msgin flex items-start gap-2 border border-amberdim bg-amber/10 px-2.5 py-2">
                    <KeyRound size={13} className="mt-[1px] shrink-0 text-amber" />
                    <p className="text-[10.5px] uppercase leading-relaxed tracking-[0.1em] text-amber">
                      {t("mail.keyNote")}
                    </p>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-line bg-soot px-3 py-[7px] text-[9px] uppercase tracking-[0.14em] text-faint">
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
