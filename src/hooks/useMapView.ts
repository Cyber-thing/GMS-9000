import { useCallback, useEffect, useRef, useState } from "react";

/* ================================================================== */
/* Zoom + pan for the regional map.                                    */
/* Wheel zooms toward the cursor, drag pans, and the view is clamped   */
/* so the board can never be thrown off screen.                        */
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
  /** set while the pointer actually travelled — used to swallow the click */
  const movedRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  /** the element the transform is applied to (its untransformed box) */
  const frameRef = useRef<HTMLDivElement>(null);

  /** keep the board inside the frame at any zoom level */
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

  /** zoom a step, keeping the frame centre (used by the +/- buttons) */
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

  /* ---- wheel zoom anchored at the cursor ---- */
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !enabled) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      /* cursor position relative to the frame centre */
      const cx = e.clientX - (r.left + r.width / 2);
      const cy = e.clientY - (r.top + r.height / 2);

      setView((v) => {
        const factor = e.deltaY < 0 ? ZOOM.step : 1 / ZOOM.step;
        const scale = clamp(v.scale * factor, ZOOM.min, ZOOM.max);
        if (scale === v.scale) return v;
        const k = scale / v.scale;
        /* keep the point under the cursor pinned */
        return clampOffset({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, clampOffset]);

  /* ---- drag to pan ---- */
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
        /* let the click handler run first, then clear the guard */
        setTimeout(() => (movedRef.current = false), 0);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [enabled, clampOffset]
  );

  /** true when the gesture was a pan — callers use it to ignore the click */
  const consumedDrag = useCallback(() => movedRef.current, []);

  /* re-clamp if the frame is resized while zoomed in */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setView((v) => clampOffset(v)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampOffset]);

  return { frameRef, view, dragging, onPointerDown, zoomBy, reset, consumedDrag };
}
