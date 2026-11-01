import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine, ArrowLeft, BookLock, CheckCircle2, CircleDollarSign, Database,
  FileLock2, Handshake, Star, TrendingUp, Upload, UserRound, Zap,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useT } from "../../i18n";
import { useGame } from "../../game/state";
import {
  CODEX, CONTACTS, CONTRACTS, FACTIONS, SCRIPTS, UPGRADES,
  codexById, contactById, contractById, factionById, resolveFile,
} from "../../game/data";
import { ALL_NODES } from "../../data/regions";
import type { CodexCat } from "../../game/types";
import { useTut } from "../../game/tutorial";

/* ================================================================== */
/* CODEX                                                               */
/* ================================================================== */

const CATS: CodexCat[] = ["FACTIONS", "CHARACTERS", "LOCATIONS", "NETWORK", "INTEL"];

export function CodexPage() {
  const { t, lang } = useT();
  const { g, markCodexSeen } = useGame();
  const [cat, setCat] = useState<CodexCat>("FACTIONS");
  const [open, setOpen] = useState<string | null>(null);

  const entries = useMemo(() => CODEX.filter((c) => c.cat === cat), [cat]);
  const known = CODEX.filter((c) => g.codex[c.id] !== "UNKNOWN").length;
  const entry = open ? codexById(open) : null;

  if (entry) {
    const stt = g.codex[entry.id];
    const fac = entry.faction ? factionById(entry.faction) : null;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <button
          onClick={() => setOpen(null)}
          className="flex shrink-0 items-center gap-1.5 border-b border-line bg-panel2 px-2 py-[5px] text-[8.5px] font-bold uppercase tracking-[0.16em] text-dim hover:text-phos"
        >
          <ArrowLeft size={10} /> {t("cx.cat." + entry.cat)}
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="pixel text-[22px] leading-none text-phosbrite">
              {lang === "ru" ? entry.titleRu : entry.title}
            </h3>
            <span
              className="shrink-0 border px-1.5 py-[2px] text-[7.5px] font-bold tracking-[0.14em]"
              style={{
                color: stt === "UPDATED" ? "#cfa04b" : stt === "DISCOVERED" ? "#8fb56d" : "#59604f",
                borderColor: stt === "UNKNOWN" ? "#39422d" : "currentColor",
              }}
            >
              {t(`cx.state.${stt}`)}
            </span>
          </div>
          {fac && (
            <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-faint">
              {t("cx.src")}: {lang === "ru" ? fac.nameRu : fac.name}
            </div>
          )}
          <div className="mt-2 border-t border-line pt-2">
            {stt === "UNKNOWN" ? (
              <p className="text-[10px] leading-relaxed text-faint">
                ▒▒▒▒ ▒▒▒▒▒▒ ▒▒▒ ▒▒▒▒▒▒▒▒ ▒▒▒▒ ▒▒▒▒▒▒▒▒▒ ▒▒▒▒▒
                <br />
                <span className="mt-2 block text-amberdim">{t("cx.classified")}</span>
              </p>
            ) : (
              <p className="text-[11px] leading-relaxed text-fog/90">
                {lang === "ru" ? entry.bodyRu : entry.body}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* category rail */}
      <div className="flex shrink-0 overflow-x-auto border-b border-line bg-soot">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "shrink-0 border-r border-line px-2 py-[6px] text-[7.5px] font-bold uppercase tracking-[0.1em] transition-colors",
              c === cat ? "bg-phos/12 text-phosbrite shadow-[inset_0_-2px_0_#8fb56d]" : "text-faint hover:text-dim"
            )}
          >
            {t(`cx.cat.${c}`)}
          </button>
        ))}
        <span className="ml-auto shrink-0 px-2 py-[6px] text-[7.5px] tracking-[0.14em] text-faint">
          {t("cx.known", { a: known, b: CODEX.length })}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {entries.map((e) => {
          const stt = g.codex[e.id];
          const unseen = stt !== "UNKNOWN" && !g.codexSeen[e.id];
          return (
            <button
              key={e.id}
              onClick={() => {
                setOpen(e.id);
                markCodexSeen(e.id);
              }}
              className="flex w-full items-center gap-2 border-b border-line/60 px-2.5 py-[7px] text-left transition-colors hover:bg-panel2"
            >
              <BookLock
                size={11}
                className="shrink-0"
                style={{ color: stt === "UNKNOWN" ? "#4c5545" : stt === "UPDATED" ? "#cfa04b" : "#8fb56d" }}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[10.5px]",
                  stt === "UNKNOWN" ? "text-faint" : "text-fog"
                )}
              >
                {stt === "UNKNOWN" ? "████████ ███████" : lang === "ru" ? e.titleRu : e.title}
              </span>
              {unseen && (
                <span className="shrink-0 bg-amber px-[3px] text-[7px] font-bold text-ink">{t("tab.new")}</span>
              )}
            </button>
          );
        })}

        {/* update log */}
        {g.codexLog.length > 0 && (
          <div className="border-t border-line2 p-2.5">
            <div className="text-[8px] uppercase tracking-[0.2em] text-faint">{t("cx.log")}</div>
            <div className="mt-1 space-y-[2px]">
              {[...g.codexLog].reverse().slice(0, 8).map((l, i) => {
                const e = codexById(l.id);
                return (
                  <div key={i} className="flex items-baseline gap-1.5 text-[9.5px]">
                    <span className="tabular-nums text-faint">{l.t}</span>
                    <span style={{ color: l.updated ? "#cfa04b" : "#8fb56d" }}>{l.updated ? "~" : "+"}</span>
                    <span className="truncate text-dim">{e ? (lang === "ru" ? e.titleRu : e.title) : l.id}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* CONTACTS                                                            */
/* ================================================================== */

export function ContactsPage({ home = 0 }: { home?: number }) {
  const { t, lang } = useT();
  const { g, acceptContract, deliverContract, pickChoice, markThreadRead } = useGame();
  const { isHl, gating, fire } = useTut();
  const [open, setOpen] = useState<string | null>(null);
  /* a bumped `home` means the game wants the operator back on the thread list */
  useEffect(() => { if (home > 0) setOpen(null); }, [home]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const offerRef = useRef<HTMLDivElement>(null);

  const jumpToOffer = () =>
    offerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  /* opening a thread lands on the live job, not at the top of the backlog */
  useEffect(() => {
    if (!open) return;
    const h = setTimeout(() => {
      if (offerRef.current) jumpToOffer();
      else if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, 60);
    return () => clearTimeout(h);
  }, [open]);

  const unlocked = CONTACTS.filter((c) => g.contacts.includes(c.id));
  const locked = CONTACTS.filter((c) => !g.contacts.includes(c.id));

  if (open) {
    const c = contactById(open)!;
    const thread = g.threads[open] ?? [];
    const fac = factionById(c.faction);
    const threadBlocked = c.id === "op17"
      ? g.flags.op17_blocked === true
      : c.id === "sablec" ? g.flags.sable_blocked === true : false;
    /* every job with this contact is settled and nothing awaits an answer */
    const mine = CONTRACTS.filter((x) => x.contact === c.id && g.contracts[x.id]);
    const threadClosed =
      mine.length > 0 &&
      mine.every((x) => ["COMPLETED", "FAILED"].includes(g.contracts[x.id].state)) &&
      !thread.some((m) => m.choices && !m.picked);
    const hasLiveJob = CONTRACTS.some(
      (x) =>
        x.contact === c.id && g.contracts[x.id] &&
        !["COMPLETED", "FAILED"].includes(g.contracts[x.id].state)
    );
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-line bg-panel2 px-2 py-[5px]">
          <button onClick={() => setOpen(null)} className="text-dim hover:text-phos">
            <ArrowLeft size={11} />
          </button>
          <span className="text-[10px] font-bold tracking-[0.1em] text-phosbrite">{c.nick}</span>
          <span className="truncate text-[7.5px] uppercase tracking-[0.14em] text-faint">
            {lang === "ru" ? c.roleRu : c.role} · {fac ? (lang === "ru" ? fac.nameRu : fac.name) : ""}
          </span>
          {hasLiveJob && (
            <button
              onClick={jumpToOffer}
              title={t("co.jumpTip")}
              className="ml-auto flex shrink-0 items-center gap-1 border border-amberdim bg-amber/10 px-1.5 py-[2px] text-[7.5px] font-bold uppercase tracking-[0.12em] text-amber transition-colors hover:bg-amber hover:text-ink"
            >
              <ArrowDownToLine size={8} /> {t("co.jump")}
            </button>
          )}
        </div>

        <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {thread.map((m) => {
            const mine = m.from === "OP";
            const ct = m.contract ? contractById(m.contract) : null;
            const pr = ct ? g.contracts[ct.id] : null;
            const liveJob =
              !!ct && !!pr && !["COMPLETED", "FAILED"].includes(pr.state) &&
              (m.action === "offer" || m.action === "deliver");
            return (
              <div key={m.id} ref={liveJob ? offerRef : undefined} className="anim-msgin mb-1.5">
                <div className="flex items-baseline gap-1.5 text-[10.5px] leading-snug">
                  <span className="shrink-0 tabular-nums text-faint">{m.t}</span>
                  <span className={cn("shrink-0 font-bold", mine ? "text-amber" : "text-steel")}>
                    {mine ? t("co.you") : c.nick}
                  </span>
                </div>
                <p className={cn("pl-1 text-[10.5px] leading-snug", mine ? "text-[#ddd3ae]" : "text-fog/90")}>
                  {(lang === "ru" ? m.textRu : m.textEn) ?? m.text}
                </p>

                {/* contract card */}
                {ct && m.action === "offer" && (
                  <div className="mt-1 border border-line2 bg-well p-2">
                    <div className="text-[10px] font-bold tracking-[0.1em] text-phosbrite">
                      {lang === "ru" ? ct.titleRu : ct.title}
                    </div>
                    <div className="mt-1 space-y-[2px] text-[9px] text-dim">
                      <div>
                        {t("co.target")}: <span className="text-fog">{ALL_NODES.find((n) => n.id === ct.target)?.code}</span>
                      </div>
                      {ct.file && (
                        <div>
                          {t("co.file")}: <span className="text-fog">{resolveFile(ct.file)?.name}</span>
                        </div>
                      )}
                      <div>
                        <span
                          className="border px-1 text-[7.5px] font-bold uppercase tracking-[0.1em]"
                          style={
                            ct.kind === "SABOTAGE"
                              ? { color: "#e0634a", borderColor: "#c25b4666" }
                              : { color: "#7f95a8", borderColor: "#7f95a866" }
                          }
                        >
                          {t(`co.kind.${ct.kind}`)}
                        </span>
                      </div>
                      <div>
                        {t("co.payout")}:{" "}
                        <span className="text-amber">{ct.credits}cr</span> ·{" "}
                        <span className="text-phos">+{ct.rep} REP</span>
                      </div>
                      <div>
                        {t("co.cstate")}:{" "}
                        <span className="text-viole">{t(`cs.${pr?.state ?? "AVAILABLE"}`)}</span>
                      </div>
                    </div>
                    {pr?.state === "AVAILABLE" && (
                      <button
                        onClick={() => acceptContract(ct.id)}
                        className={cn(
                          "mt-1.5 w-full border border-phosdim bg-phos/10 py-[5px] text-[9px] font-bold uppercase tracking-[0.14em] text-phosbrite transition-colors hover:bg-phos hover:text-ink",
                          isHl("offer") && "tut-ring"
                        )}
                      >
                        {t("co.accept")}
                      </button>
                    )}
                  </div>
                )}

                {ct && m.action === "deliver" &&
                  (pr?.state === "DATA ACQUIRED" || pr?.state === "SABOTAGED") && (
                  <button
                    onClick={() => deliverContract(ct.id)}
                    className={cn(
                      "mt-1 flex w-full items-center justify-center gap-1.5 border border-amberdim bg-amber/10 py-[6px] text-[9px] font-bold uppercase tracking-[0.14em] text-amber transition-colors hover:bg-amber hover:text-ink",
                      isHl("deliver") && "tut-ring"
                    )}
                  >
                    <Upload size={10} /> {ct.kind === "SABOTAGE" ? t("co.confirm") : t("co.deliver")}
                  </button>
                )}

                {/* scripted reply buttons */}
                {m.choices && !m.picked && (
                  <div className="mt-1 flex flex-col gap-1">
                    {m.choices.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => pickChoice(m.id, ch.id)}
                        className="border border-phosdim/70 bg-phos/8 px-2 py-[6px] text-left text-[9.5px] font-bold uppercase tracking-[0.1em] text-phosbrite transition-colors hover:bg-phos hover:text-ink"
                      >
                        ▸ {lang === "ru" ? ch.ru : ch.en}
                      </button>
                    ))}
                  </div>
                )}

                {ct && m.action === "done" && (
                  <div className="mt-1 flex items-center gap-1.5 border border-phosdim/40 bg-phos/5 px-2 py-[4px] text-[9px] font-bold uppercase tracking-[0.14em] text-phos">
                    <CheckCircle2 size={10} /> {t("cs.COMPLETED")}
                  </div>
                )}
              </div>
            );
          })}

          {threadBlocked && (
            <div className="anim-msgin mt-2 border border-oxide bg-oxide/12 px-2.5 py-2 text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-oxide">
                {t("co.blocked")}
              </div>
              <div className="mt-[2px] text-[8.5px] uppercase tracking-[0.12em] text-oxide/70">
                {t("co.blockedBody")}
              </div>
            </div>
          )}
          {!threadBlocked && threadClosed && (
            <div className="mt-2 border border-line2 bg-panel2 py-[6px] text-center text-[9px] font-bold uppercase tracking-[0.18em] text-faint">
              ✓ {t("co.finished")}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {unlocked.length === 0 && <p className="p-3 text-[10px] text-faint">{t("co.none")}</p>}
      {unlocked.map((c) => {
        const thread = g.threads[c.id] ?? [];
        const last = thread[thread.length - 1];
        const fac = factionById(c.faction);
        const activeCt = CONTRACTS.filter(
          (ct) => ct.contact === c.id && g.contracts[ct.id] && g.contracts[ct.id].state !== "COMPLETED"
        );
        const unread = (g.threadRead?.[c.id] ?? 0) < thread.length;
        const blocked = c.id === "op17"
          ? g.flags.op17_blocked === true
          : c.id === "sablec" ? g.flags.sable_blocked === true : false;
        return (
          <button
            key={c.id}
            onClick={() => {
              setOpen(c.id);
              markThreadRead(c.id);
              fire(`thread:${c.id}` as never);
            }}
            className={cn(
              "flex w-full items-start gap-2 border-b border-line/60 px-2.5 py-[8px] text-left transition-colors hover:bg-panel2",
              isHl(`thread:${c.id}` as never) && "tut-ring",
              gating && !isHl(`thread:${c.id}` as never) && "tut-dim"
            )}
          >
            <UserRound size={13} className="mt-[2px] shrink-0 text-steel" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.08em] text-phosbrite">{c.nick}</span>
                <span className="truncate text-[7.5px] uppercase tracking-[0.14em] text-faint">
                  {fac ? (lang === "ru" ? fac.nameRu : fac.name) : ""}
                </span>
              </div>
              {last && (
                <p className="mt-[1px] truncate text-[9.5px] text-dim">
                  {(lang === "ru" ? last.textRu : last.textEn) ?? last.text}
                </p>
              )}
              <span className="mt-[3px] flex items-center gap-1.5">
                {unread && (
                  <span className="animate-softpulse bg-amber px-[5px] py-[1px] text-[9px] font-bold uppercase tracking-[0.16em] text-ink">
                    {t("tab.new")}
                  </span>
                )}
                {blocked && (
                  <span className="border border-oxide px-[4px] text-[7.5px] font-bold uppercase tracking-[0.12em] text-oxide">
                    {t("co.blocked")}
                  </span>
                )}
                {!unread && !blocked && activeCt.length > 0 && (
                  <span className="bg-viole/20 px-[4px] text-[7.5px] font-bold uppercase tracking-[0.12em] text-viole">
                    {t(`cs.${g.contracts[activeCt[0].id].state}`)}
                  </span>
                )}
              </span>
            </div>
          </button>
        );
      })}

      {locked.map((c) => (
        <div key={c.id} className="flex items-center gap-2 border-b border-line/60 px-2.5 py-[7px] opacity-50">
          <FileLock2 size={12} className="shrink-0 text-faint" />
          <span className="flex-1 text-[10px] text-faint">████████</span>
          <span className="text-[8px] uppercase tracking-[0.12em] text-faint">
            {t("co.locked", { n: c.repReq })}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* STATUS                                                              */
/* ================================================================== */

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-b border-line">
      <div className="flex items-center gap-1.5 bg-soot px-2.5 py-[5px] text-[8px] font-bold uppercase tracking-[0.2em] text-dim">
        {icon}
        {title}
      </div>
      <div className="px-2.5 py-2">{children}</div>
    </div>
  );
}

function Row({ k, v, vc }: { k: string; v: React.ReactNode; vc?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-[2px]">
      <span className="text-[9px] uppercase tracking-[0.14em] text-faint">{k}</span>
      <span className="text-[11px] tabular-nums" style={vc ? { color: vc } : undefined}>
        {v}
      </span>
    </div>
  );
}

export function StatusPage({ operator }: { operator: string }) {
  const { t, lang } = useT();
  const { g, buyUpgrade } = useGame();

  const uid = useMemo(() => {
    let h = 0;
    for (let i = 0; i < operator.length; i++) h = (h * 31 + operator.charCodeAt(i)) >>> 0;
    return `0x${h.toString(16).toUpperCase().padStart(8, "0").slice(0, 8)}`;
  }, [operator]);

  const relLabel = (v: number) =>
    v <= -20 ? t("sp.hostile") : v >= 20 ? t("sp.friendly") : t("sp.neutral");
  const relColor = (v: number) => (v <= -20 ? "#c25b46" : v >= 20 ? "#8fb56d" : "#77806b");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Section title={t("sp.profile")} icon={<UserRound size={10} />}>
        <Row k={t("sp.handle")} v={operator} vc="#b3d98d" />
        <Row k={t("sp.uid")} v={uid} vc="#77806b" />
      </Section>

      <div className="grid grid-cols-2 border-b border-line">
        <div className="border-r border-line px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.18em] text-faint">
            <CircleDollarSign size={10} /> {t("sp.credits")}
          </div>
          <div className="pixel mt-[2px] text-[24px] leading-none text-amber">{g.credits}</div>
        </div>
        <div className="px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.18em] text-faint">
            <Star size={10} /> {t("sp.rep")}
          </div>
          <div className="pixel mt-[2px] text-[24px] leading-none text-phosbrite">{g.rep}</div>
        </div>
      </div>

      <Section title={t("sp.factions")} icon={<Handshake size={10} />}>
        {FACTIONS.filter((f) => f.id !== "indep").map((f) => {
          const v = g.relations[f.id] ?? 0;
          const pct = Math.max(0, Math.min(100, 50 + v / 2));
          return (
            <div key={f.id} className="py-[3px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[10px] text-fog">{lang === "ru" ? f.nameRu : f.name}</span>
                <span className="shrink-0 text-[9.5px] tabular-nums" style={{ color: relColor(v) }}>
                  {v > 0 ? "+" : ""}
                  {v} · {relLabel(v)}
                </span>
              </div>
              <div className="mt-[2px] h-[4px] w-full bg-well">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: relColor(v), opacity: 0.75 }}
                />
              </div>
            </div>
          );
        })}
      </Section>

      <Section title={t("sp.scripts")} icon={<Zap size={10} />}>
        {g.market.scripts.length === 0 ? (
          <p className="text-[10px] text-faint">{t("sp.noScripts")}</p>
        ) : (
          <div className="space-y-1">
            {SCRIPTS.filter((sc) => g.market.scripts.includes(sc.id)).map((sc) => (
              <div key={sc.id} className="border border-viole/40 bg-viole/5 px-2 py-[5px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[10px] text-viole">
                    {lang === "ru" ? sc.nameRu : sc.name}
                  </span>
                  <span className="shrink-0 text-[8px] uppercase tracking-[0.12em] text-faint">
                    {t("bm.cd", { n: sc.cooldown })}
                  </span>
                </div>
                <p className="mt-[2px] text-[9px] leading-snug text-faint">
                  {lang === "ru" ? sc.descRu : sc.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("sp.stats")} icon={<TrendingUp size={10} />}>
        <Row k={t("sp.hacks")} v={g.stats.hacks} vc="#8fb56d" />
        <Row k={t("sp.contracts")} v={g.stats.contracts} vc="#cfa04b" />
        <Row k={t("sp.files")} v={g.stats.files} vc="#7f95a8" />
        <Row k={t("sp.nodes")} v={g.stats.nodes} vc="#8f86b8" />
        <Row k={t("sp.sabotage")} v={g.stats.sabotage} vc="#c25b46" />
        <Row k={t("sp.sold")} v={g.stats.sold} vc="#cfa04b" />
        <Row k={t("sp.failed")} v={g.stats.failed} vc="#c25b46" />
      </Section>

      <Section title={t("sp.storage")} icon={<Database size={10} />}>
        {g.files.length === 0 ? (
          <p className="text-[10px] text-faint">{t("sp.empty")}</p>
        ) : (
          <div className="space-y-[3px]">
            {g.files.map((id) => {
              const f = resolveFile(id);
              if (!f) return null;
              return (
                <div key={id} className="flex items-center gap-2 border border-line bg-well px-2 py-[4px]">
                  <Database size={9} className="shrink-0 text-steel" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10px] text-fog">{lang === "ru" ? f.nameRu : f.name}</div>
                    <div className="truncate text-[7.5px] uppercase tracking-[0.12em] text-faint">
                      {t(`dcat.${f.cat}`)}
                    </div>
                  </div>
                  <span className="shrink-0 text-[9px] tabular-nums text-amberdim">{f.value}cr</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title={t("sp.upgrades")} icon={<Database size={10} />}>
        {UPGRADES.map((u) => {
          const owned = g.upgrades.includes(u.id);
          const repOk = g.rep >= u.repReq;
          const crOk = g.credits >= u.credits;
          return (
            <div key={u.id} className="border border-line bg-well p-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-bold tracking-[0.08em] text-phosbrite">
                  {lang === "ru" ? u.nameRu : u.name}
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-amber">{u.credits}cr</span>
              </div>
              <p className="mt-1 text-[9.5px] leading-snug text-dim">{lang === "ru" ? u.descRu : u.desc}</p>
              {owned ? (
                <div className="mt-1.5 border border-phosdim/50 bg-phos/10 py-[5px] text-center text-[9px] font-bold uppercase tracking-[0.16em] text-phos">
                  ✓ {t("sp.owned")}
                </div>
              ) : (
                <button
                  onClick={() => buyUpgrade(u.id)}
                  disabled={!repOk || !crOk}
                  className={cn(
                    "mt-1.5 w-full border py-[5px] text-[9px] font-bold uppercase tracking-[0.16em] transition-colors",
                    repOk && crOk
                      ? "border-amberdim bg-amber/10 text-amber hover:bg-amber hover:text-ink"
                      : "cursor-not-allowed border-line text-faint"
                  )}
                >
                  {!repOk ? t("sp.needRep", { n: u.repReq }) : !crOk ? t("sp.needCr") : t("sp.buy")}
                </button>
              )}
            </div>
          );
        })}
      </Section>
    </div>
  );
}
