import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

export class AIController {
  constructor(vehicle, track, powerUpSystem, skill = 1, difficulty = "medium") {
    this.vehicle = vehicle;
    this.track = track;
    this.powerUpSystem = powerUpSystem;
    this.skill = skill;
    this.difficulty = difficulty;

    const useBias = difficulty === "hard" ? 0.7 : difficulty === "easy" ? 1.5 : 1;
    this.useItemTimer = (1.2 + Math.random() * 2.2) * useBias;

    this.shortcutBias = difficulty === "hard" ? 0.92 : difficulty === "easy" ? 0.2 : 0.55;
    this.precision = difficulty === "hard" ? 1.2 : difficulty === "easy" ? 0.86 : 1;
    this.aggression = difficulty === "hard" ? 1.15 : difficulty === "easy" ? 0.78 : 0.96;
    this.laneOffset = 0;
    this.laneTimer = 0;

    this._tmpToTarget = new THREE.Vector3();
    this._tmpAway = new THREE.Vector3();
    this._tmpForward = new THREE.Vector3();
    this._tmpDesiredDir = new THREE.Vector3();
    this._tmpF = new THREE.Vector3();
    this._tmpS = new THREE.Vector3();
    this._tmpDesiredVel = new THREE.Vector3();
    this._tmpRelative = new THREE.Vector3();
  }

  update(dt, racers) {
    const v = this.vehicle;

    const routeSamples = v.activeRoute !== "main" && this.track.routes?.[v.activeRoute]
      ? this.track.routes[v.activeRoute].samples
      : this.track.samples;
    const routeCount = routeSamples.length;

    const speedLookAhead = THREE.MathUtils.clamp(v.speed * 0.22, 0, 18);
    const lookAhead = Math.floor((17 + this.skill * 11 + speedLookAhead) * this.precision);
    const targetIndex = (v.sampleIndex + lookAhead + routeCount) % routeCount;
    const targetSample = routeSamples[targetIndex];

    this.laneTimer -= dt;
    const maxLane = this.track.halfWidth * (v.activeRoute === "main" ? 0.36 : 0.18);

    let nearestAhead = null;
    let nearestAheadDist = Infinity;

    const probeForward = this._tmpForward.set(Math.sin(v.heading), 0, Math.cos(v.heading));
    const probeSide = this._tmpS.set(probeForward.z, 0, -probeForward.x);

    for (const r of racers) {
      if (r === v || r.eliminated) continue;
      const rel = this._tmpRelative.copy(r.position).sub(v.position).setY(0);
      const ahead = rel.dot(probeForward);
      if (ahead < 1 || ahead > 34) continue;
      const side = rel.dot(probeSide);
      if (Math.abs(side) > this.track.halfWidth * 0.9) continue;
      if (ahead < nearestAheadDist) {
        nearestAheadDist = ahead;
        nearestAhead = { side, ahead };
      }
    }

    if (this.laneTimer <= 0) {
      if (nearestAhead) {
        const desiredSide = nearestAhead.side >= 0 ? -1 : 1;
        const overtakeLane = maxLane * (0.75 + 0.15 * this.skill) * this.aggression;
        this.laneOffset = THREE.MathUtils.clamp(desiredSide * overtakeLane, -maxLane, maxLane);
        this.laneTimer = 0.45 + Math.random() * 0.35;
      } else {
        const randomLane = (Math.random() * 2 - 1) * maxLane * 0.55;
        this.laneOffset = THREE.MathUtils.damp(this.laneOffset, randomLane, 4.2, dt);
        this.laneTimer = 0.7 + Math.random() * 0.7;
      }
    }

    let target = targetSample.p.clone().addScaledVector(targetSample.normal, this.laneOffset);

    const canUseShortcuts = this.difficulty !== "easy";
    if (canUseShortcuts && v.activeRoute === "main" && this.track.routes) {
      const options = ["shortcutA", "shortcutB", "shortcutC"];
      for (const name of options) {
        const route = this.track.routes[name];
        if (!route) continue;
        const d2 = v.position.distanceToSquared(route.entryPoint);
        const useChance = this.shortcutBias * (this.difficulty === "hard" ? 1.05 : 0.62);
        if (d2 < 72 * 72 && Math.random() < useChance * dt * 3.2) {
          target = route.entryPoint;
          break;
        }
      }
    }

    const toTarget = this._tmpToTarget.copy(target).sub(v.position).setY(0);

    for (const hz of this.track.hazards || []) {
      const away = this._tmpAway.copy(v.position).sub(hz.position).setY(0);
      const d2 = away.lengthSq();
      if (d2 < 24 * 24 && d2 > 0.0001) {
        away.normalize().multiplyScalar(8 / Math.sqrt(d2));
        toTarget.add(away);
      }
    }

    for (const r of racers) {
      if (r === v || r.eliminated) continue;
      const away = this._tmpAway.copy(v.position).sub(r.position).setY(0);
      const d2 = away.lengthSq();
      if (d2 < 12 * 12 && d2 > 0.0001) {
        away.normalize().multiplyScalar(5 / Math.sqrt(d2));
        toTarget.add(away);
      }
    }

    const forward = this._tmpForward.set(Math.sin(v.heading), 0, Math.cos(v.heading));
    const desiredDir = this._tmpDesiredDir.copy(toTarget);
    if (desiredDir.lengthSq() < 0.0001) desiredDir.copy(forward);
    desiredDir.normalize();

    const crossY = forward.x * desiredDir.z - forward.z * desiredDir.x;
    const steer = THREE.MathUtils.clamp(-crossY * (2.55 + this.skill * 0.92) * this.precision, -1, 1);

    const curveProbe = Math.max(8, Math.floor(lookAhead * 0.85));
    const nowSample = routeSamples[(v.sampleIndex + routeCount) % routeCount];
    const futureSample = routeSamples[(v.sampleIndex + curveProbe + routeCount) % routeCount];
    const curveAmount = Math.abs(nowSample.tan.x * futureSample.tan.z - nowSample.tan.z * futureSample.tan.x);
    const cornerFactor = THREE.MathUtils.clamp(curveAmount * 2.6, 0, 1);

    const speedMod = this.difficulty === "hard" ? 3.4 : this.difficulty === "easy" ? -2.6 : 0;
    const straightSpeed = 48 + this.skill * 3.2 + speedMod;
    const cornerSpeed = 28 + this.skill * 2.2 + speedMod * 0.5;
    const turnPenalty = THREE.MathUtils.clamp(Math.abs(steer) * 8.5, 0, 7.5);
    const targetSpeed = THREE.MathUtils.lerp(straightSpeed, cornerSpeed, cornerFactor) - turnPenalty;
    v.speed = THREE.MathUtils.damp(v.speed, targetSpeed, 3.9, dt);

    v.heading += steer * (1.72 + this.skill * 0.26) * this.precision * dt;

    const aiDrift = Math.abs(steer) > 0.62 && Math.abs(v.speed) > 24 && cornerFactor > 0.24;
    v.driftFactor = THREE.MathUtils.damp(v.driftFactor, aiDrift ? 0.65 : 0, 7.2, dt);
    const grip = aiDrift ? 3.3 : 6.9;

    const f = this._tmpF.set(Math.sin(v.heading), 0, Math.cos(v.heading));
    const s = this._tmpS.set(f.z, 0, -f.x);
    const sideTarget = steer * Math.abs(v.speed) * (aiDrift ? 0.47 : 0.18);

    v.sideSlip = THREE.MathUtils.damp(v.sideSlip, sideTarget, aiDrift ? 3.2 : 7.8, dt);

    const desiredVel = this._tmpDesiredVel.copy(f).multiplyScalar(v.speed).addScaledVector(s, v.sideSlip);
    v.velocity.lerp(desiredVel, 1 - Math.exp(-grip * dt));

    v.position.addScaledVector(v.velocity, dt);

    this.useItemTimer -= dt;
    if (this.useItemTimer <= 0) {
      const useBias = this.difficulty === "hard" ? 0.75 : this.difficulty === "easy" ? 1.5 : 1;
      this.useItemTimer = (1.4 + Math.random() * 3.4) * useBias;
      this.powerUpSystem.tryUseItem(v, racers);
    }

    if (v.mesh.userData.driverRoot) {
      const bob = Math.sin(performance.now() * 0.009 + v.sampleIndex * 0.02) * 0.04;
      v.mesh.userData.driverRoot.position.y = 2.4 + bob;
      v.mesh.userData.driverRoot.rotation.z = -steer * 0.08;
    }
  }
}
