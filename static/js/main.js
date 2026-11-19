const canvas = document.getElementById('game');
canvas.width = 960;
canvas.height = 540;

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

// В полноэкранном режиме блокируем клавиатуру полностью (в т.ч. Ctrl+W), если браузер это умеет
document.addEventListener('fullscreenchange', () => {
  const kb = navigator.keyboard;
  if (!kb || !kb.lock) return;
  if (document.fullscreenElement) kb.lock().catch(() => {});
  else kb.unlock();
});

// Закрытие вкладки: хост убирает комнату с сервера, соединения закрываются
window.addEventListener('pagehide', () => {
  const net = game.coopUI && game.coopUI.net;
  if (net) { net.beacon(); net.muted = true; net.close(); }
});

const fsBtn = document.getElementById('fs-btn');
if (fsBtn) {
  fsBtn.addEventListener('click', () => {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
      if (requestFullScreen) requestFullScreen.call(docEl).catch(() => {});
    } else {
      if (cancelFullScreen) cancelFullScreen.call(doc);
    }
  });
}

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