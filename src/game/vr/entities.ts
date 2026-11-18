import { DOOR_COLORS, TILE_SIZE } from "./themes";
import type { Tilemap } from "./tilemap";
import type { ButtonDef, DoorColor, DoorDef, ElevatorDef, PickupKind, PropKind, Rect, VrCorpTheme, WeaponId } from "./types";

export class Bullet {
  public active = true;
  public x: number;
  public y: number;
  public prevX: number;
  public prevY: number;
  public vx: number;
  public vy: number;
  public w: number;
  public h: number;
  public fromPlayer: boolean;
  public damage: number;
  public knockback: number;
  public color: string;
  public life: number;

  constructor(opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    fromPlayer: boolean;
    damage: number;
    knockback: number;
    color: string;
    size?: number;
    life?: number;
  }) {
    this.x = opts.x;
    this.y = opts.y;
    this.prevX = opts.x;
    this.prevY = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    const sz = opts.size ?? (opts.fromPlayer ? 5 : 4);
    this.w = sz;
    this.h = opts.fromPlayer ? 3 : 4;
    this.fromPlayer = opts.fromPlayer;
    this.damage = opts.damage;
    this.knockback = opts.knockback;
    this.color = opts.color;
    this.life = opts.life ?? 1.45;
  }

  public getRect(): Rect {
    return { x: this.x - this.w * 0.5, y: this.y - this.h * 0.5, w: this.w, h: this.h };
  }

  public update(dt: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.active = false;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const px = Math.round(this.prevX - camX);
    const py = Math.round(this.prevY - camY);

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx - 1, sy - 1, 3, 2);
  }
}

export class Door {
  public readonly id: string;
  public readonly color: DoorColor;
  public readonly x: number;
  public readonly y: number;
  public readonly w: number;
  public readonly h: number;
  public readonly timedSeconds: number | null;
  public openAmount = 0;
  public isOpen = false;
  public timerRemaining = 0;
  public pulseTime = 0;

  constructor(def: DoorDef) {
    this.id = def.id;
    this.color = def.color;
    this.x = def.col * TILE_SIZE + 3;
    this.y = def.topRow * TILE_SIZE;
    this.w = TILE_SIZE - 6;
    this.h = def.heightTiles * TILE_SIZE;
    this.timedSeconds = def.timedSeconds;
  }

  public open(onPlaySlide?: (opening: boolean) => void): void {
    if (!this.isOpen) {
      this.isOpen = true;
      onPlaySlide?.(true);
    }
    if (this.timedSeconds !== null) {
      this.timerRemaining = this.timedSeconds;
    }
  }

  public forceHoldOpen(): void {
    this.isOpen = true;
    this.timerRemaining = 999;
  }

  public isBlocking(): boolean {
    return this.openAmount < 0.72;
  }

  public getSolidRect(): Rect | null {
    if (!this.isBlocking()) return null;
    const closedH = Math.round(this.h * (1 - this.openAmount));
    if (closedH <= 2) return null;
    return { x: this.x, y: this.y, w: this.w, h: closedH };
  }

  public update(
    dt: number,
    playerRect: Rect,
    onPlaySlide?: (opening: boolean) => void,
    onTimerTick?: () => void
  ): void {
    this.pulseTime += dt;
    if (this.isOpen && this.timedSeconds !== null && this.timerRemaining < 900) {
      const prevSec = Math.ceil(this.timerRemaining);
      this.timerRemaining -= dt;
      const nextSec = Math.ceil(this.timerRemaining);
      if (this.timerRemaining > 0 && this.timerRemaining <= 5 && nextSec !== prevSec) {
        onTimerTick?.();
      }
      if (this.timerRemaining <= 0) {
        this.timerRemaining = 0;
        const doorway: Rect = { x: this.x - 2, y: this.y, w: this.w + 4, h: this.h };
        const overlapPlayer =
          playerRect.x < doorway.x + doorway.w &&
          playerRect.x + playerRect.w > doorway.x &&
          playerRect.y < doorway.y + doorway.h &&
          playerRect.y + playerRect.h > doorway.y;
        if (!overlapPlayer) {
          this.isOpen = false;
          onPlaySlide?.(false);
        }
      }
    }

    const target = this.isOpen ? 1 : 0;
    const speed = 3.2;
    if (this.openAmount < target) {
      this.openAmount = Math.min(1, this.openAmount + speed * dt);
    } else if (this.openAmount > target) {
      this.openAmount = Math.max(0, this.openAmount - speed * dt);
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, blackout = false): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const palette = DOOR_COLORS[this.color];

    ctx.fillStyle = blackout ? "#11141e" : "#1c243c";
    ctx.fillRect(sx - 2, sy - 4, this.w + 4, 4);
    ctx.fillStyle = blackout ? "#45141e" : palette.main;
    ctx.fillRect(sx, sy - 3, this.w, 2);

    const closedH = Math.round(this.h * (1 - this.openAmount));
    if (closedH > 0) {
      ctx.fillStyle = blackout ? "#05060b" : "rgba(10, 14, 28, 0.86)";
      ctx.fillRect(sx, sy, this.w, closedH);

      ctx.strokeStyle = palette.main;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, this.w - 1, closedH - 1);

      const pulse = 0.55 + 0.45 * Math.sin(this.pulseTime * 6);
      ctx.globalAlpha = blackout ? 0.35 : pulse;
      ctx.fillStyle = palette.main;
      for (let py = sy + 4; py < sy + closedH - 3; py += 6) {
        ctx.fillRect(sx + 2, py, this.w - 4, 2);
      }
      ctx.globalAlpha = 1;
    }
  }
}

export class ButtonTerminal {
  public readonly id: string;
  public readonly color: DoorColor;
  public readonly x: number;
  public readonly y: number;
  public readonly w = 16;
  public readonly h = 24;
  public readonly label: string;
  public activated = false;
  public cooldownFlash = 0;

  constructor(def: ButtonDef) {
    this.id = def.id;
    this.color = def.color;
    this.x = def.col * TILE_SIZE;
    this.y = def.row * TILE_SIZE - this.h;
    this.label = def.label;
  }

  public getInteractRect(): Rect {
    return { x: this.x - 10, y: this.y - 6, w: this.w + 20, h: this.h + 10 };
  }

  public trigger(): void {
    this.activated = true;
    this.cooldownFlash = 0.35;
  }

  public update(dt: number): void {
    if (this.cooldownFlash > 0) this.cooldownFlash -= dt;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number, blackout = false): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const palette = DOOR_COLORS[this.color];

    // Holographic pylon frame
    ctx.fillStyle = blackout ? "#0b0d14" : "#182038";
    ctx.fillRect(sx + 3, sy + 10, 10, 14);
    ctx.strokeStyle = this.activated ? "#39ff14" : palette.main;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 1.5, sy + 1.5, 13, 12);

    ctx.fillStyle = "#060812";
    ctx.fillRect(sx + 2, sy + 2, 12, 11);

    const screenColor = this.cooldownFlash > 0 ? "#ffffff" : this.activated ? "#39ff14" : palette.main;
    ctx.fillStyle = screenColor;
    ctx.fillRect(sx + 4, sy + 4, 8, 3);
    ctx.fillRect(sx + 4, sy + 9, 5, 2);

    const bob = Math.round(Math.sin(time * 5 + this.x * 0.1) * 2);
    ctx.fillStyle = this.activated ? "#39ff14" : palette.glow;
    ctx.fillRect(sx + 6, sy - 6 + bob, 4, 4);
  }
}

export class Elevator {
  public readonly id: string;
  public readonly x: number;
  public y: number;
  public prevY: number;
  public readonly w: number;
  public readonly h = 10;
  public readonly topY: number;
  public readonly bottomY: number;
  public readonly speed: number;
  public targetY: number;
  public moving = false;
  public riderDwell = 0;
  private awaitingExit = false;

  constructor(def: ElevatorDef) {
    this.id = def.id;
    this.x = def.col * TILE_SIZE;
    this.w = def.widthTiles * TILE_SIZE;
    this.topY = def.topRow * TILE_SIZE;
    this.bottomY = def.bottomRow * TILE_SIZE;
    this.y = this.bottomY;
    this.prevY = this.y;
    this.targetY = this.bottomY;
    this.speed = def.speed;
  }

  public getRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  public toggleDirection(onStartMove?: () => void): void {
    const distTop = Math.abs(this.y - this.topY);
    const distBot = Math.abs(this.y - this.bottomY);
    this.targetY = distTop < distBot ? this.bottomY : this.topY;
    if (Math.abs(this.targetY - this.y) > 1) {
      this.moving = true;
      this.riderDwell = 0;
      onStartMove?.();
    }
  }

  public callToFloor(floorY: number, onStartMove?: () => void): void {
    const desired = Math.abs(floorY - this.topY) < Math.abs(floorY - this.bottomY) ? this.topY : this.bottomY;
    if (Math.abs(this.y - desired) > 2) {
      this.targetY = desired;
      this.moving = true;
      onStartMove?.();
    }
  }

  public isPlayerOnTop(playerRect: Rect): boolean {
    const horiz = playerRect.x + playerRect.w > this.x + 2 && playerRect.x < this.x + this.w - 2;
    const feet = playerRect.y + playerRect.h;
    return horiz && Math.abs(feet - this.y) <= 4;
  }

  public isNearCallSwitch(playerRect: Rect): number | null {
    const cx = playerRect.x + playerRect.w * 0.5;
    const cy = playerRect.y + playerRect.h;
    const inShaftX = cx >= this.x - 24 && cx <= this.x + this.w + 24;
    if (!inShaftX) return null;
    if (Math.abs(cy - this.topY) <= 22) return this.topY;
    if (Math.abs(cy - this.bottomY) <= 22) return this.bottomY;
    return null;
  }

  public update(dt: number, playerOnTop: boolean, onStartMove?: () => void): number {
    this.prevY = this.y;
    if (!playerOnTop) {
      this.riderDwell = 0;
      this.awaitingExit = false;
    } else if (!this.moving && !this.awaitingExit) {
      this.riderDwell += dt;
      if (this.riderDwell >= 0.42) {
        this.toggleDirection(onStartMove);
      }
    }

    if (this.moving) {
      const diff = this.targetY - this.y;
      const step = this.speed * dt;
      if (Math.abs(diff) <= step) {
        this.y = this.targetY;
        this.moving = false;
        this.awaitingExit = playerOnTop;
      } else {
        this.y += Math.sign(diff) * step;
      }
    }
    return this.y - this.prevY;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    time: number,
    theme: VrCorpTheme,
    blackout = false
  ): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const topScreenY = Math.round(this.topY - camY);
    const botScreenY = Math.round(this.bottomY - camY);

    ctx.fillStyle = blackout ? "#12151f" : theme.gridColor;
    ctx.fillRect(sx + 2, topScreenY - 12, 2, botScreenY - topScreenY + 22);
    ctx.fillRect(sx + this.w - 4, topScreenY - 12, 2, botScreenY - topScreenY + 22);

    const beacon = blackout ? "#ff2b45" : Math.sin(time * 4) > 0 ? theme.primary : theme.tileRecess;
    ctx.fillStyle = beacon;
    ctx.fillRect(sx - 4, topScreenY - 14, 3, 5);
    ctx.fillRect(sx + this.w + 1, botScreenY - 14, 3, 5);

    ctx.fillStyle = blackout ? "#161922" : theme.tileCore;
    ctx.fillRect(sx, sy + 2, this.w, this.h - 2);
    ctx.fillStyle = blackout ? "#303545" : theme.onewayTop;
    ctx.fillRect(sx, sy, this.w, 2);
    ctx.strokeStyle = blackout ? "#252936" : theme.primary;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, this.w - 1, this.h - 1);

    if (!blackout) {
      ctx.fillStyle = theme.secondary;
      for (let px = 5; px < this.w - 6; px += 10) {
        ctx.fillRect(sx + px, sy + 5, 4, 2);
      }
    }
    if (this.moving) {
      ctx.fillStyle = theme.ok;
      const dirArrowY = this.targetY < this.y ? sy + 2 : sy + 6;
      ctx.fillRect(sx + (this.w >> 1) - 2, dirArrowY, 4, 2);
    }
  }
}

export class Prop {
  public active = true;
  public readonly kind: PropKind;
  public readonly x: number;
  public readonly y: number;
  public readonly w: number;
  public readonly h: number;
  public hp: number;
  public flashTimer = 0;
  public readonly drop?: PickupKind;

  constructor(kind: PropKind, col: number, row: number, drop?: PickupKind) {
    this.kind = kind;
    this.w = kind === "monitor" ? 16 : 14;
    this.h = kind === "barrel" ? 18 : 16;
    this.x = col * TILE_SIZE + 1;
    this.y = row * TILE_SIZE - this.h;
    this.hp = kind === "barrel" ? 2 : 3;
    this.drop = drop;
  }

  public getRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  public render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    time: number,
    theme: VrCorpTheme,
    blackout = false
  ): void {
    if (!this.active) return;
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);

    if (this.flashTimer > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx, sy, this.w, this.h);
      return;
    }

    if (this.kind === "crate") {
      // VR Data Cache Cube
      ctx.fillStyle = blackout ? "#090b10" : "#111a2c";
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.strokeStyle = blackout ? "#202534" : theme.primary;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, this.w - 1, this.h - 1);
      if (!blackout) {
        ctx.fillStyle = theme.secondary;
        ctx.fillRect(sx + 5, sy + 7, 4, 2);
      }
    } else if (this.kind === "monitor") {
      // Holographic Node Terminal Prop
      ctx.fillStyle = blackout ? "#0a0c12" : theme.tileCore;
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.fillStyle = "#040812";
      ctx.fillRect(sx + 2, sy + 2, this.w - 4, 9);
      if (!blackout) {
        ctx.fillStyle = Math.sin(time * 9 + this.x) > 0 ? theme.primary : theme.secondary;
        ctx.fillRect(sx + 3, sy + 4, 7, 2);
        ctx.fillRect(sx + 3, sy + 7, 10, 1);
      }
      ctx.strokeStyle = blackout ? "#1c202c" : theme.tileRim;
      ctx.strokeRect(sx + 0.5, sy + 0.5, this.w - 1, this.h - 1);
    } else {
      // Volatile VR Capacitor Cell
      ctx.fillStyle = blackout ? "#18090c" : "#3a0e1b";
      ctx.fillRect(sx + 1, sy, this.w - 2, this.h);
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 1.5, sy + 0.5, this.w - 3, this.h - 1);
      ctx.fillStyle = Math.sin(time * 10 + this.x) > 0 ? theme.danger : "#ffb800";
      ctx.fillRect(sx + 3, sy + 7, this.w - 6, 3);
    }
  }
}

export class Pickup {
  public active = true;
  public readonly kind: PickupKind;
  public x: number;
  public y: number;
  public readonly w = 14;
  public readonly h = 12;
  /** Drops from enemies/props that spawn mid-air (or on the ceiling) sink slowly to the floor. */
  public falling: boolean;
  private static readonly FALL_SPEED = 34;

  constructor(kind: PickupKind, x: number, y: number, falling = false) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.falling = falling;
  }

  public update(dt: number, tilemap: Tilemap): void {
    if (!this.active || !this.falling) return;
    const rect: Rect = { x: this.x, y: this.y, w: this.w, h: this.h };
    const res = tilemap.moveAndCollide(rect, 0, Pickup.FALL_SPEED, dt);
    this.x = rect.x;
    this.y = rect.y;
    if (res.hitBottom) this.falling = false;
  }

  public getRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  public getWeaponId(): WeaponId | null {
    if (this.kind === "shotgun") return "shotgun";
    if (this.kind === "smg") return "smg";
    return null;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number): void {
    if (!this.active) return;
    const bob = Math.round(Math.sin(time * 5 + this.x * 0.1) * 2);
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY + bob);

    if (this.kind === "health") {
      ctx.fillStyle = "#081e18";
      ctx.fillRect(sx + 1, sy + 1, 12, 10);
      ctx.strokeStyle = "#39ff14";
      ctx.strokeRect(sx + 1.5, sy + 1.5, 11, 9);
      ctx.fillStyle = "#39ff14";
      ctx.fillRect(sx + 5, sy + 3, 4, 6);
      ctx.fillRect(sx + 3, sy + 4, 8, 4);
    } else if (this.kind === "shotgun") {
      ctx.fillStyle = "#161224";
      ctx.fillRect(sx, sy + 2, 14, 8);
      ctx.strokeStyle = "#ff9500";
      ctx.strokeRect(sx + 0.5, sy + 2.5, 13, 7);
      ctx.fillStyle = "#ff9500";
      ctx.fillRect(sx + 2, sy + 4, 10, 3);
    } else if (this.kind === "smg") {
      ctx.fillStyle = "#0e1a28";
      ctx.fillRect(sx, sy + 2, 14, 8);
      ctx.strokeStyle = "#00f0ff";
      ctx.strokeRect(sx + 0.5, sy + 2.5, 13, 7);
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(sx + 2, sy + 4, 10, 2);
      ctx.fillRect(sx + 6, sy + 6, 2, 3);
    } else {
      ctx.fillStyle = "#1e1a0c";
      ctx.fillRect(sx + 1, sy + 2, 12, 9);
      ctx.strokeStyle = "#ffe600";
      ctx.strokeRect(sx + 1.5, sy + 2.5, 11, 8);
      ctx.fillStyle = "#ffe600";
      ctx.fillRect(sx + 3, sy + 4, 2, 5);
      ctx.fillRect(sx + 6, sy + 4, 2, 5);
      ctx.fillRect(sx + 9, sy + 4, 2, 5);
    }
  }
}
