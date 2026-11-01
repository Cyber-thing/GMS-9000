import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../utils/cn";
import { StatusDot } from "./chrome";

export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onConfirm, onCancel]);

  const accent = danger ? "#c25b46" : "#cfa04b";

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-[1px]"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-msgin w-[min(380px,94%)] border bg-panel shadow-[0_0_60px_rgba(0,0,0,0.6)]"
        style={{ borderColor: `${accent}77` }}
      >
        <div className="flex h-[30px] items-center gap-2 border-b border-line2 bg-header px-2.5">
          <StatusDot color={accent} pulse />
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-dim">{title}</span>
        </div>
        <div className="flex items-start gap-2.5 px-3 py-3">
          <AlertTriangle size={16} className="mt-[1px] shrink-0" style={{ color: accent }} />
          <p className="text-[12.5px] leading-relaxed text-fog/90">{body}</p>
        </div>
        <div className="flex gap-1.5 border-t border-line px-3 pb-3 pt-2">
          <button
            onClick={onConfirm}
            autoFocus
            className={cn(
              "flex-1 border px-3 py-[7px] text-[11.5px] font-bold uppercase tracking-[0.18em] transition-colors",
              danger
                ? "border-oxide bg-oxide/15 text-oxide hover:bg-oxide hover:text-ink"
                : "border-amberdim bg-amber/10 text-amber hover:bg-amber hover:text-ink"
            )}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-line3 px-3 py-[7px] text-[11.5px] font-bold uppercase tracking-[0.18em] text-dim transition-colors hover:bg-panel2 hover:text-fog"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
