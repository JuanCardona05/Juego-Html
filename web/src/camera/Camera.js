export class Camera {
  constructor(target) {
    this.target = target;
    this.pos = { x: target.position.x, y: target.position.y };
    this.follow = 0.08;
  }

  update() {
    this.pos.x += (this.target.position.x - this.pos.x) * this.follow;
    this.pos.y += (this.target.position.y - this.pos.y) * this.follow;
  }

  begin(ctx, width, height) {
    ctx.save();
    ctx.translate(width * 0.5 - this.pos.x, height * 0.5 - this.pos.y);
  }

  end(ctx) {
    ctx.restore();
  }
}
