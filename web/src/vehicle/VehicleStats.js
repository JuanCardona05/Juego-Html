export class VehicleStats {
  constructor({
    name = "Racer",
    maxSpeed = 365,
    acceleration = 260,
    brake = 320,
    reverseFactor = 0.45,
    handling = 2.4,
    driftHandling = 3.1,
    grip = 9,
    driftGrip = 3.2,
    driftChargeRate = 0.95,
    driftMinSpeed = 120,
    driftBoostScale = 150,
  } = {}) {
    this.name = name;
    this.maxSpeed = maxSpeed;
    this.acceleration = acceleration;
    this.brake = brake;
    this.reverseFactor = reverseFactor;
    this.handling = handling;
    this.driftHandling = driftHandling;
    this.grip = grip;
    this.driftGrip = driftGrip;
    this.driftChargeRate = driftChargeRate;
    this.driftMinSpeed = driftMinSpeed;
    this.driftBoostScale = driftBoostScale;
  }
}
