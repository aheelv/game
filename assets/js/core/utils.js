/* 公共工具函数：所有游戏共享，保持命名统一 */
(function () {
  const A = (window.Arcade = window.Arcade || {});

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function uid() {
    return 'g' + Math.random().toString(36).slice(2, 9);
  }

  const store = {
    prefix: 'arcade20:',
    get(key, fallback) {
      try {
        const v = localStorage.getItem(this.prefix + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(this.prefix + key, JSON.stringify(value));
      } catch (e) {
        /* 隐私模式下静默失败 */
      }
    },
  };

  /* 难度预设：统一映射到速度 / 数量等参数 */
  const DIFFICULTY = {
    easy: { label: '轻松', speedFactor: 0.7, countFactor: 0.75, timeBonus: 1.3 },
    normal: { label: '标准', speedFactor: 1, countFactor: 1, timeBonus: 1 },
    hard: { label: '高手', speedFactor: 1.45, countFactor: 1.3, timeBonus: 0.8 },
  };

  A.util = {
    clamp, rand, randInt, choice, lerp, dist, deepClone, shuffle, formatTime, uid,
  };
  A.store = store;
  A.DIFFICULTY = DIFFICULTY;
})();
