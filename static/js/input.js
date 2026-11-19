// Сильнее этого отклонения правого стика — стрельба
const AIM_FIRE = 0.55;

const Input = {
  // телефон/планшет: сенсорный экран без точной мыши
  isMobile: (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && !(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches),
  mobileSpread: false,
  keys: {},
  typing: false,
  mouse: { x: 0, y: 0, down: false, justDown: false, right: false },
  _pressedThisFrame: {},
  touch: { 
    moveX: 0, moveY: 0, moveActive: false,
    aimX: 0, aimY: 0, aimActive: false, aimMag: 0
  },
  _touchShoot: false,
  _touchThrow: false,
  _touchPause: false,

  init(canvas) {
    this.canvas = canvas;
    
    // Игра забирает клавиатуру целиком: браузерные сочетания (Ctrl+S, Ctrl+D, Alt, Tab, пробел…) не срабатывают.
    // Пропускаем только F5/F11/F12 и Ctrl+R. Ctrl+W/T/N браузер не даёт перехватить — только в полноэкранном режиме.
    const allowed = (e) => ['F5', 'F11', 'F12'].includes(e.code) || ((e.ctrlKey || e.metaKey) && e.code === 'KeyR');
    window.addEventListener('keydown', (e) => {
      if (this.typing) return;
      if (!allowed(e)) e.preventDefault();
      if (!e.repeat) this._pressedThisFrame[e.code] = true;
      this.keys[e.code] = true;
    }, { capture: true });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (!this.typing && !allowed(e)) e.preventDefault();
    }, { capture: true });
    window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; this.mouse.right = false; });

    this.updateCoords = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const canvasRatio = canvas.width / canvas.height;
      const rectRatio = rect.width / rect.height;
      
      let renderWidth, renderHeight, offsetX, offsetY;

      if (rectRatio > canvasRatio) {
        renderHeight = rect.height;
        renderWidth = renderHeight * canvasRatio;
        offsetX = (rect.width - renderWidth) / 2;
        offsetY = 0;
      } else {
        renderWidth = rect.width;
        renderHeight = renderWidth / canvasRatio;
        offsetX = 0;
        offsetY = (rect.height - renderHeight) / 2;
      }

      this.mouse.x = (clientX - rect.left - offsetX) * (canvas.width / renderWidth);
      this.mouse.y = (clientY - rect.top - offsetY) * (canvas.height / renderHeight);
    };

    canvas.addEventListener('mousemove', (e) => {
      this.updateCoords(e.clientX, e.clientY);
    });
    
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) this.mouse.right = true;
      if (e.button === 0) { 
        this.mouse.down = true; 
        this.mouse.justDown = true;
      }
    });
    
    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.mouse.right = false;
      if (e.button === 0) this.mouse.down = false;
    });
    
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
  
  consumeClick() { 
    const j = this.mouse.justDown; 
    this.mouse.justDown = false; 
    return j; 
  },
  
  endFrame() {
    this.mouse.justDown = false;
    this._pressedThisFrame = {};
  },
};