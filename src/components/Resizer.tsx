import { cn } from "../utils/cn";

/**
 * Vertical drag handle between two columns.
 * Drag to resize · double-click to restore the default width.
 */
export default function Resizer({
  side,
  active,
  onDrag,
  onReset,
  onNudge,
  className,
}: {
  side: "left" | "right";
  active: boolean;
  onDrag: (side: "left" | "right", e: React.PointerEvent) => void;
  onReset: (side: "left" | "right") => void;
  onNudge: (side: "left" | "right", dir: -1 | 1) => void;
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={(e) => onDrag(side, e)}
      onDoubleClick={() => onReset(side)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") { e.preventDefault(); onNudge(side, -1); }
        if (e.key === "ArrowRight") { e.preventDefault(); onNudge(side, 1); }
        if (e.key === "Home") { e.preventDefault(); onReset(side); }
      }}
      title="drag to resize · double-click to reset"
      className={cn(
        "group relative hidden w-[7px] shrink-0 cursor-col-resize touch-none select-none lg:block",
        className
      )}
    >
      {/* hit area is the full 7px; the rail is the thin visible line */}
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
          active ? "bg-phos" : "bg-line group-hover:bg-line3 group-focus:bg-phosdim"
        )}
      />
      {/* grip dots */}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-[3px] transition-opacity",
          active ? "opacity-100" : "opacity-40 group-hover:opacity-90"
        )}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="block h-[3px] w-[3px]"
            style={{ background: active ? "#b3d98d" : "#4d5940" }}
          />
        ))}
      </span>
      {/* live width glow while dragging */}
      {active && (
        <span className="pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-phos/25" />
      )}
    </div>
  );
}
