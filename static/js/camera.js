class Camera {
  constructor(vw, vh, zoom = 1.15) {
    this.x = 0;
    this.y = 0;
    this.vw = vw;
    this.vh = vh;
    this.zoom = zoom;
  }

  follow(target, world, dt) {
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    if (!target || !isFinite(target.x) || !isFinite(target.y)) return;
    if (!world || !isFinite(world.w) || !isFinite(world.h)) return;

    const viewW = this.vw / this.zoom;
    const viewH = this.vh / this.zoom;

    let tx = target.x + target.w / 2 - viewW / 2;
    let ty = target.y + target.h / 2 - viewH / 2;

    tx = Utils.clamp(tx, 0, Math.max(0, world.w - viewW));
    ty = Utils.clamp(ty, 0, Math.max(0, world.h - viewH));

    if (!isFinite(tx)) tx = this.x;
    if (!isFinite(ty)) ty = this.y;

    const k = 1 - Math.pow(0.0005, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    if (!isFinite(this.x)) this.x = tx;
    if (!isFinite(this.y)) this.y = ty;
  }

  apply(ctx) {
    const cx = isFinite(this.x) ? Math.round(this.x) : 0;
    const cy = isFinite(this.y) ? Math.round(this.y) : 0;
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx, -cy);
  }
}