import { useCallback, useEffect, useRef, useState } from "react";

export const ZOOM = { min: 1, max: 3.2, step: 1.18 };

export interface MapView {
  scale: number;
  x: number;
  y: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* Внутреннее состояние жеста: активные указатели + базы для драга и щипка. */
interface GestureState {
  pointers: Map<number, { x: number; y: number }>;
  dragBase: { x: number; y: number; view: MapView } | null;
  pinchBase: { dist: number; cx: number; cy: number; view: MapView } | null;
  listening: boolean;
}

export function useMapView(enabled = true) {
  const [view, setView] = useState<MapView>({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const movedRef = useRef(false);
  const viewRef = useRef(view);
  viewRef.current = view;

  const frameRef = useRef<HTMLDivElement>(null);

  /** 限制平移距离，确保缩放后的地图始终覆盖可视区域。 */
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

  /** 按指定倍率缩放，并同步调整当前偏移量。 */
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

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !enabled) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();

      const cx = e.clientX - (r.left + r.width / 2);
      const cy = e.clientY - (r.top + r.height / 2);

      setView((v) => {
        const factor = e.deltaY < 0 ? ZOOM.step : 1 / ZOOM.step;
        const scale = clamp(v.scale * factor, ZOOM.min, ZOOM.max);
        if (scale === v.scale) return v;
        const k = scale / v.scale;
        /* 保持鼠标指向的地图位置在缩放前后不发生跳动。 */
        return clampOffset({ scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k });
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, clampOffset]);

  /* ---------- унифицированная обработка драга и щипка ----------
     Один указатель — перетаскивание карты; два — щипок с масштабом
     вокруг середины между пальцами плюс сдвиг самой середины. */
  const gs = useRef<GestureState>({
    pointers: new Map(),
    dragBase: null,
    pinchBase: null,
    listening: false,
  });

  const endGesture = useCallback(() => setDragging(false), []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
      const g = gs.current;
      g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (g.pointers.size === 1) {
        movedRef.current = false;
        g.pinchBase = null;
        g.dragBase = { x: e.clientX, y: e.clientY, view: viewRef.current };
      } else if (g.pointers.size === 2) {
        /* второй палец коснулся — переключаемся в режим щипка */
        const [p1, p2] = [...g.pointers.values()];
        g.dragBase = null;
        g.pinchBase = {
          dist: Math.max(1, Math.hypot(p1.x - p2.x, p1.y - p2.y)),
          cx: (p1.x + p2.x) / 2,
          cy: (p1.y + p2.y) / 2,
          view: viewRef.current,
        };
        /* щипок не должен засчитываться как тап по узлу/сектору */
        movedRef.current = true;
        setDragging(true);
      }

      if (!g.listening) {
        g.listening = true;

        const onMove = (ev: PointerEvent) => {
          const gp = gs.current;
          if (!gp.pointers.has(ev.pointerId)) return;
          gp.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

          if (gp.pinchBase && gp.pointers.size >= 2) {
            const b = gp.pinchBase;
            const [p1, p2] = [...gp.pointers.values()];
            const dist = Math.max(1, Math.hypot(p1.x - p2.x, p1.y - p2.y));
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            const el = frameRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            /* середина щипка относительно центра кадра */
            const scx = b.cx - (r.left + r.width / 2);
            const scy = b.cy - (r.top + r.height / 2);
            const ncx = cx - (r.left + r.width / 2);
            const ncy = cy - (r.top + r.height / 2);
            setView(() => {
              const scale = clamp(b.view.scale * (dist / b.dist), ZOOM.min, ZOOM.max);
              const k = scale / b.view.scale;
              /* точка под серединой пальцев остаётся на месте, сама середина двигает карту */
              return clampOffset({
                scale,
                x: ncx - (scx - b.view.x) * k,
                y: ncy - (scy - b.view.y) * k,
              });
            });
            return;
          }

          if (gp.dragBase && gp.pointers.size === 1) {
            const dx = ev.clientX - gp.dragBase.x;
            const dy = ev.clientY - gp.dragBase.y;
            if (!movedRef.current && Math.hypot(dx, dy) > 4) {
              movedRef.current = true;
              setDragging(true);
            }
            if (movedRef.current) {
              setView(
                clampOffset({
                  ...gp.dragBase.view,
                  x: gp.dragBase.view.x + dx,
                  y: gp.dragBase.view.y + dy,
                })
              );
            }
          }
        };

        const onUp = (ev: PointerEvent) => {
          const gp = gs.current;
          gp.pointers.delete(ev.pointerId);
          if (gp.pointers.size < 2) gp.pinchBase = null;
          if (gp.pointers.size === 1) {
            /* остался один палец: продолжаем драг от его текущей точки без рывка */
            const [rem] = [...gp.pointers.values()];
            gp.dragBase = { x: rem.x, y: rem.y, view: viewRef.current };
          }
          if (gp.pointers.size === 0) {
            gp.dragBase = null;
            gp.pinchBase = null;
            gp.listening = false;
            endGesture();
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            setTimeout(() => (movedRef.current = false), 0);
          }
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
      }
    },
    [enabled, clampOffset, endGesture]
  );

  const consumedDrag = useCallback(() => movedRef.current, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setView((v) => clampOffset(v)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [clampOffset]);

  return { frameRef, view, dragging, onPointerDown, zoomBy, reset, consumedDrag };
}
