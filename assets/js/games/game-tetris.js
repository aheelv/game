/* 俄罗斯方块：7-bag 随机、旋转踢墙、消行连击、幽灵落点与完整输入 */
(function () {
  const A = window.Arcade;
  A.registerRuntime('tetris', {
    create(ctx) {
      const COLS = 10;
      const ROWS = 20;
      const CELL = 24;
      const BW = COLS * CELL;
      const BH = ROWS * CELL;
      const PANEL = 132;

      /* 七种四格骨牌，旋转在 4x4 方框内完成 */
      const BASE = {
        I: [[0, 1], [1, 1], [2, 1], [3, 1]],
        O: [[1, 0], [2, 0], [1, 1], [2, 1]],
        T: [[1, 0], [0, 1], [1, 1], [2, 1]],
        S: [[1, 0], [2, 0], [0, 1], [1, 1]],
        Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
        J: [[0, 0], [0, 1], [1, 1], [2, 1]],
        L: [[2, 0], [0, 1], [1, 1], [2, 1]],
      };
      const COLOR = {
        I: '#43d7e8', O: '#ffd166', T: '#b57bff',
        S: '#5fd68a', Z: '#ff7a85', J: '#5f8cff', L: '#ff9f5a',
      };
      const KEYS = Object.keys(BASE);
      const ROT = {};
      KEYS.forEach((k) => {
        const list = [];
        let cur = BASE[k];
        for (let i = 0; i < 4; i++) {
          list.push(cur);
          cur = k === 'O' ? cur : cur.map((c) => [3 - c[1], c[0]]);
        }
        ROT[k] = list;
      });

      const game = {
        init() {
          ctx.makeCanvas(BW + PANEL, BH);
          this.canvas = ctx.canvas;
          this.g = ctx.g;
          /* 键盘监听只注册一次 */
          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            const map = {
              arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
              arrowup: 'rot', w: 'rot', x: 'rot', z: 'rotccw', q: 'rotccw',
              arrowdown: 'soft', s: 'soft', ' ': 'hard',
            };
            const act = map[k];
            if (!act) return;
            e.preventDefault();
            this.action(act);
          });
          /* 虚拟方向键：上旋转、下软降、左右平移 */
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            if (dir === 'up') this.action('rot');
            else if (dir === 'down') this.action('soft');
            else this.action(dir);
          });
          /* 点击棋盘旋转，点击右侧面板硬降 */
          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            const p = ctx.pointerPos(e);
            this.action(p.x > BW ? 'hard' : 'rot');
          });
        },

        onStart() {
          this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
          this.bag = [];
          this.lines = 0;
          this.combo = 0;
          this.acc = 0;
          this.curType = this.take();
          this.nextType = this.take();
          this.rot = 0;
          this.x = 3;
          this.y = 0;
          this.render();
        },

        take() {
          if (!this.bag.length) this.bag = A.util.shuffle(KEYS);
          return this.bag.pop();
        },

        cells() {
          return ROT[this.curType][this.rot];
        },

        valid(cells, px, py) {
          for (let i = 0; i < cells.length; i++) {
            const bx = px + cells[i][0];
            const by = py + cells[i][1];
            if (bx < 0 || bx >= COLS || by >= ROWS) return false;
            if (by >= 0 && this.board[by][bx]) return false;
          }
          return true;
        },

        interval() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          const speed = 0.55 + ctx.speed / 12;
          const lv = Math.max(1, ctx.level);
          return A.util.clamp(0.95 / (d.speedFactor * speed) * Math.pow(0.86, lv - 1), 0.055, 2.2);
        },

        action(act) {
          if (ctx.state !== 'playing') return;
          if (act === 'left') this.move(-1);
          else if (act === 'right') this.move(1);
          else if (act === 'rot') this.rotate(1);
          else if (act === 'rotccw') this.rotate(-1);
          else if (act === 'soft') this.softDrop();
          else if (act === 'hard') this.hardDrop();
        },

        move(dx) {
          if (this.valid(this.cells(), this.x + dx, this.y)) {
            this.x += dx;
            A.sound.play('move');
            this.render();
          }
        },

        rotate(dir) {
          const nr = (this.rot + dir + 4) % 4;
          const cells = ROT[this.curType][nr];
          const kicks = [0, -1, 1, -2, 2];
          for (let i = 0; i < kicks.length; i++) {
            if (this.valid(cells, this.x + kicks[i], this.y)) {
              this.rot = nr;
              this.x += kicks[i];
              A.sound.play('click');
              this.render();
              return;
            }
          }
          A.sound.play('tick');
        },

        softDrop() {
          if (this.valid(this.cells(), this.x, this.y + 1)) {
            this.y++;
            ctx.addScore(1);
            this.acc = 0;
            this.render();
          } else {
            this.lock();
          }
        },

        hardDrop() {
          let dist = 0;
          while (this.valid(this.cells(), this.x, this.y + 1)) {
            this.y++;
            dist++;
          }
          if (dist > 0) {
            ctx.addScore(dist * 2);
            A.sound.play('place');
          }
          this.lock();
        },

        lock() {
          const cells = this.cells();
          let topped = false;
          cells.forEach((c) => {
            const bx = this.x + c[0];
            const by = this.y + c[1];
            if (by < 0) topped = true;
            else if (by < ROWS && bx >= 0 && bx < COLS) this.board[by][bx] = this.curType;
          });

          let cleared = 0;
          for (let r = ROWS - 1; r >= 0; r--) {
            if (this.board[r].every((v) => v !== null)) {
              this.board.splice(r, 1);
              this.board.unshift(Array(COLS).fill(null));
              cleared++;
              r++;
            }
          }
          if (cleared > 0) {
            const base = [0, 100, 300, 500, 800][cleared] || 800;
            this.combo++;
            const gained = base * ctx.level + (this.combo - 1) * 50;
            ctx.addScore(gained);
            this.lines += cleared;
            ctx.setLevel(Math.floor(this.lines / 10) + 1);
            A.sound.play(cleared >= 4 ? 'level' : 'success');
            ctx.showToast((cleared >= 4 ? '四行消除！' : `消除 ${cleared} 行`) + ` +${gained}`);
          } else {
            this.combo = 0;
          }

          if (topped) {
            A.sound.play('hit');
            ctx.gameOver('堆叠触顶', false);
            return;
          }

          this.curType = this.nextType;
          this.nextType = this.take();
          this.rot = 0;
          this.x = 3;
          this.y = 0;
          A.sound.play('place');
          if (!this.valid(this.cells(), this.x, this.y)) {
            A.sound.play('hit');
            ctx.gameOver('堆叠触顶', false);
          }
        },

        onTick(dt) {
          if (!this.board) return;
          this.acc += dt;
          let guard = 0;
          while (this.acc >= this.interval() && guard++ < 10) {
            this.acc -= this.interval();
            if (this.valid(this.cells(), this.x, this.y + 1)) this.y++;
            else {
              this.lock();
              break;
            }
            if (ctx.state !== 'playing') return;
          }
          this.render();
        },

        render() {
          if (!this.g) return;
          const g = this.g;
          g.clearRect(0, 0, BW + PANEL, BH);
          g.fillStyle = '#0d1121';
          g.fillRect(0, 0, BW + PANEL, BH);

          /* 棋盘底与网格 */
          g.fillStyle = '#151a30';
          roundRect(g, 2, 2, BW - 4, BH - 4, 6);
          g.fill();
          g.strokeStyle = 'rgba(255,255,255,0.045)';
          g.lineWidth = 1;
          for (let c = 1; c < COLS; c++) {
            g.beginPath();
            g.moveTo(c * CELL, 0);
            g.lineTo(c * CELL, BH);
            g.stroke();
          }
          for (let r = 1; r < ROWS; r++) {
            g.beginPath();
            g.moveTo(0, r * CELL);
            g.lineTo(BW, r * CELL);
            g.stroke();
          }

          if (!this.board) return;
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              if (this.board[r][c]) drawCell(g, c * CELL, r * CELL, COLOR[this.board[r][c]], 1);
            }
          }

          /* 幽灵落点：半透明描边 */
          let gy = this.y;
          while (this.valid(this.cells(), this.x, gy + 1)) gy++;
          if (gy !== this.y) {
            this.cells().forEach((cell) => {
              const px = (this.x + cell[0]) * CELL;
              const py = (gy + cell[1]) * CELL;
              if (py < 0) return;
              g.globalAlpha = 0.35;
              roundRect(g, px + 2, py + 2, CELL - 4, CELL - 4, 5);
              g.strokeStyle = COLOR[this.curType];
              g.lineWidth = 2;
              g.stroke();
              g.globalAlpha = 1;
            });
          }

          this.cells().forEach((cell) => {
            const px = (this.x + cell[0]) * CELL;
            const py = (this.y + cell[1]) * CELL;
            if (py >= 0) drawCell(g, px, py, COLOR[this.curType], 1);
          });

          /* 右侧信息面板 */
          const px = BW + 12;
          g.fillStyle = '#171d35';
          roundRect(g, px - 4, 8, PANEL - 16, BH - 16, 10);
          g.fill();
          g.textAlign = 'left';
          g.fillStyle = '#7f8ac0';
          g.font = 'bold 12px system-ui, sans-serif';
          g.fillText('下一个', px + 6, 34);
          g.fillStyle = '#202748';
          roundRect(g, px + 2, 44, PANEL - 28, 66, 8);
          g.fill();
          const preview = ROT[this.nextType][0];
          const xs = preview.map((c) => c[0]);
          const ys = preview.map((c) => c[1]);
          const minX = Math.min.apply(null, xs);
          const maxX = Math.max.apply(null, xs);
          const minY = Math.min.apply(null, ys);
          const maxY = Math.max.apply(null, ys);
          const s = 15;
          const ox = px + 2 + (PANEL - 28 - (maxX - minX + 1) * s) / 2 - minX * s;
          const oy = 44 + (66 - (maxY - minY + 1) * s) / 2 - minY * s;
          preview.forEach((c) => {
            g.globalAlpha = 0.95;
            drawCell(g, ox + c[0] * s, oy + c[1] * s, COLOR[this.nextType], 1, s);
            g.globalAlpha = 1;
          });
          const rows = [
            ['得分', String(ctx.score)],
            ['等级', String(ctx.level)],
            ['消行', String(this.lines || 0)],
            ['连击', 'x' + Math.max(1, this.combo || 0)],
          ];
          g.font = 'bold 12px system-ui, sans-serif';
          rows.forEach((row, i) => {
            const y = 138 + i * 30;
            g.fillStyle = '#7f8ac0';
            g.fillText(row[0], px + 6, y);
            g.fillStyle = '#eef1ff';
            g.font = 'bold 17px system-ui, sans-serif';
            g.fillText(row[1], px + 58, y + 2);
            g.font = 'bold 12px system-ui, sans-serif';
          });
          g.fillStyle = '#6d78ac';
          g.font = '11px system-ui, sans-serif';
          ['← → 移动', '↑ 旋转 / Z 反转', '↓ 软降', '空格 硬降', '点击面板硬降'].forEach((t, i) => {
            g.fillText(t, px + 4, 275 + i * 19);
          });
        },
      };

      function drawCell(g, x, y, color, alpha, size) {
        const s = size || CELL;
        g.globalAlpha = alpha;
        roundRect(g, x + 1.5, y + 1.5, s - 3, s - 3, 5);
        g.fillStyle = color;
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.28)';
        roundRect(g, x + 3.5, y + 3, s - 8, Math.max(3, s * 0.2), 2);
        g.fill();
        g.globalAlpha = 1;
      }

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
