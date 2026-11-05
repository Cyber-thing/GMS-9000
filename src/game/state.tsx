import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { store, stampNow } from "../lib/util";
import { pickL, type Lang } from "../i18n";
import { ALL_NODES } from "../data/regions";
import {
  OP17_INTRO, OP17_BRIEF, OP17_ACCEPTED, OP17_PREBREACHED, OP17_READY, OP17_DELIVER, OP17_FORK,
  OP17_TOLD, OP17_DISBELIEF, OP17_SOLD_REFUSAL, SABLE_PUNISH, SABLE_REWARD, SABLE_OFFER,
  FREDDY_IMPLANT, FREDDY_IMPLANT_2, FREDDY_IMPLANT_3, FREDDY_IMPLANT_4,
  FREDDY_IMPLANT_HOLD, FREDDY_IMPLANT_DONE, FREDDY_IMPLANT_PRE, FREDDY_IMPLANT_BREACHED,
  FREDDY_IMPLANT_SOLD,
  MARLA_PROJ, MARLA_PROJ_2, MARLA_PROJ_3, MARLA_PROJ_READY, MARLA_PROJ_ALREADY,
  MARLA_PROJ_WRECKED, MARLA_PROJ_DONE,
  ARCHIVE_PAY, ARCHIVE_REL,
  type Beat,
} from "./questArchive";
import {
  CFG, CODEX, CONTACTS, CONTRACTS, NEIGHBOURS, NODE_META, SECTOR_REP, UPGRADES,
  codexById, contactById, contractById, factionById, filesOfNode, resolveFile, scriptById,
} from "./data";
import type {
  ContractDef, GameState, NodeState, Notif, NotifKind, Requirement, TabId, ThreadMsg,
} from "./types";

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
    burning: [],
    burned: [],
    flags: {},
    threadRead: {},
    stats: { hacks: 0, contracts: 0, files: 0, nodes: 0, sold: 0, sabotage: 0, failed: 0 },
    unread: { CHAT: 0, CODEX: 0, CONTACTS: 0, STATUS: 0 },
  };
};

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
  
  const node = ALL_NODES.find((n) => n.id === id);
  const gate = node ? SECTOR_REP[node.sector] ?? 0 : 0;
  if (s.rep < gate) return "RESTRICTED";
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
  pickChoice: (msgId: number, choiceId: string) => void;
  sableArrives: () => void;
  openFreddy: () => void;
  openMarla: () => void;
  openArchiveJob: () => void;
  setFlag: (k: string, v?: string | boolean) => void;
  pushBeat: (b: Beat, thread?: string) => void;
  openMarket: () => boolean;
  buyScript: (id: string) => boolean;
  sellFile: (id: string) => { credits: number; betrayed?: string } | null;
  fenceValue: (id: string) => number | { credits: number; owed?: ContractDef; spent: boolean };
  buyUpgrade: (id: string) => boolean;
  markTab: (tab: TabId) => void;
  markThreadRead: (contact: string) => void;
  setOpenThread: (contact: string | null) => void;
  isThreadOpen: (contact: string) => boolean;
  isAnyThreadOpen: () => boolean;
  markCodexSeen: (id: string) => void;
  reset: () => void;
  lang: Lang;
  setLangRef: (l: Lang) => void;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [g, setG] = useState<GameState>(() => {
    const saved = store.get<GameState | null>("game", null);
    if (!saved) return freshState();
    const base = freshState();
    
    const contracts = { ...(saved.contracts ?? {}) };
    Object.entries(contracts).forEach(([id, pr]) => {
      if (pr?.state === "DELIVERED") contracts[id] = { state: "COMPLETED" };
    });

    return {
      ...base, ...saved,
      unread: { ...base.unread, ...saved.unread },
      stats: { ...base.stats, ...saved.stats },
      market: { ...base.market, ...(saved.market ?? {}) },
      sabotaged: saved.sabotaged ?? [],
      burning: saved.burning ?? [],
      burned: saved.burned ?? [],
      flags: saved.flags ?? {},
      threadRead: saved.threadRead ?? {},
      contracts,
      recovering: false,   // 刷新后原有的 4.2 秒计时器已不存在，因此强制清除该状态
    };
  });
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const gRef = useRef<GameState>(null as unknown as GameState);
  const [lastHack, setLastHack] = useState<HackResult | null>(null);
  const langRef = useRef<Lang>("en");
  
  const activeTab = useRef<TabId>("CHAT");
  
  const activeThread = useRef<string | null>(null);
  const nid = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  gRef.current = g;
  useEffect(() => void store.set("game", g), [g]);

  const at = <T,>(en: T, ru: T, zh?: T): T => pickL(langRef.current, en, ru, zh);

  const notify = useCallback((kind: NotifKind, text: string, tab?: TabId) => {
    setNotifs((n) => [...n.slice(-39), { id: nid.current++, kind, text, tab, t: stampNow() }]);
    if (tab && tab !== activeTab.current)
      setG((s) => ({ ...s, unread: { ...s.unread, [tab]: s.unread[tab] + 1 } }));
  }, []);

  /** 同时保存双语文本，使已存在的消息也能随语言切换重新渲染。 */
  const say = useCallback(
    (contact: string, en: string, ru_: string, zh_: string, extra: Partial<ThreadMsg> = {}) => {
      setG((s) => {
        const list = [
          ...(s.threads[contact] ?? []),
          { id: nid.current++, from: extra.from ?? contact, text: at(en, ru_, zh_),
            textEn: en, textRu: ru_, textZh: zh_, t: stampNow(), ...extra },
        ];
        const seen = activeThread.current === contact && activeTab.current === "CONTACTS";
        return {
          ...s,
          threads: { ...s.threads, [contact]: list },
          threadRead: seen ? { ...s.threadRead, [contact]: list.length } : s.threadRead,
        };
      });
    },
    []
  );

  const pushThread = useCallback((contact: string, msg: Omit<ThreadMsg, "id" | "t">) => {
    setG((s) => ({
      ...s,
      threads: {
        ...s.threads,
        [contact]: [...(s.threads[contact] ?? []), { ...msg, id: nid.current++, t: stampNow() }],
      },
    }));
  }, []);

  useEffect(() => {
    CONTACTS.forEach((c) => {
      /* 沉默联系人只能由剧情脚本引入，不会因声望自动出现。 */
      if (c.silent) return;
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
                    { id: nid.current++, from: c.id, text: at(c.intro, c.introRu, c.introZh),
                      textEn: c.intro, textRu: c.introRu, textZh: c.introZh, t: stampNow() },
                  ],
                },
              }
        );
        notify("NEW CONTACT MESSAGE", `${c.nick} :: ${at("new message", "новое сообщение", "新消息")}`, "CONTACTS");
      }
    });
    
    const BUSY: string[] = ["AVAILABLE", "ACCEPTED", "TARGET ACCESSED", "DATA ACQUIRED", "SABOTAGED", "DELIVERED"];

    for (const ct of CONTRACTS) {
      if (ct.scripted) continue;                                         // 由专用对话流程驱动
      if (g.contracts[ct.id]) continue;                                  // 已经提供过
      if (ct.market ? !g.market.unlocked : false) continue;              // 渠道尚未开放
      if (!g.contacts.includes(ct.contact)) continue;                    // 联系人尚未解锁
      if (g.rep < ct.repReq) continue;                                   // 声望不足
      if (ct.regionReq && !g.regions.includes(ct.regionReq)) continue;   // 区域尚未获得许可
      if (ct.afterReq && g.contracts[ct.afterReq]?.state !== "COMPLETED") continue;

      /* 必须满足对应条件。 */
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
              
              threads: ct.market
                ? s.threads
                : {
                    ...s.threads,
                    [ct.contact]: [
                      ...(s.threads[ct.contact] ?? []),
                      {
                        id: nid.current++,
                        from: ct.contact,
                        text: at(ct.brief, ct.briefRu, ct.briefZh),
                        textEn: ct.brief,
                        textRu: ct.briefRu,
                        textZh: ct.briefZh,
                        t: stampNow(),
                        contract: ct.id,
                        action: "offer",
                      },
                    ],
                  },
            }
      );
      notify("NEW CONTRACT", `${at(ct.title, ct.titleRu, ct.titleZh)}`, "CONTACTS");
      break; // 每轮最多发布一个新订单，使任务逐步出现
    }

  }, [g.rep, g.contacts, g.contracts, g.market.unlocked, g.regions, notify]);

  /* ---------------- 入侵 ---------------- */

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

      CONTRACTS.forEach((ct) => {
        const pr = g.contracts[ct.id];
        if (ct.target === id && pr?.state === "ACCEPTED") {
          setG((s) => ({ ...s, contracts: { ...s.contracts, [ct.id]: { state: "TARGET ACCESSED" } } }));
        }
      });

      /* 通知 */
      if (repGain > 0) notify("REP INCREASED", `+${repGain} REP`, "STATUS");
      if (relHit !== 0) {
        const own = factionById(m.owner);
        const nm = own ? at(own.name, own.nameRu, own.nameZh) : m.owner.toUpperCase();
        notify("FACTION RELATIONS CHANGED", `${nm} ${relHit}`, "STATUS");
      }
      const cxName = (cid: string) => {
        const e = codexById(cid);
        return e ? at(e.title, e.titleRu, e.titleZh) : cid;
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

  
  const pushBeat = useCallback((b: Beat, thread?: string) => {
    const who = thread ?? (b.from === "OP" ? "op17" : b.from);
    setG((s) => {
      const list = [
        ...(s.threads[who] ?? []),
        {
          id: nid.current++,
          from: b.from === "OP" ? "OP" : b.from,
          text: at(b.line.en, b.line.ru, b.line.zh),
          textEn: b.line.en,
          textRu: b.line.ru,
          textZh: b.line.zh,
          t: stampNow(),
          choices: b.choices,
          contract: b.contract,
          action: b.action,
          payout: b.payout,
        },
      ];
      
      const seen = activeThread.current === who && activeTab.current === "CONTACTS";
      return {
        ...s,
        threads: { ...s.threads, [who]: list },
        threadRead: seen ? { ...s.threadRead, [who]: list.length } : s.threadRead,
      };
    });
    if (b.from !== "OP" && !(activeThread.current === who && activeTab.current === "CONTACTS")) {
      notify("NEW CONTACT MESSAGE", contactById(who)?.nick ?? who, "CONTACTS");
    }
  }, [notify]);

  const setFlag = useCallback((k: string, v: string | boolean = true) => {
    setG((s) => (s.flags[k] === v ? s : { ...s, flags: { ...s.flags, [k]: v } }));
  }, []);

  const openArchiveJob = useCallback(() => {
    if (g.flags.arc_intro) return;
    setFlag("arc_intro");
    setG((s) => ({
      ...s,
      contacts: s.contacts.includes("op17") ? s.contacts : [...s.contacts, "op17"],
      contracts: { ...s.contracts, ct_archive: { state: "AVAILABLE" } },
    }));
    OP17_INTRO.forEach((b) => pushBeat(b, "op17"));
  }, [g.flags.arc_intro, setFlag, pushBeat]);

  const sableArrives = useCallback(() => {
    if (g.flags.sable_met) return;
    setFlag("sable_met");
    setG((s) => ({
      ...s,
      contacts: s.contacts.includes("sablec") ? s.contacts : [...s.contacts, "sablec"],
    }));
    
    if (g.flags["sable-ok"] !== true && g.files.includes("f_termlist")) {
      pushBeat(SABLE_OFFER, "sablec");
    }
  }, [g.flags.sable_met, g.flags, g.files, setFlag, pushBeat]);

  const openFreddy = useCallback(() => {
    if (g.flags.fred_intro) return;
    if (g.rep < (SECTOR_REP.w1_gulf ?? 0)) return;
    setFlag("fred_intro");
    setG((s) => ({
      ...s,
      contacts: s.contacts.includes("freddy") ? s.contacts : [...s.contacts, "freddy"],
    }));
    FREDDY_IMPLANT.forEach((b) => pushBeat(b, "freddy"));
  }, [g.flags.fred_intro, g.rep, setFlag, pushBeat]);

  const openMarla = useCallback(() => {
    if (g.flags.marla_intro) return;
    setFlag("marla_intro");
    setG((s) => ({
      ...s,
      contacts: s.contacts.includes("marla") ? s.contacts : [...s.contacts, "marla"],
    }));
    MARLA_PROJ.forEach((b) => pushBeat(b, "marla"));
  }, [g.flags.marla_intro, setFlag, pushBeat]);

  const pickChoice = useCallback(
    (msgId: number, choiceId: string) => {
      
      let label = "";
      setG((s) => {
        const threads = { ...s.threads };
        Object.keys(threads).forEach((k) => {
          threads[k] = threads[k].map((m) => {
            if (m.id !== msgId) return m;
            const c = m.choices?.find((x) => x.id === choiceId);
            label = c ? at(c.en, c.ru, c.zh) : "";
            return { ...m, picked: choiceId };
          });
        });
        return { ...s, threads };
      });

      const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

      if (choiceId === "listen") {
        pushBeat({ id: "a1", from: "OP", line: { en: "I am listening.", ru: "Я слушаю.", zh: "我听着。" } });
        later(() => OP17_BRIEF.forEach((b) => pushBeat(b, "op17")), 700);
        return;
      }

      if (choiceId === "accept") {
        /* 玩家可能早就自己把 ARC-N05 撬开了——那就走「我已经干完了」的分支 */
        const pre = gRef.current.nodeStates["w1n_arc"] === "COMPROMISED";
        if (pre) {
          setG((s) => ({
            ...s,
            contracts: { ...s.contracts, ct_archive: { state: "TARGET ACCESSED", accepted: true } },
          }));
          OP17_PREBREACHED.forEach((b, i) => later(() => pushBeat(b, "op17"), i * 1100));
          return;
        }
        pushBeat({ id: "a2", from: "OP", line: { en: "Taking the contract.", ru: "Принимаю контракт.", zh: "接了合同。" } });
        setG((s) => ({ ...s, contracts: { ...s.contracts, ct_archive: { state: "ACCEPTED", accepted: true } } }));
        later(() => OP17_ACCEPTED.forEach((b) => pushBeat(b, "op17")), 800);
        return;
      }

      if (choiceId === "tell") {
        const stillHasIt = gRef.current.files.includes("f_termlist");
        const soldIt = gRef.current.flags["sable-ok"] === true;

        if (soldIt) {
          setFlag("arc_told", "sold_then_told");
          /* 先把对话演完（我方发言 → 他的回绝），最后才落下「已拉黑」横幅 */
          OP17_SOLD_REFUSAL.forEach((b, i) => later(() => pushBeat(b, "op17"), i * 1200));
          later(() => setFlag("op17_blocked", true), OP17_SOLD_REFUSAL.length * 1200 + 900);
          setG((s) => ({
            ...s,
            relations: { ...s.relations, civic: (s.relations.civic ?? 0) + ARCHIVE_REL.emptyCivic },
          }));
          return;
        }

        if (!stillHasIt) {
          setFlag("arc_told", "empty");
          /* 同样：说完、听完回应，之后才显示被拉黑 */
          OP17_DISBELIEF.forEach((b, i) => later(() => pushBeat(b, "op17"), i * 1100));
          later(() => setFlag("op17_blocked", true), OP17_DISBELIEF.length * 1100 + 900);
          setG((s) => ({
            ...s,
            relations: { ...s.relations, civic: (s.relations.civic ?? 0) + ARCHIVE_REL.emptyCivic },
          }));
          return;
        }

        setFlag("arc_told", "op17");
        setFlag("sable-revenge", true);
        setFlag("operator-knows", true);
        setFlag("sable_blocked", true);
        OP17_TOLD.forEach((b, i) => later(() => pushBeat(b, "op17"), i * 900));
        setG((s) => ({
          ...s,
          relations: { ...s.relations, civic: (s.relations.civic ?? 0) + ARCHIVE_REL.toldCivic,
                       intercell: (s.relations.intercell ?? 0) + ARCHIVE_REL.toldIntercell },
          
          burned: s.burned.includes("f_termlist") ? s.burned : [...s.burned, "f_termlist"],
          threads: {
            ...s.threads,
            sablec: (s.threads.sablec ?? []).map((m) =>
              m.choices && !m.picked ? { ...m, picked: "void" } : m
            ),
          },
        }));
        later(() => pushBeat(SABLE_PUNISH, "sablec"), 2600);
        return;
      }

      if (choiceId === "hide") {
        setFlag("arc_told", "hidden");
        
        const alreadySold = gRef.current.flags["sable-ok"] === true;
        const stillHolds = gRef.current.files.includes("f_termlist");
        if (alreadySold || !stillHolds) return;
        later(() => {
          const open = (gRef.current.threads.sablec ?? []).some((m) => m.choices && !m.picked);
          if (!open) pushBeat(SABLE_OFFER, "sablec");
          notify("NEW CONTACT MESSAGE", "sable", "CONTACTS");
        }, 900);
        return;
      }

      if (choiceId === "fi_what") {
        pushBeat({ id: "a4", from: "OP", line: { en: "What do you need?", ru: "Что нужно?", zh: "你需要什么？" } }, "freddy");
        later(() => FREDDY_IMPLANT_2.forEach((b) => pushBeat(b, "freddy")), 800);
        return;
      }
      if (choiceId === "fi_ask") {
        pushBeat({ id: "a5", from: "OP", line: { en: "What do you want from me?", ru: "От меня что требуется?", zh: "需要我干嘛？" } }, "freddy");
        later(() => FREDDY_IMPLANT_3.forEach((b) => pushBeat(b, "freddy")), 800);
        return;
      }
      if (choiceId === "fi_ok") {
        pushBeat({ id: "a6", from: "OP", line: { en: "All right.", ru: "Хорошо.", zh: "行。" } }, "freddy");
        const cur = gRef.current;
        const hasMemo = cur.files.includes("f_queue_memo");
        /* 已经卖掉就再也拿不回来了——这条线直接谈崩 */
        const soldMemo = !hasMemo && cur.burned.includes("f_queue_memo");
        const inside = cur.nodeStates["w1g_dsv"] === "COMPROMISED";
        if (soldMemo) {
          setG((s) => ({
            ...s,
            contracts: { ...s.contracts, ct_implant: { state: "FAILED" } },
            relations: { ...s.relations, indep: (s.relations.indep ?? 0) - 10 },
          }));
          setFlag("freddy_blocked", true);
          FREDDY_IMPLANT_SOLD.forEach((b, i) => later(() => pushBeat(b, "freddy"), 800 + i * 1100));
          return;
        }
        setG((s) => ({
          ...s,
          contracts: {
            ...s.contracts,
            ct_implant: {
              state: hasMemo ? "DATA ACQUIRED" : inside ? "TARGET ACCESSED" : "ACCEPTED",
              accepted: true,
            },
          },
        }));
        const script = hasMemo ? FREDDY_IMPLANT_PRE : inside ? FREDDY_IMPLANT_BREACHED : FREDDY_IMPLANT_4;
        script.forEach((b, i) => later(() => pushBeat(b, "freddy"), 800 + i * 1000));
        return;
      }

      if (choiceId === "mp_which") {
        pushBeat({ id: "a7", from: "OP", line: { en: "Which room?", ru: "Какой зал?", zh: "哪个厅？" } }, "marla");
        later(() => MARLA_PROJ_2.forEach((b) => pushBeat(b, "marla")), 800);
        return;
      }
      if (choiceId === "mp_why") {
        pushBeat({
          id: "a9", from: "OP",
          line: { en: "And you want the projectors down.", ru: "И ты хочешь, чтобы проекторы вырубились.", zh: "所以你想让投影全灭。" },
        }, "marla");
        later(() => MARLA_PROJ_3.forEach((b) => pushBeat(b, "marla")), 800);
        return;
      }
      if (choiceId === "mp_ok") {
        pushBeat({ id: "a8", from: "OP", line: { en: "Taking it.", ru: "Берусь.", zh: "接了。" } }, "marla");
        const cur = gRef.current;
        const wrecked = cur.sabotaged.includes("w1p_crp2");
        const already = cur.nodeStates["w1p_crp2"] === "COMPROMISED";
        setG((s) => ({
          ...s,
          contracts: {
            ...s.contracts,
            sb_projector: {
              state: wrecked ? "SABOTAGED" : already ? "TARGET ACCESSED" : "ACCEPTED",
              accepted: true,
            },
          },
        }));
        const script = wrecked ? MARLA_PROJ_WRECKED : already ? MARLA_PROJ_ALREADY : MARLA_PROJ_READY;
        script.forEach((b, i) => later(() => pushBeat(b, "marla"), 850 + i * 1000));
        return;
      }

      if (choiceId === "fi_send") {
        if (!gRef.current.files.includes("f_queue_memo")) return;
        setG((s) => ({
          ...s,
          contracts: { ...s.contracts, ct_implant: { state: "COMPLETED" } },
          credits: s.credits + 350,
          rep: s.rep + 14,
          relations: { ...s.relations, fusion: (s.relations.fusion ?? 0) - 12 },
          
          files: s.files.filter((x) => x !== "f_queue_memo"),
          burned: s.burned.includes("f_queue_memo") ? s.burned : [...s.burned, "f_queue_memo"],
          stats: { ...s.stats, contracts: s.stats.contracts + 1 },
        }));
        FREDDY_IMPLANT_DONE.forEach((b, i) =>
          later(() => pushBeat(
            i === FREDDY_IMPLANT_DONE.length - 1 ? { ...b, payout: 350 } : b, "freddy"), i * 1300)
        );
        notify("CONTRACT COMPLETED", "+350cr", "CONTACTS");
        return;
      }

      if (choiceId === "sendsable") {
        
        setFlag("sable-ok", true);
        pushBeat({ id: "a3", from: "OP", line: { en: "Sending the list.", ru: "Отправляю список.", zh: "名单发你了。" } }, "sablec");
        setG((s) => ({
          ...s,
          credits: s.credits + ARCHIVE_PAY.sable,
          rep: s.rep + ARCHIVE_PAY.repSable,
          relations: { ...s.relations, intercell: (s.relations.intercell ?? 0) + ARCHIVE_PAY.relSable },
          
          files: s.files.filter((x) => x !== "f_termlist"),
          burned: s.burned.includes("f_termlist") ? s.burned : [...s.burned, "f_termlist"],
        }));
        
        setG((s) => ({
          ...s,
          threads: {
            ...s.threads,
            sablec: (s.threads.sablec ?? []).map((m) =>
              m.choices && !m.picked ? { ...m, picked: "sendsable" } : m
            ),
          },
        }));
        later(() => pushBeat({ ...SABLE_REWARD, payout: ARCHIVE_PAY.sable }, "sablec"), 1100);
        notify("CONTRACT COMPLETED", `+${ARCHIVE_PAY.sable}cr`, "CONTACTS");
        return;
      }
      void label;
    },
    [pushBeat, setFlag, notify]
  );

  /* ---------------- 文件 ---------------- */

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
      notify("DATA ACQUIRED", `${at(f.name, f.nameRu, f.nameZh)} → DATA STORED`, "STATUS");

      if (fileId === "f_access_restored") {
        const st = g.contracts.ct_archive?.state;
        if (st === "ACCEPTED" || st === "TARGET ACCESSED") {
          setG((s) => ({ ...s, contracts: { ...s.contracts, ct_archive: { state: "DATA ACQUIRED" } } }));
          timers.current.push(
            window.setTimeout(
              () =>
                OP17_READY.forEach((b) => pushBeat(b, "op17")),
              900
            )
          );
        }
      }

      if (fileId === "f_queue_memo") {
        const st = g.contracts.ct_implant?.state;
        if (st === "ACCEPTED" || st === "TARGET ACCESSED") {
          setG((s) => ({ ...s, contracts: { ...s.contracts, ct_implant: { state: "DATA ACQUIRED" } } }));
          timers.current.push(
            window.setTimeout(() => FREDDY_IMPLANT_HOLD.forEach((b) => pushBeat(b, "freddy")), 900)
          );
        }
      }

      /* WARDEN PASS：保护节点的字面密码输入窗口。 */
      const unlocks = Object.values(NODE_META).find((m) => m.passwordFrom === fileId);
      if (unlocks?.password) {
        const n = ALL_NODES.find((x) => x.id === unlocks.id);
        notify("KEY RECOVERED", `${n?.code ?? unlocks.id} — ${unlocks.password}`, "CODEX");
        setG((s) => ({ ...s, flags: { ...s.flags, [`key_${unlocks.id}`]: unlocks.password! } }));
      }

      CONTRACTS.forEach((ct) => {
        const pr = g.contracts[ct.id];
        
        if (ct.scripted) return;
        if (ct.kind === "DATA" && ct.file === fileId && (pr?.state === "TARGET ACCESSED" || pr?.state === "ACCEPTED")) {
          setG((s) => ({ ...s, contracts: { ...s.contracts, [ct.id]: { state: "DATA ACQUIRED" } } }));
          const c = contactById(ct.contact);
          if (c) {
            say(ct.contact,
              "i see you have it. transfer the file and the credits move.",
              "вижу, файл у тебя. передавай — перевод готов.",
              "看到东西在你手上了。传过来，钱就动。",
              { contract: ct.id, action: "deliver" });
            notify("NEW CONTACT MESSAGE", `${c.nick}`, "CONTACTS");
          }
        }
      });
    },
    [g.files, g.contracts, notify, pushThread, pushBeat]
  );

  /* ---------------- 合同 ---------------- */

  const acceptContract = useCallback(
    (id: string) => {
      const ct = contractById(id);
      if (!ct || g.contracts[id]?.state !== "AVAILABLE") return;

      const hasFile = !!ct.file && g.files.includes(ct.file);
      const wrecked = g.sabotaged.includes(ct.target);
      const breached = g.nodeStates[ct.target] === "COMPROMISED";
      const next =
        ct.kind === "SABOTAGE"
          ? wrecked ? "SABOTAGED" : breached ? "TARGET ACCESSED" : "ACCEPTED"
          : hasFile ? "DATA ACQUIRED" : breached ? "TARGET ACCESSED" : "ACCEPTED";

      setG((s) => ({ ...s, contracts: { ...s.contracts, [id]: { state: next, accepted: true } } }));
      say(ct.contact, "taking the contract.", "принимаю контракт.", "单子我接了。", { from: "OP" });

      const tgt = ALL_NODES.find((n) => n.id === ct.target);
      const code = tgt?.code ?? ct.target;

      if (ct.kind === "SABOTAGE") {
        if (wrecked) {
          
          say(ct.contact,
            `${code} is already dark? You work ahead of me. Confirm it and I will pay.`,
            `${code} уже погашен? Ты работаешь на опережение. Подтверди, и я заплачу.`,
            `${code} 已经黑了？你手比我还快。确认一下，我转钱。`,
            { contract: id, action: "deliver" });
        } else {
          say(ct.contact,
            `target: ${code}. breach it and run SABOTAGE. no files required.`,
            `цель: ${code}. вскрой её и запусти ДИВЕРСИЮ. файлы не нужны.`,
            `目标：${code}。破进去跑破坏，不用拿文件。`,
            { contract: id });
        }
      } else if (hasFile) {
        say(ct.contact,
          "you already have it? fast. transfer the file and the credits move.",
          "уже держишь файл? быстро. передавай — перевод готов.",
          "你已经拿到了？挺快。传过来，钱就动。",
          { contract: id, action: "deliver" });
      } else if (breached) {
        /* 目标主机早就被玩家拿下了——客户会愣一下 */
        say(ct.contact,
          `wait — you are already inside ${code}? you move before I ask. just pull ${ct.file?.toUpperCase()} then.`,
          `стоп — ты уже внутри ${code}? работаешь раньше, чем я прошу. тогда просто вытащи ${ct.file?.toUpperCase()}.`,
          `等等 —— 你已经在 ${code} 里了？我还没开口你就动手了。那把 ${ct.file?.toUpperCase()} 掏出来就行。`,
          { contract: id });
      } else {
        say(ct.contact,
          `target: ${code}. pull ${ct.file?.toUpperCase()} and come back.`,
          `цель: ${code}. достань ${ct.file?.toUpperCase()} и возвращайся.`,
          `目标：${code}。把 ${ct.file?.toUpperCase()} 薅出来就回来。`,
          { contract: id });
      }
    },
    [g.contracts, g.files, g.nodeStates, g.sabotaged, say]
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

      if (ct.scripted && id === "ct_archive") {
        OP17_DELIVER.forEach((b, i) =>
          timers.current.push(window.setTimeout(() => pushBeat(b, "op17"), i * 1000))
        );
        timers.current.push(
          window.setTimeout(() => {
            setG((s) => ({
              ...s,
              contracts: { ...s.contracts, [id]: { state: "COMPLETED" } },
              credits: s.credits + ct.credits,
              rep: s.rep + ct.rep,
              relations: { ...s.relations, [ct.client]: (s.relations[ct.client] ?? 0) + ct.relation },
              stats: { ...s.stats, contracts: s.stats.contracts + 1 },
            }));
            notify("CONTRACT COMPLETED", at(ct.title, ct.titleRu, ct.titleZh), "CONTACTS");
            notify("REP INCREASED", `+${ct.rep} REP`, "STATUS");
            
            setG((s) => {
              
              const sawIt = s.files.includes("f_termlist") || s.burned.includes("f_termlist");
              if (sawIt && !s.flags.arc_told) {
                timers.current.push(window.setTimeout(() => pushBeat(OP17_FORK), 900));
              }
              return s;
            });
          }, 2100)
        );
        return;
      }

      say(ct.contact,
        ct.kind === "SABOTAGE" ? "done. the host is dark." : `transferring ${ct.file?.toUpperCase()}`,
        ct.kind === "SABOTAGE" ? "готово. узел погашен." : `передаю ${ct.file?.toUpperCase()}`,
        ct.kind === "SABOTAGE" ? "搞定。那台机黑了。" : `正在传 ${ct.file?.toUpperCase()}`,
        { from: "OP" });

      const t = window.setTimeout(() => {
        setG((s) => {
          
          if (s.contracts[id]?.state !== "DELIVERED") return s;
          return {
            ...s,
            contracts: { ...s.contracts, [id]: { state: "COMPLETED" } },
            credits: s.credits + ct.credits,
            rep: s.rep + ct.rep,
            relations: { ...s.relations, [ct.client]: (s.relations[ct.client] ?? 0) + ct.relation },
            
            burned: ct.file && !s.burned.includes(ct.file) ? [...s.burned, ct.file] : s.burned,
            stats: {
              ...s.stats,
              contracts: s.stats.contracts + 1,
              sabotage: ct.kind === "SABOTAGE" ? s.stats.sabotage + 1 : s.stats.sabotage,
            },
          };
        });
        say(ct.contact,
          `clean. ${ct.credits} credits sent. i will find you when i need you again.`,
          `чисто. ${ct.credits} кредитов ушло. будешь нужен — найду.`,
          `干净。${ct.credits} 信用点已转。再有活儿我来捞你。`,
          { contract: id, action: "done", payout: ct.credits });
        notify("CONTRACT COMPLETED", at(ct.title, ct.titleRu, ct.titleZh), "CONTACTS");
        notify("REP INCREASED", `+${ct.rep} REP`, "STATUS");
      }, 1400);
      timers.current.push(t);
    },
    [g.contracts, g.files, say, notify, pushBeat]
  );

  const recover = useCallback(() => {
    if (g.recovering) return;
    setG((s) => ({ ...s, recovering: true }));
    const t = window.setTimeout(() => {
      setG((s) => ({ ...s, recovering: false, ops: 0, burning: [] }));
    }, CFG.recoveryMs);
    timers.current.push(t);
  }, [g.recovering]);

  const failBreach = useCallback(
    (nodeId: string, repLoss: number) => {
      const n = ALL_NODES.find((x) => x.id === nodeId);
      /* 被 WARDEN 抓到 = 身份彻底暴露：操作缓冲直接打满，
         玩家必须先按「匿名重置」才能继续干活。 */
      setG((s) => ({
        ...s,
        rep: Math.max(0, s.rep - repLoss),
        ops: CFG.opsLimit,
      }));
      if (repLoss > 0) {
        notify("WARDEN LOCKOUT", `${n?.code ?? nodeId} · -${repLoss} REP`, "STATUS");
      } else {
        notify("WARDEN LOCKOUT", `${n?.code ?? nodeId}`, "STATUS");
      }
      notify("SYSTEM RECOVERY REQUIRED", "GENIUS", "STATUS");
    },
    [notify]
  );

  /* ---------------- 破坏 ---------------- */

  const sabotage = useCallback(
    (nodeId: string) => {
      if (g.sabotaged.includes(nodeId)) return false;
      if (g.nodeStates[nodeId] !== "COMPROMISED") return false;
      const n = ALL_NODES.find((x) => x.id === nodeId);
      const meta = NODE_META[nodeId];
      setG((s) => ({
        ...s,
        sabotaged: [...s.sabotaged, nodeId],
        burning: s.burning.includes(nodeId) ? s.burning : [...s.burning, nodeId],
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

      if (nodeId === "w1p_crp2") {
        const pr = gRef.current.contracts.sb_projector?.state;
        if (pr === "ACCEPTED" || pr === "TARGET ACCESSED") {
          setG((s) => ({
            ...s,
            contracts: { ...s.contracts, sb_projector: { state: "COMPLETED" } },
            credits: s.credits + 300,
            rep: s.rep + 12,
            stats: { ...s.stats, contracts: s.stats.contracts + 1, sabotage: s.stats.sabotage + 1 },
          }));
          MARLA_PROJ_DONE.forEach((b, i) =>
            timers.current.push(window.setTimeout(
              () => pushBeat(i === MARLA_PROJ_DONE.length - 1 ? { ...b, payout: 300 } : b, "marla"),
              900 + i * 900))
          );
          notify("CONTRACT COMPLETED", "+300cr", "CONTACTS");
        }
      }

      CONTRACTS.forEach((ct) => {
        if (ct.kind !== "SABOTAGE" || ct.target !== nodeId) return;
        if (ct.scripted) return;   // 由专用对话处理结算
        const pr = g.contracts[ct.id];
        if (pr?.state !== "ACCEPTED" && pr?.state !== "TARGET ACCESSED") return;
        pushThread(ct.contact, {
          from: ct.contact,
          text: at(
            "i can see it go dark from here. confirm and the credits move.",
            "вижу, оно погасло. подтверди, и я переведу деньги.",
            "我在这儿都看见它黑了。确认一下，钱就转你。"
          ),
          textEn: "i can see it go dark from here. confirm and the credits move.",
          textRu: "вижу, оно погасло. подтверди, и я переведу деньги.",
          textZh: "我在这儿都看见它黑了。确认一下，钱就转你。",
          contract: ct.id,
          action: "deliver",
        });
        notify("NEW CONTACT MESSAGE", contactById(ct.contact)?.nick ?? "", "CONTACTS");
      });
      return true;
    },
    [g.sabotaged, g.nodeStates, g.contracts, notify, pushThread, pushBeat]
  );

  /* 黑市。 */

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
      notify("SCRIPT ACQUIRED", at(sc.name, sc.nameRu, sc.nameZh), "STATUS");
      return true;
    },
    [g.market, g.credits, notify]
  );

  const fenceValue = useCallback(
    (id: string) => {
      const f = resolveFile(id);
      if (!f) return 0;
      const owed = CONTRACTS.find(
        (ct) =>
          ct.kind === "DATA" && ct.file === id &&
          g.contracts[ct.id] &&
          !["COMPLETED", "FAILED"].includes(g.contracts[ct.id].state)
      );
      const spent = g.burned.includes(id);
      const mult = spent ? CFG.resellMult : owed ? CFG.sellBonusQuest : 1;
      return { credits: Math.max(1, Math.round(f.value * mult)), owed, spent };
    },
    [g.contracts, g.burned]
  );

  const sellFile = useCallback(
    (id: string) => {
      if (!g.files.includes(id)) return null;
      const f = resolveFile(id);
      if (!f) return null;

      const v = fenceValue(id);
      if (typeof v === "number") return null;
      const { credits, owed, spent } = v;
      const crew = Math.random() < 0.5 ? "scavenger" : "broken";

      setG((s) => {
        const relations = { ...s.relations };
        
        if (!spent) {
          relations[f.owner] = (relations[f.owner] ?? 0) + CFG.sellRelHit;
          relations[crew] = (relations[crew] ?? 0) + CFG.betrayCrewGain;
          if (owed) relations[owed.client] = (relations[owed.client] ?? 0) + CFG.betrayRelHit;
        }
        return {
          ...s,
          credits: s.credits + credits,
          files: s.files.filter((x) => x !== id),
          
          burned: s.burned.includes(id) ? s.burned : [...s.burned, id],
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

      notify("DATA SOLD", `${at(f.name, f.nameRu, f.nameZh)} · +${credits}cr`, "STATUS");
      if (owed) {
        notify("CONTRACT FAILED", at(owed.title, owed.titleRu, owed.titleZh), "CONTACTS");
        say(owed.contact,
          "you fenced my file. i know to whom. you get nothing else from me.",
          "ты продал мой файл. я знаю, кому. больше я тебе ничего не дам.",
          "你把我的文件销了。卖给谁我都知道。以后从我这儿你什么都别想拿到。",
          { contract: owed.id });
      }
      return { credits, betrayed: owed?.client };
    },
    [g.files, fenceValue, notify, say]
  );

  /* 升级。 */

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
      notify("NEW REGION AVAILABLE", `${up.region.toUpperCase()} · ${at(up.name, up.nameRu, up.nameZh)}`);
      return true;
    },
    [g.credits, g.rep, g.upgrades, notify]
  );

  /* ---------------- 其他内容 ---------------- */

  const markThreadRead = useCallback((contact: string) => {
    setG((s) => {
      const n = (s.threads[contact] ?? []).length;
      return s.threadRead[contact] === n ? s : { ...s, threadRead: { ...s.threadRead, [contact]: n } };
    });
  }, []);

  const setOpenThread = useCallback((contact: string | null) => {
    activeThread.current = contact;
    if (contact) markThreadRead(contact);
  }, [markThreadRead]);

  /** 判断玩家此刻是否正在阅读某个会话，用于避免打断当前对话。 */
  const isAnyThreadOpen = useCallback(
    () => activeThread.current !== null && activeTab.current === "CONTACTS",
    []
  );

  const isThreadOpen = useCallback(
    (contact: string) => activeThread.current === contact && activeTab.current === "CONTACTS",
    []
  );

  const markTab = useCallback((tab: TabId) => {
    activeTab.current = tab;
    if (tab !== "CONTACTS") activeThread.current = null;
    setG((s) => (s.unread[tab] === 0 ? s : { ...s, unread: { ...s.unread, [tab]: 0 } }));
  }, []);

  const markCodexSeen = useCallback((id: string) => {
    setG((s) => (s.codexSeen[id] ? s : { ...s, codexSeen: { ...s.codexSeen, [id]: true } }));
  }, []);

  const reset = useCallback(() => {
    setG(freshState());
    setNotifs([]);
  }, []);

  const setLangRef = useCallback((l: Lang) => {
    langRef.current = l;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      g, notifs, lastHack, nodeState, canHack, hack, download,
      acceptContract, deliverContract, recover, failBreach,
      sabotage, pickChoice, sableArrives, openArchiveJob, openFreddy, openMarla, setFlag, pushBeat,
      openMarket, buyScript, sellFile, fenceValue, buyUpgrade,
      markTab, markThreadRead, setOpenThread, isThreadOpen, isAnyThreadOpen, markCodexSeen, reset,
      lang: langRef.current, setLangRef,
    }),
    [g, notifs, lastHack, nodeState, canHack, hack, download, acceptContract,
     deliverContract, recover, failBreach, sabotage, pickChoice, sableArrives, openArchiveJob, openFreddy, openMarla, setFlag, pushBeat,
     openMarket, buyScript, sellFile, fenceValue,
     buyUpgrade, markTab, markThreadRead, setOpenThread, isThreadOpen, isAnyThreadOpen, markCodexSeen, reset, setLangRef]
  );

  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error("useGame outside provider");
  return c;
}

export { TABS, CFG };
