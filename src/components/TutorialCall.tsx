import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Grid2x2, PhoneCall, PhoneOff, Skull } from "lucide-react";
import { cn } from "../utils/cn";
import { useT } from "../i18n";
import { CALLER, useTut } from "../game/tutorial";
import RichText from "./RichText";

/* 图层层级：通话窗口始终位于最上方。 */
const Z_CALL = 110;
const Z_RING = 112;

/* 打字机效果逐字显示文本，点击可立即完成。 */

function Typed({ text, onDone }: { text: string; onDone: () => void }) {
  const [shown, setShown] = useState(0);
  const done = shown >= text.length;
  const doneRef = useRef(false);

  useEffect(() => {
    setShown(0);
    doneRef.current = false;
  }, [text]);

  useEffect(() => {
    if (done) {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
      return;
    }
    const h = setTimeout(() => setShown((n) => n + 1), 18);
    return () => clearTimeout(h);
  }, [shown, done, text, onDone]);

  return (
    <span>
      <RichText text={text.slice(0, shown)} />
      {!done && <span className="ml-[1px] inline-block h-[10px] w-[5px] translate-y-[1px] animate-blink bg-phosdim" />}
    </span>
  );
}

function Portrait({ size = 34, avatar = "skull" }: { size?: number; avatar?: "skull" | "cage" }) {
  const cage = avatar === "cage";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center border",
        cage ? "border-viole bg-viole/10" : "border-amberdim bg-amber/10"
      )}
      style={{ width: size, height: size }}
    >
      {cage
        ? <Grid2x2 size={size * 0.56} className="text-viole" />
        : <Skull size={size * 0.56} className="text-amber" />}
    </span>
  );
}

export default function TutorialCall() {
  const { t, lang } = useT();
  const { phase, step, answer, next, choose, call, callNext, callAnswer, callRinging, aside } = useTut();
  const [typed, setTyped] = useState(false);
  const [skip, setSkip] = useState(false);
  const [folded, setFolded] = useState(false);

  useEffect(() => {
    setTyped(false);
    setSkip(false);
    setFolded(false); // 出现新台词时自动展开面板
  }, [step?.id]);

  /* 剧情通话。 */
  if (call) {
    const line = lang === "ru" ? call.script.lines[call.idx].ru : call.script.lines[call.idx].en;
    const last = call.idx + 1 >= call.script.lines.length;

    if (callRinging) {
      return (
        <div className="fixed inset-0 z-[112] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-[2px]">
          <div className="anim-call-glow anim-msgin w-[min(320px,94%)] border border-viole bg-panel">
            <div className="flex h-[24px] items-center gap-2 border-b border-line2 bg-header px-2.5">
              <span className="h-[6px] w-[6px] animate-softpulse bg-viole" />
              <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-viole">
                {t("tut.incoming")}
              </span>
            </div>
            <div className="flex flex-col items-center px-4 py-5">
              <span className="anim-ring-shake text-viole"><PhoneCall size={34} strokeWidth={1.6} /></span>
              <div className="mt-3 flex items-center gap-2">
                <Portrait size={30} avatar={call.script.avatar} />
                <span className="pixel text-[24px] leading-none text-fog">{call.script.nick}</span>
              </div>
              <div className="mt-1 text-[8px] uppercase tracking-[0.24em] text-faint">{t("tut.unlisted")}</div>
              <button
                onClick={callAnswer}
                className="mt-4 flex w-full items-center justify-center gap-2 border border-viole bg-viole/15 py-[9px] text-[10px] font-bold uppercase tracking-[0.2em] text-viole transition-all hover:bg-viole hover:text-ink"
              >
                <PhoneCall size={12} /> {t("tut.answer")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-[110] flex justify-center px-2">
        <div
          className="anim-msgin pointer-events-auto w-[min(620px,100%)] border-2 border-viole bg-panel shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(143,134,184,0.2)]"
          onClick={() => setSkip(true)}
        >
          <div className="flex h-[22px] items-center gap-2 border-b border-line2 bg-header px-2">
            <span className="h-[5px] w-[5px] animate-softpulse bg-viole" />
            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-viole">{call.script.nick}</span>
            <span className="text-[7.5px] uppercase tracking-[0.18em] text-faint">· {t("tut.live")}</span>
            <span className="ml-auto text-[7.5px] tabular-nums text-faint">
              {call.idx + 1}/{call.script.lines.length}
            </span>
          </div>
          <div className="flex gap-2.5 px-2.5 py-2.5">
            <Portrait avatar={call.script.avatar} />
            <div className="min-w-0 flex-1">
              <p className="min-h-[32px] text-[13px] leading-snug text-fog/95">
                {skip ? line : <Typed key={call.idx} text={line} onDone={() => setTyped(true)} />}
              </p>
              {(skip || typed) && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSkip(false); setTyped(false); callNext(); }}
                  className={cn(
                    "mt-1.5 border px-3 py-[5px] text-[8.5px] font-bold uppercase tracking-[0.16em] transition-colors",
                    last
                      ? "border-viole bg-viole/15 text-viole hover:bg-viole hover:text-ink"
                      : "border-line3 text-dim hover:bg-panel2 hover:text-fog"
                  )}
                >
                  {last ? t("tut.end") : t("tut.next")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* 来电界面。 */
  if (phase === "ringing") {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-ink/85 p-4 backdrop-blur-[2px]"
        style={{ zIndex: Z_RING }}
      >
        <div className="anim-call-glow anim-msgin w-[min(320px,94%)] border border-amberdim bg-panel">
          <div className="flex h-[24px] items-center gap-2 border-b border-line2 bg-header px-2.5">
            <span className="h-[6px] w-[6px] animate-softpulse bg-amber" />
            <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-amber">
              {t("tut.incoming")}
            </span>
          </div>

          <div className="flex flex-col items-center px-4 py-5">
            <span className="anim-ring-shake text-amber">
              <PhoneCall size={34} strokeWidth={1.6} />
            </span>
            <div className="mt-3 flex items-center gap-2">
              <Portrait size={30} />
              <span className="pixel text-[24px] leading-none text-phosbrite">{CALLER.nick}</span>
            </div>
            <div className="mt-1 text-[8px] uppercase tracking-[0.24em] text-faint">
              {t("tut.unlisted")}
            </div>

            <button
              onClick={answer}
              className="mt-4 flex w-full items-center justify-center gap-2 border border-phosdim bg-phos/15 py-[9px] text-[10px] font-bold uppercase tracking-[0.2em] text-phosbrite transition-all hover:bg-phos hover:text-ink"
            >
              <PhoneCall size={12} /> {t("tut.answer")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 通话进行中。 */
  if (phase !== "talking" || !step) return null;

  /* 临时插话会暂时替换当前脚本台词。 */
  const line = aside ?? (lang === "ru" ? step.ru : step.en);
  const waiting = !!step.waitFor;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[76px] flex justify-center px-2"
      style={{ zIndex: Z_CALL }}
    >
      <div
        className="anim-msgin pointer-events-auto w-[min(620px,100%)] border-2 border-amberdim bg-panel shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_10px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(207,160,75,0.18)]"
        onClick={() => !folded && setSkip(true)}
      >
        {/* 来电者信息栏。 */}
        <div className="flex h-[22px] items-center gap-2 border-b border-line2 bg-header px-2">
          <span className="h-[5px] w-[5px] animate-softpulse bg-amber" />
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber">
            {CALLER.nick}
          </span>
          <span className="text-[7.5px] uppercase tracking-[0.18em] text-faint">
            · {t("tut.live")}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setFolded((f) => !f); }}
            title={folded ? t("tut.unfold") : t("tut.fold")}
            className="ml-auto flex items-center gap-1 border border-line3 px-1.5 py-[1px] text-[7.5px] font-bold uppercase tracking-[0.12em] text-dim transition-colors hover:border-line3 hover:bg-panel2 hover:text-fog"
          >
            {folded ? <ChevronUp size={8} /> : <ChevronDown size={8} />}
            {folded ? t("tut.unfold") : t("tut.fold")}
          </button>
          {/* 教程进行时不可挂断，由脚本控制会话。 */}
          <span className="flex items-center gap-1 border border-line px-1.5 py-[1px] text-[7.5px] font-bold uppercase tracking-[0.12em] text-faint">
            <PhoneOff size={8} /> {t("tut.locked")}
          </span>
        </div>

        {}
        {folded ? (
          <div className="flex items-center gap-2 px-2.5 py-[5px]">
            <Portrait size={16} />
            <span className="min-w-0 flex-1 truncate text-[9px] text-dim">{line}</span>
            {waiting && <span className="h-[4px] w-[4px] shrink-0 animate-softpulse bg-amber" />}
          </div>
        ) : (
        <div className="flex gap-2.5 px-2.5 py-2.5">
          <Portrait />
          <div className="min-w-0 flex-1">
            <p className="min-h-[32px] text-[13px] leading-snug text-fog/95">
              {skip && !aside ? line : <Typed key={aside ?? step.id} text={line} onDone={() => setTyped(true)} />}
            </p>

            {/* 是／否分支。 */}
            {step.choice && (skip || typed) && (
              <div className="mt-2 flex gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); choose(true); }}
                  className="flex-1 border border-phosdim bg-phos/10 py-[6px] text-[9px] font-bold uppercase tracking-[0.16em] text-phosbrite transition-colors hover:bg-phos hover:text-ink"
                >
                  {t("co.yes")}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); choose(false); }}
                  className="flex-1 border border-line3 py-[6px] text-[9px] font-bold uppercase tracking-[0.16em] text-dim transition-colors hover:bg-panel2 hover:text-fog"
                >
                  {t("co.no")}
                </button>
              </div>
            )}

            {/* 继续或等待状态。 */}
            {!step.choice && (skip || typed) && (
              waiting ? (
                <div className="mt-1.5 flex items-center gap-1.5 text-[8px] uppercase tracking-[0.18em] text-amber">
                  <span className="h-[4px] w-[4px] animate-softpulse bg-amber" />
                  {t("tut.waiting")}
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className={cn(
                    "mt-1.5 border border-line3 px-3 py-[5px] text-[8.5px] font-bold uppercase tracking-[0.16em] transition-colors",
                    step.final
                      ? "border-phosdim bg-phos/10 text-phosbrite hover:bg-phos hover:text-ink"
                      : "text-dim hover:bg-panel2 hover:text-fog"
                  )}
                >
                  {step.final ? t("tut.end") : t("tut.next")}
                </button>
              )
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
