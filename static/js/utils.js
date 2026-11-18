const Utils = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  rand: (a, b) => Math.random() * (b - a) + a,
  randInt: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  aabb: (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y,
  
  // Частицы
  spawnBloodParticles: (x, y, count, angle = null) => {
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