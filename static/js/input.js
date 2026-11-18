const Input = {
  keys: {},
  mouse: { x: 0, y: 0, down: false, justDown: false },
  _pressedThisFrame: {},
  touch: { 
    moveX: 0, moveY: 0, moveActive: false,
    aimX: 0, aimY: 0, aimActive: false 
  },
  _touchShoot: false,
  _touchThrow: false,
  _touchPause: false,

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (!e.repeat) this._pressedThisFrame[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; });

    canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.mouse.justDown = true; });
    window.addEventListener('mouseup',  () => { this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  },

  setMove(x, y) {
    this.touch.moveX = x;
    this.touch.moveY = y;
    this.touch.moveActive = (Math.abs(x) > 0.1 || Math.abs(y) > 0.1);
  },

  setAim(x, y) {
    this.touch.aimX = x;
    this.touch.aimY = y;
    this.touch.aimActive = (Math.abs(x) > 0.1 || Math.abs(y) > 0.1);
  },

  setShoot(on) {
    this._touchShoot = on;
    if (on) { this.mouse.down = true; this.mouse.justDown = true; }
    else this.mouse.down = false;
  },
  setThrow(on) { this._touchThrow = on; },
  setPause(on) { this._touchPause = on; },

  // Для меню: эмуляция нажатий
  simulatePress(code) {
    this._pressedThisFrame[code] = true;
    setTimeout(() => { this._pressedThisFrame[code] = false; }, 100);
  },

  isDown(c) {
    if (c === 'KeyQ' && this._touchThrow) return true;
    if (c === 'Escape' && this._touchPause) return true;
    return !!this.keys[c];
  },
  wasPressed(c) {
    if (c === 'KeyQ' && this._touchThrow) return true;
    if (c === 'Escape' && this._touchPause) return true;
    return !!this._pressedThisFrame[c];
  },
  endFrame() {
    this.mouse.justDown = false;
    this._pressedThisFrame = {};
  },
};