import { useEffect, useRef } from "react";

/* ---------- 复古模拟噪点 ----------
   胶片颗粒 + 磁带雪花，外加偶发的横向撕裂。
   做法：先烘焙几张小尺寸噪点图块，再用 pattern 平铺到整屏画布上，
   这样既有细颗粒感，又不用每帧生成整屏像素。
   和 CRT 滤镜相互独立，可以单独开关。 */

const TILE = 128;   // 噪点图块边长
const FPS = 12;     // 刻意压低帧率，更像老设备

export default function NoiseOverlay() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    /* 1. 预先烘焙几张噪点图块 */
    const FRAMES = 8;
    const tiles: HTMLCanvasElement[] = [];
    for (let f = 0; f < FRAMES; f++) {
      const tc = document.createElement("canvas");
      tc.width = tc.height = TILE;
      const tx = tc.getContext("2d")!;
      const img = tx.createImageData(TILE, TILE);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random();
        /* 只有少量亮点，其余近乎透明——看着像颗粒而不是灰雾 */
        const lum = v > 0.988 ? 240 : v > 0.94 ? 165 : v > 0.74 ? 90 : 25;
        d[i] = d[i + 1] = d[i + 2] = lum;
        d[i + 3] = v > 0.74 ? 26 + Math.random() * 36 : 7;
      }
      tx.putImageData(img, 0, 0);
      tiles.push(tc);
    }

    let patterns: (CanvasPattern | null)[] = [];
    const rebuildPatterns = () => {
      patterns = tiles.map((tc) => ctx.createPattern(tc, "repeat"));
    };

    /* 2. 画布跟随窗口尺寸（限制 DPR，避免高分屏上白烧性能） */
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.ceil(window.innerWidth * dpr);
      cv.height = Math.ceil(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildPatterns();
    };
    fit();
    window.addEventListener("resize", fit);

    /* 3. 逐帧平铺，并随机位移让颗粒“跳动” */
    let raf = 0;
    let last = 0;
    let idx = 0;
    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      if (ts - last < 1000 / FPS) return;
      last = ts;
      idx = (idx + 1 + Math.floor(Math.random() * 3)) % FRAMES;
      const pat = patterns[idx];
      if (!pat) return;
      const w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(-Math.random() * TILE, -Math.random() * TILE);
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w + TILE, h + TILE);
      ctx.restore();
    };

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      /* 尊重系统设置：只铺一张静态颗粒 */
      const pat = patterns[0];
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, cv.width, cv.height);
      }
    } else {
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    /* 混合模式放在最外层：fixed + z-index 会生成独立的层叠上下文，
       若把 mix-blend-mode 写在子元素上，它只会和空白的父层混合。 */
    <div className="noise-layer pointer-events-none fixed inset-0 z-[200]" aria-hidden>
      {/* 颗粒 */}
      <canvas ref={ref} className="noise-grain absolute inset-0 h-full w-full" />
      {/* 慢慢爬过屏幕的亮带，像磁带接缝 */}
      <div className="noise-band absolute inset-x-0" />
      {/* 偶发的横向撕裂 */}
      <div className="noise-glitch absolute inset-x-0" />
    </div>
  );
}
