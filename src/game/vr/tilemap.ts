import { TILE_SIZE } from "./themes";
import type { Rect, VrCorpTheme } from "./types";

export type TileKind = "empty" | "solid" | "oneway";

export interface TileCollisionResult {
  hitLeft: boolean;
  hitRight: boolean;
  hitTop: boolean;
  hitBottom: boolean;
  onOneWay: boolean;
}

export class Tilemap {
  public readonly rows: number;
  public readonly cols: number;
  public readonly worldWidth: number;
  public readonly worldHeight: number;
  public readonly grid: TileKind[][];

  constructor(asciiRows: string[]) {
    this.rows = asciiRows.length;
    this.cols = asciiRows[0]?.length ?? 0;
    this.worldWidth = this.cols * TILE_SIZE;
    this.worldHeight = this.rows * TILE_SIZE;
    this.grid = asciiRows.map((row) =>
      row.split("").map((ch) => {
        if (ch === "#") return "solid";
        if (ch === "=") return "oneway";
        return "empty";
      })
    );
  }

  public getTile(col: number, row: number): TileKind {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return "solid";
    }
    return this.grid[row][col];
  }

  public isSolidAtPixel(wx: number, wy: number): boolean {
    const col = Math.floor(wx / TILE_SIZE);
    const row = Math.floor(wy / TILE_SIZE);
    return this.getTile(col, row) === "solid";
  }

  public hasLineOfSight(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    blockingRects: Rect[] = []
  ): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t;
      const py = y0 + dy * t;
      if (this.isSolidAtPixel(px, py)) return false;
      for (let j = 0; j < blockingRects.length; j++) {
        const r = blockingRects[j];
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
          return false;
        }
      }
    }
    return true;
  }

  public moveAndCollide(
    rect: Rect,
    vx: number,
    vy: number,
    dt: number,
    options: {
      dropThroughOneWay?: boolean;
      extraSolids?: Rect[];
    } = {}
  ): TileCollisionResult {
    const res: TileCollisionResult = {
      hitLeft: false,
      hitRight: false,
      hitTop: false,
      hitBottom: false,
      onOneWay: false,
    };
    const extraSolids = options.extraSolids ?? [];

    rect.x += vx * dt;
    const minRowX = Math.floor((rect.y + 0.5) / TILE_SIZE);
    const maxRowX = Math.floor((rect.y + rect.h - 0.5) / TILE_SIZE);
    const minColX = Math.floor(rect.x / TILE_SIZE);
    const maxColX = Math.floor((rect.x + rect.w - 0.01) / TILE_SIZE);

    for (let r = minRowX; r <= maxRowX; r++) {
      for (let c = minColX; c <= maxColX; c++) {
        if (this.getTile(c, r) === "solid") {
          const tileX = c * TILE_SIZE;
          if (vx > 0) {
            rect.x = tileX - rect.w;
            res.hitRight = true;
          } else if (vx < 0) {
            rect.x = tileX + TILE_SIZE;
            res.hitLeft = true;
          }
        }
      }
    }

    for (let i = 0; i < extraSolids.length; i++) {
      const s = extraSolids[i];
      if (aabbOverlap(rect, s)) {
        if (vx > 0) {
          rect.x = s.x - rect.w;
          res.hitRight = true;
        } else if (vx < 0) {
          rect.x = s.x + s.w;
          res.hitLeft = true;
        }
      }
    }

    const prevBottom = rect.y + rect.h;
    rect.y += vy * dt;
    const minColY = Math.floor((rect.x + 0.5) / TILE_SIZE);
    const maxColY = Math.floor((rect.x + rect.w - 0.5) / TILE_SIZE);
    const minRowY = Math.floor(rect.y / TILE_SIZE);
    const maxRowY = Math.floor((rect.y + rect.h - 0.01) / TILE_SIZE);

    for (let r = minRowY; r <= maxRowY; r++) {
      for (let c = minColY; c <= maxColY; c++) {
        const tile = this.getTile(c, r);
        const tileY = r * TILE_SIZE;
        if (tile === "solid") {
          if (vy > 0) {
            rect.y = tileY - rect.h;
            res.hitBottom = true;
          } else if (vy < 0) {
            rect.y = tileY + TILE_SIZE;
            res.hitTop = true;
          }
        } else if (tile === "oneway" && vy >= 0 && !options.dropThroughOneWay) {
          if (prevBottom <= tileY + 3 && rect.y + rect.h >= tileY) {
            rect.y = tileY - rect.h;
            res.hitBottom = true;
            res.onOneWay = true;
          }
        }
      }
    }

    for (let i = 0; i < extraSolids.length; i++) {
      const s = extraSolids[i];
      if (aabbOverlap(rect, s)) {
        if (vy > 0) {
          rect.y = s.y - rect.h;
          res.hitBottom = true;
        } else if (vy < 0) {
          rect.y = s.y + s.h;
          res.hitTop = true;
        }
      }
    }

    return res;
  }

  public renderVisibleTiles(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    theme: VrCorpTheme,
    buildFraction = 1,
    blackout = false
  ): void {
    const startCol = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endCol = Math.min(this.cols - 1, Math.floor((camX + viewW) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE_SIZE));
    const endRow = Math.min(this.rows - 1, Math.floor((camY + viewH) / TILE_SIZE) + 1);
    const maxScore = this.cols + this.rows * 0.65;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = this.grid[r][c];
        if (tile === "empty") continue;

        let wireOnly = false;
        if (buildFraction < 1) {
          const threshold = (c + r * 0.65) / Math.max(1, maxScore);
          if (threshold > buildFraction + 0.14) continue;
          if (threshold > buildFraction) wireOnly = true;
        }

        const sx = Math.round(c * TILE_SIZE - camX);
        const sy = Math.round(r * TILE_SIZE - camY);

        if (wireOnly) {
          ctx.strokeStyle = theme.primary;
          ctx.lineWidth = 1;
          ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_SIZE - 1, tile === "oneway" ? 5 : TILE_SIZE - 1);
          ctx.fillStyle = theme.secondary;
          ctx.fillRect(sx + 6, sy + (tile === "oneway" ? 2 : 6), 4, 2);
          continue;
        }

        if (tile === "solid") {
          const aboveEmpty = this.getTile(c, r - 1) !== "solid";
          const belowEmpty = this.getTile(c, r + 1) !== "solid";
          const leftEmpty = this.getTile(c - 1, r) !== "solid";
          const rightEmpty = this.getTile(c + 1, r) !== "solid";

          ctx.fillStyle = blackout ? "#05060b" : theme.tileCore;
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = blackout ? "#020306" : theme.tileRecess;
          ctx.fillRect(sx + 2, sy + 2, TILE_SIZE - 4, TILE_SIZE - 4);

          if (!blackout) {
            ctx.fillStyle = theme.tileWire;
            ctx.globalAlpha = 0.28;
            ctx.fillRect(sx + 3, sy + 3, 2, 2);
            ctx.fillRect(sx + TILE_SIZE - 5, sy + 3, 2, 2);
            ctx.fillRect(sx + 3, sy + TILE_SIZE - 5, 2, 2);
            ctx.fillRect(sx + TILE_SIZE - 5, sy + TILE_SIZE - 5, 2, 2);
            if ((c + r) % 3 === 0) {
              ctx.fillRect(sx + 5, sy + 7, 6, 1);
            }
            ctx.globalAlpha = 1;
          }

          if (aboveEmpty) {
            ctx.fillStyle = blackout ? "#141822" : theme.tileRim;
            ctx.fillRect(sx, sy, TILE_SIZE, 2);
            if (!blackout) {
              ctx.fillStyle = "#ffffff";
              ctx.globalAlpha = 0.45;
              ctx.fillRect(sx, sy, TILE_SIZE, 1);
              ctx.globalAlpha = 1;
              if ((c + r) % 5 === 0) {
                ctx.fillStyle = theme.secondary;
                ctx.fillRect(sx + 2, sy + 1, 5, 1);
              }
            }
          }
          if (belowEmpty && !blackout) {
            ctx.fillStyle = theme.tileWire;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(sx + 1, sy + TILE_SIZE - 1, TILE_SIZE - 2, 1);
            ctx.globalAlpha = 1;
          }
          if (leftEmpty && !blackout) {
            ctx.fillStyle = theme.tileRim;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(sx, sy, 1, TILE_SIZE);
            ctx.globalAlpha = 1;
          }
          if (rightEmpty && !blackout) {
            ctx.fillStyle = theme.tileWire;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(sx + TILE_SIZE - 1, sy, 1, TILE_SIZE);
            ctx.globalAlpha = 1;
          }
        } else if (tile === "oneway") {
          ctx.fillStyle = blackout ? "#121620" : theme.onewayTop;
          ctx.fillRect(sx, sy, TILE_SIZE, 2);
          ctx.fillStyle = blackout ? "#07090e" : "#0b1020";
          ctx.fillRect(sx, sy + 2, TILE_SIZE, 4);
          if (!blackout) {
            ctx.fillStyle = theme.onewayGlow;
            for (let px = 1; px < TILE_SIZE; px += 4) {
              ctx.fillRect(sx + px, sy + 3, 2, 1);
            }
          }
        }
      }
    }
  }
}

export function aabbOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
