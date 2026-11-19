// =====================================================================
// Мобильное управление (на ПК не используется).
//  • левая половина экрана — «плавающий» стик движения: появляется там, где коснулся палец;
//  • правая половина — стик прицела: тянете в сторону цели, оттянули сильнее — стрельба;
//    помощь в прицеливании доводит ствол до ближайшего врага;
//  • кнопки действий подстраиваются под героя: КЛОНЫ (Дани), РЫВОК и БАБАХ (Гала), АРСЕНАЛ (Даур), БРОСОК, ГРАНАТА;
//  • в меню — ▲ ▼ OK и НАЗАД, плюс можно просто нажимать на пункты на экране.
// =====================================================================
(function () {
  if (!Input.isMobile) return;
  document.body.classList.add('is-mobile');

  // Первое касание: разблокировка звука, полный экран и альбомная ориентация
  window.addEventListener('touchstart', () => {
    AudioSys.init(); AudioSys.resume();
    if (window.game) window.game._tapped = true;
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  }, { once: true, passive: true });
  window.addEventListener('touchstart', () => { if (window.game) window.game._tapped = true; }, { passive: true });

  // ---------- плавающий стик ----------
  function floatingStick(zoneId, stickId, R, onMove, onEnd) {
    const zone = document.getElementById(zoneId), stick = document.getElementById(stickId);
    if (!zone || !stick) return;
    const knob = stick.querySelector('.stick-knob');
    let id = null, cx = 0, cy = 0;
    const show = (x, y) => { stick.style.left = x + 'px'; stick.style.top = y + 'px'; stick.classList.add('on'); };
    const move = (x, y) => {
      let dx = x - cx, dy = y - cy;
      const len = Math.hypot(dx, dy);
      // палец ушёл далеко — стик «едет» за ним, чтобы не терять управление
      if (len > R * 1.6) { cx += dx * (1 - R * 1.6 / len); cy += dy * (1 - R * 1.6 / len); stick.style.left = cx + 'px'; stick.style.top = cy + 'px'; dx = x - cx; dy = y - cy; }
      const l2 = Math.hypot(dx, dy), k = l2 > R ? R / l2 : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      onMove(dx * k / R, dy * k / R, Math.min(1, l2 / R));
    };
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (id !== null) return;
      const t = e.changedTouches[0];
      id = t.identifier; cx = t.clientX; cy = t.clientY;
      show(cx, cy);
      knob.style.transform = 'translate(0,0)';
      onMove(0, 0, 0);
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === id) move(t.clientX, t.clientY);
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === id) {
        id = null; stick.classList.remove('on'); knob.style.transform = 'translate(0,0)';
        onEnd();
      }
    };
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
  }

  floatingStick('zone-move', 'stick-move', 52,
    (x, y, m) => Input.setMove(x * Math.min(1, m * 1.25), y * Math.min(1, m * 1.25)),
    () => Input.setMove(0, 0));
  floatingStick('zone-aim', 'stick-aim', 52,
    (x, y, m) => { Input.setAim(x, y); Input.touch.aimMag = m; document.getElementById('stick-aim').classList.toggle('fire', m > AIM_FIRE); },
    () => { Input.setAim(0, 0); Input.touch.aimMag = 0; document.getElementById('stick-aim').classList.remove('fire'); });

  // ---------- кнопки ----------
  function tapBtn(id, onDown, onUp) {
    const b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add('pressed'); onDown(); }, { passive: false });
    const up = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } b.classList.remove('pressed'); if (onUp) onUp(); };
    b.addEventListener('touchend', up, { passive: false });
    b.addEventListener('touchcancel', () => up());
  }
  tapBtn('btn-throw', () => Input.setThrow(true), () => Input.setThrow(false));
  tapBtn('btn-grenade', () => Input.simulatePress('KeyG'));
  tapBtn('btn-kick', () => Input.simulatePress('KeyF'));
  tapBtn('btn-ult', () => Input.simulatePress('KeyE'));
  tapBtn('btn-pause', () => { Input.setPause(true); setTimeout(() => Input.setPause(false), 60); });
  // меню
  tapBtn('btn-up', () => Input.simulatePress('MobileUp'));
  tapBtn('btn-down', () => Input.simulatePress('MobileDown'));
  tapBtn('btn-enter', () => Input.simulatePress('MobileEnter'));
  tapBtn('btn-back', () => { Input.setPause(true); setTimeout(() => Input.setPause(false), 60); });

  // ---------- кнопки под героя и их состояние ----------
  const $ = (id) => document.getElementById(id);
  function sync() {
    requestAnimationFrame(sync);
    const g = window.game;
    if (!g) return;
    const playing = g.state === 'playing' || g.state === 'levelClear';
    $('mobile-game-controls').classList.toggle('active', playing && !TextField.active);
    $('mobile-menu-controls').classList.toggle('active', !playing && !TextField.active && g.state !== 'loading' && g.state !== 'levelLoad');
    const p = g.player;
    if (!playing || !p) return;
    document.body.dataset.hero = p.charId;
    // гранаты
    const gb = $('btn-grenade');
    gb.querySelector('b').textContent = p.grenades || 0;
    gb.classList.toggle('off', !(p.grenades > 0));
    // бросок — только если есть что бросать
    $('btn-throw').classList.toggle('off', !(p.weapon || p.weapon2));
    // навык: перезарядка кольцом
    // навык F: КЛОНЫ (Дани) / РЫВОК (Гала), кольцо — перезарядка
    const kb = $('btn-kick'), cdMax = SKILL_CD[p.charId] || 1;
    kb.querySelector('span').textContent = { dani: 'КЛОНЫ', gal: 'РЫВОК', daur: 'АРСЕНАЛ' }[p.charId] || 'НАВЫК';
    kb.style.setProperty('--cd', p.skillCd > 0 ? String(1 - p.skillCd / cdMax) : '1');
    kb.classList.toggle('off', p.skillCd > 0);
    $('btn-ult').classList.toggle('ready', !!p.babahReady);
  }
  requestAnimationFrame(sync);

  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
})();
