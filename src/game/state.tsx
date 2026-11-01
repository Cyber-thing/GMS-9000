import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { store, stampNow } from "../lib/util";
import { ALL_NODES } from "../data/regions";
import {
  CFG, CODEX, CONTACTS, CONTRACTS, NEIGHBOURS, NODE_META, UPGRADES,
  codexById, contactById, contractById, factionById, filesOfNode, resolveFile, scriptById,
} from "./data";
import type {
  GameState, NodeState, Notif, NotifKind, Requirement, TabId, ThreadMsg,
} from "./types";

/* ================================================================== */

const TABS: TabId[] = ["CHAT", "CODEX", "CONTACTS", "STATUS"];

const freshState = (): GameState => {
  const codex: Record<string, "UNKNOWN" | "DISCOVERED" | "UPDATED"> = {};
  CODEX.forEach((c) => (codex[c.id] = c.start ? "DISCOVERED" : "UNKNOWN"));
  const relations: Record<string, number> = {};
  return {
    rep: CFG.startRep,
    credits: CFG.startCredits,
    relations,
    nodeStates: {},
    hackCount: {},
    ops: 0,
    recovering: false,
    codex,
    codexSeen: {},
    codexLog: [],
    files: [],
    contracts: {},
    contacts: [],
    threads: {},
    upgrades: [],
    regions: ["west1"],
    market: { unlocked: false, scripts: [] },
    sabotaged: [],
    stats: { hacks: 0, contracts: 0, files: 0, nodes: 0, sold: 0, sabotage: 0, failed: 0 },
    unread: { CHAT: 0, CODEX: 0, CONTACTS: 0, STATUS: 0 },
  };
};

/* ---------------- derived helpers ---------------- */

export function reqMet(req: Requirement | undefined, s: GameState): boolean {
  if (!req) return true;
  if (req.rep !== undefined && s.rep < req.rep) return false;
  if (req.node && s.nodeStates[req.node] !== "COMPROMISED") return false;
  if (req.file && !s.files.includes(req.file)) return false;
  if (req.contract && s.contracts[req.contract]?.state !== "COMPLETED") return false;
  if (req.upgrade && !s.upgrades.includes(req.upgrade)) return false;
  return true;
}

export function nodeStateOf(id: string, s: GameState): NodeState {
  const m = NODE_META[id];
  if (!m) return "LOCKED";
  if (s.nodeStates[id] === "COMPROMISED") return "COMPROMISED";
  const unlocked = m.start || s.nodeStates[id] === "AVAILABLE";
  if (!unlocked) return "LOCKED";
  if (m.restricted && !reqMet(m.req, s)) return "RESTRICTED";
  if (m.req && !reqMet(m.req, s)) return "RESTRICTED";
  return "AVAILABLE";
}

export const repOf = (id: string, s: GameState) => s.relations[id] ?? 0;

export interface HackResult {
  ok: boolean;
  repeat: boolean;
  rep: number;
  relation: number;
  owner: string;
  unlocked: string[];
  codex: string[];
  files: string[];
  warden: number;
}

/* ================================================================== */

interface Ctx {
  g: GameState;
  notifs: Notif[];
  lastHack: HackResult | null;
  nodeState: (id: string) => NodeState;
  canHack: (id: string) => { ok: boolean; reason?: string };
  hack: (id: string) => HackResult | null;
  download: (fileId: string) => void;
  acceptContract: (id: string) => void;
  deliverContract: (id: string) => void;
  recover: () => void;
  failBreach: (nodeId: string, repLoss: number) => void;
  sabotage: (nodeId: string) => boolean;
  openMarket: () => boolean;
  buyScript: (id: string) => boolean;
  sellFile: (id: string) => { credits: number; betrayed?: string } | null;
  buyUpgrade: (id: string) => boolean;
  markTab: (tab: TabId) => void;
  markCodexSeen: (id: string) => void;
  reset: () => void;
  lang: "en" | "ru";
  setLangRef: (l: "en" | "ru") => void;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [g, setG] = useState<GameState>(() => {
    const saved = store.get<GameState | null>("game", null);
    if (!saved) return freshState();
    const base = freshState();
    return {
      ...base, ...saved,
      unread: { ...base.unread, ...saved.unread },
      stats: { ...base.stats, ...saved.stats },
      market: { ...base.market, ...(saved.market ?? {}) },
      sabotaged: saved.sabotaged ?? [],
    };
  });
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [lastHack, setLastHack] = useState<HackResult | null>(null);
  const langRef = useRef<"en" | "ru">("en");
  const nid = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => void store.set("game", g), [g]);

  const ru = () => langRef.current === "ru";

  const notify = useCallback((kind: NotifKind, text: string, tab?: TabId) => {
    setNotifs((n) => [...n.slice(-39), { id: nid.current++, kind, text, tab, t: stampNow() }]);
    if (tab) setG((s) => ({ ...s, unread: { ...s.unread, [tab]: s.unread[tab] + 1 } }));
  }, []);

  const pushThread = useCallback((contact: string, msg: Omit<ThreadMsg, "id" | "t">) => {
    setG((s) => ({
      ...s,
      threads: {
        ...s.threads,
        [contact]: [...(s.threads[contact] ?? []), { ...msg, id: nid.current++, t: stampNow() }],
      },
    }));
  }, []);

  /* ---------- contact unlocking by REP ---------- */
  useEffect(() => {
    CONTACTS.forEach((c) => {
      if (g.rep >= c.repReq && !g.contacts.includes(c.id)) {
        setG((s) =>
          s.contacts.includes(c.id)
            ? s
            : {
                ...s,
                contacts: [...s.contacts, c.id],
                threads: {
                  ...s.threads,
                  [c.id]: [
                    ...(s.threads[c.id] ?? []),
                    { id: nid.current++, from: c.id, text: ru() ? c.introRu : c.intro, t: stampNow() },
                  ],
                },
              }
        );
        notify("NEW CONTACT MESSAGE", `${c.nick} :: ${ru() ? "новое сообщение" : "new message"}`, "CONTACTS");
      }
    });
    /* ---- contract offers: one live job per contact, in order ---- */
    const BUSY: string[] = ["AVAILABLE", "ACCEPTED", "TARGET ACCESSED", "DATA ACQUIRED", "SABOTAGED", "DELIVERED"];

    for (const ct of CONTRACTS) {
      if (g.contracts[ct.id]) continue;                                  // already offered
      if (ct.market ? !g.market.unlocked : false) continue;              // channel closed
      if (!g.contacts.includes(ct.contact)) continue;                    // contact unknown
      if (g.rep < ct.repReq) continue;                                   // not respected enough
      if (ct.regionReq && !g.regions.includes(ct.regionReq)) continue;   // region not licensed
      if (ct.afterReq && g.contracts[ct.afterReq]?.state !== "COMPLETED") continue;

      /* this contact must have nothing else on the table */
      const busy = CONTRACTS.some(
        (o) => o.contact === ct.contact && g.contracts[o.id] && BUSY.includes(g.contracts[o.id].state)
      );
      if (busy) continue;

      setG((s) =>
        s.contracts[ct.id]
          ? s
          : {
              ...s,
              contracts: { ...s.contracts, [ct.id]: { state: "AVAILABLE" } },
              /* market jobs are posted on the board; only legitimate
                 clients introduce themselves through CONTACTS */
              threads: ct.market
                ? s.threads
                : {
                    ...s.threads,
                    [ct.contact]: [
                      ...(s.threads[ct.contact] ?? []),
                      {
                        id: nid.current++,
                        from: ct.contact,
                        text: ru() ? ct.briefRu : ct.brief,
                        t: stampNow(),
                        contract: ct.id,
                        action: "offer",
                      },
                    ],
                  },
            }
      );
      notify("NEW CONTRACT", `${ru() ? ct.titleRu : ct.title}`, "CONTACTS");
      break; // at most one new offer per pass, so jobs trickle in
    }

  }, [g.rep, g.contacts, g.contracts, g.market.unlocked, g.regions, notify]);

  /* ---------------- hacking ---------------- */

  const nodeState = useCallback((id: string) => nodeStateOf(id, g), [g]);

  const canHack = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      if (g.recovering) return { ok: false, reason: "RECOVERING" };
      if (g.ops >= CFG.opsLimit) return { ok: false, reason: "RECOVERY REQUIRED" };
      const st = nodeStateOf(id, g);
      if (st === "LOCKED") return { ok: false, reason: "LOCKED" };
      if (st === "RESTRICTED") return { ok: false, reason: "RESTRICTED" };
      return { ok: true };
    },
    [g]
  );

  const hack = useCallback(
    (id: string): HackResult | null => {
      const chk = canHack(id);
      if (!chk.ok) return null;
      const m = NODE_META[id];
      if (!m) return null;

      const prev = g.hackCount[id] ?? 0;
      const repeat = prev > 0;
      const mult = repeat ? CFG.repeatMult : 1;
      const repGain = repeat
        ? 0
        : Math.max(1, Math.round((m.rep + m.warden * CFG.repPerWarden) * mult));
      const relHit = Math.round(CFG.relHitPerWarden * m.warden * (repeat ? CFG.relRepeatMult : 1));

      const newCodex = repeat ? [] : m.codex.filter((c) => g.codex[c] !== "DISCOVERED" && g.codex[c] !== "UPDATED");
      const updCodex = repeat ? [] : m.codex.filter((c) => g.codex[c] === "DISCOVERED" || g.codex[c] === "UPDATED");

      /* breaching a host exposes its direct neighbours on the routing graph */
      const unlocked = repeat
        ? []
        : (NEIGHBOURS[id] ?? []).filter(
            (nb) => nb !== id && NODE_META[nb] && !NODE_META[nb].start && !g.nodeStates[nb]
          );

      const result: HackResult = {
        ok: true,
        repeat,
        rep: repGain,
        relation: relHit,
        owner: m.owner,
        unlocked,
        codex: [...newCodex, ...updCodex],
        files: filesOfNode(id).map((f) => f.id),
        warden: m.warden,
      };

      setG((s) => {
        const nodeStates = { ...s.nodeStates, [id]: "COMPROMISED" as NodeState };
        unlocked.forEach((nb) => (nodeStates[nb] = "AVAILABLE"));
        const codex = { ...s.codex };
        newCodex.forEach((c) => (codex[c] = "DISCOVERED"));
        updCodex.forEach((c) => (codex[c] = "UPDATED"));
        const codexLog = [
          ...s.codexLog,
          ...newCodex.map((c) => ({ id: c, t: stampNow(), updated: false })),
          ...updCodex.map((c) => ({ id: c, t: stampNow(), updated: true })),
        ].slice(-60);
        const codexSeen = { ...s.codexSeen };
        [...newCodex, ...updCodex].forEach((c) => delete codexSeen[c]);

        return {
          ...s,
          rep: s.rep + repGain,
          relations: { ...s.relations, [m.owner]: (s.relations[m.owner] ?? 0) + relHit },
          nodeStates,
          hackCount: { ...s.hackCount, [id]: prev + 1 },
          ops: s.ops + 1,
          codex,
          codexLog,
          codexSeen,
          stats: {
            ...s.stats,
            hacks: s.stats.hacks + 1,
            nodes: repeat ? s.stats.nodes : s.stats.nodes + 1,
          },
          unread: {
            ...s.unread,
            CODEX: s.unread.CODEX + newCodex.length + updCodex.length,
          },
        };
      });

      /* contract progress: target accessed */
      CONTRACTS.forEach((ct) => {
        const pr = g.contracts[ct.id];
        if (ct.target === id && pr?.state === "ACCEPTED") {
          setG((s) => ({ ...s, contracts: { ...s.contracts, [ct.id]: { state: "TARGET ACCESSED" } } }));
        }
      });

      /* notifications */
      if (repGain > 0) notify("REP INCREASED", `+${repGain} REP`, "STATUS");
      if (relHit !== 0) {
        const own = factionById(m.owner);
        const nm = own ? (ru() ? own.nameRu : own.name) : m.owner.toUpperCase();
        notify("FACTION RELATIONS CHANGED", `${nm} ${relHit}`, "STATUS");
      }
      const cxName = (cid: string) => {
        const e = codexById(cid);
        return e ? (ru() ? e.titleRu : e.title) : cid;
      };
      newCodex.forEach((c) => notify("NEW CODEX ENTRY", cxName(c), "CODEX"));
      updCodex.forEach((c) => notify("CODEX UPDATED", cxName(c), "CODEX"));
      unlocked.forEach((nb) => {
        const n = ALL_NODES.find((x) => x.id === nb);
        if (n) notify("NODE UNLOCKED", n.code);
      });
      if (g.ops + 1 >= CFG.opsLimit) notify("SYSTEM RECOVERY REQUIRED", "GENIUS");

      setLastHack(result);
      return result;
    },
    [g, canHack, notify]
  );

  /* ---------------- files ---------------- */

  const download = useCallback(
    (fileId: string) => {
      if (g.files.includes(fileId)) return;
      const f = resolveFile(fileId);
      if (!f) return;
      setG((s) => ({
        ...s,
        files: [...s.files, fileId],
        stats: { ...s.stats, files: s.stats.files + 1 },
      }));
      notify("DATA ACQUIRED", `${ru() ? f.nameRu : f.name} → DATA STORED`, "STATUS");

      CONTRACTS.forEach((ct) => {
        const pr = g.contracts[ct.id];
        if (ct.kind === "DATA" && ct.file === fileId && (pr?.state === "TARGET ACCESSED" || pr?.state === "ACCEPTED")) {
          setG((s) => ({ ...s, contracts: { ...s.contracts, [ct.id]: { state: "DATA ACQUIRED" } } }));
          const c = contactById(ct.contact);
          if (c) {
            pushThread(ct.contact, {
              from: ct.contact,
              text: ru()
                ? "вижу, файл у тебя. передавай — перевод готов."
                : "i see you have it. transfer the file and the credits move.",
              contract: ct.id,
              action: "deliver",
            });
            notify("NEW CONTACT MESSAGE", `${c.nick}`, "CONTACTS");
          }
        }
      });
    },
    [g.files, g.contracts, notify, pushThread]
  );

  /* ---------------- contracts ---------------- */

  const acceptContract = useCallback(
    (id: string) => {
      const ct = contractById(id);
      if (!ct || g.contracts[id]?.state !== "AVAILABLE") return;

      /* the operator may already hold the file / have breached the target */
      const hasFile = !!ct.file && g.files.includes(ct.file);
      const breached = g.nodeStates[ct.target] === "COMPROMISED";
      const next =
        ct.kind === "SABOTAGE"
          ? g.sabotaged.includes(ct.target) ? "SABOTAGED" : breached ? "TARGET ACCESSED" : "ACCEPTED"
          : hasFile ? "DATA ACQUIRED" : breached ? "TARGET ACCESSED" : "ACCEPTED";

      setG((s) => ({ ...s, contracts: { ...s.contracts, [id]: { state: next, accepted: true } } }));
      pushThread(ct.contact, {
        from: "OP",
        text: ru() ? "принимаю контракт." : "taking the contract.",
      });
      const tgt = ALL_NODES.find((n) => n.id === ct.target);
      if (ct.kind === "SABOTAGE") {
        pushThread(ct.contact, {
          from: ct.contact,
          text: ru()
            ? `цель: ${tgt?.code}. вскрой её и запусти ДИВЕРСИЮ. файлы не нужны.`
            : `target: ${tgt?.code}. breach it and run SABOTAGE. no files required.`,
          contract: id,
        });
      } else if (hasFile) {
        pushThread(ct.contact, {
          from: ct.contact,
          text: ru()
            ? "уже держишь файл? быстро. передавай — перевод готов."
            : "you already have it? fast. transfer the file and the credits move.",
          contract: id,
          action: "deliver",
        });
      } else {
        pushThread(ct.contact, {
          from: ct.contact,
          text: ru()
            ? `цель: ${tgt?.code}. достань ${ct.file?.toUpperCase()} и возвращайся.`
            : `target: ${tgt?.code}. pull ${ct.file?.toUpperCase()} and come back.`,
          contract: id,
        });
      }
    },
    [g.contracts, g.files, g.nodeStates, g.sabotaged, pushThread]
  );

  const deliverContract = useCallback(
    (id: string) => {
      const ct = contractById(id);
      if (!ct) return;
      const pr = g.contracts[id];
      const ready =
        ct.kind === "SABOTAGE"
          ? pr?.state === "SABOTAGED"
          : pr?.state === "DATA ACQUIRED" && !!ct.file && g.files.includes(ct.file);
      if (!pr || !ready) return;

      setG((s) => ({ ...s, contracts: { ...s.contracts, [id]: { state: "DELIVERED" } } }));
      pushThread(ct.contact, {
        from: "OP",
        text: ct.kind === "SABOTAGE"
          ? ru() ? "готово. узел погашен." : "done. the host is dark."
          : ru() ? `передаю ${ct.file?.toUpperCase()}` : `transferring ${ct.file?.toUpperCase()}`,
      });

      const t = window.setTimeout(() => {
        setG((s) => ({
          ...s,
          contracts: { ...s.contracts, [id]: { state: "COMPLETED" } },
          credits: s.credits + ct.credits,
          rep: s.rep + ct.rep,
          relations: { ...s.relations, [ct.client]: (s.relations[ct.client] ?? 0) + ct.relation },
          stats: {
            ...s.stats,
            contracts: s.stats.contracts + 1,
            sabotage: ct.kind === "SABOTAGE" ? s.stats.sabotage + 1 : s.stats.sabotage,
          },
        }));
        pushThread(ct.contact, {
          from: ct.contact,
          text: ru()
            ? `чисто. ${ct.credits} кредитов ушло. будешь нужен — найду.`
            : `clean. ${ct.credits} credits sent. i will find you when i need you again.`,
          contract: id,
          action: "done",
        });
        notify("CONTRACT COMPLETED", ru() ? ct.titleRu : ct.title, "CONTACTS");
        notify("REP INCREASED", `+${ct.rep} REP`, "STATUS");
      }, 1400);
      timers.current.push(t);
    },
    [g.contracts, g.files, pushThread, notify]
  );

  /* ---------------- identity reset ---------------- */

  const recover = useCallback(() => {
    if (g.recovering) return;
    setG((s) => ({ ...s, recovering: true }));
    const t = window.setTimeout(() => {
      setG((s) => ({ ...s, recovering: false, ops: 0 }));
    }, CFG.recoveryMs);
    timers.current.push(t);
  }, [g.recovering]);

  /* ---------------- failed intrusion ---------------- */

  const failBreach = useCallback(
    (nodeId: string, repLoss: number) => {
      const n = ALL_NODES.find((x) => x.id === nodeId);
      setG((s) => ({ ...s, rep: Math.max(0, s.rep - repLoss) }));
      notify("WARDEN LOCKOUT", `${n?.code ?? nodeId} · -${repLoss} REP`, "STATUS");
    },
    [notify]
  );

  /* ---------------- sabotage ---------------- */

  const sabotage = useCallback(
    (nodeId: string) => {
      if (g.sabotaged.includes(nodeId)) return false;
      if (g.nodeStates[nodeId] !== "COMPROMISED") return false;
      const n = ALL_NODES.find((x) => x.id === nodeId);
      const meta = NODE_META[nodeId];
      setG((s) => ({
        ...s,
        sabotaged: [...s.sabotaged, nodeId],
        relations: {
          ...s.relations,
          [meta.owner]: (s.relations[meta.owner] ?? 0) + CFG.relHitPerWarden * meta.warden,
        },
        contracts: Object.fromEntries(
          Object.entries(s.contracts).map(([cid, pr]) => {
            const ct = contractById(cid);
            if (ct?.kind === "SABOTAGE" && ct.target === nodeId &&
                (pr.state === "ACCEPTED" || pr.state === "TARGET ACCESSED"))
              return [cid, { ...pr, state: "SABOTAGED" as const }];
            return [cid, pr];
          })
        ),
      }));
      notify("SABOTAGE COMPLETE", n?.code ?? nodeId, "CONTACTS");

      /* tell the client the job is physically done */
      CONTRACTS.forEach((ct) => {
        if (ct.kind !== "SABOTAGE" || ct.target !== nodeId) return;
        const pr = g.contracts[ct.id];
        if (pr?.state !== "ACCEPTED" && pr?.state !== "TARGET ACCESSED") return;
        pushThread(ct.contact, {
          from: ct.contact,
          text: ru()
            ? "вижу, оно погасло. подтверди, и я переведу деньги."
            : "i can see it go dark from here. confirm and the credits move.",
          contract: ct.id,
          action: "deliver",
        });
        notify("NEW CONTACT MESSAGE", contactById(ct.contact)?.nick ?? "", "CONTACTS");
      });
      return true;
    },
    [g.sabotaged, g.nodeStates, g.contracts, notify, pushThread]
  );

  /* ---------------- black market ---------------- */

  const openMarket = useCallback(() => {
    if (g.market.unlocked || g.credits < CFG.marketPrice) return false;
    setG((s) => ({
      ...s,
      credits: s.credits - CFG.marketPrice,
      market: { ...s.market, unlocked: true },
    }));
    notify("BLACK MARKET ONLINE", `-${CFG.marketPrice}cr`);
    return true;
  }, [g.market.unlocked, g.credits, notify]);

  const buyScript = useCallback(
    (id: string) => {
      const sc = scriptById(id);
      if (!sc || g.market.scripts.includes(id) || g.credits < sc.price) return false;
      setG((s) => ({
        ...s,
        credits: s.credits - sc.price,
        market: { ...s.market, scripts: [...s.market.scripts, id] },
      }));
      notify("SCRIPT ACQUIRED", ru() ? sc.nameRu : sc.name, "STATUS");
      return true;
    },
    [g.market, g.credits, notify]
  );

  /** fences a file. Selling contracted data burns the client. */
  const sellFile = useCallback(
    (id: string) => {
      if (!g.files.includes(id)) return null;
      const f = resolveFile(id);
      if (!f) return null;

      /* is this file promised to someone? */
      const owed = CONTRACTS.find(
        (ct) =>
          ct.kind === "DATA" && ct.file === id &&
          g.contracts[ct.id] &&
          !["COMPLETED", "FAILED"].includes(g.contracts[ct.id].state)
      );
      const credits = Math.round(f.value * (owed ? CFG.sellBonusQuest : 1));
      const crew = Math.random() < 0.5 ? "scavenger" : "broken";

      setG((s) => {
        const relations = { ...s.relations };
        relations[f.owner] = (relations[f.owner] ?? 0) + CFG.sellRelHit;
        relations[crew] = (relations[crew] ?? 0) + CFG.betrayCrewGain;
        if (owed) relations[owed.client] = (relations[owed.client] ?? 0) + CFG.betrayRelHit;
        return {
          ...s,
          credits: s.credits + credits,
          files: s.files.filter((x) => x !== id),
          relations,
          contracts: owed
            ? { ...s.contracts, [owed.id]: { state: "FAILED" as const } }
            : s.contracts,
          stats: {
            ...s.stats,
            sold: s.stats.sold + 1,
            failed: owed ? s.stats.failed + 1 : s.stats.failed,
          },
        };
      });

      notify("DATA SOLD", `${ru() ? f.nameRu : f.name} · +${credits}cr`, "STATUS");
      if (owed) {
        notify("CONTRACT FAILED", ru() ? owed.titleRu : owed.title, "CONTACTS");
        pushThread(owed.contact, {
          from: owed.contact,
          text: ru()
            ? "ты продал мой файл. я знаю, кому. больше я тебе ничего не дам."
            : "you fenced my file. i know to whom. you get nothing else from me.",
          contract: owed.id,
        });
      }
      return { credits, betrayed: owed?.client };
    },
    [g.files, g.contracts, notify, pushThread]
  );

  /* ---------------- upgrades ---------------- */

  const buyUpgrade = useCallback(
    (id: string) => {
      const up = UPGRADES.find((u) => u.id === id);
      if (!up || g.upgrades.includes(id)) return false;
      if (g.credits < up.credits || g.rep < up.repReq) return false;
      setG((s) => ({
        ...s,
        credits: s.credits - up.credits,
        upgrades: [...s.upgrades, id],
        regions: s.regions.includes(up.region) ? s.regions : [...s.regions, up.region],
      }));
      notify("NEW REGION AVAILABLE", `${up.region.toUpperCase()} · ${ru() ? up.nameRu : up.name}`);
      return true;
    },
    [g.credits, g.rep, g.upgrades, notify]
  );

  /* ---------------- misc ---------------- */

  const markTab = useCallback((tab: TabId) => {
    setG((s) => (s.unread[tab] === 0 ? s : { ...s, unread: { ...s.unread, [tab]: 0 } }));
  }, []);

  const markCodexSeen = useCallback((id: string) => {
    setG((s) => (s.codexSeen[id] ? s : { ...s, codexSeen: { ...s.codexSeen, [id]: true } }));
  }, []);

  const reset = useCallback(() => {
    setG(freshState());
    setNotifs([]);
  }, []);

  const setLangRef = useCallback((l: "en" | "ru") => {
    langRef.current = l;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      g, notifs, lastHack, nodeState, canHack, hack, download,
      acceptContract, deliverContract, recover, failBreach,
      sabotage, openMarket, buyScript, sellFile, buyUpgrade,
      markTab, markCodexSeen, reset,
      lang: langRef.current, setLangRef,
    }),
    [g, notifs, lastHack, nodeState, canHack, hack, download, acceptContract,
     deliverContract, recover, failBreach, sabotage, openMarket, buyScript, sellFile,
     buyUpgrade, markTab, markCodexSeen, reset, setLangRef]
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
}

export { TABS, CFG };
