/* 贪吃蛇：Canvas 网格生存 */
(function () {
  const A = window.Arcade;
  A.registerRuntime('snake', {
    create(ctx) {
      const CELL = 24;
      const GRID = 20;
      const DIRS = {
        up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
        left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
      };
      const game = {
        init() {
          ctx.makeCanvas(CELL * GRID, CELL * GRID);
          this.canvas = ctx.canvas;
          this.g = ctx.g;
          let startPt = null;
          this.canvas.addEventListener('pointerdown', (e) => { startPt = { x: e.clientX, y: e.clientY }; });
          this.canvas.addEventListener('pointerup', (e) => {
            if (!startPt) return;
            const dx = e.clientX - startPt.x;
            const dy = e.clientY - startPt.y;
            startPt = null;
            if (Math.hypot(dx, dy) < 18) return;
            if (Math.abs(dx) > Math.abs(dy)) this.setDir(dx > 0 ? 'right' : 'left');
            else this.setDir(dy > 0 ? 'down' : 'up');
          });
          ctx.onKey((e) => {
            const k = e.key.toLowerCase();
            const map = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
            if (map[k]) { e.preventDefault(); this.setDir(map[k]); }
          });
          ctx.enableDpad((dir) => this.setDir(dir));
        },

        onStart() {
          this.snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
          this.dir = 'right';
          this.nextDir = 'right';
          this.acc = 0;
          this.spawnFood();
          this.render();
        },

        setDir(dir) {
          if (ctx.state !== 'playing') return;
          const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
          if (opposite[dir] !== this.dir) this.nextDir = dir;
        },

        spawnFood() {
          const occupied = new Set(this.snake.map((p) => p.x + ',' + p.y));
          const free = [];
          for (let x = 0; x < GRID; x++) {
            for (let y = 0; y < GRID; y++) {
              if (!occupied.has(x + ',' + y)) free.push({ x, y });
            }
          }
          this.food = free.length ? A.util.choice(free) : null;
        },

        interval() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          return 0.17 / (d.speedFactor * (0.55 + ctx.speed / 11));
        },

        onTick(dt) {
          this.acc += dt;
          let guard = 0;
          while (this.acc >= this.interval() && guard++ < 6) {
            this.acc -= this.interval();
            this.step();
            if (ctx.state !== 'playing') return;
          }
        },

        step() {
          this.dir = this.nextDir;
          const d = DIRS[this.dir];
          const head = { x: this.snake[0].x + d.x, y: this.snake[0].y + d.y };
          if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
            A.sound.play('hit');
            ctx.gameOver('撞到边界');
            return;
          }
          if (this.snake.some((p) => p.x === head.x && p.y === head.y)) {
            A.sound.play('hit');
            ctx.gameOver('撞到自己');
            return;
          }
          this.snake.unshift(head);
          if (this.food && head.x === this.food.x && head.y === this.food.y) {
            ctx.addScore(10 + Math.floor(this.snake.length / 5) * 5);
            A.sound.play('eat');
            if (this.snake.length % 5 === 0) ctx.setLevel(ctx.level + 1);
            this.spawnFood();
          } else {
            this.snake.pop();
          }
          this.render();
        },

        render() {
          if (!this.g) return;
          const g = this.g;
          g.fillStyle = '#101322';
          g.fillRect(0, 0, CELL * GRID, CELL * GRID);
          g.strokeStyle = 'rgba(255,255,255,0.035)';
          g.lineWidth = 1;
          for (let i = 0; i <= GRID; i++) {
            g.beginPath(); g.moveTo(i * CELL, 0); g.lineTo(i * CELL, GRID * CELL); g.stroke();
            g.beginPath(); g.moveTo(0, i * CELL); g.lineTo(GRID * CELL, i * CELL); g.stroke();
          }
          if (this.food) {
            g.fillStyle = '#ff7a59';
            g.beginPath();
            g.arc(this.food.x * CELL + CELL / 2, this.food.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,.35)';
            g.beginPath();
            g.arc(this.food.x * CELL + CELL * 0.38, this.food.y * CELL + CELL * 0.38, 3, 0, Math.PI * 2);
            g.fill();
          }
          if (!this.snake) return;
          this.snake.forEach((p, i) => {
            const t = 1 - i / Math.max(this.snake.length, 1);
            g.fillStyle = i === 0 ? '#9b8cff' : `rgba(91,91,214,${0.45 + t * 0.5})`;
            const pad = i === 0 ? 1 : 2;
            roundRect(g, p.x * CELL + pad, p.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 5);
            g.fill();
          });
          const h = this.snake[0];
          g.fillStyle = '#fff';
          const offsets = this.dir === 'up' ? [[6, 7], [14, 7]] : this.dir === 'down' ? [[6, 14], [14, 14]] : this.dir === 'left' ? [[7, 6], [7, 14]] : [[14, 6], [14, 14]];
          offsets.forEach(([ox, oy]) => {
            g.beginPath(); g.arc(h.x * CELL + ox, h.y * CELL + oy, 2.4, 0, Math.PI * 2); g.fill();
          });
        },
      };
      function roundRect(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
        g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
        g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
      }
      return game;
    },
  });
})();
