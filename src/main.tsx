import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LangProvider } from "./i18n";
import { GameProvider } from "./game/state";
import { TutorialProvider } from "./game/tutorial";
import { store } from "./lib/util";
import { initSfx, sfx, sfxEnabled } from "./lib/sfx";

/* Применить сохранённый цвет интерфейса (зелёный / маджента) до первого кадра. */
document.documentElement.dataset.phos = store.get("phos", "green");

/* Одноразовая миграция: какое-то время 3D-корпус включался по умолчанию
   и тут же записывался в хранилище. Из-за этого у старых игроков он
   остаётся включённым даже после смены значения по умолчанию.
   Сбрасываем такое «залипшее» значение ровно один раз. */
if (!store.get("depth.migrated", false)) {
  store.set("depth", false);
  store.set("depth.migrated", true);
}

/* 音效：读回设置，并在第一次交互时解锁音频上下文 */
initSfx();

/* 全局兜底：任何按钮按下去都有反馈，不用挨个组件去接。
   捕获阶段监听，这样即使组件里 stopPropagation 也照样响。 */
/** 按按钮所在的区块挑动机：地图、聊天、小游戏、交易各有各的声音。 */
function blockOf(el: Element): string {
  /* 组件可以用 data-sfx 直接指定，优先级最高 */
  const own = el.getAttribute("data-sfx");
  if (own) return own;

  const txt = (el.textContent ?? "").trim().toUpperCase();
  /* 危险操作：破坏、清档、断开——先按文案认出来 */
  if (/WIPE|УДАЛИТЬ|清除|SABOTAGE|ДИВЕРС|破坏|DISCONNECT|ОТКЛЮЧ|断开|ABORT|ПРЕРВАТЬ|中止/.test(txt)) {
    return "uiDanger";
  }

  /* 往上找最近的「区块」标记，没有就看它落在哪个结构里 */
  const zone = el.closest("[data-zone]")?.getAttribute("data-zone");
  if (zone) return `ui${zone}`;

  if (el.closest("[data-game]")) return "uiGame";
  /* 顶栏固定在最上方，用它的高度判断最省事 */
  const r = el.getBoundingClientRect();
  if (r.top < 42) return "uiSys";
  return "click";
}

document.addEventListener(
  "pointerdown",
  (e) => {
    if (!sfxEnabled()) return;
    const el = (e.target as HTMLElement | null)?.closest("button,[role=button],a,input,select");
    if (!el) return;
    if ((el as HTMLButtonElement).disabled) { sfx("deny"); return; }
    const kind = blockOf(el);
    if (kind === "none") return;          // 组件自己会发声
    sfx(kind as never);
  },
  true
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LangProvider>
      <GameProvider>
        <TutorialProvider>
          <App />
        </TutorialProvider>
      </GameProvider>
    </LangProvider>
  </StrictMode>
);
