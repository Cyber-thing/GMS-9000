import { useId, useSyncExternalStore } from "react";
import { cn } from "../utils/cn";
import { store } from "../lib/util";

/* ---------- 赛博朋克头像 ----------
   每张脸都是手绘 SVG：义体、接口、面罩、线缆。
   画布统一 48x48，细节在 18px 的列表里也还能读出轮廓。 */
export type AvatarKind =
  | "skull" | "silhouette" | "rigger" | "visor" | "operator" | "runner"
  | "optic" | "core" | "feline" | "spool" | "crawler" | "mast"
  | "gasmask" | "android" | "mohawk" | "medic" | "shades"
  | "corprobot" | "plainbust";

/* 没有专属立绘的联系人：按昵称哈希稳定分配一张脸和一种颜色。 */
/* 人脸排在前面：聊天列表里大多数是活人，器物只是点缀。 */
const FALLBACK_KINDS: AvatarKind[] = [
  "gasmask", "android", "mohawk", "medic", "shades", "feline",
  "optic", "core", "spool", "crawler", "mast",
];
/* 除 ghost / sable 外，所有人都用当前配色的荧光色：
   聊天列表保持统一，两位剧情人物才跳色。 */
const UNIFORM = "var(--color-phos)";
const hashOf = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  /* 雪崩混合：短昵称也能散开，避免大家都顶同一张脸 */
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

/* ---------- 玩家可选的 5 张脸 ---------- */
export const PLAYER_AVATARS: { id: string; kind: AvatarKind }[] = [
  { id: "runner",  kind: "runner" },
  { id: "gasmask", kind: "gasmask" },
  { id: "mohawk",  kind: "mohawk" },
  { id: "shades",  kind: "shades" },
  { id: "android", kind: "android" },
];

/* 极简外部 store：换头像后所有正在显示的头像立刻跟着变。 */
let playerAvatar = store.get<string>("avatar", "runner");
const avatarSubs = new Set<() => void>();
export const loadPlayerAvatar = (): string => playerAvatar;
export const savePlayerAvatar = (v: string) => {
  playerAvatar = v;
  store.set("avatar", v);
  avatarSubs.forEach((fn) => fn());
};
export const usePlayerAvatar = (): string =>
  useSyncExternalStore(
    (fn) => { avatarSubs.add(fn); return () => avatarSubs.delete(fn); },
    () => playerAvatar,
    () => playerAvatar
  );

/** 按联系人 id 选择头像和主色。 */
export const avatarOf = (id: string): { kind: AvatarKind; color: string; plain?: boolean } => {
  switch (id) {
    /* 两位剧情人物保留专属配色 */
    case "ghost":  return { kind: "skull", color: "#cfa04b" };
    case "sablec":
    case "sable":  return { kind: "corprobot", color: "#8f86b8" };
    /* 这两位「没有头像」：只给一个无边框的通用剪影 */
    case "op17":   return { kind: "plainbust", color: "var(--color-dim)", plain: true };
    case "freddy": return { kind: "plainbust", color: "var(--color-dim)", plain: true };
    case "marla":  return { kind: "visor", color: UNIFORM };
    default: {
      /* 玩家自己：用他挑选的那张脸 */
      if (id === "OP" || id.startsWith("OP:")) {
        const want = id.startsWith("OP:") ? id.slice(3) : loadPlayerAvatar();
        const pick = PLAYER_AVATARS.find((p) => p.id === want) ?? PLAYER_AVATARS[0];
        return { kind: pick.kind, color: "var(--color-phosbrite)" };
      }
      const h = hashOf(id || "anon");
      return { kind: FALLBACK_KINDS[h % FALLBACK_KINDS.length], color: UNIFORM };
    }
  }
};

/** 头像选择器：登录界面和顶栏共用。 */
export function AvatarPicker({ size = 34, className }: { size?: number; className?: string }) {
  const current = usePlayerAvatar();
  return (
    <div className={cn("flex gap-1.5", className)}>
      {PLAYER_AVATARS.map((p) => {
        const active = p.id === current;
        return (
          <button
            key={p.id}
            onClick={() => savePlayerAvatar(p.id)}
            title={p.id}
            className={cn(
              "border p-[2px] transition-all",
              active ? "border-phos bg-phos/15" : "border-line2 hover:border-line3 hover:bg-panel2"
            )}
            style={active ? { boxShadow: "0 0 10px rgb(var(--phosrgb) / 0.3)" } : undefined}
          >
            <Avatar id={`OP:${p.id}`} size={size} />
          </button>
        );
      })}
    </div>
  );
}

function Glyph({ kind, color, anim, uid }: { kind: AvatarKind; color: string; anim: boolean; uid: string }) {
  /* 线稿统一参数：细线描边 + 深色填充，突出霓虹轮廓 */
  const L = { stroke: color, fill: "none", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const thin = { ...L, strokeWidth: 1, opacity: 0.65 };
  const hollow = { fill: "#05060a", stroke: color, strokeWidth: 1.4 };
  const solid = { fill: color, stroke: "none" };
  /* 发光点：义眼 / 指示灯 */
  const Led = ({ cx, cy, r = 1.9, dur = "2.2s" }: { cx: number; cy: number; r?: number; dur?: string }) => (
    <circle cx={cx} cy={cy} r={r} fill={color} filter={`url(#g${uid})`}>
      {anim && <animate attributeName="opacity" values="1;0.35;1" dur={dur} repeatCount="indefinite" />}
    </circle>
  );

  switch (kind) {
    /* ===== 幽灵：义体化的骷髅，颞部装甲板 + 后脑线缆 ===== */
    case "skull":
      return (
        <g>
          {/* 后脑接出的双股线缆 */}
          <path d="M14 33c-3.5 1.8-5.4 4.6-5.6 9" {...thin} />
          <path d="M16.5 35c-2.6 2-3.8 4.4-4 7" {...thin} />
          {/* 颅骨 */}
          <path d="M11 26.5c0-8.4 5.9-14.4 13-14.4s13 6 13 14.4v3.8c0 1.8-1.1 2.9-2.6 3.3l-1.7.5v4.2c0 1.5-1.2 2.7-2.7 2.7H18c-1.5 0-2.7-1.2-2.7-2.7v-4.2l-1.7-.5c-1.5-.4-2.6-1.5-2.6-3.3z"
            {...hollow} />
          {/* 颅缝 */}
          <path d="M24 12.3v6.2M18.6 14.2l2.6 4.3M29.4 14.2l-2.6 4.3" {...thin} />
          {/* 左眼窝（空） */}
          <path d="M14.8 24.6c0-2.3 1.8-3.9 4-3.9s4 1.6 4 3.9-1.8 4.4-4 4.4-4-2.1-4-4.4z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 右眼：义眼光学组件 */}
          <circle cx="29.6" cy="24.8" r="4.4" {...hollow} />
          <circle cx="29.6" cy="24.8" r="2.6" fill="#05060a" stroke={color} strokeWidth={0.9} opacity={0.8} />
          <Led cx={29.6} cy={24.8} r={1.6} />
          {/* 颞部装甲板与螺钉 */}
          <path d="M33.6 18.4h3.1c.7 0 1.3.6 1.3 1.3v7.6c0 .7-.6 1.3-1.3 1.3h-1.4" {...L} strokeWidth={1.2} />
          <circle cx="36" cy="20.9" r="0.75" {...solid} />
          <circle cx="36" cy="26" r="0.75" {...solid} />
          {/* 鼻腔 */}
          <path d="M24 27.6l-1.9 3.6h3.8z" fill="#05060a" stroke={color} strokeWidth={1.1} />
          {/* 牙列 */}
          <path d="M17.6 34.4h12.8" {...L} strokeWidth={1.2} />
          <path d="M20.2 34.4v3.4M23 34.4v3.4M25.8 34.4v3.4M28.4 34.4v3.4" {...thin} />
          {/* 额头条码 */}
          <g opacity={0.8}>
            <path d="M20.4 16.6v2.4M21.8 16.6v2.4M23.2 16.6v1.6M24.6 16.6v2.4M26 16.6v1.6" stroke={color} strokeWidth={0.8} />
          </g>
        </g>
      );

    /* ===== sable：公司人剪影，立领 + 面部只有一道光学带 ===== */
    case "silhouette":
      return (
        <g>
          {/* 肩线与立领 */}
          <path d="M6.5 43c0-7.4 5.2-11.6 11.2-13.2l5.9-1.5 6.2 1.5C35.8 31.4 41 35.6 41 43z" fill="#05060a" stroke={color} strokeWidth={1.4} />
          <path d="M17.7 29.8l6 6.6 6.2-6.6" {...L} strokeWidth={1.2} />
          <path d="M23.7 36.4V43" {...thin} />
          {/* 立领 */}
          <path d="M16 31.6l-1.6 8M31.6 31.6l1.6 8" {...thin} />
          {/* 头部 */}
          <path d="M15.4 17.6c0-5 3.8-8.6 8.4-8.6s8.4 3.6 8.4 8.6v3.6c0 5-3.8 8.8-8.4 8.8s-8.4-3.8-8.4-8.8z" fill="#05060a" stroke={color} strokeWidth={1.4} />
          {/* 光学带 */}
          <path d="M15.8 19.4h16.2" stroke={color} strokeWidth={3.2} opacity={0.22} />
          <path d="M16.4 19.4h15" stroke={color} strokeWidth={1.5} filter={`url(#g${uid})`}>
            {anim && <animate attributeName="opacity" values="1;0.45;1" dur="3.4s" repeatCount="indefinite" />}
          </path>
          <Led cx={28.6} cy={19.4} r={1.1} dur="2.8s" />
          {/* 颈后神经接口 */}
          <rect x="30.2" y="25.4" width="4.2" height="3" rx="0.6" {...hollow} strokeWidth={1} />
          <path d="M31.2 26.9h2.2" {...thin} />
        </g>
      );

    /* ===== 操作员：CRT 当脑袋 + 耳机话筒 ===== */
    case "operator":
      return (
        <g>
          {/* 肩 */}
          <path d="M9 43c0-5.4 4-8.6 8.6-9.6h12.8c4.6 1 8.6 4.2 8.6 9.6z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 显示器头 */}
          <rect x="11.4" y="8.6" width="25.2" height="20.4" rx="2.6" {...hollow} />
          <rect x="14" y="11.4" width="20" height="14.6" rx="1.2" fill="#05060a" stroke={color} strokeWidth={0.9} opacity={0.75} />
          {/* 屏幕上的字符行 */}
          <path d="M16.6 15.8h7.2M16.6 18.8h10.6M16.6 21.8h5.4" stroke={color} strokeWidth={1.2} opacity={0.9} />
          <rect x="23.6" y="20.6" width="2.4" height="2.6" {...solid}>
            {anim && <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite" />}
          </rect>
          {/* 颈 */}
          <path d="M20.8 29v4.4M27.2 29v4.4" {...thin} />
          {/* 耳机 */}
          <path d="M11.4 14.6H8.8c-1 0-1.8.8-1.8 1.8v4.4c0 1 .8 1.8 1.8 1.8h2.6" {...L} strokeWidth={1.3} />
          <path d="M36.6 14.6h2.6c1 0 1.8.8 1.8 1.8v4.4c0 1-.8 1.8-1.8 1.8h-2.6" {...L} strokeWidth={1.3} />
          {/* 话筒臂 */}
          <path d="M8.4 22.6c0 4.4 2.6 7.6 6.4 8.6" {...thin} />
          <circle cx="15.4" cy="31.4" r="1.6" {...solid} />
          <Led cx={39} cy={18.6} r={1} dur="2.6s" />
        </g>
      );

    /* ===== 技工：鸭舌帽 + 呼吸面罩 + 机械臂 ===== */
    case "rigger":
      return (
        <g>
          {/* 肩与机械臂 */}
          <path d="M8 43c0-6 4.4-9.8 9.6-11h12.8c5.2 1.2 9.6 5 9.6 11z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 右肩义体：装甲板 + 活塞 */}
          <path d="M30.6 34.2h7.2c1.2 1.9 2 4.2 2.2 8.8h-9.4z" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <path d="M32.2 37.6h6.2M32.2 40.2h6.8" {...thin} />
          <circle cx="34.4" cy="35.6" r="0.8" {...solid} />
          {/* 头 */}
          <path d="M15.6 20.4c0-4.6 3.8-8 8.4-8s8.4 3.4 8.4 8v3.4c0 4.6-3.8 8.4-8.4 8.4s-8.4-3.8-8.4-8.4z" fill="#05060a" stroke={color} strokeWidth={1.4} />
          {/* 帽檐 */}
          <path d="M13.6 18.4c0-5.4 4.6-9.4 10.4-9.4s10.4 4 10.4 9.4z" fill="#05060a" stroke={color} strokeWidth={1.4} />
          <path d="M10.6 18.4h26.8" {...L} strokeWidth={1.5} />
          {/* 护目镜推到帽檐上 */}
          <circle cx="19.4" cy="14.6" r="2" {...thin} />
          <circle cx="28.6" cy="14.6" r="2" {...thin} />
          <path d="M21.4 14.6h5.2" {...thin} />
          {/* 眼 */}
          <Led cx={20.4} cy={22.4} r={1.3} dur="3s" />
          <Led cx={27.6} cy={22.4} r={1.3} dur="3.4s" />
          {/* 呼吸面罩 */}
          <path d="M18.4 25.4h11.2c0 4-2.5 6.6-5.6 6.6s-5.6-2.6-5.6-6.6z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          <path d="M20.6 27.8h6.8" {...thin} />
          <circle cx="17.4" cy="27.4" r="1.8" {...hollow} strokeWidth={1} />
          <circle cx="30.6" cy="27.4" r="1.8" {...hollow} strokeWidth={1} />
        </g>
      );

    /* ===== 面罩客：波波头 + 横贯式义眼镜 ===== */
    case "visor":
      return (
        <g>
          {/* 肩 */}
          <path d="M9 43c0-6 4.6-9.6 10-10.6h10c5.4 1 10 4.6 10 10.6z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 头发（波波头） */}
          <path d="M12.6 26.4V18c0-5.4 5-9.4 11.4-9.4S35.4 12.6 35.4 18v8.4l-2.6-1.6V19c-2.8 1.6-6.6 2.2-8.8 2.2s-6-.6-8.8-2.2v5.8z" fill="#05060a" stroke={color} strokeWidth={1.4} />
          {/* 面部 */}
          <path d="M16.2 19.6c0 0 3.6 1.8 7.8 1.8s7.8-1.8 7.8-1.8v5.6c0 4.6-3.5 8.2-7.8 8.2s-7.8-3.6-7.8-8.2z" fill="#05060a" stroke={color} strokeWidth={1.2} />
          {/* 义眼镜 */}
          <path d="M15.6 24.2h16.8" stroke={color} strokeWidth={3.6} opacity={0.2} />
          <rect x="15.8" y="22.6" width="16.4" height="3.4" rx="1.7" {...hollow} strokeWidth={1.2} />
          <Led cx={19.8} cy={24.3} r={1.1} dur="2.4s" />
          <Led cx={28.2} cy={24.3} r={1.1} dur="3.1s" />
          <path d="M22.4 24.3h3.2" {...thin} />
          {/* 嘴与唇环 */}
          <path d="M21.6 29.6c1.6 1 3.2 1 4.8 0" {...L} strokeWidth={1.2} />
          <circle cx="26.6" cy="31.4" r="0.8" {...solid} />
        </g>
      );

    /* ===== 玩家：兜帽 + 光学带 + 颊部芯片 ===== */
    case "runner":
      return (
        <g>
          {/* 兜帽外廓 */}
          <path d="M7.4 43c0-9 3.4-15.8 8.2-19.4l1.6 4 6.8-2.6 6.8 2.6 1.6-4C37.2 27.2 40.6 34 40.6 43z" fill="#05060a" stroke={color} strokeWidth={1.4} />
          <path d="M15.6 23.6C16.4 14.6 19.4 9 24 9s7.6 5.6 8.4 14.6" {...L} strokeWidth={1.4} />
          {/* 帽内阴影 */}
          <path d="M16.4 24.2c0-6.6 3.4-11 7.6-11s7.6 4.4 7.6 11v3.4c0 4.4-3.4 7.6-7.6 7.6s-7.6-3.2-7.6-7.6z" fill="#05060a" stroke={color} strokeWidth={1} opacity={0.7} />
          {/* 光学带 */}
          <path d="M17 25.4h14" stroke={color} strokeWidth={3.4} opacity={0.22} />
          <path d="M17.4 25.4h13.2" stroke={color} strokeWidth={1.4} filter={`url(#g${uid})`} />
          <Led cx={20.6} cy={25.4} r={1.2} dur="2.1s" />
          <Led cx={27.4} cy={25.4} r={1.2} dur="2.9s" />
          {/* 颊部芯片与导线 */}
          <rect x="27.6" y="29.2" width="4" height="3" rx="0.5" {...hollow} strokeWidth={1} />
          <path d="M27.6 30.7h-2.4M31.6 30.7h1.8" {...thin} />
          {/* 领口 */}
          <path d="M18.4 36.4l5.6 3.4 5.6-3.4" {...thin} />
        </g>
      );

    /* ===== 监控义眼 ===== */
    case "optic":
      return (
        <g>
          <path d="M5.6 24c4.4-7 10.6-10.6 18.4-10.6S38 17 42.4 24c-4.4 7-10.6 10.6-18.4 10.6S10 31 5.6 24z" {...hollow} />
          <circle cx="24" cy="24" r="7.6" {...hollow} strokeWidth={1.2} />
          {/* 虹膜分片 */}
          <g opacity={0.85}>
            <path d="M24 16.6v3.2M24 28.2v3.2M16.6 24h3.2M28.2 24h3.2M18.9 18.9l2.3 2.3M26.8 26.8l2.3 2.3M29.1 18.9l-2.3 2.3M21.2 26.8l-2.3 2.3" stroke={color} strokeWidth={1} />
          </g>
          <circle cx="24" cy="24" r="3.2" fill={color} filter={`url(#g${uid})`}>
            {anim && <animate attributeName="r" values="3.2;1.8;3.2" dur="4s" repeatCount="indefinite" />}
          </circle>
          <circle cx="21.4" cy="21.6" r="1" fill="#e9f3ff" opacity={0.9} />
          {/* 支架 */}
          <path d="M9.6 14.4l3.6 3.4M38.4 14.4l-3.6 3.4M9.6 33.6l3.6-3.4M38.4 33.6l-3.6-3.4" {...thin} />
        </g>
      );

    /* ===== AI 核心：棱柱 + 电路 ===== */
    case "core":
      return (
        <g>
          <path d="M24 6.4l14.4 8.4v18.4L24 41.6 9.6 33.2V14.8z" {...hollow} />
          <path d="M24 6.4v9M24 32.6v9M9.6 14.8l7.8 4.6M38.4 14.8l-7.8 4.6M9.6 33.2l7.8-4.6M38.4 33.2l-7.8-4.6" {...thin} />
          {/* 内核 */}
          <path d="M24 15.4l7 4.2v8.8l-7 4.2-7-4.2v-8.8z" {...hollow} strokeWidth={1.2} />
          <circle cx="24" cy="24" r="2.8" fill={color} filter={`url(#g${uid})`}>
            {anim && <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite" />}
          </circle>
          {/* 电路触点 */}
          <circle cx="17" cy="19.6" r="0.9" {...solid} />
          <circle cx="31" cy="19.6" r="0.9" {...solid} />
          <circle cx="17" cy="28.4" r="0.9" {...solid} />
          <circle cx="31" cy="28.4" r="0.9" {...solid} />
        </g>
      );

    /* ===== 赛博猫 ===== */
    case "feline":
      return (
        <g>
          {/* 耳朵（带天线） */}
          <path d="M11.4 20.4L9.6 9.8l8.6 5.2M36.6 20.4l1.8-10.6-8.6 5.2" {...L} strokeWidth={1.4} />
          <path d="M12.6 9.6l-1.4-3.4M35.4 9.6l1.4-3.4" {...thin} />
          {/* 头 */}
          <path d="M10.6 24c0-7.4 6-12.4 13.4-12.4S37.4 16.6 37.4 24s-6 14-13.4 14S10.6 31.4 10.6 24z" {...hollow} />
          {/* 护目带 */}
          <path d="M12.4 23.4h23.2" stroke={color} strokeWidth={4} opacity={0.18} />
          <path d="M14 21.6h20v3.6H14z" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <Led cx={19} cy={23.4} r={1.3} dur="2.3s" />
          <Led cx={29} cy={23.4} r={1.3} dur="3.2s" />
          {/* 鼻与嘴 */}
          <path d="M24 28l-1.4 1.6h2.8z" {...solid} />
          <path d="M24 29.6v1.6M24 31.2c-1.2 1.4-3 1.4-4 .2M24 31.2c1.2 1.4 3 1.4 4 .2" {...thin} />
          {/* 线缆胡须 */}
          <path d="M13.4 28.4l-5 1.2M13.4 30.6l-4.4 2.6M34.6 28.4l5 1.2M34.6 30.6l4.4 2.6" {...thin} />
        </g>
      );

    /* ===== 数据盘 ===== */
    case "spool":
      return (
        <g>
          <circle cx="24" cy="24" r="16.4" {...hollow} />
          <circle cx="24" cy="24" r="11.6" {...thin} />
          <circle cx="24" cy="24" r="7" {...thin} />
          <circle cx="24" cy="24" r="3.2" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 扇区分割 */}
          <path d="M24 7.6v4.8M24 35.6v4.8M7.6 24h4.8M35.6 24h4.8" {...L} strokeWidth={1.2} />
          <path d="M12.4 12.4l3.4 3.4M35.6 35.6l-3.4-3.4M35.6 12.4l-3.4 3.4M12.4 35.6l3.4-3.4" {...thin} />
          {/* 读取指示 */}
          <circle cx="31.2" cy="16.8" r="1.6" fill={color} filter={`url(#g${uid})`}>
            {anim && (
              <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="4.5s" repeatCount="indefinite" />
            )}
          </circle>
        </g>
      );

    /* ===== 爬行无人机 ===== */
    case "crawler":
      return (
        <g>
          {/* 腿 */}
          <path d="M17.6 21.4l-6-4.4-3.6 1.6M17.6 26.6l-6.6 1.4-2.6 4.4M17.6 24l-7.4-.6M30.4 21.4l6-4.4 3.6 1.6M30.4 26.6l6.6 1.4 2.6 4.4M30.4 24l7.4-.6" {...L} strokeWidth={1.3} />
          {/* 机体 */}
          <path d="M24 13.6c4.6 0 7.6 4.2 7.6 10.4S28.6 35.4 24 35.4 16.4 30.2 16.4 24 19.4 13.6 24 13.6z" {...hollow} />
          <path d="M18.6 20.6h10.8M18.4 28h11.2" {...thin} />
          {/* 主传感器 */}
          <circle cx="24" cy="23.8" r="3.4" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <Led cx={24} cy={23.8} r={1.7} dur="1.8s" />
          {/* 天线 */}
          <path d="M21.4 13.8l-1.4-4M26.6 13.8l1.4-4" {...thin} />
        </g>
      );

    /* ===== 防毒面具：街头跑者的标配 ===== */
    case "gasmask":
      return (
        <g>
          {/* 兜帽/头部轮廓 */}
          <path d="M11.6 23c0-7.2 5.6-12.6 12.4-12.6S36.4 15.8 36.4 23v4.4c0 6.6-5.6 11.6-12.4 11.6S11.6 34 11.6 27.4z" {...hollow} />
          {/* 固定带 */}
          <path d="M11.8 21.6h24.4" {...L} strokeWidth={1.3} />
          <path d="M12.6 26.8h4M31.4 26.8h4" {...thin} />
          {/* 双镜片 */}
          <circle cx="19" cy="24.4" r="4.2" fill="#05060a" stroke={color} strokeWidth={1.3} />
          <circle cx="29" cy="24.4" r="4.2" fill="#05060a" stroke={color} strokeWidth={1.3} />
          <Led cx={19} cy={24.4} r={1.7} dur="2.6s" />
          <Led cx={29} cy={24.4} r={1.7} dur="3.3s" />
          <path d="M17.4 22.4a2.6 2.6 0 0 1 2-1.2M27.4 22.4a2.6 2.6 0 0 1 2-1.2" stroke="#e9f3ff" strokeWidth={0.9} opacity={0.55} fill="none" />
          {/* 滤毒罐 */}
          <path d="M20.6 31.4h6.8v3c0 2.4-1.5 4-3.4 4s-3.4-1.6-3.4-4z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          <path d="M21.8 34.2h4.4" {...thin} />
          <path d="M27.4 33.4l4.8 2.2" {...thin} />
        </g>
      );

    /* ===== 仿生人：机械头壳 ===== */
    case "android":
      return (
        <g>
          {/* 颈部活塞 */}
          <path d="M20.6 33.6v4.2M27.4 33.6v4.2" {...L} strokeWidth={1.3} />
          <path d="M14.6 42.4c0-3 4.2-5 9.4-5s9.4 2 9.4 5z" fill="#05060a" stroke={color} strokeWidth={1.2} />
          {/* 头壳 */}
          <rect x="12.4" y="11.4" width="23.2" height="22.4" rx="5" {...hollow} />
          {/* 面板分缝 */}
          <path d="M12.6 17.6h22.8" {...thin} />
          <path d="M18.4 11.6v5.8M29.6 11.6v5.8" {...thin} />
          {/* 光学带 */}
          <path d="M15.6 23.4h16.8" stroke={color} strokeWidth={4.2} opacity={0.18} />
          <rect x="15.6" y="21.6" width="16.8" height="3.8" rx="1.9" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <Led cx={20} cy={23.5} r={1.3} dur="2.2s" />
          <Led cx={28} cy={23.5} r={1.3} dur="2.9s" />
          {/* 散热格栅 */}
          <path d="M18.6 29h10.8M20 31.2h8" {...thin} />
          {/* 侧耳模块与天线 */}
          <rect x="9.2" y="21.4" width="3.2" height="6" rx="1" {...hollow} strokeWidth={1} />
          <rect x="35.6" y="21.4" width="3.2" height="6" rx="1" {...hollow} strokeWidth={1} />
          <path d="M31.6 11.6l3-4.4" {...thin} />
          <Led cx={35} cy={6.4} r={1.4} dur="1.9s" />
        </g>
      );

    /* ===== 莫霍克：街头黑客 ===== */
    case "mohawk":
      return (
        <g>
          {/* 肩 */}
          <path d="M9.4 43c0-5.6 4.6-9 9.8-10h9.6c5.2 1 9.8 4.4 9.8 10z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 头 */}
          <path d="M15 22.6c0-5.6 4-9.6 9-9.6s9 4 9 9.6v4c0 5.6-4 9.8-9 9.8s-9-4.2-9-9.8z" {...hollow} />
          {/* 莫霍克发型 */}
          <path d="M19.6 13.2l1-6.2 1.6 5.4 1.8-6.8 1.8 6.8 1.6-5.4 1 6.2" {...L} strokeWidth={1.4} />
          {/* 剃边纹路 */}
          <path d="M16.4 17.8c1.6-1.2 3-1.8 4.4-2M31.6 17.8c-1.6-1.2-3-1.8-4.4-2" {...thin} />
          {/* 左眼 + 右侧义眼 */}
          <path d="M18 23.6c1.4-1 3-1 4.2 0" {...L} strokeWidth={1.2} />
          <circle cx="28.4" cy="23.4" r="3.4" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <Led cx={28.4} cy={23.4} r={1.5} dur="2.4s" />
          <path d="M31.8 23.4h3.4" {...thin} />
          {/* 颞部端口 */}
          <rect x="32.4" y="19.2" width="3.4" height="2.6" rx="0.5" {...hollow} strokeWidth={1} />
          {/* 嘴与颈纹 */}
          <path d="M21 30.4c1.8 1.2 4.2 1.2 6 0" {...L} strokeWidth={1.2} />
          <path d="M20.4 35.4l-1 3M27.6 35.4l1 3" {...thin} />
        </g>
      );

    /* ===== 街头医生：口罩 + 额镜 ===== */
    case "medic":
      return (
        <g>
          <path d="M9.6 43c0-5.8 4.6-9.4 10-10.4h8.8c5.4 1 10 4.6 10 10.4z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 头巾 */}
          <path d="M13.8 21.8c0-6 4.6-10.4 10.2-10.4s10.2 4.4 10.2 10.4" fill="#05060a" stroke={color} strokeWidth={1.4} />
          <path d="M13.4 19.2h21.2" {...L} strokeWidth={1.3} />
          {/* 额镜 */}
          <circle cx="24" cy="15.2" r="3" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <Led cx={24} cy={15.2} r={1.3} dur="2.7s" />
          {/* 面部 */}
          <path d="M15.2 21.8h17.6v5.4c0 5-3.9 9-8.8 9s-8.8-4-8.8-9z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          <path d="M19.2 24.6c1.3-.9 2.7-.9 3.8 0M25 24.6c1.1-.9 2.5-.9 3.8 0" {...L} strokeWidth={1.2} />
          {/* 口罩 */}
          <path d="M16.6 27.8h14.8c0 4.6-3.3 8-7.4 8s-7.4-3.4-7.4-8z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          <path d="M18.4 30.4h11.2M19.8 32.8h8.4" {...thin} />
          <path d="M16.6 27.8l-3.8-1.6M31.4 27.8l3.8-1.6" {...thin} />
        </g>
      );

    /* ===== 掮客：方框墨镜 + 束发 ===== */
    case "shades":
      return (
        <g>
          <path d="M9 43c0-5.8 4.6-9.6 10-10.6h10c5.4 1 10 4.8 10 10.6z" fill="#05060a" stroke={color} strokeWidth={1.3} />
          {/* 束起的发髻 */}
          <path d="M33.4 15.6c2.6-.6 4.4 1 4.4 3.2s-1.8 3.6-4 3.2" {...L} strokeWidth={1.3} />
          {/* 头 */}
          <path d="M14.6 22c0-5.6 4.2-9.8 9.4-9.8s9.4 4.2 9.4 9.8v4.4c0 5.6-4.2 9.8-9.4 9.8s-9.4-4.2-9.4-9.8z" {...hollow} />
          {/* 发际 */}
          <path d="M14.8 19.6c3-2.4 15-2.4 18.4 0" {...L} strokeWidth={1.3} />
          {/* 方框墨镜 */}
          <rect x="15.4" y="22" width="7" height="4.6" rx="0.8" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <rect x="25.6" y="22" width="7" height="4.6" rx="0.8" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <path d="M22.4 23.8h3.2M15.4 23.2l-2.6-.8M32.6 23.2l2.6-.8" {...thin} />
          <Led cx={18.9} cy={24.3} r={1} dur="3.1s" />
          <Led cx={29.1} cy={24.3} r={1} dur="2.5s" />
          {/* 嘴与耳机 */}
          <path d="M21.4 31c1.7 1.1 3.5 1.1 5.2 0" {...L} strokeWidth={1.2} />
          <path d="M33.6 26.4c1.6 1.6 1.4 4-.6 5.4" {...thin} />
        </g>
      );

    /* ===== sable：企业级恶意机器人 ===== */
    case "corprobot":
      return (
        <g>
          {/* 肩甲与企业徽记 */}
          <path d="M6.6 43c0-6.6 4.6-10.6 10.4-12l6.9-1.7 7.1 1.7c5.8 1.4 10.4 5.4 10.4 12z" fill="#05060a" stroke={color} strokeWidth={1.4} />
          <path d="M14.8 32.6l-1.4 10.4M33.2 32.6l1.4 10.4" {...thin} />
          <path d="M24 33.6l-2.6 3.6h5.2z" fill="#05060a" stroke={color} strokeWidth={1.1} />
          {/* 颈部液压 */}
          <path d="M21 28.8v3.4M27 28.8v3.4" {...L} strokeWidth={1.3} />
          {/* 头壳：下颌收窄的倒梯形，显得冷酷 */}
          <path d="M13.4 13.8c0-2 1.6-3.6 3.6-3.6h13.9c2 0 3.6 1.6 3.6 3.6v8.4c0 4-2.2 6.6-4.6 8L24 33l-5.9-2.8c-2.4-1.4-4.7-4-4.7-8z" {...hollow} />
          {/* 顶部散热缝 */}
          <path d="M17.6 13.4h12.8" {...thin} />
          {/* 恶意的斜置光学眼 */}
          <path d="M16.2 20.4l6.2-2.2v3.9l-6.2 2z" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <path d="M31.8 20.4l-6.2-2.2v3.9l6.2 2z" fill="#05060a" stroke={color} strokeWidth={1.2} />
          <circle cx="19.3" cy="20.6" r="1.3" fill={color} filter={`url(#g${uid})`}>
            {anim && <animate attributeName="opacity" values="1;0.3;1" dur="2.6s" repeatCount="indefinite" />}
          </circle>
          <circle cx="28.7" cy="20.6" r="1.3" fill={color} filter={`url(#g${uid})`}>
            {anim && <animate attributeName="opacity" values="1;0.3;1" dur="2.6s" begin="0.3s" repeatCount="indefinite" />}
          </circle>
          {/* 发声格栅——像口罩的铁栅 */}
          <path d="M19 25.4h10v3.2H19z" fill="#05060a" stroke={color} strokeWidth={1.1} />
          <path d="M21 25.4v3.2M23 25.4v3.2M25 25.4v3.2M27 25.4v3.2" {...thin} />
          {/* 侧面螺钉与天线 */}
          <circle cx="15.4" cy="17" r="0.8" {...solid} />
          <circle cx="32.6" cy="17" r="0.8" {...solid} />
          <path d="M30.6 10.2l3-4" {...thin} />
          <Led cx={34.2} cy={5.4} r={1.3} dur="1.8s" />
        </g>
      );

    /* ===== 「没有头像」：通用人形剪影 ===== */
    case "plainbust":
      return (
        <g>
          <circle cx="24" cy="17.4" r="7.2" fill={color} stroke="none" opacity={0.85} />
          <path d="M9.4 42c0-8.1 6.5-13.4 14.6-13.4S38.6 33.9 38.6 42z" fill={color} stroke="none" opacity={0.85} />
        </g>
      );

    /* ===== 中继塔 ===== */
    default:
      return (
        <g>
          {/* 塔身桁架 */}
          <path d="M17.6 41.4L21.4 15h5.2l3.8 26.4z" {...hollow} />
          <path d="M19.6 34.6h8.8M20.4 28h7.2M21 21.4h6" {...thin} />
          <path d="M19.6 34.6l8.8-6.6M28.4 34.6l-8.8-6.6M20.4 28l6.6-6.6M27.6 28L21 21.4" {...thin} strokeWidth={0.8} />
          {/* 碟形天线 */}
          <path d="M28.4 17.4c3.6-1 7 1 8 4.4" {...L} strokeWidth={1.3} />
          <circle cx="33.4" cy="19.6" r="1.4" {...solid} />
          {/* 塔顶信标 */}
          <path d="M24 15V9.6" {...L} strokeWidth={1.3} />
          <Led cx={24} cy={8} r={2} dur="1.6s" />
          {/* 电波 */}
          <path d="M14.4 12.2a9.6 9.6 0 0 0 0 10.4" {...thin} />
          <path d="M10.6 9.4a14 14 0 0 0 0 16" {...thin} opacity={0.4} />
          <path d="M19 14.2a5.4 5.4 0 0 0 0 6.2" {...thin} />
        </g>
      );
  }
}

export default function Avatar({
  id,
  size = 34,
  animated = false,
  className,
}: {
  id: string;
  size?: number;
  /** 通话窗口里使用动画版本（骷髅会抖动/闪烁）。 */
  animated?: boolean;
  className?: string;
}) {
  /* 订阅玩家头像：选择变化时立即重绘 */
  const picked = usePlayerAvatar();
  const { kind, color, plain } = id === "OP" ? avatarOf(`OP:${picked}`) : avatarOf(id);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const glitchy = animated && kind === "skull";
  const small = size < 24;

  /* 没有头像的联系人：只画一个灰色剪影，不要边框和 HUD 装饰。 */
  if (plain) {
    return (
      <span
        className={cn("relative flex shrink-0 items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <Glyph kind={kind} color={color} anim={false} uid={uid} />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={cn("relative flex shrink-0 items-center justify-center overflow-hidden border", className)}
      style={{
        width: size,
        height: size,
        borderColor: color,
        background: `radial-gradient(120% 90% at 50% 115%, color-mix(in srgb, ${color} 26%, transparent), #07080c 72%)`,
        boxShadow: animated
          ? `0 0 ${size * 0.35}px color-mix(in srgb, ${color} 30%, transparent), inset 0 0 ${size * 0.3}px color-mix(in srgb, ${color} 12%, transparent)`
          : `inset 0 0 ${size * 0.28}px color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {/* 背景：电路网格 + 扫描线 */}
      <span
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            `linear-gradient(to right, color-mix(in srgb, ${color} 22%, transparent) 1px, transparent 1px),` +
            `linear-gradient(to bottom, color-mix(in srgb, ${color} 22%, transparent) 1px, transparent 1px)`,
          backgroundSize: `${Math.max(5, size / 5)}px ${Math.max(5, size / 5)}px`,
        }}
      />
      <span
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, color-mix(in srgb, ${color} 14%, transparent) 0 1px, transparent 1px 3px)`,
        }}
      />
      {/* HUD 角标：只在够大的时候画 */}
      {!small && (
        <span className="pointer-events-none absolute inset-[2px]">
          {[
            "left-0 top-0 border-l border-t",
            "right-0 top-0 border-r border-t",
            "left-0 bottom-0 border-l border-b",
            "right-0 bottom-0 border-r border-b",
          ].map((pos) => (
            <span key={pos} className={cn("absolute h-[4px] w-[4px]", pos)} style={{ borderColor: color, opacity: 0.85 }} />
          ))}
        </span>
      )}

      {/* 故障副本：红/青错位，只给骷髅 */}
      {glitchy && (
        <>
          <svg viewBox="0 0 48 48" width={size * 0.86} height={size * 0.86} className="anim-glitch-a absolute" aria-hidden>
            <Glyph kind={kind} color="#e0634a" anim={false} uid={`${uid}a`} />
          </svg>
          <svg viewBox="0 0 48 48" width={size * 0.86} height={size * 0.86} className="anim-glitch-b absolute" aria-hidden>
            <Glyph kind={kind} color="#6db3d2" anim={false} uid={`${uid}b`} />
          </svg>
        </>
      )}

      <svg
        viewBox="0 0 48 48"
        width={size * 0.86}
        height={size * 0.86}
        className={cn("relative", animated && kind === "silhouette" && "anim-breathe")}
        aria-hidden
      >
        <defs>
          <filter id={`g${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <Glyph kind={kind} color={color} anim={animated} uid={uid} />
      </svg>

      {/* 故障扫描条 */}
      {glitchy && (
        <span
          className="anim-glitch-bar pointer-events-none absolute left-0 right-0 h-[3px]"
          style={{ background: `color-mix(in srgb, ${color} 55%, transparent)` }}
        />
      )}
      {/* 通话中：缓慢下扫的高光，让头像显得“在线” */}
      {animated && !glitchy && (
        <span
          className="net-sweep pointer-events-none absolute left-0 right-0 h-[2px]"
          style={{ background: `color-mix(in srgb, ${color} 42%, transparent)` }}
        />
      )}
    </span>
  );
}
