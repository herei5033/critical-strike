const Utils = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  rand: (a, b) => Math.random() * (b - a) + a,
  randInt: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  aabb: (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y,

  // Расстояние от точки (px,py) до отрезка (x1,y1)-(x2,y2).
  // Нужно, чтобы быстрые пули не "пролетали" сквозь цели при просадке FPS.
  segDist: (x1, y1, x2, y2, px, py) => {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  },

  // Выполняет fn, временно подменив Math.random на генератор с фиксированным зерном.
  // Так все участники корпоратива строят из одного seed одинаковый уровень.
  withSeed: (seed, fn) => {
    const orig = Math.random;
    let s = (seed >>> 0) || 1;
    Math.random = () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try { return fn(); } finally { Math.random = orig; }
  },

  // Частицы
  spawnBloodParticles: (x, y, count, angle = null) => {
    if (typeof Effects !== 'undefined') Effects.bloodSplat(x, y, angle, count);
    const particles = [];
    for (let i = 0; i < count; i++) {
      const a = angle !== null ? angle + Utils.rand(-1, 1) : Utils.rand(0, Math.PI * 2);
      const speed = Utils.rand(50, 250);
      particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: Utils.rand(0.3, 0.8),
        maxLife: 0.8,
        size: Utils.rand(1, 4),
        color: Utils.choice(['#b3001b', '#ff2a6d', '#8a0015'])
      });
    }
    return particles;
  }
};
