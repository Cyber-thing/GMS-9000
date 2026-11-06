import type { SfxEngine, SfxName } from "./sfxTypes";

/* ============================================================
   YM-CORE —— 受 Yamaha YM2612 启发的工业 FM 声音芯片
   ------------------------------------------------------------
   这是 GNS-9000 的「定制声卡」：不是通用的浏览器哔哔机，
   而是一台又老又猛、还带点故障的电子机器。

   设计要点：
   · 每个声部最多 4 个算子，7 种连接算法（MD 上最常用的那几种）；
   · 算子各自带 ADSR，调制深度自己也有包络 —— 起音金属、收尾干净；
   · 反馈用波形整形近似（见 shapeFeedback 注释）；
   · 专门的工业低频：FM 贝斯 + 锯齿 + 亚低频 + 机械坠音；
   · 可选的「坏硬件」层：量化、降采样、抖动、毛刺；
   · 四条处理链分开走：干净 / FM / 重低 / 故障。

   刻意没用 AudioWorklet：这些音都很短，用原生节点就能做到，
   还省掉一个异步模块和主线程之外的调度负担。
   ============================================================ */

/* ---------- 音高 ---------- */
const N: Record<string, number> = {
  C: 261.63, Cs: 277.18, D: 293.66, Ds: 311.13, E: 329.63, F: 349.23,
  Fs: 369.99, G: 392.0, Gs: 415.3, A: 440.0, As: 466.16, B: 493.88,
};
const nt = (name: string, oct = 4) => N[name] * Math.pow(2, oct - 4);

/* ---------- 算子与算法 ---------- */

interface OpSpec {
  /** 相对基频的倍率。非整数＝不和谐泛音，金属味的来源 */
  ratio: number;
  /** 调制深度（载波用作音量，调制器用作频偏倍率） */
  level: number;
  /** 包络：起音 / 衰减 / 保持电平 / 释放，单位是整体时长的比例 */
  a?: number; d?: number; s?: number; r?: number;
  /** 固定频率（Hz）。设了就忽略 ratio，用来做噪声式的高频算子 */
  fixed?: number;
  /** 细微失谐（Hz），让两个算子互相打拍子 */
  detune?: number;
  wave?: OscillatorType;
}

/**
 * 算法 = 算子怎么连。数字是 YM2612 的习惯叫法，这里只实现常用的几种。
 * mods[i] 列出谁调制 i；carriers 列出谁直接出声。
 */
const ALGO: Record<number, { mods: number[][]; carriers: number[] }> = {
  /* 0: 1→2→3→4 串联。层层调制，最尖最金属 */
  0: { mods: [[], [0], [1], [2]], carriers: [3] },
  /* 2: (1→2) 与 3 一起调制 4 */
  2: { mods: [[], [0], [], [1, 2]], carriers: [3] },
  /* 4: 两条 (1→2) (3→4)，两个载波并列 —— 厚 */
  4: { mods: [[], [0], [], [2]], carriers: [1, 3] },
  /* 5: 1 同时调制 2、3、4 */
  5: { mods: [[], [0], [0], [0]], carriers: [1, 2, 3] },
  /* 6: 1→2，3 和 4 直接出声 */
  6: { mods: [[], [0], [], []], carriers: [1, 2, 3] },
  /* 7: 四个全并联，加法合成，亮而硬 */
  7: { mods: [[], [], [], []], carriers: [0, 1, 2, 3] },
};

interface Patch {
  algo: number;
  ops: OpSpec[];
  /** 反馈量 0..1：近似 YM2612 的 op1 自反馈，越大泛音越毛 */
  feedback?: number;
  /** 音高包络：起音瞬间的频率倍率，很快落回 1。做机械「哐」的关键 */
  pitchHit?: number;
  /** 走哪条链 */
  bus?: "fm" | "heavy" | "clean" | "glitch";
  /** 叠一层亚低频正弦 */
  sub?: number;
  /** 坏硬件程度 0..1 */
  broken?: number;
}

/* ---------- 波形整形曲线 ---------- */

/** 软削波：过载但不碎。 */
function satCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  const k = amount * 70;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  return c;
}

/** 位深削减：阶梯状曲线＝真正的量化失真，数字味就在这儿。 */
function crushCurve(bits: number): Float32Array<ArrayBuffer> {
  const n = 2048;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  const steps = Math.pow(2, bits);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.round(x * steps) / steps;
  }
  return c;
}

/** 反馈近似：自调制会把正弦推向锯齿，这里直接用整形加奇次谐波。 */
function shapeFeedback(amount: number): Float32Array<ArrayBuffer> {
  const n = 1024;
  const c = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    /* tanh 式压缩 + 三次项，听感接近 op1 自反馈拉高时的毛刺 */
    c[i] = Math.tanh(x * (1 + amount * 5)) * (1 - amount * 0.25) + x * x * x * amount * 0.25;
  }
  return c;
}

export function createYmEngine(ac: AudioContext, dest: AudioNode): SfxEngine {
  /* ---------- 四条处理链 ---------- */

  /** 干净链：打字声这类要清晰的，只过一层温和低通。 */
  const clean = ac.createGain();
  const cleanLp = ac.createBiquadFilter();
  cleanLp.type = "lowpass";
  cleanLp.frequency.value = 8000;
  clean.connect(cleanLp).connect(dest);

  /** FM 链：轻过载 + 共振低通，金属但有调性。 */
  const fm = ac.createGain();
  const fmSat = ac.createWaveShaper();
  fmSat.curve = satCurve(0.3);
  fmSat.oversample = "2x";
  const fmLp = ac.createBiquadFilter();
  fmLp.type = "lowpass";
  fmLp.frequency.value = 3400;
  fmLp.Q.value = 1.6;              // 一点共振＝机器的腔体感
  const fmHp = ac.createBiquadFilter();
  fmHp.type = "highpass";
  fmHp.frequency.value = 90;
  fm.connect(fmSat).connect(fmLp).connect(fmHp).connect(dest);

  /** 重链：给低频用，过载更狠、低通更低，再补一条亚低频通道。 */
  const heavy = ac.createGain();
  const hvSat = ac.createWaveShaper();
  hvSat.curve = satCurve(0.62);
  hvSat.oversample = "4x";
  const hvLp = ac.createBiquadFilter();
  hvLp.type = "lowpass";
  hvLp.frequency.value = 1500;
  hvLp.Q.value = 2.2;
  /* 40Hz 以下切掉：小喇叭和耳机上只会糊，不会更重 */
  const hvHp = ac.createBiquadFilter();
  hvHp.type = "highpass";
  hvHp.frequency.value = 42;
  hvHp.Q.value = 0.7;
  heavy.connect(hvSat).connect(hvLp).connect(hvHp).connect(dest);

  /** 故障链：量化 + 带通，专门放毛刺，不污染别的音。 */
  const glitch = ac.createGain();
  const gcrush = ac.createWaveShaper();
  gcrush.curve = crushCurve(3);
  const gBp = ac.createBiquadFilter();
  gBp.type = "bandpass";
  gBp.frequency.value = 1700;
  gBp.Q.value = 1.1;
  glitch.connect(gcrush).connect(gBp).connect(dest);

  const BUS = { clean, fm, heavy, glitch };

  /* 反馈整形曲线缓存：别每个音都新建 Float32Array */
  const fbCurves = new Map<number, Float32Array<ArrayBuffer>>();
  const fbCurve = (amt: number) => {
    const k = Math.round(amt * 10);
    let c = fbCurves.get(k);
    if (!c) { c = shapeFeedback(k / 10); fbCurves.set(k, c); }
    return c;
  };

  /* ---------- 声部管理（仿老声卡的有限复音） ---------- */

  const MAX_VOICES = 8;
  interface Voice { id: number; prio: number; until: number; kill: () => void }
  let vid = 0;
  const voices: Voice[] = [];

  /** 申请一个声部；满了就抢优先级最低、最接近结束的那个。 */
  function alloc(prio: number, dur: number): Voice | null {
    const now = ac.currentTime;
    /* 先清掉已经自然结束的 */
    for (let i = voices.length - 1; i >= 0; i--) if (voices[i].until <= now) voices.splice(i, 1);

    if (voices.length >= MAX_VOICES) {
      let worst = -1, worstScore = Infinity;
      voices.forEach((v, i) => {
        const score = v.prio * 1000 + (v.until - now);
        if (score < worstScore) { worstScore = score; worst = i; }
      });
      /* 新音优先级不够高就直接放弃，避免互相打断成一团糊 */
      if (worst < 0 || voices[worst].prio > prio) return null;
      voices[worst].kill();
      voices.splice(worst, 1);
    }
    const v: Voice = { id: ++vid, prio, until: now + dur, kill: () => {} };
    voices.push(v);
    return v;
  }

  /* 所有在响的源，切引擎时一次掐干净 */
  const live = new Set<AudioScheduledSourceNode>();
  const track = (n: AudioScheduledSourceNode) => {
    live.add(n);
    n.addEventListener("ended", () => live.delete(n), { once: true });
  };

  /* ---------- 核心：弹一个 FM 声部 ---------- */

  interface PlayOpts {
    freq: number;
    dur: number;
    gain: number;
    patch: Patch;
    delay?: number;
    /** 终点频率，做滑音 */
    to?: number;
    prio?: number;
  }

  function fmVoice({ freq, dur, gain, patch, delay = 0, to, prio = 1 }: PlayOpts) {
    const v = alloc(prio, dur + delay);
    if (!v) return;                       // 声部被抢占：这一声直接不发
    const t0 = ac.currentTime + delay;
    const raw = ALGO[patch.algo] ?? ALGO[0];
    /* патч 可以只给 1~4 个算子：把算法里指向不存在算子的连线裁掉，
       载波全被裁光时退回用最后一个算子发声。 */
    const nOps = patch.ops.length;
    const algo = {
      mods: raw.mods.slice(0, nOps).map((src) => src.filter((m) => m < nOps)),
      carriers: raw.carriers.filter((c) => c < nOps),
    };
    if (!algo.carriers.length) algo.carriers = [nOps - 1];
    const busNode = BUS[patch.bus ?? "fm"];
    const nodes: AudioScheduledSourceNode[] = [];
    const gains: GainNode[] = [];

    /* 输出级：整条声部的总音量，便于被抢占时统一淡出 */
    const vOut = ac.createGain();
    vOut.gain.value = gain;
    vOut.connect(busNode);

    /* 先建好所有算子的振荡器与包络 */
    const oscs: OscillatorNode[] = [];
    const envs: GainNode[] = [];
    patch.ops.forEach((op) => {
      const o = ac.createOscillator();
      o.type = op.wave ?? "sine";
      const base = op.fixed ?? freq * op.ratio;
      const end = op.fixed ?? (to ?? freq) * op.ratio;
      o.frequency.setValueAtTime(base, t0);
      if (end !== base) o.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
      if (op.detune) o.detune.setValueAtTime(op.detune, t0);

      /* 音高包络：起音瞬间拔高一下再砸回来＝机械撞击感 */
      if (patch.pitchHit && patch.pitchHit !== 1) {
        o.frequency.cancelScheduledValues(t0);
        o.frequency.setValueAtTime(base * patch.pitchHit, t0);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, base), t0 + Math.min(0.045, dur * 0.3));
        if (end !== base) o.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
      }

      const g = ac.createGain();
      /* 每个算子自己的 ADSR，比例乘到总时长上 */
      const A = Math.max(0.0015, (op.a ?? 0.02) * dur);
      const D = Math.max(0.004, (op.d ?? 0.35) * dur);
      const S = op.s ?? 0.25;
      const R = Math.max(0.01, (op.r ?? 0.4) * dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(1, t0 + A);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0012, S), t0 + A + D);
      g.gain.setValueAtTime(Math.max(0.0012, S), t0 + Math.max(A + D, dur - R));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      o.connect(g);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
      track(o);
      nodes.push(o);
      oscs.push(o);
      envs.push(g);
      gains.push(g);
    });

    /* 按算法接线：调制器 → 载波的 frequency */
    patch.ops.forEach((_op, i) => {
      const srcIdx = algo.mods[i] ?? [];
      srcIdx.forEach((m) => {
        const depth = ac.createGain();
        /* 频偏 = 载波频率 × level，这正是 FM index 的含义 */
        depth.gain.value = (patch.ops[i].fixed ?? freq * patch.ops[i].ratio) * patch.ops[m].level;
        let tap: AudioNode = envs[m];
        /* op1 的反馈：用整形模拟自调制带来的谐波增生 */
        if (m === 0 && patch.feedback) {
          const ws = ac.createWaveShaper();
          ws.curve = fbCurve(patch.feedback);
          envs[m].connect(ws);
          tap = ws;
        }
        tap.connect(depth);
        depth.connect(oscs[i].frequency);
        gains.push(depth);
      });
    });

    /* 载波汇总出声 */
    algo.carriers.forEach((c) => {
      const lvl = ac.createGain();
      lvl.gain.value = patch.ops[c].level / Math.max(1, algo.carriers.length * 0.8);
      envs[c].connect(lvl);
      lvl.connect(vOut);
      gains.push(lvl);
    });

    /* 亚低频：纯正弦托底，不参与调制，避免糊 */
    if (patch.sub) {
      const so = ac.createOscillator();
      so.type = "sine";
      so.frequency.setValueAtTime(freq / 2, t0);
      if (to) so.frequency.exponentialRampToValueAtTime(Math.max(20, to / 2), t0 + dur);
      const sg = ac.createGain();
      sg.gain.setValueAtTime(0.0001, t0);
      sg.gain.exponentialRampToValueAtTime(patch.sub, t0 + 0.006);
      sg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      so.connect(sg); sg.connect(vOut);
      so.start(t0); so.stop(t0 + dur + 0.03);
      track(so); nodes.push(so); gains.push(sg);
    }

    /* 坏硬件层：量化 + 轻微不稳定 + 偶发毛刺 */
    if (patch.broken) {
      const b = patch.broken;
      const ws = ac.createWaveShaper();
      ws.curve = crushCurve(Math.max(2, Math.round(8 - b * 5)));
      vOut.disconnect();
      vOut.connect(ws);
      ws.connect(busNode);
      /* 频率不稳：慢速随机漂移，像晶振老化 */
      oscs.forEach((o) => {
        const drift = (Math.random() * 2 - 1) * b * 22;
        o.detune.setValueAtTime(o.detune.value + drift, t0);
        o.detune.linearRampToValueAtTime(o.detune.value - drift * 0.6, t0 + dur);
      });
      if (Math.random() < b * 0.5) glitchBurst(t0 + dur * 0.35, 0.03 + Math.random() * 0.04, 0.1 * b);
    }

    v.kill = () => {
      const t = ac.currentTime;
      try {
        vOut.gain.cancelScheduledValues(t);
        vOut.gain.setTargetAtTime(0, t, 0.008);
      } catch { /* noop */ }
      nodes.forEach((n) => { try { n.stop(t + 0.03); } catch { /* noop */ } });
    };
  }

  /* ---------- 噪声与毛刺 ---------- */

  /** 带降采样的噪声：hold 个数就是降采样倍率，数字垃圾味的来源。 */
  function noiseBuf(dur: number, hold = 1, curve: "down" | "flat" = "down") {
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (i % hold === 0) v = Math.random() * 2 - 1;
      d[i] = v * (curve === "down" ? 1 - i / n : 1);
    }
    return buf;
  }

  function noise(dur: number, gain: number, delay = 0, hp = 600, hold = 1, bus: keyof typeof BUS = "fm") {
    const t0 = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf(dur, hold);
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(BUS[bus]);
    src.start(t0); src.stop(t0 + dur + 0.02);
    track(src);
  }

  /** 短促的数字毛刺：重度降采样噪声，走故障链。 */
  function glitchBurst(at: number, dur: number, gain: number) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf(dur, 12 + Math.floor(Math.random() * 20), "flat");
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.setValueAtTime(gain, at + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(g); g.connect(glitch);
    src.start(at); src.stop(at + dur + 0.01);
    track(src);
  }

  /* ---------- 音色库 ----------
     ratio 非整数 = 不和谐泛音（金属）；level 高 = 调制深 = 更「铁」。 */

  const P = {
    /** 继电器：极短、硬、带咔哒 */
    relay: {
      algo: 0, feedback: 0.55, pitchHit: 2.4, bus: "fm",
      ops: [
        { ratio: 7.1, level: 2.2, a: 0.004, d: 0.2, s: 0.0, r: 0.2 },
        { ratio: 3.07, level: 1.6, a: 0.004, d: 0.25, s: 0.02, r: 0.25 },
        { ratio: 1.0, level: 1.2, a: 0.004, d: 0.3, s: 0.05, r: 0.3 },
        { ratio: 1.0, level: 1.0, a: 0.006, d: 0.35, s: 0.0, r: 0.4 },
      ],
    } as Patch,
    /** 面板按键：闷铁，带一点腔体 */
    panel: {
      algo: 4, feedback: 0.3, pitchHit: 1.6, bus: "fm", sub: 0.1,
      ops: [
        { ratio: 4.02, level: 1.5, a: 0.005, d: 0.3, s: 0.0, r: 0.3 },
        { ratio: 1.0, level: 1.0, a: 0.006, d: 0.4, s: 0.06, r: 0.45 },
        { ratio: 2.49, level: 1.1, a: 0.005, d: 0.25, s: 0.0, r: 0.3 },
        { ratio: 0.5, level: 0.8, a: 0.008, d: 0.5, s: 0.08, r: 0.5 },
      ],
    } as Patch,
    /** 钢板：有调性的硬芯，用于确认类 */
    steel: {
      algo: 2, feedback: 0.4, bus: "fm", sub: 0.12,
      ops: [
        { ratio: 3.01, level: 1.9, a: 0.004, d: 0.3, s: 0.05, r: 0.35 },
        { ratio: 2.0, level: 1.3, a: 0.006, d: 0.4, s: 0.12, r: 0.4 },
        { ratio: 5.04, level: 0.9, a: 0.004, d: 0.2, s: 0.0, r: 0.25 },
        { ratio: 1.0, level: 1.0, a: 0.008, d: 0.5, s: 0.2, r: 0.5 },
      ],
    } as Patch,
    /** 钟/通信：非整数比，余韵长 */
    bell: {
      algo: 4, feedback: 0.2, bus: "fm",
      ops: [
        { ratio: 3.46, level: 1.7, a: 0.004, d: 0.5, s: 0.05, r: 0.6 },
        { ratio: 1.0, level: 1.0, a: 0.006, d: 0.6, s: 0.15, r: 0.7 },
        { ratio: 5.19, level: 1.1, a: 0.004, d: 0.4, s: 0.02, r: 0.5 },
        { ratio: 2.01, level: 0.85, a: 0.008, d: 0.7, s: 0.1, r: 0.8 },
      ],
    } as Patch,
    /** 工业贝斯：厚、脏、有拳头 */
    bass: {
      algo: 4, feedback: 0.7, pitchHit: 1.35, bus: "heavy", sub: 0.3,
      ops: [
        { ratio: 1.0, level: 2.6, a: 0.004, d: 0.25, s: 0.1, r: 0.4, wave: "sawtooth" },
        { ratio: 1.0, level: 1.0, a: 0.006, d: 0.5, s: 0.3, r: 0.5 },
        { ratio: 2.01, level: 1.4, a: 0.005, d: 0.3, s: 0.05, r: 0.35 },
        { ratio: 0.5, level: 0.9, a: 0.01, d: 0.6, s: 0.25, r: 0.6 },
      ],
    } as Patch,
    /** 机械撞击：坠音 + 金属 */
    impact: {
      algo: 2, feedback: 0.8, pitchHit: 3.2, bus: "heavy", sub: 0.26, broken: 0.25,
      ops: [
        { ratio: 6.03, level: 2.4, a: 0.003, d: 0.15, s: 0.0, r: 0.2 },
        { ratio: 2.51, level: 1.7, a: 0.004, d: 0.25, s: 0.0, r: 0.3 },
        { ratio: 1.0, level: 1.2, a: 0.004, d: 0.35, s: 0.05, r: 0.4 },
        { ratio: 1.0, level: 1.0, a: 0.006, d: 0.45, s: 0.08, r: 0.5 },
      ],
    } as Patch,
    /** 警报：咬人的不和谐 */
    siren: {
      algo: 5, feedback: 0.6, bus: "fm", broken: 0.2,
      ops: [
        { ratio: 1.41, level: 2.8, a: 0.01, d: 0.4, s: 0.5, r: 0.3 },
        { ratio: 1.0, level: 1.0, a: 0.01, d: 0.4, s: 0.6, r: 0.3 },
        { ratio: 1.49, level: 0.9, a: 0.012, d: 0.4, s: 0.5, r: 0.3 },
        { ratio: 2.98, level: 0.7, a: 0.01, d: 0.3, s: 0.3, r: 0.3 },
      ],
    } as Patch,
    /** 数据流：细碎高频，量化感强 */
    data: {
      algo: 7, bus: "fm", broken: 0.35,
      ops: [
        { ratio: 4.01, level: 0.8, a: 0.004, d: 0.2, s: 0.0, r: 0.25 },
        { ratio: 6.97, level: 0.5, a: 0.004, d: 0.15, s: 0.0, r: 0.2 },
        { ratio: 2.0, level: 0.6, a: 0.005, d: 0.25, s: 0.0, r: 0.3 },
        { ratio: 9.02, level: 0.3, a: 0.003, d: 0.12, s: 0.0, r: 0.15 },
      ],
    } as Patch,
    /** 腐坏：故意跑调、量化严重 */
    corrupt: {
      algo: 0, feedback: 0.9, bus: "heavy", sub: 0.2, broken: 0.75,
      ops: [
        { ratio: 5.47, level: 3.0, a: 0.004, d: 0.2, s: 0.1, r: 0.3, detune: 18 },
        { ratio: 2.33, level: 2.0, a: 0.005, d: 0.3, s: 0.1, r: 0.35, detune: -22 },
        { ratio: 1.01, level: 1.4, a: 0.006, d: 0.4, s: 0.15, r: 0.4 },
        { ratio: 1.0, level: 1.0, a: 0.008, d: 0.5, s: 0.1, r: 0.5, detune: 9 },
      ],
    } as Patch,
    /** 终端/系统：干净一点的方波感，用于提示 */
    term: {
      algo: 6, feedback: 0.25, bus: "fm",
      ops: [
        { ratio: 2.0, level: 1.4, a: 0.004, d: 0.3, s: 0.05, r: 0.3 },
        { ratio: 1.0, level: 1.0, a: 0.005, d: 0.35, s: 0.12, r: 0.35 },
        { ratio: 3.0, level: 0.5, a: 0.005, d: 0.25, s: 0.0, r: 0.3 },
        { ratio: 1.005, level: 0.6, a: 0.006, d: 0.4, s: 0.1, r: 0.4 },
      ],
    } as Patch,
  };

  /* ---------- 小工具 ---------- */

  const lastAt: Record<string, number> = {};
  const turn: Record<string, number> = {};
  const throttled = (k: string, ms: number) => {
    const now = performance.now();
    if (lastAt[k] && now - lastAt[k] < ms) return false;
    lastAt[k] = now;
    return true;
  };
  function rotate<T>(k: string, arr: T[]): T {
    const i = (turn[k] = (turn[k] ?? -1) + 1);
    return arr[i % arr.length];
  }

  /** 弹一串音符。 */
  function seq(
    notes: [number, number][],
    patch: Patch,
    gain: number,
    opts: { prio?: number; slideTo?: number } = {}
  ) {
    let t = 0;
    notes.forEach(([f, d], i) => {
      if (f > 0) {
        fmVoice({
          freq: f, dur: d * 0.95, gain, patch, delay: t,
          prio: opts.prio ?? 1,
          to: i === notes.length - 1 ? opts.slideTo : undefined,
        });
      }
      t += d;
    });
  }

  /* ---------- 事件表 ---------- */

  function play(name: SfxName) {
    switch (name) {
      /* ===== 界面：电子开关、继电器、工业控制台 ===== */
      case "click": {
        if (!throttled("click", 38)) return;
        const f = rotate("click", [nt("A", 2), nt("C", 3), nt("E", 2), nt("G", 2)]);
        fmVoice({ freq: f, dur: 0.07, gain: 0.5, patch: P.panel, prio: 0 });
        break;
      }
      case "tick":
        if (!throttled("tick", 32)) return;
        fmVoice({ freq: rotate("tick", [nt("E", 2), nt("D", 2), nt("G", 2)]), dur: 0.05, gain: 0.4, patch: P.relay, prio: 0 });
        break;
      case "hover":
        if (!throttled("hover", 90)) return;
        fmVoice({ freq: nt("E", 3), dur: 0.028, gain: 0.2, patch: P.data, prio: 0 });
        break;
      case "toggle":
        if (!throttled("toggle", 55)) return;
        seq([[nt("A", 2), 0.055], [nt("E", 3), 0.085]], P.relay, 0.46, { prio: 1 });
        break;
      case "back":
        seq([[nt("E", 3), 0.055], [nt("A", 2), 0.09]], P.relay, 0.44, { prio: 1 });
        break;
      case "deny":
        if (!throttled("deny", 110)) return;
        fmVoice({ freq: nt("E", 1), to: nt("As", 0), dur: 0.26, gain: 0.62, patch: P.impact, prio: 2 });
        noise(0.1, 0.1, 0.0, 260, 6, "heavy");
        break;
      case "pop":
        fmVoice({ freq: nt("D", 2), to: nt("A", 2), dur: 0.09, gain: 0.42, patch: P.panel, prio: 1 });
        break;

      /* 分区动机：同一台机器上不同的开关 */
      case "uiSys":
        if (!throttled("uiSys", 42)) return;
        seq([[nt("E", 2), 0.038], [nt("B", 2), 0.062]], P.relay, 0.46, { prio: 1 });
        break;
      case "uiMap":
        if (!throttled("uiMap", 42)) return;
        seq([[nt("D", 2), 0.042], [nt("G", 2), 0.07]], P.steel, 0.46, { prio: 1 });
        break;
      case "uiNode": {
        if (!throttled("uiNode", 42)) return;
        const r = rotate("uiNode", [nt("A", 2), nt("C", 3), nt("G", 2)]);
        seq([[r, 0.036], [r * 1.189, 0.06]], P.steel, 0.44, { prio: 1 });
        break;
      }
      case "uiChat":
        if (!throttled("uiChat", 42)) return;
        seq([[nt("C", 3), 0.036], [nt("B", 2), 0.062]], P.bell, 0.38, { prio: 1 });
        break;
      case "uiGame":
        if (!throttled("uiGame", 42)) return;
        seq([[nt("Gs", 2), 0.034], [nt("A", 2), 0.058]], P.siren, 0.42, { prio: 1 });
        break;
      case "uiTrade":
        if (!throttled("uiTrade", 42)) return;
        seq([[nt("C", 2), 0.042], [nt("Gs", 2), 0.075]], P.bass, 0.44, { prio: 1 });
        break;
      case "uiDanger":
        if (!throttled("uiDanger", 60)) return;
        seq([[nt("As", 1), 0.06], [nt("E", 1), 0.12]], P.impact, 0.56, { prio: 2 });
        break;

      /* ===== 通话：老式电子通信设备 ===== */
      case "type":
        if (!throttled("type", 26)) return;
        /* 唯一走干净链的音：保持清脆的打字手感 */
        fmVoice({
          freq: nt("C", 5) * (0.97 + Math.random() * 0.06),
          dur: 0.016, gain: 0.3, prio: 0,
          patch: { algo: 7, bus: "clean", ops: [{ ratio: 1, level: 1, a: 0.08, d: 0.5, s: 0, r: 0.4, wave: "square" }] },
        });
        break;
      case "ring":
        /* 三全音交替，金属钟声 —— 机房里的电铃 */
        seq([
          [nt("A", 2), 0.12], [nt("Ds", 3), 0.12], [nt("A", 2), 0.12], [nt("Ds", 3), 0.13],
          [0, 0.14],
          [nt("A", 2), 0.12], [nt("Ds", 3), 0.12], [nt("A", 2), 0.12], [nt("Ds", 3), 0.16],
        ], P.bell, 0.4, { prio: 3 });
        break;
      case "answer":
        seq([[nt("A", 1), 0.06], [nt("C", 2), 0.06], [nt("E", 2), 0.12]], P.steel, 0.5, { prio: 2 });
        break;
      case "hangup":
        fmVoice({ freq: nt("C", 2), to: nt("F", 1), dur: 0.22, gain: 0.5, patch: P.bass, prio: 2 });
        break;

      /* ===== 消息 / 通知 ===== */
      case "message":
        if (!throttled("message", 380)) return;
        seq([[nt("A", 3), 0.055], [nt("C", 4), 0.055], [nt("E", 4), 0.1]], P.bell, 0.34, { prio: 2 });
        break;
      case "notify":
        if (!throttled("notify", 280)) return;
        seq([[nt("D", 3), 0.05], [nt("Cs", 3), 0.08]], P.term, 0.34, { prio: 1 });
        break;
      case "codex":
        if (!throttled("codex", 340)) return;
        seq([[nt("D", 2), 0.065], [nt("F", 2), 0.065], [nt("A", 2), 0.12]], P.steel, 0.36, { prio: 1 });
        break;

      /* ===== 入侵：和机器搏斗 ===== */
      case "hackStart":
        /* 低频扫上去＋降采样噪声，像载波被咬住 */
        fmVoice({ freq: nt("C", 0), to: nt("C", 2), dur: 0.42, gain: 0.5, patch: P.bass, prio: 3 });
        noise(0.2, 0.08, 0.16, 420, 8, "glitch");
        break;
      case "hackOk":
        /* 沉下去收尾的确认：小调三连＋贝斯落点 */
        seq([[nt("A", 2), 0.09], [nt("C", 3), 0.09], [nt("E", 3), 0.1]], P.steel, 0.46, { prio: 3 });
        fmVoice({ freq: nt("A", 1), dur: 0.42, gain: 0.58, patch: P.bass, delay: 0.27, prio: 3 });
        break;
      case "hackFail":
        /* 腐坏下坠＋毛刺 */
        seq([[nt("F", 2), 0.1], [nt("E", 2), 0.1], [nt("Ds", 2), 0.12]], P.corrupt, 0.5, { prio: 4 });
        fmVoice({ freq: nt("A", 1), to: nt("D", 0), dur: 0.5, gain: 0.6, patch: P.impact, delay: 0.3, prio: 4 });
        noise(0.42, 0.1, 0.3, 200, 14, "glitch");
        break;
      case "alarm":
        if (!throttled("alarm", 650)) return;
        seq([[nt("As", 2), 0.13], [nt("E", 2), 0.13], [nt("As", 2), 0.13], [nt("E", 2), 0.16]], P.siren, 0.42, { prio: 4 });
        break;

      /* ===== 数据 ===== */
      case "scan": {
        if (!throttled("scan", 85)) return;
        const f = rotate("scan", [nt("A", 3), nt("C", 4), nt("D", 4), nt("C", 4)]);
        fmVoice({ freq: f, dur: 0.045, gain: 0.26, patch: P.data, prio: 0 });
        break;
      }
      case "found":
        seq([[nt("A", 2), 0.06], [nt("C", 3), 0.12]], P.steel, 0.42, { prio: 2 });
        break;
      case "download":
        fmVoice({ freq: nt("A", 1), to: nt("A", 2), dur: 0.24, gain: 0.46, patch: P.bass, prio: 2 });
        break;
      case "money":
        seq([[nt("C", 3), 0.06], [nt("G", 3), 0.13]], P.bell, 0.4, { prio: 2 });
        break;
      case "place":
        if (!throttled("place", 46)) return;
        fmVoice({
          freq: rotate("place", [nt("D", 2), nt("F", 2), nt("A", 2), nt("C", 3), nt("D", 3)]),
          dur: 0.06, gain: 0.4, patch: P.panel, prio: 1,
        });
        break;

      /* ===== 会话 ===== */
      case "boot":
        fmVoice({ freq: nt("A", 1), dur: 0.2, gain: 0.52, patch: P.impact, prio: 3 });
        break;
      case "login":
        /* 机器上电：低音砸下去，再爬上来 */
        fmVoice({ freq: nt("A", 0), to: nt("A", 1), dur: 0.26, gain: 0.55, patch: P.bass, prio: 3 });
        seq([[nt("E", 2), 0.09], [nt("A", 2), 0.1], [nt("C", 3), 0.22]], P.steel, 0.44, { prio: 3 });
        break;
      case "logout":
        /* 断电：一路沉下去 */
        seq([[nt("C", 3), 0.09], [nt("A", 2), 0.09], [nt("E", 2), 0.1]], P.steel, 0.4, { prio: 3 });
        fmVoice({ freq: nt("A", 1), to: nt("A", 0), dur: 0.42, gain: 0.55, patch: P.bass, delay: 0.26, prio: 3 });
        break;
    }
  }

  function stopAll() {
    const t = ac.currentTime;
    [clean, fm, heavy, glitch].forEach((g) => {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.01);
      g.gain.setValueAtTime(0, t + 0.013);
      g.gain.linearRampToValueAtTime(1, t + 0.03);
    });
    voices.forEach((v) => v.kill());
    voices.length = 0;
    live.forEach((s) => { try { s.stop(t + 0.012); } catch { /* noop */ } });
    live.clear();
  }

  function dispose() {
    stopAll();
    try {
      [clean, cleanLp, fm, fmSat, fmLp, fmHp, heavy, hvSat, hvLp, hvHp, glitch, gcrush, gBp]
        .forEach((n) => n.disconnect());
    } catch { /* noop */ }
  }

  return { play, stopAll, dispose };
}
