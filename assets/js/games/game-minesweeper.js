/* 扫雷：首击安全、数字提示、空白递归展开、右键/长按插旗、难度改棋盘与雷数 */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.msw-wrap{width:100%;max-width:640px;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.msw-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;font-size:12px;color:#9aa4d6;font-weight:700}',
      '.msw-bar b{color:#eef1ff;font-variant-numeric:tabular-nums}',
      '.msw-board{display:inline-block;max-width:100%;overflow:auto}',
      '.msw-board td.cursor{outline:2px solid #ffd166;outline-offset:-2px}',
      '.msw-board td{transition:background .12s ease,transform .08s ease}',
      '.msw-board td:active{transform:scale(.94)}',
      '.msw-board td.revealed{font-variant-numeric:tabular-nums}',
      '.msw-board td.flag{background:#4a3a52}',
      '.msw-board td.mine{background:#8e3c52;color:#ffd7df}',
      '.msw-board td.wrong{text-decoration:line-through;color:#ff9a9a;background:#4a3a52}',
    ].join('\n');
    document.head.appendChild(style);
  }

  const NUM_COLOR = ['', '#7f8ac0', '#5fd68a', '#7cc4ff', '#ffd166', '#ff9f5a', '#ff7a85', '#b57bff', '#ff6b9d'];

  A.registerRuntime('minesweeper', {
    create(ctx) {
      const game = {
        init() {
          ensureCss();
          ctx.stage.innerHTML = [
            '<div class="msw-wrap">',
            '  <div class="msw-bar"><span>剩余雷数 <b class="msw-mines">0</b></span><span>已翻开 <b class="msw-progress">0</b></span><span>左键翻开 · 右键/长按插旗</span></div>',
            '  <div class="stage-board msw-board"><table class="msw-table"></table></div>',
            '</div>',
          ].join('');
          this.tableEl = ctx.stage.querySelector('.msw-table');
          this.mineEl = ctx.stage.querySelector('.msw-mines');
          this.progressEl = ctx.stage.querySelector('.msw-progress');

          /* 事件委托：表格只绑定一次 */
          this.tableEl.addEventListener('contextmenu', (e) => {
            const td = e.target.closest('td');
            if (!td) return;
            e.preventDefault();
            this.toggleFlag(Number(td.dataset.i));
          });
          this.tableEl.addEventListener('pointerdown', (e) => {
            const td = e.target.closest('td');
            if (!td) return;
            const i = Number(td.dataset.i);
            this.press = { i: i, long: false };
            clearTimeout(this.pressTimer);
            this.pressTimer = setTimeout(() => {
              if (this.press && this.press.i === i) {
                this.press.long = true;
                this.toggleFlag(i);
              }
            }, 480);
          });
          this.tableEl.addEventListener('pointerup', () => {
            if (!this.press) return;
            const p = this.press;
            clearTimeout(this.pressTimer);
            this.press = null;
            if (!p.long) this.revealAt(p.i);
          });
          this.tableEl.addEventListener('pointercancel', () => {
            clearTimeout(this.pressTimer);
            this.press = null;
          });

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            const steps = {
              arrowup: -this.cols, w: -this.cols, arrowdown: this.cols, s: this.cols,
              arrowleft: -1, a: -1, arrowright: 1, d: 1,
            };
            if (steps[k] !== undefined) {
              e.preventDefault();
              this.cursor = A.util.clamp(this.cursor + steps[k], 0, this.total - 1);
              this.paintCursor();
            } else if (k === 'enter' || k === ' ') {
              e.preventDefault();
              this.revealAt(this.cursor);
            } else if (k === 'f') {
              e.preventDefault();
              this.toggleFlag(this.cursor);
            }
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            const step = { up: -this.cols, down: this.cols, left: -1, right: 1 }[dir];
            this.cursor = A.util.clamp(this.cursor + step, 0, this.total - 1);
            this.paintCursor();
          });
        },

        config() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          let base;
          if (ctx.difficulty === 'easy') base = { rows: 9, cols: 9, mines: 10 };
          else if (ctx.difficulty === 'hard') base = { rows: 16, cols: 16, mines: 45 };
          else base = { rows: 12, cols: 12, mines: 22 };
          let mines = Math.round(base.mines * d.countFactor + (ctx.speed - 5) * 1.2);
          mines = A.util.clamp(mines, 5, base.rows * base.cols - 9);
          return { rows: base.rows, cols: base.cols, mines: mines };
        },

        onStart() {
          clearTimeout(this.pressTimer);
          this.press = null;
          const cfg = this.config();
          this.rows = cfg.rows;
          this.cols = cfg.cols;
          this.mineCount = cfg.mines;
          this.total = this.rows * this.cols;
          this.board = Array.from({ length: this.total }, () => ({
            mine: false, revealed: false, flagged: false, count: 0,
          }));
          this.placed = false;
          this.overFlag = false;
          this.flags = 0;
          this.revealedCount = 0;
          this.cursor = 0;
          this.buildTable();
          this.updateBar();
        },

        buildTable() {
          let html = '';
          for (let r = 0; r < this.rows; r++) {
            html += '<tr>';
            for (let c = 0; c < this.cols; c++) {
              html += '<td class="cell" data-i="' + (r * this.cols + c) + '"></td>';
            }
            html += '</tr>';
          }
          this.tableEl.innerHTML = html;
          this.cells = Array.from(this.tableEl.querySelectorAll('td'));
        },

        neighbors(i) {
          const r = Math.floor(i / this.cols);
          const c = i % this.cols;
          const out = [];
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) out.push(nr * this.cols + nc);
            }
          }
          return out;
        },

        placeMines(safe) {
          const forbidden = new Set([safe]);
          this.neighbors(safe).forEach((n) => forbidden.add(n));
          let pool = [];
          for (let i = 0; i < this.total; i++) {
            if (!forbidden.has(i)) pool.push(i);
          }
          if (pool.length < this.mineCount) {
            pool = [];
            for (let i = 0; i < this.total; i++) {
              if (i !== safe) pool.push(i);
            }
          }
          A.util.shuffle(pool).slice(0, this.mineCount).forEach((i) => {
            this.board[i].mine = true;
          });
          for (let i = 0; i < this.total; i++) {
            if (this.board[i].mine) continue;
            this.board[i].count = this.neighbors(i).reduce((sum, n) => sum + (this.board[n].mine ? 1 : 0), 0);
          }
          this.placed = true;
        },

        revealAt(i) {
          if (ctx.state !== 'playing' || this.overFlag) return;
          const cell = this.board[i];
          if (cell.revealed || cell.flagged) return;
          if (!this.placed) this.placeMines(i);
          if (cell.mine) {
            this.lose();
            return;
          }
          const stack = [i];
          while (stack.length) {
            const idx = stack.pop();
            const b = this.board[idx];
            if (b.revealed || b.flagged || b.mine) continue;
            b.revealed = true;
            this.revealedCount++;
            ctx.addScore(10);
            this.paint(idx);
            if (b.count === 0) {
              this.neighbors(idx).forEach((n) => {
                const nb = this.board[n];
                if (!nb.revealed && !nb.flagged && !nb.mine) stack.push(n);
              });
            }
          }
          A.sound.play('click');
          this.updateBar();
          if (this.revealedCount === this.total - this.mineCount) this.win();
        },

        toggleFlag(i) {
          if (ctx.state !== 'playing' || this.overFlag) return;
          const b = this.board[i];
          if (b.revealed) return;
          b.flagged = !b.flagged;
          this.flags += b.flagged ? 1 : -1;
          if (b.flagged && b.mine) ctx.addScore(30);
          A.sound.play('click');
          this.paint(i);
          this.updateBar();
        },

        paint(i) {
          const td = this.cells[i];
          const b = this.board[i];
          const cur = this.cursor === i ? ' cursor' : '';
          if (b.revealed) {
            td.className = 'cell revealed' + cur;
            td.textContent = b.count > 0 ? String(b.count) : '';
            td.style.color = NUM_COLOR[b.count] || '';
          } else if (b.flagged) {
            td.className = 'cell flag' + cur;
            td.textContent = '旗';
            td.style.color = '#ff8a65';
          } else {
            td.className = 'cell' + cur;
            td.textContent = '';
            td.style.color = '';
          }
        },

        paintCursor() {
          if (!this.cells) return;
          for (let i = 0; i < this.total; i++) {
            this.cells[i].classList.toggle('cursor', i === this.cursor);
          }
        },

        lose() {
          this.overFlag = true;
          for (let i = 0; i < this.total; i++) {
            const b = this.board[i];
            if (b.mine) {
              this.cells[i].className = 'cell mine';
              this.cells[i].textContent = '雷';
            } else if (b.flagged) {
              this.cells[i].className = 'cell wrong';
              this.cells[i].textContent = '错';
            }
          }
          A.sound.play('hit');
          ctx.gameOver('踩到地雷', false);
        },

        win() {
          this.overFlag = true;
          for (let i = 0; i < this.total; i++) {
            if (this.board[i].mine && !this.board[i].flagged) {
              this.board[i].flagged = true;
              this.flags++;
              this.paint(i);
            }
          }
          ctx.addScore(500);
          A.sound.play('success');
          ctx.gameOver('扫雷成功', true);
        },

        updateBar() {
          if (this.mineEl) this.mineEl.textContent = Math.max(0, this.mineCount - this.flags) + ' / ' + this.mineCount;
          if (this.progressEl) this.progressEl.textContent = this.revealedCount + ' / ' + (this.total - this.mineCount);
        },

        render() {
          this.updateBar();
        },
      };
      return game;
    },
  });
})();
