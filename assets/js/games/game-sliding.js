/* 数字华容道：DOM 滑块拼图，难度控制网格尺寸，合法打乱保证有解，点击/方向键/滑动移动 */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.gslide-wrap{width:100%;max-width:480px;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.gslide-bar{display:flex;justify-content:space-between;gap:8px;margin:0 auto 10px;max-width:480px;font-size:12px;color:#9aa4d6;font-weight:700;flex-wrap:wrap}',
      '.gslide-bar b{color:#eef1ff;font-variant-numeric:tabular-nums}',
      '.gslide-board{position:relative;width:100%;aspect-ratio:1;background:#1b2038;border-radius:14px;padding:8px;box-sizing:border-box;box-shadow:0 10px 30px rgba(0,0,0,.3);touch-action:none;overflow:hidden}',
      '.gslide-board.win{animation:gslide-win .6s ease-out}',
      '.gslide-grid{position:absolute;inset:8px}',
      '.gslide-cell,.gslide-tile{position:absolute;box-sizing:border-box;border:3px solid transparent;background-clip:padding-box;border-radius:9px}',
      '.gslide-cell{background:#2a3050}',
      '.gslide-tile{display:grid;place-items:center;background:linear-gradient(135deg,#3f83c8,#2b569c);color:#f4f8ff;font-weight:800;font-size:clamp(16px,5.5vw,30px);cursor:pointer;transition:left .13s cubic-bezier(.2,.7,.3,1),top .13s cubic-bezier(.2,.7,.3,1);box-shadow:0 3px 9px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.25)}',
      '.gslide-tile:hover{filter:brightness(1.16)}',
      '.gslide-tile:active{filter:brightness(.9)}',
      '.gslide-tile.movable{box-shadow:0 3px 12px rgba(120,190,255,.5),inset 0 1px 0 rgba(255,255,255,.35)}',
      '.gslide-board.n5 .gslide-tile{font-size:clamp(13px,4.4vw,24px)}',
      '.gslide-hint{text-align:center;color:#7d87b8;font-size:11px;margin:10px 0 0;font-weight:700}',
      '@keyframes gslide-win{0%{box-shadow:0 0 0 0 rgba(120,220,160,.7)}50%{box-shadow:0 0 0 14px rgba(120,220,160,0)}100%{box-shadow:0 10px 30px rgba(0,0,0,.3)}}',
    ].join('\n');
    document.head.appendChild(style);
  }

  A.registerRuntime('sliding', {
    create(ctx) {
      const game = {
        init() {
          ensureCss();
          ctx.stage.innerHTML = [
            '<div class="gslide-wrap">',
            '  <div class="gslide-bar"><span>关卡 <b class="gslide-level">1</b></span><span>步数 <b class="gslide-steps">0</b></span><span>基准 <b class="gslide-par">0</b></span></div>',
            '  <div class="gslide-board"><div class="gslide-grid"></div></div>',
            '  <p class="gslide-hint">点击空位旁的数字移动 · 方向键 / 滑动手势可操作</p>',
            '</div>',
          ].join('');
          this.boardEl = ctx.stage.querySelector('.gslide-board');
          this.gridEl = ctx.stage.querySelector('.gslide-grid');
          this.levelEl = ctx.stage.querySelector('.gslide-level');
          this.stepsEl = ctx.stage.querySelector('.gslide-steps');
          this.parEl = ctx.stage.querySelector('.gslide-par');

          /* 方向语义：按下的方向代表「方块移动的方向」进入空位 */
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

          let startPt = null;
          this.gridEl.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            startPt = { x: e.clientX, y: e.clientY };
          });
          this.gridEl.addEventListener('pointerup', (e) => {
            if (ctx.state !== 'playing' || !startPt) return;
            const dx = e.clientX - startPt.x;
            const dy = e.clientY - startPt.y;
            startPt = null;
            if (Math.hypot(dx, dy) > 22) {
              this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
              return;
            }
            const rect = this.gridEl.getBoundingClientRect();
            const c = Math.floor((e.clientX - rect.left) / rect.width * this.n);
            const r = Math.floor((e.clientY - rect.top) / rect.height * this.n);
            this.tapCell(r, c);
          });
          this.gridEl.addEventListener('pointercancel', () => { startPt = null; });
        },

        onStart() {
          this.n = ctx.difficulty === 'easy' ? 3 : ctx.difficulty === 'hard' ? 5 : 4;
          this.levelCount = ctx.difficulty === 'hard' ? 3 : 2;
          this.level = 1;
          ctx.setLevel(1);
          this.steps = 0;
          this.par = Math.round(this.n * this.n * (5 + ctx.speed * 0.4));
          this.boardEl.className = 'gslide-board' + (this.n === 5 ? ' n5' : '');
          this.buildBoard();
          this.shuffle();
        },

        buildBoard() {
          this.board = Array.from({ length: this.n }, (_, r) =>
            Array.from({ length: this.n }, (_, c) => r * this.n + c + 1));
          this.board[this.n - 1][this.n - 1] = 0;
          this.blank = { r: this.n - 1, c: this.n - 1 };
          this.gridEl.innerHTML = '';
          this.cells = [];
          for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
              const cell = document.createElement('div');
              cell.className = 'gslide-cell';
              this.applyPos(cell.style, r, c);
              this.gridEl.appendChild(cell);
            }
          }
          this.tiles = [];
          for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
              if (this.board[r][c] === 0) continue;
              const el = document.createElement('div');
              el.className = 'gslide-tile';
              el.textContent = this.board[r][c];
              this.applyPos(el.style, r, c);
              this.gridEl.appendChild(el);
              this.tiles.push({ val: this.board[r][c], r, c, el });
            }
          }
          this.syncTiles();
          this.updateBar();
        },

        applyPos(style, r, c) {
          const step = 100 / this.n;
          style.left = (c * step) + '%';
          style.top = (r * step) + '%';
          style.width = step + '%';
          style.height = step + '%';
        },

        tileAt(r, c) {
          return this.tiles.find((t) => t.r === r && t.c === c);
        },

        /* 从已完成状态执行大量合法移动，保证打乱后必定可解 */
        shuffle() {
          const diff = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          const times = this.n * this.n * (12 + ctx.speed) * diff.countFactor;
          let last = null;
          for (let i = 0; i < times; i++) {
            const opts = [];
            if (this.blank.r > 0) opts.push('up');
            if (this.blank.r < this.n - 1) opts.push('down');
            if (this.blank.c > 0) opts.push('left');
            if (this.blank.c < this.n - 1) opts.push('right');
            const back = { up: 'down', down: 'up', left: 'right', right: 'left' };
            const pool = opts.filter((d) => d !== last);
            const dir = (pool.length ? pool : opts)[A.util.randInt(0, (pool.length ? pool : opts).length - 1)];
            this.slideBlank(dir);
            last = back[dir];
          }
          if (this.isSolved()) this.slideBlank(this.blank.r > 0 ? 'up' : 'left');
          this.steps = 0;
          this.syncTiles();
          this.updateBar();
        },

        /* 空位按 dir 方向移动，等价于相邻方块朝反方向滑入空位 */
        slideBlank(dir) {
          const d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
          const nr = this.blank.r + d[0];
          const nc = this.blank.c + d[1];
          const oldR = this.blank.r;
          const oldC = this.blank.c;
          const tile = this.tileAt(nr, nc);
          this.board[oldR][oldC] = this.board[nr][nc];
          this.board[nr][nc] = 0;
          if (tile) { tile.r = oldR; tile.c = oldC; }
          this.blank = { r: nr, c: nc };
        },

        /* 方块沿 dir 方向滑入空位：目标方块位于空位的反方向 */
        move(dir) {
          if (ctx.state !== 'playing') return;
          const d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
          const sr = this.blank.r - d[0];
          const sc = this.blank.c - d[1];
          if (sr < 0 || sc < 0 || sr >= this.n || sc >= this.n) return;
          const tile = this.tileAt(sr, sc);
          if (!tile) return;
          this.board[this.blank.r][this.blank.c] = tile.val;
          this.board[sr][sc] = 0;
          tile.r = this.blank.r;
          tile.c = this.blank.c;
          this.blank = { r: sr, c: sc };
          this.steps++;
          A.sound.play('move');
          this.syncTiles();
          this.updateBar();
          if (this.isSolved()) this.winLevel();
        },

        tapCell(r, c) {
          if (ctx.state !== 'playing') return;
          const dr = r - this.blank.r;
          const dc = c - this.blank.c;
          if (Math.abs(dr) + Math.abs(dc) !== 1) return;
          if (dr === 1) this.move('up');
          else if (dr === -1) this.move('down');
          else if (dc === 1) this.move('left');
          else this.move('right');
        },

        isSolved() {
          for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
              const target = (r === this.n - 1 && c === this.n - 1) ? 0 : r * this.n + c + 1;
              if (this.board[r][c] !== target) return false;
            }
          }
          return true;
        },

        syncTiles() {
          this.tiles.forEach((t) => {
            this.applyPos(t.el.style, t.r, t.c);
            const dr = Math.abs(t.r - this.blank.r);
            const dc = Math.abs(t.c - this.blank.c);
            t.el.classList.toggle('movable', dr + dc === 1);
          });
        },

        winLevel() {
          const bonus = this.steps <= this.par ? 500 + (this.par - this.steps) * 2 : 0;
          ctx.addScore(1500 + bonus);
          A.sound.play('success');
          this.boardEl.classList.remove('win');
          void this.boardEl.offsetWidth;
          this.boardEl.classList.add('win');
          if (this.level >= this.levelCount) {
            ctx.gameOver('拼图完成', true);
            return;
          }
          this.level++;
          ctx.setLevel(this.level);
          this.par = Math.round(this.n * this.n * (5 + ctx.speed * 0.4));
          this.buildBoard();
          this.shuffle();
          ctx.showToast('过关！进入第 ' + this.level + ' 关  +' + (1500 + bonus));
        },

        updateBar() {
          if (this.levelEl) this.levelEl.textContent = this.level + ' / ' + this.levelCount;
          if (this.stepsEl) this.stepsEl.textContent = this.steps;
          if (this.parEl) this.parEl.textContent = this.par;
        },

        render() {
          this.updateBar();
        },
      };
      return game;
    },
  });
})();
