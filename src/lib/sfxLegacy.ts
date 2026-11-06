import type { SfxEngine, SfxName } from "./sfxTypes";

/* ============================================================
   LEGACY SFX —— 最初那版 8-bit / DOS 音效
   ------------------------------------------------------------
   这是升级成工业 FM 之前的原始实现，原封不动保留：
   纯振荡器、没有 FM、没有过载，音域偏高、以大调动机为主，
   听起来更接近 PC 扬声器和早期 BEEP 音乐。

   和新引擎共用同一套事件名，所以游戏逻辑一行都不用改。
   ============================================================ */

type Wave = "square" | "triangle" | "sawtooth" | "sine";

/* 音符表（第 4 八度为基准） */
const N: Record<string, number> = {
  C: 261.63, Cs: 277.18, D: 293.66, Ds: 311.13, E: 329.63, F: 349.23,
  Fs: 369.99, G: 392.0, Gs: 415.3, A: 440.0, As: 466.16, B: 493.88,
};
const nt = (name: string, oct = 4) => N[name] * Math.pow(2, oct - 4);

interface ToneOpts {
  freq: number;
  dur: number;
  wave?: Wave;
  gain?: number;
  to?: number;
  delay?: number;
  /** 叠一个略微失谐的副音 */
  fat?: boolean;
}

export function createLegacyEngine(ac: AudioContext, dest: AudioNode): SfxEngine {
  /* 自己的输出段：原版只有一层柔和低通，没有任何过载 */
  const out = ac.createGain();
  out.gain.value = 1;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 7200;
  out.connect(lp);
  lp.connect(dest);

  /* 记下在响的源，切模式时好一次掐干净 */
  const live = new Set<AudioScheduledSourceNode>();
  const track = (n: AudioScheduledSourceNode) => {
    live.add(n);
    /* 用 addEventListener 而不是 onended＝...，免得覆盖别处挂的回调 */
    n.addEventListener("ended", () => live.delete(n), { once: true });
  };

  const lastAt: Record<string, number> = {};
  const throttled = (key: string, ms: number) => {
    const now = performance.now();
    if (lastAt[key] && now - lastAt[key] < ms) return false;
    lastAt[key] = now;
    return true;
  };

  function tone({ freq, dur, wave = "square", gain = 0.18, to, delay = 0, fat }: ToneOpts) {
    const t0 = ac.currentTime + delay;

    const osc = ac.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

    const g = ac.createGain();
    const a = Math.min(0.006, dur * 0.2);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + a);
    g.gain.setValueAtTime(gain, t0 + Math.max(a, dur - a));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    track(osc);

    if (fat) {
      const o2 = ac.createOscillator();
      o2.type = wave;
      o2.frequency.setValueAtTime(freq * 1.005, t0);
      if (to && to !== freq) o2.frequency.exponentialRampToValueAtTime(Math.max(1, to * 1.005), t0 + dur);
      const g2 = ac.createGain();
      g2.gain.setValueAtTime(0.0001, t0);
      g2.gain.exponentialRampToValueAtTime(gain * 0.5, t0 + a);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o2.connect(g2); g2.connect(out);
      o2.start(t0); o2.stop(t0 + dur + 0.02);
      track(o2);
    }
  }

  function noise(dur: number, gain = 0.12, delay = 0, hp = 900) {
    const t0 = ac.currentTime + delay;
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t0); src.stop(t0 + dur + 0.02);
    track(src);
  }

  function seq(notes: [number, number][], opts: Partial<ToneOpts> = {}, startAt = 0) {
    let t = startAt;
    notes.forEach(([f, d]) => {
      if (f > 0) tone({ ...opts, freq: f, dur: d * 0.92, delay: t });
      t += d;
    });
  }

  function play(name: SfxName) {
    switch (name) {
      /* ---- 界面 ---- */
      case "click":
      /* 原版所有按钮都是同一声「嗒」——分区动机是后来才加的，
         这里按原样把它们都归到 click。 */
      case "uiSys":
      case "uiMap":
      case "uiNode":
      case "uiChat":
      case "uiGame":
      case "uiTrade":
      case "uiDanger":
        if (!throttled("click", 40)) return;
        tone({ freq: nt("A", 5), dur: 0.035, gain: 0.13 });
        break;
      case "tick":
        if (!throttled("tick", 35)) return;
        tone({ freq: nt("E", 5), dur: 0.025, gain: 0.08 });
        break;
      case "hover":
        if (!throttled("hover", 90)) return;
        tone({ freq: nt("C", 6), dur: 0.018, gain: 0.04, wave: "triangle" });
        break;
      case "toggle":
        if (!throttled("toggle", 60)) return;
        seq([[nt("E", 5), 0.05], [nt("B", 5), 0.07]], { gain: 0.12 });
        break;
      case "back":
        seq([[nt("B", 5), 0.05], [nt("E", 5), 0.07]], { gain: 0.11 });
        break;
      case "deny":
        if (!throttled("deny", 120)) return;
        tone({ freq: nt("Gs", 3), dur: 0.14, gain: 0.14, to: nt("E", 3) });
        break;
      case "pop":
        tone({ freq: nt("D", 5), dur: 0.05, gain: 0.1, to: nt("A", 5), wave: "triangle" });
        break;

      /* ---- 通话 ---- */
      case "type":
        if (!throttled("type", 28)) return;
        tone({
          freq: nt("C", 6) * (0.96 + Math.random() * 0.08),
          dur: 0.012, gain: 0.045, wave: "square",
        });
        break;
      case "ring":
        seq([
          [nt("E", 5), 0.1], [nt("B", 5), 0.1], [nt("E", 5), 0.1], [nt("B", 5), 0.1],
          [0, 0.12],
          [nt("E", 5), 0.1], [nt("B", 5), 0.1], [nt("E", 5), 0.1], [nt("B", 5), 0.14],
        ], { gain: 0.1, wave: "square", fat: true });
        break;
      case "answer":
        seq([[nt("G", 4), 0.05], [nt("C", 5), 0.05], [nt("E", 5), 0.09]], { gain: 0.11 });
        break;
      case "hangup":
        seq([[nt("C", 4), 0.07], [nt("G", 3), 0.11]], { gain: 0.1, wave: "triangle" });
        break;

      /* ---- 消息 / 通知 ---- */
      case "message":
        if (!throttled("message", 400)) return;
        seq([[nt("C", 6), 0.045], [nt("E", 6), 0.045], [nt("G", 6), 0.07]], { gain: 0.085, wave: "square" });
        break;
      case "notify":
        if (!throttled("notify", 300)) return;
        seq([[nt("A", 5), 0.04], [nt("D", 6), 0.06]], { gain: 0.07 });
        break;
      case "codex":
        if (!throttled("codex", 350)) return;
        seq([[nt("D", 5), 0.05], [nt("A", 5), 0.05], [nt("D", 6), 0.08]], { gain: 0.07, wave: "triangle" });
        break;

      /* ---- 入侵 ---- */
      case "hackStart":
        tone({ freq: nt("C", 3), to: nt("C", 5), dur: 0.26, gain: 0.1, wave: "sawtooth" });
        noise(0.1, 0.05, 0.2, 1400);
        break;
      case "hackOk":
        seq([
          [nt("C", 5), 0.075], [nt("E", 5), 0.075], [nt("G", 5), 0.075],
          [nt("C", 6), 0.1], [0, 0.03], [nt("G", 5), 0.06], [nt("C", 6), 0.19],
        ], { gain: 0.1, wave: "square", fat: true });
        break;
      case "hackFail":
        seq([[nt("G", 4), 0.09], [nt("Ds", 4), 0.09], [nt("C", 4), 0.1], [nt("Gs", 3), 0.24]],
            { gain: 0.11, wave: "sawtooth" });
        noise(0.3, 0.07, 0.1, 500);
        break;
      case "alarm":
        if (!throttled("alarm", 700)) return;
        seq([[nt("As", 5), 0.1], [nt("F", 5), 0.1], [nt("As", 5), 0.1], [nt("F", 5), 0.12]],
            { gain: 0.09, wave: "square" });
        break;

      /* ---- 数据 ---- */
      case "scan":
        if (!throttled("scan", 90)) return;
        tone({ freq: nt("E", 5), dur: 0.03, gain: 0.07, wave: "triangle" });
        break;
      case "found":
        seq([[nt("E", 5), 0.05], [nt("B", 5), 0.09]], { gain: 0.1 });
        break;
      case "download":
        tone({ freq: nt("C", 5), to: nt("C", 6), dur: 0.16, gain: 0.09, wave: "triangle" });
        break;
      case "money":
        seq([[nt("E", 6), 0.05], [nt("A", 6), 0.1]], { gain: 0.085, wave: "square" });
        break;
      case "place":
        if (!throttled("place", 50)) return;
        tone({ freq: nt("G", 5), dur: 0.04, gain: 0.09, to: nt("D", 6), wave: "triangle" });
        break;

      /* ---- 会话 ---- */
      case "powerOn":
        /* 原版风格：一声下坠加白噪，朴素但同样有爆裂感 */
        tone({ freq: nt("A", 4), to: nt("A", 2), dur: 0.35, gain: 0.014, wave: "sawtooth" });
        noise(0.1, 0.018, 0, 300);
        noise(0.7, 0.011, 0.04, 1200);
        break;
      case "boot":
        tone({ freq: nt("C", 5), dur: 0.12, gain: 0.12, wave: "square" });
        break;
      case "login":
        seq([[nt("C", 5), 0.07], [nt("G", 5), 0.07], [nt("C", 6), 0.16]], { gain: 0.1, fat: true });
        break;
      case "logout":
        seq([[nt("C", 6), 0.07], [nt("G", 5), 0.07], [nt("C", 5), 0.18]], { gain: 0.09, wave: "triangle" });
        break;
    }
  }

  function stopAll() {
    /* 先把输出压到零（10ms 淡出，免得爆音），再逐个停掉源 */
    const t = ac.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 0.01);
    live.forEach((n) => { try { n.stop(t + 0.012); } catch { /* 已经停了 */ } });
    live.clear();
    /* 放完淡出再把增益还原，下次还能正常用 */
    out.gain.setValueAtTime(0, t + 0.013);
    out.gain.linearRampToValueAtTime(1, t + 0.03);
  }

  function dispose() {
    stopAll();
    try { out.disconnect(); lp.disconnect(); } catch { /* noop */ }
  }

  return { play, stopAll, dispose };
}
