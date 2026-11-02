import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, FolderClosed, FolderOpen, HardDrive, Radar, ShieldCheck, X } from "lucide-react";
import { cn } from "../utils/cn";
import { blockBar } from "../lib/util";
import { useT } from "../i18n";
import { StatusDot } from "./chrome";
import { resolveFile } from "../game/data";
import { generateVault, resolveScan, vaultTimer, type VaultFS, type VaultFile, type VaultResult } from "../game/vault";
import { NODE_META } from "../game/data";
import WardenClock from "./WardenClock";
import { useTut } from "../game/tutorial";

const SCAN_MS = 1500;

/* 文档中引号包围的内容表示需要输入的字面值，因此使用粗体高亮。 */
function highlightKeys(line: string) {
  const parts = line.split(/"([^"]+)"/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong
        key={i}
        className="px-[3px] font-bold tracking-[0.1em] text-phosbrite"
        style={{ background: "rgba(143,181,109,0.16)", textShadow: "0 0 8px rgba(143,181,109,0.5)" }}
      >
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function DataVault({
  nodeId,
  nodeCode,
  ownerName,
  ownedFiles,
  burnedFiles,
  onAcquire,
  onClose,
  onEjected,
  onLog,
}: {
  nodeId: string;
  nodeCode: string;
  ownerName: string;
  ownedFiles: string[];
  burnedFiles: string[];
  onAcquire: (fileId: string) => void;
  onClose: () => void;
  onEjected: () => void;
  onLog: (key: string, params?: Record<string, string | number>) => void;
}) {
  const { t, lang } = useT();
  const { isHl, gating } = useTut();
  /* 教程指向退出按钮时，文件浏览区域暂时停用。 */
  const leaving = isHl("vault:close");

  const [fs, setFs] = useState<VaultFS>(() => generateVault(nodeId, ownedFiles, burnedFiles));
  const [openDir, setOpenDir] = useState(fs.folders[0]?.id ?? "");
  const [scanning, setScanning] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [reader, setReader] = useState<VaultResult | null>(null);
  const [found, setFound] = useState<string[]>([]);
  /* WARDEN 倒计时：T2 起生效，时间耗尽即被逐出 */
  const warden = NODE_META[nodeId]?.warden ?? 1;
  const limit = vaultTimer(warden);
  const [ejected, setEjected] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => timers.current.forEach((h) => { clearTimeout(h); clearInterval(h); }),
    []
  );

  const fileName = useCallback(
    (id: string) => {
      const f = resolveFile(id);
      return f ? (lang === "ru" ? f.nameRu : f.name) : id;
    },
    [lang]
  );

  const folder = fs.folders.find((f) => f.id === openDir);
  const remaining = fs.payloads.filter((p) => !found.includes(p)).length;
  const scannedCount = fs.folders.reduce(
    (a, f) => a + f.files.filter((x) => x.scan === "done").length, 0
  );
  const totalCount = fs.folders.reduce((a, f) => a + f.files.length, 0);

  const patch = (fileId: string, up: Partial<VaultFile>) =>
    setFs((prev) => ({
      ...prev,
      folders: prev.folders.map((d) => ({
        ...d,
        files: d.files.map((f) => (f.id === fileId ? { ...f, ...up } : f)),
      })),
    }));

  const scan = (file: VaultFile) => {
    if (ejected || scanning || file.scan === "scanning") return;
    if (file.scan === "done") {
      if (file.result && file.result.kind !== "empty") setReader(file.result);
      return;
    }
    setScanning(file.id);
    setPct(0);
    patch(file.id, { scan: "scanning" });
    onLog("dv.logScan", { name: file.name });

    const iv = window.setInterval(() => setPct((p) => Math.min(100, p + 100 / (SCAN_MS / 70))), 70);
    timers.current.push(iv);

    timers.current.push(
      window.setTimeout(() => {
        clearInterval(iv);
        setPct(0);
        setScanning(null);
        const res = resolveScan(file, nodeId, lang, fileName);
        patch(file.id, { scan: "done", result: res });

        if (res.kind === "payload" && res.fileId) {
          setFound((f) => (f.includes(res.fileId!) ? f : [...f, res.fileId!]));
          onAcquire(res.fileId);
          setReader(res);
        } else if (res.kind === "text") {
          setReader(res);
          onLog("dv.logText", { name: file.name });
        } else {
          onLog("dv.logEmpty", { name: file.name });
        }
      }, SCAN_MS)
    );
  };

  const icon = (f: VaultFile) => {
    if (f.scan === "scanning") return <Radar size={10} className="animate-softpulse text-amber" />;
    if (f.scan === "done" && f.result?.kind === "payload")
      return <ShieldCheck size={10} className="text-phosbrite" />;
    if (f.scan === "done" && f.result?.kind === "text")
      return <FileText size={10} className="text-steel" />;
    if (f.scan === "done") return <FileText size={10} className="text-faint" />;
    return <FileText size={10} className="text-dim" />;
  };

  const rowTone = (f: VaultFile) =>
    f.scan === "done" && f.result?.kind === "payload"
      ? "text-phosbrite"
      : f.scan === "done" && f.result?.kind === "text"
        ? "text-steel"
        : f.scan === "done"
          ? "text-faint line-through decoration-faint/50"
          : "text-fog";

  const dirsLabel = useMemo(() => `${fs.folders.length}`, [fs.folders.length]);

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-ink/88 p-3 backdrop-blur-[2px]">
      <div className="anim-msgin relative flex max-h-[92vh] w-[min(760px,97%)] flex-col border border-line3 bg-panel shadow-[0_0_80px_rgba(0,0,0,0.75)]">
        {/* ---- 标题栏 ---- */}
        <div className="flex h-[28px] shrink-0 items-center gap-2 border-b border-line2 bg-header px-2.5">
          <StatusDot color="#7f95a8" pulse />
          <span className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-dim">
            {t("dv.title")} :: {nodeCode}
          </span>
          <span className="mx-1 hidden h-px flex-1 bg-line sm:block" />
          <span className="hidden shrink-0 truncate text-[8px] tracking-[0.14em] text-faint md:inline">
            {ownerName}
          </span>
          <button
            onClick={onClose}
            className={cn(
              "ml-auto flex shrink-0 items-center gap-1 border px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-[0.12em] transition-colors",
              leaving
                ? "tut-ring border-amberdim bg-amber/15 text-amber hover:bg-amber hover:text-ink"
                : "border-line3 text-dim hover:border-oxide hover:bg-oxide hover:text-ink"
            )}
          >
            <X size={9} /> {t("dv.disconnect")}
          </button>
        </div>

        {/* 卷标信息 */}
        <div className="flex h-[22px] shrink-0 items-center gap-2 border-b border-line bg-soot px-2.5 text-[8px] uppercase tracking-[0.14em] text-faint">
          <HardDrive size={10} className="text-phosdim" />
          <span className="text-phosdim">{fs.volume}:\</span>
          <span className="truncate">{folder ? folder.name : ""}</span>
          <span className="ml-auto hidden sm:inline">{t("dv.dirs", { n: dirsLabel })}</span>
          <span>{t("dv.scanned", { a: scannedCount, b: totalCount })}</span>
        </div>

        <WardenClock
          seconds={limit}
          warden={warden}
          running={!ejected}
          onExpire={() => {
            setEjected(true);
            setReader(null);
            onEjected();
          }}
        />

        {/* 文件浏览区域 */}
        <div className={cn("flex min-h-0 flex-1", (leaving || ejected || (gating && !isHl("vault"))) && "tut-dim")}>
          {/* 文件夹 */}
          <div className="w-[104px] shrink-0 overflow-y-auto border-r border-line bg-well sm:w-[132px]">
            {fs.folders.map((d) => {
              const active = d.id === openDir;
              const hits = d.files.filter((f) => f.scan === "done" && f.result?.kind === "payload").length;
              return (
                <button
                  key={d.id}
                  onClick={() => setOpenDir(d.id)}
                  className={cn(
                    "flex w-full items-center gap-1.5 border-b border-line/60 px-2 py-[6px] text-left transition-colors",
                    active ? "bg-phos/12 shadow-[inset_2px_0_0_#8fb56d]" : "hover:bg-panel2"
                  )}
                >
                  {active ? (
                    <FolderOpen size={11} className="shrink-0 text-phos" />
                  ) : (
                    <FolderClosed size={11} className="shrink-0 text-faint" />
                  )}
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[9px] font-bold tracking-[0.06em]",
                      active ? "text-phosbrite" : "text-dim"
                    )}
                  >
                    {d.name}
                  </span>
                  {hits > 0 && <span className="shrink-0 text-[8px] text-phos">●</span>}
                </button>
              );
            })}
          </div>

          {/* 文件 */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 border-b border-line bg-panel2 px-2 py-[3px] text-[7.5px] uppercase tracking-[0.16em] text-faint">
              <span className="min-w-0 flex-1">{t("dv.colName")}</span>
              <span className="hidden w-[46px] shrink-0 text-right sm:inline">{t("dv.colSize")}</span>
              <span className="hidden w-[62px] shrink-0 text-right md:inline">{t("dv.colDate")}</span>
              <span className="w-[66px] shrink-0 text-right">{t("dv.colScan")}</span>
            </div>

            {folder?.files.map((f) => (
              <button
                key={f.id}
                onClick={() => scan(f)}
                disabled={!!scanning && scanning !== f.id}
                className={cn(
                  "relative flex w-full items-center gap-2 border-b border-line/40 px-2 py-[5px] text-left transition-colors",
                  scanning && scanning !== f.id ? "opacity-50" : "hover:bg-panel2"
                )}
              >
                {icon(f)}
                <span className={cn("min-w-0 flex-1 truncate text-[10px] tracking-[0.04em]", rowTone(f))}>
                  {f.name}
                </span>
                <span className="hidden w-[46px] shrink-0 text-right text-[9px] tabular-nums text-faint sm:inline">
                  {f.size}
                </span>
                <span className="hidden w-[62px] shrink-0 text-right text-[9px] tabular-nums text-faint md:inline">
                  {f.date}
                </span>
                <span className="w-[66px] shrink-0 text-right text-[8px] uppercase tracking-[0.1em]">
                  {f.scan === "scanning" ? (
                    <span className="text-amber">{t("dv.scanning")}</span>
                  ) : f.scan === "done" ? (
                    f.result?.kind === "payload" ? (
                      <span className="text-phosbrite">{t("dv.hit")}</span>
                    ) : f.result?.kind === "text" ? (
                      <span className="text-steel">{t("dv.read")}</span>
                    ) : (
                      <span className="text-faint">{t("dv.clean")}</span>
                    )
                  ) : (
                    <span className="text-dim">{t("dv.scanBtn")}</span>
                  )}
                </span>

                {f.scan === "scanning" && (
                  <span
                    className="absolute bottom-0 left-0 h-[2px] bg-amber transition-[width] duration-75"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {}
        {ejected && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-ink/85">
            <div className="anim-msgin border border-oxide bg-oxide/12 px-5 py-3 text-center">
              <div className="pixel text-[26px] leading-none text-[#e0634a]">{t("wc.ejected")}</div>
              <div className="mt-1 text-[9px] uppercase tracking-[0.2em] text-dim">{t("wc.ejectedSub")}</div>
            </div>
          </div>
        )}

        <div className="flex h-[24px] shrink-0 items-center gap-2 border-t border-line2 bg-soot px-2.5 text-[8px] uppercase tracking-[0.14em]">
          {scanning ? (
            <>
              <Radar size={10} className="animate-softpulse text-amber" />
              <span className="text-amber">{t("dv.scanning")}</span>
              <span className="blocksbar ml-1 text-[12px] text-amber">{blockBar(pct, 14)}</span>
            </>
          ) : (
            <>
              <span className="text-faint">{t("dv.hint")}</span>
              <span className="ml-auto shrink-0" style={{ color: remaining === 0 ? "#8fb56d" : "#77806b" }}>
                {remaining === 0 ? t("dv.allFound") : t("dv.remaining", { n: remaining })}
              </span>
            </>
          )}
        </div>
      </div>

      {}
      {reader && (
        <div
          className="absolute inset-0 z-[97] flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setReader(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="anim-msgin w-[min(460px,94%)] border bg-panel shadow-[0_0_50px_rgba(0,0,0,0.7)]"
            style={{ borderColor: reader.kind === "payload" ? "#8fb56d88" : "#7f95a888" }}
          >
            <div className="flex h-[24px] items-center gap-2 border-b border-line2 bg-header px-2.5">
              <StatusDot color={reader.kind === "payload" ? "#8fb56d" : "#7f95a8"} pulse={reader.kind === "payload"} />
              <span
                className="truncate text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: reader.kind === "payload" ? "#b3d98d" : "#99a18c" }}
              >
                {reader.kind === "payload" ? t("dv.recovered") : t("dv.document")}
              </span>
            </div>
            <div className="px-3 py-3">
              <div
                className="pixel text-[19px] leading-none"
                style={{ color: reader.kind === "payload" ? "#b3d98d" : "#bcc4ae" }}
              >
                {reader.title}
              </div>
              <div className="mt-2 border-t border-line pt-2">
                {reader.body.map((line, i) => (
                  <p
                    key={i}
                    className={cn(
                      "whitespace-pre-line text-[10.5px] leading-relaxed",
                      i === 0 ? "text-fog/90" : "mt-1.5 text-faint"
                    )}
                  >
                    {highlightKeys(line)}
                  </p>
                ))}
              </div>
              {reader.kind === "payload" && (
                <div className="mt-2.5 border border-phosdim/50 bg-phos/10 px-2 py-[6px] text-[9px] font-bold uppercase tracking-[0.14em] text-phos">
                  ✓ {t("dv.stored")}
                </div>
              )}
              <button
                onClick={() => setReader(null)}
                className="mt-2 w-full border border-line3 py-[6px] text-[9px] font-bold uppercase tracking-[0.16em] text-dim transition-colors hover:bg-panel2 hover:text-fog"
              >
                {t("dv.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
