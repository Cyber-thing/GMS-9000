export const pad = (n: number, l = 2) => String(n).padStart(l, "0");

export const clockNow = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const stampNow = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fmtUptime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return d > 0
    ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}`
    : `${pad(h)}:${pad(m)}:${pad(sec)}`;
};

export const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem("netgrid." + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem("netgrid." + key, JSON.stringify(value));
    } catch {
      
    }
  },
  /** 清除游戏进度，同时默认保留语言、CRT 和列宽等界面设置。 */
    wipe(keep: string[] = ["lang", "fx", "noise", "depth", "depth.migrated", "sfx", "sfx.vol", "sfx.mode", "sfx.mode.migrated", "sfx.mode.v3", "phos", "avatar", "col.left", "col.right"]) {
    try {
      const spared = new Set(keep.map((k) => "netgrid." + k));
      const doomed: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("netgrid.") && !spared.has(k)) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch {
      
    }
  },
};

export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const fillTemplate = (tpl: string, ctx: Record<string, string>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? k);

/** Смешать цвет с прозрачностью — работает и для hex, и для CSS-переменных var(--…). */
export const alfa = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

export const blockBar = (pct: number, width = 10) => {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
};
