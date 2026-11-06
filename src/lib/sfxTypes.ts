/* 两套音效引擎共用的契约。
   事件名保持不变——游戏里任何调用点都不用改。 */

export type SfxName =
  | "click" | "tick" | "toggle" | "back" | "deny" | "hover"
  | "type" | "ring" | "answer" | "hangup"
  | "message" | "notify" | "codex"
  | "hackStart" | "hackOk" | "hackFail"
  | "scan" | "found" | "download" | "money"
  | "boot" | "login" | "logout" | "alarm" | "place" | "pop"
  /* 不同区块的点击音 */
  | "uiSys" | "uiMap" | "uiNode" | "uiChat" | "uiGame" | "uiTrade" | "uiDanger";

export interface SfxEngine {
  /** 触发一个音效。 */
  play(name: SfxName): void;
  /** 立刻掐断正在发声的一切，不留悬挂的振荡器。 */
  stopAll(): void;
  /** 断开并释放这套引擎占用的节点。 */
  dispose(): void;
}

/** 音效模式：
    ym  —— YM2612 风格的工业声卡（默认）
    new —— 上一版双算子 FM
    old —— 最初的 8-bit
    off —— 全关 */
export type SfxMode = "ym" | "new" | "old" | "off";

export const SFX_MODES: SfxMode[] = ["ym", "new", "old", "off"];

/** 各引擎的响度微调：让三档听起来一样响，而不是换档就变大小声。
    数值由离线渲染实测 RMS 后反推（见 README 注释）。 */
export const SFX_TRIM: Record<Exclude<SfxMode, "off">, number> = {
  /* 以 ym 为基准，离线渲染全部 33 个事件后按平均 RMS 反推：
     ym 0.188 / new 0.230 / old 0.021 → 三档听感对齐。 */
  ym: 1,
  new: 0.82,
  old: 9.0,
};
