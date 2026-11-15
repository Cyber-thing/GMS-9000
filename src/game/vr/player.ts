import { Bullet } from "./entities";
import { renderVrRunnerSprite, type HackerAnimState } from "./sprites";
import { PHYSICS, WEAPONS } from "./themes";
import type { Tilemap } from "./tilemap";
import type { AimMode, InputSnapshot, Rect, VrCorpTheme, WeaponId } from "./types";

export interface PlayerAfterimage {
  x: number;
  y: number;
  facing: 1 | -1;
  alpha: number;
  crouching: boolean;
  aimMode: AimMode;
  weapon: WeaponId;
  frameIdx: number;
}

export class Player {
  public x: number;
  public y: number;
  public w: number = PHYSICS.playerStandW;
  public h: number = PHYSICS.playerStandH;
  public vx = 0;
  public vy = 0;
  public facing: 1 | -1 = 1;
  public grounded = false;
  public onOneWay = false;
  public crouching = false;
  public aimMode: AimMode = "straight";

  public coyoteTimer = 0;
  public jumpBufferTimer = 0;
  public dropThroughTimer = 0;

  public dashTimer = 0;
  public dashCooldownTimer = 0;
  public dashDir: 1 | -1 = 1;
  public meleeHitIds = new Set<object>();

  public hp: number;
  public maxHp: number;
  public invulnTimer = 0;

  public weapon: WeaponId = "pistol";
  public unlockedWeapons: WeaponId[] = ["pistol"];
  public ammo: Record<WeaponId, number> = {
    pistol: Infinity,
    shotgun: 0,
    smg: 0,
  };
  public fireCooldown = 0;
  public muzzleFlashTimer = 0;
  public muzzleX = 0;
  public muzzleY = 0;

  public animState: HackerAnimState = "idle";
  public animFrame = 0;
  public animClock = 0;
  public runDist = 0;
  public scaleX = 1;
  public scaleY = 1;
  public recoilOffset = 0;
  public afterimages: PlayerAfterimage[] = [];

  constructor(spawnX: number, spawnYFeet: number, maxHp = 5) {
    this.x = spawnX;
    this.y = spawnYFeet - PHYSICS.playerStandH;
    this.hp = maxHp;
    this.maxHp = maxHp;
  }

  public getRect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  public getMeleeRect(): Rect | null {
    if (this.dashTimer <= 0) return null;
    const reach = 20;
    return {
      x: this.facing === 1 ? this.x + this.w - 2 : this.x - reach + 2,
      y: this.y + 2,
      w: reach,
      h: this.h - 4,
    };
  }

  public setCrouching(nextCrouch: boolean, tilemap: Tilemap): void {
    if (nextCrouch === this.crouching) return;
    if (nextCrouch) {
      const bottom = this.y + this.h;
      this.h = PHYSICS.playerCrouchH;
      this.y = bottom - this.h;
      this.crouching = true;
    } else {
      const bottom = this.y + this.h;
      const standY = bottom - PHYSICS.playerStandH;
      const blocked =
        tilemap.isSolidAtPixel(this.x + 2, standY + 1) ||
        tilemap.isSolidAtPixel(this.x + this.w - 2, standY + 1);
      if (!blocked) {
        this.h = PHYSICS.playerStandH;
        this.y = standY;
        this.crouching = false;
      }
    }
  }

  public unlockOrAddAmmo(kind: "shotgun" | "smg" | "ammo"): void {
    if (kind === "shotgun") {
      if (!this.unlockedWeapons.includes("shotgun")) {
        this.unlockedWeapons.push("shotgun");
        this.weapon = "shotgun";
      }
      this.ammo.shotgun = Math.min(WEAPONS.shotgun.maxAmmo, this.ammo.shotgun + 8);
    } else if (kind === "smg") {
      if (!this.unlockedWeapons.includes("smg")) {
        this.unlockedWeapons.push("smg");
        this.weapon = "smg";
      }
      this.ammo.smg = Math.min(WEAPONS.smg.maxAmmo, this.ammo.smg + 40);
    } else {
      if (this.unlockedWeapons.includes("shotgun")) {
        this.ammo.shotgun = Math.min(WEAPONS.shotgun.maxAmmo, this.ammo.shotgun + 6);
      }
      if (this.unlockedWeapons.includes("smg")) {
        this.ammo.smg = Math.min(WEAPONS.smg.maxAmmo, this.ammo.smg + 30);
      }
    }
  }

  public update(
    dt: number,
    input: InputSnapshot,
    tilemap: Tilemap,
    extraSolids: Rect[],
    callbacks: {
      onJump: () => void;
      onLand: () => void;
      onDash: () => void;
      onShoot: (
        weapon: WeaponId,
        bullets: Bullet[],
        muzzleX: number,
        muzzleY: number,
        facing: 1 | -1,
        aimMode: AimMode
      ) => void;
    }
  ): Bullet[] {
    const spawnedBullets: Bullet[] = [];

    this.animClock += dt;
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    if (this.dropThroughTimer > 0) this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);

    this.scaleX += (1 - this.scaleX) * Math.min(1, 16 * dt);
    this.scaleY += (1 - this.scaleY) * Math.min(1, 16 * dt);
    this.recoilOffset = Math.max(0, this.recoilOffset - 22 * dt);

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      this.afterimages[i].alpha -= dt * 3.8;
      if (this.afterimages[i].alpha <= 0) this.afterimages.splice(i, 1);
    }

    if (input.selectWeapon && this.unlockedWeapons.includes(input.selectWeapon)) {
      if (input.selectWeapon === "pistol" || this.ammo[input.selectWeapon] > 0) {
        this.weapon = input.selectWeapon;
      }
    } else if (input.cycleWeaponPressed && this.unlockedWeapons.length > 1) {
      const idx = this.unlockedWeapons.indexOf(this.weapon);
      for (let step = 1; step <= this.unlockedWeapons.length; step++) {
        const candidate = this.unlockedWeapons[(idx + step) % this.unlockedWeapons.length];
        if (candidate === "pistol" || this.ammo[candidate] > 0) {
          this.weapon = candidate;
          break;
        }
      }
    }

    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0 && this.dashTimer <= 0) {
      this.facing = moveDir > 0 ? 1 : -1;
    }

    const wantsCrouch = input.down && this.grounded && !input.up;
    this.setCrouching(wantsCrouch && this.dashTimer <= 0, tilemap);

    if (input.up && moveDir !== 0) {
      this.aimMode = "upDiag";
    } else if (input.up) {
      this.aimMode = "up";
    } else if (input.down && !this.grounded && moveDir !== 0) {
      this.aimMode = "downDiag";
    } else if (input.down && !this.grounded) {
      this.aimMode = "down";
    } else {
      this.aimMode = "straight";
    }

    if (this.grounded) {
      this.coyoteTimer = PHYSICS.coyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (input.jumpPressed) {
      if (input.down && this.grounded && this.onOneWay) {
        this.dropThroughTimer = 0.2;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.setCrouching(false, tilemap);
        this.y += 2;
      } else {
        this.jumpBufferTimer = PHYSICS.jumpBuffer;
      }
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    if (input.dashPressed && this.dashCooldownTimer <= 0 && this.dashTimer <= 0) {
      this.dashDir = moveDir !== 0 ? (moveDir > 0 ? 1 : -1) : this.facing;
      this.facing = this.dashDir;
      this.dashTimer = PHYSICS.dashDuration;
      this.dashCooldownTimer = PHYSICS.dashCooldown;
      this.meleeHitIds.clear();
      this.scaleX = 1.24;
      this.scaleY = 0.78;
      callbacks.onDash();
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * PHYSICS.dashSpeed;
      this.vy = Math.min(this.vy, 40);
      if (Math.random() < 0.8) {
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          alpha: 0.55,
          crouching: this.crouching,
          aimMode: this.aimMode,
          weapon: this.weapon,
          frameIdx: this.animFrame,
        });
      }
    } else {
      const targetVx = this.crouching
        ? moveDir * (PHYSICS.playerWalkSpeed * 0.42)
        : moveDir * PHYSICS.playerWalkSpeed;
      const rate = moveDir !== 0 ? PHYSICS.playerAccel : PHYSICS.playerFriction;
      if (this.vx < targetVx) {
        this.vx = Math.min(targetVx, this.vx + rate * dt);
      } else if (this.vx > targetVx) {
        this.vx = Math.max(targetVx, this.vx - rate * dt);
      }
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.setCrouching(false, tilemap);
      this.vy = PHYSICS.playerJumpVel;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.dashTimer = 0;
      this.scaleX = 0.86;
      this.scaleY = 1.16;
      callbacks.onJump();
    }

    if (!input.jumpHeld && this.vy < -60) {
      this.vy *= PHYSICS.jumpCutMultiplier;
    }

    this.vy = Math.min(PHYSICS.maxFallSpeed, this.vy + PHYSICS.gravity * dt);

    const wasGrounded = this.grounded;
    const rect = this.getRect();
    const col = tilemap.moveAndCollide(rect, this.vx, this.vy, dt, {
      dropThroughOneWay: this.dropThroughTimer > 0,
      extraSolids,
    });
    this.x = rect.x;
    this.y = rect.y;

    if (col.hitLeft || col.hitRight) this.vx = 0;
    if (col.hitTop && this.vy < 0) this.vy = 0;
    if (col.hitBottom) {
      if (!wasGrounded && this.vy > 110) {
        this.scaleX = 1.2;
        this.scaleY = 0.82;
        callbacks.onLand();
      }
      this.vy = 0;
      this.grounded = true;
      this.onOneWay = col.onOneWay;
    } else {
      this.grounded = false;
      this.onOneWay = false;
    }

    if (this.grounded && Math.abs(this.vx) > 8 && this.dashTimer <= 0) {
      this.runDist += Math.abs(this.vx) * dt;
    }

    if (this.dashTimer > 0) {
      this.animState = "dash";
      this.animFrame = Math.floor((1 - this.dashTimer / PHYSICS.dashDuration) * 5);
    } else if (!this.grounded) {
      this.animState = "jump";
      if (this.vy < -180) this.animFrame = 1;
      else if (this.vy < -60) this.animFrame = 2;
      else if (this.vy < 60) this.animFrame = 3;
      else if (this.vy < 190) this.animFrame = 4;
      else this.animFrame = 5;
    } else if (this.crouching) {
      this.animState = "crouch";
      this.animFrame = Math.floor(this.animClock * 7) % 6;
    } else if (Math.abs(this.vx) > 14) {
      this.animState = "run";
      this.animFrame = Math.floor(this.runDist * 0.14) % 6;
    } else {
      this.animState = "idle";
      this.animFrame = Math.floor(this.animClock * 6) % 6;
    }

    const cfg = WEAPONS[this.weapon];
    const wantsShoot = cfg.auto ? input.shootHeld : input.shootPressed || input.shootHeld;
    if (wantsShoot && this.fireCooldown <= 0 && this.dashTimer <= 0) {
      if (this.weapon !== "pistol" && this.ammo[this.weapon] <= 0) {
        this.weapon = "pistol";
      }
      const activeCfg = WEAPONS[this.weapon];
      if (this.weapon !== "pistol") {
        this.ammo[this.weapon]--;
      }
      this.fireCooldown = activeCfg.fireRate;
      this.muzzleFlashTimer = 0.055;
      this.recoilOffset = activeCfg.recoil;

      const baseAngle = this.getAimAngleRad();
      const shoulderX = this.x + this.w * 0.5 + this.facing * 2;
      const shoulderY = this.y + (this.crouching ? 10 : 12);
      const barrelLen = this.weapon === "shotgun" ? 14 : 12;
      const mx = shoulderX + Math.cos(baseAngle) * barrelLen;
      const my = shoulderY + Math.sin(baseAngle) * barrelLen;
      this.muzzleX = mx;
      this.muzzleY = my;

      for (let i = 0; i < activeCfg.pellets; i++) {
        const offset =
          activeCfg.pellets === 1
            ? (Math.random() - 0.5) * activeCfg.spreadRad
            : (i / (activeCfg.pellets - 1) - 0.5) * activeCfg.spreadRad +
              (Math.random() - 0.5) * 0.04;
        const ang = baseAngle + offset;
        const spd = activeCfg.bulletSpeed * (0.94 + Math.random() * 0.12);
        spawnedBullets.push(
          new Bullet({
            x: mx,
            y: my,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            fromPlayer: true,
            damage: activeCfg.damage,
            knockback: activeCfg.knockback,
            color: activeCfg.bulletColor,
          })
        );
      }

      callbacks.onShoot(this.weapon, spawnedBullets, mx, my, this.facing, this.aimMode);
    }

    return spawnedBullets;
  }

  public getAimAngleRad(): number {
    switch (this.aimMode) {
      case "up":
        return -Math.PI / 2;
      case "upDiag":
        return this.facing === 1 ? -Math.PI / 4 : -Math.PI * 0.75;
      case "down":
        return Math.PI / 2;
      case "downDiag":
        return this.facing === 1 ? Math.PI / 4 : Math.PI * 0.75;
      case "straight":
      default:
        return this.facing === 1 ? 0 : Math.PI;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number, theme: VrCorpTheme): void {
    for (let i = 0; i < this.afterimages.length; i++) {
      const a = this.afterimages[i];
      ctx.save();
      ctx.globalAlpha = a.alpha * 0.45;
      renderVrRunnerSprite(ctx, {
        footX: a.x + this.w * 0.5 - camX,
        footY: a.y + (a.crouching ? PHYSICS.playerCrouchH : PHYSICS.playerStandH) - camY,
        facing: a.facing,
        animState: "dash",
        frameIdx: a.frameIdx,
        aimMode: a.aimMode,
        weapon: a.weapon,
        recoil: 0,
        scaleX: 1,
        scaleY: 1,
        whiteFlash: true,
        theme,
      });
      ctx.restore();
    }

    if (this.invulnTimer > 0 && Math.floor(time * 24) % 2 === 0 && this.dashTimer <= 0) {
      return;
    }

    const footX = this.x + this.w * 0.5 - camX;
    const footY = this.y + this.h - camY;
    renderVrRunnerSprite(ctx, {
      footX,
      footY,
      facing: this.facing,
      animState: this.animState,
      frameIdx: this.animFrame,
      aimMode: this.aimMode,
      weapon: this.weapon,
      recoil: this.recoilOffset,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      theme,
    });

    if (this.dashTimer > 0.04) {
      const mRect = this.getMeleeRect();
      if (mRect) {
        const msx = Math.round(mRect.x - camX);
        const msy = Math.round(mRect.y - camY);
        ctx.fillStyle = "#00f0ff";
        ctx.fillRect(msx + (this.facing === 1 ? 4 : 0), msy + 4, mRect.w - 4, 3);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(msx + (this.facing === 1 ? 6 : 2), msy + 8, mRect.w - 6, 2);
      }
    }

    if (this.muzzleFlashTimer > 0) {
      const fx = Math.round(this.muzzleX - camX);
      const fy = Math.round(this.muzzleY - camY);
      ctx.fillStyle = WEAPONS[this.weapon].muzzleColor;
      ctx.fillRect(fx - 4, fy - 4, 8, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(fx - 2, fy - 2, 4, 4);
    }
  }
}
