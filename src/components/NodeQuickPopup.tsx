import { Bomb, FolderOpen, Info, Lock, RadioTower, ShieldAlert, ShieldOff, X, Zap } from "lucide-react";
import { cn } from "../utils/cn";
import type { NetNode } from "../data/network";
import type { NodeState } from "../game/types";
import { NODE_META, SECTOR_REP } from "../game/data";
import { isHostileFaction, useGame } from "../game/state";
import { usesVault } from "../game/vault";
import { usesRouting } from "../game/routing";
import { usesHexwall } from "../game/hexwall";
import { usesMemdump } from "../game/memdump";
import { usesVirtualityBreach } from "../game/vr/levels";
import { useTut } from "../game/tutorial";
import { useT } from "../i18n";
import { blockBar } from "../lib/util";
import { STATUS_COLOR } from "./chrome";

/**
 * Компактное всплывающее окно возле узла (мобильная версия):
 * короткая сводка и кнопка основного действия — подключение,
 * а после взлома — файловая система / архив / диверсия.
 * Никакого переключения вкладок.
 */
export default function NodeQuickPopup({
  node,
  status,
  hackingId,
  hackPct,
  onHack,
  onEnterVault,
  onOpenArchive,
  onSabotage,
  onDossier,
  onClose,
}: {
  node: NetNode;
  status: NodeState;
  hackingId: string | null;
  hackPct: number;
  onHack: (id: string) => void;
  onEnterVault: (id: string) => void;
  onOpenArchive: (id: string) => void;
  onSabotage: (id: string) => void;
  onDossier: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const { g, canHack } = useGame();
  const { isHl } = useTut();

  const meta = NODE_META[node.id];
  const st = status;
  const color = STATUS_COLOR[st] ?? "var(--color-phos)";
  const hostile = isHostileFaction(meta.owner, g.relations);
  const hacking = hackingId === node.id;

  const chk = canHack(node.id);
  const breached = (g.hackCount[node.id] ?? 0) > 0;
  const vault = usesVault(node.id);
  const corp = node.type === "CORPORATE";
  const sealed = !!meta.password;
  const isArchive = sealed && node.type === "ARCHIVE";
  const routing = usesRouting(node.type, meta.warden);
  const hexwall = usesHexwall(node.type, meta.warden);
  const memdump = usesMemdump(node.type, meta.warden);
  const vr = usesVirtualityBreach(node.id);

  const archiveContract = g.contracts["ct_archive"];
  const archiveJobTaken = !!archiveContract && (archiveContract.accepted === true || archiveContract.state !== "AVAILABLE");
  const archiveLooted = g.flags.arc_looted === true || g.files.includes("f_termlist") || g.burned.includes("f_termlist");
  const archiveRestored =
    g.files.includes("f_access_restored") ||
    g.burned.includes("f_access_restored") ||
    archiveContract?.state === "COMPLETED";
  const archiveCanOpen = archiveJobTaken || archiveLooted || archiveRestored;
  const wrecked = g.sabotaged.includes(node.id);
  const burning = g.burning.includes(node.id);
  const gateOk = !meta.sabotageGate || !!g.contracts[meta.sabotageGate];

  const hackLabel = chk.ok
    ? breached
      ? memdump
        ? t("dos.enterServer")
        : t("dos.hackRepeat")
      : sealed
        ? t("dos.sealed")
        : vr
          ? t("dos.vr")
          : routing
            ? t("dos.routing")
            : hexwall
              ? t("dos.hexwall")
              : memdump
                ? t("dos.memdump")
                : t("dos.hack")
    : chk.reason === "LOCKED"
      ? t("dos.lockedBtn")
      : chk.reason === "RESTRICTED"
        ? t("dos.restrictedBtn")
        : t("dos.recoveryBtn");

  /* подсказка-причина недоступности под основной кнопкой */
  const repNeeded = g.rep < (SECTOR_REP[node.sector] ?? 0) ? SECTOR_REP[node.sector] : 0;

  return (
    <div
      data-zone="Node"
      className={cn(
        "anim-msgin pointer-events-auto w-[212px] border-2 bg-panel shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_12px_34px_rgba(0,0,0,0.9)]",
        hostile ? "border-[#ff3b3b]" : "border-line3"
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* заголовок */}
      <div className="flex h-[20px] items-center gap-1.5 border-b border-line2 bg-header px-1.5">
        <span className="h-[5px] w-[5px] shrink-0 animate-softpulse" style={{ background: color }} />
        <span className="min-w-0 flex-1 truncate text-[9px] font-bold uppercase tracking-[0.14em] text-fog">
          {node.code}
          <span className="ml-1.5 text-[7.5px] font-semibold tracking-[0.1em] text-faint">
            {t(`type.${node.type}`)} · T{meta.warden}
          </span>
        </span>
        <span
          className="shrink-0 border px-1 py-[1px] text-[7px] font-bold tracking-[0.1em]"
          style={{ color, borderColor: color }}
        >
          {t(`nst.${st}`)}
        </span>
        <button
          onClick={onClose}
          title={t("pop.close")}
          className="flex h-[14px] w-[14px] shrink-0 items-center justify-center border border-line2 text-dim transition-colors hover:border-oxide hover:text-oxide"
        >
          <X size={9} />
        </button>
      </div>

      <div className="p-2">
        {hostile && (
          <div className="mb-1.5 flex items-center gap-1 border border-[#ff3b3b] bg-[#ff3b3b]/10 px-1.5 py-[3px] text-[7.5px] font-bold uppercase tracking-[0.12em] text-[#ff7a7a]">
            <ShieldAlert size={9} className="shrink-0 animate-softpulse" /> {t("dos.hostile")}
          </div>
        )}

        {/* ---- основное действие ---- */}
        {hacking ? (
          <div className="border border-amberdim/60 bg-amber/5 px-2 py-1.5">
            <div className="flex items-center justify-between text-[8px] uppercase tracking-[0.14em] text-amber">
              <span className="flex items-center gap-1">
                <RadioTower size={9} className="animate-softpulse" /> {t("dos.hacking")}
              </span>
              <span className="tabular-nums">{Math.round(hackPct)}%</span>
            </div>
            <div className="blocksbar mt-1 text-[13px] leading-none text-amber">{blockBar(hackPct, 16)}</div>
          </div>
        ) : isArchive && st === "COMPROMISED" && !archiveCanOpen ? (
          <div className="flex w-full cursor-not-allowed items-center justify-center gap-1.5 border border-oxide/40 bg-oxide/5 px-2 py-[7px] text-[8.5px] font-bold uppercase tracking-[0.14em] text-oxide/70">
            <ShieldOff size={10} /> {t("arc.damaged")}
          </div>
        ) : isArchive && st === "COMPROMISED" ? (
          <button
            onClick={() => onOpenArchive(node.id)}
            className="flex w-full items-center justify-center gap-1.5 border border-steel/70 bg-steel/10 px-2 py-[8px] text-[9px] font-bold uppercase tracking-[0.14em] text-steel transition-all hover:bg-steel hover:text-ink"
          >
            <FolderOpen size={10} />
            {archiveLooted ? t("arc.looted") : !archiveRestored ? t("arc.restoreBtn") : t("dos.archive")}
          </button>
        ) : corp && st === "COMPROMISED" ? null : vault && st === "COMPROMISED" ? (
          <button
            onClick={() => onEnterVault(node.id)}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 border border-steel/70 bg-steel/10 px-2 py-[8px] text-[9px] font-bold uppercase tracking-[0.14em] text-steel transition-all hover:bg-steel hover:text-ink hover:shadow-[0_0_14px_rgba(127,149,168,0.3)]",
              isHl("vault") && "tut-ring"
            )}
          >
            <FolderOpen size={10} /> {t("dos.enter")}
          </button>
        ) : (
          <>
            <button
              disabled={!chk.ok}
              onClick={() => onHack(node.id)}
              className={cn(
                "flex w-full items-center justify-center gap-1.5 border px-2 py-[8px] text-[9px] font-bold uppercase tracking-[0.12em] transition-all",
                chk.ok && !breached && "genius-act",
                chk.ok && breached && "border-viole/60 bg-viole/10 text-viole hover:bg-viole/25 hover:text-fog",
                !chk.ok && "cursor-not-allowed border-line text-faint",
                isHl("connect") && chk.ok && "tut-ring"
              )}
            >
              {!chk.ok && chk.reason === "LOCKED" && <Lock size={10} />}
              {!chk.ok && chk.reason === "RESTRICTED" && <ShieldAlert size={10} />}
              {chk.ok && <Zap size={10} />}
              {hackLabel}
            </button>
            {!chk.ok && repNeeded > 0 && (
              <p className="mt-1 text-[7.5px] uppercase leading-snug tracking-[0.1em] text-amberdim">
                {t("dos.condRep", { n: repNeeded })}
              </p>
            )}
          </>
        )}

        {/* ---- диверсия для взломанных корпоративных узлов ---- */}
        {corp && st === "COMPROMISED" && !hacking && (
          wrecked ? (
            <div
              className={cn(
                "mt-1.5 flex items-center justify-center gap-1 border py-[5px] text-[8px] font-bold uppercase tracking-[0.12em]",
                burning ? "border-oxide/50 bg-oxide/10 text-oxide" : "border-amberdim/50 bg-amber/8 text-amberdim"
              )}
            >
              <Bomb size={9} /> {burning ? t("dos.sabotaged") : t("dos.hardened")}
            </div>
          ) : gateOk ? (
            <button
              onClick={() => onSabotage(node.id)}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 border border-[#c25b46] bg-[#c25b46]/15 px-2 py-[7px] text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#e0634a] transition-all hover:bg-[#c25b46] hover:text-ink"
            >
              <Bomb size={10} /> {t("dos.sabotage")}
            </button>
          ) : null
        )}

        {/* ---- подробности: переход во вкладку данных ---- */}
        {!hacking && (
          <button
            onClick={onDossier}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 border border-line2 px-2 py-[5px] text-[8px] font-bold uppercase tracking-[0.14em] text-dim transition-colors hover:border-phosdim hover:bg-panel2 hover:text-phos"
          >
            <Info size={9} /> {t("pop.info")}
          </button>
        )}
      </div>
    </div>
  );
}
