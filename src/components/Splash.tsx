import { useEffect, useState } from "react";
import { useT } from "../i18n";

/* 使用方框绘图字符构建块状 GNS-9000 标志。 */
const ASCII = String.raw`
  ██████╗ ███╗   ██╗███████╗       █████╗  ██████╗  ██████╗  ██████╗ 
 ██╔════╝ ████╗  ██║██╔════╝      ██╔══██╗██╔═████╗██╔═████╗██╔═████╗
 ██║  ███╗██╔██╗ ██║███████╗ ███╗ ╚██████║██║██╔██║██║██╔██║██║██╔██║
 ██║   ██║██║╚██╗██║╚════██║ ╚══╝  ╚═══██║████╔╝██║████╔╝██║████╔╝██║
 ╚██████╔╝██║ ╚████║███████║       █████╔╝╚██████╔╝╚██████╔╝╚██████╔╝
  ╚═════╝ ╚═╝  ╚═══╝╚══════╝       ╚════╝  ╚═════╝  ╚═════╝  ╚═════╝ 
`.replace(/^\n/, "");

export default function Splash({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [stage, setStage] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hs = [
      setTimeout(() => setStage(1), 420),
      setTimeout(() => setStage(2), 1150),
      setTimeout(() => setStage(3), 2050),
      setTimeout(() => setStage(4), 2750),
    ];
    return () => hs.forEach(clearTimeout);
  }, []);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, 260);
  };

  /* 标志显示完成后，按任意键或点击即可继续。 */
  useEffect(() => {
    if (stage < 3) return;
    const k = () => leave();
    window.addEventListener("keydown", k);
    window.addEventListener("mousedown", k);
    const auto = setTimeout(leave, 7000);
    return () => {
      window.removeEventListener("keydown", k);
      window.removeEventListener("mousedown", k);
      clearTimeout(auto);
    };
  }, [stage, leaving]);

  return (
    <div
      className={cnx(
        "flex h-screen w-screen cursor-pointer select-none items-center justify-center overflow-hidden bg-ink px-3 transition-opacity duration-250",
        leaving && "opacity-0"
      )}
      onClick={leave}
    >
      {/* 淡色背景网格。 */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
        }}
      />

      <div className="relative w-full max-w-[760px] text-center">
        {/* 出品信息 */}
        <div
          className={cnx(
            "text-[11px] uppercase tracking-[0.42em] text-amber transition-all duration-500 sm:text-[13px]",
            stage >= 1 ? "opacity-100" : "translate-y-1 opacity-0"
          )}
          style={{ textShadow: "0 0 12px rgba(207,160,75,0.35)" }}
        >
          {t("sp.presents")}
        </div>

        {/* ASCII 标志 */}
        <pre
          aria-label="GNS-9000"
          className={cnx(
            "mx-auto mt-5 overflow-x-auto whitespace-pre text-phosbrite transition-all duration-700",
            "text-[5px] leading-[1.05] xs:text-[6px] sm:text-[9px] md:text-[11px]",
            stage >= 2 ? "scale-100 opacity-100" : "scale-[0.97] opacity-0"
          )}
          style={{ textShadow: "0 0 14px rgb(var(--phosrgb) / 0.4)", fontFamily: "var(--font-mono)" }}
        >
          {ASCII}
        </pre>

        {/* 分隔线和副标题 */}
        <div
          className={cnx(
            "mx-auto mt-4 flex max-w-[520px] items-center gap-2 transition-opacity duration-500",
            stage >= 3 ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="h-px flex-1 bg-line2" />
          <span className="h-[5px] w-[5px] bg-phosdim" />
          <span className="h-px flex-1 bg-line2" />
        </div>
        <p
          className={cnx(
            "mt-3 text-[9px] uppercase leading-relaxed tracking-[0.26em] text-dim transition-opacity duration-500 sm:text-[10px]",
            stage >= 3 ? "opacity-100" : "opacity-0"
          )}
        >
          {t("sp.tag")}
        </p>

        {/* 提示 */}
        <p
          className={cnx(
            "mt-8 text-[9px] uppercase tracking-[0.3em] text-faint transition-opacity duration-500",
            stage >= 4 ? "opacity-100" : "opacity-0"
          )}
        >
          {t("sp.enter")}
          <span className="ml-1.5 inline-block h-[9px] w-[6px] translate-y-[1px] animate-blink bg-phosdim" />
        </p>
      </div>
    </div>
  );
}

/* 本地小型类名辅助函数，避免为该页面引入额外依赖。 */
function cnx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
