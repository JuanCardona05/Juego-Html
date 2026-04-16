export class Input {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();

    window.addEventListener("keydown", (e) => {
      const code = e.code;
      if (!this.keys.has(code)) {
        this.justPressed.add(code);
      }
      this.keys.add(code);
    });

    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.code);
      this.justPressed.delete(e.code);
    });
  }

  update() {
    this.justPressed.clear();
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }
}
