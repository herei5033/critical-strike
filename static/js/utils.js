const Utils = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  rand: (a, b) => Math.random() * (b - a) + a,
  randInt: (a, b) => Math.floor(Math.random() * (b - a + 1)) + a,
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  aabb: (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y,
};