import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bomb, ChevronDown, ChevronLeft, ChevronRight, ChevronsUp, ChevronUp, Crosshair,
  Hand, Pause, Play, Power, Repeat, ShieldAlert, Skull, Unplug, Volume2, VolumeX, Zap,
} from "lucide-react";
import { buildVrLevel } from "../../game/vr/levels";
import { VrEngine } from "../../game/vr/engine";
import { useCoarsePointer } from "../../hooks/useMobile";
import { cn } from "../../utils/cn";
import { setVrLang, vtr } from "../../game/vr/vrText";
import { DOOR_COLORS, INTERNAL_HEIGHT, INTERNAL_WIDTH, WEAPONS } from "../../game/vr/themes";
import type { VrHudSnapshot } from "../../game/vr/types";
import { cycleSfxMode, sfx, sfxMode, sfxSubscribe } from "../../lib/sfx";
import { useT } from "../../i18n";
import VrFinaleMinigame from "./VrFinaleMinigame";

interface Props {
  nodeId: string;
  onWin: (info: { sabotaged: boolean; elapsed: number; kills: number; damageTaken: number }) => void;
  onLose: (info: { failRep: number; reason: "hp" | "overload" }) => void;
  onAbort: () => void;
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

type EngineRef = React.MutableRefObject<VrEngine | null>;
type HoldControl = "left" | "right" | "up" | "down" | "jump" | "shoot";
type TapAction = "dash" | "interact" | "cycle";

/* Сенсорная кнопка-«удержание»: палец держит — кнопка зажата. */
function HoldButton({
  eng,
  control,
  label,
  className,
  children,
}: {
  eng: EngineRef;
  control: HoldControl;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [held, setHeld] = useState(false);
  const release = () => {
    if (!held) return;
    setHeld(false);
    eng.current?.setVirtualControl(control, false);
  };
  return (
    <button
      type="button"
      title={label}
      className={cn(
        "flex touch-none flex-col items-center justify-center gap-[1px] border border-line3 bg-[#0a0f1c] text-dim transition-colors",
        held && "border-phos bg-phos/20 text-phosbrite",
        className
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setHeld(true);
        eng.current?.setVirtualControl(control, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      <span className="text-[6.5px] font-bold uppercase leading-none tracking-[0.14em]">{label}</span>
    </button>
  );
}

/* Сенсорная кнопка-«тAP»: разовое действие (дэш, использование, смена оружия). */
function TapButton({
  eng,
  action,
  label,
  className,
  children,
}: {
  eng: EngineRef;
  action: TapAction;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [flash, setFlash] = useState(false);
  return (
    <button
      type="button"
      title={label}
      className={cn(
        "flex touch-none flex-col items-center justify-center gap-[1px] border border-line3 bg-[#0a0f1c] text-dim transition-colors",
        flash && "border-phos bg-phos/20 text-phosbrite",
        className
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        setFlash(true);
        eng.current?.triggerVirtualAction(action);
        window.setTimeout(() => setFlash(false), 160);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
      <span className="text-[6.5px] font-bold uppercase leading-none tracking-[0.14em]">{label}</span>
    </button>
  );
}

export default function VirtualityBreachModal({
  nodeId,
  onWin,
  onLose,
  onAbort,
}: Props) {
  const { t, lang } = useT();
  /* язык надписей внутри уровня: ставим синхронно, до первого кадра canvas */
  setVrLang(lang);
  const level = useMemo(() => buildVrLevel(nodeId), [nodeId]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VrEngine | null>(null);

  const [hud, setHud] = useState<VrHudSnapshot>(() => ({
    phase: "dive",
    tier: level.tier,
    corpLabel: level.theme.corpLabel,
    realityName: level.theme.realityName,
    finaleKind: level.finaleKind,
    isSabotageBlackout: level.isSabotageBlackout,
    overloadActive: false,
    overloadRemaining: null,
    blackoutActive: false,
    hp: level.tuning.playerMaxHp,
    maxHp: level.tuning.playerMaxHp,
    weapon: "pistol",
    unlockedWeapons: ["pistol"],
    ammo: { pistol: Infinity, shotgun: 0, smg: 0 },
    kills: 0,
    totalEnemies: level.enemies.length,
    propsDestroyed: 0,
    elapsedTime: 0,
    damageTaken: 0,
    checkpointSaved: false,
    doors: level.doors.map((d) => ({
      color: d.color,
      isOpen: false,
      timerRemaining: null,
      timerTotal: d.timedSeconds,
    })),
    promptText: null,
    bannerText: null,
    crtEnabled: true,
    floorNumber: 1,
    diveProgress: 0,
    buildProgress: 0,
  }));

  const [winInfo, setWinInfo] = useState<{
    sabotaged: boolean;
    elapsed: number;
    kills: number;
    damageTaken: number;
  } | null>(null);
  const [loseInfo, setLoseInfo] = useState<{
    failRep: number;
    reason: "hp" | "overload";
  } | null>(null);
  const [audioMode, setAudioMode] = useState(sfxMode);

  useEffect(() => sfxSubscribe(() => setAudioMode(sfxMode())), []);

  useEffect(() => {
    document.body.dataset.vrPhase = hud.phase;
  }, [hud.phase]);

  useEffect(() => {
    return () => {
      delete document.body.dataset.vrPhase;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new VrEngine(canvas, level, {
      onHud: (next) => setHud(next),
      onVictory: (info) => setWinInfo(info),
      onDefeat: (info) => setLoseInfo(info),
    });
    engineRef.current = engine;
    const isTestHarness =
      import.meta.env.DEV && window.location.search.includes("autostart=1");
    if (isTestHarness) {
      (window as unknown as { __vrWarpCore?: () => void }).__vrWarpCore = () =>
        engine.warpToCore();
    }
    return () => {
      if (isTestHarness) {
        delete (window as unknown as { __vrWarpCore?: () => void }).__vrWarpCore;
      }
      engine.destroy();
      engineRef.current = null;
    };
  }, [level]);

  const handleExitWin = () => {
    if (!winInfo) return;
    sfx("click");
    onWin(winInfo);
  };

  const handleExitLose = () => {
    if (!loseInfo) return;
    sfx("click");
    onLose(loseInfo);
  };

  const handleAbort = () => {
    sfx("back");
    onAbort();
  };

  const coarse = useCoarsePointer();
  const activeWeapon = WEAPONS[hud.weapon];
  const ammoLabel = hud.weapon === "pistol" ? "INF" : String(hud.ammo[hud.weapon]);
  const timedDoors = hud.doors.filter((d) => d.timerRemaining !== null && d.timerRemaining > 0);
  const isTransition = hud.phase === "dive" || hud.phase === "materialize";

  return (
    <div
      data-zone="VirtualityBreach"
      className="fixed inset-0 z-[96] flex flex-col bg-[#03050a] text-fog select-none"
    >
      {/* Top Single-Line Telemetry Strip */}
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line2 bg-[#060a14] px-3 text-[10px]">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex items-center gap-1.5 font-bold uppercase tracking-[0.18em]"
            style={{ color: level.theme.primary }}
          >
            <Zap size={12} /> {t("vr.title")}
          </span>
          <span className="text-line3">|</span>
          <span className="font-bold tracking-[0.14em] text-fog">
            {level.nodeCode} · T{hud.tier}
          </span>
          <span className="hidden truncate text-[9px] uppercase tracking-[0.14em] text-dim md:inline">
            {hud.corpLabel} // FL-{hud.floorNumber}
          </span>
        </div>

        <div className="flex items-center gap-3 tabular-nums">
          {/* Integrity / HP */}
          <div className="flex items-center gap-1.5">
            <span className="text-[8.5px] uppercase tracking-[0.14em] text-faint">HP</span>
            <div className="flex gap-[2px]">
              {Array.from({ length: hud.maxHp }).map((_, i) => (
                <span
                  key={i}
                  className="block h-2.5 w-2 border"
                  style={{
                    borderColor: i < hud.hp ? (hud.hp <= 2 ? "#ff2b45" : level.theme.ok) : "#1d2738",
                    background: i < hud.hp ? (hud.hp <= 2 ? "#ff2b45cc" : `${level.theme.ok}cc`) : "transparent",
                  }}
                />
              ))}
            </div>
          </div>

          <span className="text-line3">|</span>

          {/* Weapon */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-[0.12em]" style={{ color: activeWeapon.bulletColor }}>
              {activeWeapon.shortName}
            </span>
            <span className="text-dim">[{ammoLabel}]</span>
          </div>

          <span className="hidden text-line3 sm:inline">|</span>

          {/* ICE & Clock */}
          <div className="hidden items-center gap-2.5 sm:flex">
            <span className="text-dim">
              ICE <strong className="text-fog">{hud.kills}/{hud.totalEnemies}</strong>
            </span>
            <span className="text-dim">{formatClock(hud.elapsedTime)}</span>
          </div>

          {timedDoors.map((d) => (
            <span
              key={d.color}
              className="border px-1.5 py-[1px] font-bold tracking-[0.12em]"
              style={{
                borderColor: DOOR_COLORS[d.color].main,
                color: DOOR_COLORS[d.color].main,
              }}
            >
              {vtr(DOOR_COLORS[d.color].label)} {d.timerRemaining!.toFixed(1)}{lang === "ru" ? "с" : lang === "zh" ? "秒" : "s"}
            </span>
          ))}

          {hud.overloadActive && hud.overloadRemaining !== null && (
            <span className="border border-[#ff2b45] bg-[#ff2b45]/20 px-1.5 py-[1px] font-bold tracking-[0.14em] text-[#ff7a8a]">
              OVERLOAD {hud.overloadRemaining.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => cycleSfxMode()}
            title={t(`sfx.${audioMode}`)}
            className="flex items-center gap-1 border border-line3 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-dim hover:border-phos hover:text-phosbrite"
          >
            {audioMode === "off" ? <VolumeX size={10} /> : <Volume2 size={10} />}
            <span>{audioMode.toUpperCase()}</span>
          </button>

          {(hud.phase === "playing" || hud.phase === "paused") && (
            <button
              type="button"
              onClick={() =>
                hud.phase === "paused" ? engineRef.current?.resume() : engineRef.current?.pause()
              }
              className="flex items-center gap-1 border border-line3 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-dim hover:border-phos hover:text-phosbrite"
            >
              {hud.phase === "paused" ? <Play size={10} /> : <Pause size={10} />}
              <span>{hud.phase === "paused" ? t("vr.resume") : t("vr.pause")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAbort}
            className="flex items-center gap-1 border border-oxide/50 px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-oxide hover:bg-oxide hover:text-ink"
          >
            <Unplug size={10} />
            <span>{t("vr.abort")}</span>
          </button>
        </div>
      </header>

      {/* Main 16:9 Pixel Canvas Stage */}
      <div className="flex min-h-0 flex-1 items-center justify-center bg-[#020308] p-2">
        <div
          className={cn(
            "relative aspect-video border bg-[#03050a] shadow-[0_0_40px_rgba(0,0,0,0.9)]",
            /* На тач-устройствах под сценой живёт панель крестовины — учитываем её высоту */
            coarse ? "w-[min(100%,calc((100dvh-232px)*16/9))]" : "w-[min(100%,calc((100vh-92px)*16/9))]"
          )}
          style={{ borderColor: hud.blackoutActive ? "#ff2b45" : level.theme.primary }}
        >
          <canvas
            ref={canvasRef}
            width={INTERNAL_WIDTH}
            height={INTERNAL_HEIGHT}
            onClick={() => {
              if (isTransition) engineRef.current?.skipTransition();
            }}
            className="block h-full w-full"
            style={{ imageRendering: "pixelated" }}
          />

          {/* Subtle skip prompt during dive/materialize */}
          {isTransition && (
            <button
              type="button"
              onClick={() => engineRef.current?.skipTransition()}
              className="absolute bottom-2.5 right-2.5 border border-line3 bg-[#060a14ee] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-dim hover:border-phos hover:text-phosbrite"
            >
              {t("vr.skip")}
            </button>
          )}

          {/* Embedded Terminal Finale Minigame (routing / hexwall / memdump / CRP-P06 lights breaker) */}
          {hud.phase === "finale" && (
            <VrFinaleMinigame
              nodeCode={level.nodeCode}
              tier={level.tier}
              theme={level.theme}
              finaleKind={level.finaleKind}
              onComplete={({ blackout }) => engineRef.current?.completeFinale({ blackout })}
              onCancel={() => engineRef.current?.cancelFinale()}
            />
          )}

          {/* Dramatic Post-Blackout Confirmation Strip (lets dark scene breathe) */}
          {hud.phase === "blackout" && (
            <div className="pointer-events-none absolute inset-x-4 bottom-3 flex items-center justify-center">
              <div className="border border-[#ff2b45] bg-[#080306ee] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff7a8a]">
                {t("vr.blackoutDone")}
              </div>
            </div>
          )}

          {/* Paused Overlay */}
          {hud.phase === "paused" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#03050aee] p-4">
              <div
                className="w-full max-w-[340px] border bg-[#070b14] p-5 text-center"
                style={{ borderColor: level.theme.primary }}
              >
                <div
                  className="text-[12px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: level.theme.primary }}
                >
                  {t("vr.paused")}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-dim">
                  {hud.realityName}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => engineRef.current?.resume()}
                    className="flex-1 border border-phos bg-phos/15 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-phosbrite hover:bg-phos hover:text-ink"
                  >
                    {t("vr.resume")}
                  </button>
                  <button
                    type="button"
                    onClick={handleAbort}
                    className="flex-1 border border-oxide/60 bg-oxide/10 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-oxide hover:bg-oxide hover:text-ink"
                  >
                    {t("vr.abort")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Victory Overlay */}
          {hud.phase === "victory" && winInfo && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#03050af2] p-4">
              <div
                className="w-full max-w-[400px] border bg-[#060a14] p-5"
                style={{ borderColor: winInfo.sabotaged ? "#ffb020" : level.theme.ok }}
              >
                <div className="flex items-center gap-2">
                  {winInfo.sabotaged ? (
                    <Bomb size={16} className="text-[#ffb020]" />
                  ) : (
                    <Power size={16} style={{ color: level.theme.ok }} />
                  )}
                  <span
                    className="pixel text-[20px] leading-none tracking-[0.1em]"
                    style={{ color: winInfo.sabotaged ? "#ffb020" : level.theme.ok }}
                  >
                    {winInfo.sabotaged ? t("vr.victoryBlackout") : t("vr.victoryTitle")}
                  </span>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-dim">
                  {winInfo.sabotaged
                    ? t("vr.victoryBlackoutSub", { code: level.nodeCode })
                    : t("vr.victorySub", { code: level.nodeCode })}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2 border-y border-line2 py-2.5 text-center tabular-nums">
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-faint">{t("vr.statTime")}</div>
                    <div className="mt-0.5 text-[12px] font-bold text-fog">{formatClock(winInfo.elapsed)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-faint">{t("vr.statIce")}</div>
                    <div className="mt-0.5 text-[12px] font-bold text-phosbrite">
                      {winInfo.kills}/{hud.totalEnemies}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase tracking-[0.14em] text-faint">{t("vr.statHits")}</div>
                    <div className="mt-0.5 text-[12px] font-bold text-amber">{winInfo.damageTaken}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExitWin}
                  className="mt-4 flex w-full items-center justify-center gap-2 border border-phos bg-phos/15 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-phosbrite hover:bg-phos hover:text-ink"
                >
                  {t("vr.exitGrid")}
                </button>
              </div>
            </div>
          )}

          {/* Defeat Overlay */}
          {hud.phase === "defeat" && loseInfo && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#060205f2] p-4">
              <div className="w-full max-w-[390px] border border-[#ff2b45] bg-[#0b0408] p-5">
                <div className="flex items-center gap-2 text-[#ff5c73]">
                  {loseInfo.reason === "overload" ? <ShieldAlert size={16} /> : <Skull size={16} />}
                  <span className="pixel text-[20px] leading-none tracking-[0.1em]">
                    {t("vr.defeatTitle")}
                  </span>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-dim">
                  {loseInfo.reason === "overload"
                    ? t("vr.defeatOverload", { n: loseInfo.failRep })
                    : t("vr.defeatSub", { n: loseInfo.failRep })}
                </p>

                <button
                  type="button"
                  onClick={handleExitLose}
                  className="mt-4 flex w-full items-center justify-center gap-2 border border-[#ff2b45] bg-[#ff2b45]/15 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#ff7a8a] hover:bg-[#ff2b45] hover:text-ink"
                >
                  {t("vr.exitGrid")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Touch Controls: крестовина + прыжок/стрельба/дэш под окном геймплея */}
      {coarse && (
        <div
          className={cn(
            "flex shrink-0 touch-none select-none items-center justify-between gap-3 border-t border-line2 bg-[#060a14] px-3 py-1.5",
            hud.phase !== "playing" && "pointer-events-none opacity-40"
          )}
        >
          {/* Крестовина: движение + прицел вверх/вниз */}
          <div className="grid grid-cols-3 grid-rows-3 gap-[4px]">
            <span />
            <HoldButton eng={engineRef} control="up" label="aim" className="h-[34px] w-[34px]">
              <ChevronUp size={15} />
            </HoldButton>
            <span />
            <HoldButton eng={engineRef} control="left" label="" className="h-[34px] w-[34px]">
              <ChevronLeft size={16} />
            </HoldButton>
            <span className="flex h-[34px] w-[34px] items-center justify-center border border-line2/60 text-faint/50">
              <span className="block h-[5px] w-[5px] bg-line3" />
            </span>
            <HoldButton eng={engineRef} control="right" label="" className="h-[34px] w-[34px]">
              <ChevronRight size={16} />
            </HoldButton>
            <span />
            <HoldButton eng={engineRef} control="down" label="aim" className="h-[34px] w-[34px]">
              <ChevronDown size={15} />
            </HoldButton>
            <span />
          </div>

          {/* Действия: USE/WPN слева маленькие, DASH/JUMP/FIRE крупные */}
          <div className="flex items-end gap-1.5">
            <div className="mb-[2px] flex flex-col gap-1.5">
              <TapButton eng={engineRef} action="interact" label="use" className="h-[28px] w-[38px]">
                <Hand size={12} />
              </TapButton>
              <TapButton eng={engineRef} action="cycle" label="wpn" className="h-[28px] w-[38px]">
                <Repeat size={12} />
              </TapButton>
            </div>
            <TapButton eng={engineRef} action="dash" label="dash" className="h-[44px] w-[44px]">
              <Zap size={16} />
            </TapButton>
            <HoldButton eng={engineRef} control="jump" label="jump" className="h-[52px] w-[52px]">
              <ChevronsUp size={18} />
            </HoldButton>
            <HoldButton
              eng={engineRef}
              control="shoot"
              label="fire"
              className="h-[58px] w-[58px] border-oxide/60 bg-oxide/10 text-oxide"
            >
              <Crosshair size={20} />
            </HoldButton>
          </div>
        </div>
      )}

      {/* Bottom Controls Strip */}
      <footer className="flex h-8 shrink-0 items-center justify-between gap-2 border-t border-line2 bg-[#060a14] px-3 text-[9px] text-dim">
        <span className={cn("truncate uppercase tracking-[0.12em]", coarse && "hidden sm:inline")}>
          {t("vr.controlsHint")}
        </span>
        <div className="hidden items-center gap-1 md:flex">
          <button
            type="button"
            onPointerDown={() => engineRef.current?.setVirtualControl("left", true)}
            onPointerUp={() => engineRef.current?.setVirtualControl("left", false)}
            onPointerLeave={() => engineRef.current?.setVirtualControl("left", false)}
            className="border border-line3 px-2 py-0.5 text-[8.5px] hover:border-phos"
          >
            ←
          </button>
          <button
            type="button"
            onPointerDown={() => engineRef.current?.setVirtualControl("right", true)}
            onPointerUp={() => engineRef.current?.setVirtualControl("right", false)}
            onPointerLeave={() => engineRef.current?.setVirtualControl("right", false)}
            className="border border-line3 px-2 py-0.5 text-[8.5px] hover:border-phos"
          >
            →
          </button>
          <button
            type="button"
            onPointerDown={() => engineRef.current?.setVirtualControl("jump", true)}
            onPointerUp={() => engineRef.current?.setVirtualControl("jump", false)}
            onPointerLeave={() => engineRef.current?.setVirtualControl("jump", false)}
            className="border border-line3 px-2 py-0.5 text-[8.5px] hover:border-phos"
          >
            JUMP
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.triggerVirtualAction("dash")}
            className="border border-line3 px-2 py-0.5 text-[8.5px] hover:border-phos"
          >
            DASH
          </button>
          <button
            type="button"
            onPointerDown={() => engineRef.current?.setVirtualControl("shoot", true)}
            onPointerUp={() => engineRef.current?.setVirtualControl("shoot", false)}
            onPointerLeave={() => engineRef.current?.setVirtualControl("shoot", false)}
            className="border border-line3 px-2 py-0.5 text-[8.5px] hover:border-phos"
          >
            FIRE
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.triggerVirtualAction("interact")}
            className="border border-line3 px-2 py-0.5 text-[8.5px] hover:border-phos"
          >
            USE
          </button>
          <button
            type="button"
            onClick={() => engineRef.current?.triggerVirtualAction("cycle")}
            className="border border-line3 px-2 py-0.5 text-[8.5px] hover:border-phos"
          >
            WPN
          </button>
        </div>
      </footer>
    </div>
  );
}
