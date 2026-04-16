const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class AIController {
  constructor(kart, powerUpSystem, track) {
    this.kart = kart;
    this.powerUpSystem = powerUpSystem;
    this.track = track;
    this.waypointIndex = 0;
    this.useTimer = 1.5 + Math.random() * 2;
  }

  update(dt) {
    const wp = this.track.waypoints[this.waypointIndex];
    if (!wp) {
      this.kart.setInput(0, 0, false);
      return;
    }

    const dx = wp.x - this.kart.position.x;
    const dy = wp.y - this.kart.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 42) {
      this.waypointIndex = (this.waypointIndex + 1) % this.track.waypoints.length;
    }

    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - this.kart.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steer = clamp(angleDiff * 1.5, -1, 1);
    const throttle = Math.abs(steer) > 0.7 ? 0.74 : 1;
    const drift = Math.abs(steer) > 0.52 && this.kart.getSpeed() > this.kart.stats.driftMinSpeed;

    this.kart.setInput(throttle, steer, drift);

    this.useTimer -= dt;
    if (this.useTimer <= 0) {
      this.useTimer = 1.5 + Math.random() * 3.8;
      if (Math.random() < 0.66) {
        this.powerUpSystem.useCurrent(this.kart);
      }
    }
  }
}
