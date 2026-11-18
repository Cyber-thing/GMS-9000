import type { AimMode, EnemyAIState, VrCorpTheme, WeaponId } from "./types";

export type HackerAnimState = "idle" | "run" | "jump" | "dash" | "crouch";

const WHITE = "#f8fafc";

function drawWiredBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  wire: string
): void {
  ctx.fillStyle = "#05070e";
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = wire;
  ctx.fillRect(x, y, w, 1);
}

/**
 * Cyberpunk VR Avatar Sprite — digital wire-coat silhouette with animated visor glint
 * and theme-reactive holo seams.
 */
export function renderVrRunnerSprite(
  ctx: CanvasRenderingContext2D,
  opts: {
    footX: number;
    footY: number;
    facing: 1 | -1;
    animState: HackerAnimState;
    frameIdx: number;
    aimMode: AimMode;
    weapon: WeaponId;
    recoil: number;
    scaleX?: number;
    scaleY?: number;
    whiteFlash?: boolean;
    theme: VrCorpTheme;
  }
): void {
  const {
    footX,
    footY,
    facing,
    animState,
    frameIdx,
    aimMode,
    weapon,
    recoil,
    scaleX = 1,
    scaleY = 1,
    whiteFlash = false,
    theme,
  } = opts;
  const f = ((frameIdx % 6) + 6) % 6;

  ctx.save();
  ctx.translate(Math.round(footX), Math.round(footY));
  ctx.scale(facing * scaleX, scaleY);

  const wire = whiteFlash ? WHITE : "#39ff14";
  const holoAccent = whiteFlash ? WHITE : theme.primary === "#39ff14" ? "#00f0ff" : "#00f0ff";

  if (animState === "crouch") {
    drawWiredBox(ctx, -6, -15, 13, 12, whiteFlash ? WHITE : "#0b1a22", wire);
    // Crouched leg
    drawWiredBox(ctx, -5, -6, 6, 6, whiteFlash ? WHITE : "#102832", holoAccent);
    // Head
    drawHead(ctx, -2, -21, f, whiteFlash, wire, holoAccent);
    renderWeaponArm(ctx, 2, -13, aimMode, weapon, recoil, whiteFlash, holoAccent);
    ctx.restore();
    return;
  }

  const runBob = animState === "run" ? [0, -1, 0, 1, 0, -1][f] : animState === "idle" ? (f % 3 === 0 ? -1 : 0) : 0;
  const stride = animState === "run" ? [-3, -1, 2, 3, 1, -2][f] : animState === "jump" ? 2 : 0;
  const torsoLean = animState === "run" ? 1 : animState === "dash" ? 3 : 0;

  // Holographic legs
  drawWiredBox(ctx, -4 + stride, -10, 4, 10, whiteFlash ? WHITE : "#0c1d28", holoAccent);
  drawWiredBox(ctx, 1 - stride, -10, 4, 10, whiteFlash ? WHITE : "#102a38", wire);

  // Wireframe cyber-coat torso
  const torsoY = -22 + runBob;
  drawWiredBox(ctx, -5 + torsoLean, torsoY, 10, 13, whiteFlash ? WHITE : "#0a1622", wire);
  if (!whiteFlash) {
    ctx.fillStyle = holoAccent;
    ctx.fillRect(-3 + torsoLean, torsoY + 3, 2, 8);
    ctx.fillStyle = "#39ff14";
    ctx.fillRect(1 + torsoLean, torsoY + 2, 3, 2);
  }

  // Neural jack + visor head
  renderVrHead(ctx, -4 + torsoLean, torsoY - 8, f, whiteFlash, wire, holoAccent);
  renderWeaponArm(ctx, 1 + torsoLean, torsoY + 4, aimMode, weapon, recoil, whiteFlash, holoAccent);
  ctx.restore();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  f: number,
  whiteFlash: boolean,
  wire: string,
  holoAccent: string
) {
  renderVrHead(ctx, hx, hy, f, whiteFlash, wire, holoAccent);
}

function renderVrHead(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  frameIdx: number,
  whiteFlash: boolean,
  wire: string,
  holoAccent: string
): void {
  drawWiredBox(ctx, hx, hy, 9, 8, whiteFlash ? WHITE : "#0e222e", wire);
  if (whiteFlash) return;
  // AR neural crown + antenna
  ctx.fillStyle = holoAccent;
  ctx.fillRect(hx - 1, hy - 1, 9, 2);
  ctx.fillRect(hx - 1, hy + 2, 1, 3);
  // Glowing Visor slit
  ctx.fillStyle = "#040810";
  ctx.fillRect(hx + 2, hy + 2, 7, 4);
  ctx.fillStyle = holoAccent;
  ctx.fillRect(hx + 3, hy + 3, 5, 2);
  const glint = hx + 3 + (frameIdx % 4);
  ctx.fillStyle = WHITE;
  ctx.fillRect(glint, hy + 3, 2, 1);
}

function renderWeaponArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  aimMode: AimMode,
  weapon: WeaponId,
  recoil: number,
  whiteFlash: boolean,
  holoAccent: string
): void {
  const angleMap: Record<AimMode, number> = {
    straight: 0,
    upDiag: -Math.PI / 4,
    up: -Math.PI / 2,
    downDiag: Math.PI / 4,
    down: Math.PI / 2,
  };
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angleMap[aimMode]);
  ctx.translate(-Math.round(recoil * 0.7), 0);

  drawWiredBox(ctx, -1, -2, 6, 4, whiteFlash ? WHITE : "#142a3a", holoAccent);
  if (weapon === "pistol") {
    drawWiredBox(ctx, 5, -3, 7, 3, whiteFlash ? WHITE : "#1e2e46", "#ffe600");
  } else if (weapon === "shotgun") {
    drawWiredBox(ctx, 3, -3, 12, 4, whiteFlash ? WHITE : "#262038", "#ff9500");
  } else {
    drawWiredBox(ctx, 4, -3, 10, 3, whiteFlash ? WHITE : "#142e44", "#00f0ff");
  }
  ctx.restore();
}

/**
 * WADENS SENTRY (VR thug) — geometric hologram enforcer stylized per corporation theme.
 */
export function renderVrSentrySprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  h: number,
  facing: 1 | -1,
  state: EnemyAIState,
  frameIdx: number,
  whiteFlash: boolean,
  theme: VrCorpTheme
): void {
  const f = ((frameIdx % 6) + 6) % 6;
  ctx.save();
  ctx.translate(Math.round(sx + w * 0.5), Math.round(sy + h));
  ctx.scale(facing, 1);

  if (whiteFlash) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(-7, -26, 14, 26);
    ctx.restore();
    return;
  }

  const moving = state === "patrol" || state === "retreat";
  const bob = moving ? [-1, 0, 1, 0, -1, 0][f] : f === 2 || f === 3 ? 1 : 0;
  const stride = moving ? [-3, -1, 2, 3, 1, -2][f] : 0;
  const crouch = state === "alert" ? 2 : 0;

  drawWiredBox(ctx, -5 + stride, -9, 4, 9, theme.tileCore, theme.enemyAccent);
  drawWiredBox(ctx, 1 - stride, -9, 4, 9, theme.tileRecess, theme.secondary);
  drawWiredBox(ctx, -6, -19 + bob + crouch, 12, 11 - crouch, theme.tileCore, theme.enemyAccent);
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(-4, -16 + bob + crouch, 8, 2);

  // Geometric WADENS helmet & glowing crest
  drawWiredBox(ctx, -4, -25 + bob + crouch, 8, 6, theme.tileRecess, theme.enemyAccent);
  ctx.fillStyle = state === "attack" || state === "alert" ? "#ffffff" : theme.enemyAccent;
  ctx.fillRect(0, -23 + bob + crouch, 4, 2);
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(-2, -28 + bob + crouch, 5, 3);

  const recoil = state === "attack" && f % 2 === 0 ? -2 : 0;
  drawWiredBox(ctx, 3 + recoil, -19 + bob + crouch, 8, 3, theme.tileRecess, theme.enemyAccent);
  ctx.restore();
}

/**
 * BASTION WARDEN (VR heavy) — armored corporate juggernaut construct with glowing reactor core.
 */
export function renderVrWardenSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  h: number,
  facing: 1 | -1,
  state: EnemyAIState,
  frameIdx: number,
  whiteFlash: boolean,
  theme: VrCorpTheme
): void {
  const f = ((frameIdx % 6) + 6) % 6;
  ctx.save();
  ctx.translate(Math.round(sx + w * 0.5), Math.round(sy + h));
  ctx.scale(facing, 1);

  if (whiteFlash) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(-9, -30, 18, 30);
    ctx.restore();
    return;
  }

  const moving = state === "patrol" || state === "retreat";
  const stomp = moving ? [0, -1, 0, 1, 0, -1][f] : 0;
  const stride = moving ? [-2, -1, 1, 2, 1, -1][f] : 0;

  drawWiredBox(ctx, -7 + stride, -10, 5, 10, theme.tileCore, theme.secondary);
  drawWiredBox(ctx, 2 - stride, -10, 5, 10, theme.tileRecess, theme.secondary);

  drawWiredBox(ctx, -9, -23 + stomp, 18, 14, theme.tileCore, theme.enemyAccent);
  ctx.fillStyle = theme.secondary;
  ctx.fillRect(-6, -20 + stomp, 12, 3);
  ctx.fillStyle = f % 2 === 0 ? "#ffffff" : theme.danger;
  ctx.fillRect(-2, -15 + stomp, 4, 4);

  drawWiredBox(ctx, -6, -30 + stomp, 12, 8, theme.tileRecess, theme.enemyAccent);
  ctx.fillStyle = state === "alert" ? "#ffe600" : theme.danger;
  ctx.fillRect(0, -27 + stomp, 6, 2);

  const recoil = state === "attack" ? -2 : 0;
  drawWiredBox(ctx, 2 + recoil, -18 + stomp, 13, 4, theme.tileRecess, theme.secondary);
  ctx.restore();
}

/**
 * SEEKER DAEMON (VR drone) — octagonal security node with holo rotors & scanner eye.
 */
export function renderVrDaemonSprite(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  facing: 1 | -1,
  state: EnemyAIState,
  frameIdx: number,
  whiteFlash: boolean,
  theme: VrCorpTheme
): void {
  const f = ((frameIdx % 6) + 6) % 6;
  ctx.save();
  ctx.translate(Math.round(sx + 8), Math.round(sy + 7));
  ctx.scale(facing, 1);

  if (whiteFlash) {
    ctx.fillStyle = WHITE;
    ctx.fillRect(-8, -7, 16, 14);
    ctx.restore();
    return;
  }

  const rw = [14, 10, 4, 14, 8, 4][f];
  ctx.fillStyle = theme.primary;
  ctx.fillRect(-Math.floor(rw / 2), -8, rw, 2);

  ctx.fillStyle = f % 2 === 0 ? theme.secondary : theme.primary;
  ctx.fillRect(-3, 5, 6, 2);

  drawWiredBox(ctx, -7, -5, 14, 10, theme.tileCore, theme.primary);
  ctx.fillStyle = state === "alert" || state === "attack" ? theme.danger : theme.primary;
  ctx.fillRect(1, -1, 5, 3);
  ctx.fillStyle = WHITE;
  ctx.fillRect(2 + (f % 3), 0, 1, 1);
  ctx.restore();
}
