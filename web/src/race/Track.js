const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Track {
  constructor() {
    this.center = { x: 640, y: 360 };
    this.outerRadiusX = 470;
    this.outerRadiusY = 255;
    this.innerRadiusX = 285;
    this.innerRadiusY = 130;

    this.waypoints = this.buildWaypoints();
    this.checkpoints = this.buildCheckpoints();

    this.obstacles = [
      { x: 590, y: 245, r: 24 },
      { x: 735, y: 500, r: 20 },
      { x: 825, y: 285, r: 18 },
    ];

    this.shortcutGate = {
      x: 990,
      y: 360,
      w: 90,
      h: 120,
    };
  }

  buildWaypoints() {
    const pts = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const wobble = Math.sin(t * 3) * 18;
      pts.push({
        x: this.center.x + Math.cos(t) * (this.innerRadiusX + 75 + wobble),
        y: this.center.y + Math.sin(t) * (this.innerRadiusY + 62 - wobble * 0.4),
      });
    }
    return pts;
  }

  buildCheckpoints() {
    return this.waypoints.map((p, i) => ({ x: p.x, y: p.y, index: i, r: 38 }));
  }

  isOnRoad(pos) {
    const dx = pos.x - this.center.x;
    const dy = pos.y - this.center.y;

    const outer = (dx * dx) / (this.outerRadiusX * this.outerRadiusX) + (dy * dy) / (this.outerRadiusY * this.outerRadiusY) <= 1;
    const inner = (dx * dx) / (this.innerRadiusX * this.innerRadiusX) + (dy * dy) / (this.innerRadiusY * this.innerRadiusY) < 1;

    if (!outer) return false;

    const inShortcut =
      pos.x > this.shortcutGate.x - this.shortcutGate.w * 0.5 &&
      pos.x < this.shortcutGate.x + this.shortcutGate.w * 0.5 &&
      pos.y > this.shortcutGate.y - this.shortcutGate.h * 0.5 &&
      pos.y < this.shortcutGate.y + this.shortcutGate.h * 0.5;

    return !inner || inShortcut;
  }

  resolveBoundary(kart) {
    if (this.isOnRoad(kart.position)) return;
    kart.velocity.x *= 0.68;
    kart.velocity.y *= 0.68;

    const toCenterX = this.center.x - kart.position.x;
    const toCenterY = this.center.y - kart.position.y;
    const len = Math.hypot(toCenterX, toCenterY) || 1;
    kart.position.x += (toCenterX / len) * 24;
    kart.position.y += (toCenterY / len) * 24;
  }

  resolveObstacle(kart) {
    for (const o of this.obstacles) {
      const d = distance(kart.position, o);
      const min = kart.radius + o.r;
      if (d < min) {
        const nx = (kart.position.x - o.x) / (d || 1);
        const ny = (kart.position.y - o.y) / (d || 1);
        kart.position.x = o.x + nx * min;
        kart.position.y = o.y + ny * min;
        const dot = kart.velocity.x * nx + kart.velocity.y * ny;
        kart.velocity.x = (kart.velocity.x - 1.4 * dot * nx) * 0.72;
        kart.velocity.y = (kart.velocity.y - 1.4 * dot * ny) * 0.72;
      }
    }
  }

  draw(ctx) {
    ctx.save();

    ctx.fillStyle = "#79b96b";
    ctx.fillRect(0, 0, 1280, 720);

    ctx.fillStyle = "#a5d36f";
    for (let i = 0; i < 28; i++) {
      const x = (i * 97) % 1280;
      const y = (i * 173) % 720;
      ctx.beginPath();
      ctx.arc(x, y, 5 + (i % 6), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#40434e";
    ctx.beginPath();
    ctx.ellipse(this.center.x, this.center.y, this.outerRadiusX, this.outerRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#86c26f";
    ctx.beginPath();
    ctx.ellipse(this.center.x, this.center.y, this.innerRadiusX, this.innerRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#575e6b";
    ctx.fillRect(
      this.shortcutGate.x - this.shortcutGate.w * 0.5,
      this.shortcutGate.y - this.shortcutGate.h * 0.5,
      this.shortcutGate.w,
      this.shortcutGate.h
    );

    ctx.strokeStyle = "#f4f1de";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 18]);
    ctx.beginPath();
    ctx.ellipse(this.center.x, this.center.y, (this.outerRadiusX + this.innerRadiusX) / 2, (this.outerRadiusY + this.innerRadiusY) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const start = this.checkpoints[0];
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(start.x - 36, start.y - 44);
    ctx.lineTo(start.x - 36, start.y + 44);
    ctx.stroke();

    ctx.fillStyle = "#9d4edd";
    for (const o of this.obstacles) {
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
