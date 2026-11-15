export type ParticleStyle = "pixel" | "casing" | "smoke" | "spark" | "glow" | "voxel";

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
  bounce: number;
  style: ParticleStyle;
  angle: number;
  vAngle: number;
}

export class ParticlePool {
  public readonly items: Particle[];
  private cursor = 0;

  constructor(capacity = 460) {
    this.items = new Array<Particle>(capacity);
    for (let i = 0; i < capacity; i++) {
      this.items[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: "#ffffff",
        gravity: 0,
        bounce: 0,
        style: "pixel",
        angle: 0,
        vAngle: 0,
      };
    }
  }

  public clear(): void {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].active = false;
    }
  }

  public spawn(opts: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size?: number;
    color: string;
    gravity?: number;
    bounce?: number;
    style?: ParticleStyle;
    vAngle?: number;
  }): void {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    p.active = true;
    p.x = opts.x;
    p.y = opts.y;
    p.vx = opts.vx;
    p.vy = opts.vy;
    p.life = opts.life;
    p.maxLife = opts.life;
    p.size = opts.size ?? 2;
    p.color = opts.color;
    p.gravity = opts.gravity ?? 0;
    p.bounce = opts.bounce ?? 0;
    p.style = opts.style ?? "pixel";
    p.angle = Math.random() * Math.PI * 2;
    p.vAngle = opts.vAngle ?? 0;
  }

  public burst(
    x: number,
    y: number,
    count: number,
    colors: string[],
    speedMin: number,
    speedMax: number,
    gravity = 360,
    style: ParticleStyle = "pixel"
  ): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speedMin + Math.random() * (speedMax - speedMin);
      this.spawn({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 35,
        life: 0.25 + Math.random() * 0.35,
        size: Math.random() < 0.45 ? 3 : 2,
        color: colors[i % colors.length],
        gravity,
        bounce: 0.35,
        style,
      });
    }
  }

  public spawnCasing(x: number, y: number, facing: number, color = "#00f0ff"): void {
    this.spawn({
      x,
      y,
      vx: -facing * (35 + Math.random() * 45),
      vy: -(65 + Math.random() * 45),
      life: 0.8 + Math.random() * 0.35,
      size: 2,
      color,
      gravity: 500,
      bounce: 0.45,
      style: "casing",
      vAngle: (Math.random() - 0.5) * 24,
    });
  }

  public update(dt: number, isSolidAt: (wx: number, wy: number) => boolean): void {
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      const nx = p.x + p.vx * dt;
      const ny = p.y + p.vy * dt;
      if (p.bounce > 0) {
        if (isSolidAt(nx, p.y)) {
          p.vx = -p.vx * p.bounce;
        } else {
          p.x = nx;
        }
        if (isSolidAt(p.x, ny)) {
          p.vy = -p.vy * p.bounce;
          p.vx *= 0.72;
        } else {
          p.y = ny;
        }
      } else {
        p.x = nx;
        p.y = ny;
      }
      p.angle += p.vAngle * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i];
      if (!p.active || p.style === "glow") continue;
      const sx = Math.round(p.x - camX);
      const sy = Math.round(p.y - camY);
      const t = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = p.style === "smoke" ? t * 0.4 : Math.min(1, t * 1.45);
      if (p.style === "voxel") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, p.size + 1, p.size + 1);
      } else {
        ctx.fillStyle = p.color;
        if (p.style === "casing") {
          ctx.fillRect(sx, sy, 3, 1);
        } else if (p.style === "smoke") {
          const sz = Math.round(p.size + (1 - t) * 4);
          ctx.fillRect(sx - (sz >> 1), sy - (sz >> 1), sz, sz);
        } else if (p.style === "spark") {
          ctx.fillRect(sx, sy, 2, 2);
        } else {
          ctx.fillRect(sx, sy, p.size, p.size);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  public renderGlow(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.items.length; i++) {
      const p = this.items[i];
      if (!p.active || p.style !== "glow") continue;
      const sx = Math.round(p.x - camX);
      const sy = Math.round(p.y - camY);
      const t = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = t * 0.52;
      ctx.fillStyle = p.color;
      const r = Math.round(p.size * (0.5 + t * 0.6));
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.restore();
  }
}
