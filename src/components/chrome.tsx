import { ReactNode } from "react";
import { cn } from "../utils/cn";

/* 状态颜色——唯一数据源 */

export const STATUS_COLOR: Record<string, string> = {
  LOCKED: "var(--color-moss)",
  AVAILABLE: "var(--color-phos)",
  COMPROMISED: "#8f86b8",
  ONLINE: "var(--color-phos)",
  CONNECTED: "var(--color-phosbrite)",
  CONNECTING: "#cfa04b",
  OFFLINE: "var(--color-moss)",
  RESTRICTED: "#cfa04b",
  UNKNOWN: "#7f95a8",
  DEGRADED: "#8f86b8",
  CONTESTED: "#c25b46",
};

export function StatusDot({ color, pulse = false, className }: { color: string; pulse?: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-block h-[6px] w-[6px] shrink-0", pulse && "animate-softpulse", className)}
      style={{ background: color, boxShadow: pulse ? `0 0 6px ${color}` : undefined }}
    />
  );
}

/* 角标——目标框高亮 */

export function Brackets({ color = "var(--color-phos)", size = 7 }: { color?: string; size?: number }) {
  const b = `1px solid ${color}`;
  const s = { width: size, height: size };
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0" style={{ ...s, borderLeft: b, borderTop: b }} />
      <span className="pointer-events-none absolute right-0 top-0" style={{ ...s, borderRight: b, borderTop: b }} />
      <span className="pointer-events-none absolute bottom-0 left-0" style={{ ...s, borderLeft: b, borderBottom: b }} />
      <span className="pointer-events-none absolute bottom-0 right-0" style={{ ...s, borderRight: b, borderBottom: b }} />
    </>
  );
}

/* 面板——控制台的标准窗口外观 */

export function Panel({
  title,
  right,
  children,
  className,
  bodyClassName,
  accent = "var(--color-phos)",
  scroll = false,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  accent?: string;
  scroll?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col border border-line bg-panel shadow-[inset_0_0_0_1px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      <header className="flex h-[26px] shrink-0 select-none items-center gap-2 border-b border-line bg-header px-2">
        <span className="h-[7px] w-[7px] shrink-0" style={{ background: accent, opacity: 0.85 }} />
        <h2 className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-dim">{title}</h2>
        <span className="mx-1 h-px flex-1 bg-line" />
        {right}
      </header>
      <div className={cn("min-h-0 flex-1", scroll && "overflow-y-auto", bodyClassName)}>{children}</div>
    </section>
  );
}

/* 其他小型文本组件 */

export function KV({ k, v, vc }: { k: string; v: ReactNode; vc?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className="shrink-0 text-[9px] uppercase tracking-[0.18em] text-faint">{k}</span>
      <span className="truncate text-right text-[11px]" style={vc ? { color: vc } : undefined}>
        {v}
      </span>
    </div>
  );
}

export function Led({ on = true, color = "var(--color-phos)" }: { on?: boolean; color?: string }) {
  return (
    <span
      className="inline-block h-[5px] w-[5px]"
      style={{
        background: on ? color : "var(--color-line)",
        boxShadow: on ? `0 0 5px ${color}` : "none",
      }}
    />
  );
}
