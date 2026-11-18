(function () {
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (!isTouch) return;

  // Разблокировка звука на iOS при первом касании
  window.addEventListener('touchstart', () => {
    AudioSys.init();
    AudioSys.resume();
  }, { once: true });

  // --- Стики ---
  function setupStick(baseId, onMove) {
    const base = document.getElementById(baseId);
    const knob = base ? base.querySelector('.joystick-knob') : null;
    if (!base || !knob) return;

    const MAX_R = 36;
    let activeId = null;
    let centerX = 0, centerY = 0;

    function setKnob(dx, dy) {
      const len = Math.hypot(dx, dy);
      if (len > MAX_R) { dx = dx / len * MAX_R; dy = dy / len * MAX_R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      onMove(dx / MAX_R, dy / MAX_R);
    }

    function resetKnob() {
      knob.style.transform = 'translate(0, 0)';
      onMove(0, 0);
    }

    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      activeId = t.identifier;
      const r = base.getBoundingClientRect();
      centerX = r.left + r.width / 2;
      centerY = r.top + r.height / 2;
      setKnob(t.clientX - centerX, t.clientY - centerY);
    }, { passive: false });

    base.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) setKnob(t.clientX - centerX, t.clientY - centerY);
      }
    }, { passive: false });

    function endStick(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === activeId) { activeId = null; resetKnob(); }
      }
    }
    base.addEventListener('touchend', endStick);
    base.addEventListener('touchcancel', endStick);
  }

  setupStick('joystick-move-base', (x, y) => Input.setMove(x, y));
  setupStick('joystick-aim-base', (x, y) => Input.setAim(x, y));

  // --- Кнопки ---
  function bindHold(btnId, onDown, onUp) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); btn.classList.add('pressed'); onDown(); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); btn.classList.remove('pressed'); if (onUp) onUp(); }, { passive: false });
    btn.addEventListener('touchcancel', () => { btn.classList.remove('pressed'); if (onUp) onUp(); });
  }

  bindHold('btn-shoot', () => Input.setShoot(true), () => Input.setShoot(false));
  bindHold('btn-throw', () => Input.setThrow(true), () => Input.setThrow(false));
  bindHold('btn-pause', () => { Input.setPause(true); setTimeout(() => Input.setPause(false), 50); }, () => {});

  // --- Кнопки МЕНЮ ---
  const btnUp = document.getElementById('btn-up');
  const btnDown = document.getElementById('btn-down');
  const btnEnter = document.getElementById('btn-enter');

  if (btnUp) btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); Input.simulatePress('MobileUp'); }, { passive: false });
  if (btnDown) btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); Input.simulatePress('MobileDown'); }, { passive: false });
  if (btnEnter) btnEnter.addEventListener('touchstart', (e) => { e.preventDefault(); Input.simulatePress('MobileEnter'); }, { passive: false });

  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
})();