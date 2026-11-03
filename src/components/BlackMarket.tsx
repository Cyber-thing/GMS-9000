import { useState } from "react";
import { Banknote, Lock, ShoppingBag, Skull, TriangleAlert, X, Zap } from "lucide-react";
import { cn } from "../utils/cn";
import { pickL, useT } from "../i18n";
import { useGame } from "../game/state";
import { CFG, CONTRACTS, SCRIPTS, factionById, resolveFile } from "../game/data";
import { ALL_NODES } from "../data/regions";

type Tab = "sell" | "buy" | "jobs";

/* 黑市使用红色视觉语言，是控制台中的高风险界面。 */
const RED = "#c25b46";

export default function BlackMarket({
  onClose,
  onLog,
}: {
  onClose: () => void;
  onLog: (key: string, params?: Record<string, string | number>) => void;
}) {
  const { t, lang } = useT();
  const { g, openMarket, buyScript, sellFile, acceptContract, fenceValue } = useGame();
  const [tab, setTab] = useState<Tab>("sell");

  const unlocked = g.market.unlocked;

  /* 锁定入口。 */
  if (!unlocked) {
    const afford = g.credits >= CFG.marketPrice;
    return (
      <Shell onClose={onClose} tab={tab} setTab={setTab} locked>
        <div className="flex flex-col items-center px-5 py-6 text-center">
          <Lock size={26} style={{ color: RED }} />
          <div className="pixel mt-2 text-[22px] leading-none" style={{ color: RED }}>
            {t("bm.locked")}
          </div>
          <p className="mt-2 max-w-[400px] text-[10.5px] leading-relaxed text-dim">
            {t("bm.lockedBody")}
          </p>
          <button
            disabled={!afford}
            onClick={() => {
              if (openMarket()) onLog("t.marketOpen");
            }}
            className={cn(
              "mt-4 w-full max-w-[300px] border px-4 py-[9px] text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
              afford
                ? "border-[#c25b46] bg-[#c25b46]/15 text-[#e0634a] hover:bg-[#c25b46] hover:text-ink"
                : "cursor-not-allowed border-line text-faint"
            )}
          >
            {afford ? t("bm.buyAccess", { n: CFG.marketPrice }) : t("bm.needCr")}
          </button>
          <div className="mt-2 text-[9px] tabular-nums text-faint">
            {g.credits} / {CFG.marketPrice} cr
          </div>
        </div>
      </Shell>
    );
  }

  /* 标记已承诺给未完成合同的数据文件。 */
  const owedBy = (fileId: string) =>
    CONTRACTS.find(
      (ct) =>
        ct.kind === "DATA" && ct.file === fileId &&
        g.contracts[ct.id] &&
        !["COMPLETED", "FAILED"].includes(g.contracts[ct.id].state)
    );

  const crewJobs = CONTRACTS.filter(
    (ct) => ct.market && g.contracts[ct.id] && g.contracts[ct.id].state !== "COMPLETED"
  );

  return (
    <Shell onClose={onClose} tab={tab} setTab={setTab}>
      {}
      {tab === "sell" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {g.files.length === 0 && (
            <p className="px-1 py-3 text-[10px] text-faint">{t("bm.sellEmpty")}</p>
          )}
          {g.files.map((id) => {
            const f = resolveFile(id);
            if (!f) return null;
            const v = fenceValue(id);
            const price = typeof v === "number" ? v : v.credits;
            const spent = typeof v === "number" ? false : v.spent;
            const owed = owedBy(id);
            const client = owed ? factionById(owed.client) : null;
            return (
              <div
                key={id}
                className={cn(
                  "mb-1.5 border px-2 py-[6px]",
                  owed ? "border-[#c25b46]/60 bg-[#c25b46]/8" : "border-line bg-well"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10.5px] text-fog">
                      {pickL(lang, f.name, f.nameRu, f.nameZh)}
                    </div>
                    <div className="truncate text-[7.5px] uppercase tracking-[0.12em] text-faint">
                      {t(`dcat.${f.cat}`)}
                      {spent && <span className="ml-1 text-oxide">· {t("bm.spent")}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const r = sellFile(id);
                      if (!r) return;
                      onLog("t.sold", { name: pickL(lang, f.name, f.nameRu, f.nameZh), n: r.credits });
                      if (owed) onLog("t.betray", { title: pickL(lang, owed.title, owed.titleRu, owed.titleZh) });
                    }}
                    className="shrink-0 border border-[#c25b46] bg-[#c25b46]/15 px-2 py-[4px] text-[9px] font-bold uppercase tracking-[0.12em] text-[#e0634a] transition-colors hover:bg-[#c25b46] hover:text-ink"
                  >
                    {t("bm.sell")} · {price}cr
                  </button>
                </div>
                {spent && (
                  <div className="mt-1 border-t border-line pt-1 text-[8.5px] leading-snug text-faint">
                    {t("bm.spentWarn")}
                  </div>
                )}
                {owed && !spent && (
                  <div className="mt-1 flex items-start gap-1.5 border-t border-[#c25b46]/30 pt-1">
                    <TriangleAlert size={10} className="mt-[1px] shrink-0" style={{ color: RED }} />
                    <div className="min-w-0">
                      <div className="text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: RED }}>
                        {t("bm.owed", { who: client ? (pickL(lang, client.name, client.nameRu, client.nameZh)) : "" })}
                      </div>
                      <div className="text-[8.5px] leading-snug text-dim">{t("bm.owedWarn")}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {}
      {tab === "buy" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {SCRIPTS.map((sc) => {
            const have = g.market.scripts.includes(sc.id);
            const afford = g.credits >= sc.price;
            return (
              <div key={sc.id} className="mb-1.5 border border-line bg-well p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    {sc.freeze ? <Skull size={11} style={{ color: RED }} /> : <Zap size={11} style={{ color: RED }} />}
                    <span className="text-[10.5px] font-bold tracking-[0.06em] text-fog">
                      {pickL(lang, sc.name, sc.nameRu, sc.nameZh)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-faint">
                    {t("bm.cd", { n: sc.cooldown })}
                  </span>
                </div>
                <p className="mt-1 text-[9.5px] leading-snug text-dim">
                  {pickL(lang, sc.desc, sc.descRu, sc.descZh)}
                </p>
                {have ? (
                  <div className="mt-1.5 border border-phosdim/50 bg-phos/10 py-[5px] text-center text-[9px] font-bold uppercase tracking-[0.14em] text-phos">
                    ✓ {t("bm.owned")}
                  </div>
                ) : (
                  <button
                    disabled={!afford}
                    onClick={() => {
                      if (buyScript(sc.id)) onLog("t.script", { name: pickL(lang, sc.name, sc.nameRu, sc.nameZh) });
                    }}
                    className={cn(
                      "mt-1.5 w-full border py-[5px] text-[9px] font-bold uppercase tracking-[0.14em] transition-colors",
                      afford
                        ? "border-[#c25b46] bg-[#c25b46]/15 text-[#e0634a] hover:bg-[#c25b46] hover:text-ink"
                        : "cursor-not-allowed border-line text-faint"
                    )}
                  >
                    {afford ? t("bm.buy", { n: sc.price }) : t("bm.needCr")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {}
      {tab === "jobs" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <p className="mb-1.5 px-1 text-[8.5px] uppercase leading-snug tracking-[0.12em] text-faint">
            {t("bm.jobsHint")}
          </p>
          {crewJobs.length === 0 && (
            <p className="px-1 py-2 text-[10px] text-faint">{t("bm.jobsEmpty")}</p>
          )}
          {crewJobs.map((ct) => {
            const pr = g.contracts[ct.id];
            const node = ALL_NODES.find((n) => n.id === ct.target);
            const client = factionById(ct.client);
            return (
              <div key={ct.id} className="mb-1.5 border border-[#c25b46]/40 bg-[#c25b46]/6 p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[10.5px] font-bold tracking-[0.06em]" style={{ color: "#e0634a" }}>
                    {pickL(lang, ct.title, ct.titleRu, ct.titleZh)}
                  </span>
                  <span className="shrink-0 border px-1 text-[7.5px] font-bold uppercase tracking-[0.1em]"
                    style={{ color: RED, borderColor: `${RED}66` }}>
                    {t(`co.kind.${ct.kind}`)}
                  </span>
                </div>
                <p className="mt-1 text-[9.5px] leading-snug text-dim">
                  {pickL(lang, ct.brief, ct.briefRu, ct.briefZh)}
                </p>
                <div className="mt-1 space-y-[2px] border-t border-line pt-1 text-[9px] text-faint">
                  <div>{t("co.target")}: <span className="text-fog">{node?.code}</span></div>
                  <div>
                    {t("co.payout")}: <span className="text-amber">{ct.credits}cr</span> ·{" "}
                    <span className="text-phos">+{ct.rep} REP</span>
                  </div>
                  <div>
                    {t("co.cstate")}: <span className="text-viole">{t(`cs.${pr.state}`)}</span>
                    {client && <span className="ml-1 text-faint">· {pickL(lang, client.name, client.nameRu, client.nameZh)}</span>}
                  </div>
                </div>
                {pr.state === "AVAILABLE" && (
                  <button
                    onClick={() => {
                      acceptContract(ct.id);
                      onLog("t.jobTaken", { title: pickL(lang, ct.title, ct.titleRu, ct.titleZh) });
                    }}
                    className="mt-1.5 w-full border border-[#c25b46] bg-[#c25b46]/15 py-[6px] text-[9px] font-bold uppercase tracking-[0.14em] text-[#e0634a] transition-colors hover:bg-[#c25b46] hover:text-ink"
                  >
                    {t("co.accept")}
                  </button>
                )}
                {pr.state !== "AVAILABLE" && pr.state !== "COMPLETED" && (
                  <div className="mt-1.5 border border-line py-[5px] text-center text-[8.5px] uppercase tracking-[0.12em] text-faint">
                    {t("bm.inContacts")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

function Shell({
  children, onClose, tab, setTab, locked = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  tab: Tab;
  setTab: (t: Tab) => void;
  locked?: boolean;
}) {
  const { t } = useT();
  const { g } = useGame();
  const TABS: [Tab, string][] = [["sell", "bm.tab.sell"], ["buy", "bm.tab.buy"], ["jobs", "bm.tab.jobs"]];

  return (
    <div className="fixed inset-0 z-[94] flex items-end justify-end bg-ink/70 p-2 backdrop-blur-[1px] sm:items-center sm:justify-center sm:p-4">
      <div
        className="anim-msgin flex max-h-[86vh] w-[min(460px,100%)] flex-col border bg-[#140d0c] shadow-[0_0_70px_rgba(194,91,70,0.18)]"
        style={{ borderColor: "#c25b4688" }}
      >
        {/* 标题栏 */}
        <div
          className="flex h-[28px] shrink-0 items-center gap-2 border-b px-2.5"
          style={{ borderColor: "#c25b4855", background: "rgba(194,91,70,0.12)" }}
        >
          <ShoppingBag size={12} style={{ color: RED }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: "#e0634a" }}>
            {t("bm.title")}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[9px] tabular-nums text-amber">
            <Banknote size={10} /> {g.credits}cr
          </span>
          <button onClick={onClose} className="shrink-0 text-dim transition-colors hover:text-fog">
            <X size={11} />
          </button>
        </div>

        {}
        {!locked && (
          <div className="flex shrink-0 border-b" style={{ borderColor: "#c25b4833" }}>
            {TABS.map(([id, key]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 border-r px-2 py-[6px] text-[8.5px] font-bold uppercase tracking-[0.14em] transition-colors last:border-r-0",
                  tab === id ? "text-[#e0634a]" : "text-faint hover:text-dim"
                )}
                style={{
                  borderColor: "#c25b4833",
                  background: tab === id ? "rgba(194,91,70,0.14)" : "transparent",
                  boxShadow: tab === id ? `inset 0 -2px 0 ${RED}` : "none",
                }}
              >
                {t(key)}
              </button>
            ))}
          </div>
        )}

        {children}

        <div
          className="shrink-0 border-t px-2.5 py-[4px] text-center text-[7.5px] uppercase tracking-[0.18em] text-faint"
          style={{ borderColor: "#c25b4833" }}
        >
          {t("bm.motto")}
        </div>
      </div>
    </div>
  );
}
