import { Bomb, Download, FolderOpen, HardDriveDownload, Lock, RadioTower, ShieldAlert, Zap } from "lucide-react";
import { cn } from "../utils/cn";
import type { NetNode } from "../data/network";
import { KV, Panel, STATUS_COLOR, StatusDot } from "./chrome";
import { TypeGlyphShape } from "./InfoPanels";
import { alfa, blockBar } from "../lib/util";
import { pickL, useT } from "../i18n";
import { useGame } from "../game/state";
import { CFG, NODE_META, SECTOR_REP, factionById, filesOfNode } from "../game/data";
import { ALL_NODES } from "../data/regions";
import { usesVault } from "../game/vault";
import { usesRouting } from "../game/routing";
import { usesHexwall } from "../game/hexwall";
import { useTut } from "../game/tutorial";

export const NODE_STATE_COLOR: Record<string, string> = {
  LOCKED: "var(--color-moss)",
  AVAILABLE: "var(--color-phos)",
  COMPROMISED: "#8f86b8",
  RESTRICTED: "#cfa04b",
};

function WardenBar({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-[3px] align-middle">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="block h-[8px] w-[5px] border"
          style={{
            borderColor: i <= level ? (level >= 4 ? "#c25b46" : "#cfa04b") : "var(--color-line2)",
            background: i <= level ? (level >= 4 ? "#c25b4655" : "#cfa04b44") : "transparent",
          }}
        />
      ))}
      <span className="ml-1 text-[9px]" style={{ color: level >= 4 ? "#c25b46" : "#cfa04b" }}>
        T{level}
      </span>
    </span>
  );
}

export default function NodeDossier({
  node,
  sectorName,
  sectorCode,
  regionName,
  hackingId,
  hackPct,
  onHack,
  onDownload,
  onEnterVault,
  onSabotage,
  onOpenArchive,
}: {
  node: NetNode | null;
  sectorName?: string;
  sectorCode?: string;
  regionName?: string;
  hackingId: string | null;
  hackPct: number;
  onHack: (id: string) => void;
  onDownload: (nodeId: string, fileId: string) => void;
  onEnterVault: (nodeId: string) => void;
  onSabotage: (nodeId: string) => void;
  onOpenArchive: (nodeId: string) => void;
}) {
  const { t, lang } = useT();
  const { g, nodeState, canHack } = useGame();
  const { isHl, gating } = useTut();

  if (!node) {
    return (
      <Panel title={t("panel.node")} className="shrink-0" bodyClassName="p-3" accent="var(--color-faint)">
        <p className="text-[10.5px] leading-relaxed text-faint">
          &gt; {t("node.none")}
          <span className="ml-1 inline-block h-[10px] w-[6px] translate-y-[1px] animate-blink bg-faint" />
          <br />
          {t("node.hint")}
        </p>
      </Panel>
    );
  }

  const meta = NODE_META[node.id];
  const st = nodeState(node.id);
  const color = NODE_STATE_COLOR[st];
  const owner = factionById(meta.owner);
  const hacking = hackingId === node.id;
  const chk = canHack(node.id);
  const breached = (g.hackCount[node.id] ?? 0) > 0;
  const files = filesOfNode(node.id);
  const vault = usesVault(node.id);
  const corp = node.type === "CORPORATE";
  const sealed = !!meta.password;
  const routing = usesRouting(node.type, meta.warden);
  const hexwall = usesHexwall(node.type, meta.warden);
  const wrecked = g.sabotaged.includes(node.id);
  const burning = g.burning.includes(node.id);
  /* 部分主机只有在收到对应合同时才会显示破坏操作。 */
  const gateOk = !meta.sabotageGate || !!g.contracts[meta.sabotageGate];
  const reward = Math.round(
    (meta.rep + meta.warden * CFG.repPerWarden) * (breached ? CFG.repeatMult : 1)
  );

  /* ---- 访问条件：把所有真实门槛都列出来 ----
     扇区声望门槛、节点自身的声望/前置要求，以及「需要先攻破邻居」。
     邻居的具体编号不再公开——玩家应该自己去找路。 */
  const sectorGate = SECTOR_REP[node.sector] ?? 0;
  const repNeeded = Math.max(
    g.rep < sectorGate ? sectorGate : 0,
    meta.req?.rep && g.rep < meta.req.rep ? meta.req.rep : 0
  );
  /* 还没解锁路由（既不是起点，也没有被邻居打开） */
  const needsRoute = st === "LOCKED" || (!meta.start && g.nodeStates[node.id] !== "AVAILABLE" && st !== "COMPROMISED");

  const conditions: string[] = [];
  if (repNeeded > 0) conditions.push(t("dos.condRep", { n: repNeeded }));
  if (needsRoute) conditions.push(t("dos.condLocked"));
  if (meta.req?.node && g.nodeStates[meta.req.node] !== "COMPROMISED") {
    /* 外置防火墙要单独说明：告诉玩家挡路的是哪台 SEC 设备。 */
    if (meta.firewall) {
      const fw = ALL_NODES.find((x) => x.id === meta.firewall);
      conditions.push(t("dos.condFirewall", { code: fw?.code ?? meta.firewall }));
    } else {
      conditions.push(t("dos.condPrereq"));
    }
  }
  if (!conditions.length && (st === "RESTRICTED" || st === "LOCKED")) {
    /* 状态受限但上面没捕捉到原因时，至少说明是声望不足 */
    conditions.push(t("dos.condRepAny"));
  }
  /* 仅在存在真实限制或节点暂不可达时显示访问条件。 */
  const gated = conditions.length > 0;

  return (
    <Panel
      title={t("panel.node")}
      className="min-h-0 shrink-0"
      accent={color}
      right={<span className="text-[8px] tracking-[0.16em] text-faint">{sectorCode}</span>}
    >
      <div className="p-3">
        {/* 标题栏 */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <TypeGlyphShape type={node.type} color={color} size={12} />
            <span className="pixel truncate text-[22px] leading-none tracking-[0.06em] text-fog">
              {node.code}
            </span>
          </span>
          <span
            className="shrink-0 border px-1.5 py-[2px] text-[8px] font-bold tracking-[0.14em]"
            style={{ color, borderColor: alfa(color, 40) }}
          >
            {t(`nst.${st}`)}
          </span>
        </div>

        {/* ---- 主要操作 ---- */}
        {hacking ? (
          <div className="mt-2.5 border border-amberdim/60 bg-amber/5 px-2.5 py-2">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.14em] text-amber">
              <span className="flex items-center gap-1.5">
                <RadioTower size={10} className="animate-softpulse" /> {t("dos.hacking")}
              </span>
              <span className="tabular-nums">{Math.round(hackPct)}%</span>
            </div>
            <div className="blocksbar mt-1.5 text-[16px] text-amber">{blockBar(hackPct, 18)}</div>
          </div>
        ) : sealed && st === "COMPROMISED" ? (
          <button
            onClick={() => onOpenArchive(node.id)}
            className="mt-2.5 flex w-full items-center justify-center gap-2 border border-steel/70 bg-steel/10 px-3 py-[8px] text-[10px] font-bold uppercase tracking-[0.18em] text-steel transition-all hover:bg-steel hover:text-ink"
          >
            <FolderOpen size={11} /> {t("dos.archive")}
          </button>
        ) : corp && st === "COMPROMISED" ? null : vault && st === "COMPROMISED" ? (
          <button
            onClick={() => onEnterVault(node.id)}
            className={cn(
              "mt-2.5 flex w-full items-center justify-center gap-2 border border-steel/70 bg-steel/10 px-3 py-[8px] text-[10px] font-bold uppercase tracking-[0.18em] text-steel transition-all hover:bg-steel hover:text-ink hover:shadow-[0_0_14px_rgba(127,149,168,0.3)]",
              isHl("vault") && "tut-ring"
            )}
          >
            <FolderOpen size={11} /> {t("dos.enter")}
          </button>
        ) : (
          <button
            disabled={!chk.ok}
            onClick={() => onHack(node.id)}
            className={cn(
              "mt-2.5 flex w-full items-center justify-center gap-2 border px-3 py-[8px] text-[10px] font-bold uppercase tracking-[0.16em] transition-all",
              chk.ok && !breached && "genius-act",
              chk.ok && breached &&
                "border-viole/60 bg-viole/10 text-viole hover:bg-viole/25 hover:text-fog",
              !chk.ok && "cursor-not-allowed border-line text-faint",
              isHl("connect") && chk.ok && "tut-ring"
            )}
          >
            {!chk.ok && chk.reason === "LOCKED" && <Lock size={11} />}
            {!chk.ok && chk.reason === "RESTRICTED" && <ShieldAlert size={11} />}
            {chk.ok && <Zap size={11} />}
            {chk.ok
              ? breached
                ? t("dos.hackRepeat")
                : sealed
                  ? t("dos.sealed")
                  : routing
                    ? t("dos.routing")
                    : hexwall
                      ? t("dos.hexwall")
                      : t("dos.hack")
              : chk.reason === "LOCKED"
                ? t("dos.lockedBtn")
                : chk.reason === "RESTRICTED"
                  ? t("dos.restrictedBtn")
                  : t("dos.recoveryBtn")}
          </button>
        )}

        {/* ---- 破坏：已攻陷的企业节点只保留这一个操作 ---- */}
        {corp && st === "COMPROMISED" && (
          wrecked ? (
            <div
              className={cn(
                "mt-1.5 flex items-center justify-center gap-1.5 border py-[6px] text-[9px] font-bold uppercase tracking-[0.14em]",
                burning ? "border-oxide/50 bg-oxide/10 text-oxide" : "border-amberdim/50 bg-amber/8 text-amberdim"
              )}
            >
              <Bomb size={10} /> {burning ? t("dos.sabotaged") : t("dos.hardened")}
            </div>
          ) : !gateOk ? null : (
            <>
              <button
                onClick={() => onSabotage(node.id)}
                className="mt-2.5 flex w-full items-center justify-center gap-2 border border-[#c25b46] bg-[#c25b46]/15 px-3 py-[8px] text-[10px] font-bold uppercase tracking-[0.18em] text-[#e0634a] transition-all hover:bg-[#c25b46] hover:text-ink hover:shadow-[0_0_14px_rgba(194,91,70,0.35)]"
              >
                <Bomb size={11} /> {t("dos.sabotage")}
              </button>
              <p className="mt-1 text-[8.5px] uppercase leading-snug tracking-[0.1em] text-faint">
                {t("dos.sabHint")}
              </p>
            </>
          )
        )}

        {/* ---- 访问条件 ---- */}
        {gated && (
          <div
            className="mt-2 border-l-2 py-1 pl-2"
            style={{
              borderColor: st === "RESTRICTED" ? "#cfa04b" : st === "LOCKED" ? "var(--color-faint)" : "var(--color-phosdim)",
              background: st === "RESTRICTED" ? "rgba(207,160,75,0.07)" : "rgb(var(--phosrgb) / 0.05)",
            }}
          >
            <div className="text-[8px] uppercase tracking-[0.18em] text-faint">{t("dos.cond")}</div>
            <div
              className="mt-[2px] space-y-[2px] text-[10px] leading-snug"
              style={{ color: st === "RESTRICTED" ? "#cfa04b" : st === "LOCKED" ? "var(--color-dim)" : "var(--color-sage)" }}
            >
              {conditions.map((c, i) => (
                <div key={i}>· {c}</div>
              ))}
            </div>
          </div>
        )}

        {breached && (
          <div className="mt-1.5 text-[8.5px] uppercase tracking-[0.16em] text-viole">
            ◆ {t("dos.breached", { n: g.hackCount[node.id] })}
          </div>
        )}

        {/* ---- 参数 ---- */}
        <div className={cn("mt-2 space-y-px border-y border-line py-1.5", gating && "tut-dim")}>
          <KV k={t("dos.class")} v={t(`ncls.${meta.cls}`)} />
          <KV k={t("dos.owner")} v={owner ? (pickL(lang, owner.name, owner.nameRu, owner.nameZh)) : "—"} vc="var(--color-sagehi)" />
          <KV k={t("dos.region")} v={`${regionName ?? "—"} · ${sectorName ?? "—"}`} vc="var(--color-dim)" />
          <KV k={t("dos.warden")} v={<WardenBar level={meta.warden} />} />
          <KV k={t("dos.state")} v={t(`nst.${st}`)} vc={color} />
          <KV
            k={t("dos.reward")}
            v={breached ? t("dos.noReward") : `+${reward} REP`}
            vc={breached ? "var(--color-moss)" : "var(--color-phos)"}
          />
        </div>

        {/* 数据发现 */}
        {st === "COMPROMISED" && vault && (
          <div className="mt-2.5 border-t border-line pt-2">
            <p className="text-[9.5px] leading-snug text-faint">{t("dos.vaultHint")}</p>
            {files.some((f) => g.files.includes(f.id)) && (
              <>
                <div className="mt-1.5 flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.18em] text-faint">
                  <HardDriveDownload size={10} /> {t("dos.recovered")}
                </div>
                <div className="mt-1 space-y-1">
                  {files
                    .filter((f) => g.files.includes(f.id))
                    .map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 border border-phosdim/40 bg-phos/5 px-2 py-[5px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10px] text-phosbrite">
                            {pickL(lang, f.name, f.nameRu, f.nameZh)}
                          </div>
                          <div className="truncate text-[7.5px] uppercase tracking-[0.14em] text-faint">
                            {t(`dcat.${f.cat}`)} · {f.value}cr
                          </div>
                        </div>
                        <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.14em] text-phos">
                          ✓ {t("dos.stored")}
                        </span>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {st === "COMPROMISED" && !vault && !sealed && (
          <div className="mt-2.5 border-t border-line pt-2">
            <div className="flex items-center gap-1.5 text-[8.5px] uppercase tracking-[0.18em] text-faint">
              <HardDriveDownload size={10} /> {t("dos.files")}
            </div>
            {files.length === 0 ? (
              <p className="mt-1 text-[10px] text-faint">{t("dos.noFiles")}</p>
            ) : (
              <div className="mt-1 space-y-1">
                {files.map((f) => {
                  const owned = g.files.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      className={cn(
                        "flex items-center gap-2 border px-2 py-[5px]",
                        owned ? "border-phosdim/40 bg-phos/5" : "border-line bg-well"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className={cn("truncate text-[10px]", owned ? "text-phosbrite" : "text-fog")}>
                          {pickL(lang, f.name, f.nameRu, f.nameZh)}
                        </div>
                        <div className="truncate text-[7.5px] uppercase tracking-[0.14em] text-faint">
                          {t(`dcat.${f.cat}`)} · {f.value}cr
                        </div>
                      </div>
                      {owned ? (
                        <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.14em] text-phos">
                          ✓ {t("dos.stored")}
                        </span>
                      ) : (
                        <button
                          onClick={() => onDownload(node.id, f.id)}
                          className="flex shrink-0 items-center gap-1 border border-line3 px-1.5 py-[3px] text-[8px] font-bold uppercase tracking-[0.12em] text-dim transition-colors hover:border-phosdim hover:bg-phos/15 hover:text-phosbrite"
                        >
                          <Download size={9} /> {t("dos.download")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {st === "COMPROMISED" && meta.intel && (
          <div className="mt-2 border-l-2 border-steel/50 bg-steel/5 py-1 pl-2">
            <div className="text-[8px] uppercase tracking-[0.18em] text-steel">{t("dos.intel")}</div>
            <p className="mt-[2px] text-[10px] leading-snug text-dim">{meta.intel}</p>
          </div>
        )}
      </div>
    </Panel>
  );
}

export { StatusDot, STATUS_COLOR };
