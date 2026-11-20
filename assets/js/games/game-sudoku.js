/* 数独：回溯生成唯一解题目，4x4/9x9，笔记模式、冲突高亮、提示与多关推进 */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.sud-wrap{width:100%;max-width:520px;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.sud-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;font-size:12px;color:#9aa4d6;font-weight:700}',
      '.sud-bar b{color:#eef1ff;font-variant-numeric:tabular-nums}',
      '.sud-board{display:inline-block;background:#232a4c;border:3px solid #465080;border-radius:10px;padding:3px;box-shadow:0 10px 28px rgba(0,0,0,.3);touch-action:manipulation}',
      '.sud-board table{border-collapse:collapse;margin:0 auto}',
      '.sud-board td{position:relative;width:38px;height:38px;border:1px solid #39405f;text-align:center;vertical-align:middle;font-weight:800;font-size:18px;color:#7fe3ff;background:#1b2140;cursor:pointer;transition:background .12s ease,transform .08s ease}',
      '.sud-board td:active{transform:scale(.94)}',
      '.sud-board td.sud-given{color:#eef1ff;background:#282f54;cursor:default}',
      '.sud-board td.sud-peer{background:#242b4e}',
      '.sud-board td.sud-sel{outline:3px solid #ffd166;outline-offset:-3px;z-index:2}',
      '.sud-board td.sud-err{color:#ff8695;background:#4a2b3f}',
      '.sud-board td.sud-box-r{border-right:3px solid #59649b}',
      '.sud-board td.sud-box-b{border-bottom:3px solid #59649b}',
      '.sud-notes{position:absolute;inset:2px;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);font-size:9px;line-height:1;color:#8d97cf;font-weight:700;pointer-events:none}',
      '.sud-notes span{display:grid;place-items:center}',
      '.sud-pad{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:14px}',
      '.sud-pad button{min-width:42px;height:42px;border:1px solid #3b4268;border-radius:10px;background:#2a3157;color:#eef1ff;font-size:17px;font-weight:800;cursor:pointer;transition:transform .1s ease,filter .15s ease,background .15s ease}',
      '.sud-pad button:hover{filter:brightness(1.25);background:#343d6b}',
      '.sud-pad button:active{transform:translateY(2px)}',
      '.sud-pad button.sud-active{background:#3b5fb0;border-color:#6d9bff}',
      '.sud-pad button.sud-wide{min-width:74px;font-size:13px}',
      '.sud-hint{font-size:11px;color:#ffd166;margin-top:8px;text-align:center}',
      '@keyframes sud-pop{0%{transform:scale(.9)}60%{transform:scale(1.08)}100%{transform:scale(1)}}',
      '.sud-board td.sud-pop{animation:sud-pop .18s ease-out}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function boxDims(n) {
    return n === 4 ? { br: 2, bc: 2 } : { br: 3, bc: 3 };
  }
  function range(n) {
    const out = [];
    for (let i = 1; i <= n; i++) out.push(i);
    return out;
  }
  function valid(board, r, c, v, n, bd) {
    for (let i = 0; i < n; i++) {
      if (board[r][i] === v || board[i][c] === v) return false;
    }
    const br = Math.floor(r / bd.br) * bd.br;
    const bc = Math.floor(c / bd.bc) * bd.bc;
    for (let i = 0; i < bd.br; i++) {
      for (let j = 0; j < bd.bc; j++) {
        if (board[br + i][bc + j] === v) return false;
      }
    }
    return true;
  }
  function pickEmpty(board, n, bd) {
    let best = null, bestCount = Infinity;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (board[r][c] !== 0) continue;
        let count = 0;
        for (let v = 1; v <= n; v++) if (valid(board, r, c, v, n, bd)) count++;
        if (count === 0) return { r, c, count: 0 };
        if (count < bestCount) { best = { r, c, count }; bestCount = count; }
      }
    }
    return best;
  }
  function fillBoard(board, n, bd) {
    const cell = pickEmpty(board, n, bd);
    if (!cell) return true;
    if (cell.count === 0) return false;
    const digits = A.util.shuffle(range(n));
    for (const v of digits) {
      if (!valid(board, cell.r, cell.c, v, n, bd)) continue;
      board[cell.r][cell.c] = v;
      if (fillBoard(board, n, bd)) return true;
      board[cell.r][cell.c] = 0;
    }
    return false;
  }
  function countSolutions(board, n, bd, limit) {
    const cell = pickEmpty(board, n, bd);
    if (!cell) return 1;
    let total = 0;
    for (let v = 1; v <= n; v++) {
      if (!valid(board, cell.r, cell.c, v, n, bd)) continue;
      board[cell.r][cell.c] = v;
      total += countSolutions(board, n, bd, limit - total);
      board[cell.r][cell.c] = 0;
      if (total >= limit) break;
    }
    return total;
  }
  function makePuzzle(n, targetClues) {
    const bd = boxDims(n);
    const board = Array.from({ length: n }, () => new Array(n).fill(0));
    fillBoard(board, n, bd);
    const solution = A.util.deepClone(board);
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push({ r, c });
    const order = A.util.shuffle(cells);
    let clues = n * n;
    for (const { r, c } of order) {
      if (clues <= targetClues) break;
      const backup = board[r][c];
      board[r][c] = 0;
      if (countSolutions(board, n, bd, 2) !== 1) board[r][c] = backup;
      else clues--;
    }
    return { puzzle: board, solution };
  }

  A.registerRuntime('sudoku', {
    create(ctx) {
      const LEVEL_COUNT = (ctx.meta && ctx.meta.defaultParams && ctx.meta.defaultParams.levelCount) || 3;

      const game = {
        init() {
          ensureCss();
          ctx.stage.innerHTML = [
            '<div class="sud-wrap">',
            '  <div class="sud-bar"><span>关卡 <b class="sud-level">1</b></span><span>难度 <b class="sud-diff">标准</b></span><span>提示 <b class="sud-hints">0</b></span><span>笔记 <b class="sud-mode">关</b></span></div>',
            '  <div class="sud-board"><table class="sud-table"></table></div>',
            '  <div class="sud-pad"></div>',
            '  <div class="sud-hint">数字键填入 · 方向键移动 · N 切换笔记 · H 提示 · 退格清除</div>',
            '</div>',
          ].join('');
          this.tableEl = ctx.stage.querySelector('.sud-table');
          this.padEl = ctx.stage.querySelector('.sud-pad');
          this.levelEl = ctx.stage.querySelector('.sud-level');
          this.diffEl = ctx.stage.querySelector('.sud-diff');
          this.hintsEl = ctx.stage.querySelector('.sud-hints');
          this.modeEl = ctx.stage.querySelector('.sud-mode');

          /* 事件委托只注册一次 */
          this.tableEl.addEventListener('click', (e) => {
            if (ctx.state !== 'playing') return;
            const td = e.target.closest('td');
            if (!td) return;
            this.select(Number(td.dataset.r), Number(td.dataset.c));
          });
          this.padEl.addEventListener('click', (e) => {
            if (ctx.state !== 'playing') return;
            const btn = e.target.closest('button');
            if (!btn) return;
            const a = btn.dataset.act;
            if (a === 'clear') this.input(0);
            else if (a === 'note') this.toggleNote();
            else if (a === 'hint') this.hint();
            else this.input(Number(a));
          });

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            const mv = {
              arrowup: [-1, 0], w: [-1, 0], arrowdown: [1, 0], s: [1, 0],
              arrowleft: [0, -1], a: [0, -1], arrowright: [0, 1], d: [0, 1],
            };
            if (mv[k]) {
              e.preventDefault();
              this.moveCursor(mv[k][0], mv[k][1]);
            } else if (/^[0-9]$/.test(k)) {
              e.preventDefault();
              this.input(Number(k));
            } else if (k === 'backspace' || k === 'delete' || k === '0') {
              e.preventDefault();
              this.input(0);
            } else if (k === 'n') {
              e.preventDefault();
              this.toggleNote();
            } else if (k === 'h') {
              e.preventDefault();
              this.hint();
            }
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            const d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
            if (d) this.moveCursor(d[0], d[1]);
          });
        },

        config() {
          const n = ctx.difficulty === 'easy' ? 4 : 9;
          let clues;
          if (n === 4) clues = 8;
          else if (ctx.difficulty === 'easy') clues = 42;
          else if (ctx.difficulty === 'hard') clues = 26;
          else clues = 34;
          clues -= Math.round((ctx.speed - 5) * 0.6);
          clues = A.util.clamp(clues, Math.max(6, Math.floor(n * n * 0.35)), n * n - 2);
          let hints = ctx.difficulty === 'easy' ? 5 : ctx.difficulty === 'hard' ? 1 : 3;
          return { n, clues, hints };
        },

        onStart() {
          this.level = 1;
          ctx.setLevel(1);
          this.noteMode = false;
          this.setupLevel();
        },

        setupLevel() {
          const cfg = this.config();
          this.n = cfg.n;
          this.bd = boxDims(this.n);
          this.hintsLeft = cfg.hints;
          const p = makePuzzle(this.n, cfg.clues);
          this.puzzle = p.puzzle;
          this.solution = p.solution;
          this.grid = A.util.deepClone(p.puzzle);
          this.given = this.grid.map((row) => row.map((v) => v !== 0));
          this.wrong = Array.from({ length: this.n }, () => new Array(this.n).fill(false));
          this.notes = Array.from({ length: this.n }, () => Array.from({ length: this.n }, () => []));
          this.selected = null;
          this.buildBoard();
          this.buildPad();
          this.updateBar();
        },

        buildBoard() {
          const n = this.n, bd = this.bd;
          const size = n === 4 ? 50 : 38;
          let html = '';
          for (let r = 0; r < n; r++) {
            html += '<tr>';
            for (let c = 0; c < n; c++) {
              const cls = ['sud-cell'];
              if ((c + 1) % bd.bc === 0 && c !== n - 1) cls.push('sud-box-r');
              if ((r + 1) % bd.br === 0 && r !== n - 1) cls.push('sud-box-b');
              html += '<td class="' + cls.join(' ') + '" data-r="' + r + '" data-c="' + c + '" style="width:' + size + 'px;height:' + size + 'px;font-size:' + (n === 4 ? '22px' : '18px') + '"></td>';
            }
            html += '</tr>';
          }
          this.tableEl.innerHTML = html;
          this.cells = Array.from({ length: n }, (_, r) =>
            Array.from({ length: n }, (_, c) => this.tableEl.querySelector('td[data-r="' + r + '"][data-c="' + c + '"]')));
          this.paintAll();
        },

        buildPad() {
          let html = '';
          for (let v = 1; v <= this.n; v++) html += '<button data-act="' + v + '">' + v + '</button>';
          html += '<button data-act="note" class="sud-wide">笔记</button>';
          html += '<button data-act="clear" class="sud-wide">清除</button>';
          html += '<button data-act="hint" class="sud-wide">提示</button>';
          this.padEl.innerHTML = html;
        },

        select(r, c) {
          if (r < 0 || r >= this.n || c < 0 || c >= this.n) return;
          this.selected = { r, c };
          A.sound.play('click');
          this.paintAll();
        },

        moveCursor(dr, dc) {
          if (!this.selected) { this.selected = { r: 0, c: 0 }; this.paintAll(); return; }
          const r = A.util.clamp(this.selected.r + dr, 0, this.n - 1);
          const c = A.util.clamp(this.selected.c + dc, 0, this.n - 1);
          this.selected = { r, c };
          this.paintAll();
        },

        input(v) {
          if (!this.selected) { ctx.showToast('请先选择一个格子'); return; }
          const { r, c } = this.selected;
          if (this.given[r][c]) { ctx.showToast('这是固定数字，不可修改'); return; }

          if (this.noteMode && v > 0) {
            const arr = this.notes[r][c];
            const i = arr.indexOf(v);
            if (i >= 0) arr.splice(i, 1); else arr.push(v);
            A.sound.play('click');
            this.paint(r, c);
            return;
          }

          this.grid[r][c] = v;
          this.notes[r][c] = [];
          const td = this.cells[r][c];
          td.classList.remove('sud-pop');
          void td.offsetWidth;
          td.classList.add('sud-pop');

          if (v === 0) {
            this.wrong[r][c] = false;
          } else if (v === this.solution[r][c]) {
            this.wrong[r][c] = false;
            ctx.addScore(20);
            A.sound.play('place');
          } else {
            this.wrong[r][c] = true;
            ctx.addScore(-10);
            A.sound.play('hit');
          }
          this.paint(r, c);
          this.checkDone();
        },

        toggleNote() {
          this.noteMode = !this.noteMode;
          this.updateBar();
          this.padEl.querySelectorAll('button').forEach((b) => {
            b.classList.toggle('sud-active', b.dataset.act === 'note' && this.noteMode);
          });
          A.sound.play('click');
        },

        hint() {
          if (this.hintsLeft <= 0) { ctx.showToast('提示次数已用完'); return; }
          let target = null;
          if (this.selected && !this.given[this.selected.r][this.selected.c] &&
              this.grid[this.selected.r][this.selected.c] !== this.solution[this.selected.r][this.selected.c]) {
            target = this.selected;
          }
          if (!target) {
            outer: for (let r = 0; r < this.n; r++) {
              for (let c = 0; c < this.n; c++) {
                if (!this.given[r][c] && this.grid[r][c] !== this.solution[r][c]) { target = { r, c }; break outer; }
              }
            }
          }
          if (!target) { ctx.showToast('已经没有需要提示的格子'); return; }
          this.hintsLeft--;
          this.grid[target.r][target.c] = this.solution[target.r][target.c];
          this.wrong[target.r][target.c] = false;
          this.notes[target.r][target.c] = [];
          this.selected = target;
          A.sound.play('success');
          ctx.showToast('已填入一个正确数字');
          this.paintAll();
          this.updateBar();
          this.checkDone();
        },

        checkDone() {
          for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
              if (this.grid[r][c] !== this.solution[r][c]) return;
            }
          }
          ctx.addScore(1000);
          A.sound.play('level');
          if (this.level >= LEVEL_COUNT) {
            ctx.gameOver('数独大师', true);
            return;
          }
          this.level++;
          ctx.setLevel(this.level);
          this.setupLevel();
          ctx.showToast('过关！进入第 ' + this.level + ' 关');
        },

        paint(r, c) {
          const td = this.cells[r][c];
          if (!td) return;
          const cls = ['sud-cell'];
          if ((c + 1) % this.bd.bc === 0 && c !== this.n - 1) cls.push('sud-box-r');
          if ((r + 1) % this.bd.br === 0 && r !== this.n - 1) cls.push('sud-box-b');
          if (this.given[r][c]) cls.push('sud-given');
          if (this.wrong[r][c]) cls.push('sud-err');
          if (this.selected && this.selected.r === r && this.selected.c === c) cls.push('sud-sel');
          else if (this.selected) {
            const sr = this.selected.r, sc = this.selected.c;
            const br = Math.floor(r / this.bd.br) === Math.floor(sr / this.bd.br);
            const bc = Math.floor(c / this.bd.bc) === Math.floor(sc / this.bd.bc);
            if (r === sr || c === sc || (br && bc)) cls.push('sud-peer');
          }
          td.className = cls.join(' ');
          const v = this.grid[r][c];
          const notes = (!this.given[r][c] && v === 0) ? this.notes[r][c] : [];
          let html = v ? String(v) : '';
          if (notes.length) {
            html += '<div class="sud-notes">';
            for (let d = 1; d <= this.n; d++) html += '<span>' + (notes.indexOf(d) >= 0 ? d : '') + '</span>';
            html += '</div>';
          }
          td.innerHTML = html;
        },

        paintAll() {
          if (!this.grid) return;
          for (let r = 0; r < this.n; r++) for (let c = 0; c < this.n; c++) this.paint(r, c);
        },

        updateBar() {
          if (this.levelEl) this.levelEl.textContent = this.level + ' / ' + LEVEL_COUNT;
          if (this.diffEl) this.diffEl.textContent = (A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal).label;
          if (this.hintsEl) this.hintsEl.textContent = this.hintsLeft;
          if (this.modeEl) this.modeEl.textContent = this.noteMode ? '开' : '关';
        },

        render() {
          this.updateBar();
        },
      };
      return game;
    },
  });
})();
