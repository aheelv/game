/* 记忆翻牌：3D 翻牌动画、延迟比对、步数与连击、难度改牌数、速度改翻回时间 */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.mm-wrap{width:100%;max-width:620px;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.mm-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;color:#9aa4d6;font-weight:700}',
      '.mm-bar b{color:#eef1ff;font-variant-numeric:tabular-nums}',
      '.mm-grid{display:grid;gap:10px}',
      '.mm-card{position:relative;aspect-ratio:1;cursor:pointer;perspective:700px}',
      '.mm-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .42s cubic-bezier(.2,.8,.2,1)}',
      '.mm-card.flipped .mm-inner{transform:rotateY(180deg)}',
      '.mm-face{position:absolute;inset:0;display:grid;place-items:center;border-radius:11px;backface-visibility:hidden;-webkit-backface-visibility:hidden;font-weight:900;font-size:clamp(18px,4.5vw,32px)}',
      '.mm-front{background:linear-gradient(145deg,#39428a,#272e63);color:#aab4ef;box-shadow:0 5px 14px rgba(0,0,0,.25);transition:filter .15s ease,box-shadow .15s ease}',
      '.mm-front::after{content:"?";font-size:clamp(16px,4vw,28px);opacity:.9}',
      '.mm-card:not(.flipped):not(.matched):hover .mm-front{filter:brightness(1.25);box-shadow:0 7px 20px rgba(110,130,255,.35)}',
      '.mm-card:not(.flipped):not(.matched):active .mm-front{filter:brightness(.95)}',
      '.mm-back{transform:rotateY(180deg);background:#f4f6ff;color:#232a5e;box-shadow:inset 0 0 0 3px rgba(90,110,220,.18)}',
      '.mm-card.matched .mm-inner{animation:mm-win .45s ease-out}',
      '.mm-card.matched .mm-back{background:#d9fbe9;color:#15795a;box-shadow:inset 0 0 0 3px rgba(40,190,130,.45)}',
      '.mm-card.cursor .mm-front,.mm-card.cursor .mm-back{outline:3px solid #ffd166;outline-offset:-3px}',
      '@keyframes mm-win{0%{transform:rotateY(180deg) scale(1)}45%{transform:rotateY(180deg) scale(1.12)}100%{transform:rotateY(180deg) scale(1)}}',
    ].join('\n');
    document.head.appendChild(style);
  }

  const SYMBOLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const COLORS = ['#e0526a', '#3aa7c9', '#e8a33d', '#5bbf7a', '#8b6bd6', '#e06c9f', '#3f9e8c', '#c276d8', '#d45b5b', '#4f8fd8', '#7ba23b', '#b5652f'];

  A.registerRuntime('memory', {
    create(ctx) {
      const game = {
        init() {
          ensureCss();
          ctx.stage.innerHTML = [
            '<div class="mm-wrap">',
            '  <div class="mm-bar"><span>步数 <b class="mm-steps">0</b></span><span>配对 <b class="mm-pairs">0 / 0</b></span><span>点击翻牌 · 方向键选择 · 回车翻开</span></div>',
            '  <div class="mm-grid"></div>',
            '</div>',
          ].join('');
          this.gridEl = ctx.stage.querySelector('.mm-grid');
          this.stepsEl = ctx.stage.querySelector('.mm-steps');
          this.pairsEl = ctx.stage.querySelector('.mm-pairs');

          /* 事件委托只注册一次 */
          this.gridEl.addEventListener('click', (e) => {
            const card = e.target.closest('.mm-card');
            if (!card || ctx.state !== 'playing') return;
            this.flip(Number(card.dataset.i));
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
              this.cursor = A.util.clamp(this.cursor + steps[k], 0, this.cards.length - 1);
              this.paintCursor();
            } else if (k === 'enter' || k === ' ') {
              e.preventDefault();
              this.flip(this.cursor);
            }
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            const step = { up: -this.cols, down: this.cols, left: -1, right: 1 }[dir];
            this.cursor = A.util.clamp(this.cursor + step, 0, this.cards.length - 1);
            this.paintCursor();
          });
        },

        config() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          let base = 8;
          if (ctx.difficulty === 'easy') base = 6;
          else if (ctx.difficulty === 'hard') base = 12;
          const pairs = A.util.clamp(Math.round(base * d.countFactor), 3, 12);
          const cols = pairs >= 12 ? 6 : 4;
          const rows = Math.ceil((pairs * 2) / cols);
          const speed = 0.6 + ctx.speed / 12;
          const delay = A.util.clamp(760 / (d.speedFactor * speed), 320, 900);
          return { pairs, cols, rows, delay };
        },

        onStart() {
          clearTimeout(this.resolveTimer);
          this.pending = null;
          this.first = null;
          this.lock = false;
          this.steps = 0;
          this.combo = 0;
          this.matchedPairs = 0;
          this.cursor = 0;
          const cfg = this.config();
          this.cols = cfg.cols;
          this.delay = cfg.delay;
          const symbols = A.util.shuffle(SYMBOLS).slice(0, cfg.pairs);
          const values = [];
          symbols.forEach((s, i) => values.push(s, s));
          const shuffled = A.util.shuffle(values);
          this.cards = shuffled.map((symbol, i) => ({
            symbol: symbol,
            color: COLORS[SYMBOLS.indexOf(symbol) % COLORS.length],
            flipped: false,
            matched: false,
          }));
          this.gridEl.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', 1fr)';
          this.gridEl.innerHTML = '';
          this.cards.forEach((card, i) => {
            const el = document.createElement('div');
            el.className = 'mm-card';
            el.dataset.i = i;
            el.innerHTML = '<div class="mm-inner"><div class="mm-face mm-front"></div>' +
              '<div class="mm-face mm-back" style="color:' + card.color + '">' + card.symbol + '</div></div>';
            card.el = el;
            this.gridEl.appendChild(el);
          });
          this.updateInfo();
        },

        flip(i) {
          if (ctx.state !== 'playing' || this.lock) return;
          const card = this.cards[i];
          if (!card || card.flipped || card.matched) return;
          card.flipped = true;
          card.el.classList.add('flipped');
          A.sound.play('move');

          if (this.first === null) {
            this.first = i;
            return;
          }
          this.steps++;
          this.lock = true;
          const a = this.cards[this.first];
          const b = card;
          this.first = null;
          this.updateInfo();
          this.schedule(() => {
            if (a.symbol === b.symbol) {
              a.matched = true;
              b.matched = true;
              a.el.classList.add('matched');
              b.el.classList.add('matched');
              this.combo++;
              this.matchedPairs++;
              ctx.addScore(100 + (this.combo - 1) * 20);
              A.sound.play('success');
              this.updateInfo();
              if (this.matchedPairs === this.cards.length / 2) {
                const bonus = (ctx.timeLimit > 0 ? 300 : 0) + Math.max(0, this.cards.length / 2 - this.steps) * 10;
                ctx.addScore(bonus);
                ctx.gameOver('全部配对完成', true);
              }
            } else {
              this.combo = 0;
              a.flipped = false;
              b.flipped = false;
              a.el.classList.remove('flipped');
              b.el.classList.remove('flipped');
              A.sound.play('hit');
            }
            this.lock = false;
          }, this.delay);
        },

        schedule(fn, ms) {
          this.pending = fn;
          clearTimeout(this.resolveTimer);
          this.resolveTimer = setTimeout(() => {
            const run = this.pending;
            this.pending = null;
            if (run && ctx.state === 'playing') run();
            else if (run && ctx.state === 'paused') this.pending = run;
          }, ms);
        },

        onPause() {
          clearTimeout(this.resolveTimer);
        },

        onResume() {
          if (this.pending) this.schedule(this.pending, this.delay);
        },

        onEnd() {
          clearTimeout(this.resolveTimer);
          this.pending = null;
        },

        paintCursor() {
          if (!this.cards) return;
          this.cards.forEach((c, i) => c.el.classList.toggle('cursor', i === this.cursor));
        },

        updateInfo() {
          if (this.stepsEl) this.stepsEl.textContent = this.steps || 0;
          if (this.pairsEl) this.pairsEl.textContent = (this.matchedPairs || 0) + ' / ' + (this.cards ? this.cards.length / 2 : 0);
        },

        render() {
          this.updateInfo();
        },
      };
      return game;
    },
  });
})();
