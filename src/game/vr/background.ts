import { DOOR_COLORS, INTERNAL_HEIGHT, INTERNAL_WIDTH, TILE_SIZE } from "./themes";
import { vrFont, vtr } from "./vrText";
import type { VrLevelDef } from "./types";

interface SkylineBuilding {
  x: number;
  w: number;
  h: number;
  hasSpire: boolean;
  seed: number;
}

export class VrBackgroundRenderer {
  private readonly farBuildings: SkylineBuilding[] = [];
  private readonly nearBuildings: SkylineBuilding[] = [];

  constructor() {
    for (let i = 0; i < 24; i++) {
      this.farBuildings.push({
        x: i * 48,
        w: 32 + ((i * 19) % 24),
        h: 48 + ((i * 37) % 86),
        hasSpire: i % 3 === 0,
        seed: i * 13,
      });
    }
    for (let i = 0; i < 20; i++) {
      this.nearBuildings.push({
        x: i * 60,
        w: 36 + ((i * 23) % 26),
        h: 42 + ((i * 29) % 72),
        hasSpire: i % 4 === 1,
        seed: i * 17,
      });
    }
  }

  public renderDiveTransition(
    ctx: CanvasRenderingContext2D,
    level: VrLevelDef,
    progress: number,
    time: number
  ): void {
    const { theme } = level;
    ctx.fillStyle = "#03040a";
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    const cx = INTERNAL_WIDTH * 0.5;
    const cy = INTERNAL_HEIGHT * 0.5;

    // Speed-lines neural dive vortex
    const ringCount = 12;
    for (let i = 0; i < ringCount; i++) {
      const z = ((i / ringCount + progress * 2.4) % 1);
      const scale = Math.pow(z, 1.55);
      const rw = Math.max(12, Math.round(scale * INTERNAL_WIDTH * 1.15));
      const rh = Math.max(8, Math.round(scale * INTERNAL_HEIGHT * 1.15));
      ctx.globalAlpha = Math.min(1, z * 1.4) * 0.8;
      ctx.strokeStyle = i % 2 === 0 ? theme.primary : theme.secondary;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.round(cx - rw * 0.5) + 0.5,
        Math.round(cy - rh * 0.5) + 0.5,
        rw,
        rh
      );
    }

    // Radial neural data streaks
    ctx.globalAlpha = 0.7;
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2 + time * 0.35;
      const r0 = 20 + ((progress * 260 + a * 27) % 140);
      const r1 = r0 + 38;
      ctx.strokeStyle = a % 3 === 0 ? "#ffffff" : a % 2 === 0 ? theme.primary : theme.secondary;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }

    // Center lock-on reticle & telemetry
    ctx.globalAlpha = 1;
    const boxW = 240;
    const boxH = 54;
    const bx = (INTERNAL_WIDTH - boxW) >> 1;
    const by = (INTERNAL_HEIGHT - boxH) >> 1;
    ctx.fillStyle = "rgba(4, 7, 15, 0.9)";
    ctx.fillRect(bx, by, boxW, boxH);
    ctx.strokeStyle = theme.primary;
    ctx.strokeRect(bx + 0.5, by + 0.5, boxW - 1, boxH - 1);

    ctx.font = vrFont(8);
    ctx.textAlign = "center";
    ctx.fillStyle = theme.primary;
    ctx.fillText(vtr(`NEURAL LINK :: ${level.nodeCode} [WARDEN T${level.tier}]`), cx, by + 16);
    ctx.fillStyle = "#e2f8ff";
    ctx.font = vrFont(7, false);
    ctx.fillText(vtr(theme.corpLabel), cx, by + 29);

    // Loading progress bar inside dive reticle
    const barW = 180;
    ctx.fillStyle = "#0e1526";
    ctx.fillRect(cx - (barW >> 1), by + 38, barW, 5);
    ctx.fillStyle = theme.secondary;
    ctx.fillRect(cx - (barW >> 1), by + 38, Math.round(barW * Math.min(1, progress)), 5);
    ctx.textAlign = "left";
  }

  public renderBackdrop(
    ctx: CanvasRenderingContext2D,
    level: VrLevelDef,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    time: number,
    buildFraction = 1,
    blackout = false
  ): void {
    const { theme } = level;

    // 1. Virtual void gradient
    if (blackout) {
      ctx.fillStyle = "#030408";
      ctx.fillRect(0, 0, viewW, viewH);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, viewH);
      grad.addColorStop(0, theme.skyTop);
      grad.addColorStop(1, theme.skyBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, viewW, viewH);

      // Cyber horizon glow
      ctx.fillStyle = theme.horizonGlow;
      ctx.fillRect(0, viewH - 76, viewW, 76);

      // Perspective virtual matrix floor grid at bottom
      ctx.strokeStyle = theme.gridColor;
      ctx.lineWidth = 1;
      for (let gy = viewH - 58; gy < viewH; gy += 10) {
        ctx.beginPath();
        ctx.moveTo(0, gy + 0.5);
        ctx.lineTo(viewW, gy + 0.5);
        ctx.stroke();
      }
      const gridScroll = Math.round(camX * 0.2) % 32;
      for (let gx = -gridScroll; gx < viewW; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx + 0.5, viewH - 60);
        ctx.lineTo(gx - 24 + 0.5, viewH);
        ctx.stroke();
      }
    }

    // 2. Corporation-distinct distant parallax motif
    if (!blackout) {
      this.renderCorpMotif(ctx, level, camX, viewW, viewH, time);
      this.renderSkyline(ctx, this.farBuildings, camX * 0.14, theme.skylineFar, theme.towerAccent, viewW, viewH, 0.45);
      this.renderSkyline(ctx, this.nearBuildings, camX * 0.28, theme.skylineNear, theme.secondary, viewW, viewH, 0.72);
    }

    // 3. Matrix rain / wireframe construction lattice during materialize or normally ambient
    ctx.save();
    ctx.globalAlpha = blackout ? 0.08 : buildFraction < 1 ? 0.35 : 0.12;
    ctx.fillStyle = blackout ? "#ff2b45" : theme.primary;
    for (let gx = 0; gx < viewW; gx += 32) {
      const dropY = Math.round(((time * 48 + gx * 7) % (viewH + 30)) - 15);
      ctx.fillRect(gx + 4, dropY, 1, 8);
    }
    ctx.restore();

    // 4. Exterior Matrix Windows
    for (let i = 0; i < level.windows.length; i++) {
      const win = level.windows[i];
      const wx = Math.round(win.col * TILE_SIZE - camX);
      const wy = Math.round(win.row * TILE_SIZE - camY);
      const ww = win.wCols * TILE_SIZE;
      const wh = win.hRows * TILE_SIZE;
      if (wx + ww < 0 || wx > viewW || wy + wh < 0 || wy > viewH) continue;

      ctx.fillStyle = blackout ? "#040509" : theme.windowTint;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = blackout ? "#141824" : theme.gridColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(wx + 0.5, wy + 0.5, ww - 1, wh - 1);

      if (!blackout) {
        // Streaming holographic telemetry packets across window
        ctx.fillStyle = theme.primary;
        ctx.globalAlpha = 0.32;
        for (let line = 0; line < 3; line++) {
          const px = wx + ((Math.floor(time * (45 + line * 20) + i * 50) % Math.max(24, ww - 16)));
          ctx.fillRect(px, wy + 12 + line * 16, 12, 1);
        }
        ctx.globalAlpha = 1;
      }
    }

    // 5. Server Racks, Conduits & Holographic Signs
    if (buildFraction >= 0.45) {
      this.renderConduits(ctx, level, camX, camY, time, blackout);
      this.renderHoloSigns(ctx, level, camX, camY, viewW, time, blackout);
    }
  }

  private renderCorpMotif(
    ctx: CanvasRenderingContext2D,
    level: VrLevelDef,
    camX: number,
    viewW: number,
    viewH: number,
    time: number
  ): void {
    const { theme } = level;
    ctx.save();
    ctx.strokeStyle = theme.towerAccent;
    ctx.fillStyle = theme.towerAccent;

    if (theme.motif === "orbital") {
      // Takamuri: Giant orbital gate rings & sun disc
      const ox = Math.round(viewW * 0.72 - (camX * 0.04) % 90);
      const oy = Math.round(viewH * 0.36);
      ctx.globalAlpha = 0.14;
      ctx.beginPath();
      ctx.arc(ox, oy, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.ellipse(ox, oy, 74, 20, -0.22, 0, Math.PI * 2);
      ctx.stroke();
    } else if (theme.motif === "helix") {
      // Intercell: Rotating synthetic DNA helix columns
      ctx.globalAlpha = 0.24;
      const baseX = Math.round(viewW * 0.65 - (camX * 0.06) % 120);
      for (let y = 20; y < viewH - 30; y += 8) {
        const s = Math.sin(y * 0.06 + time * 2.2) * 20;
        ctx.fillStyle = theme.primary;
        ctx.fillRect(baseX + s, y, 4, 2);
        ctx.fillStyle = theme.secondary;
        ctx.fillRect(baseX - s, y, 4, 2);
      }
    } else if (theme.motif === "monolith") {
      // Slayer: Piercing crimson laser beams & brutalist diamond monolith
      ctx.globalAlpha = 0.22;
      const mx = Math.round(viewW * 0.55 - (camX * 0.05) % 100);
      ctx.beginPath();
      ctx.moveTo(mx, 18);
      ctx.lineTo(mx + 28, 86);
      ctx.lineTo(mx, 154);
      ctx.lineTo(mx - 28, 86);
      ctx.closePath();
      ctx.stroke();
    } else if (theme.motif === "prism") {
      // Agogee: Floating crystalline wireframe prisms
      ctx.globalAlpha = 0.22;
      for (let i = 0; i < 3; i++) {
        const px = ((i * 150 + 80 - Math.round(camX * 0.08)) % (viewW + 60)) - 20;
        const py = 54 + Math.round(Math.sin(time * 1.5 + i * 2) * 10);
        ctx.strokeRect(px, py, 24, 34);
        ctx.strokeRect(px + 5, py - 5, 24, 34);
      }
    } else if (theme.motif === "reactor") {
      // Fusion: Concentric reactor pulse rings
      const rx = Math.round(viewW * 0.5);
      const ry = Math.round(viewH * 0.42);
      ctx.globalAlpha = 0.2;
      for (let r = 18; r <= 72; r += 18) {
        ctx.beginPath();
        ctx.arc(rx, ry, r + ((time * 12) % 18), 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (theme.motif === "biomed") {
      // Gexogen: Live ECG telemetry waveform across the sky
      ctx.globalAlpha = 0.26;
      ctx.beginPath();
      for (let x = 0; x <= viewW; x += 6) {
        const phase = (x + Math.floor(time * 90)) % 96;
        let dy = 0;
        if (phase > 42 && phase < 48) dy = -16;
        else if (phase >= 48 && phase < 54) dy = 12;
        else if (phase >= 54 && phase < 60) dy = -6;
        if (x === 0) ctx.moveTo(x, 68 + dy);
        else ctx.lineTo(x, 68 + dy);
      }
      ctx.stroke();
    } else {
      // Shadow grid: glitch blocks
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 6; i++) {
        const bx = ((i * 83 + Math.floor(time * 16) * (i % 2 === 0 ? 1 : -1)) % viewW + viewW) % viewW;
        const by = 24 + ((i * 31) % 120);
        ctx.strokeRect(bx, by, 28, 8);
      }
    }
    ctx.restore();
  }

  private renderSkyline(
    ctx: CanvasRenderingContext2D,
    buildings: SkylineBuilding[],
    scrollX: number,
    fill: string,
    accent: string,
    viewW: number,
    viewH: number,
    alpha: number
  ): void {
    const span = buildings.length * 52;
    ctx.save();
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      let bx = Math.round((b.x - scrollX) % span);
      if (bx < -80) bx += span;
      if (bx > viewW + 20) continue;
      const by = viewH - b.h;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeRect(bx + 0.5, by + 0.5, b.w - 1, b.h - 1);
      if (b.hasSpire) {
        ctx.fillStyle = accent;
        ctx.fillRect(bx + (b.w >> 1), by - 14, 1, 14);
      }
    }
    ctx.restore();
  }

  private renderConduits(
    ctx: CanvasRenderingContext2D,
    level: VrLevelDef,
    camX: number,
    camY: number,
    time: number,
    blackout: boolean
  ): void {
    const pulse = blackout ? 0.15 : 0.4 + 0.35 * Math.sin(time * 5);
    ctx.save();
    ctx.globalAlpha = pulse;
    for (let i = 0; i < level.doors.length; i++) {
      const d = level.doors[i];
      const b = level.buttons.find((btn) => btn.color === d.color);
      if (!b) continue;
      const c = DOOR_COLORS[d.color].main;
      const dx = Math.round(d.col * TILE_SIZE + 8 - camX);
      const dy = Math.round(d.topRow * TILE_SIZE - 4 - camY);
      const bx = Math.round(b.col * TILE_SIZE + 8 - camX);
      const by = Math.round(b.row * TILE_SIZE - 4 - camY);
      ctx.strokeStyle = c;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, dy - 6);
      ctx.lineTo(dx, dy - 6);
      ctx.lineTo(dx, dy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderHoloSigns(
    ctx: CanvasRenderingContext2D,
    level: VrLevelDef,
    camX: number,
    camY: number,
    viewW: number,
    time: number,
    blackout: boolean
  ): void {
    if (blackout) return;
    ctx.font = vrFont(7);
    ctx.textBaseline = "top";
    for (let i = 0; i < level.signs.length; i++) {
      const s = level.signs[i];
      const sx = Math.round(s.col * TILE_SIZE - camX);
      const sy = Math.round(s.row * TILE_SIZE - camY);
      if (sx > viewW + 20 || sx + 120 < 0) continue;
      const color = s.color ?? (i % 2 === 0 ? level.theme.primary : level.theme.secondary);
      const flicker = Math.sin(time * 18 + i * 7.3) > -0.92 ? 1 : 0.3;
      const label = vtr(s.text);
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = "rgba(4, 7, 15, 0.85)";
      ctx.fillRect(sx, sy, tw, 13);
      ctx.strokeStyle = color;
      ctx.globalAlpha = flicker;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, tw - 1, 12);
      ctx.fillStyle = color;
      ctx.fillText(label, sx + 5, sy + 3);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = "alphabetic";
  }

  public renderSpecialStations(
    ctx: CanvasRenderingContext2D,
    level: VrLevelDef,
    camX: number,
    camY: number,
    time: number,
    checkpointSaved: boolean,
    overloadTriggered: boolean,
    blackout: boolean
  ): void {
    const { theme } = level;

    // Checkpoint Node
    const cx = Math.round(level.checkpoint.col * TILE_SIZE - camX);
    const cy = Math.round(level.checkpoint.row * TILE_SIZE - 26 - camY);
    ctx.fillStyle = blackout ? "#090c14" : theme.tileCore;
    ctx.fillRect(cx, cy + 8, 18, 18);
    ctx.fillStyle = "#04070e";
    ctx.fillRect(cx + 2, cy, 14, 14);
    ctx.strokeStyle = checkpointSaved ? theme.ok : theme.primary;
    ctx.strokeRect(cx + 2.5, cy + 0.5, 13, 13);
    ctx.fillStyle = checkpointSaved ? theme.ok : theme.secondary;
    ctx.fillRect(cx + 4, cy + 3, 10, 6);

    // Core Objective Terminal (or Lights Breaker on CRP-P06!)
    const tx = Math.round(level.coreTerminal.col * TILE_SIZE - 6 - camX);
    const ty = Math.round(level.coreTerminal.row * TILE_SIZE - 38 - camY);
    const termColor = level.isSabotageBlackout
      ? blackout
        ? "#ff2b45"
        : "#ffb020"
      : overloadTriggered
        ? theme.danger
        : theme.ok;
    ctx.fillStyle = blackout ? "#0a080d" : "#0b1222";
    ctx.fillRect(tx, ty, 28, 38);
    ctx.strokeStyle = termColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(tx + 0.5, ty + 0.5, 27, 37);

    const pulse = 0.65 + 0.35 * Math.sin(time * 6);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = blackout ? "rgba(255, 43, 69, 0.25)" : theme.skyBot;
    ctx.fillRect(tx + 4, ty + 4, 20, 18);
    ctx.fillStyle = termColor;
    ctx.fillRect(tx + 7, ty + 7, 14, 3);
    ctx.fillRect(tx + 7, ty + 12, 9, 2);
    ctx.fillRect(tx + 7, ty + 16, 12, 2);
    ctx.globalAlpha = 1;

    // Optional Extraction Airlock Gate (for CORE_EXTRACTION levels)
    if (level.extractionGate) {
      const ex = Math.round(level.extractionGate.col * TILE_SIZE - 8 - camX);
      const ey = Math.round(level.extractionGate.row * TILE_SIZE - 42 - camY);
      const open = overloadTriggered;
      ctx.fillStyle = "#0b101e";
      ctx.fillRect(ex, ey, 34, 42);
      ctx.strokeStyle = open ? theme.ok : theme.danger;
      ctx.strokeRect(ex + 0.5, ey + 0.5, 33, 41);
      ctx.globalAlpha = open ? pulse : 0.25;
      ctx.fillStyle = open ? theme.ok : theme.danger;
      ctx.fillRect(ex + 5, ey + 5, 24, 34);
      ctx.globalAlpha = 1;
    }
  }

  public renderMaterializeSweep(
    ctx: CanvasRenderingContext2D,
    camX: number,
    level: VrLevelDef,
    buildFraction: number
  ): void {
    const sweepWorldX = buildFraction * (level.ascii[0]?.length ?? 80) * TILE_SIZE;
    const sx = Math.round(sweepWorldX - camX);
    if (sx < -20 || sx > INTERNAL_WIDTH + 20) return;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = level.theme.primary;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(sx - 2, 0, 4, INTERNAL_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.fillRect(sx, 0, 1, INTERNAL_HEIGHT);
    ctx.restore();
  }

  public renderBlackoutOverlay(
    ctx: CanvasRenderingContext2D,
    time: number
  ): void {
    // Dramatic emergency darkness with dim red strobe after CRP-P06 lights shutoff!
    ctx.save();
    ctx.fillStyle = "rgba(2, 3, 7, 0.72)";
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    const strobe = Math.max(0, Math.sin(time * 9)) * 0.16;
    if (strobe > 0.01) {
      ctx.fillStyle = `rgba(255, 35, 55, ${strobe.toFixed(3)})`;
      ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
    }
    ctx.restore();
  }
}
