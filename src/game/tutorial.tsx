import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { store } from "../lib/util";

/* ================================================================== */
/* TUTORIAL — a scripted call from Ghost_404 on the first session.     */
/* Steps either wait for a game event or for the operator to click     */
/* through. Each step may spotlight one interface element.             */
/* ================================================================== */

export type TutEvent =
  | "tab:CONTACTS"
  | "accept:ct_payroll"
  | "region:west1"
  | "node:w1p_dsv"
  | "node:w1p_acc"
  | "breach:start"
  | "breach:win"
  | "hack:w1p_dsv"
  | "vault:open"
  | "file:f_icx_payroll"
  | "deliver:ct_payroll"
  | "thread:ghost"
  | "anonymity";

/** spotlight keys read by the UI components */
export type TutHighlight =
  | "sidepanel"
  | "tab:CONTACTS"
  | "offer"
  | "world:west1"
  | "node:w1p_dsv"
  | "node:w1p_acc"
  | "connect"
  | "vault"
  | "vault:close"
  | "deliver"
  | "thread:ghost"
  | "anonymity";

export interface TutStep {
  id: string;
  en: string;
  ru: string;
  highlight?: TutHighlight[];
  /** advances automatically when this event fires; otherwise click to continue */
  waitFor?: TutEvent;
  /** renders the yes / no fork */
  choice?: boolean;
  /** last line — ends the call */
  final?: boolean;
  /** plays the hacker-exchange listing animation behind the call */
  listing?: boolean;
}

export const TUT_STEPS: TutStep[] = [
  {
    id: "intro",
    en: "They redesigned the interface again. These idiots never leave us alone. Fine — I already worked most of it out, do not waste your time.",
    ru: "Они снова обновили интерфейс. Эти идиоты не оставляют нас в покое. Ладно, я уже немного разобрался, не трать время.",
  },
  {
    id: "ask",
    en: "Let me run you through the basics, quickly.",
    ru: "Давай быстро по основным моментам.",
    choice: true,
  },
  {
    id: "panel",
    en: "The main comms window is here now.",
    ru: "Окно главных коммуникаций теперь здесь.",
    highlight: ["sidepanel"],
  },
  {
    id: "contacts",
    en: "Check your messages.",
    ru: "Загляни в переписки.",
    highlight: ["tab:CONTACTS"],
    waitFor: "tab:CONTACTS",
  },
  {
    id: "offer",
    en: "There is a job from me in there. Easy money.",
    ru: "Там заказ от меня. Проще простого.",
    highlight: ["thread:ghost"],
    waitFor: "thread:ghost",
  },
  {
    id: "accept",
    en: "Take it.",
    ru: "Принимай.",
    highlight: ["offer"],
    waitFor: "accept:ct_payroll",
  },
  {
    id: "world",
    en: "The server sits in WEST1.",
    ru: "Сервер находится на WEST1.",
    highlight: ["world:west1"],
    waitFor: "region:west1",
  },
  {
    id: "dsv",
    en: "That is our client right there.",
    ru: "Вот наш клиент.",
    highlight: ["node:w1p_dsv"],
    waitFor: "node:w1p_dsv",
  },
  {
    id: "locked",
    en: "Damn — access is closed. Fine, deal with that first.",
    ru: "Чёрт, доступ закрыт. Ладно, разберись с этим.",
    highlight: ["node:w1p_acc", "connect"],
    waitFor: "node:w1p_acc",
  },
  {
    id: "genius",
    en: "Fire up GENIUS.",
    ru: "Запускай Гения.",
    highlight: ["connect"],
    waitFor: "breach:start",
  },
  {
    id: "breach",
    en: "What a primitive little topology. Get the access and let us move on to the server. Do not dawdle — WARDEN does not sleep.",
    ru: "Какая примитивная карта сети. Получай доступ и погнали на сервер. Только смотри не тормози, WARDEN не спит.",
    waitFor: "breach:win",
  },
  {
    id: "dsv2",
    en: "There. The server is ours — fire up GENIUS.",
    ru: "Всё, сервер наш, запускай гения.",
    highlight: ["node:w1p_dsv", "connect"],
    waitFor: "hack:w1p_dsv",
  },
  {
    id: "vault",
    en: "Open it up and find my documents.",
    ru: "Открывай и найди мои документы.",
    highlight: ["vault"],
    waitFor: "vault:open",
  },
  {
    id: "scan",
    en: "It is all junk in here. Find what I need and we are gone. This box has no defence, but keep in mind the real corporations run WARDEN in here too. Scan the files.",
    ru: "Здесь куча мусора. Найди то, что мне нужно и сваливаем. На этом серваке нет защиты, но учти, что у нормальных корпоратов WARDEN стоит и здесь. Сканируй файлы.",
    waitFor: "file:f_icx_payroll",
  },
  {
    id: "send",
    en: "I can see you have the file. Good. Throw it over to me — and do not you dare fence it on the black market before I get it.",
    ru: "Вижу файл у тебя. Отлично. Бросай его мне. И не вздумай продать его на чёрном рынке до того как пришлёшь мне!",
    /* still inside the volume: light the way out, the CONTACTS tab to get
       back to, and the transfer button itself — otherwise leaving the tab
       during this beat would strand the operator */
    highlight: ["vault:close", "tab:CONTACTS", "thread:ghost", "deliver"],
    waitFor: "deliver:ct_payroll",
  },
  {
    id: "rep",
    en: "And keep an eye on your reputation — in here it is all we have. I am putting your contact on the exchange now. People will start writing with jobs. Do not expect much.",
    ru: "Не забывай следить за своей репутацией хакера — это всё для нас. Я сейчас закину твой контакт на биржу, тебе начнут писать по заказам, но многого не жди.",
  },
  {
    id: "listing",
    en: "There. You are one of us now. Good luck, rookie.",
    ru: "Ну вот, теперь ты среди нас. Удачи, новичок.",
    listing: true,
  },
  {
    id: "anon",
    en: "One more thing — do not forget your anonymity, or they will find you like they found that idiot. Burn your identity at least every five runs.",
    ru: "И да, не забывай об анонимности, или тебя найдут как того идиота. Сбрасывай личность хотя-бы каждые 5 раз.",
    highlight: ["anonymity"],
    waitFor: "anonymity",
  },
  {
    id: "bye",
    en: "Right, the money is yours. You are on your own from here. Just remember WARDEN keeps getting updated, so you are going to need scripts. That is it. Later.",
    ru: "Всё, бабки твои. Дальше разбирайся сам. Только смотри, WARDEN постоянно обновляется, так что тебе понадобятся скрипты. Всё, пока.",
    final: true,
  },
];

export const DECLINE_STEP: TutStep = {
  id: "declined",
  en: "Suit yourself. Figure it out alone. And do not forget my contract.",
  ru: "Ладно, сам разбирайся. И за контракт мой не забудь.",
  final: true,
};

export const CALLER = { nick: "Ghost_404" };

/* ------------------------------------------------------------------ */
/* story calls — scripted monologues that reuse the call window        */
/* ------------------------------------------------------------------ */

export type Avatar = "skull" | "cage";

export interface CallScript {
  id: string;
  nick: string;
  avatar: Avatar;
  lines: { en: string; ru: string }[];
}

export const CALL_SCRIPTS: Record<string, CallScript> = {
  sable1: {
    id: "sable1",
    nick: "sable",
    avatar: "cage",
    lines: [
      {
        en: "Very careless of you, taking data that is not yours. But I respect it. You are new here — I will forgive you this once.",
        ru: "Очень опрометчиво с твоей стороны брать данные, которые тебе не принадлежат. Но я это уважаю. Ты здесь новенький, я прощу тебя на этот раз.",
      },
      {
        en: "You see, the company needs optimisation. Optimisation means cutting costs. And nobody wants to dismiss staff who might cause trouble, or who might still be useful.",
        ru: "Понимаешь ли. Компании нужна оптимизация. Для этого нужно сокращение расходов. И никто не хочет увольнять сотрудников, которые могут доставить проблемы, или которые могут быть полезны.",
      },
      {
        en: "We scheduled the dismissals years ahead for a reason. We make sure that by the time their date comes, these people cannot cause trouble. No money to sue. No family to fight for. All that is left to them is to spare the world their existence.",
        ru: "Мы распланировали увольнения на ближайшие годы не просто так. Мы заботимся о том, что к моменту увольнения эти люди не доставят проблем. У них не будет денег, чтобы подать в суд, у них не будет семьи, ради которой они будут что-то делать. Всё что им останется это избавить мир от своего существования.",
      },
      { en: "And everyone wins.", ru: "И все в выигрыше." },
      {
        en: "Anyway. Go ahead and give that idiot his archive back. Collect your fee.",
        ru: "В общем. Можешь вернуть доступ к архиву этому идиоту и получить свою плату.",
      },
      {
        en: "But he most certainly does not need to see the sealed data you took. It would not do him any good.",
        ru: "Но ему совершенно точно не нужно видеть закрытые данные, которые ты взял. Это ему не на пользу.",
      },
      { en: "Nor you.", ru: "И тебе не на пользу." },
      {
        en: "Send it to me and I will pay double.",
        ru: "Отправь их мне и я заплачу в 2 раза больше.",
      },
      { en: "And everyone wins.", ru: "И все в выигрыше." },
    ],
  },
};

/* ------------------------------------------------------------------ */

type Phase = "idle" | "ringing" | "talking" | "over";

interface Ctx {
  phase: Phase;
  step: TutStep | null;
  /** active story call, if any */
  call: { script: CallScript; idx: number } | null;
  playCall: (id: string) => void;
  callNext: () => void;
  callAnswer: () => void;
  callRinging: boolean;
  hl: TutHighlight | null;
  hls: TutHighlight[];
  isHl: (h: TutHighlight) => boolean;
  /** true while the scripted call is running */
  active: boolean;
  /** true when everything except the spotlight must be dimmed and inert */
  gating: boolean;
  answer: () => void;
  next: () => void;
  choose: (yes: boolean) => void;
  fire: (e: TutEvent) => void;
  satisfy: (e: TutEvent) => void;
  end: () => void;
  start: () => void;
}

const TutCtx = createContext<Ctx | null>(null);

export const tutorialSeen = () => store.get<boolean>("tut.done", false);

interface TutSave { phase: Phase; idx: number; declined: boolean }
const loadTut = (): TutSave =>
  store.get<TutSave>("tut.state", { phase: "idle", idx: 0, declined: false });

export function TutorialProvider({ children }: { children: ReactNode }) {
  const saved = loadTut();
  /* a call that was ringing when the tab closed resumes as ringing */
  const [call, setCall] = useState<{ script: CallScript; idx: number } | null>(null);
  const [callRinging, setCallRinging] = useState(false);
  const [phase, setPhase] = useState<Phase>(saved.phase === "over" ? "over" : saved.phase);
  const [idx, setIdx] = useState(saved.idx);
  const [declined, setDeclined] = useState(saved.declined);
  const idxRef = useRef(saved.idx);
  idxRef.current = idx;

  /* keep the script position across reloads */
  useEffect(() => {
    if (phase === "over") store.set("tut.state", { phase: "over", idx: 0, declined: false });
    else store.set("tut.state", { phase, idx, declined });
  }, [phase, idx, declined]);

  const step = declined ? DECLINE_STEP : (TUT_STEPS[idx] ?? null);
  const active = phase === "ringing" || phase === "talking";

  const end = useCallback(() => {
    setPhase("over");
    store.set("tut.done", true);
    store.set("tut.state", { phase: "over", idx: 0, declined: false });
  }, []);

  const start = useCallback(() => setPhase("ringing"), []);
  const answer = useCallback(() => setPhase("talking"), []);

  const next = useCallback(() => {
    if (declined) { end(); return; }
    const cur = TUT_STEPS[idxRef.current];
    if (!cur || cur.final) { end(); return; }
    setIdx((i) => Math.min(i + 1, TUT_STEPS.length - 1));
  }, [declined, end]);

  const choose = useCallback((yes: boolean) => {
    if (yes) setIdx((i) => i + 1);
    else setDeclined(true);
  }, []);

  /** game events push the script forward when the current step waits for them */
  const fire = useCallback((e: TutEvent) => {
    if (phase !== "talking" || declined) return;
    const cur = TUT_STEPS[idxRef.current];
    if (cur?.waitFor === e) setIdx((i) => Math.min(i + 1, TUT_STEPS.length - 1));
  }, [phase, declined]);

  /** satisfy a step whose objective is already true when it is reached
      (e.g. the payload was picked up before the script asked for it) */
  const satisfy = useCallback((e: TutEvent) => {
    if (phase !== "talking" || declined) return;
    const cur = TUT_STEPS[idxRef.current];
    if (cur?.waitFor === e) setIdx((i) => Math.min(i + 1, TUT_STEPS.length - 1));
  }, [phase, declined]);

  const playCall = useCallback((id: string) => {
    const script = CALL_SCRIPTS[id];
    if (!script) return;
    setCall({ script, idx: 0 });
    setCallRinging(true);
  }, []);

  const callAnswer = useCallback(() => setCallRinging(false), []);

  const callNext = useCallback(() => {
    setCall((c) => {
      if (!c) return c;
      if (c.idx + 1 >= c.script.lines.length) return null;
      return { ...c, idx: c.idx + 1 };
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      phase, step, active,
      call, playCall, callNext, callAnswer, callRinging,
      hl: phase === "talking" && step ? step.highlight?.[0] ?? null : null,
      hls: phase === "talking" && step ? step.highlight ?? [] : [],
      isHl: (h: TutHighlight) =>
        phase === "talking" ? (step?.highlight ?? []).includes(h) : false,
      gating: phase === "talking" && !!step?.highlight?.length,
      answer, next, choose, fire, satisfy, end, start,
    }),
    [phase, step, active, call, playCall, callNext, callAnswer, callRinging,
     answer, next, choose, fire, satisfy, end, start]
  );

  return <TutCtx.Provider value={value}>{children}</TutCtx.Provider>;
}

export function useTut() {
  const c = useContext(TutCtx);
  if (!c) throw new Error("useTut outside provider");
  return c;
}

/** convenience: ring class for a spotlighted element */
export const ring = (on: boolean) => (on ? "tut-ring" : "");
