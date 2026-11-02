import { useCallback, useEffect, useRef, useState } from "react";
import { store } from "../lib/util";

export const COL = {
  leftDefault: 292,
  rightDefault: 372,
  minSide: 210,
  maxSide: 680,
  minMap: 300,
  gap: 8, // 列之间使用 Tailwind 的 gap-2 间距
  handle: 7, // 调整条宽度
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function useColumns() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(() => store.get("col.left", COL.leftDefault));
  const [right, setRight] = useState(() => store.get("col.right", COL.rightDefault));
  const [dragging, setDragging] = useState<null | "left" | "right">(null);

  const leftRef = useRef(left);
  const rightRef = useRef(right);
  leftRef.current = left;
  rightRef.current = right;

  useEffect(() => void store.set("col.left", left), [left]);
  useEffect(() => void store.set("col.right", right), [right]);

  const sideCap = useCallback((other: number) => {
    const total = hostRef.current?.clientWidth ?? window.innerWidth;
    const chrome = COL.gap * 2 + COL.handle * 2;
    return clamp(total - other - COL.minMap - chrome, COL.minSide, COL.maxSide);
  }, []);

  /* 窗口变窄时自动收缩侧栏，优先保证地图的最小宽度。 */
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (window.innerWidth < 1024) return;
      const total = el.clientWidth;
      const chrome = COL.gap * 2 + COL.handle * 2;
      let l = leftRef.current;
      let r = rightRef.current;
      let over = l + r + COL.minMap + chrome - total;
      if (over > 0) {
        
        const takeR = Math.min(over, r - COL.minSide);
        if (takeR > 0) { r -= takeR; over -= takeR; }
        const takeL = Math.min(over, l - COL.minSide);
        if (takeL > 0) { l -= takeL; }
        if (l !== leftRef.current) setLeft(Math.round(l));
        if (r !== rightRef.current) setRight(Math.round(r));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startDrag = useCallback(
    (which: "left" | "right", e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startL = leftRef.current;
      const startR = rightRef.current;
      setDragging(which);

      const prevCursor = document.body.style.cursor;
      const prevSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        if (which === "left") {
          setLeft(Math.round(clamp(startL + dx, COL.minSide, sideCap(startR))));
        } else {
          setRight(Math.round(clamp(startR - dx, COL.minSide, sideCap(startL))));
        }
      };
      const onUp = () => {
        setDragging(null);
        document.body.style.cursor = prevCursor;
        document.body.style.userSelect = prevSelect;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [sideCap]
  );

  const resetCol = useCallback((which: "left" | "right") => {
    if (which === "left") setLeft(COL.leftDefault);
    else setRight(COL.rightDefault);
  }, []);

  const nudge = useCallback(
    (which: "left" | "right", dir: -1 | 1) => {
      const step = 16 * dir;
      if (which === "left") setLeft((v) => Math.round(clamp(v + step, COL.minSide, sideCap(rightRef.current))));
      else setRight((v) => Math.round(clamp(v - step, COL.minSide, sideCap(leftRef.current))));
    },
    [sideCap]
  );

  return { hostRef, left, right, dragging, startDrag, resetCol, nudge };
}
