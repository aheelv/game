/* 迷宫探索：递归回溯生成完美迷宫，网格移动带动画，墙体碰撞，方向提示与限时通关 */
(function () {
  const A = window.Arcade;

  A.registerRuntime('maze', {
    create(ctx) {
      const W = 480;
      const H = 480;
      const DIRS = {
        up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
      };

      function roundRect(g, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        g.beginPath();
        g.moveTo(x + r, y);
        g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
        g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
        g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
        g.closePath();
      }

      const game = {
        init() {
          ctx.makeCanvas(W, H);
          this.canvas = ctx.canvas;
          this.g = ctx.g;

          let down = null;
          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            down = { x: e.clientX, y: e.clientY };
          });
          this.canvas.addEventListener('pointerup', (e) => {
            if (ctx.state !== 'playing' || !down) return;
            const dx = e.clientX - down.x;
            const dy = e.clientY - down.y;
            down = null;
            if (Math.hypot(dx, dy) < 18) return;
            this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
          });
          this.canvas.addEventListener('pointercancel', () => { down = null; });

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            const map = {
              arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
              arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
            };
            if (map[k]) { e.preventDefault(); this.move(map[k]); }
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            this.move(dir);
          });
        },

        config() {
          const size = ctx.difficulty === 'easy' ? 9 : ctx.difficulty === 'hard' ? 19 : 13;
          const levels = ctx.difficulty === 'easy' ? 2 : ctx.difficulty === 'hard' ? 4 : 3;
          return { size, levels };
        },

        onStart() {
          const c = this.config();
          this.n = c.size;
          this.levelCount = c.levels;
          this.level = 1;
          ctx.setLevel(1);
          this.cell = W / this.n;
          this.loadLevel();
        },

        loadLevel() {
          /* 1=墙，0=通道；递归回溯从左上开凿到右下 */
          const n = this.n;
          const grid = Array.from({ length: n }, () => new Array(n).fill(1));
          const stack = [[1, 1]];
          grid[1][1] = 0;
          while (stack.length) {
            const cur = stack[stack.length - 1];
            const opts = [];
            const steps = [[0, -2], [0, 2], [-2, 0], [2, 0]];
            for (const s of steps) {
              const nr = cur[0] + s[0];
              const nc = cur[1] + s[1];
              if (nr > 0 && nc > 0 && nr < n - 1 && nc < n - 1 && grid[nr][nc] === 1) opts.push([nr, nc, s]);
            }
            if (!opts.length) { stack.pop(); continue; }
            const pick = A.util.choice(opts);
            grid[cur[0] + pick[2][0] / 2][cur[1] + pick[2][1] / 2] = 0;
            grid[pick[0]][pick[1]] = 0;
            stack.push([pick[0], pick[1]]);
          }
          /* 打通少量环路，降低纯完美迷宫的单调感，高难度环路更少 */
          const extra = Math.max(1, Math.round(n * (ctx.difficulty === 'hard' ? 0.1 : 0.28)));
          for (let i = 0; i < extra; i++) {
            const r = A.util.randInt(1, n - 2);
            const c = A.util.randInt(1, n - 2);
            if (grid[r][c] === 1) {
              const horiz = grid[r][c - 1] === 0 && grid[r][c + 1] === 0;
              const vert = grid[r - 1][c] === 0 && grid[r + 1][c] === 0;
              if (horiz !== vert) grid[r][c] = 0;
            }
          }
          this.grid = grid;
          this.exit = { r: n - 2, c: n - 2 };
          grid[this.exit.r][this.exit.c] = 0;
          this.player = { r: 1, c: 1 };
          this.frustum = { r: 1, c: 1 };
          this.anim = null;
          this.trail = [];
          this.bump = null;
          this.steps = 0;
          this.hintTimer = 0;
          this.hintPulse = 0;
          this.buildDistance();
          this.render();
        },

        /* 从终点做 BFS 生成距离场，用于方向提示 */
        buildDistance() {
          const n = this.n;
          const dist = Array.from({ length: n }, () => new Array(n).fill(-1));
          const q = [this.exit];
          dist[this.exit.r][this.exit.c] = 0;
          for (let head = 0; head < q.length; head++) {
            const p = q[head];
            for (const d of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
              const nr = p.r + d[0];
              const nc = p.c + d[1];
              if (nr >= 0 && nc >= 0 && nr < n && nc < n && this.grid[nr][nc] === 0 && dist[nr][nc] === -1) {
                dist[nr][nc] = dist[p.r][p.c] + 1;
                q.push({ r: nr, c: nc });
              }
            }
          }
          this.dist = dist;
        },

        hintDir() {
          const p = this.player;
          let best = null;
          let bestD = this.dist[p.r][p.c] < 0 ? Infinity : this.dist[p.r][p.c];
          for (const key of Object.keys(DIRS)) {
            const d = DIRS[key];
            const nr = p.r + d[1];
            const nc = p.c + d[0];
            if (nr < 0 || nc < 0 || nr >= this.n || nc >= this.n) continue;
            if (this.dist[nr][nc] >= 0 && this.dist[nr][nc] < bestD) {
              bestD = this.dist[nr][nc];
              best = key;
            }
          }
          return best;
        },

        stepDuration() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          return 0.14 / (d.speedFactor * (0.5 + ctx.speed * 0.08));
        },

        hintInterval() {
          return 2 + ctx.speed * 0.45;
        },

        move(dir) {
          if (ctx.state !== 'playing' || this.anim) return;
          const d = DIRS[dir];
          if (!d) return;
          const nr = this.player.r + d[1];
          const nc = this.player.c + d[0];
          if (nr < 0 || nc < 0 || nr >= this.n || nc >= this.n || this.grid[nr][nc] === 1) {
            this.bump = { dir, t: 0.18 };
            A.sound.play('hit');
            return;
          }
          this.trail.push({ r: this.player.r, c: this.player.c, life: 1 });
          if (this.trail.length > 24) this.trail.shift();
          this.anim = {
            from: { ...this.player },
            to: { r: nr, c: nc },
            t: 0,
            dur: this.stepDuration(),
          };
          this.player = { r: nr, c: nc };
          this.frustum = { ...this.anim.from };
          this.steps++;
          A.sound.play('move');
        },

        onTick(dt) {
          if (this.anim) {
            this.anim.t += dt / this.anim.dur;
            if (this.anim.t >= 1) {
              this.frustum = { ...this.anim.to };
              this.anim = null;
              if (this.player.r === this.exit.r && this.player.c === this.exit.c) {
                this.winLevel();
                return;
              }
            } else {
              const t = this.anim.t * this.anim.t * (3 - 2 * this.anim.t);
              this.frustum = {
                r: this.anim.from.r + (this.anim.to.r - this.anim.from.r) * t,
                c: this.anim.from.c + (this.anim.to.c - this.anim.from.c) * t,
              };
            }
          }
          this.trail.forEach((p) => { p.life -= dt * 1.6; });
          this.trail = this.trail.filter((p) => p.life > 0);
          if (this.bump) {
            this.bump.t -= dt;
            if (this.bump.t <= 0) this.bump = null;
          }
          this.hintTimer -= dt;
          if (this.hintTimer <= 0) {
            this.hintTimer = this.hintInterval();
            this.hintPulse = 1;
          }
          if (this.hintPulse > 0) this.hintPulse = Math.max(0, this.hintPulse - dt * 0.7);
          this.render();
        },

        winLevel() {
          const remain = ctx.timeLimit > 0 ? Math.max(0, ctx.timeLimit - ctx.elapsed) : 0;
          const reward = 1000 + Math.floor(remain) * 10;
          ctx.addScore(reward);
          A.sound.play('success');
          if (this.level >= this.levelCount) {
            ctx.gameOver('走出迷宫', true);
            return;
          }
          this.level++;
          ctx.setLevel(this.level);
          ctx.showToast('找到出口！进入第 ' + this.level + ' 关  +' + reward);
          this.loadLevel();
        },

        onEnd() {
          this.anim = null;
        },

        render() {
          if (!this.g || !this.grid) return;
          const g = this.g;
          const cell = this.cell;
          g.clearRect(0, 0, W, H);

          /* 背景与地面 */
          g.fillStyle = '#101a2c';
          g.fillRect(0, 0, W, H);
          for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
              const x = c * cell;
              const y = r * cell;
              if (this.grid[r][c] === 0) {
                g.fillStyle = (r + c) % 2 === 0 ? '#1c3141' : '#20384a';
                g.fillRect(x, y, cell + 0.5, cell + 0.5);
                g.strokeStyle = 'rgba(120,220,180,.05)';
                g.lineWidth = 1;
                g.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
              } else {
                const shade = 0.85 + 0.15 * Math.sin((r * 7 + c * 3));
                g.fillStyle = `rgba(58,110,96,${shade})`;
                roundRect(g, x + 1, y + 1, cell - 2, cell - 2, Math.max(2, cell * 0.12));
                g.fill();
                g.fillStyle = 'rgba(160,235,200,.16)';
                roundRect(g, x + 3, y + 3, cell - 6, Math.max(2, cell * 0.18), 2);
                g.fill();
              }
            }
          }

          /* 终点 */
          const ex = this.exit.c * cell + cell / 2;
          const ey = this.exit.r * cell + cell / 2;
          const pulse = 0.5 + 0.5 * Math.sin((ctx.elapsed || 0) * 4);
          g.fillStyle = `rgba(255,214,102,${0.18 + pulse * 0.18})`;
          g.beginPath(); g.arc(ex, ey, cell * 0.55, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffd166';
          roundRect(g, this.exit.c * cell + cell * 0.18, this.exit.r * cell + cell * 0.18, cell * 0.64, cell * 0.64, 4);
          g.fill();
          g.strokeStyle = '#fff6d8';
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(ex - cell * 0.12, ey - cell * 0.06);
          g.lineTo(ex - cell * 0.02, ey + cell * 0.06);
          g.lineTo(ex + cell * 0.16, ey - cell * 0.14);
          g.stroke();

          /* 足迹 */
          this.trail.forEach((p) => {
            g.fillStyle = `rgba(120,200,255,${p.life * 0.28})`;
            g.beginPath();
            g.arc(p.c * cell + cell / 2, p.r * cell + cell / 2, cell * 0.16 * p.life, 0, Math.PI * 2);
            g.fill();
          });

          /* 方向提示（随速度变慢而更频繁） */
          if (this.hintPulse > 0) {
            const dir = this.hintDir();
            if (dir) {
              const d = DIRS[dir];
              const a = Math.atan2(d[1], d[0]);
              const px = this.frustum.c * cell + cell / 2;
              const py = this.frustum.r * cell + cell / 2;
              g.save();
              g.translate(px + d[0] * cell * 0.62, py + d[1] * cell * 0.62);
              g.rotate(a);
              g.globalAlpha = Math.min(1, this.hintPulse);
              g.fillStyle = '#9be7c4';
              g.beginPath();
              g.moveTo(cell * 0.22, 0);
              g.lineTo(-cell * 0.1, -cell * 0.16);
              g.lineTo(-cell * 0.1, cell * 0.16);
              g.closePath();
              g.fill();
              g.restore();
            }
          }

          /* 玩家 */
          let px = this.frustum.c * cell + cell / 2;
          let py = this.frustum.r * cell + cell / 2;
          if (this.bump) {
            const d = DIRS[this.bump.dir];
            const k = Math.sin(this.bump.t / 0.18 * Math.PI * 3) * cell * 0.12;
            px += d[0] * k;
            py += d[1] * k;
          }
          g.fillStyle = 'rgba(91,200,255,.25)';
          g.beginPath(); g.arc(px, py, cell * 0.46, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#5bc8ff';
          g.beginPath(); g.arc(px, py, cell * 0.32, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#eaf8ff';
          g.beginPath(); g.arc(px - cell * 0.09, py - cell * 0.06, cell * 0.07, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(px + cell * 0.09, py - cell * 0.06, cell * 0.07, 0, Math.PI * 2); g.fill();

          /* 角落信息 */
          g.fillStyle = 'rgba(10,18,28,.72)';
          roundRect(g, 8, 8, 150, 24, 6); g.fill();
          g.fillStyle = '#cfe9ff';
          g.font = 'bold 12px system-ui, sans-serif';
          g.textBaseline = 'middle';
          g.textAlign = 'left';
          g.fillText('关卡 ' + this.level + '/' + this.levelCount + '   步数 ' + this.steps, 16, 20);
        },
      };
      return game;
    },
  });
})();
