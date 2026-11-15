import { useEffect, useMemo, useState } from "react";
import { Bomb, Cpu, PowerOff, RotateCw, ShieldAlert, Zap } from "lucide-react";
import { cn } from "../../utils/cn";
import { sfx } from "../../lib/sfx";
import {
  generateRouting,
  liveSides,
  ROUTING_TIERS,
  traceCircuit,
  type RoutingBoard,
} from "../../game/routing";
import {
  generateHexwall,
  HEX_COLORS,
  hexPath,
  hexPixel,
  isCleared,
  isStuck,
  legalCells,
  playStack,
  unkey,
  type HexBoard,
} from "../../game/hexwall";
import {
  generateDump,
  isSolved,
  scoreGuess,
  triesLeft,
  type Attempt,
  type DumpBoard,
} from "../../game/memdump";
import type { VrCorpTheme, VrFinaleKind } from "../../game/vr/types";
import { useT } from "../../i18n";

interface Props {
  nodeCode: string;
  tier: 1 | 2 | 3 | 4 | 5;
  theme: VrCorpTheme;
  finaleKind: VrFinaleKind;
  onComplete: (result: { blackout: boolean }) => void;
  onCancel: () => void;
}

function BlackoutSwitchSubgame({
  nodeCode,
  theme,
  onComplete,
}: {
  nodeCode: string;
  theme: VrCorpTheme;
  onComplete: () => void;
}) {
  const { t } = useT();
  const [breakers, setBreakers] = useState<[boolean, boolean, boolean]>([true, true, true]);
  const [executing, setExecuting] = useState(false);

  const allDropped = breakers.every((b) => !b);

  const toggle = (idx: 0 | 1 | 2) => {
    if (executing) return;
    sfx("toggle");
    setBreakers((prev) => {
      const next: [boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean];
      next[idx] = !next[idx];
      return next;
    });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "1") toggle(0);
      if (e.key === "2") toggle(1);
      if (e.key === "3") toggle(2);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const cutMainPower = () => {
    if (!allDropped || executing) return;
    setExecuting(true);
    sfx("vrBlackout");
    window.setTimeout(() => onComplete(), 220);
  };

  const labels = [
    t("vr.breakerHall"),
    t("vr.breakerProj"),
    t("vr.breakerBallast"),
  ];

  return (
    <div className="space-y-3">
      <div className="border-l-2 border-[#ffb020] bg-[#ffb020]/10 px-3 py-2 text-[10.5px] leading-snug text-fog">
        <div className="font-bold uppercase tracking-[0.16em] text-[#ffb020]">
          {t("vr.blackoutHeader", { code: nodeCode })}
        </div>
        <div className="mt-1 text-dim">{t("vr.blackoutHint")}</div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {labels.map((lbl, idx) => {
          const online = breakers[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx as 0 | 1 | 2)}
              className={cn(
                "flex flex-col items-start justify-between border px-3 py-2.5 text-left transition-colors",
                online
                  ? "border-amberdim bg-[#18120c] text-amber hover:border-amber"
                  : "border-phosdim bg-phos/10 text-phosbrite"
              )}
            >
              <span className="text-[8px] uppercase tracking-[0.18em] text-faint">
                [0{idx + 1}] {t("vr.circuit")}
              </span>
              <span className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.12em]">
                {lbl}
              </span>
              <span
                className={cn(
                  "mt-2 text-[9px] font-bold uppercase tracking-[0.16em]",
                  online ? "text-amber" : "text-phosbrite"
                )}
              >
                {online ? `● ${t("vr.online")}` : `○ ${t("vr.isolated")}`}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={!allDropped || executing}
        onClick={cutMainPower}
        className={cn(
          "flex w-full items-center justify-center gap-2 border px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all",
          allDropped
            ? "border-[#ff2b45] bg-[#ff2b45]/20 text-[#ff7a8a] hover:bg-[#ff2b45] hover:text-ink"
            : "cursor-not-allowed border-line2 bg-panel text-faint"
        )}
        style={allDropped ? { boxShadow: `0 0 18px ${theme.danger}55` } : undefined}
      >
        <PowerOff size={13} />
        {executing ? t("vr.cutting") : t("vr.cutPower")}
      </button>
    </div>
  );
}

function RoutingSubgame({
  tier,
  onComplete,
}: {
  tier: number;
  onComplete: () => void;
}) {
  const { t } = useT();
  const cfg = ROUTING_TIERS[Math.min(3, Math.max(1, tier))];
  const [board, setBoard] = useState<RoutingBoard>(() => generateRouting(cfg));
  const { lit, solved } = useMemo(() => traceCircuit(board), [board]);
  const [done, setDone] = useState(false);

  const rotateCell = (id: string) => {
    if (done) return;
    sfx("click");
    setBoard((prev) => ({
      ...prev,
      cells: prev.cells.map((c) =>
        c.id === id && !c.fixed ? { ...c, turns: (c.turns + 1) % 4 } : c
      ),
    }));
  };

  useEffect(() => {
    if (solved && !done) {
      setDone(true);
      sfx("hackOk");
      const tm = window.setTimeout(onComplete, 480);
      return () => clearTimeout(tm);
    }
  }, [solved, done, onComplete]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[10px] text-dim">
        <span>{t("rt.hint")}</span>
        <span className={solved ? "font-bold text-phosbrite" : "text-amber"}>
          {solved ? t("rt.ready") : t("rt.broken")}
        </span>
      </div>

      <div
        className="mx-auto grid gap-1 border border-line2 bg-[#05080f] p-2"
        style={{
          gridTemplateColumns: `repeat(${board.cols}, minmax(0, 1fr))`,
          maxWidth: `${board.cols * 44}px`,
        }}
      >
        {Array.from({ length: board.rows }).map((_, r) =>
          Array.from({ length: board.cols }).map((__, c) => {
            const id = `${c}_${r}`;
            const cell = board.cells.find((x) => x.id === id);
            if (!cell) {
              return <div key={id} className="h-9 border border-line/40 bg-ink/40" />;
            }
            const sides = liveSides(cell);
            const active = lit.has(id);
            const stroke =
              cell.kind === "blocked"
                ? "#334"
                : active
                  ? "#39ff14"
                  : cell.fixed
                    ? "#cfa04b"
                    : "#6db3d2";

            return (
              <button
                key={id}
                type="button"
                disabled={cell.fixed}
                onClick={() => rotateCell(id)}
                className={cn(
                  "relative h-9 border transition-colors",
                  cell.kind === "blocked"
                    ? "cursor-not-allowed border-[#c25b46]/40 bg-[#1a0a0d]"
                    : active
                      ? "border-phos bg-phos/15"
                      : cell.fixed
                        ? "border-amberdim/60 bg-amber/10"
                        : "border-line2 bg-panel hover:border-phosdim"
                )}
              >
                <svg viewBox="0 0 24 24" className="h-full w-full">
                  {cell.kind === "blocked" ? (
                    <path d="M6 6l12 12M18 6l-12 12" stroke="#c25b46" strokeWidth="2" />
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="2.2" fill={stroke} />
                      {sides.includes(0) && <path d="M12 12V0" stroke={stroke} strokeWidth="2.5" />}
                      {sides.includes(1) && <path d="M12 12H24" stroke={stroke} strokeWidth="2.5" />}
                      {sides.includes(2) && <path d="M12 12V24" stroke={stroke} strokeWidth="2.5" />}
                      {sides.includes(3) && <path d="M12 12H0" stroke={stroke} strokeWidth="2.5" />}
                    </>
                  )}
                </svg>
                {cell.kind === "inlet" && (
                  <span className="absolute left-0.5 top-0.5 text-[7px] font-bold text-phosbrite">IN</span>
                )}
                {cell.kind === "outlet" && (
                  <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold text-phosbrite">OUT</span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function HexPurgeSubgame({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { t } = useT();
  const makeBoard = () =>
    generateHexwall({
      radius: 2,
      stacks: 5,
      hand: 5,
      height: [1, 2],
      colors: 3,
      failRep: 0,
      timerSec: 0,
    });

  const [board, setBoard] = useState<HexBoard>(() => makeBoard());
  const [selectedHand, setSelectedHand] = useState<number>(() =>
    board.hand.findIndex((h) => h !== null)
  );
  const [done, setDone] = useState(false);

  const spots = useMemo(() => new Set(legalCells(board)), [board]);
  const cleared = isCleared(board);
  const stuck = isStuck(board);

  useEffect(() => {
    if (cleared && !done) {
      setDone(true);
      sfx("hackOk");
      const tm = window.setTimeout(onComplete, 480);
      return () => clearTimeout(tm);
    }
  }, [cleared, done, onComplete]);

  const placeAt = (cell: string) => {
    if (done || selectedHand < 0) return;
    const res = playStack(board, cell, selectedHand);
    if (!res) {
      sfx("deny");
      return;
    }
    sfx("place");
    setBoard(res.board);
    const nextIdx = res.board.hand.findIndex((h) => h !== null);
    setSelectedHand(nextIdx);
  };

  const reseed = () => {
    sfx("click");
    const next = makeBoard();
    setBoard(next);
    setSelectedHand(next.hand.findIndex((h) => h !== null));
  };

  const size = 20;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-[10px] text-dim">
        <span>{t("hx.hint")}</span>
        <button
          type="button"
          onClick={reseed}
          className="flex shrink-0 items-center gap-1 border border-line3 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-dim hover:border-phos hover:text-phosbrite"
        >
          <RotateCw size={10} /> {t("hx.retry")}
        </button>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-around">
        <svg viewBox="-115 -105 230 210" className="h-[190px] w-[220px] border border-line2 bg-[#05080f]">
          {board.cells.map((k) => {
            const [q, r] = unkey(k);
            const { x, y } = hexPixel(q, r, size);
            const st = board.field[k];
            const isLegal = spots.has(k) && selectedHand >= 0;
            const topColor = st?.length ? HEX_COLORS[st[st.length - 1]] : undefined;
            return (
              <g
                key={k}
                onClick={() => isLegal && placeAt(k)}
                style={{ cursor: isLegal ? "pointer" : "default" }}
              >
                <path
                  d={hexPath(x, y, size - 1)}
                  fill={topColor ? `${topColor}33` : isLegal ? "rgba(57,255,20,0.08)" : "#090d16"}
                  stroke={topColor ?? (isLegal ? "#39ff14" : "#1f2a38")}
                  strokeWidth={isLegal ? 1.6 : 1}
                />
                {st && st.map((ci, idx) => (
                  <circle
                    key={idx}
                    cx={x + (idx - (st.length - 1) * 0.5) * 6}
                    cy={y}
                    r={idx === st.length - 1 ? 5 : 3.5}
                    fill={HEX_COLORS[ci]}
                    stroke="#04060b"
                    strokeWidth="1"
                  />
                ))}
              </g>
            );
          })}
        </svg>

        <div className="flex flex-col gap-1.5">
          <div className="text-[9px] uppercase tracking-[0.16em] text-faint">
            {t("hx.tray")}
          </div>
          <div className="flex flex-wrap gap-1.5 sm:flex-col">
            {board.hand.map((st, idx) => {
              if (!st) return null;
              const active = idx === selectedHand;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sfx("tick");
                    setSelectedHand(idx);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px]",
                    active ? "border-phos bg-phos/15 text-phosbrite" : "border-line2 bg-panel text-dim"
                  )}
                >
                  <span className="text-[8px] uppercase text-faint">#{idx + 1}</span>
                  {st.map((ci, j) => (
                    <span
                      key={j}
                      className={cn("inline-block h-3 w-3 border border-black", j === st.length - 1 && "ring-1 ring-white")}
                      style={{ background: HEX_COLORS[ci] }}
                    />
                  ))}
                </button>
              );
            })}
          </div>
          {stuck && (
            <div className="text-[9.5px] font-bold uppercase text-oxide">
              {t("hx.holds")} — {t("hx.retry")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CipherDecodeSubgame({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { t } = useT();
  const makeBoard = () =>
    generateDump({
      wordLen: 5,
      words: 6,
      tries: 4,
      rows: 8,
      cols: 16,
      timerSec: 0,
      failRep: 0,
    });

  const [board, setBoard] = useState<DumpBoard>(() => makeBoard());
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [done, setDone] = useState(false);

  const left = triesLeft(board, attempts);

  const pickWord = (word: string) => {
    if (done || left <= 0 || attempts.some((a) => a.word === word)) return;
    const att = scoreGuess(board, word);
    const next = [...attempts, att];
    setAttempts(next);
    if (isSolved(att, board)) {
      setDone(true);
      sfx("hackOk");
      window.setTimeout(onComplete, 480);
    } else {
      sfx("deny");
    }
  };

  const reset = () => {
    sfx("click");
    setBoard(makeBoard());
    setAttempts([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-[10px] text-dim">
        <span>{t("md.foot")}</span>
        <span className="font-bold tabular-nums text-phosbrite">
          {t("md.tries")}: {left}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {board.words.map((w) => {
          const prev = attempts.find((a) => a.word === w.word);
          return (
            <button
              key={w.word}
              type="button"
              disabled={!!prev || left <= 0 || done}
              onClick={() => pickWord(w.word)}
              className={cn(
                "flex items-center justify-between border px-2.5 py-2 text-left text-[11px] font-bold tracking-[0.16em]",
                prev
                  ? prev.word === board.secret
                    ? "border-phos bg-phos/20 text-phosbrite"
                    : "border-line bg-ink text-faint"
                  : "border-line2 bg-panel text-fog hover:border-phos hover:text-phosbrite"
              )}
            >
              <span>{w.word}</span>
              {prev && (
                <span className="text-[9px] tabular-nums text-amber">
                  {prev.exact}/{w.word.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {attempts.length > 0 && (
        <div className="space-y-1 border border-line2 bg-[#05080f] p-2 text-[10px]">
          {attempts.map((a, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="font-bold tracking-[0.14em] text-fog">&gt; {a.word}</span>
              <span className="tabular-nums text-dim">
                {t("md.exact")}: <strong className="text-phosbrite">{a.exact}</strong> ·{" "}
                {t("md.letters")}: <strong className="text-amber">{a.letters}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      {left <= 0 && !done && (
        <button
          type="button"
          onClick={reset}
          className="flex w-full items-center justify-center gap-1.5 border border-oxide bg-oxide/15 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-oxide hover:bg-oxide hover:text-ink"
        >
          <RotateCw size={11} /> {t("hx.retry")}
        </button>
      )}
    </div>
  );
}

export default function VrFinaleMinigame({
  nodeCode,
  tier,
  theme,
  finaleKind,
  onComplete,
  onCancel,
}: Props) {
  const { t } = useT();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onCancel]);

  const title =
    finaleKind === "BLACKOUT_SWITCH"
      ? t("vr.finaleBlackout")
      : finaleKind === "SIGNAL_ROUTING"
        ? t("vr.finaleRouting")
        : finaleKind === "HEX_PURGE"
          ? t("vr.finaleHex")
          : t("vr.finaleCipher");

  const Icon =
    finaleKind === "BLACKOUT_SWITCH"
      ? Bomb
      : finaleKind === "SIGNAL_ROUTING"
        ? Zap
        : finaleKind === "HEX_PURGE"
          ? ShieldAlert
          : Cpu;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#03050aee] p-4">
      <div
        className="w-full max-w-[540px] border bg-[#070b14] p-4 text-fog shadow-[0_0_32px_rgba(0,0,0,0.9)]"
        style={{ borderColor: theme.primary }}
      >
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-line2 pb-2">
          <div className="flex items-center gap-2">
            <Icon size={14} style={{ color: theme.primary }} />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: theme.primary }}
            >
              {title}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="border border-line3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-dim hover:border-phos hover:text-phosbrite"
          >
            {t("vr.backToVr")}
          </button>
        </div>

        {finaleKind === "BLACKOUT_SWITCH" && (
          <BlackoutSwitchSubgame
            nodeCode={nodeCode}
            theme={theme}
            onComplete={() => onComplete({ blackout: true })}
          />
        )}
        {finaleKind === "SIGNAL_ROUTING" && (
          <RoutingSubgame tier={tier} onComplete={() => onComplete({ blackout: false })} />
        )}
        {finaleKind === "HEX_PURGE" && (
          <HexPurgeSubgame onComplete={() => onComplete({ blackout: false })} />
        )}
        {finaleKind === "CIPHER_DECODE" && (
          <CipherDecodeSubgame onComplete={() => onComplete({ blackout: false })} />
        )}
      </div>
    </div>
  );
}
