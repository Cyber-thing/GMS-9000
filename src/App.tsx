import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./utils/cn";
import TopBar from "./components/TopBar";
import NetworkMap from "./components/NetworkMap";
import WorldMap from "./components/WorldMap";
import LoginGate from "./components/LoginGate";
import NodeDossier from "./components/NodeDossier";
import SidePanel from "./components/SidePanel";
import Resizer from "./components/Resizer";
import ConfirmDialog from "./components/ConfirmDialog";
import BreachGame from "./components/BreachGame";
import DataVault from "./components/DataVault";
import BlackMarket from "./components/BlackMarket";
import Splash from "./components/Splash";
import TutorialCall from "./components/TutorialCall";
import { tutorialSeen, useTut } from "./game/tutorial";
import { useColumns } from "./hooks/useColumns";
import { EventLog, SectorPanel, mkEvent, type NetEvent } from "./components/InfoPanels";
import TerminalBar, { type TermLine } from "./components/TerminalBar";
import CrtOverlay from "./components/CrtOverlay";
import { ALL_NODES, REGION_DATA, regionNodeById, regionSectorById } from "./data/regions";
import { REGIONS, regionById, type RegionDef } from "./data/world";
import {
  AMBIENT_POOL, CHAT_POOL, GREETING_POOL, REPLY_POOL,
  type ChannelId, type ChatMsg,
} from "./data/chat";
import { fillTemplate, pick, randInt, stampNow, clockNow, store } from "./lib/util";
import { useT } from "./i18n";
import {
  RU_AMBIENT_POOL, RU_CHAT_POOL, RU_GREETING_POOL, RU_REPLY_POOL,
  SEED_HISTORY, regionContinent, sectorName as locSectorName,
} from "./i18n/content";
import { useGame } from "./game/state";
import { NODE_META, factionById, resolveFile } from "./game/data";
import { Lock, ShoppingBag } from "lucide-react";
import { tierOf, usesBreach } from "./game/breach";
import { usesVault } from "./game/vault";
import type { NodeState, NotifKind, TabId } from "./game/types";

/* every game notification is narrated by the system console */
const NOTIF_TONE: Record<NotifKind, TermLine["tone"]> = {
  "NEW CODEX ENTRY": "ok",
  "CODEX UPDATED": "warn",
  "NEW CONTACT MESSAGE": undefined,
  "NEW CONTRACT": "warn",
  "CONTRACT COMPLETED": "ok",
  "NODE UNLOCKED": "ok",
  "NEW REGION AVAILABLE": "ok",
  "REP INCREASED": "ok",
  "FACTION RELATIONS CHANGED": "warn",
  "DATA ACQUIRED": "ok",
  "SYSTEM RECOVERY REQUIRED": "err",
  "WARDEN LOCKOUT": "err",
  "CONTRACT FAILED": "err",
  "DATA SOLD": "warn",
  "SCRIPT ACQUIRED": "ok",
  "BLACK MARKET ONLINE": "warn",
  "SABOTAGE COMPLETE": "ok",
};

/* ------------------------------------------------------------------ */

let uid = 1;
const nid = () => uid++;

const mkTerm = (text: string, tone?: TermLine["tone"]): TermLine => ({ id: nid(), t: clockNow(), text, tone });

const mkChat = (ch: ChannelId, nick: string, text: string, self = false, corp = false): ChatMsg => ({
  id: nid(), ch, nick, text, t: stampNow(), self, corp,
});

const GREET_RE = /\b(hi+|hello+|hey[ay]*|yo\b|sup\b|greetings?|hola|allo|hallo|привет|здоров|ку)\b/i;

/* ------------------------------------------------------------------ */

export default function App() {
  const { t, lang } = useT();
  const game = useGame();
  const { g, notifs, hack, download, canHack, failBreach, sabotage, markTab, nodeState } = game;
  const tut = useTut();
  const tutFire = tut.fire;

  const langRef = useRef(lang);
  langRef.current = lang;
  useEffect(() => game.setLangRef(lang), [lang, game]);

  const pools = useCallback(
    () =>
      langRef.current === "ru"
        ? { chat: RU_CHAT_POOL, reply: RU_REPLY_POOL, greet: RU_GREETING_POOL, amb: RU_AMBIENT_POOL }
        : { chat: CHAT_POOL, reply: REPLY_POOL, greet: GREETING_POOL, amb: AMBIENT_POOL },
    []
  );

  /* ---------- session ---------- */
  const [splash, setSplash] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [operator, setOperator] = useState(() => store.get("operator", "UNKNOWN"));
  const [fx, setFx] = useState(() => store.get("fx", true));
  const operatorRef = useRef(operator);
  operatorRef.current = operator;

  /* ---------- navigation ---------- */
  const [view, setView] = useState<string>("world");
  const [trace, setTrace] = useState<RegionDef | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pane, setPane] = useState<"map" | "data">("map");
  const [tab, setTab] = useState<TabId>("CHAT");
  const [askLogout, setAskLogout] = useState(false);

  /* resizable three-column layout (desktop only) */
  const { hostRef, left: colLeft, right: colRight, dragging, startDrag, resetCol, nudge } = useColumns();

  const inRegion = view !== "world";
  const rdata = inRegion ? REGION_DATA[view] : null;
  const region = inRegion ? regionById(view) : undefined;
  const nodes = rdata?.nodes ?? [];
  const sectors = rdata?.sectors ?? [];
  const links = rdata?.links ?? [];
  const viewRef = useRef(view);
  viewRef.current = view;

  /* ---------- hacking animation ---------- */
  const [hackingId, setHackingId] = useState<string | null>(null);
  const [hackPct, setHackPct] = useState(0);
  const hackIv = useRef<number | null>(null);
  /** node currently played through the breach mini-game */
  const [breachId, setBreachId] = useState<string | null>(null);
  /** data server whose file system is open */
  const [vaultId, setVaultId] = useState<string | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);

  /* ---------- console output ---------- */
  const [termLines, setTermLines] = useState<TermLine[]>([]);
  const [events, setEvents] = useState<NetEvent[]>([]);
  const [termOpen, setTermOpen] = useState(false);
  const timeouts = useRef<number[]>([]);

  const print = useCallback((text: string, tone?: TermLine["tone"], tag?: string) => {
    setTermLines((ls) => [...ls.slice(-119), { ...mkTerm(text, tone), tag }]);
  }, []);
  const pushEvent = useCallback((text: string, kind: NetEvent["kind"] = "info") => {
    setEvents((es) => [...es.slice(-79), mkEvent(nid(), text, kind)]);
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    const h = window.setTimeout(fn, ms);
    timeouts.current.push(h);
  }, []);

  useEffect(
    () => () => {
      timeouts.current.forEach(clearTimeout);
      if (hackIv.current !== null) clearInterval(hackIv.current);
    },
    []
  );
  useEffect(() => void store.set("operator", operator), [operator]);
  useEffect(() => void store.set("fx", fx), [fx]);

  /* node states for the map */
  const nodeStates = useMemo(() => {
    const out: Record<string, NodeState> = {};
    ALL_NODES.forEach((n) => (out[n.id] = nodeState(n.id)));
    return out;
  }, [nodeState]);
  const compromised = useMemo(
    () => new Set(Object.entries(nodeStates).filter(([, s]) => s === "COMPROMISED").map(([k]) => k)),
    [nodeStates]
  );

  const templateCtx = useCallback(() => {
    const v = viewRef.current;
    const rd = v !== "world" ? REGION_DATA[v] : null;
    const sc = rd ? pick(rd.sectors) : null;
    return {
      sector: sc ? locSectorName(langRef.current, sc.id, sc.name) : pick(REGIONS).code,
      node: rd ? pick(rd.nodes).code : pick(ALL_NODES).code,
      n: String(randInt(2, 96)),
      op: (operatorRef.current || "operator").toLowerCase(),
    };
  }, []);

  /* ---------- boot ---------- */
  useEffect(() => {
    if (!loggedIn) return;
    const op = operatorRef.current;
    const boot: [string, TermLine["tone"], number][] = [
      [t("t.auth", { op }), "ok", 100],
      [t("t.init"), undefined, 550],
      [t("t.carrier"), "ok", 1150],
      [t("t.regions"), undefined, 1650],
      [t("t.dead"), "warn", 2250],
      [t("t.sat"), "dim", 2750],
      [t("t.ready"), "ok", 3300],
    ];
    boot.forEach(([txt, tone, at]) => later(() => print(txt, tone), at));
    later(() => pushEvent(t("e.sessionOpened", { op }), "good"), 3400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  /* ---------- chat ---------- */
  const [chat, setChat] = useState<Record<ChannelId, ChatMsg[]>>(() => {
    const seed: Record<ChannelId, ChatMsg[]> = { GLOBAL: [], OPERATORS: [], MARKET: [], CORPORATE: [], PRIVATE: [] };
    SEED_HISTORY[langRef.current].forEach(([ch, nick, text]) =>
      seed[ch].push(mkChat(ch, nick, text, false, ch === "CORPORATE"))
    );
    return seed;
  });
  const [activeCh, setActiveCh] = useState<ChannelId>("GLOBAL");
  const [chUnread, setChUnread] = useState<Record<ChannelId, number>>({
    GLOBAL: 0, OPERATORS: 0, MARKET: 0, CORPORATE: 0, PRIVATE: 0,
  });
  const activeChRef = useRef(activeCh);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const pushChat = useCallback((ch: ChannelId, nick: string, text: string, corp = false) => {
    setChat((c) => ({ ...c, [ch]: [...c[ch].slice(-119), mkChat(ch, nick, text, false, corp)] }));
    setChUnread((u) =>
      activeChRef.current === ch && tabRef.current === "CHAT" ? u : { ...u, [ch]: Math.min(99, u[ch] + 1) }
    );
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    const globalTick = () => {
      if (!alive) return;
      const m = pick(pools().chat.GLOBAL.msgs);
      pushChat("GLOBAL", m.nick, fillTemplate(m.text, templateCtx()));
      timeouts.current.push(window.setTimeout(globalTick, randInt(2600, 5600)));
    };
    const OTHERS: [Exclude<ChannelId, "GLOBAL">, number][] = [
      ["OPERATORS", 0.34], ["MARKET", 0.24], ["CORPORATE", 0.22], ["PRIVATE", 0.2],
    ];
    const otherTick = () => {
      if (!alive) return;
      let r = Math.random();
      let ch: ChannelId = "OPERATORS";
      for (const [c, w] of OTHERS) {
        if (r < w) { ch = c; break; }
        r -= w;
      }
      const m = pick(pools().chat[ch].msgs);
      pushChat(ch, m.nick, fillTemplate(m.text, templateCtx()), ch === "CORPORATE");
      timeouts.current.push(window.setTimeout(otherTick, randInt(7000, 14000)));
    };
    timeouts.current.push(window.setTimeout(globalTick, 2200), window.setTimeout(otherTick, 5200));
    return () => { alive = false; };
  }, [loggedIn, pushChat, templateCtx, pools]);

  const switchChannel = useCallback((ch: ChannelId) => {
    setActiveCh(ch);
    activeChRef.current = ch;
    setChUnread((u) => ({ ...u, [ch]: 0 }));
    print(t("t.joined", { ch: t(`ch.${ch}`).toLowerCase() }), "dim");
  }, [print, t]);

  const sendChat = useCallback(
    (text: string) => {
      const ch = activeChRef.current;
      const op = operatorRef.current;
      setChat((c) => ({ ...c, [ch]: [...c[ch].slice(-119), mkChat(ch, op, text, true)] }));
      print(t("t.tx", { ch: t(`ch.${ch}`).toLowerCase(), n: text.length }), "dim");

      if (GREET_RE.test(text) && ch !== "CORPORATE") {
        const n = randInt(2, 4);
        [...pools().greet].sort(() => Math.random() - 0.5).slice(0, n).forEach((gr, i) =>
          later(() => pushChat(ch, gr.nick, fillTemplate(gr.text, { op: op.toLowerCase() })), 700 + i * randInt(700, 1400))
        );
        return;
      }
      if (Math.random() < 0.5) {
        const cands = pools().reply.filter((r) => r.ch === ch || r.ch === "ANY");
        const rep = pick(cands);
        later(() => pushChat(ch, rep.nick, fillTemplate(rep.text, { op: op.toLowerCase() })), randInt(1800, 4800));
      }
    },
    [print, pushChat, later, t, pools]
  );

  /* ---------- navigation actions ---------- */
  const enterRegion = useCallback(
    (r: RegionDef) => {
      if (trace) return;
      if (!g.regions.includes(r.id)) {
        print(t("t.regionLocked", { code: r.code }), "err");
        pushEvent(t("t.regionLocked", { code: r.code }), "warn");
        return;
      }
      setTrace(r);
      const cont = regionContinent(langRef.current, r.id, r.continent);
      print(t("t.routeResolve", { code: r.code, cont }), "ok");
      later(() => print(t("t.inject"), "dim"), 420);
      later(() => print(t("t.handoff", { code: r.code }), "ok"), 1900);
      setSelectedNode(null);
      setSelectedSector(null);
      later(() => {
        setView(r.id);
        setTrace(null);
        const rd = REGION_DATA[r.id];
        const saved = store.get<string | null>(`sector.${r.id}`, null);
        if (saved && rd.sectors.some((s) => s.id === saved)) setSelectedSector(saved);
        tutFire(`region:${r.id}` as never);
        pushEvent(t("e.routeEstablished", { code: r.code, cont }), "good");
        print(t("t.gridLoaded", { s: rd.sectors.length, n: rd.nodes.length }), "ok");
      }, 2350);
    },
    [trace, g.regions, print, pushEvent, later, t, tutFire]
  );

  const backToWorld = useCallback(() => {
    if (viewRef.current === "world") return;
    store.set(`sector.${viewRef.current}`, selectedSector);
    setView("world");
    setSelectedSector(null);
    setSelectedNode(null);
    print(t("t.uplinkCut"), "warn");
    pushEvent(t("e.backWorld"), "info");
  }, [print, pushEvent, selectedSector, t]);

  const deadPoint = useCallback(
    (code: string) => {
      const note = t(`dead.${code}`);
      print(t("t.dialDead", { code, note }), "err");
      pushEvent(t("e.deadUnreachable", { code, note }), "warn");
    },
    [print, pushEvent, t]
  );

  const selectSector = useCallback(
    (id: string) => {
      setSelectedSector(id);
      const s = regionSectorById(sectors, id);
      if (!s) return;
      const count = nodes.filter((n) => n.sector === id).length;
      const nm = locSectorName(langRef.current, s.id, s.name);
      print(t("t.sectorScan", { code: s.code, name: nm, st: t(`st.${s.status}`), n: count }));
      pushEvent(t("e.sectorSelected", { name: nm }), "info");
      setSelectedNode((cur) => (cur && regionNodeById(nodes, cur)?.sector === id ? cur : null));
    },
    [sectors, nodes, print, pushEvent, t]
  );

  const selectNode = useCallback(
    (id: string) => {
      const n = regionNodeById(nodes, id);
      if (!n) return;
      setSelectedNode(id);
      setSelectedSector(n.sector);
      setPane("data");
      tutFire(`node:${id}` as never);
      print(
        t("t.interrogate", {
          code: n.code,
          type: t(`type.${n.type}`),
          st: t(`nst.${nodeState(id)}`),
        })
      );
    },
    [nodes, print, t, nodeState, tutFire]
  );

  /* ---------- GENIUS intrusion ---------- */
  /** shared payoff: applied by both the scripted hack and the mini-game */
  const completeHack = useCallback(
    (id: string) => {
      const n = ALL_NODES.find((x) => x.id === id);
      const res = hack(id);
      if (!n || !res) {
        print(t("hk.blocked", { r: "WARDEN" }), "err");
        return;
      }
      print(t("hk.granted", { code: n.code }), "ok");
      if (res.repeat) print(t("hk.repeat"), "warn");
      else print(t("hk.rep", { n: res.rep }), "ok");
      pushEvent(t("hk.granted", { code: n.code }), "good");

      const own = factionById(res.owner);
      if (res.relation !== 0 && own) {
        pushEvent(t("hk.rel", { owner: lang === "ru" ? own.nameRu : own.name, n: res.relation }), "bad");
      }
      res.unlocked.forEach((nb) => {
        const nn = ALL_NODES.find((x) => x.id === nb);
        if (nn) pushEvent(t("hk.unlock", { code: nn.code }), "good");
      });
      if (res.files.length) print(t("hk.files", { n: res.files.length }), "dim");
      tutFire(`hack:${id}` as never);
    },
    [hack, print, pushEvent, t, lang, tutFire]
  );

  const runHack = useCallback(
    (id: string) => {
      if (hackingId || breachId) return;
      const chk = canHack(id);
      const n = ALL_NODES.find((x) => x.id === id);
      if (!n) return;
      if (!chk.ok) {
        print(t("hk.blocked", { r: chk.reason ?? "" }), "err");
        return;
      }

      /* ACCESS hosts on a supported WARDEN tier are played by hand */
      if (usesBreach(id)) {
        setBreachId(id);
        tutFire("breach:start");
        print(t("t.bgStart", { code: n.code }), "ok");
        return;
      }

      const meta = NODE_META[id];
      setHackingId(id);
      setHackPct(0);
      print(t("hk.start", { code: n.code }), "ok");

      const iv = window.setInterval(() => setHackPct((p) => Math.min(96, p + Math.random() * 14)), 180);
      hackIv.current = iv;

      later(() => print(t("hk.probe", { n: meta.warden }), "dim"), 620);
      later(() => print(t("hk.bypass", { p: randInt(34, 62) }), "dim"), 1340);
      later(() => print(t("hk.bypass", { p: randInt(70, 93) }), "dim"), 2050);

      later(() => {
        clearInterval(iv);
        hackIv.current = null;
        setHackPct(100);
        setHackingId(null);
        completeHack(id);
      }, 2750);
    },
    [hackingId, breachId, canHack, completeHack, print, later, t, tutFire]
  );

  /* ---------- breach mini-game outcomes ---------- */
  const breachWin = useCallback(() => {
    const id = breachId;
    setBreachId(null);
    tutFire("breach:win");
    if (id) completeHack(id);
  }, [breachId, completeHack, tutFire]);

  const breachLose = useCallback(
    (reason: "timeout" | "abort") => {
      const id = breachId;
      setBreachId(null);
      if (!id) return;
      const n = ALL_NODES.find((x) => x.id === id);
      if (reason === "abort") {
        print(t("t.bgAbort"), "warn");
        return;
      }
      const tier = tierOf(id);
      const loss = tier?.failRep ?? 0;
      print(t("t.bgTimeout"), "err");
      if (loss > 0) {
        print(t("t.bgRepLoss", { n: loss }), "err");
        failBreach(id, loss);
      }
      if (n) pushEvent(t("e.bgTimeout", { code: n.code }), "bad");
    },
    [breachId, failBreach, print, pushEvent, t]
  );

  const runDownload = useCallback(
    (_nodeId: string, fileId: string) => {
      download(fileId);
      tutFire(`file:${fileId}` as never);
      const f = resolveFile(fileId);
      if (f) pushEvent(t("hk.download", { name: lang === "ru" ? f.nameRu : f.name }), "good");
    },
    [download, pushEvent, t, lang, tutFire]
  );

  /* ---------- data vault ---------- */
  const openVault = useCallback(
    (id: string) => {
      if (!usesVault(id)) return;
      const n = ALL_NODES.find((x) => x.id === id);
      setVaultId(id);
      tutFire("vault:open");
      if (n) print(t("dv.logOpen", { code: n.code }), "ok");
    },
    [print, t, tutFire]
  );

  const closeVault = useCallback(() => {
    setVaultId(null);
    print(t("dv.logOff"), "dim");
  }, [print, t]);

  /* ---------- tutorial: watch contract milestones ---------- */
  const ctState = g.contracts["ct_payroll"]?.state;
  useEffect(() => {
    if (ctState === "ACCEPTED" || ctState === "TARGET ACCESSED" || ctState === "DATA ACQUIRED")
      tutFire("accept:ct_payroll");
    if (ctState === "DELIVERED" || ctState === "COMPLETED") tutFire("deliver:ct_payroll");
  }, [ctState, tutFire]);

  /* ---------- sabotage ---------- */
  const runSabotage = useCallback(
    (id: string) => {
      const n = ALL_NODES.find((x) => x.id === id);
      if (!sabotage(id) || !n) return;
      print(t("t.sabotage", { code: n.code }), "err");
      pushEvent(t("e.sabotage", { code: n.code }), "bad");
    },
    [sabotage, print, pushEvent, t]
  );

  /* recovery feedback */
  const wasRecovering = useRef(false);
  useEffect(() => {
    if (g.recovering && !wasRecovering.current) print(t("hk.recovering"), "warn");
    if (!g.recovering && wasRecovering.current) {
      print(t("hk.recovered"), "ok");
      pushEvent(t("hk.recovered"), "good");
    }
    wasRecovering.current = g.recovering;
  }, [g.recovering, print, pushEvent, t]);

  /* ---------- ambient flavour ---------- */
  useEffect(() => {
    if (!loggedIn) return;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const ev = pick(pools().amb);
      pushEvent(fillTemplate(ev.text, templateCtx()), ev.kind);
      timeouts.current.push(window.setTimeout(tick, randInt(19000, 36000)));
    };
    timeouts.current.push(window.setTimeout(tick, 14000));
    return () => { alive = false; };
  }, [loggedIn, pushEvent, templateCtx, pools]);

  const [occupancy, setOccupancy] = useState(randInt(58, 121));
  useEffect(() => {
    if (!loggedIn) return;
    const h = setInterval(() => setOccupancy((o) => Math.max(31, Math.min(240, o + randInt(-4, 5)))), 9000);
    return () => clearInterval(h);
  }, [loggedIn]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "`" || e.code === "Backquote")) {
        e.preventDefault();
        setTermOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ---------- notifications are narrated by the console ---------- */
  const lastNotif = useRef(0);
  useEffect(() => {
    if (!notifs.length) return;
    const fresh = notifs.filter((n) => n.id > lastNotif.current);
    if (!fresh.length) return;
    lastNotif.current = notifs[notifs.length - 1].id;
    fresh.forEach((n) => print(n.text, NOTIF_TONE[n.kind], t(`nf.${n.kind}`)));
  }, [notifs, print, t]);

  /* ---------- disconnect: back to the login terminal ---------- */
  const logout = useCallback(() => {
    const op = operatorRef.current;
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    if (hackIv.current !== null) {
      clearInterval(hackIv.current);
      hackIv.current = null;
    }
    setAskLogout(false);
    setMarketOpen(false);
    setVaultId(null);
    setBreachId(null);
    setHackingId(null);
    setHackPct(0);
    setTrace(null);
    setView("world");
    setSelectedSector(null);
    setSelectedNode(null);
    setPane("map");
    setTab("CHAT");
    setTermLines([]);
    setEvents([]);
    setTermOpen(false);
    print(t("t.logout", { op }), "warn");
    setLoggedIn(false);
  }, [print, t]);

  const switchTab = useCallback((id: TabId) => {
    setTab(id);
    markTab(id);
    tutFire(`tab:${id}` as never);
    if (id === "CHAT") setChUnread((u) => ({ ...u, [activeChRef.current]: 0 }));
  }, [markTab, tutFire]);

  /* ------------------------------------------------------------------ */

  if (splash) {
    return (
      <>
        <Splash onDone={() => setSplash(false)} />
        {fx && <CrtOverlay />}
      </>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <LoginGate
          savedHandle={operator}
          onEnter={(h) => {
            setOperator(h);
            const seed: Record<ChannelId, ChatMsg[]> = {
              GLOBAL: [], OPERATORS: [], MARKET: [], CORPORATE: [], PRIVATE: [],
            };
            SEED_HISTORY[langRef.current].forEach(([ch, nick, text]) =>
              seed[ch].push(mkChat(ch, nick, text, false, ch === "CORPORATE"))
            );
            setChat(seed);
            setLoggedIn(true);
            if (!tutorialSeen()) setTimeout(() => tut.start(), 1200);
          }}
        />
        {fx && <CrtOverlay />}
      </>
    );
  }

  const sector = selectedSector ? regionSectorById(sectors, selectedSector) ?? null : null;
  const node = selectedNode && rdata ? regionNodeById(nodes, selectedNode) ?? null : null;
  const nodeSector = node ? regionSectorById(sectors, node.sector) : undefined;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink text-fog">
      <TopBar
        sessions={compromised.size}
        fx={fx}
        onToggleFx={() => {
          print(fx ? t("t.crtOff") : t("t.crtOn"), "dim");
          setFx((f) => !f);
        }}
        operator={operator}
        onSetOperator={(v) => {
          setOperator(v);
          print(t("t.handleSet", { op: v }), "ok");
          pushEvent(t("e.handleSet", { op: v }), "good");
        }}
        networkName={
          inRegion && region
            ? `${region.code} · ${regionContinent(lang, region.id, region.continent)}`
            : t("top.globalgrid")
        }
        onLogout={() => setAskLogout(true)}
      />

      <main
        ref={hostRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2 lg:flex-row lg:gap-0"
      >
        {/* narrow-screen pane switcher */}
        <div className="order-1 flex shrink-0 gap-px border border-line bg-soot lg:hidden">
          {([["map", inRegion ? t("pane.region") : t("pane.world")], ["data", t("pane.data")]] as const).map(
            ([id, label]) => (
              <button
                key={id}
                onClick={() => setPane(id)}
                className={cn(
                  "flex-1 px-2 py-[6px] text-[8.5px] font-bold uppercase tracking-[0.18em] transition-colors",
                  pane === id
                    ? "bg-phos/15 text-phosbrite shadow-[inset_0_-2px_0_#8fb56d]"
                    : "text-faint hover:bg-panel2 hover:text-dim"
                )}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* left column */}
        <aside
          style={{ ["--col" as string]: `${colLeft}px` }}
          className={cn(
            "order-3 w-full flex-col gap-2 overflow-y-auto md:flex-row lg:order-1 lg:flex lg:h-full lg:min-w-0 lg:flex-none lg:basis-[var(--col)] lg:flex-col lg:overflow-x-hidden",
            pane === "data" ? "flex min-h-0 flex-1" : "hidden"
          )}
        >
          <div className="w-full md:w-1/3 lg:w-full">
            <SectorPanel
              sector={sector}
              nodes={nodes}
              statuses={nodeStates}
              selectedNode={selectedNode}
              onSelectNode={selectNode}
              emptyHint={inRegion ? t("sec.hintRegion") : t("sec.hintWorld")}
            />
          </div>
          <div className="w-full md:w-1/3 lg:w-full">
            <NodeDossier
              node={node}
              sectorName={nodeSector ? locSectorName(lang, nodeSector.id, nodeSector.name) : undefined}
              sectorCode={nodeSector?.code}
              regionName={region?.code}
              hackingId={hackingId}
              hackPct={hackPct}
              onHack={runHack}
              onDownload={runDownload}
              onEnterVault={openVault}
              onSabotage={runSabotage}
            />
          </div>
          <div className="flex min-h-[190px] w-full flex-col md:w-1/3 lg:w-full lg:min-h-0 lg:flex-1">
            <EventLog events={events} />
          </div>
        </aside>

        <Resizer
          side="left"
          active={dragging === "left"}
          onDrag={startDrag}
          onReset={resetCol}
          onNudge={nudge}
          className="order-2"
        />

        {/* map */}
        <section
          className={cn(
            "order-2 w-full flex-col gap-1.5 lg:order-3 lg:mx-0 lg:flex lg:h-auto lg:min-h-0 lg:min-w-0 lg:flex-1",
            pane === "map" ? "flex min-h-0 flex-1" : "hidden"
          )}
        >
          <div className="min-h-0 flex-1">
          {inRegion && rdata && region ? (
            <NetworkMap
              region={region}
              sectors={sectors}
              nodes={nodes}
              links={links}
              statuses={nodeStates}
              connected={compromised}
              connectingId={hackingId ?? breachId}
              selectedSector={selectedSector}
              selectedNode={selectedNode}
              onSelectSector={selectSector}
              onSelectNode={selectNode}
              onBackToWorld={backToWorld}
            />
          ) : (
            <WorldMap
              trace={trace}
              onEnterRegion={enterRegion}
              onDeadPoint={deadPoint}
              connectedCount={compromised.size}
              unlockedRegions={g.regions}
            />
          )}
          </div>

          {/* map-column footer — the market door lives here, never over the canvas */}
          <div className="flex h-[26px] shrink-0 items-center justify-end gap-2 border border-line bg-soot px-2">
            <span className="mr-auto hidden truncate text-[7.5px] uppercase tracking-[0.18em] text-faint sm:inline">
              {inRegion ? t("map.panHint") : t("bm.footer")}
            </span>
            <button
              onClick={() => setMarketOpen(true)}
              title={t("bm.open")}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border px-2 py-[3px] text-[8.5px] font-bold uppercase tracking-[0.14em] transition-all",
                g.market.unlocked
                  ? "border-[#c25b46] bg-[#1a0f0d] text-[#e0634a] hover:bg-[#c25b46] hover:text-ink"
                  : "border-line3 text-dim hover:border-[#c25b46]/70 hover:text-[#e0634a]"
              )}
            >
              <ShoppingBag size={11} />
              {t("bm.open")}
              {!g.market.unlocked && <Lock size={9} className="opacity-70" />}
            </button>
          </div>
        </section>

        <Resizer
          side="right"
          active={dragging === "right"}
          onDrag={startDrag}
          onReset={resetCol}
          onNudge={nudge}
          className="order-4"
        />

        {/* right column: tabbed game panel */}
        <aside
          style={{ ["--col" as string]: `${colRight}px` }}
          className="order-5 min-h-[210px] w-full shrink-0 basis-[44%] sm:basis-[42%] lg:order-5 lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-none lg:basis-[var(--col)]"
        >
          <SidePanel
            tab={tab}
            onTab={switchTab}
            messages={chat}
            activeCh={activeCh}
            onSwitchCh={switchChannel}
            chUnread={chUnread}
            onSend={sendChat}
            operator={operator}
            occupancy={occupancy}
          />
        </aside>
      </main>

      {marketOpen && (
        <BlackMarket
          onClose={() => setMarketOpen(false)}
          onLog={(k, params) => print(t(k, params), "warn")}
        />
      )}

      <TutorialCall />

      <TerminalBar lines={termLines} expanded={termOpen} onToggle={() => setTermOpen((o) => !o)} />

      {breachId && (() => {
        const bn = ALL_NODES.find((x) => x.id === breachId);
        const bt = tierOf(breachId);
        if (!bn || !bt) return null;
        return (
          <BreachGame
            key={breachId}
            nodeCode={bn.code}
            warden={NODE_META[breachId].warden}
            tier={bt}
            onWin={breachWin}
            onLose={breachLose}
            onAbort={() => breachLose("abort")}
            onLog={(k, params) => print(t(k, params), "dim")}
          />
        );
      })()}

      {vaultId && (() => {
        const vn = ALL_NODES.find((x) => x.id === vaultId);
        if (!vn) return null;
        const own = factionById(NODE_META[vaultId].owner);
        return (
          <DataVault
            key={vaultId}
            nodeId={vaultId}
            nodeCode={vn.code}
            ownerName={own ? (lang === "ru" ? own.nameRu : own.name) : ""}
            ownedFiles={g.files}
            onAcquire={(fid) => runDownload(vaultId, fid)}
            onClose={closeVault}
            onLog={(k, params) => print(t(k, params), "dim")}
          />
        );
      })()}

      {askLogout && (
        <ConfirmDialog
          title={t("logout.title")}
          body={t("logout.body")}
          confirmLabel={t("logout.confirm")}
          cancelLabel={t("logout.cancel")}
          onConfirm={logout}
          onCancel={() => setAskLogout(false)}
        />
      )}

      {fx && <CrtOverlay />}
    </div>
  );
}
