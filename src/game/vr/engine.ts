import { sfx, startVrBassLoop, stopVrBassLoop } from "../../lib/sfx";
import { vrFont, vtr } from "./vrText";
import { VrBackgroundRenderer } from "./background";
import { createEnemy, ENEMY_BULLET_SLOWDOWN, type Enemy } from "./enemies";
import { Bullet, ButtonTerminal, Door, Elevator, Pickup, Prop } from "./entities";
import { ParticlePool } from "./particles";
import { Player } from "./player";
import {
  DOOR_COLORS,
  INTERNAL_HEIGHT,
  INTERNAL_WIDTH,
  MAX_FRAME_DT,
  FIXED_DT,
  TILE_SIZE,
} from "./themes";
import { aabbOverlap, Tilemap } from "./tilemap";
import type {
  InputSnapshot,
  PickupKind,
  Rect,
  VrHudSnapshot,
  VrLevelDef,
  VrPhase,
  WeaponId,
} from "./types";

const DIVE_DURATION = 1.15;
const MATERIALIZE_DURATION = 1.3;
const BLACKOUT_HOLD_DURATION = 1.5;

export interface VrEngineCallbacks {
  onHud: (hud: VrHudSnapshot) => void;
  onVictory: (info: { sabotaged: boolean; heist?: boolean; elapsed: number; kills: number; damageTaken: number }) => void;
  onDefeat: (info: { failRep: number; reason: "hp" | "overload" }) => void;
}

export class VrEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly level: VrLevelDef;
  private readonly callbacks: VrEngineCallbacks;

  private readonly tilemap: Tilemap;
  private readonly background = new VrBackgroundRenderer();
  private readonly particles = new ParticlePool(460);

  private player: Player;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private doors: Door[] = [];
  private buttons: ButtonTerminal[] = [];
  private elevators: Elevator[] = [];
  private props: Prop[] = [];
  private pickups: Pickup[] = [];

  private phase: VrPhase = "dive";
  private diveTimer = 0;
  private materializeTimer = 0;
  private lastBuildChime = -1;
  private blackoutTimer = 0;
  private blackoutActive = false;

  private checkpointSaved = false;
  private backupUsed = false;
  private overloadActive = false;
  private overloadRemaining = 0;

  private elapsedTime = 0;
  private worldTime = 0;
  private kills = 0;
  private totalEnemies = 0;
  private propsDestroyed = 0;
  private damageTaken = 0;

  private camX = 0;
  private camY = 0;
  private shakeTime = 0;
  private shakeIntensity = 0;
  private hitstopTimer = 0;
  private promptText: string | null = null;
  private bannerText: string | null = null;
  private bannerTimer = 0;
  private steamTimer = 0;

  private crtEnabled = true;

  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private virtualHolds = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    shoot: false,
  };

  private rafId: number | null = null;
  private lastFrameMs = 0;
  private accumulator = 0;
  private hudEmitAccum = 0;
  private victorySent = false;
  private defeatSent = false;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, level: VrLevelDef, callbacks: VrEngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas context unavailable");
    this.ctx = context;
    this.ctx.imageSmoothingEnabled = false;
    this.level = level;
    this.callbacks = callbacks;

    this.tilemap = new Tilemap(level.ascii);
    this.player = new Player(
      level.spawn.col * TILE_SIZE,
      level.spawn.row * TILE_SIZE,
      level.tuning.playerMaxHp
    );
    this.populateEntities();
    this.snapCamera();

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onWindowBlur);
    /* pointerdown вместо mousedown: тач по канвасу не стреляет,
       на мобильных стрельба идёт через экранные кнопки. */
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mouseleave", this.onMouseLeave);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    /* События отпускания должны быть того же Pointer API, что и нажатие.
       Иначе preventDefault(pointerdown) может подавить совместимый mouseup. */
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);

    sfx("vrDive");
    this.emitHud(true);
    this.lastFrameMs = performance.now();
    this.rafId = window.requestAnimationFrame(this.frame);
  }

  private populateEntities(): void {
    this.enemies = this.level.enemies.map((d) => createEnemy(d, this.level.tuning));
    this.totalEnemies = this.enemies.length;
    this.doors = this.level.doors.map((d) => new Door(d));
    this.buttons = this.level.buttons.map((b) => new ButtonTerminal(b));
    this.elevators = this.level.elevators.map((e) => new Elevator(e));
    this.props = this.level.props.map((p) => new Prop(p.kind, p.col, p.row, p.drop));
    this.pickups = this.level.pickups.map(
      (p) => new Pickup(p.kind, p.col * TILE_SIZE + 1, p.row * TILE_SIZE - 14)
    );
    this.bullets = [];
    this.particles.clear();
  }

  public destroy(): void {
    this.disposed = true;
    stopVrBassLoop();
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onWindowBlur);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseleave", this.onMouseLeave);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
  }

  public setCrtEnabled(enabled: boolean): void {
    this.crtEnabled = enabled;
    this.emitHud(true);
  }

  public skipTransition(): void {
    if (this.phase === "dive") {
      this.phase = "materialize";
      this.materializeTimer = 0;
      this.lastBuildChime = -1;
      sfx("vrBuild");
      this.emitHud(true);
    } else if (this.phase === "materialize") {
      this.enterPlayingPhase();
    }
  }

  private enterPlayingPhase(): void {
    this.phase = "playing";
    this.setBanner(`${this.level.nodeCode} // ${this.level.theme.realityName.split("//")[0].trim()}`, 2.2);
    startVrBassLoop(this.level.tuning.bassBpm);
    this.emitHud(true);
  }

  public pause(): void {
    if (this.phase !== "playing") return;
    this.phase = "paused";
    stopVrBassLoop();
    this.keysDown.clear();
    this.emitHud(true);
  }

  public resume(): void {
    if (this.phase !== "paused") return;
    this.phase = "playing";
    this.lastFrameMs = performance.now();
    startVrBassLoop(this.level.tuning.bassBpm);
    this.emitHud(true);
  }

  public cancelFinale(): void {
    if (this.phase !== "finale") return;
    this.phase = "playing";
    this.lastFrameMs = performance.now();
    startVrBassLoop(this.level.tuning.bassBpm);
    this.emitHud(true);
  }

  public completeFinale(opts?: { blackout?: boolean; heist?: boolean }): void {
    if (this.phase !== "finale" && this.phase !== "playing") return;
    stopVrBassLoop();
    if (opts?.blackout || this.level.isSabotageBlackout) {
      this.blackoutActive = true;
      this.blackoutTimer = 0;
      this.phase = "blackout";
      sfx("vrBlackout");
      this.triggerShake(5.5, 0.45);
      const tx = this.level.coreTerminal.col * TILE_SIZE + 8;
      const ty = this.level.coreTerminal.row * TILE_SIZE - 18;
      this.particles.burst(tx, ty, 36, ["#ffb020", "#ff2b45", "#ffffff"], 40, 175, 220, "spark");
      this.setBanner("POWER GRID SEVERED // LIGHTS OFF", 2.0);
      this.emitHud(true);
      return;
    }

    this.triggerVictory(false, !!opts?.heist || this.level.finaleKind === "DATA_HEIST");
  }

  public warpToCore(): void {
    if (this.phase === "dive" || this.phase === "materialize") {
      this.enterPlayingPhase();
    }
    this.player.x = this.level.coreTerminal.col * TILE_SIZE;
    this.player.y = this.level.coreTerminal.row * TILE_SIZE - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.snapCamera();
    this.emitHud(true);
  }

  private triggerVictory(sabotaged: boolean, heist = false): void {
    if (this.victorySent) return;
    this.victorySent = true;
    this.phase = "victory";
    stopVrBassLoop();
    sfx("hackOk");
    this.emitHud(true);
    this.callbacks.onVictory({
      sabotaged,
      heist,
      elapsed: this.elapsedTime,
      kills: this.kills,
      damageTaken: this.damageTaken,
    });
  }

  private triggerDefeat(reason: "hp" | "overload"): void {
    if (this.defeatSent) return;
    this.defeatSent = true;
    this.phase = "defeat";
    stopVrBassLoop();
    sfx("alarm");
    this.emitHud(true);
    this.callbacks.onDefeat({
      failRep: this.level.tuning.failRep,
      reason,
    });
  }

  public setVirtualControl(
    control: "left" | "right" | "up" | "down" | "jump" | "shoot",
    held: boolean
  ): void {
    const prev = this.virtualHolds[control];
    this.virtualHolds[control] = held;
    if (held && !prev) {
      if (control === "jump") this.keysPressed.add("VirtualJump");
      if (control === "shoot") this.keysPressed.add("VirtualShoot");
    }
  }

  public triggerVirtualAction(action: "dash" | "interact" | "cycle"): void {
    if (action === "dash") this.keysPressed.add("VirtualDash");
    if (action === "interact") this.keysPressed.add("VirtualInteract");
    if (action === "cycle") this.keysPressed.add("VirtualCycle");
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (
      code === "Space" ||
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight"
    ) {
      e.preventDefault();
    }

    if (code === "ControlLeft" || code === "ControlRight") e.preventDefault();

    if (code === "Escape" || code === "KeyP") {
      if (this.phase === "playing") {
        this.pause();
        return;
      }
      if (this.phase === "paused") {
        this.resume();
        return;
      }
    }

    if ((code === "Space" || code === "Enter") && (this.phase === "dive" || this.phase === "materialize")) {
      this.skipTransition();
      return;
    }

    if (!this.keysDown.has(code)) {
      this.keysPressed.add(code);
    }
    this.keysDown.add(code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  /** ЛКМ удерживается над игровым полем. */
  private mouseShoot = false;

  /* ---- прицеливание по курсору ---- */
  /** Координаты курсора во внутренних пикселях канваса. */
  private mouseX = 0;
  private mouseY = 0;
  /** Курсор мыши сейчас над игровым полем (тач не считается). */
  private mouseInCanvas = false;

  private updateMousePos(e: { clientX: number; clientY: number }): void {
    const r = this.canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    this.mouseX = ((e.clientX - r.left) / r.width) * INTERNAL_WIDTH;
    this.mouseY = ((e.clientY - r.top) / r.height) * INTERNAL_HEIGHT;
    this.mouseInCanvas = true;
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMousePos(e);
  };

  private onMouseLeave = (): void => {
    this.mouseInCanvas = false;
  };

  private onPointerDown = (e: PointerEvent): void => {
    /* тач-тап по канвасу не стреляет: на мобильном есть экранная кнопка FIRE */
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    if (e.button !== 0 || this.phase !== "playing") return;
    e.preventDefault();
    this.updateMousePos(e);
    /* Каждый физический клик — новое нажатие для полуавтоматики.
       Не завязываем событие на старое значение mouseShoot: даже если браузер
       потерял отпускание, следующий pointerdown всё равно даст выстрел. */
    this.keysPressed.add("MouseShoot");
    this.mouseShoot = true;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    this.mouseShoot = false;
  };
  private onContextMenu = (e: Event): void => e.preventDefault();

  private onWindowBlur = (): void => {
    this.mouseShoot = false;
    this.keysDown.clear();
    this.virtualHolds = { left: false, right: false, up: false, down: false, jump: false, shoot: false };
  };

  private pollInput(): InputSnapshot {
    const k = this.keysDown;
    const p = this.keysPressed;
    const v = this.virtualHolds;

    const selectWeapon: WeaponId | null = p.has("Digit1")
      ? "pistol"
      : p.has("Digit2")
        ? "shotgun"
        : p.has("Digit3")
          ? "smg"
          : null;

    const snap: InputSnapshot = {
      left: k.has("KeyA") || k.has("ArrowLeft") || v.left,
      right: k.has("KeyD") || k.has("ArrowRight") || v.right,
      up: k.has("KeyW") || k.has("ArrowUp") || v.up,
      down: k.has("KeyS") || k.has("ArrowDown") || v.down,
      /* прыжок — только пробел; W / ↑ теперь целятся вверх (с A/D — под углом) */
      jumpHeld: k.has("Space") || v.jump,
      jumpPressed: p.has("Space") || p.has("VirtualJump"),
      /* выстрел — Ctrl или клик мыши по игровому полю */
      shootHeld: k.has("ControlLeft") || k.has("ControlRight") || this.mouseShoot || v.shoot,
      shootPressed:
        p.has("ControlLeft") || p.has("ControlRight") || p.has("MouseShoot") || p.has("VirtualShoot"),
      dashPressed: p.has("ShiftLeft") || p.has("ShiftRight") || p.has("VirtualDash"),
      interactPressed: p.has("KeyE") || p.has("KeyF") || p.has("VirtualInteract"),
      cycleWeaponPressed: p.has("KeyQ") || p.has("KeyC") || p.has("VirtualCycle"),
      selectWeapon,
      /* Прицел по курсору: переводим экранные координаты в мировые через камеру. */
      aim:
        this.mouseInCanvas && this.phase === "playing"
          ? { x: this.camX + this.mouseX, y: this.camY + this.mouseY }
          : null,
    };

    p.clear();
    return snap;
  }

  private frame = (nowMs: number): void => {
    if (this.disposed) return;
    const frameDt = Math.min(MAX_FRAME_DT, Math.max(0, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;

    this.worldTime += frameDt;
    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - frameDt);
    if (this.bannerTimer > 0) {
      this.bannerTimer -= frameDt;
      if (this.bannerTimer <= 0) this.bannerText = null;
    }

    if (this.phase === "dive") {
      this.diveTimer += frameDt;
      if (this.diveTimer >= DIVE_DURATION) {
        this.phase = "materialize";
        this.materializeTimer = 0;
        this.lastBuildChime = -1;
        sfx("vrBuild");
        this.emitHud(true);
      }
    } else if (this.phase === "materialize") {
      this.materializeTimer += frameDt;
      const chimeIdx = Math.floor((this.materializeTimer / MATERIALIZE_DURATION) * 4);
      if (chimeIdx > this.lastBuildChime && chimeIdx < 4) {
        this.lastBuildChime = chimeIdx;
        sfx("vrBuild");
      }
      if (this.materializeTimer >= MATERIALIZE_DURATION) {
        this.enterPlayingPhase();
      }
    } else if (this.phase === "blackout") {
      this.blackoutTimer += frameDt;
      this.particles.update(frameDt, (wx, wy) => this.tilemap.isSolidAtPixel(wx, wy));
      if (this.blackoutTimer >= BLACKOUT_HOLD_DURATION) {
        this.triggerVictory(true);
      }
    } else if (this.phase === "playing") {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= frameDt;
      } else {
        this.accumulator += frameDt;
        while (this.accumulator >= FIXED_DT && this.phase === "playing") {
          this.stepSimulation(FIXED_DT);
          this.accumulator -= FIXED_DT;
        }
      }
    }

    this.render();

    this.hudEmitAccum += frameDt;
    if (this.hudEmitAccum >= 0.08) {
      this.hudEmitAccum = 0;
      this.emitHud(false);
    }

    if (!this.disposed) {
      this.rafId = window.requestAnimationFrame(this.frame);
    }
  };

  private stepSimulation(dt: number): void {
    this.elapsedTime += dt;
    const input = this.pollInput();

    // Overload countdown for Tier 5 CORE_EXTRACTION
    if (this.overloadActive) {
      this.overloadRemaining -= dt;
      if (this.overloadRemaining <= 0) {
        this.overloadRemaining = 0;
        this.triggerDefeat("overload");
        return;
      }
    }

    // Blocking solids: closed doors + elevator decks below feet
    const doorSolids = this.doors
      .map((d) => d.getSolidRect())
      .filter((r): r is Rect => r !== null);

    const playerFeet = this.player.y + this.player.h;
    const elevatorSolids: Rect[] = [];
    for (const elev of this.elevators) {
      const er = elev.getRect();
      if (playerFeet <= elev.y + 4) {
        elevatorSolids.push(er);
      }
    }
    const playerSolids = [...doorSolids, ...elevatorSolids];

    const newBullets = this.player.update(dt, input, this.tilemap, playerSolids, {
      onJump: () => {
        sfx("vrJump");
        this.particles.burst(
          this.player.x + this.player.w * 0.5,
          this.player.y + this.player.h,
          4,
          [this.level.theme.primary, "#ffffff"],
          18,
          65,
          120,
          "spark"
        );
      },
      onLand: () => {
        this.particles.burst(
          this.player.x + this.player.w * 0.5,
          this.player.y + this.player.h,
          4,
          [this.level.theme.primary],
          15,
          55,
          90,
          "voxel"
        );
      },
      onDash: () => {
        sfx("vrDash");
        this.triggerShake(1.6, 0.08);
      },
      onShoot: (weapon, _bullets, mx, my, facing) => {
        if (weapon === "shotgun") sfx("vrShotgun");
        else if (weapon === "smg") sfx("vrSmg");
        else sfx("vrShoot");
        this.particles.spawnCasing(mx - facing * 6, my - 2, facing, this.level.theme.primary);
        this.particles.spawn({
          x: mx,
          y: my,
          vx: 0,
          vy: 0,
          life: 0.09,
          size: weapon === "shotgun" ? 10 : 6,
          color: this.level.theme.primary,
          style: "glow",
        });
      },
    });
    if (newBullets.length) this.bullets.push(...newBullets);

    // Elevators
    const pRect = this.player.getRect();
    for (const elev of this.elevators) {
      const riding = elev.isPlayerOnTop(pRect);
      const dy = elev.update(dt, riding, () => sfx("vrDoor"));
      if (riding && dy !== 0) {
        this.player.y += dy;
        this.player.grounded = true;
      }
    }

    // Doors & buttons
    for (const d of this.doors) {
      d.update(
        dt,
        this.player.getRect(),
        () => sfx("vrDoor"),
        () => sfx("tick")
      );
    }
    for (const b of this.buttons) {
      b.update(dt);
    }

    // Dash-melee hits on enemies & props
    const meleeRect = this.player.getMeleeRect();
    if (meleeRect) {
      for (const e of this.enemies) {
        if (!e.isAlive() || this.player.meleeHitIds.has(e)) continue;
        if (aabbOverlap(meleeRect, e.getRect())) {
          this.player.meleeHitIds.add(e);
          const killed = e.takeDamage(2, this.player.facing * 155);
          this.onEnemyDamaged(e, killed);
        }
      }
      for (const pr of this.props) {
        if (!pr.active || this.player.meleeHitIds.has(pr)) continue;
        if (aabbOverlap(meleeRect, pr.getRect())) {
          this.player.meleeHitIds.add(pr);
          this.damageProp(pr, 3);
        }
      }
    }

    // Enemies
    for (const e of this.enemies) {
      e.updateAI(dt, this.player.getRect(), this.tilemap, doorSolids, (enemyBullets) => {
        // slower projectiles keep their original travel range
        for (const eb of enemyBullets) eb.life /= ENEMY_BULLET_SLOWDOWN;
        this.bullets.push(...enemyBullets);
        sfx("vrEnemyShoot");
      });
      if (e.state === "dead" && !e.dropSpawned) {
        e.dropSpawned = true;
        const drop = e.rollDrop();
        if (drop) this.spawnPickup(drop, e.x + 1, e.y + e.h - 14);
      }
    }
    this.enemies = this.enemies.filter((e) => !e.removed);

    // Bullets
    this.updateBullets(dt, doorSolids);

    // Pickups
    const prNow = this.player.getRect();
    for (const pk of this.pickups) {
      if (!pk.active) continue;
      if (aabbOverlap(prNow, pk.getRect())) {
        pk.active = false;
        sfx("vrPickup");
        if (pk.kind === "health") {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
          this.setBanner("NANO-REPAIR +2 HP", 1.2);
        } else {
          this.player.unlockOrAddAmmo(pk.kind);
          const lbl =
            pk.kind === "shotgun"
              ? "SHARD-12 SCATTER ACQUIRED"
              : pk.kind === "smg"
                ? "STREAM-MP9 ACQUIRED"
                : "AMMUNITION REFILLED";
          this.setBanner(lbl, 1.3);
        }
        this.particles.burst(
          pk.x + 7,
          pk.y + 6,
          10,
          [this.level.theme.ok, "#ffffff"],
          25,
          90,
          100,
          "spark"
        );
      }
    }
    this.pickups = this.pickups.filter((p) => p.active);
    for (const pk of this.pickups) pk.update(dt, this.tilemap);

    // Props flash timers
    for (const prop of this.props) {
      if (prop.flashTimer > 0) prop.flashTimer = Math.max(0, prop.flashTimer - dt);
    }
    this.props = this.props.filter((p) => p.active);

    // Checkpoint trigger
    if (!this.checkpointSaved) {
      const cpRect: Rect = {
        x: this.level.checkpoint.col * TILE_SIZE - 8,
        y: this.level.checkpoint.row * TILE_SIZE - 30,
        w: 32,
        h: 32,
      };
      if (aabbOverlap(this.player.getRect(), cpRect)) {
        this.checkpointSaved = true;
        sfx("vrPickup");
        this.setBanner("CHECKPOINT BUFFER SYNCED", 1.6);
        this.particles.burst(
          cpRect.x + 16,
          cpRect.y + 14,
          16,
          [this.level.theme.ok, this.level.theme.primary],
          30,
          95,
          80,
          "voxel"
        );
      }
    }

    // Core terminal / Extraction / Buttons / Elevator call prompts & interactions
    this.handleInteractions(input);

    // Steam vents ambient particles
    this.steamTimer += dt;
    if (this.steamTimer >= 0.22) {
      this.steamTimer = 0;
      for (const vent of this.level.steamVents) {
        if (Math.random() < 0.45) {
          this.particles.spawn({
            x: vent.col * TILE_SIZE + 6 + Math.random() * 4,
            y: vent.row * TILE_SIZE + (vent.dir === "down" ? 2 : -4),
            vx: (Math.random() - 0.5) * 14,
            vy: vent.dir === "down" ? 36 : -42,
            life: 0.45 + Math.random() * 0.25,
            size: 3,
            color: this.level.theme.primary,
            style: "smoke",
          });
        }
      }
    }

    this.particles.update(dt, (wx, wy) => this.tilemap.isSolidAtPixel(wx, wy));
    this.updateCamera(dt);
  }

  private updateBullets(dt: number, doorSolids: Rect[]): void {
    const playerRect = this.player.getRect();

    for (const b of this.bullets) {
      if (!b.active) continue;
      b.update(dt);
      if (!b.active) continue;

      if (this.tilemap.isSolidAtPixel(b.x, b.y)) {
        b.active = false;
        this.particles.burst(b.x, b.y, 4, [b.color, "#ffffff"], 28, 85, 210, "spark");
        continue;
      }

      const bRect = b.getRect();
      let hitDoor = false;
      for (const dr of doorSolids) {
        if (aabbOverlap(bRect, dr)) {
          hitDoor = true;
          break;
        }
      }
      if (hitDoor) {
        b.active = false;
        this.particles.burst(b.x, b.y, 5, [b.color, "#ffffff"], 35, 95, 220, "spark");
        continue;
      }

      if (b.fromPlayer) {
        for (const e of this.enemies) {
          if (!e.isAlive()) continue;
          if (aabbOverlap(bRect, e.getRect())) {
            b.active = false;
            const kb = Math.sign(b.vx || 1) * b.knockback;
            const killed = e.takeDamage(b.damage, kb);
            this.onEnemyDamaged(e, killed);
            break;
          }
        }
        if (!b.active) continue;

        for (const pr of this.props) {
          if (!pr.active) continue;
          if (aabbOverlap(bRect, pr.getRect())) {
            b.active = false;
            this.damageProp(pr, b.damage);
            break;
          }
        }
      } else {
        if (this.player.dashTimer <= 0 && aabbOverlap(bRect, playerRect)) {
          b.active = false;
          this.damagePlayer(b.damage, Math.sign(b.vx || 1) * 140);
        }
      }
    }

    this.bullets = this.bullets.filter((b) => b.active);
  }

  private onEnemyDamaged(enemy: Enemy, killed: boolean): void {
    const cx = enemy.x + enemy.w * 0.5;
    const cy = enemy.y + enemy.h * 0.5;
    if (killed) {
      this.kills++;
      sfx("vrKill");
      this.hitstopTimer = 0.04;
      this.triggerShake(3.2, 0.14);
      this.particles.burst(
        cx,
        cy,
        18,
        [this.level.theme.enemyAccent, this.level.theme.primary, "#ffffff"],
        45,
        150,
        280,
        "voxel"
      );
    } else {
      sfx("vrHit");
      this.triggerShake(1.4, 0.06);
      this.particles.burst(cx, cy, 6, [this.level.theme.primary, "#ffffff"], 30, 95, 220, "spark");
    }
  }

  private damageProp(prop: Prop, dmg: number): void {
    prop.hp -= dmg;
    prop.flashTimer = 0.07;
    if (prop.hp <= 0) {
      prop.active = false;
      this.propsDestroyed++;
      const cx = prop.x + prop.w * 0.5;
      const cy = prop.y + prop.h * 0.5;
      if (prop.kind === "barrel") {
        this.detonateBarrel(cx, cy);
      } else {
        sfx("vrHit");
        this.particles.burst(cx, cy, 12, [this.level.theme.primary, this.level.theme.secondary], 35, 110, 260, "voxel");
        if (prop.drop) this.spawnPickup(prop.drop, prop.x, prop.y);
      }
    }
  }

  private detonateBarrel(cx: number, cy: number): void {
    sfx("vrExplosion");
    this.hitstopTimer = 0.06;
    this.triggerShake(6.0, 0.28);
    this.particles.burst(cx, cy, 28, ["#ffb020", "#ff2b45", "#ffffff"], 55, 195, 220, "spark");
    this.particles.spawn({ x: cx, y: cy, vx: 0, vy: 0, life: 0.28, size: 22, color: "#ff9500", style: "glow" });

    const blastR = 54;
    for (const e of this.enemies) {
      if (!e.isAlive()) continue;
      const ex = e.x + e.w * 0.5;
      const ey = e.y + e.h * 0.5;
      if (Math.hypot(ex - cx, ey - cy) <= blastR) {
        const killed = e.takeDamage(5, ex >= cx ? 190 : -190);
        this.onEnemyDamaged(e, killed);
      }
    }
    for (const p of this.props) {
      if (!p.active) continue;
      const px = p.x + p.w * 0.5;
      const py = p.y + p.h * 0.5;
      if (Math.hypot(px - cx, py - cy) <= blastR) {
        this.damageProp(p, 5);
      }
    }
  }

  private damagePlayer(dmg: number, knockbackX: number): void {
    if (this.player.invulnTimer > 0) return;
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.player.invulnTimer = 1.05;
    this.player.vx = knockbackX;
    this.player.vy = -125;
    this.damageTaken += dmg;
    sfx("vrHurt");
    this.hitstopTimer = 0.05;
    this.triggerShake(4.5, 0.2);
    this.particles.burst(
      this.player.x + this.player.w * 0.5,
      this.player.y + this.player.h * 0.5,
      14,
      ["#ff2b45", "#ffffff"],
      40,
      135,
      250,
      "spark"
    );

    if (this.player.hp <= 0) {
      if (this.checkpointSaved && !this.backupUsed) {
        this.backupUsed = true;
        this.player.hp = this.player.maxHp;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.x = this.level.checkpoint.col * TILE_SIZE;
        this.player.y = this.level.checkpoint.row * TILE_SIZE - this.player.h;
        this.player.invulnTimer = 1.6;
        this.bullets = [];
        sfx("uiSys");
        this.setBanner("BACKUP SHELL RESTORED // FINAL BUFFER", 2.2);
        this.snapCamera();
      } else {
        this.triggerDefeat("hp");
      }
    }
  }

  private handleInteractions(input: InputSnapshot): void {
    const pRect = this.player.getRect();
    let prompt: string | null = null;

    // 1. Buttons / Door Overrides
    for (const btn of this.buttons) {
      if (aabbOverlap(pRect, btn.getInteractRect())) {
        prompt = `[E] ${btn.label}`;
        if (input.interactPressed) {
          btn.trigger();
          for (const d of this.doors) {
            if (d.color === btn.color) {
              d.open(() => sfx("vrDoor"));
            }
          }
          sfx("vrPickup");
          this.setBanner(`${DOOR_COLORS[btn.color].label} GATE UNLOCKED`, 1.6);
          this.particles.burst(
            btn.x + 8,
            btn.y + 8,
            12,
            [DOOR_COLORS[btn.color].main, "#ffffff"],
            35,
            100,
            150,
            "spark"
          );
        }
        break;
      }
    }

    // 2. Elevator manual toggle/call
    if (!prompt) {
      for (const elev of this.elevators) {
        if (elev.isPlayerOnTop(pRect)) {
          prompt = "[E] LIFT OVERRIDE";
          if (input.interactPressed) {
            elev.toggleDirection(() => sfx("vrDoor"));
          }
          break;
        }
        const callFloorY = elev.isNearCallSwitch(pRect);
        if (callFloorY !== null) {
          prompt = "[E] CALL LIFT";
          if (input.interactPressed) {
            elev.callToFloor(callFloorY, () => sfx("vrDoor"));
          }
          break;
        }
      }
    }

    // 3. Core Terminal
    const coreRect: Rect = {
      x: this.level.coreTerminal.col * TILE_SIZE - 12,
      y: this.level.coreTerminal.row * TILE_SIZE - 42,
      w: 44,
      h: 46,
    };
    if (aabbOverlap(pRect, coreRect)) {
      if (this.level.finaleKind === "CORE_EXTRACTION") {
        if (!this.overloadActive) {
          prompt = `[E] ${this.level.coreTerminal.label}`;
          if (input.interactPressed) {
            this.overloadActive = true;
            this.overloadRemaining = this.level.tuning.overloadEscapeSec;
            for (const d of this.doors) {
              if (d.color === "green") d.forceHoldOpen();
            }
            sfx("alarm");
            this.triggerShake(4.2, 0.25);
            this.setBanner("OVERLOAD ARMED // REACH EXTRACT GATE", 3.0);
          }
        } else {
          prompt = "REACH EXTRACT GATE >>>";
        }
      } else {
        prompt = `[E] ${this.level.coreTerminal.label}`;
        if (input.interactPressed) {
          stopVrBassLoop();
          this.phase = "finale";
          sfx("uiSys");
          this.emitHud(true);
          return;
        }
      }
    }

    // 4. Extraction Gate (for CORE_EXTRACTION)
    if (this.level.extractionGate && this.overloadActive) {
      const gateRect: Rect = {
        x: this.level.extractionGate.col * TILE_SIZE - 10,
        y: this.level.extractionGate.row * TILE_SIZE - 44,
        w: 42,
        h: 46,
      };
      if (aabbOverlap(pRect, gateRect)) {
        this.triggerVictory(false);
        return;
      }
    }

    this.promptText = prompt;
  }

  private spawnPickup(kind: PickupKind, x: number, y: number): void {
    this.pickups.push(new Pickup(kind, x, y, true));
  }

  private setBanner(text: string, duration = 1.6): void {
    this.bannerText = text;
    this.bannerTimer = duration;
  }

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  private snapCamera(): void {
    const maxCamX = Math.max(0, this.tilemap.worldWidth - INTERNAL_WIDTH);
    const maxCamY = Math.max(0, this.tilemap.worldHeight - INTERNAL_HEIGHT);
    const targetX = this.player.x + this.player.w * 0.5 - INTERNAL_WIDTH * 0.5 + this.player.facing * 28;
    const targetY = this.player.y + this.player.h * 0.5 - INTERNAL_HEIGHT * 0.55;
    this.camX = Math.max(0, Math.min(maxCamX, targetX));
    this.camY = Math.max(0, Math.min(maxCamY, targetY));
  }

  private updateCamera(dt: number): void {
    const maxCamX = Math.max(0, this.tilemap.worldWidth - INTERNAL_WIDTH);
    const maxCamY = Math.max(0, this.tilemap.worldHeight - INTERNAL_HEIGHT);
    const targetX = this.player.x + this.player.w * 0.5 - INTERNAL_WIDTH * 0.5 + this.player.facing * 36;
    const targetY = this.player.y + this.player.h * 0.5 - INTERNAL_HEIGHT * 0.56;
    const lerp = Math.min(1, 8.5 * dt);
    this.camX += (targetX - this.camX) * lerp;
    this.camY += (targetY - this.camY) * lerp;
    this.camX = Math.max(0, Math.min(maxCamX, this.camX));
    this.camY = Math.max(0, Math.min(maxCamY, this.camY));
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    if (this.phase === "dive") {
      this.background.renderDiveTransition(
        ctx,
        this.level,
        Math.min(1, this.diveTimer / DIVE_DURATION),
        this.worldTime
      );
      return;
    }

    const shakeX = this.shakeTime > 0 ? Math.round((Math.random() - 0.5) * this.shakeIntensity * 2) : 0;
    const shakeY = this.shakeTime > 0 ? Math.round((Math.random() - 0.5) * this.shakeIntensity * 2) : 0;
    const drawCamX = Math.round(this.camX + shakeX);
    const drawCamY = Math.round(this.camY + shakeY);

    const buildFraction =
      this.phase === "materialize"
        ? Math.min(1, this.materializeTimer / MATERIALIZE_DURATION)
        : 1;

    this.background.renderBackdrop(
      ctx,
      this.level,
      drawCamX,
      drawCamY,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
      this.worldTime,
      buildFraction,
      this.blackoutActive
    );

    this.tilemap.renderVisibleTiles(
      ctx,
      drawCamX,
      drawCamY,
      INTERNAL_WIDTH,
      INTERNAL_HEIGHT,
      this.level.theme,
      buildFraction,
      this.blackoutActive
    );

    if (buildFraction >= 0.4) {
      this.background.renderSpecialStations(
        ctx,
        this.level,
        drawCamX,
        drawCamY,
        this.worldTime,
        this.checkpointSaved,
        this.overloadActive,
        this.blackoutActive
      );

      for (const elev of this.elevators) {
        elev.render(ctx, drawCamX, drawCamY, this.worldTime, this.level.theme, this.blackoutActive);
      }
      for (const d of this.doors) {
        d.render(ctx, drawCamX, drawCamY, this.blackoutActive);
      }
      for (const b of this.buttons) {
        b.render(ctx, drawCamX, drawCamY, this.worldTime, this.blackoutActive);
      }
      for (const p of this.props) {
        p.render(ctx, drawCamX, drawCamY, this.worldTime, this.level.theme, this.blackoutActive);
      }
      for (const pk of this.pickups) {
        pk.render(ctx, drawCamX, drawCamY, this.worldTime);
      }
    }

    if (buildFraction >= 0.72) {
      for (const e of this.enemies) {
        e.render(ctx, drawCamX, drawCamY, this.level.theme);
        if (e.variant !== "std" && e.isAlive()) {
          /* метка варианта над головой: swift — голубая, plated — белая, volley — оранжевая */
          ctx.fillStyle = e.variant === "swift" ? "#4df0ff" : e.variant === "plated" ? "#f2f2f2" : "#ff9a2e";
          ctx.fillRect(Math.round(e.x + e.w * 0.5 - drawCamX) - 2, Math.round(e.y - drawCamY) - 6, 4, 3);
        }
      }
    }

    this.player.render(ctx, drawCamX, drawCamY, this.worldTime, this.level.theme);

    for (const b of this.bullets) {
      b.render(ctx, drawCamX, drawCamY);
    }

    /* Кастомный прицел: над игровым полем системный курсор прячем,
       рисуем пиксельный перекрестие с точкой. */
    const crosshair = this.mouseInCanvas && this.phase === "playing";
    this.canvas.style.cursor = crosshair ? "none" : "default";
    if (crosshair) {
      const cx = Math.round(this.mouseX);
      const cy = Math.round(this.mouseY);
      const col = this.level.theme.primary;
      ctx.fillStyle = col;
      ctx.fillRect(cx - 6, cy, 4, 1);
      ctx.fillRect(cx + 3, cy, 4, 1);
      ctx.fillRect(cx, cy - 6, 1, 4);
      ctx.fillRect(cx, cy + 3, 1, 4);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 3.5, cy - 3.5, 8, 8);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx, cy, 1, 1);
    }

    this.particles.render(ctx, drawCamX, drawCamY);
    this.particles.renderGlow(ctx, drawCamX, drawCamY);

    if (this.phase === "materialize") {
      this.background.renderMaterializeSweep(ctx, drawCamX, this.level, buildFraction);
      ctx.font = vrFont(8);
      ctx.textAlign = "center";
      ctx.fillStyle = this.level.theme.primary;
      ctx.fillText(vtr("CONSTRUCTING VIRTUAL ARCHITECTURE ..."), INTERNAL_WIDTH * 0.5, 22);
      ctx.textAlign = "left";
    }

    if (this.blackoutActive) {
      this.background.renderBlackoutOverlay(ctx, this.worldTime);
    }

    if (this.promptText && this.phase === "playing") {
      const px = Math.round(this.player.x + this.player.w * 0.5 - drawCamX);
      const py = Math.max(22, Math.round(this.player.y - drawCamY - 14));
      const promptLoc = vtr(this.promptText);
      ctx.font = vrFont(7);
      const tw = Math.max(76, ctx.measureText(promptLoc).width + 12);
      const bx = Math.max(8, Math.min(INTERNAL_WIDTH - tw - 8, px - (tw >> 1)));
      ctx.fillStyle = "rgba(5, 8, 16, 0.9)";
      ctx.fillRect(bx, py - 10, tw, 13);
      ctx.strokeStyle = this.level.theme.primary;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, py - 9.5, tw - 1, 12);
      ctx.font = vrFont(7);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f2fbff";
      ctx.fillText(promptLoc, bx + tw * 0.5, py - 3.5);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    if (this.bannerText && (this.phase === "playing" || this.phase === "blackout")) {
      const bannerLoc = vtr(this.bannerText);
      ctx.font = vrFont(8);
      const bw = Math.min(INTERNAL_WIDTH - 28, Math.max(180, ctx.measureText(bannerLoc).width + 24));
      const bx = (INTERNAL_WIDTH - bw) >> 1;
      ctx.fillStyle = "rgba(4, 7, 15, 0.9)";
      ctx.fillRect(bx, 12, bw, 16);
      ctx.strokeStyle = this.blackoutActive || this.overloadActive ? this.level.theme.danger : this.level.theme.primary;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, 12.5, bw - 1, 15);
      ctx.font = vrFont(8);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = this.blackoutActive || this.overloadActive ? "#ff7a8a" : this.level.theme.primary;
      ctx.fillText(bannerLoc, INTERNAL_WIDTH * 0.5, 20);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }
  }

  private emitHud(force: boolean): void {
    if (!force && this.disposed) return;
    const floorCount = this.level.tier >= 3 ? 3 : 2;
    const ratio = 1 - Math.min(0.99, Math.max(0, this.player.y / Math.max(1, this.tilemap.worldHeight - 40)));
    const floorNumber = Math.min(floorCount, Math.max(1, 1 + Math.floor(ratio * floorCount)));

    this.callbacks.onHud({
      phase: this.phase,
      tier: this.level.tier,
      corpLabel: this.level.theme.corpLabel,
      realityName: this.level.theme.realityName,
      finaleKind: this.level.finaleKind,
      isSabotageBlackout: this.level.isSabotageBlackout,
      overloadActive: this.overloadActive,
      overloadRemaining: this.overloadActive ? Math.max(0, this.overloadRemaining) : null,
      blackoutActive: this.blackoutActive,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      weapon: this.player.weapon,
      unlockedWeapons: [...this.player.unlockedWeapons],
      ammo: { ...this.player.ammo },
      kills: this.kills,
      totalEnemies: this.totalEnemies,
      propsDestroyed: this.propsDestroyed,
      elapsedTime: this.elapsedTime,
      damageTaken: this.damageTaken,
      checkpointSaved: this.checkpointSaved,
      doors: this.doors.map((d) => ({
        color: d.color,
        isOpen: d.isOpen,
        timerRemaining: d.timedSeconds !== null && d.isOpen && d.timerRemaining < 900 ? d.timerRemaining : null,
        timerTotal: d.timedSeconds,
      })),
      promptText: this.promptText,
      bannerText: this.bannerText,
      crtEnabled: this.crtEnabled,
      floorNumber,
      diveProgress: Math.min(1, this.diveTimer / DIVE_DURATION),
      buildProgress: Math.min(1, this.materializeTimer / MATERIALIZE_DURATION),
    });
  }
}
