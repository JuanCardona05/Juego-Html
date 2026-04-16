const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

export class KartController {
  constructor(stats, x, y, angle = 0, color = "#f94144") {
    this.stats = stats;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.angle = angle;
    this.color = color;

    this.throttle = 0;
    this.steer = 0;
    this.drift = false;

    this.radius = 14;
    this.boostTimer = 0;
    this.boostBonus = 0;
    this.hitTimer = 0;
    this.hitSlow = 1;

    this.driftCharge = 0;
    this.wasDrifting = false;

    this.shieldTimer = 0;
    this.currentPowerUp = "None";

    this.lap = 1;
    this.nextCheckpoint = 0;
    this.finished = false;
    this.finishOrder = 0;
  }

  setInput(throttle, steer, drift) {
    this.throttle = clamp(throttle, -1, 1);
    this.steer = clamp(steer, -1, 1);
    this.drift = drift;
  }

  applyBoost(duration, bonus) {
    this.boostTimer = Math.max(this.boostTimer, duration);
    this.boostBonus = Math.max(this.boostBonus, bonus);
  }

  applyHit(slowMult = 0.55, duration = 1.2) {
    if (this.shieldTimer > 0) return;
    this.hitSlow = slowMult;
    this.hitTimer = duration;
  }

  activateShield(duration = 2.8) {
    this.shieldTimer = Math.max(this.shieldTimer, duration);
  }

  update(dt) {
    if (this.finished) {
      this.velocity.x *= 0.97;
      this.velocity.y *= 0.97;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      return;
    }

    if (this.hitTimer > 0) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        this.hitSlow = 1;
      }
    }

    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) this.boostBonus = 0;
    }

    if (this.shieldTimer > 0) {
      this.shieldTimer -= dt;
    }

    const fwdX = Math.cos(this.angle);
    const fwdY = Math.sin(this.angle);
    const rightX = -Math.sin(this.angle);
    const rightY = Math.cos(this.angle);

    let fwdSpeed = this.velocity.x * fwdX + this.velocity.y * fwdY;
    let latSpeed = this.velocity.x * rightX + this.velocity.y * rightY;

    const maxForward = (this.stats.maxSpeed + this.boostBonus) * this.hitSlow;
    const maxReverse = this.stats.maxSpeed * this.stats.reverseFactor;

    let target = 0;
    if (this.throttle > 0) target = this.throttle * maxForward;
    if (this.throttle < 0) target = this.throttle * maxReverse;

    const accel = this.throttle >= 0 ? this.stats.acceleration : this.stats.brake;
    const t = clamp((accel * dt) / Math.max(8, Math.abs(target - fwdSpeed)), 0, 1);
    fwdSpeed = lerp(fwdSpeed, target, t);

    const canDrift = this.drift && Math.abs(this.steer) > 0.25 && Math.abs(fwdSpeed) > this.stats.driftMinSpeed;
    const grip = canDrift ? this.stats.driftGrip : this.stats.grip;
    const latT = clamp((grip * dt) / Math.max(8, Math.abs(latSpeed)), 0, 1);
    latSpeed = lerp(latSpeed, 0, latT);

    if (canDrift) {
      this.driftCharge += Math.abs(this.steer) * this.stats.driftChargeRate * dt;
    }

    if (this.wasDrifting && !canDrift) {
      if (this.driftCharge > 0.25) {
        const dur = clamp(this.driftCharge, 0.35, 1.4);
        const bonus = this.stats.driftBoostScale * clamp(this.driftCharge, 0.35, 1.2);
        this.applyBoost(dur, bonus);
      }
      this.driftCharge = 0;
    }

    this.wasDrifting = canDrift;

    const speedRatio = clamp(Math.abs(fwdSpeed) / Math.max(this.stats.maxSpeed, 1), 0, 1);
    const handle = canDrift ? this.stats.driftHandling : this.stats.handling;
    this.angle += this.steer * handle * speedRatio * dt;

    this.velocity.x = fwdX * fwdSpeed + rightX * latSpeed;
    this.velocity.y = fwdY * fwdSpeed + rightY * latSpeed;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  getSpeed() {
    return Math.hypot(this.velocity.x, this.velocity.y);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.angle);

    if (this.shieldTimer > 0) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(80, 220, 255, 0.28)";
      ctx.strokeStyle = "rgba(120, 245, 255, 0.95)";
      ctx.lineWidth = 2;
      ctx.arc(0, 0, this.radius + 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#1f2933";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-16, -11, 32, 22, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(10, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    if (this.boostTimer > 0) {
      ctx.fillStyle = "rgba(255, 137, 6, 0.95)";
      ctx.beginPath();
      ctx.moveTo(-16, -5);
      ctx.lineTo(-28 - Math.random() * 8, 0);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}
