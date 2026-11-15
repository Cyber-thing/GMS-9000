import { Bullet } from "./entities";
import { renderVrDaemonSprite, renderVrSentrySprite, renderVrWardenSprite } from "./sprites";
import { PHYSICS, TILE_SIZE } from "./themes";
import type { Tilemap } from "./tilemap";
import type { EnemyAIState, EnemyKind, EnemyVariant, EnemySpawnDef, PickupKind, Rect, TierTuning, VrCorpTheme } from "./types";

export abstract class Enemy {
  public readonly kind: EnemyKind;
  public readonly variant: EnemyVariant;
  public x: number;
  public y: number;
  public readonly w: number;
  public readonly h: number;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1;
  public state: EnemyAIState = "patrol";
  public stateTimer = 0;
  public hp: number;
  public maxHp: number;
  public hitFlashTimer = 0;
  public deadTimer = 0;
  public removed = false;
  public dropSpawned = false;
  public animTime = Math.random() * 10;

  protected readonly patrolMinX: number;
  protected readonly patrolMaxX: number;
  protected readonly baseY: number;
  protected readonly fireRateMult: number;
  protected readonly bulletSpeedMult: number;

  constructor(def: EnemySpawnDef, w: number, h: number, baseHp: number, tuning: TierTuning) {
    this.kind = def.kind;
    this.w = w;
    this.h = h;
    this.x = def.col * TILE_SIZE;
    this.y = def.kind === "turret" ? def.row * TILE_SIZE : def.row * TILE_SIZE - h;
    this.baseY = this.y;
    this.facing = def.facing;
    this.variant = def.variant ?? "std";
    this.hp = baseHp + tuning.enemyHpBonus + (this.variant === "plated" ? 2 : 0);
    this.maxHp = this.hp;
    this.patrolMinX = def.patrolMinCol * TILE_SIZE;
    this.patrolMaxX = def.patrolMaxCol * TILE_SIZE;
    this.fireRateMult = tuning.enemyFireRateMult * (this.variant === "swift" ? 0.75 : 1);
    this.bulletSpeedMult = tuning.enemyBulletSpeedMult * (this.variant === "volley" ? 1.18 : 1);
  }

  public getRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  public isAlive(): boolean {
    return this.state !== "dead";
  }

  public takeDamage(dmg: number, knockbackX: number): boolean {
    if (this.state === "dead") return false;
    this.hp -= dmg;
    this.hitFlashTimer = 0.06;
    if (this.kind !== "turret") {
      this.vx += knockbackX * 0.55;
    }
    if (this.state === "patrol" || this.state === "retreat") {
      this.state = "alert";
      this.stateTimer = 0.25 * this.fireRateMult;
      this.facing = knockbackX > 0 ? -1 : 1;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = "dead";
      this.deadTimer = 0.3;
      this.vy = this.kind === "turret" ? 0 : -105;
      return true;
    }
    return false;
  }

  public rollDrop(): PickupKind | null {
    const r = Math.random();
    if (r < 0.24) return "health";
    if (r < 0.45) return "ammo";
    return null;
  }

  protected hasFloorAhead(tilemap: Tilemap, dir: 1 | -1): boolean {
    const probeX = dir === 1 ? this.x + this.w + 3 : this.x - 3;
    const probeY = this.y + this.h + 4;
    const col = Math.floor(probeX / TILE_SIZE);
    const row = Math.floor(probeY / TILE_SIZE);
    return tilemap.getTile(col, row) !== "empty";
  }

  protected renderTelegraph(ctx: CanvasRenderingContext2D, sx: number, sy: number, color: string): void {
    if (this.state === "alert") {
      ctx.fillStyle = color;
      ctx.fillRect(sx + (this.w >> 1) - 1, sy - 9, 2, 4);
      ctx.fillRect(sx + (this.w >> 1) - 1, sy - 4, 2, 2);
    }
    if (this.hp < this.maxHp && this.state !== "dead") {
      const bw = Math.max(12, this.w);
      const bx = sx + ((this.w - bw) >> 1);
      ctx.fillStyle = "#04060d";
      ctx.fillRect(bx - 1, sy - 5, bw + 2, 3);
      ctx.fillStyle = color;
      ctx.fillRect(bx, sy - 4, Math.max(1, Math.round((this.hp / this.maxHp) * bw)), 1);
    }
  }

  public abstract updateAI(
    dt: number,
    playerRect: Rect,
    tilemap: Tilemap,
    blockingRects: Rect[],
    onShoot: (bullets: Bullet[]) => void
  ): void;

  public abstract render(ctx: CanvasRenderingContext2D, camX: number, camY: number, theme: VrCorpTheme): void;
}

export class IceSentry extends Enemy {
  private shotsLeft = 0;
  private shotCd = 0;

  constructor(def: EnemySpawnDef, tuning: TierTuning) {
    super(def, 14, 26, 3, tuning);
  }

  public updateAI(
    dt: number,
    playerRect: Rect,
    tilemap: Tilemap,
    blockingRects: Rect[],
    onShoot: (bullets: Bullet[]) => void
  ): void {
    this.animTime += dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.vy = Math.min(PHYSICS.maxFallSpeed, this.vy + PHYSICS.gravity * dt);
      const r = this.getRect();
      tilemap.moveAndCollide(r, this.vx, this.vy, dt, { extraSolids: blockingRects });
      this.x = r.x;
      this.y = r.y;
      if (this.deadTimer <= 0) this.removed = true;
      return;
    }

    const px = playerRect.x + playerRect.w * 0.5;
    const py = playerRect.y + playerRect.h * 0.5;
    const cx = this.x + this.w * 0.5;
    const cy = this.y + 10;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    const hasSight =
      dist <= 220 &&
      Math.abs(dy) <= 75 &&
      tilemap.hasLineOfSight(cx, cy, px, py, blockingRects);

    switch (this.state) {
      case "patrol": {
        this.vx = this.facing * 42;
        if (
          this.x <= this.patrolMinX ||
          this.x >= this.patrolMaxX ||
          !this.hasFloorAhead(tilemap, this.facing)
        ) {
          this.facing = this.facing === 1 ? -1 : 1;
          this.vx = this.facing * 42;
        }
        if (hasSight) {
          this.facing = dx >= 0 ? 1 : -1;
          this.state = "alert";
          this.stateTimer = 0.44 * this.fireRateMult;
          this.vx = 0;
        }
        break;
      }
      case "alert": {
        this.facing = dx >= 0 ? 1 : -1;
        this.vx *= 0.8;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "attack";
          this.shotsLeft = 2;
          this.shotCd = 0;
          this.stateTimer = 0.55;
        }
        break;
      }
      case "attack": {
        this.facing = dx >= 0 ? 1 : -1;
        this.vx *= 0.85;
        this.shotCd -= dt;
        if (this.shotsLeft > 0 && this.shotCd <= 0) {
          this.shotsLeft--;
          this.shotCd = 0.2 * this.fireRateMult;
          const spd = 215 * this.bulletSpeedMult;
          const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.07;
          onShoot([
            new Bullet({
              x: cx + this.facing * 8,
              y: cy,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              fromPlayer: false,
              damage: 1,
              knockback: 80,
              color: "#ff2a85",
            }),
          ]);
        }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "retreat";
          this.stateTimer = 0.68 * this.fireRateMult;
        }
        break;
      }
      case "retreat": {
        const moveBack = dx >= 0 ? -1 : 1;
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = this.hasFloorAhead(tilemap, moveBack) ? moveBack * 48 : 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = hasSight ? "alert" : "patrol";
          this.stateTimer = 0.35;
        }
        break;
      }
    }

    this.vy = Math.min(PHYSICS.maxFallSpeed, this.vy + PHYSICS.gravity * dt);
    const rect = this.getRect();
    const col = tilemap.moveAndCollide(rect, this.vx, this.vy, dt, { extraSolids: blockingRects });
    this.x = rect.x;
    this.y = rect.y;
    if (col.hitBottom) this.vy = 0;
    if ((col.hitLeft || col.hitRight) && this.state === "patrol") {
      this.facing = this.facing === 1 ? -1 : 1;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, theme: VrCorpTheme): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    if (this.state === "dead") {
      ctx.globalAlpha = Math.max(0, this.deadTimer / 0.3);
    }
    const frameIdx = Math.floor(this.animTime * 10) % 6;
    renderVrSentrySprite(ctx, sx, sy, this.w, this.h, this.facing, this.state, frameIdx, this.hitFlashTimer > 0, theme);
    this.renderTelegraph(ctx, sx, sy, theme.enemyAccent);
    ctx.globalAlpha = 1;
  }
}

export class BastionWarden extends Enemy {
  private fireCooldown = 0;

  constructor(def: EnemySpawnDef, tuning: TierTuning) {
    super(def, 18, 30, 5, tuning);
  }

  public updateAI(
    dt: number,
    playerRect: Rect,
    tilemap: Tilemap,
    blockingRects: Rect[],
    onShoot: (bullets: Bullet[]) => void
  ): void {
    this.animTime += dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.vy = Math.min(PHYSICS.maxFallSpeed, this.vy + PHYSICS.gravity * dt);
      const r = this.getRect();
      tilemap.moveAndCollide(r, this.vx, this.vy, dt, { extraSolids: blockingRects });
      this.x = r.x;
      this.y = r.y;
      if (this.deadTimer <= 0) this.removed = true;
      return;
    }

    const px = playerRect.x + playerRect.w * 0.5;
    const py = playerRect.y + playerRect.h * 0.5;
    const cx = this.x + this.w * 0.5;
    const cy = this.y + 12;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    const hasSight =
      dist <= 230 &&
      Math.abs(dy) <= 82 &&
      tilemap.hasLineOfSight(cx, cy, px, py, blockingRects);

    switch (this.state) {
      case "patrol": {
        this.vx = this.facing * 26;
        if (
          this.x <= this.patrolMinX ||
          this.x >= this.patrolMaxX ||
          !this.hasFloorAhead(tilemap, this.facing)
        ) {
          this.facing = this.facing === 1 ? -1 : 1;
        }
        if (hasSight) {
          this.facing = dx >= 0 ? 1 : -1;
          this.state = "alert";
          this.stateTimer = 0.56 * this.fireRateMult;
          this.vx = 0;
        }
        break;
      }
      case "alert": {
        this.facing = dx >= 0 ? 1 : -1;
        this.vx *= 0.8;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "attack";
          this.fireCooldown = 0;
          this.stateTimer = 0.52;
        }
        break;
      }
      case "attack": {
        this.facing = dx >= 0 ? 1 : -1;
        this.vx *= 0.85;
        if (this.fireCooldown <= 0) {
          this.fireCooldown = 1.0 * this.fireRateMult;
          const baseAng = Math.atan2(dy, dx);
          const spd = 200 * this.bulletSpeedMult;
          const pellets: Bullet[] = [];
          for (let i = -1; i <= 1; i++) {
            const ang = baseAng + i * 0.14;
            pellets.push(
              new Bullet({
                x: cx + this.facing * 10,
                y: cy,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                fromPlayer: false,
                damage: 1,
                knockback: 110,
                color: "#ff9500",
                size: 5,
              })
            );
          }
          onShoot(pellets);
        }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "retreat";
          this.stateTimer = 0.85 * this.fireRateMult;
        }
        break;
      }
      case "retreat": {
        const dir = dist > 110 ? (dx >= 0 ? 1 : -1) : dx >= 0 ? -1 : 1;
        this.facing = dx >= 0 ? 1 : -1;
        this.vx = this.hasFloorAhead(tilemap, dir) ? dir * 28 : 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = hasSight ? "alert" : "patrol";
          this.stateTimer = 0.4;
        }
        break;
      }
    }

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    this.vy = Math.min(PHYSICS.maxFallSpeed, this.vy + PHYSICS.gravity * dt);
    const rect = this.getRect();
    const col = tilemap.moveAndCollide(rect, this.vx, this.vy, dt, { extraSolids: blockingRects });
    this.x = rect.x;
    this.y = rect.y;
    if (col.hitBottom) this.vy = 0;
    if ((col.hitLeft || col.hitRight) && this.state === "patrol") {
      this.facing = this.facing === 1 ? -1 : 1;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, theme: VrCorpTheme): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    if (this.state === "dead") {
      ctx.globalAlpha = Math.max(0, this.deadTimer / 0.3);
    }
    const frameIdx = Math.floor(this.animTime * 8) % 6;
    renderVrWardenSprite(ctx, sx, sy, this.w, this.h, this.facing, this.state, frameIdx, this.hitFlashTimer > 0, theme);
    if (this.state === "alert") {
      ctx.fillStyle = "rgba(255, 149, 0, 0.55)";
      const lx = this.facing === 1 ? sx + 18 : sx - 55;
      ctx.fillRect(lx, sy + 12, 55, 1);
    }
    this.renderTelegraph(ctx, sx, sy, theme.secondary);
    ctx.globalAlpha = 1;
  }
}

export class SeekerDaemon extends Enemy {
  private burstLeft = 0;
  private burstCd = 0;

  constructor(def: EnemySpawnDef, tuning: TierTuning) {
    super(def, 16, 14, 3, tuning);
  }

  public updateAI(
    dt: number,
    playerRect: Rect,
    tilemap: Tilemap,
    blockingRects: Rect[],
    onShoot: (bullets: Bullet[]) => void
  ): void {
    this.animTime += dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    if (this.state === "dead") {
      this.deadTimer -= dt;
      this.y += 60 * dt;
      if (this.deadTimer <= 0) this.removed = true;
      return;
    }

    const px = playerRect.x + playerRect.w * 0.5;
    const py = playerRect.y + playerRect.h * 0.5;
    const cx = this.x + this.w * 0.5;
    const cy = this.y + this.h * 0.5;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    const hasSight = dist <= 235 && tilemap.hasLineOfSight(cx, cy, px, py, blockingRects);
    const hoverY = this.baseY + Math.sin(this.animTime * 3.4) * 7;

    switch (this.state) {
      case "patrol": {
        this.vx = this.facing * 54;
        this.x += this.vx * dt;
        this.y += (hoverY - this.y) * Math.min(1, 6 * dt);
        if (this.x <= this.patrolMinX) this.facing = 1;
        if (this.x >= this.patrolMaxX) this.facing = -1;
        if (hasSight) {
          this.facing = dx >= 0 ? 1 : -1;
          this.state = "alert";
          this.stateTimer = 0.42 * this.fireRateMult;
        }
        break;
      }
      case "alert": {
        this.facing = dx >= 0 ? 1 : -1;
        this.y += (hoverY - this.y) * Math.min(1, 6 * dt);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "attack";
          this.burstLeft = 3;
          this.burstCd = 0;
          this.stateTimer = 0.7;
        }
        break;
      }
      case "attack": {
        this.facing = dx >= 0 ? 1 : -1;
        this.y += (hoverY - this.y) * Math.min(1, 6 * dt);
        this.burstCd -= dt;
        if (this.burstLeft > 0 && this.burstCd <= 0) {
          this.burstLeft--;
          this.burstCd = 0.14 * this.fireRateMult;
          const spd = 215 * this.bulletSpeedMult;
          const ang = Math.atan2(dy, dx);
          onShoot([
            new Bullet({
              x: cx,
              y: cy + 2,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              fromPlayer: false,
              damage: 1,
              knockback: 75,
              color: "#00f0ff",
            }),
          ]);
        }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "retreat";
          this.stateTimer = 0.75 * this.fireRateMult;
        }
        break;
      }
      case "retreat": {
        const away = dx >= 0 ? -1 : 1;
        this.x += away * 66 * dt;
        this.x = Math.max(this.patrolMinX, Math.min(this.patrolMaxX, this.x));
        this.y += (hoverY - 8 - this.y) * Math.min(1, 5 * dt);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = hasSight ? "alert" : "patrol";
          this.stateTimer = 0.38;
        }
        break;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, theme: VrCorpTheme): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    if (this.state === "dead") {
      ctx.globalAlpha = Math.max(0, this.deadTimer / 0.3);
    }
    const frameIdx = Math.floor(this.animTime * 16) % 6;
    renderVrDaemonSprite(ctx, sx, sy, this.facing, this.state, frameIdx, this.hitFlashTimer > 0, theme);
    this.renderTelegraph(ctx, sx, sy, theme.primary);
    ctx.globalAlpha = 1;
  }
}

export class NodeTurret extends Enemy {
  private aimAngle = Math.PI / 2;
  private burstLeft = 0;
  private burstCd = 0;

  constructor(def: EnemySpawnDef, tuning: TierTuning) {
    super(def, 16, 14, 4, tuning);
  }

  public updateAI(
    dt: number,
    playerRect: Rect,
    tilemap: Tilemap,
    blockingRects: Rect[],
    onShoot: (bullets: Bullet[]) => void
  ): void {
    this.animTime += dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    if (this.state === "dead") {
      this.deadTimer -= dt;
      if (this.deadTimer <= 0) this.removed = true;
      return;
    }

    const px = playerRect.x + playerRect.w * 0.5;
    const py = playerRect.y + playerRect.h * 0.5;
    const cx = this.x + this.w * 0.5;
    const cy = this.y + 9;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.hypot(dx, dy);
    const hasSight = dist <= 245 && dy > -12 && tilemap.hasLineOfSight(cx, cy, px, py, blockingRects);

    switch (this.state) {
      case "patrol": {
        this.aimAngle = Math.PI / 2 + Math.sin(this.animTime * 2) * 0.65;
        if (hasSight) {
          this.aimAngle = Math.atan2(dy, dx);
          this.state = "alert";
          this.stateTimer = 0.45 * this.fireRateMult;
        }
        break;
      }
      case "alert": {
        this.aimAngle = Math.atan2(dy, dx);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "attack";
          this.burstLeft = 3;
          this.burstCd = 0;
          this.stateTimer = 0.65;
        }
        break;
      }
      case "attack": {
        this.burstCd -= dt;
        if (this.burstLeft > 0 && this.burstCd <= 0) {
          this.burstLeft--;
          this.burstCd = 0.13 * this.fireRateMult;
          const spd = 230 * this.bulletSpeedMult;
          onShoot([
            new Bullet({
              x: cx + Math.cos(this.aimAngle) * 8,
              y: cy + Math.sin(this.aimAngle) * 8,
              vx: Math.cos(this.aimAngle) * spd,
              vy: Math.sin(this.aimAngle) * spd,
              fromPlayer: false,
              damage: 1,
              knockback: 70,
              color: "#ff2b45",
            }),
          ]);
        }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "retreat";
          this.stateTimer = 0.85 * this.fireRateMult;
        }
        break;
      }
      case "retreat": {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = hasSight ? "alert" : "patrol";
          this.stateTimer = 0.4;
        }
        break;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, theme: VrCorpTheme): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    if (this.state === "dead") {
      ctx.globalAlpha = Math.max(0, this.deadTimer / 0.3);
    }
    if (this.hitFlashTimer > 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx, sy, this.w, this.h);
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = theme.tileCore;
    ctx.fillRect(sx + 1, sy, 14, 5);
    ctx.strokeStyle = theme.enemyAccent;
    ctx.strokeRect(sx + 1.5, sy + 0.5, 13, 5);
    ctx.fillStyle = theme.tileRecess;
    ctx.fillRect(sx + 3, sy + 5, 10, 6);

    const cx = sx + 8;
    const cy = sy + 9;
    const bx = Math.round(cx + Math.cos(this.aimAngle) * 9);
    const by = Math.round(cy + Math.sin(this.aimAngle) * 9);
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(bx, by);
    ctx.stroke();

    if (this.state === "alert") {
      ctx.strokeStyle = "rgba(255, 43, 69, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(this.aimAngle) * 70, cy + Math.sin(this.aimAngle) * 70);
      ctx.stroke();
    }

    ctx.fillStyle = this.state === "alert" || this.state === "attack" ? theme.danger : theme.secondary;
    ctx.fillRect(sx + 6, sy + 6, 4, 3);
    ctx.globalAlpha = 1;
  }
}

export function createEnemy(def: EnemySpawnDef, tuning: TierTuning): Enemy {
  switch (def.kind) {
    case "thug":
      return new IceSentry(def, tuning);
    case "heavy":
      return new BastionWarden(def, tuning);
    case "drone":
      return new SeekerDaemon(def, tuning);
    case "turret":
      return new NodeTurret(def, tuning);
  }
}
