import { useCallback, useEffect, useRef, useState } from "react";

/* ================================================================== */
/* 区域地图的缩放 + 平移。                                    */
/* 滚轮朝光标方向缩放，拖动平移，并且视图受到限制，   */
/* 因此棋盘永远不会被拖出屏幕。                        */
/* ================================================================== */

export const ZOOM = { min: 1, max: 3.2, step: 1.18 };

export interface MapView {
  scale: number;
  x: number;
  y: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function useMapView(enabled = true) {
  const [view, setView] = useState<MapView>({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  /** 指针实际移动期间设置：用于吞掉点击 */
  const movedRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  /** 应用变换的元素（其未变换的盒子） */
  const frameRef = useRef<HTMLDivElement>(null);

  /** 在任意缩放级别下保持棋盘位于框内 */
  const clampOffset = useCallback((v: MapView): MapView => {
    const el = frameRef.current;
    if (!el) return v;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxX = (w * (v.scale - 1)) / 2;
    const maxY = (h * (v.scale - 1)) / 2;
    return { ...v, x: clamp(v.x, -maxX, maxX), y: clamp(v.y, -maxY, maxY) };
  }, []);

  const reset = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);

  /** 按步长缩放，保持框中心不变（用于 +/- 按钮） */
  const zoomBy = useCallback(
    (factor: number) => {
      setView((v) => {
        const scale = clamp(v.scale * factor, ZOOM.min, ZOOM.max);
        const k = scale / v.scale;
        return clampOffset({ scale, x: v.x * k, y: v.y * k });
      });
    },
    [clampOffset]
  );

  /* ---- 以光标为锚点的滚轮缩放 ---- */
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !enabled) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      /* 光标相对于框中心的位置 */
      const cx = e.clientX - (r.left + r.width / 2);
      const cy = e.clientY - (r.top + r.height / 2);

      setView((v) => {
        const factor = e.deltaY < 0 ? ZOOM.step : 1 / ZOOM.step;
        const scale = clamp(v.scale * factor, ZOOM.min, ZOOM.max);
        if (scale === v.scale) return v;
        const k = scale / v.scale;
        /* 保持光标下方的点固定 */
        return clampOffset({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, clampOffset]);

  /* ---- 拖动平移 ---- */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (e.button !== 0 && e.button !== 1) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const base = viewRef.current;
      movedRef.current = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!movedRef.current && Math.hypot(dx, dy) > 4) {
          movedRef.current = true;
          setDragging(true);
        }
        if (movedRef.current) setView(clampOffset({ ...base, x: base.x + dx, y: base.y + dy }));
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        /* 先让点击处理程序运行，再清除保护标志 */
        setTimeout(() => (movedRef.current = false), 0);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [enabled, clampOffset]
  );

  /** 当手势是平移时为 true：调用方用它来忽略点击 */
  const consumedDrag = useCallback(() => movedRef.current, []);

  /* 如果在放大状态下调整了框的大小，则重新限制范围 */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setView((v) => clampOffset(v)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampOffset]);

  return { frameRef, view, dragging, onPointerDown, zoomBy, reset, consumedDrag };
}
