import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from "react";
import { store } from "../lib/util";

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
  zh?: string;
  highlight?: TutHighlight[];
  
  waitFor?: TutEvent;
  /** 是／否分支。 */
  choice?: boolean;
  
  final?: boolean;
  
  listing?: boolean;
  
  lockAll?: boolean;
}

export const TUT_STEPS: TutStep[] = [
  {
    id: "intro",
    en: "They redesigned the interface again. These idiots never leave us alone. Fine — I already worked most of it out, do not waste your time.",
    ru: "Они снова обновили интерфейс. Эти идиоты не оставляют нас в покое. Ладно, я уже немного разобрался, не трать время.",
    zh: "他们又改版界面了。这帮闲人就是不肯放过咱们。行吧 —— 该摸的我都摸过了，别自己浪费时间。",
    lockAll: true,
  },
  {
    id: "ask",
    en: "Let me run you through the basics, quickly.",
    ru: "Давай быстро по основным моментам.",
    zh: "来，我给你快速过一遍基本操作。",
    choice: true,
    lockAll: true,
  },
  {
    id: "panel",
    en: "The main comms window is here now.",
    ru: "Окно главных коммуникаций теперь здесь.",
    zh: "主通信窗口挪到这儿了。",
    highlight: ["sidepanel"],
  },
  {
    id: "contacts",
    en: "Check your messages.",
    ru: "Загляни в переписки.",
    zh: "看下私信。",
    highlight: ["tab:CONTACTS"],
    waitFor: "tab:CONTACTS",
  },
  {
    id: "offer",
    en: "There is a job from me in there. Easy money.",
    ru: "Там заказ от меня. Проще простого.",
    zh: "里面有我挂的活。白捡的钱。",
    highlight: ["thread:ghost"],
    waitFor: "thread:ghost",
  },
  {
    id: "accept",
    en: "Take it.",
    ru: "Принимай.",
    zh: "接了它。",
    highlight: ["offer"],
    waitFor: "accept:ct_payroll",
  },
  {
    id: "world",
    en: "The server sits in WEST1.",
    ru: "Сервер находится на WEST1.",
    zh: "服务器在 WEST1。",
    highlight: ["world:west1"],
    waitFor: "region:west1",
  },
  {
    id: "dsv",
    en: "That is our client right there.",
    ru: "Вот наш клиент.",
    zh: "喏，客户就在那儿。",
    highlight: ["node:w1p_dsv"],
    waitFor: "node:w1p_dsv",
  },
  {
    id: "locked",
    en: "Damn — access is closed. Find the node that opens the way in and deal with it.",
    ru: "Чёрт, доступ закрыт. Найди узел, с которого можно получить доступ, и разберись с ним.",
    zh: "靠 —— 权限锁着。找到能开路的节点，搞定它。",
    highlight: ["node:w1p_acc", "connect"],
    waitFor: "node:w1p_acc",
  },
  {
    id: "genius",
    en: "Fire up GENIUS.",
    ru: "Запускай Гения.",
    zh: "开 GENIUS。",
    highlight: ["connect"],
    waitFor: "breach:start",
  },
  {
    id: "breach",
    en: "What a primitive little topology. Get the access and let us move on to the server. Do not dawdle — WARDEN does not sleep.",
    ru: "Какая примитивная карта сети. Получай доступ и погнали на сервер. Только смотри не тормози, WARDEN не спит.",
    zh: "这拓扑也太原始了。拿下权限，然后直奔服务器。别磨蹭 —— WARDEN 可不打盹。",
    waitFor: "breach:win",
  },
  {
    id: "dsv2",
    en: "Right — head back to the server and fire up GENIUS.",
    ru: "Всё, возвращайся к серверу и запускай Гения.",
    zh: "行了 —— 回服务器，再开 GENIUS。",
    highlight: ["node:w1p_dsv", "connect"],
    waitFor: "hack:w1p_dsv",
  },
  {
    id: "vault",
    en: "Open it up and find my documents.",
    ru: "Открывай и найди мои документы.",
    zh: "进去，把我的文件翻出来。",
    highlight: ["vault"],
    waitFor: "vault:open",
  },
  {
    id: "scan",
    en: "It is all junk in here. Find what I need and we are gone. This box has no defence, but keep in mind the real corporations run WARDEN in here too. Scan the files.",
    ru: "Здесь куча мусора. Найди то, что мне нужно и сваливаем. На этом серваке нет защиты, но учти, что у нормальных корпоратов WARDEN стоит и здесь. Сканируй файлы.",
    zh: "里面全是破烂。找到我要的东西咱就撤。这台机子没防御，但记住，正经公司在这里面也装 WARDEN。扫文件。",
    waitFor: "file:f_icx_payroll",
  },
  {
    id: "send",
    en: "I can see you have the file. Good. Throw it over to me — and do not you dare fence it on the black market before I get it.",
    ru: "Вижу файл у тебя. Отлично. Бросай его мне. И не вздумай продать его на чёрном рынке до того как пришлёшь мне!",
    zh: "看到你拿到文件了。好。丢给我 —— 敢先挂黑市销赃你试试。",

    highlight: ["vault:close", "tab:CONTACTS", "thread:ghost", "deliver"],
    waitFor: "deliver:ct_payroll",
  },
  {
    id: "rep",
    en: "And keep an eye on your reputation — in here it is all we have. I am putting your contact on the exchange now. People will start writing with jobs. Do not expect much.",
    ru: "Не забывай следить за своей репутацией хакера — это всё для нас. Я сейчас закину твой контакт на биржу, тебе начнут писать по заказам, но многого не жди.",
    zh: "盯紧你的声望 —— 在这儿它就是全部身家。我现在把你挂上名册，会有人来找你派活。别指望太多。",
  },
  {
    id: "listing",
    en: "There. You are one of us now. Good luck, rookie.",
    ru: "Ну вот, теперь ты среди нас. Удачи, новичок.",
    zh: "成了。你现在算圈里人了。好运，菜鸟。",
    listing: true,
  },
  {
    id: "anon",
    en: "One more thing — do not forget your anonymity, or they will find you like they found that idiot. Burn your identity at least every five runs.",
    ru: "И да, не забывай об анонимности, или тебя найдут как того идиота. Сбрасывай личность хотя-бы каждые 5 раз.",
    zh: "还有一句 —— 别忘了匿名，不然那个白痴的下场就是你的下场。每五次活至少烧一次身份。",
    highlight: ["anonymity"],
    waitFor: "anonymity",
  },
  {
    id: "bye",
    en: "Right, the money is yours. You are on your own from here. Just remember WARDEN keeps getting updated, so you are going to need scripts. That is it. Later.",
    ru: "Всё, бабки твои. Дальше разбирайся сам. Только смотри, WARDEN постоянно обновляется, так что тебе понадобятся скрипты. Всё, пока.",
    zh: "钱归你了。往后自求多福。记着 WARDEN 一直在更新，你得备点脚本。就这样。回见。",
    final: true,
  },
];

export const DECLINE_STEPS: TutStep[] = [
  {
    id: "declined",
    en: "Suit yourself. Figure it out alone. I put you on the exchange. Good luck.",
    ru: "Ладно, сам разбирайся. В базу я тебя добавил. Удачи.",
    zh: "随你便。自己琢磨去吧。名册我给你挂上了。好运。",
    listing: true,
  },
  {
    id: "declined_end",
    en: "Jobs will find you from here.",
    ru: "Заказы тебя сами найдут.",
    zh: "活儿会自己找上门。",
    final: true,
  },
];

export const DECLINE_STEP = DECLINE_STEPS[0];

export const CALLER = { nick: "Ghost_404" };

export const MEMO_ASIDE = {
  before: {
    en: "I do not need that one. Take it anyway — it will come in handy.",
    ru: "Мне это не нужно, но забери себе, пригодится.",
    zh: "这份我不要。你拿着 —— 保不齐用得上。",
  },
  after: {
    en: "Looks like something you could sell. Keep it. Now bring me my documents, quickly!",
    ru: "Это выглядит как то, что можно продать. Оставь себе. И тащи мне мои документы поживее!",
    zh: "看着像能卖钱的东西。留着。现在麻溜把我的文件拿来！",
  },
};

/* 剧情通话。 */

export type Avatar = "skull" | "cage";

export interface CallScript {
  id: string;
  nick: string;
  avatar: Avatar;
  lines: { en: string; ru: string; zh?: string }[];
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
        zh: "拿不属于你的数据，真够粗心的。但我欣赏这份胆量。你是新来的 —— 这次我饶你一回。",
      },
      {
        en: "You see, the company needs optimisation. Optimisation means cutting costs. And nobody wants to dismiss staff who might cause trouble, or who might still be useful.",
        ru: "Понимаешь ли. Компании нужна оптимизация. Для этого нужно сокращение расходов. И никто не хочет увольнять сотрудников, которые могут доставить проблемы, или которые могут быть полезны.",
        zh: "要知道，公司需要优化。优化，就是砍成本。而没人愿意去裁那些会闹事、或者还有利用价值的员工。",
      },
      {
        en: "We scheduled the dismissals years ahead for a reason. We make sure that by the time their date comes, these people cannot cause trouble. No money to sue. No family to fight for. All that is left to them is to spare the world their existence.",
        ru: "Мы распланировали увольнения на ближайшие годы не просто так. Мы заботимся о том, что к моменту увольнения эти люди не доставят проблем. У них не будет денег, чтобы подать в суд, у них не будет семьи, ради которой они будут что-то делать. Всё что им останется это избавить мир от своего существования.",
        zh: "我们把裁撤排到往后若干年，不是没原因的。我们要保证：轮到他们那天，这些人已经掀不起风浪。没钱打官司，没有家可守。留给他们的只剩一条 —— 把自己从这世上抹掉。",
      },
      { en: "And everyone wins.", ru: "И все в выигрыше.", zh: "皆大欢喜。" },
      {
        en: "Anyway. Go ahead and give that idiot his archive back. Collect your fee.",
        ru: "В общем. Можешь вернуть доступ к архиву этому идиоту и получить свою плату.",
        zh: "总之。去把那个白痴的档案还给他，收你的劳务费。",
      },
      {
        en: "But he most certainly does not need to see the sealed data you took. It would not do him any good.",
        ru: "Но ему совершенно точно не нужно видеть закрытые данные, которые ты взял. Это ему не на пользу.",
        zh: "但你顺走的那份封存数据，他绝对没必要看到。那对他没好处。",
      },
      { en: "Nor you.", ru: "И тебе не на пользу.", zh: "对你也一样。" },
      {
        en: "Send it to me and I will pay double.",
        ru: "Отправь их мне и я заплачу в 2 раза больше.",
        zh: "发给我，我出双倍。",
      },
      { en: "And everyone wins.", ru: "И все в выигрыше.", zh: "皆大欢喜。" },
    ],
  },
};

type Phase = "idle" | "ringing" | "talking" | "over";

interface Ctx {
  phase: Phase;
  step: TutStep | null;
  /** 剧情通话。 */
  call: { script: CallScript; idx: number } | null;
  
  aside: string | null;
  sayAside: (text: string) => void;
  playCall: (id: string) => void;
  callNext: () => void;
  callAnswer: () => void;
  callRinging: boolean;
  hl: TutHighlight | null;
  hls: TutHighlight[];
  isHl: (h: TutHighlight) => boolean;
  /** 对应流程运行时为真。 */
  active: boolean;
  
  gating: boolean;
  answer: () => void;
  next: () => void;
  choose: (yes: boolean) => void;
  fire: (e: TutEvent) => void;
  satisfy: (e: TutEvent) => void;
  seekTo: (stepId: string) => void;
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
  
  const [call, setCall] = useState<{ script: CallScript; idx: number } | null>(null);
  const [callRinging, setCallRinging] = useState(false);
  const [aside, setAside] = useState<string | null>(null);
  const asideTimer = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>(saved.phase === "over" ? "over" : saved.phase);
  const [idx, setIdx] = useState(saved.idx);
  const [declined, setDeclined] = useState(saved.declined);
  const [dIdx, setDIdx] = useState(0);
  const idxRef = useRef(saved.idx);
  idxRef.current = idx;

  /* 持久化教程阶段，刷新页面后从原步骤继续。 */
  useEffect(() => {
    if (phase === "over") store.set("tut.state", { phase: "over", idx: 0, declined: false });
    else store.set("tut.state", { phase, idx, declined });
  }, [phase, idx, declined]);

  const step = declined ? (DECLINE_STEPS[dIdx] ?? null) : (TUT_STEPS[idx] ?? null);
  const active = phase === "ringing" || phase === "talking";

  const end = useCallback(() => {
    setPhase("over");
    store.set("tut.done", true);
    store.set("tut.state", { phase: "over", idx: 0, declined: false });
  }, []);

  const start = useCallback(() => setPhase("ringing"), []);
  const answer = useCallback(() => setPhase("talking"), []);

  const next = useCallback(() => {
    if (declined) {
      if (dIdx + 1 >= DECLINE_STEPS.length) { end(); return; }
      setDIdx((i) => i + 1);
      return;
    }
    const cur = TUT_STEPS[idxRef.current];
    if (!cur || cur.final) { end(); return; }
    setIdx((i) => Math.min(i + 1, TUT_STEPS.length - 1));
  }, [declined, dIdx, end]);

  const choose = useCallback((yes: boolean) => {
    if (yes) setIdx((i) => i + 1);
    else setDeclined(true);
  }, []);

  const fire = useCallback((e: TutEvent) => {
    if (phase !== "talking" || declined) return;
    const cur = TUT_STEPS[idxRef.current];
    if (cur?.waitFor === e) setIdx((i) => Math.min(i + 1, TUT_STEPS.length - 1));
  }, [phase, declined]);

  const seekTo = useCallback((stepId: string) => {
    const i = TUT_STEPS.findIndex((x) => x.id === stepId);
    if (i >= 0) setIdx((cur) => (i > cur ? i : cur));
  }, []);

  const satisfy = useCallback((e: TutEvent) => {
    if (phase !== "talking" || declined) return;
    const cur = TUT_STEPS[idxRef.current];
    if (cur?.waitFor === e) setIdx((i) => Math.min(i + 1, TUT_STEPS.length - 1));
  }, [phase, declined]);

  const sayAside = useCallback((text: string) => {
    setAside(text);
    if (asideTimer.current) clearTimeout(asideTimer.current);
    asideTimer.current = window.setTimeout(() => setAside(null), 7000);
  }, []);

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
      call, playCall, callNext, callAnswer, callRinging, aside, sayAside,
      hl: phase === "talking" && step ? step.highlight?.[0] ?? null : null,
      hls: phase === "talking" && step ? step.highlight ?? [] : [],
      isHl: (h: TutHighlight) =>
        phase === "talking" ? (step?.highlight ?? []).includes(h) : false,
      gating: phase === "talking" && (!!step?.highlight?.length || !!step?.lockAll),
      answer, next, choose, fire, satisfy, seekTo, end, start,
    }),
    [phase, step, active, call, playCall, callNext, callAnswer, callRinging,
     answer, next, choose, fire, satisfy, seekTo, end, start]
  );

  return <TutCtx.Provider value={value}>{children}</TutCtx.Provider>;
}

export function useTut() {
  const c = useContext(TutCtx);
  if (!c) throw new Error("useTut outside provider");
  return c;
}

export const ring = (on: boolean) => (on ? "tut-ring" : "");
