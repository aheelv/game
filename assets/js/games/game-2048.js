/* 2048：DOM 网格、滑动合并动画、新块生成、胜负判定（难度改棋盘，速度改 4 概率） */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.g2048-wrap{width:100%;max-width:460px;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.g2048-board{position:relative;width:100%;aspect-ratio:1;background:#20264a;border-radius:14px;padding:10px;box-sizing:border-box;box-shadow:0 10px 28px rgba(0,0,0,.28);touch-action:none}',
      '.g2048-grid{position:absolute;inset:10px}',
      '.g2048-cell,.g2048-tile{position:absolute;box-sizing:border-box;border:3px solid transparent;background-clip:padding-box;border-radius:9px}',
      '.g2048-cell{background:#2b3157}',
      '.g2048-tile{display:grid;place-items:center;background:#333a66;color:#eef1ff;font-weight:800;font-size:clamp(16px,5vw,30px);transition:left .12s ease,top .12s ease;box-shadow:0 2px 7px rgba(0,0,0,.22)}',
      '.g2048-tile.v2{background:#3c4474;color:#e9edff}',
      '.g2048-tile.v4{background:#4a5590;color:#f3f6ff}',
      '.g2048-tile.v8{background:#4f74b8;color:#fff}',
      '.g2048-tile.v16{background:#5a8fd0;color:#fff}',
      '.g2048-tile.v32{background:#46a3b5;color:#fff}',
      '.g2048-tile.v64{background:#46b58c;color:#fff}',
      '.g2048-tile.v128{background:#c1a64e;color:#fff;font-size:clamp(14px,4.4vw,26px)}',
      '.g2048-tile.v256{background:#d59445;color:#fff;font-size:clamp(14px,4.4vw,26px)}',
      '.g2048-tile.v512{background:#d9763f;color:#fff;font-size:clamp(14px,4.4vw,26px)}',
      '.g2048-tile.v1024{background:#d55a54;color:#fff;font-size:clamp(13px,4vw,24px)}',
      '.g2048-tile.v2048{background:linear-gradient(135deg,#f0b429,#ff6b6b);color:#fff;font-size:clamp(13px,4vw,24px);box-shadow:0 0 18px rgba(255,180,70,.55)}',
      '.g2048-tile.vbig{background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;font-size:clamp(12px,3.6vw,22px)}',
      '.g2048-tile.pop{animation:g2048-pop .18s ease-out}',
      '.g2048-tile.merge{animation:g2048-merge .22s ease-out}',
      '@keyframes g2048-pop{from{transform:scale(.35);opacity:.3}to{transform:scale(1);opacity:1}}',
      '@keyframes g2048-merge{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}',
      '.g2048-bar{display:flex;justify-content:space-between;gap:10px;margin:0 auto 10px;max-width:460px;font-size:12px;color:#9aa4d6;font-weight:700}',
      '.g2048-bar b{color:#eef1ff;font-variant-numeric:tabular-nums}',
    ].join('\n');
    document.head.appendChild(style);
  }

  A.registerRuntime('2048', {
    create(ctx) {
      const game = {
        init() {
          ensureCss();
          ctx.stage.innerHTML = [
            '<div class="g2048-wrap">',
            '  <div class="g2048-bar"><span>目标 <b>2048</b></span><span>合并 <b class="g2048-merges">0</b> 次</span><span>方向键 / 滑动 / 虚拟键</span></div>',
            '  <div class="g2048-board"><div class="g2048-grid"></div></div>',
            '</div>',
          ].join('');
          this.gridEl = ctx.stage.querySelector('.g2048-grid');
          this.infoEl = ctx.stage.querySelector('.g2048-merges');

          /* 事件只绑定一次，onStart 只重建子元素 */
          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            const map = {
              arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
              arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
            };
            if (map[k]) {
              e.preventDefault();
              this.move(map[k]);
            }
          });
          ctx.enableDpad((dir) => this.move(dir));

          let startPt = null;
          ctx.stage.addEventListener('pointerdown', (e) => {
            startPt = { x: e.clientX, y: e.clientY };
          });
          ctx.stage.addEventListener('pointerup', (e) => {
            if (!startPt) return;
            const dx = e.clientX - startPt.x;
            const dy = e.clientY - startPt.y;
            startPt = null;
            if (ctx.state !== 'playing') return;
            if (Math.hypot(dx, dy) < 22) return;
            this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
          });
        },

        onStart() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          this.n = ctx.difficulty === 'hard' ? 5 : 4;
          this.merges = 0;
          this.won = false;
          this.nextId = 1;
          this.tiles = [];
          this.grid = Array.from({ length: this.n }, () => Array(this.n).fill(null));
          this.gridEl.innerHTML = '';
          for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
              const cell = document.createElement('div');
              cell.className = 'g2048-cell';
              this.applyPos(cell.style, r, c);
              this.gridEl.appendChild(cell);
            }
          }
          const p4 = A.util.clamp(0.08 + ctx.speed * 0.012 + (ctx.difficulty === 'hard' ? 0.06 : 0), 0.08, 0.32);
          this.p4 = p4 * d.speedFactor;
          this.spawn();
          this.spawn();
          this.updateInfo();
        },

        applyPos(style, r, c) {
          const step = 100 / this.n;
          style.left = (c * step) + '%';
          style.top = (r * step) + '%';
          style.width = step + '%';
          style.height = step + '%';
        },

        spawn() {
          const free = [];
          for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
              if (!this.grid[r][c]) free.push({ r, c });
            }
          }
          if (!free.length) return null;
          const pos = A.util.choice(free);
          const val = Math.random() < this.p4 ? 4 : 2;
          const tile = { id: this.nextId++, val: val, r: pos.r, c: pos.c };
          const el = document.createElement('div');
          el.innerHTML = '<span></span>';
          tile.el = el;
          this.gridEl.appendChild(el);
          this.tiles.push(tile);
          this.grid[pos.r][pos.c] = tile;
          this.place(tile, pos, false);
          void el.offsetWidth;
          el.classList.add('pop');
          A.sound.play('place');
          return tile;
        },

        place(tile, pos, merged) {
          tile.r = pos.r;
          tile.c = pos.c;
          this.applyPos(tile.el.style, pos.r, pos.c);
          tile.el.className = 'g2048-tile ' + (tile.val <= 2048 ? 'v' + tile.val : 'vbig');
          tile.el.querySelector('span').textContent = tile.val;
          if (merged) {
            void tile.el.offsetWidth;
            tile.el.classList.add('merge');
          }
        },

        lines(dir) {
          const out = [];
          const n = this.n;
          if (dir === 'left' || dir === 'right') {
            for (let r = 0; r < n; r++) {
              const line = [];
              for (let i = 0; i < n; i++) {
                const c = dir === 'left' ? i : n - 1 - i;
                line.push({ r, c });
              }
              out.push(line);
            }
          } else {
            for (let c = 0; c < n; c++) {
              const line = [];
              for (let i = 0; i < n; i++) {
                const r = dir === 'up' ? i : n - 1 - i;
                line.push({ r, c });
              }
              out.push(line);
            }
          }
          return out;
        },

        move(dir) {
          if (ctx.state !== 'playing') return;
          this.tiles.forEach((t) => { t.merged = false; });
          const before = new Map();
          this.tiles.forEach((t) => before.set(t.id, t.r + ',' + t.c));
          const lines = this.lines(dir);
          const removed = [];

          lines.forEach((line) => {
            if (ctx.state !== 'playing') return;
            const slots = [];
            line.forEach((p) => {
              const t = this.grid[p.r][p.c];
              if (t) slots.push({ t, p });
              this.grid[p.r][p.c] = null;
            });
            let write = 0;
            for (let i = 0; i < slots.length; i++) {
              const cur = slots[i];
              const next = slots[i + 1];
              if (next && !next.t.merged && next.t.val === cur.t.val) {
                cur.t.val *= 2;
                cur.t.merged = true;
                this.merges++;
                ctx.addScore(cur.t.val);
                this.grid[line[write].r][line[write].c] = cur.t;
                this.place(cur.t, line[write], true);
                removed.push(next.t);
                i++;
                if (cur.t.val >= 2048 && !this.won) {
                  this.won = true;
                  ctx.addScore(2000);
                  A.sound.play('level');
                  this.updateInfo();
                  ctx.showToast('达成 2048！');
                  ctx.gameOver('达成 2048', true);
                  return;
                }
              } else {
                this.grid[line[write].r][line[write].c] = cur.t;
                this.place(cur.t, line[write], false);
              }
              write++;
            }
          });

          if (ctx.state !== 'playing') return;

          removed.forEach((t) => {
            t.el.remove();
            const idx = this.tiles.indexOf(t);
            if (idx >= 0) this.tiles.splice(idx, 1);
          });

          const moved = this.tiles.some((t) => before.get(t.id) !== t.r + ',' + t.c) || removed.length > 0;
          if (!moved) {
            /* 无效移动需要把位置还原 */
            this.tiles.forEach((t) => {
              this.grid[t.r][t.c] = null;
            });
            this.tiles.forEach((t) => {
              const parts = before.get(t.id).split(',');
              t.r = Number(parts[0]);
              t.c = Number(parts[1]);
              this.grid[t.r][t.c] = t;
              this.applyPos(t.el.style, t.r, t.c);
            });
            return;
          }

          A.sound.play('move');
          this.spawn();
          this.updateInfo();
          if (!this.hasMoves()) {
            A.sound.play('fail');
            ctx.gameOver('棋盘已满', false);
          }
        },

        hasMoves() {
          const n = this.n;
          for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
              if (!this.grid[r][c]) return true;
              if (c + 1 < n && this.grid[r][c + 1] && this.grid[r][c].val === this.grid[r][c + 1].val) return true;
              if (r + 1 < n && this.grid[r + 1][c] && this.grid[r][c].val === this.grid[r + 1][c].val) return true;
            }
          }
          return false;
        },

        updateInfo() {
          if (this.infoEl) this.infoEl.textContent = this.merges || 0;
        },

        render() {
          this.updateInfo();
        },
      };
      return game;
    },
  });
})();
