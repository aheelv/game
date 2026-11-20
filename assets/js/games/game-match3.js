/* 消消乐：交换匹配、重力下落、连锁计分、限步闯关；难度改颜色数与步数，速度改动画节奏 */
(function () {
  const A = window.Arcade;

  A.registerRuntime('match3', {
    create(ctx) {
      const CELL = 56;              // 单格逻辑尺寸
      const BOARD_N = 9;            // 画布固定按 9x9 预留，实际棋盘居中
      const TOP = 46;               // 顶部信息条高度
      const BOARD_PX = BOARD_N * CELL;
      const GEMS = [
        { fill: '#ff6b6b', light: '#ffb3b3' }, // 0 红
        { fill: '#ffd166', light: '#ffe9a8' }, // 1 黄
        { fill: '#5fd68a', light: '#b2f2cc' }, // 2 绿
        { fill: '#5aa9ff', light: '#b3d8ff' }, // 3 蓝
        { fill: '#b07bff', light: '#dcc6ff' }, // 4 紫
        { fill: '#ff8fab', light: '#ffc9d8' }, // 5 粉
        { fill: '#4fd1c5', light: '#a6f0e9' }, // 6 青
      ];
      const LEVEL_COUNT = (ctx.meta && ctx.meta.defaultParams && ctx.meta.defaultParams.levelCount) || 5;

      const clamp = A.util.clamp;

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

      /* 找出所有横向/纵向三连及以上的格子 */
      function findMatches(board, size) {
        const hit = new Set();
        const key = (r, c) => r * size + c;
        for (let r = 0; r < size; r++) {
          let run = 1;
          for (let c = 1; c <= size; c++) {
            const same = c < size && board[r][c] !== null && board[r][c] === board[r][c - 1];
            if (same) run++;
            else {
              if (run >= 3) for (let k = c - run; k < c; k++) hit.add(key(r, k));
              run = 1;
            }
          }
        }
        for (let c = 0; c < size; c++) {
          let run = 1;
          for (let r = 1; r <= size; r++) {
            const same = r < size && board[r][c] !== null && board[r][c] === board[r][c - 1];
            if (same) run++;
            else {
              if (run >= 3) for (let k = r - run; k < r; k++) hit.add(key(k, c));
              run = 1;
            }
          }
        }
        return Array.from(hit).map((k) => ({ r: Math.floor(k / size), c: k % size }));
      }

      const game = {
        init() {
          ctx.makeCanvas(BOARD_PX, BOARD_PX + TOP);
          this.canvas = ctx.canvas;
          this.g = ctx.g;

          /* 指针点选：鼠标与触屏通用 */
          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing' || this.busy) return;
            const p = ctx.pointerPos(e);
            const c = Math.floor((p.x - this.offX) / CELL);
            const r = Math.floor((p.y - this.offY) / CELL);
            if (r < 0 || r >= this.size || c < 0 || c >= this.size) return;
            this.tapCell(r, c);
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
              this.cursor.r = clamp(this.cursor.r + mv[k][0], 0, this.size - 1);
              this.cursor.c = clamp(this.cursor.c + mv[k][1], 0, this.size - 1);
              this.render();
            } else if (k === 'enter' || k === ' ') {
              e.preventDefault();
              if (!this.busy) this.tapCell(this.cursor.r, this.cursor.c);
            }
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            const d = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
            if (!d) return;
            this.cursor.r = clamp(this.cursor.r + d[0], 0, this.size - 1);
            this.cursor.c = clamp(this.cursor.c + d[1], 0, this.size - 1);
            this.render();
          });
        },

        config() {
          let size = 8;
          let colors = 6;
          let moves = 22;
          if (ctx.difficulty === 'easy') { size = 7; colors = 5; moves = 28; }
          else if (ctx.difficulty === 'hard') { size = 9; colors = 7; moves = 18; }
          return { size, colors, moves };
        },

        animScale() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          return d.speedFactor * (0.6 + ctx.speed / 12);
        },

        onStart() {
          const cfg = this.config();
          this.size = cfg.size;
          this.colors = cfg.colors;
          this.movesBase = cfg.moves;
          this.offX = (BOARD_N - this.size) * CELL / 2;
          this.offY = TOP + (BOARD_N - this.size) * CELL / 2;
          this.cursor = { r: 0, c: 0 };
          this.level = 1;
          ctx.setLevel(1);
          this.setupLevel();
        },

        setupLevel() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          this.target = Math.round((480 + (this.level - 1) * 220) * d.countFactor * (0.85 + ctx.speed / 35));
          this.levelScore = 0;
          this.movesLeft = this.movesBase;
          this.combo = 0;
          this.sel = null;
          this.busy = false;
          this.phase = 'idle';
          this.matched = null;
          this.fallInfo = null;
          this.swapInfo = null;
          this.generateBoard();
          this.render();
        },

        /* 生成无初始三连且存在可行交换的棋盘 */
        generateBoard() {
          for (let attempt = 0; attempt < 40; attempt++) {
            const b = [];
            for (let r = 0; r < this.size; r++) {
              b[r] = [];
              for (let c = 0; c < this.size; c++) {
                const banned = new Set();
                if (c >= 2 && b[r][c - 1] === b[r][c - 2]) banned.add(b[r][c - 1]);
                if (r >= 2 && b[r - 1][c] === b[r - 2][c]) banned.add(b[r - 1][c]);
                const pool = [];
                for (let k = 0; k < this.colors; k++) if (!banned.has(k)) pool.push(k);
                b[r][c] = A.util.choice(pool);
              }
            }
            this.board = b;
            if (this.hasPossibleMove()) return;
          }
        },

        hasPossibleMove() {
          const s = this.size;
          for (let r = 0; r < s; r++) {
            for (let c = 0; c < s; c++) {
              const dirs = [[0, 1], [1, 0]];
              for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= s || nc >= s) continue;
                const t = this.board[r][c];
                this.board[r][c] = this.board[nr][nc];
                this.board[nr][nc] = t;
                const ok = findMatches(this.board, s).length > 0;
                this.board[r][c] = this.board[nr][nc];
                this.board[nr][nc] = t;
                if (ok) return true;
              }
            }
          }
          return false;
        },

        tapCell(r, c) {
          if (ctx.state !== 'playing' || this.busy) return;
          if (!this.sel) {
            this.sel = { r, c };
            A.sound.play('click');
            this.render();
            return;
          }
          if (this.sel.r === r && this.sel.c === c) {
            this.sel = null;
            this.render();
            return;
          }
          const adjacent = Math.abs(this.sel.r - r) + Math.abs(this.sel.c - c) === 1;
          const from = this.sel;
          this.sel = null;
          if (adjacent) this.doSwap(from, { r, c });
          else {
            this.sel = { r, c };
            A.sound.play('click');
            this.render();
          }
        },

        doSwap(a, b) {
          const t = this.board[a.r][a.c];
          this.board[a.r][a.c] = this.board[b.r][b.c];
          this.board[b.r][b.c] = t;
          this.swapInfo = { a, b, revert: false };
          this.phase = 'swap';
          this.phaseT = 0;
          this.phaseDur = 0.14 / Math.max(0.5, this.animScale());
          this.busy = true;
          A.sound.play('move');
        },

        startClear(matches) {
          this.matched = matches;
          const n = matches.length;
          const base = n >= 6 ? 800 : n === 5 ? 500 : n === 4 ? 300 : 150;
          const gain = base * Math.max(1, this.combo);
          ctx.addScore(gain);
          this.levelScore += gain;
          this.phase = 'clear';
          this.phaseT = 0;
          this.phaseDur = 0.24 / Math.max(0.5, this.animScale());
          A.sound.play('eat');
          if (this.combo > 1) ctx.showToast('连锁 x' + this.combo + '  +' + gain);
        },

        applyGravity() {
          const s = this.size;
          for (const m of this.matched) this.board[m.r][m.c] = null;
          const fall = [];
          for (let c = 0; c < s; c++) {
            const stack = [];
            for (let r = s - 1; r >= 0; r--) {
              if (this.board[r][c] !== null) stack.push({ row: r, color: this.board[r][c] });
            }
            let idx = 0;
            let newCount = 0;
            for (let r = s - 1; r >= 0; r--) {
              if (idx < stack.length) {
                const w = stack[idx++];
                this.board[r][c] = w.color;
                if (w.row !== r) fall.push({ c, from: w.row, to: r, color: w.color });
              } else {
                newCount++;
                const color = A.util.randInt(0, this.colors - 1);
                this.board[r][c] = color;
                fall.push({ c, from: -newCount, to: r, color });
              }
            }
          }
          this.fallInfo = fall;
          this.fallMap = {};
          fall.forEach((f) => { this.fallMap[f.to + ',' + f.c] = f; });
          this.phase = 'fall';
          this.phaseT = 0;
          this.phaseDur = 0.2 / Math.max(0.5, this.animScale());
        },

        finishResolution() {
          this.busy = false;
          this.matched = null;
          this.fallInfo = null;
          this.fallMap = null;
          this.combo = 0;
          if (!this.hasPossibleMove()) {
            this.generateBoard();
            ctx.showToast('无可交换组合，棋盘已重排');
          }
          if (this.levelScore >= this.target) {
            this.levelComplete();
            return;
          }
          if (this.movesLeft <= 0) {
            A.sound.play('hit');
            ctx.gameOver('步数已用尽', false);
            return;
          }
          this.render();
        },

        levelComplete() {
          ctx.addScore(300);
          A.sound.play('level');
          if (this.level >= LEVEL_COUNT) {
            ctx.gameOver('消消乐通关', true);
            return;
          }
          this.level++;
          ctx.setLevel(this.level);
          this.setupLevel();
          ctx.showToast('过关！进入第 ' + this.level + ' 关');
        },

        onTick(dt) {
          if (this.phase === 'idle' || this.busy === false) return;
          this.phaseT += dt;
          if (this.phaseT < this.phaseDur) { this.render(); return; }

          if (this.phase === 'swap') {
            if (this.swapInfo.revert) {
              this.phase = 'idle';
              this.busy = false;
              this.swapInfo = null;
              A.sound.play('hit');
              ctx.showToast('无效交换');
              this.render();
              return;
            }
            const matches = findMatches(this.board, this.size);
            if (matches.length) {
              this.movesLeft--;
              this.combo = 1;
              this.swapInfo = null;
              this.startClear(matches);
            } else {
              const { a, b } = this.swapInfo;
              const t = this.board[a.r][a.c];
              this.board[a.r][a.c] = this.board[b.r][b.c];
              this.board[b.r][b.c] = t;
              this.swapInfo.revert = true;
              this.phaseT = 0;
            }
          } else if (this.phase === 'clear') {
            this.applyGravity();
          } else if (this.phase === 'fall') {
            this.fallInfo = null;
            this.fallMap = null;
            const matches = findMatches(this.board, this.size);
            if (matches.length) {
              this.combo++;
              this.startClear(matches);
            } else {
              this.phase = 'idle';
              this.finishResolution();
            }
          }
          this.render();
        },

        render() {
          if (!this.g || !this.board) return;
          const g = this.g;
          g.clearRect(0, 0, BOARD_PX, BOARD_PX + TOP);

          // 顶部信息条
          g.fillStyle = '#12162a';
          g.fillRect(0, 0, BOARD_PX, TOP);
          g.font = 'bold 14px system-ui, sans-serif';
          g.textBaseline = 'middle';
          g.textAlign = 'left';
          g.fillStyle = '#eef0ff';
          g.fillText('第 ' + this.level + ' / ' + LEVEL_COUNT + ' 关', 12, TOP / 2);
          g.textAlign = 'center';
          g.fillStyle = '#ffd166';
          g.fillText('目标 ' + this.target, BOARD_PX / 2 - 60, TOP / 2);
          g.fillStyle = '#7fe3a3';
          g.fillText(this.levelScore + '', BOARD_PX / 2 + 70, TOP / 2);
          g.textAlign = 'right';
          g.fillStyle = this.movesLeft <= 5 ? '#ff7a85' : '#aab4ef';
          g.fillText('步数 ' + this.movesLeft, BOARD_PX - 12, TOP / 2);

          // 棋盘底
          this.canvas.style.background = '#0d1020';
          g.fillStyle = '#171c33';
          roundRect(g, this.offX - 6, this.offY - 6, this.size * CELL + 12, this.size * CELL + 12, 12);
          g.fill();

          for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
              const baseX = this.offX + c * CELL;
              const baseY = this.offY + r * CELL;
              // 格底
              g.fillStyle = (r + c) % 2 === 0 ? '#1f2542' : '#232a4c';
              roundRect(g, baseX + 2, baseY + 2, CELL - 4, CELL - 4, 8);
              g.fill();

              let x = baseX;
              let y = baseY;
              let scale = 1;
              let flash = 0;

              // 交换动画：cell a 从 b 位置滑来，cell b 从 a 位置滑来
              if (this.swapInfo && (this.phase === 'swap')) {
                const { a, b } = this.swapInfo;
                const t = clamp(this.phaseT / this.phaseDur, 0, 1);
                const ease = t * t * (3 - 2 * t);
                const isA = a.r === r && a.c === c;
                const isB = b.r === r && b.c === c;
                if (isA) {
                  x = this.offX + (b.c + (a.c - b.c) * ease) * CELL;
                  y = this.offY + (b.r + (a.r - b.r) * ease) * CELL;
                } else if (isB) {
                  x = this.offX + (a.c + (b.c - a.c) * ease) * CELL;
                  y = this.offY + (a.r + (b.r - a.r) * ease) * CELL;
                }
              }

              // 下落动画
              if (this.phase === 'fall' && this.fallMap) {
                const f = this.fallMap[r + ',' + c];
                if (f) {
                  const t = clamp(this.phaseT / this.phaseDur, 0, 1);
                  const ease = t * t;
                  y = this.offY + (f.from + (f.to - f.from) * ease) * CELL;
                }
              }

              // 消除动画
              if (this.phase === 'clear' && this.matched) {
                const m = this.matched.some((p) => p.r === r && p.c === c);
                if (m) {
                  const t = clamp(this.phaseT / this.phaseDur, 0, 1);
                  scale = 1 - 0.85 * t;
                  flash = 1 - t;
                }
              }

              const color = this.board[r][c];
              if (color === null || color === undefined) continue;
              const gem = GEMS[color % GEMS.length];
              const cx = x + CELL / 2;
              const cy = y + CELL / 2;
              const gs = (CELL - 12) * scale;
              g.save();
              g.translate(cx, cy);
              g.shadowColor = 'rgba(0,0,0,.35)';
              g.shadowBlur = 6;
              g.shadowOffsetY = 3;
              g.fillStyle = gem.fill;
              roundRect(g, -gs / 2, -gs / 2, gs, gs, gs * 0.28);
              g.fill();
              g.shadowColor = 'transparent';
              g.fillStyle = gem.light;
              roundRect(g, -gs / 2 + 4, -gs / 2 + 4, gs - 8, gs * 0.34, gs * 0.16);
              g.fill();
              g.fillStyle = 'rgba(255,255,255,.55)';
              g.beginPath();
              g.arc(-gs * 0.22, -gs * 0.24, Math.max(1.5, gs * 0.07), 0, Math.PI * 2);
              g.fill();
              if (flash > 0) {
                g.fillStyle = 'rgba(255,255,255,' + (flash * 0.8) + ')';
                roundRect(g, -gs / 2, -gs / 2, gs, gs, gs * 0.28);
                g.fill();
              }
              g.restore();

              // 选中框
              if (this.sel && this.sel.r === r && this.sel.c === c) {
                g.strokeStyle = '#ffd166';
                g.lineWidth = 3;
                roundRect(g, baseX + 2, baseY + 2, CELL - 4, CELL - 4, 8);
                g.stroke();
              }
              // 键盘光标
              if (this.cursor && this.cursor.r === r && this.cursor.c === c && (!this.sel || this.sel.r !== r || this.sel.c !== c)) {
                g.strokeStyle = 'rgba(160,180,255,.5)';
                g.lineWidth = 2;
                roundRect(g, baseX + 3, baseY + 3, CELL - 6, CELL - 6, 7);
                g.stroke();
              }
            }
          }
        },
      };
      return game;
    },
  });
})();
