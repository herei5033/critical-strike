const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Функция для четкого выставления размеров
function resizeCanvas() {
  // Внутреннее разрешение (для качества рендера)
  canvas.width = 960;
  canvas.height = 540;
  
  // На iOS Safari 100vh часто глючит, используем innerHeight
  document.body.style.height = window.innerHeight + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

Input.init(canvas);

function ensureAudio() {
  AudioSys.init();
  AudioSys.resume();
  window.removeEventListener('pointerdown', ensureAudio);
  window.removeEventListener('keydown', ensureAudio);
}
window.addEventListener('pointerdown', ensureAudio);
window.addEventListener('keydown', ensureAudio);

const game = new Game(canvas);

// === ФУЛЛСКРИН ===
const fsBtn = document.getElementById('fs-btn');

function toggleFullscreen() {
  const doc = window.document;
  const docEl = doc.documentElement;

  if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
    if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => {});
    else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
    else alert("Для полного экрана на iOS Safari добавьте игру на рабочий стол (Поделиться -> На экран «Домой»).");
  } else {
    if (doc.exitFullscreen) doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
  }
}

if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);

// Главный цикл
let last = performance.now();
function loop(t) {
  const dt = Math.min((t - last) / 1000, 0.05);
  last = t;

  try { game.update(dt); } catch (e) { console.error('UPDATE ERROR:', e); }
  try { game.render(); } catch (e) { console.error('RENDER ERROR:', e); }

  Input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);