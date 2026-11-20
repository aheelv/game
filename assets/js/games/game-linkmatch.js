/* 连连看：Canvas 绘制、0/1/2 次转折（含棋盘外边框）寻路、连线动画、提示与重排 */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.lm-bar{display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;margin-top:10px}',
      '.lm-bar button{border:1px solid #3b4268;background:#262c4a;color:#e8ecff;border-radius:9px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;transition:.14s ease}',
      '.lm-bar button:hover{background:#333c66;transform:translateY(-1px)}',
      '.lm-bar button:active{transform:translateY(1px)}',
      '.lm-msg{font-size:12px;color:#9aa4d6;font-weight:700;min-width:160px;text-align:center}',
    ].join('\n');
    document.head.appendChild(style);
  }

  A.registerRuntime('linkmatch', {
    create(ctx) {
      const CELL = 44;
      const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const PALETTE = ['#ff7a85', '#ffd166', '#5fd68a', '#5bcdf0', '#b57bff', '#ff9f5a', '#7cc4ff', '#f78fb3', '#9ce37a', '#ffb3c1'];

      const game = {
        init() {
          ensureCss();
          this.cfg = this.config();
          this.setupStage();

          /* 工具栏按钮与棋盘指针事件都委托在 stage 上，只注册一次 */
          ctx.stage.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-act]');
            if (!btn || ctx.state !== 'playing') return;
            if (btn.dataset.act === 'hint') this.hint();
            else this.shuffle(true);
          });
          ctx.stage.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing' || e.target !== ctx.canvas) return;
            const p = ctx.pointerPos(e);
            const c = Math.floor(p.x / CELL) - 1;
            const r = Math.floor(p.y / CELL) - 1;
            if (r < 0 || c < 0 || r >= this.cfg.rows || c >= this.cfg.cols) return;
            this.pick(r, c);
          });

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            const steps = {
              arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
              arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
            };
            if (steps[k]) {
              e.preventDefault();
              this.cur.c = A.util.clamp(this.cur.c + steps[k][0], 0, this.cfg.cols - 1);
              this.cur.r = A.util.clamp(this.cur.r + steps[k][1], 0, this.cfg.rows - 1);
              this.render();
            } else if (k === 'enter' || k === ' ') {
              e.preventDefault();
              this.pick(this.cur.r, this.cur.c);
            }
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            const step = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
            this.cur.c = A.util.clamp(this.cur.c + step[0], 0, this.cfg.cols - 1);
            this.cur.r = A.util.clamp(this.cur.r + step[1], 0, this.cfg.rows - 1);
            this.render();
          });
        },

        setupStage() {
          ctx.makeCanvas((this.cfg.cols + 2) * CELL, (this.cfg.rows + 2) * CELL);
          this.canvas = ctx.canvas;
          this.g = ctx.g;
          this.stageCols = this.cfg.cols;
          this.stageRows = this.cfg.rows;
          let bar = ctx.stage.querySelector('.lm-bar');
          if (!bar) {
            bar = document.createElement('div');
            bar.className = 'lm-bar';
            bar.innerHTML = '<button type="button" data-act="hint">提示</button><button type="button" data-act="shuffle">重排</button><span class="lm-msg">方向键移动光标 · 回车选中</span>';
            ctx.stage.appendChild(bar);
          }
          this.msgEl = bar.querySelector('.lm-msg');
        },

        config() {
          if (ctx.difficulty === 'easy') return { cols: 8, rows: 6, types: 6 };
          if (ctx.difficulty === 'hard') return { cols: 12, rows: 8, types: 10 };
          return { cols: 10, rows: 8, types: 8 };
        },

        onStart() {
          this.cfg = this.config();
          if (this.stageCols !== this.cfg.cols || this.stageRows !== this.cfg.rows) this.setupStage();
          this.board = Array.from({ length: this.cfg.rows }, () => Array(this.cfg.cols).fill(0));
          const pairs = (this.cfg.rows * this.cfg.cols) / 2;
          const pool = [];
          for (let i = 0; i < pairs; i++) {
            const type = (i % this.cfg.types) + 1;
            pool.push(type, type);
          }
          const shuffled = A.util.shuffle(pool);
          let k = 0;
          for (let r = 0; r < this.cfg.rows; r++) {
            for (let c = 0; c < this.cfg.cols; c++) this.board[r][c] = shuffled[k++];
          }
          this.remain = pairs * 2;
          this.sel = null;
          this.combo = 0;
          this.hintPair = null;
          this.linkAnim = null;
          this.cur = { r: 0, c: 0 };
          this.setMsg('找到相同图案并连接');
          this.render();
        },

        setMsg(text) {
          if (this.msgEl) this.msgEl.textContent = text;
        },

        pick(r, c) {
          if (ctx.state !== 'playing' || this.linkAnim) return;
          const type = this.board[r][c];
          if (!type) return;
          this.cur = { r, c };
          if (!this.sel) {
            this.sel = { r, c };
            A.sound.play('click');
            this.render();
            return;
          }
          if (this.sel.r === r && this.sel.c === c) {
            this.sel = null;
            A.sound.play('click');
            this.render();
            return;
          }
          if (this.board[this.sel.r][this.sel.c] !== type) {
            this.combo = 0;
            this.sel = { r, c };
            A.sound.play('hit');
            this.setMsg('图案不同，已重新选择');
            this.render();
            return;
          }
          const path = this.findPath(this.sel, { r, c });
          if (!path) {
            this.combo = 0;
            this.sel = { r, c };
            A.sound.play('hit');
            this.setMsg('无法在两次转折内连接');
            this.render();
            return;
          }
          /* 消除 */
          this.board[this.sel.r][this.sel.c] = 0;
          this.board[r][c] = 0;
          this.remain -= 2;
          this.combo++;
          const gained = 100 + (this.combo - 1) * 20;
          ctx.addScore(gained);
          A.sound.play('success');
          this.linkAnim = { path: path, t: 0 };
          this.sel = null;
          this.hintPair = null;
          this.setMsg(this.combo > 1 ? `连击 x${this.combo}  +${gained}` : `配对成功  +${gained}`);
          if (this.remain === 0) {
            if (ctx.timeLimit > 0) ctx.addScore(Math.floor(ctx.timeLimit - ctx.elapsed) * 5);
            ctx.gameOver('全部消除', true);
          } else if (!this.findAny()) {
            this.shuffle(false);
            this.setMsg('无解，已自动重排');
          }
          this.render();
        },

        /* 在扩展一圈边框的网格上做 BFS，记录方向与转折次数（上限 2） */
        findPath(a, b) {
          const W = this.cfg.cols + 2;
          const H = this.cfg.rows + 2;
          const sx = a.c + 1;
          const sy = a.r + 1;
          const tx = b.c + 1;
          const ty = b.r + 1;
          const blocked = (x, y) => {
            if (x < 0 || y < 0 || x >= W || y >= H) return true;
            if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return false;
            return this.board[y - 1][x - 1] !== 0;
          };
          const queue = [];
          const seen = new Set();
          for (let d = 0; d < 4; d++) {
            const nx = sx + DIR[d][0];
            const ny = sy + DIR[d][1];
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            if (nx === tx && ny === ty) return [{ x: sx, y: sy }, { x: tx, y: ty }];
            if (blocked(nx, ny)) continue;
            const key = nx + ',' + ny + ',' + d + ',0';
            seen.add(key);
            queue.push({ x: nx, y: ny, dir: d, turns: 0, path: [{ x: sx, y: sy }, { x: nx, y: ny }] });
          }
          let head = 0;
          while (head < queue.length) {
            const s = queue[head++];
            for (let d = 0; d < 4; d++) {
              const turns = s.turns + (d === s.dir ? 0 : 1);
              if (turns > 2) continue;
              const nx = s.x + DIR[d][0];
              const ny = s.y + DIR[d][1];
              if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
              if (nx === tx && ny === ty) return s.path.concat([{ x: tx, y: ty }]);
              if (blocked(nx, ny)) continue;
              const key = nx + ',' + ny + ',' + d + ',' + turns;
              if (seen.has(key)) continue;
              seen.add(key);
              queue.push({ x: nx, y: ny, dir: d, turns: turns, path: s.path.concat([{ x: nx, y: ny }]) });
            }
          }
          return null;
        },

        findAny() {
          const groups = {};
          for (let r = 0; r < this.cfg.rows; r++) {
            for (let c = 0; c < this.cfg.cols; c++) {
              const v = this.board[r][c];
              if (!v) continue;
              if (!groups[v]) groups[v] = [];
              groups[v].push({ r, c });
            }
          }
          const keys = Object.keys(groups);
          for (let i = 0; i < keys.length; i++) {
            const list = groups[keys[i]];
            for (let x = 0; x < list.length; x++) {
              for (let y = x + 1; y < list.length; y++) {
                if (this.findPath(list[x], list[y])) return [list[x], list[y]];
              }
            }
          }
          return null;
        },

        hint() {
          const pair = this.findAny();
          if (!pair) {
            this.setMsg('当前无可连接对');
            return;
          }
          this.hintPair = pair;
          this.setMsg('已高亮一组可连接图案');
          A.sound.play('tick');
          this.render();
        },

        shuffle(manual) {
          const values = [];
          for (let r = 0; r < this.cfg.rows; r++) {
            for (let c = 0; c < this.cfg.cols; c++) {
              if (this.board[r][c]) values.push(this.board[r][c]);
            }
          }
          const shuffled = A.util.shuffle(values);
          let k = 0;
          for (let r = 0; r < this.cfg.rows; r++) {
            for (let c = 0; c < this.cfg.cols; c++) {
              if (this.board[r][c]) this.board[r][c] = shuffled[k++];
            }
          }
          this.sel = null;
          this.hintPair = null;
          if (manual) {
            A.sound.play('move');
            this.setMsg('已重新排列剩余图案');
          }
          this.render();
        },

        onTick(dt) {
          if (this.linkAnim) {
            this.linkAnim.t += dt / 0.38;
            if (this.linkAnim.t >= 1) this.linkAnim = null;
            this.render();
          }
        },

        render() {
          if (!this.g || !this.board) return;
          const g = this.g;
          const W = this.cfg.cols + 2;
          const H = this.cfg.rows + 2;
          g.clearRect(0, 0, W * CELL, H * CELL);
          g.fillStyle = '#10162c';
          g.fillRect(0, 0, W * CELL, H * CELL);

          /* 可绕行的外边框 */
          g.fillStyle = 'rgba(120,140,220,.06)';
          g.fillRect(0, 0, W * CELL, CELL);
          g.fillRect(0, (H - 1) * CELL, W * CELL, CELL);
          g.fillRect(0, 0, CELL, H * CELL);
          g.fillRect((W - 1) * CELL, 0, CELL, H * CELL);

          for (let r = 0; r < this.cfg.rows; r++) {
            for (let c = 0; c < this.cfg.cols; c++) {
              const x = (c + 1) * CELL;
              const y = (r + 1) * CELL;
              g.fillStyle = 'rgba(255,255,255,.035)';
              roundRect(g, x + 3, y + 3, CELL - 6, CELL - 6, 8);
              g.fill();
              const v = this.board[r][c];
              if (v) this.drawIcon(g, v, x + CELL / 2, y + CELL / 2, CELL * 0.3);
              const isSel = this.sel && this.sel.r === r && this.sel.c === c;
              const isCur = this.cur && this.cur.r === r && this.cur.c === c;
              const isHint = this.hintPair && this.hintPair.some((p) => p.r === r && p.c === c);
              if (isSel || isHint || isCur) {
                g.strokeStyle = isSel ? '#ffd166' : isHint ? '#7cc4ff' : 'rgba(255,255,255,.45)';
                g.lineWidth = isSel || isHint ? 3 : 1.5;
                roundRect(g, x + 2, y + 2, CELL - 4, CELL - 4, 8);
                g.stroke();
              }
            }
          }

          if (this.linkAnim) {
            const pts = this.linkAnim.path.map((p) => ({
              x: (p.x + 0.5) * CELL,
              y: (p.y + 0.5) * CELL,
            }));
            const t = A.util.clamp(this.linkAnim.t, 0, 1);
            g.save();
            g.strokeStyle = '#ffe9a8';
            g.shadowColor = '#ffd166';
            g.shadowBlur = 14;
            g.lineWidth = 4;
            g.lineCap = 'round';
            g.lineJoin = 'round';
            g.beginPath();
            g.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              const a = pts[i - 1];
              const b = pts[i];
              const seg = Math.min(1, Math.max(0, t * pts.length - (i - 1)));
              g.lineTo(a.x + (b.x - a.x) * seg, a.y + (b.y - a.y) * seg);
            }
            g.stroke();
            g.restore();
          }
        },

        drawIcon(g, type, cx, cy, radius) {
          const color = PALETTE[(type - 1) % PALETTE.length];
          const sides = Math.min(11, type + 2);
          g.save();
          g.fillStyle = color;
          g.strokeStyle = 'rgba(255,255,255,.65)';
          g.lineWidth = 2;
          g.beginPath();
          for (let i = 0; i < sides; i++) {
            const ang = -Math.PI / 2 + (i / sides) * Math.PI * 2;
            const x = cx + Math.cos(ang) * radius;
            const y = cy + Math.sin(ang) * radius;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
          }
          g.closePath();
          g.fill();
          g.stroke();
          g.fillStyle = 'rgba(255,255,255,.75)';
          g.beginPath();
          g.arc(cx - radius * 0.25, cy - radius * 0.25, Math.max(2, radius * 0.16), 0, Math.PI * 2);
          g.fill();
          g.restore();
        },
      };

      function roundRect(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.lineTo(x + w - r, y);
        g.quadraticCurveTo(x + w, y, x + w, y + r);
        g.lineTo(x + w, y + h - r);
        g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        g.lineTo(x + r, y + h);
        g.quadraticCurveTo(x, y + h, x, y + h - r);
        g.lineTo(x, y + r);
        g.quadraticCurveTo(x, y, x + r, y);
        g.closePath();
      }

      return game;
    },
  });
})();
