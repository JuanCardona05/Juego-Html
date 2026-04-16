export class PlayerController {
  constructor(input, kart, powerUpSystem) {
    this.input = input;
    this.kart = kart;
    this.powerUpSystem = powerUpSystem;
  }

  update() {
    const up = this.input.isDown("ArrowUp") || this.input.isDown("KeyW");
    const down = this.input.isDown("ArrowDown") || this.input.isDown("KeyS");
    const left = this.input.isDown("ArrowLeft") || this.input.isDown("KeyA");
    const right = this.input.isDown("ArrowRight") || this.input.isDown("KeyD");
    const drift = this.input.isDown("Space");

    const throttle = (up ? 1 : 0) + (down ? -1 : 0);
    const steer = (right ? 1 : 0) + (left ? -1 : 0);

    this.kart.setInput(throttle, steer, drift);

    if (this.input.wasPressed("ShiftLeft") || this.input.wasPressed("KeyE")) {
      this.powerUpSystem.useCurrent(this.kart);
    }
  }
}
