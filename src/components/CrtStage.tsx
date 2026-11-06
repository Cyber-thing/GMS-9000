import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, DoubleSide, ExtrudeGeometry,
  Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera,
  PlaneGeometry, PointLight, Scene, Shape, WebGLRenderer,
} from "three";

/* ============================================================
   CRT STAGE —— 把界面装进一支真正的显像管
   ------------------------------------------------------------
   这里没有任何「摇晃」：显示器稳稳待在桌上。
   会动的只有两件事：

   1. 相机推拉 —— 开关 3D 时相机真的沿 Z 轴走近 / 退远，
      于是透视关系随之改变，而不是简单地把画面放大；
   2. 画面本身是鼓的 —— 管面中心朝观众凸出来，
      用 feDisplacementMap 做桶形放大，中间胀、四周收。

   因为机器不转，DOM 只需要一个 scale 就能对齐 3D 开口，
   连 CSS perspective 都省了，渲染也只在推拉时才发生。
   ============================================================ */

const FOV = 32;
const BEZEL_PX = 34;        // 边框宽度（像素）
const RADIUS_PX = 54;       // 管面圆角半径（像素）
const BULGE = 0.048;        // 鼓起强度：按短边的比例取位移上限
const ANIM_MS = 900;        // 推拉时长
const CAM_FAR = 10;         // 显示器在桌上时的相机距离
/* p=0 时相机再往前压一点，贴到管面上。推拉幅度够大，
   「走近 / 退远」才看得出来，而不像单纯放大一点点。 */
const NEAR_PUSH = 0.84;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/* 推拉缓动：走近干脆，退远时略微过冲一点点再稳住 */
const BACK = 1.06;
const easeOutBack = (t: number) => {
  const u = t - 1;
  return 1 + (BACK + 1) * u * u * u + BACK * u * u;
};
const easeInCubic = (t: number) => t * t * t;

/** 没有硬件加速就别硬上：软件 GL 下整屏合成会慢到没法玩。 */
export function canRender3D(): boolean {
  /* 误判时可以手动强开：localStorage netgrid.depth.force = true */
  try {
    if (localStorage.getItem("netgrid.depth.force") === "true") return true;
  } catch { /* noop */ }
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const name = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "")
      : String(gl.getParameter(gl.RENDERER) ?? "");
    const soft = /swiftshader|llvmpipe|softwarerasterizer|microsoft basic render/i.test(name);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !soft;
  } catch {
    return false;
  }
}

/** 读取当前配色的荧光色，让机器跟着主题走。 */
function phosColor(): Color {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-phos")
    .trim();
  try {
    return new Color(raw || "#8fb56d");
  } catch {
    return new Color("#8fb56d");
  }
}

/**
 * 置换贴图：R=横向位移、G=纵向位移，0.5 表示原地不动。
 * 采样点一律朝圆心收 —— 中心被放大，边缘被压扁，
 * 这正是凸面管子看上去的样子。
 *   位移 = -n * r² * maxPx / 2   （角上 r²=2，恰好收满 maxPx）
 */
function warpMap(maxPx: number): string {
  /* 贴图会被拉伸到整块屏幕，分辨率低了线条会出现台阶。
     这是一张平滑渐变，PNG 压起来很小，用 512 不心疼。 */
  const S = 512;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(S, S);
  const d = img.data;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x / (S - 1)) * 2 - 1;
      const ny = (y / (S - 1)) * 2 - 1;
      const r2 = nx * nx + ny * ny;
      const dx = (-nx * r2 * maxPx) / 2;
      const dy = (-ny * r2 * maxPx) / 2;
      /* scale 取 2*maxPx，于是通道值落在 0.25~0.75，不会被截断 */
      const i = (y * S + x) * 4;
      d[i]     = Math.round((0.5 + dx / (2 * maxPx)) * 255);
      d[i + 1] = Math.round((0.5 + dy / (2 * maxPx)) * 255);
      d[i + 2] = 0;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

export default function CrtStage({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const warpRef = useRef<SVGFEImageElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);

  /* 进度：0 = 相机贴在管面上（看不到机壳），1 = 退到桌前看整台机器 */
  const [live, setLive] = useState(enabled);
  const pRef = useRef(enabled ? 1 : 0);

  useEffect(() => {
    if (enabled) setLive(true);
    const from = pRef.current;
    const to = enabled ? 1 : 0;
    if (from === to) {
      if (!enabled) setLive(false);
      return;
    }
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduced) {
      pRef.current = to;
      if (!enabled) setLive(false);
      return;
    }
    const t0 = performance.now();
    const dur = ANIM_MS * Math.abs(to - from);
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const e = to > from ? easeOutBack(t) : 1 - easeInCubic(1 - t);
      pRef.current = lerp(from, to, e);
      if (t < 1) raf = requestAnimationFrame(step);
      else if (!enabled) setLive(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);

  useEffect(() => {
    if (!live) return;
    const back = backRef.current;
    const screen = screenRef.current;
    const inner = innerRef.current;
    if (!back || !screen || !inner) return;

    const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5);

    const rBack = new WebGLRenderer({ canvas: back, antialias: true, alpha: true });
    rBack.setPixelRatio(Math.min(dpr(), 1));

    const scene = new Scene();
    const rig = new Group();
    scene.add(rig);
    const cam = new PerspectiveCamera(FOV, 1, 0.1, 100);

    const phos = phosColor();

    scene.add(new AmbientLight(0xffffff, 0.5));
    const key = new DirectionalLight(0xffffff, 1.2);
    key.position.set(-4, 5, 7);
    scene.add(key);
    const rim = new DirectionalLight(phos.clone().multiplyScalar(1.4).getHex(), 0.55);
    rim.position.set(5, -3, 3);
    scene.add(rim);
    /* 管面自己发的光，打亮边框内缘 */
    const glow = new PointLight(phos.getHex(), 2.6, 14, 2);
    glow.position.set(0, 0, 1.2);
    scene.add(glow);

    let bezel: Mesh | null = null;
    let shell: Mesh | null = null;
    let panel: Mesh | null = null;
    let room: Mesh | null = null;
    let led: Mesh | null = null;

    const dispose = (m: Mesh | null) => {
      if (!m) return;
      rig.remove(m);
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
    };

    /* ---------- 布局 ---------- */
    let W = 0, H = 0;
    let logicalW = 0, logicalH = 0;
    let openPxH = 0;      // 相机在 CAM_FAR 时，开口在屏幕上的高度
    let camNear = 1;      // 让开口刚好铺满视口的相机距离
    let bulgePx = 0;

    const build = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      if (W < 2 || H < 2) return;

      rBack.setSize(W, H, false);
      cam.aspect = W / H;
      cam.updateProjectionMatrix();

      const tanHalf = Math.tan((FOV * Math.PI) / 360);
      const unitFar = (2 * CAM_FAR * tanHalf) / H;   // 远端 1px 对应多少世界单位

      const m = BEZEL_PX;
      const innerW = W - m * 2;
      const innerH = H - m * 2;
      /* 开口的世界尺寸：远端时正好等于 innerW × innerH 像素 */
      const sw = innerW * unitFar;
      const sh = innerH * unitFar;
      openPxH = innerH;

      /* 开口铺满视口所需的相机距离（视角固定，距离与成像尺寸成反比），
         再往前压 NEAR_PUSH，让贴到脸上那一端更有冲进屏幕的感觉 */
      camNear = CAM_FAR * (innerH / H) * NEAR_PUSH;

      /* 鼓起会吃掉四周一圈，先从可用面积里扣掉再排版，
         这样原本放得下的界面不会被挤出画面。 */
      bulgePx = Math.round(Math.min(innerW, innerH) * BULGE);
      const fit = Math.min((innerW - bulgePx * 2) / W, (innerH - bulgePx * 2) / H);
      logicalW = Math.round(innerW / fit);
      logicalH = Math.round(innerH / fit);

      inner.style.width = `${logicalW}px`;
      inner.style.height = `${logicalH}px`;
      inner.style.boxSizing = "border-box";
      inner.style.padding = `${bulgePx / fit}px`;

      screen.style.left = "50%";
      screen.style.top = "50%";
      screen.style.width = `${logicalW}px`;
      screen.style.height = `${logicalH}px`;
      screen.style.marginLeft = `${-logicalW / 2}px`;
      screen.style.marginTop = `${-logicalH / 2}px`;

      if (glassRef.current) {
        const gs = glassRef.current.style;
        gs.left = "50%"; gs.top = "50%";
        gs.width = `${innerW}px`; gs.height = `${innerH}px`;
        gs.marginLeft = `${-innerW / 2}px`;
        gs.marginTop = `${-innerH / 2}px`;
        gs.borderRadius = `${RADIUS_PX}px`;
      }

      if (warpRef.current) warpRef.current.setAttribute("href", warpMap(bulgePx));

      dispose(bezel); dispose(shell); dispose(panel); dispose(room); dispose(led);

      /* 圆角斜面边框 */
      const ow = sw + m * 2 * unitFar * 1.9;
      const oh = sh + m * 2 * unitFar * 1.9;
      const rOut = RADIUS_PX * unitFar * 1.5;
      const shape = new Shape();
      const rx = ow / 2, ry = oh / 2;
      shape.moveTo(-rx + rOut, -ry);
      shape.lineTo(rx - rOut, -ry); shape.quadraticCurveTo(rx, -ry, rx, -ry + rOut);
      shape.lineTo(rx, ry - rOut);  shape.quadraticCurveTo(rx, ry, rx - rOut, ry);
      shape.lineTo(-rx + rOut, ry); shape.quadraticCurveTo(-rx, ry, -rx, ry - rOut);
      shape.lineTo(-rx, -ry + rOut);shape.quadraticCurveTo(-rx, -ry, -rx + rOut, -ry);

      const hole = new Shape();
      const hx = sw / 2, hy = sh / 2, c = RADIUS_PX * unitFar;
      hole.moveTo(-hx + c, -hy);
      hole.lineTo(hx - c, -hy); hole.quadraticCurveTo(hx, -hy, hx, -hy + c);
      hole.lineTo(hx, hy - c);  hole.quadraticCurveTo(hx, hy, hx - c, hy);
      hole.lineTo(-hx + c, hy); hole.quadraticCurveTo(-hx, hy, -hx, hy - c);
      hole.lineTo(-hx, -hy + c);hole.quadraticCurveTo(-hx, -hy, -hx + c, -hy);
      shape.holes.push(hole);

      bezel = new Mesh(
        new ExtrudeGeometry(shape, {
          depth: 0.5, bevelEnabled: true, bevelThickness: 0.18,
          bevelSize: 0.15, bevelSegments: 4, curveSegments: 10,
        }),
        new MeshStandardMaterial({ color: 0x26282c, roughness: 0.66, metalness: 0.18 })
      );
      bezel.position.z = 0.02;
      rig.add(bezel);

      led = new Mesh(
        new PlaneGeometry(unitFar * 7, unitFar * 7),
        new MeshBasicMaterial({ color: phosColor().getHex() })
      );
      led.position.set(sw / 2 - unitFar * 26, -sh / 2 - unitFar * 19, 0.52);
      rig.add(led);

      /* 机身：往后收的箱体，暗示显像管的深度 */
      shell = new Mesh(
        new BoxGeometry(ow * 0.97, oh * 0.97, 3.4),
        new MeshStandardMaterial({ color: 0x141619, roughness: 0.95, metalness: 0.05 })
      );
      shell.position.z = -1.85;
      rig.add(shell);

      /* 管面底色：DOM 透出来之前的那层辉光 */
      panel = new Mesh(
        new PlaneGeometry(sw, sh),
        new MeshBasicMaterial({ color: phos.clone().multiplyScalar(0.06).getHex() })
      );
      panel.position.z = -0.02;
      rig.add(panel);

      room = new Mesh(
        new PlaneGeometry(ow * 5, oh * 5),
        new MeshStandardMaterial({ color: 0x0a0b0d, roughness: 1, side: DoubleSide })
      );
      room.position.z = -7;
      rig.add(room);
    };

    build();
    const onResize = () => { build(); dirty = true; };
    window.addEventListener("resize", onResize);

    /* ---------- 渲染：只在推拉时才画 ---------- */
    let raf = 0;
    let dirty = true;
    let lastP = -1;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;

      const p = pRef.current;
      if (p !== lastP) { lastP = p; dirty = true; }
      if (!dirty) return;
      dirty = false;

      const pc = Math.max(0, Math.min(1, p));

      /* 相机真的在走：近处看不到机壳，远处整台机器都在 */
      const dist = lerp(camNear, CAM_FAR, p);
      cam.position.z = dist;
      cam.updateProjectionMatrix();

      /* 开口此刻在屏幕上的实际高度 —— DOM 照着它缩放就能严丝合缝 */
      const pxH = openPxH * (CAM_FAR / dist);
      screen.style.transform = `scale(${pxH / logicalH})`;

      /* 鼓起和圆角随进度淡入 */
      dispRef.current?.setAttribute("scale", String(bulgePx * 2 * pc));
      /* 圆角要在缩放之后正好是 RADIUS_PX，所以先除以缩放系数 */
      inner.style.borderRadius = `${(RADIUS_PX / (pxH / logicalH)) * pc}px`;

      if (glassRef.current) {
        const gs = glassRef.current.style;
        gs.opacity = String(pc);
        gs.transform = `scale(${pxH / openPxH})`;
      }
      back.style.opacity = String(Math.min(1, pc * 1.5));

      rBack.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);

    const obs = new MutationObserver(() => {
      const pcol = phosColor();
      glow.color.set(pcol);
      rim.color.set(pcol.clone().multiplyScalar(1.4));
      if (panel) (panel.material as MeshBasicMaterial).color.set(pcol.clone().multiplyScalar(0.06));
      if (led) (led.material as MeshBasicMaterial).color.set(pcol);
      dirty = true;
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-phos"] });

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("resize", onResize);
      dispose(bezel); dispose(shell); dispose(panel); dispose(room); dispose(led);
      rBack.dispose();
      screen.style.cssText = "";
      inner.style.cssText = "";
    };
  }, [live]);

  return (
    <div ref={hostRef} className={live ? "fixed inset-0 overflow-hidden bg-[#070809]" : "contents"}>
      {live && (
        <>
          <canvas ref={backRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          {/* 凸面置换滤镜：中心朝观众鼓出来 */}
          <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
            <defs>
              <filter id="crt-warp" x="-3%" y="-3%" width="106%" height="106%" colorInterpolationFilters="sRGB">
                <feImage ref={warpRef} result="map" preserveAspectRatio="none" x="0" y="0" width="100%" height="100%" />
                <feDisplacementMap
                  ref={dispRef}
                  in="SourceGraphic"
                  in2="map"
                  scale={0}
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>
        </>
      )}

      <div
        ref={screenRef}
        className={live ? "absolute overflow-hidden" : "contents"}
        style={live ? { willChange: "transform" } : undefined}
      >
        <div
          ref={innerRef}
          className={live ? "crt-warp relative overflow-hidden bg-ink" : "contents"}
        >
          {children}
        </div>
      </div>

      {live && <div ref={glassRef} className="crt-glass pointer-events-none absolute z-[210]" />}
    </div>
  );
}
