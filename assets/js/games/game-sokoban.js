/* 推箱子：字符地图、推动判定、撤销/重置、步数评分、键盘/方向键/滑动输入 */
(function () {
  const A = window.Arcade;

  A.registerRuntime('sokoban', {
    create(ctx) {
      const TILE = 56;
      const N = 9;
      const PX = N * TILE;
      const TOP = 46;
      const DIRS = {
        up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
      };

      /* 字符地图：# 墙 / 空格 地板 / . 目标 / $ 箱子 / @ 玩家 / * 箱在目标 / + 人在目标 */
      const LEVELS = [
        {
          par: 8,
          map: [
            '#######',
            '#     #',
            '#  $  #',
            '#  .  #',
            '#  @  #',
            '#     #',
            '#######',
          ],
        },
        {
          par: 12,
          map: [
            '########',
            '#      #',
            '# .$$  #',
            '#  @   #',
            '#  ..  #',
            '#      #',
            '########',
          ],
        },
        {
          par: 18,
          map: [
            '########',
            '#      #',
            '# .##  #',
            '#   $  #',
            '# @ $  #',
            '#   .  #',
            '########',
          ],
        },
        {
          par: 24,
          map: [
            '########',
            '#      #',
            '#  $   #',
            '#  #.  #',
            '# @#   #',
            '#  $   #',
            '#  .   #',
            '########',
          ],
        },
        {
          par: 32,
          map: [
            '#########',
            '#       #',
            '#  .$.  #',
            '#  #$#  #',
            '#   $   #',
            '#   @   #',
            '#  .    #',
            '#       #',
            '#########',
          ],
        },
      ];

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
          ctx.makeCanvas(PX, PX + TOP);
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
            if (Math.hypot(dx, dy) > 18) {
              this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
              return;
            }
            /* 轻点玩家相邻格也可移动 */
            const p = ctx.pointerPos(e);
            const c = Math.floor((p.x - this.offX) / TILE) - this.player.c;
            const r = Math.floor((p.y - this.offY) / TILE) - this.player.r;
            if (Math.abs(r) + Math.abs(c) === 1) this.move(r === -1 ? 'up' : r === 1 ? 'down' : c === -1 ? 'left' : 'right');
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
            else if (k === 'r') { e.preventDefault(); this.resetLevel(); }
            else if (k === 'z' || k === 'u') { e.preventDefault(); this.undo(); }
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            this.move(dir);
          });
        },

        config() {
          let count = 4;
          if (ctx.difficulty === 'easy') count = 3;
          else if (ctx.difficulty === 'hard') count = LEVELS.length;
          return { count };
        },

        onStart() {
          this.levelCount = this.config().count;
          this.level = 1;
          ctx.setLevel(1);
          this.loadLevel();
        },

        loadLevel() {
          const def = LEVELS[this.level - 1];
          const rows = def.map.length;
          const cols = Math.max.apply(null, def.map.map((row) => row.length));
          this.rows = rows;
          this.cols = cols;
          this.offX = (N - cols) * TILE / 2;
          this.offY = TOP + (N - rows) * TILE / 2;

          this.walls = Array.from({ length: rows }, () => new Array(cols).fill(false));
          this.goals = Array.from({ length: rows }, () => new Array(cols).fill(false));
          this.boxes = [];
          this.player = { r: 0, c: 0 };
          for (let r = 0; r < rows; r++) {
            const row = def.map[r];
            for (let c = 0; c < cols; c++) {
              const ch = row[c] || '#';
              if (ch === '#') this.walls[r][c] = true;
              if (ch === '.' || ch === '*' || ch === '+') this.goals[r][c] = true;
              if (ch === '$' || ch === '*') this.boxes.push({ r, c });
              if (ch === '@' || ch === '+') this.player = { r, c };
            }
          }
          this.totalBoxes = this.boxes.length;
          this.steps = 0;
          this.history = [];
          this.bump = null;
          const diffMul = ctx.difficulty === 'hard' ? 0.9 : ctx.difficulty === 'easy' ? 1.15 : 1;
          this.par = Math.max(1, Math.round(def.par * (0.85 + (10 - ctx.speed) * 0.03) * diffMul));
          this.render();
        },

        resetLevel() {
          if (ctx.state !== 'playing') return;
          A.sound.play('click');
          ctx.showToast('已重置本关');
          this.loadLevel();
        },

        undo() {
          if (ctx.state !== 'playing' || !this.history.length) return;
          const s = this.history.pop();
          this.player = s.player;
          this.boxes = s.boxes;
          this.steps = s.steps;
          A.sound.play('move');
          this.render();
        },

        boxAt(r, c) {
          return this.boxes.findIndex((b) => b.r === r && b.c === c);
        },

        move(dir) {
          if (ctx.state !== 'playing') return;
          const d = DIRS[dir];
          if (!d) return;
          const nr = this.player.r + d[1];
          const nc = this.player.c + d[0];
          if (nr < 0 || nc < 0 || nr >= this.rows || nc >= this.cols || this.walls[nr][nc]) {
            this.bump = { dir, t: 0.16 };
            A.sound.play('hit');
            this.render();
            return;
          }
          const bi = this.boxAt(nr, nc);
          if (bi >= 0) {
            const br = nr + d[1];
            const bc = nc + d[0];
            const blocked = br < 0 || bc < 0 || br >= this.rows || bc >= this.cols ||
              this.walls[br][bc] || this.boxAt(br, bc) >= 0;
            if (blocked) {
              this.bump = { dir, t: 0.16 };
              A.sound.play('hit');
              this.render();
              return;
            }
            this.history.push({ player: { ...this.player }, boxes: this.boxes.map((b) => ({ ...b })), steps: this.steps });
            this.boxes[bi] = { r: br, c: bc };
            this.player = { r: nr, c: nc };
            this.steps++;
            A.sound.play('place');
          } else {
            this.history.push({ player: { ...this.player }, boxes: this.boxes.map((b) => ({ ...b })), steps: this.steps });
            this.player = { r: nr, c: nc };
            this.steps++;
            A.sound.play('move');
          }
          if (this.boxes.every((b) => this.goals[b.r][b.c])) this.winLevel();
          else this.render();
        },

        winLevel() {
          const reward = this.totalBoxes * 200 + 500 + Math.max(0, this.par - this.steps) * 10;
          ctx.addScore(reward);
          A.sound.play('level');
          if (this.level >= this.levelCount) {
            ctx.gameOver('仓库整理完毕', true);
            return;
          }
          this.level++;
          ctx.setLevel(this.level);
          this.loadLevel();
          ctx.showToast('过关！进入第 ' + this.level + ' 关  +' + reward);
        },

        onTick(dt) {
          if (this.bump) {
            this.bump.t -= dt;
            if (this.bump.t <= 0) this.bump = null;
            this.render();
          }
        },

        render() {
          if (!this.g || !this.walls) return;
          const g = this.g;
          g.clearRect(0, 0, PX, PX + TOP);

          // 顶部信息条
          g.fillStyle = '#12162a';
          g.fillRect(0, 0, PX, TOP);
          g.font = 'bold 13px system-ui, sans-serif';
          g.textBaseline = 'middle';
          g.textAlign = 'left';
          g.fillStyle = '#eef0ff';
          g.fillText('第 ' + this.level + ' / ' + this.levelCount + ' 关', 12, TOP / 2);
          g.textAlign = 'center';
          g.fillStyle = '#ffd166';
          g.fillText('步数 ' + this.steps + ' / 目标 ' + this.par, PX / 2, TOP / 2);
          g.textAlign = 'right';
          g.fillStyle = '#aab4ef';
          g.fillText('归位 ' + this.boxes.filter((b) => this.goals[b.r][b.c]).length + ' / ' + this.totalBoxes, PX - 12, TOP / 2);

          g.fillStyle = '#0d1020';
          g.fillRect(0, TOP, PX, PX);

          // 地板与墙
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              const x = this.offX + c * TILE;
              const y = this.offY + r * TILE;
              if (this.walls[r][c]) {
                g.fillStyle = '#4a4f6e';
                roundRect(g, x + 1, y + 1, TILE - 2, TILE - 2, 5);
                g.fill();
                g.fillStyle = '#666d93';
                roundRect(g, x + 3, y + 3, TILE - 6, TILE - 10, 4);
                g.fill();
                g.fillStyle = 'rgba(0,0,0,.28)';
                g.fillRect(x + 3, y + TILE - 9, TILE - 6, 6);
              } else {
                g.fillStyle = (r + c) % 2 === 0 ? '#202741' : '#242b49';
                g.fillRect(x, y, TILE, TILE);
                g.strokeStyle = 'rgba(255,255,255,.03)';
                g.lineWidth = 1;
                g.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
              }
            }
          }

          // 目标点
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
              if (!this.goals[r][c]) continue;
              const x = this.offX + c * TILE + TILE / 2;
              const y = this.offY + r * TILE + TILE / 2;
              g.strokeStyle = '#ffd166';
              g.lineWidth = 3;
              g.beginPath();
              g.arc(x, y, TILE * 0.22, 0, Math.PI * 2);
              g.stroke();
              g.fillStyle = 'rgba(255,209,102,.25)';
              g.beginPath();
              g.arc(x, y, TILE * 0.12, 0, Math.PI * 2);
              g.fill();
            }
          }

          // 箱子
          this.boxes.forEach((b) => {
            const x = this.offX + b.c * TILE;
            const y = this.offY + b.r * TILE;
            const onGoal = this.goals[b.r][b.c];
            g.fillStyle = onGoal ? '#3fae7a' : '#b07d4b';
            roundRect(g, x + 5, y + 5, TILE - 10, TILE - 10, 6);
            g.fill();
            g.fillStyle = onGoal ? '#57d39a' : '#d19a63';
            roundRect(g, x + 8, y + 8, TILE - 16, TILE - 16, 4);
            g.fill();
            g.strokeStyle = 'rgba(0,0,0,.3)';
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(x + 10, y + 10); g.lineTo(x + TILE - 10, y + TILE - 10);
            g.moveTo(x + TILE - 10, y + 10); g.lineTo(x + 10, y + TILE - 10);
            g.stroke();
          });

          // 玩家（带轻微撞墙抖动）
          let px = this.offX + this.player.c * TILE + TILE / 2;
          let py = this.offY + this.player.r * TILE + TILE / 2;
          if (this.bump) {
            const d = DIRS[this.bump.dir];
            const k = Math.sin(this.bump.t / 0.16 * Math.PI * 3) * 4;
            px += d[0] * k;
            py += d[1] * k;
          }
          g.fillStyle = '#7fc4ff';
          g.beginPath();
          g.arc(px, py, TILE * 0.3, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#1b2140';
          g.beginPath();
          g.arc(px, py - 3, TILE * 0.12, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#eef6ff';
          g.beginPath();
          g.arc(px - 4, py - 6, 2.5, 0, Math.PI * 2);
          g.fill();
        },
      };
      return game;
    },
  });
})();
