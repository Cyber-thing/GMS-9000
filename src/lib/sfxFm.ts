import type { SfxEngine, SfxName } from "./sfxTypes";

/* ============================================================
   FM SFX —— 工业味的双算子 FM 引擎（新版）
   ------------------------------------------------------------
   调制器接到载波频率上，和 Yamaha OPL/OPN 那套是一个路子：
   起音时金属感最强，随后迅速收敛成干净的音。
   再过一级软削波，就有了赛博朋克那种「硬件在吃电」的质感。
   ============================================================ */

type Wave = "square" | "triangle" | "sawtooth" | "sine";

/* 音符表（第 4 八度为基准） */
const N: Record<string, number> = {
  C: 261.63, Cs: 277.18, D: 293.66, Ds: 311.13, E: 329.63, F: 349.23,
  Fs: 369.99, G: 392.0, Gs: 415.3, A: 440.0, As: 466.16, B: 493.88,
};
const nt = (name: string, oct = 4) => N[name] * Math.pow(2, oct - 4);

/** 软削波曲线：轻微过载，让方波带上金属质感而不是糊成噪音。 */
function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  const k = amount * 60;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return c;
}

/* ---------- FM 音色表 ----------
   ratio 决定泛音排列：整数比有调性，2.5/3.5 这种带钟铃和金属感；
   index 是「铁」的程度；decay 决定金属味收得多快。 */
const FM = {
  /** 继电器开合：短促的金属咔哒 */
  relay:  { ratio: 3.01, index: 5.2, decay: 0.16 },
  /** 机箱面板按键：闷一点的塑料包铁 */
  panel:  { ratio: 2.0,  index: 2.4, decay: 0.3  },
  /** 钢索/拨片：有调性的硬芯 */
  steel:  { ratio: 2.0,  index: 3.4, decay: 0.45 },
  /** 铃铛：非整数比，铃声般的泛音 */
  bell:   { ratio: 3.5,  index: 4.6, decay: 0.6  },
  /** 警报：咬人的高指数 */
  siren:  { ratio: 1.49, index: 6.5, decay: 0.85 },
  /** 低音铁块：沉、带嗡 */
  anvil:  { ratio: 1.0,  index: 4.0, decay: 0.35 },
  /** 数据流：细碎的高频金属 */
  data:   { ratio: 4.0,  index: 3.0, decay: 0.25 },
} as const;


interface ToneOpts {
  freq: number;
  dur: number;        // 秒
  wave?: Wave;
  gain?: number;
  /** 终点频率：给滑音用 */
  to?: number;
  delay?: number;
  /** 叠一个略微失谐的副音，声音更厚 */
  fat?: boolean;
  /** 低八度副音，给重要音效压重量 */
  sub?: boolean;
  /** 走干净总线（打字声用），默认都走带过载的脏总线 */
  clean?: boolean;

  /* ---- FM 参数（Yamaha OPL 那套双算子的简化版）---- */
  /** 调制器与载波的频率比。整数比＝金属但有调性，非整数＝钟铃、噪声感 */
  ratio?: number;
  /** 调制深度（单位是载波频率的倍数）。越大越「铁」 */
  index?: number;
  /** 调制深度的衰减时间占比：0.3 表示前 30% 时间里调制就掉没了 */
  decay?: number;
  /** 关掉 FM，退回纯振荡器（打字声这种要干净的用） */
  noFm?: boolean;
}

export function createFmEngine(ac: AudioContext, dest: AudioNode): SfxEngine {
  /* 干净总线：打字声走这里，保持清脆 */
  const clean = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 7200;
  clean.connect(lp);
  lp.connect(dest);

  /* 脏总线：软削波 + 更暗的低通，所有带颗粒感的音都走这儿 */
  const grit = ac.createGain();
  const shaper = ac.createWaveShaper();
  shaper.curve = driveCurve(0.42);
  shaper.oversample = "2x";
  const dark = ac.createBiquadFilter();
  dark.type = "lowpass";
  dark.frequency.value = 2600;
  dark.Q.value = 0.9;
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 70;
  grit.connect(shaper); shaper.connect(dark); dark.connect(hp); hp.connect(dest);

  /* 记下在响的源，切模式时一次掐干净 */
  const live = new Set<AudioScheduledSourceNode>();
  const track = (n: AudioScheduledSourceNode) => {
    live.add(n);
    /* 用 addEventListener 而不是 onended＝...，免得覆盖别处挂的回调 */
    n.addEventListener("ended", () => live.delete(n), { once: true });
  };

  const lastAt: Record<string, number> = {};
  const turn: Record<string, number> = {};
  function rotate<T>(key: string, variants: T[]): T {
    const i = (turn[key] = (turn[key] ?? -1) + 1);
    return variants[i % variants.length];
  }
  function throttled(key: string, ms: number): boolean {
    const now = performance.now();
    if (lastAt[key] && now - lastAt[key] < ms) return false;
    lastAt[key] = now;
    return true;
  }


  /**
   * 两个算子的 FM：调制器 → 载波频率。
   * 真实的 OPL 芯片就是靠这个做出金属敲击、铃声和咬人的贝斯。
   * 调制深度自带包络 —— 起音时「铛」一下金属味，随后迅速收干净，
   * 这正是 FM 听起来像硬件而不是软件正弦的关键。
   */
  function tone({
    freq, dur, wave = "square", gain = 0.18, to, delay = 0, fat, sub, clean: useClean,
    ratio = 2, index = 2.6, decay = 0.45, noFm = false,
  }: ToneOpts) {
    const out: AudioNode = useClean ? clean : grit;
    const t0 = ac.currentTime + delay;
    const a = Math.min(0.006, dur * 0.2);

    /** 一路载波（可带 FM），返回它的增益节点。 */
    const voice = (f0: number, f1: number, vol: number, w: Wave, det = 1) => {
      const car = ac.createOscillator();
      car.type = w;
      car.frequency.setValueAtTime(f0 * det, t0);
      if (f1 !== f0) car.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * det), t0 + dur);

      if (!noFm) {
        /* 调制器：频率跟着载波走，深度随时间掉下去 */
        const mod = ac.createOscillator();
        mod.type = "sine";
        mod.frequency.setValueAtTime(f0 * det * ratio, t0);
        if (f1 !== f0) mod.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * det * ratio), t0 + dur);

        const mg = ac.createGain();
        const peak = f0 * det * index;
        mg.gain.setValueAtTime(peak, t0);
        /* 金属味集中在起音，之后迅速收敛，避免一直刺耳 */
        mg.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.04), t0 + dur * decay);
        mg.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

        mod.connect(mg);
        mg.connect(car.frequency);      // 调制的是频率，这就是 FM
        mod.start(t0);
        mod.stop(t0 + dur + 0.02);
        track(mod);
      }

      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + a);
      g.gain.setValueAtTime(vol, t0 + Math.max(a, dur - a));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      car.connect(g);
      g.connect(out);
      car.start(t0);
      car.stop(t0 + dur + 0.02);
      track(car);
    };

    const f1 = to && to !== freq ? to : freq;
    voice(freq, f1, gain, wave);
    /* 轻微失谐的第二声部：两个 FM 一起跑，厚度和「硬件感」都上来了 */
    if (fat) voice(freq, f1, gain * 0.5, wave, 1.005);
    /* 低八度：用三角波托底，不跟着加金属泛音 */
    if (sub) {
      const os = ac.createOscillator();
      os.type = "triangle";
      os.frequency.setValueAtTime(freq / 2, t0);
      if (f1 !== freq) os.frequency.exponentialRampToValueAtTime(Math.max(1, f1 / 2), t0 + dur);
      const gs = ac.createGain();
      gs.gain.setValueAtTime(0.0001, t0);
      gs.gain.exponentialRampToValueAtTime(gain * 0.65, t0 + a);
      gs.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      os.connect(gs); gs.connect(out);
      os.start(t0); os.stop(t0 + dur + 0.02); track(os);
    }
  }

  
  /** 短噪声：开关、故障、错误都靠它。 */
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
    src.connect(f); f.connect(g); g.connect(grit);
    src.start(t0); src.stop(t0 + dur + 0.02); track(src);
  }


  /** 一串音符，用来拼小旋律。 */
  function seq(notes: [number, number][], opts: Partial<ToneOpts> = {}, startAt = 0) {
    let t = startAt;
    notes.forEach(([f, d]) => {
      if (f > 0) tone({ ...opts, freq: f, dur: d * 0.92, delay: t });
      t += d;
    });
  }



  function play(name: SfxName) {
    switch (name) {
      /* ---- 界面：低、短、带一点过载的颗粒 ---- */
      case "click": {                     // 通用按钮：小调里换着音级走，不会听腻
        if (!throttled("click", 40)) return;
        const f = rotate("click", [nt("A", 3), nt("C", 4), nt("E", 3), nt("G", 3)]);
        tone({ freq: f, dur: 0.05, gain: 0.15, sub: true, ...FM.panel });
        break;
      }
      case "tick": {                      // 次要操作
        if (!throttled("tick", 35)) return;
        tone({ freq: rotate("tick", [nt("E", 3), nt("D", 3), nt("G", 3)]), dur: 0.035, gain: 0.1, ...FM.relay });
        break;
      }
      case "hover":
        if (!throttled("hover", 90)) return;
        tone({ freq: nt("E", 4), dur: 0.022, gain: 0.04, wave: "triangle", ...FM.data });
        break;
      case "toggle":                      // 开关：小三度上行（小调味道）
        if (!throttled("toggle", 60)) return;
        seq([[nt("A", 3), 0.05], [nt("C", 4), 0.08]], { gain: 0.13, sub: true, ...FM.relay });
        break;
      case "back":                        // 返回：小三度下行
        seq([[nt("C", 4), 0.05], [nt("A", 3), 0.08]], { gain: 0.12, ...FM.relay });
        break;
      case "deny":                        // 不可用：低沉的下坠，带明显过载
        if (!throttled("deny", 120)) return;
        tone({ freq: nt("E", 2), dur: 0.2, gain: 0.18, to: nt("As", 1), wave: "sawtooth", sub: true, ...FM.anvil });
        break;
      case "pop":                         // 弹窗
        tone({ freq: nt("D", 3), dur: 0.07, gain: 0.11, to: nt("A", 3), wave: "triangle", ...FM.bell });
        break;
  
      /* ---- 各区块的点击动机：同是小调，但走向各不相同 ---- */
      case "uiSys":                       // 顶栏 / 系统开关：冷硬的纯五度
        if (!throttled("uiSys", 45)) return;
        seq([[nt("E", 3), 0.034], [nt("B", 3), 0.055]], { gain: 0.12, sub: true, ...FM.relay });
        break;
      case "uiMap":                       // 世界地图 / 区域：开阔的四度上行
        if (!throttled("uiMap", 45)) return;
        seq([[nt("D", 3), 0.038], [nt("G", 3), 0.06]], { gain: 0.12, wave: "triangle", sub: true, ...FM.steel });
        break;
      case "uiNode": {                    // 选择节点：小三度，每次换起点
        if (!throttled("uiNode", 45)) return;
        const r = rotate("uiNode", [nt("A", 3), nt("C", 4), nt("G", 3)]);
        seq([[r, 0.032], [r * 1.189, 0.052]], { gain: 0.115, sub: true, ...FM.steel });
        break;
      }
      case "uiChat":                      // 聊天 / 联系人：柔和的下行小二度
        if (!throttled("uiChat", 45)) return;
        seq([[nt("C", 4), 0.032], [nt("B", 3), 0.055]], { gain: 0.1, wave: "triangle", ...FM.bell });
        break;
      case "uiGame":                      // 小游戏面板：紧张的半音上行
        if (!throttled("uiGame", 45)) return;
        seq([[nt("Gs", 3), 0.03], [nt("A", 3), 0.05]], { gain: 0.12, wave: "square", sub: true, ...FM.siren });
        break;
      case "uiTrade":                     // 黑市 / 交易：带铜臭味的小六度
        if (!throttled("uiTrade", 45)) return;
        seq([[nt("C", 3), 0.038], [nt("Gs", 3), 0.065]], { gain: 0.12, fat: true, sub: true, ...FM.bell });
        break;
      case "uiDanger":                    // 破坏 / 清档这类危险操作：下坠的三全音
        if (!throttled("uiDanger", 60)) return;
        seq([[nt("As", 2), 0.055], [nt("E", 2), 0.1]], { gain: 0.15, wave: "sawtooth", sub: true, ...FM.anvil });
        break;
  
      /* ---- 通话 ----
         打字声保持原样：清脆、走干净总线，不加过载。 */
      case "type":
        if (!throttled("type", 28)) return;
        tone({
          freq: nt("C", 6) * (0.96 + Math.random() * 0.08),
          dur: 0.012, gain: 0.045, wave: "square", clean: true, noFm: true,
        });
        break;
      case "ring":                        // 来电：三全音交替——不安、阴沉
        seq([
          [nt("A", 3), 0.11], [nt("Ds", 4), 0.11], [nt("A", 3), 0.11], [nt("Ds", 4), 0.11],
          [0, 0.13],
          [nt("A", 3), 0.11], [nt("Ds", 4), 0.11], [nt("A", 3), 0.11], [nt("Ds", 4), 0.15],
        ], { gain: 0.11, wave: "square", fat: true, sub: true, ...FM.bell });
        break;
      case "answer":                      // 接通：小调三和弦
        seq([[nt("A", 2), 0.055], [nt("C", 3), 0.055], [nt("E", 3), 0.11]], { gain: 0.13, sub: true, ...FM.relay });
        break;
      case "hangup":                      // 挂断：两声闷响
        seq([[nt("C", 3), 0.07], [nt("F", 2), 0.14]], { gain: 0.12, wave: "triangle", sub: true, ...FM.anvil });
        break;
  
      /* ---- 消息 / 通知 ---- */
      case "message":                     // 新私信：小调三连音
        if (!throttled("message", 400)) return;
        seq([[nt("A", 4), 0.05], [nt("C", 5), 0.05], [nt("E", 5), 0.095]], { gain: 0.09, wave: "square", ...FM.bell });
        break;
      case "notify":                      // 系统提示：下行小二度，微微刺耳
        if (!throttled("notify", 300)) return;
        seq([[nt("D", 4), 0.045], [nt("Cs", 4), 0.075]], { gain: 0.08, ...FM.data });
        break;
      case "codex":                       // 档案更新：低沉的小调
        if (!throttled("codex", 350)) return;
        seq([[nt("D", 3), 0.06], [nt("F", 3), 0.06], [nt("A", 3), 0.11]], { gain: 0.09, wave: "triangle", sub: true, ...FM.bell });
        break;
  
      /* ---- 入侵 ---- */
      case "hackStart":                   // 拨号：低频扫上去，像调制解调器咬住载波
        tone({ freq: nt("C", 1), to: nt("C", 3), dur: 0.34, gain: 0.13, wave: "sawtooth", sub: true, ratio: 1.49, index: 7, decay: 0.9 });
        noise(0.14, 0.055, 0.24, 800);
        break;
      case "hackOk":                      // 拿下节点：小调上行，收在低八度的根音上
        seq([
          [nt("A", 2), 0.08], [nt("C", 3), 0.08], [nt("E", 3), 0.08],
          [nt("A", 3), 0.11], [0, 0.03], [nt("E", 3), 0.07], [nt("A", 2), 0.26],
        ], { gain: 0.12, wave: "square", fat: true, sub: true, ...FM.steel });
        break;
      case "hackFail":                    // 被抓：半音阶下坠 + 噪声
        seq([[nt("F", 3), 0.1], [nt("E", 3), 0.1], [nt("Ds", 3), 0.11], [nt("A", 2), 0.3]],
            { gain: 0.14, wave: "sawtooth", sub: true, ...FM.anvil });
        noise(0.36, 0.085, 0.12, 320);
        break;
      case "alarm":                       // WARDEN 警报：三全音来回拉，经典不祥音程
        if (!throttled("alarm", 700)) return;
        seq([[nt("As", 3), 0.11], [nt("E", 3), 0.11], [nt("As", 3), 0.11], [nt("E", 3), 0.14]],
            { gain: 0.12, wave: "sawtooth", sub: true, ...FM.siren });
        break;
  
      /* ---- 数据 ---- */
      case "scan": {                      // 扫描：逐级爬升，像读头在走
        if (!throttled("scan", 90)) return;
        const f = rotate("scan", [nt("A", 3), nt("C", 4), nt("D", 4), nt("C", 4)]);
        tone({ freq: f, dur: 0.038, gain: 0.08, wave: "triangle", ...FM.data });
        break;
      }
      case "found":                       // 扫到东西：小三度
        seq([[nt("A", 3), 0.055], [nt("C", 4), 0.11]], { gain: 0.11, sub: true, ...FM.bell });
        break;
      case "download":                    // 落袋：低位上滑
        tone({ freq: nt("A", 2), to: nt("A", 3), dur: 0.19, gain: 0.11, wave: "triangle", sub: true, ...FM.data });
        break;
      case "money":                       // 到账：小调两声，不欢快但有分量
        seq([[nt("C", 4), 0.055], [nt("G", 4), 0.12]], { gain: 0.1, wave: "square", sub: true, ...FM.bell });
        break;
      case "place": {                     // 放置 / 湮灭：连锁时音高递进，听得出层数
        if (!throttled("place", 50)) return;
        const f = rotate("place", [nt("D", 3), nt("F", 3), nt("A", 3), nt("C", 4), nt("D", 4)]);
        tone({ freq: f, dur: 0.05, gain: 0.1, to: f * 1.5, wave: "triangle", ...FM.steel });
        break;
      }
  
      /* ---- 会话 ---- */
      case "boot":                        // 自检：一声低沉的长哔
        tone({ freq: nt("A", 2), dur: 0.16, gain: 0.14, wave: "square", sub: true, ...FM.anvil });
        break;
      case "login":                       // 登录：小调攀升，收得沉
        seq([[nt("A", 2), 0.08], [nt("E", 3), 0.08], [nt("A", 3), 0.1], [nt("C", 4), 0.2]],
            { gain: 0.12, fat: true, sub: true, ...FM.steel });
        break;
      case "logout":                      // 断开：一路沉下去
        seq([[nt("C", 4), 0.08], [nt("A", 3), 0.08], [nt("E", 3), 0.09], [nt("A", 2), 0.24]],
            { gain: 0.11, wave: "triangle", sub: true, ...FM.anvil });
        break;
    }
  }
  
  
  function stopAll() {
    const t = ac.currentTime;
    [clean, grit].forEach((g) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.01);
      g.gain.setValueAtTime(0, t + 0.013);
      g.gain.linearRampToValueAtTime(1, t + 0.03);
    });
    live.forEach((s) => { try { s.stop(t + 0.012); } catch { /* 已经停了 */ } });
    live.clear();
  }

  function dispose() {
    stopAll();
    try {
      clean.disconnect(); lp.disconnect();
      grit.disconnect(); shaper.disconnect(); dark.disconnect(); hp.disconnect();
    } catch { /* noop */ }
  }

  return { play, stopAll, dispose };
}
