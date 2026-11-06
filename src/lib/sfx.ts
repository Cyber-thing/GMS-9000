/* ============================================================
   SFX 门面 —— 三档音效：新版 FM / 原版 8-bit / 关闭
   ------------------------------------------------------------
   两套引擎实现同一个 SfxEngine 接口，事件名完全一致，
   所以游戏里的调用点一行都不用改。任何时刻只有一套在工作：
   切档时先把上一套掐干净，再惰性建起新的。
   ============================================================ */

import { store } from "./util";
import { createFmEngine } from "./sfxFm";
import { createYmEngine } from "./sfxYm";
import { createLegacyEngine } from "./sfxLegacy";
import { SFX_MODES, SFX_TRIM, type SfxEngine, type SfxMode, type SfxName } from "./sfxTypes";

export type { SfxMode, SfxName } from "./sfxTypes";
export { SFX_MODES } from "./sfxTypes";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let engineKind: Exclude<SfxMode, "off"> | null = null;
let active: SfxEngine | null = null;
let trim: GainNode | null = null;

let mode: SfxMode = "ym";
let volume = 0.5;

const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());

export const sfxSubscribe = (fn: () => void) => {
  subs.add(fn);
  return () => { subs.delete(fn); };
};

export const sfxMode = () => mode;
export const sfxVolume = () => volume;
/** 兼容旧调用：除「关闭」之外都算开着。 */
export const sfxEnabled = () => mode !== "off";

/** 浏览器要求先有用户手势才能出声，所以第一次点击时再建上下文。 */
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume * 0.5;
    /* 安全限幅：几个音同时触发时也不会削顶，
       阈值留了余量，正常单发根本碰不到它。 */
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
    master.connect(limiter);
    limiter.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 按当前档位准备好引擎；关闭档不建任何东西。 */
function ensureEngine(): SfxEngine | null {
  if (mode === "off") return null;
  const ac = audio();
  if (!ac || !master) return null;
  if (active && engineKind === mode) return active;

  /* 换引擎前先把上一套彻底停掉并释放 */
  if (active) {
    active.stopAll();
    active.dispose();
    active = null;
  }
  if (trim) { try { trim.disconnect(); } catch { /* noop */ } trim = null; }
  /* 每套引擎挂在自己的配平增益后面，三档响度就能对齐 */
  trim = ac.createGain();
  trim.gain.value = SFX_TRIM[mode];
  trim.connect(master);
  active =
    mode === "ym"  ? createYmEngine(ac, trim) :
    mode === "new" ? createFmEngine(ac, trim) :
                     createLegacyEngine(ac, trim);
  engineKind = mode;
  return active;
}

/** 切换音效档位，立即生效，不需要刷新页面。 */
export function setSfxMode(next: SfxMode) {
  if (mode === next) return;
  mode = next;
  store.set("sfx.mode", next);

  if (next === "off") {
    /* 掐断正在响的一切，并且不留悬挂节点 */
    if (active) {
      active.stopAll();
      active.dispose();
      active = null;
      engineKind = null;
    }
    if (trim) { try { trim.disconnect(); } catch { /* noop */ } trim = null; }
  } else {
    ensureEngine();
  }
  notify();
}

/** 依次在 新版 → 原版 → 关闭 之间循环。 */
export function cycleSfxMode(): SfxMode {
  const i = SFX_MODES.indexOf(mode);
  const next = SFX_MODES[(i + 1) % SFX_MODES.length];
  setSfxMode(next);
  return next;
}

/** 兼容旧的布尔开关：true → 回到新版，false → 关闭。 */
export function setSfxEnabled(on: boolean) {
  setSfxMode(on ? "ym" : "off");
}

export function setSfxVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  store.set("sfx.vol", volume);
  if (master) master.gain.value = volume * 0.5;
  notify();
}

/** 启动时读回设置。 */
export function initSfx() {
  const saved = store.get<SfxMode>("sfx.mode", "ym");
  mode = SFX_MODES.includes(saved) ? saved : "ym";
  /* 旧版本只存过布尔值，迁移一下，别让老玩家突然有声音 */
  if (!store.get("sfx.mode.migrated", false)) {
    const legacyFlag = store.get<boolean | null>("sfx", null);
    if (legacyFlag === false) mode = "off";
    store.set("sfx.mode", mode);
    store.set("sfx.mode.migrated", true);
  }
  /* 第三代引擎上线：之前「new」多半是默认值而非玩家的选择，
     把这批人迁到 ym；明确选了 old / off 的保持不动。 */
  if (!store.get("sfx.mode.v3", false)) {
    if (mode === "new") mode = "ym";
    store.set("sfx.mode", mode);
    store.set("sfx.mode.v3", true);
  }
  volume = store.get("sfx.vol", 0.5);

  const unlock = () => {
    if (mode === "off") return;
    const ac = audio();
    if (!ac) return;
    /* resume 是异步的，等它真的 running 了再补放 */
    void Promise.resolve(ac.resume?.()).then(() => { ensureEngine(); flushPending(); });
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/* 浏览器要求先有手势才允许出声。在那之前被触发的音不能直接排进时间线——
   上下文一旦 resume，它们会一股脑儿全涌出来。这里只记住「最后一个重要的音」，
   等解锁的瞬间补放一次。 */
let pending: SfxName | null = null;

/** 触发一个音效。调用点不需要知道当前是哪套引擎。 */
export function sfx(name: SfxName) {
  if (mode === "off") return;
  const ac = audio();
  if (!ac) return;
  if (ac.state !== "running") {
    /* 还没解锁：只留下最近这一个，别积压 */
    pending = name;
    return;
  }
  ensureEngine()?.play(name);
}

/** 音频解锁后，把等待中的那一个补放出来。 */
function flushPending() {
  if (mode === "off" || !pending) { pending = null; return; }
  const name = pending;
  pending = null;
  const ac = audio();
  if (!ac || ac.state !== "running") return;
  ensureEngine()?.play(name);
}

/** 给打字循环用的小封装。 */
export const typeBlip = () => sfx("type");

/* ---------- 内部调试接口 ----------
   不渲染任何 UI，只在 window 上挂一个小对象，方便：
   · 逐个试听音效、对比三套引擎；
   · 用 OfflineAudioContext 实测响度，校准 SFX_TRIM。
   体积可以忽略，也不参与游戏逻辑。 */
export const SFX_EVENTS: SfxName[] = [
  "click", "tick", "toggle", "back", "deny", "hover", "pop",
  "uiSys", "uiMap", "uiNode", "uiChat", "uiGame", "uiTrade", "uiDanger",
  "type", "ring", "answer", "hangup",
  "message", "notify", "codex",
  "hackStart", "hackOk", "hackFail", "alarm",
  "scan", "found", "download", "money", "place",
  "boot", "powerOn", "login", "logout",
];

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__gnsSfx = {
    play: sfx,
    events: SFX_EVENTS,
    setMode: setSfxMode,
    getMode: sfxMode,
    modes: SFX_MODES,
    /** 离线渲染一个音效，返回峰值与 RMS —— 用来对齐三档响度。 */
    async measure(mode: Exclude<SfxMode, "off">, name: SfxName, seconds = 1.2) {
      const OAC = window.OfflineAudioContext;
      if (!OAC) return null;
      const oc = new OAC(1, Math.ceil(44100 * seconds), 44100);
      const out = oc.createGain();
      out.gain.value = SFX_TRIM[mode];
      out.connect(oc.destination);
      const eng =
        mode === "ym"  ? createYmEngine(oc as unknown as AudioContext, out) :
        mode === "new" ? createFmEngine(oc as unknown as AudioContext, out) :
                         createLegacyEngine(oc as unknown as AudioContext, out);
      eng.play(name);
      const buf = await oc.startRendering();
      const d = buf.getChannelData(0);
      let peak = 0, sum = 0;
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
      return { peak, rms: Math.sqrt(sum / d.length) };
    },
    /** 按窗口取响度包线，用来画脉冲的形状（调试铃声用）。 */
    async envelope(mode: Exclude<SfxMode, "off">, name: SfxName, seconds = 1.6, bins = 90) {
      const OAC = window.OfflineAudioContext;
      if (!OAC) return null;
      const oc = new OAC(1, Math.ceil(44100 * seconds), 44100);
      const out = oc.createGain(); out.connect(oc.destination);
      const eng =
        mode === "ym"  ? createYmEngine(oc as unknown as AudioContext, out) :
        mode === "new" ? createFmEngine(oc as unknown as AudioContext, out) :
                         createLegacyEngine(oc as unknown as AudioContext, out);
      eng.play(name);
      const buf = await oc.startRendering();
      const d = buf.getChannelData(0);
      const win = Math.floor(d.length / bins);
      const curve: number[] = [];
      for (let i = 0; i < bins; i++) {
        let s2 = 0;
        for (let j = 0; j < win; j++) s2 += d[i * win + j] * d[i * win + j];
        curve.push(Math.sqrt(s2 / win));
      }
      const max = Math.max(...curve, 0.001);
      return curve.map((v) => +(v / max).toFixed(3));
    },
  };
}
