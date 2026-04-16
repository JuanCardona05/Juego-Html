const POWERUPS = ["Turbo", "Missile", "Trap", "Shield"];

export class PowerUpSystem {
  constructor(world) {
    this.world = world;
  }

  grantRandom(kart) {
    if (kart.currentPowerUp !== "None") return;
    kart.currentPowerUp = POWERUPS[(Math.random() * POWERUPS.length) | 0];
  }

  useCurrent(kart) {
    const type = kart.currentPowerUp;
    if (type === "None") return;

    if (type === "Turbo") {
      kart.applyBoost(1.6, 165);
    }

    if (type === "Shield") {
      kart.activateShield(3.2);
    }

    if (type === "Trap") {
      this.world.spawnTrap(kart);
    }

    if (type === "Missile") {
      this.world.spawnMissile(kart);
    }

    kart.currentPowerUp = "None";
  }
}
