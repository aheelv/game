/* 24 点：保证有解的发牌、安全有理数求值（不用 eval）、卡牌点击构建表达式、限时闯关 */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.p24-wrap{width:100%;max-width:560px;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.p24-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;color:#9aa4d6;font-weight:700}',
      '.p24-bar b{color:#eef1ff;font-variant-numeric:tabular-nums}',
      '.p24-cards{display:flex;gap:10px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}',
      '.p24-card{width:74px;height:102px;border-radius:11px;background:linear-gradient(150deg,#f7f9ff,#dfe4f6);color:#1d2547;box-shadow:0 8px 18px rgba(0,0,0,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;border:2px solid transparent;transition:transform .14s ease,box-shadow .14s ease,filter .14s ease;position:relative}',
      '.p24-card:hover:not(.p24-used){transform:translateY(-6px);box-shadow:0 14px 26px rgba(120,140,255,.4)}',
      '.p24-card:active:not(.p24-used){transform:translateY(-2px)}',
      '.p24-card.p24-used{filter:grayscale(.75) brightness(.72);cursor:default;transform:translateY(3px)}',
      '.p24-card.p24-red{color:#c0395b}',
      '.p24-card .p24-num{font-size:38px;font-weight:900;line-height:1}',
      '.p24-card .p24-corner{position:absolute;top:7px;left:9px;font-size:13px;font-weight:800;opacity:.8}',
      '.p24-expr{min-height:56px;background:#141a33;border:1px solid #39406a;border-radius:12px;padding:12px 14px;color:#eef1ff;font-size:22px;font-weight:700;letter-spacing:1px;display:flex;align-items:center;justify-content:center;word-break:break-all;box-shadow:inset 0 2px 10px rgba(0,0,0,.25)}',
      '.p24-expr.p24-bad{animation:p24-shake .32s ease;border-color:#c0455f;color:#ff9aa8}',
      '.p24-expr.p24-good{border-color:#5fd68a;color:#a8f0c2}',
      '.p24-caret{display:inline-block;width:2px;height:24px;background:#ffd166;margin-left:3px;animation:p24-blink 1s steps(1) infinite}',
      '.p24-keys{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px}',
      '.p24-keys button{padding:11px 0;border:1px solid #3b4268;border-radius:10px;background:#2a3157;color:#eef1ff;font-size:18px;font-weight:800;cursor:pointer;transition:transform .1s ease,filter .15s ease,background .15s ease}',
      '.p24-keys button:hover{filter:brightness(1.25);background:#343d6b}',
      '.p24-keys button:active{transform:translateY(2px)}',
      '.p24-keys button.p24-op{background:#3a3168;color:#ffd9a8}',
      '.p24-keys button.p24-ok{background:#2f7d5b;border-color:#54c98c}',
      '.p24-keys button.p24-hint{background:#7a5a2a;border-color:#d3a24f}',
      '@keyframes p24-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}',
      '@keyframes p24-blink{50%{opacity:0}}',
      '@keyframes p24-deal{0%{transform:translateY(-30px) rotate(-12deg);opacity:0}100%{transform:none;opacity:1}}',
      '.p24-card.p24-deal{animation:p24-deal .38s cubic-bezier(.2,.8,.2,1) both}',
    ].join('\n');
    document.head.appendChild(style);
  }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  function rat(n, d) {
    if (d === 0) return null;
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function add(a, b) { return rat(a.n * b.d + b.n * a.d, a.d * b.d); }
  function sub(a, b) { return rat(a.n * b.d - b.n * a.d, a.d * b.d); }
  function mul(a, b) { return rat(a.n * b.n, a.d * b.d); }
  function div(a, b) { return b.n === 0 ? null : rat(a.n * b.d, a.d * b.n); }

  /* 递归两两合并，寻找结果恰为 24 的表达式 */
  function solve(nums) {
    function search(items) {
      if (items.length === 1) return items[0].v.n === 24 * items[0].v.d ? items[0].e : null;
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i], b = items[j];
          const rest = items.filter((_, k) => k !== i && k !== j);
          const tries = [
            [add(a.v, b.v), '(' + a.e + '+' + b.e + ')'],
            [sub(a.v, b.v), '(' + a.e + '-' + b.e + ')'],
            [sub(b.v, a.v), '(' + b.e + '-' + a.e + ')'],
            [mul(a.v, b.v), '(' + a.e + '*' + b.e + ')'],
            [div(a.v, b.v), '(' + a.e + '/' + b.e + ')'],
            [div(b.v, a.v), '(' + b.e + '/' + a.e + ')'],
          ];
          for (const [v, e] of tries) {
            if (!v) continue;
            const res = search(rest.concat([{ v, e }]));
            if (res) return res;
          }
        }
      }
      return null;
    }
    return search(nums.map((n) => ({ v: rat(n, 1), e: String(n) })));
  }

  A.registerRuntime('game24', {
    create(ctx) {
      const LEVEL_COUNT = (ctx.meta && ctx.meta.defaultParams && ctx.meta.defaultParams.levelCount) || 5;

      const game = {
        init() {
          ensureCss();
          ctx.stage.innerHTML = [
            '<div class="p24-wrap">',
            '  <div class="p24-bar"><span>第 <b class="p24-level">1</b> / ' + LEVEL_COUNT + ' 题</span><span>答对 <b class="p24-correct">0</b></span><span>点击卡牌与运算符组式</span></div>',
            '  <div class="p24-cards"></div>',
            '  <div class="p24-expr"><span class="p24-expr-text">= </span><span class="p24-caret"></span></div>',
            '  <div class="p24-keys"></div>',
            '</div>',
          ].join('');
          this.cardsEl = ctx.stage.querySelector('.p24-cards');
          this.exprEl = ctx.stage.querySelector('.p24-expr');
          this.exprText = ctx.stage.querySelector('.p24-expr-text');
          this.keysEl = ctx.stage.querySelector('.p24-keys');
          this.levelEl = ctx.stage.querySelector('.p24-level');
          this.correctEl = ctx.stage.querySelector('.p24-correct');

          this.cardsEl.addEventListener('click', (e) => {
            if (ctx.state !== 'playing') return;
            const card = e.target.closest('.p24-card');
            if (!card) return;
            this.addNumber(Number(card.dataset.i));
          });
          this.keysEl.addEventListener('click', (e) => {
            if (ctx.state !== 'playing') return;
            const btn = e.target.closest('button');
            if (!btn) return;
            const a = btn.dataset.act;
            if (a === 'back') this.backspace();
            else if (a === 'clear') this.clearTokens();
            else if (a === 'submit') this.submit();
            else if (a === 'hint') this.hint();
            else if (a === 'lp' || a === 'rp') this.addParen(a === 'lp');
            else this.addOp(a);
          });

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            if (k >= '1' && k <= '4') { e.preventDefault(); this.addNumber(Number(k) - 1); }
            else if (k === '+' || k === '-' || k === '*' || k === '/') { e.preventDefault(); this.addOp(k); }
            else if (k === 'x' || k === '×') { e.preventDefault(); this.addOp('*'); }
            else if (k === '(' ) { e.preventDefault(); this.addParen(true); }
            else if (k === ')' ) { e.preventDefault(); this.addParen(false); }
            else if (k === 'backspace') { e.preventDefault(); this.backspace(); }
            else if (k === 'enter') { e.preventDefault(); this.submit(); }
            else if (k === 'c') { e.preventDefault(); this.clearTokens(); }
            else if (k === 'h') { e.preventDefault(); this.hint(); }
          });
        },

        config() {
          const maxNum = ctx.difficulty === 'easy' ? 9 : 13;
          const requireDiv = ctx.difficulty === 'hard';
          return { maxNum, requireDiv };
        },

        onStart() {
          this.level = 1;
          this.correct = 0;
          ctx.setLevel(1);
          this.newQuestion();
        },

        newQuestion() {
          const cfg = this.config();
          let nums = null, sol = null;
          for (let t = 0; t < 600; t++) {
            const candidate = [0, 0, 0, 0].map(() => A.util.randInt(1, cfg.maxNum));
            const s = solve(candidate);
            if (!s) continue;
            if (cfg.requireDiv && s.indexOf('/') < 0) continue;
            nums = candidate;
            sol = s;
            break;
          }
          if (!nums) {
            nums = cfg.requireDiv ? [8, 3, 8, 3] : [1, 2, 3, 4];
            sol = solve(nums) || '(1+3)*(2+4)';
          }
          this.nums = nums;
          this.solution = sol;
          this.buildCards();
          this.buildKeys();
          this.clearTokens();
        },

        buildCards() {
          let html = '';
          this.nums.forEach((n, i) => {
            const red = i % 2 === 0;
            html += '<div class="p24-card p24-deal' + (red ? ' p24-red' : '') + '" data-i="' + i + '" style="animation-delay:' + (i * 60) + 'ms">' +
              '<span class="p24-corner">' + (n <= 13 ? n : n) + '</span>' +
              '<span class="p24-num">' + n + '</span></div>';
          });
          this.cardsEl.innerHTML = html;
          this.cardEls = Array.from(this.cardsEl.querySelectorAll('.p24-card'));
        },

        buildKeys() {
          const keys = [
            ['+', '+', 'p24-op'], ['-', '-', 'p24-op'], ['×', '*', 'p24-op'], ['÷', '/', 'p24-op'], ['(', 'lp', ''],
            [')', 'rp', ''], ['退格', 'back', ''], ['清空', 'clear', ''], ['提示', 'hint', 'p24-hint'], ['= 提交', 'submit', 'p24-ok'],
          ];
          this.keysEl.innerHTML = keys.map(([label, act, cls]) =>
            '<button class="' + cls + '" data-act="' + act + '">' + label + '</button>').join('');
        },

        /* 依据当前 token 序列推算下一个位置是否允许操作数 */
        stateOf() {
          let expect = true, depth = 0;
          for (const t of this.tokens) {
            if (t.type === 'num') {
              if (!expect) return { ok: false };
              expect = false;
            } else if (t.type === 'op') {
              if (expect) return { ok: false };
              expect = true;
            } else if (t.type === 'lp') {
              if (!expect) return { ok: false };
              depth++;
            } else if (t.type === 'rp') {
              if (expect || depth === 0) return { ok: false };
              depth--;
              expect = false;
            }
          }
          return { ok: true, expect, depth };
        },

        refreshUsed() {
          this.used = [false, false, false, false];
          this.tokens.forEach((t) => { if (t.type === 'num') this.used[t.card] = true; });
        },

        addNumber(i) {
          if (!this.used[i] && this.stateOf().expect === true) {
            this.tokens.push({ type: 'num', card: i, value: this.nums[i] });
            this.used[i] = true;
            A.sound.play('click');
            this.paint();
          } else {
            A.sound.play('hit');
            this.flashBad();
          }
        },

        addOp(v) {
          const s = this.stateOf();
          if (s.ok && s.expect === false) {
            this.tokens.push({ type: 'op', v });
            A.sound.play('click');
            this.paint();
          } else this.flashBad();
        },

        addParen(left) {
          const s = this.stateOf();
          if (s.ok && (left ? s.expect === true : (s.expect === false && s.depth > 0))) {
            this.tokens.push({ type: left ? 'lp' : 'rp' });
            A.sound.play('click');
            this.paint();
          } else this.flashBad();
        },

        backspace() {
          if (!this.tokens.length) return;
          this.tokens.pop();
          this.refreshUsed();
          A.sound.play('move');
          this.paint();
        },

        clearTokens() {
          this.tokens = [];
          this.used = [false, false, false, false];
          this.exprEl.classList.remove('p24-bad', 'p24-good');
          this.paint();
        },

        /* 递归下降解析 token，结果用有理数表示，全程无 eval */
        evaluate() {
          let pos = 0;
          let bad = false;
          const tokens = this.tokens;
          function factor() {
            const t = tokens[pos];
            if (!t) { bad = true; return rat(0, 1); }
            if (t.type === 'num') { pos++; return rat(t.value, 1); }
            if (t.type === 'lp') {
              pos++;
              const v = expr();
              if (tokens[pos] && tokens[pos].type === 'rp') pos++;
              else bad = true;
              return v;
            }
            bad = true;
            pos++;
            return rat(0, 1);
          }
          function term() {
            let v = factor();
            while (pos < tokens.length && tokens[pos].type === 'op' && (tokens[pos].v === '*' || tokens[pos].v === '/')) {
              const op = tokens[pos].v; pos++;
              const r = factor();
              const nv = op === '*' ? mul(v, r) : div(v, r);
              if (!nv) bad = true;
              v = nv || rat(0, 1);
            }
            return v;
          }
          function expr() {
            let v = term();
            while (pos < tokens.length && tokens[pos].type === 'op' && (tokens[pos].v === '+' || tokens[pos].v === '-')) {
              const op = tokens[pos].v; pos++;
              const r = term();
              v = op === '+' ? add(v, r) : sub(v, r);
            }
            return v;
          }
          const result = expr();
          if (bad || pos !== tokens.length) return null;
          return result;
        },

        submit() {
          if (ctx.state !== 'playing') return;
          const s = this.stateOf();
          if (!s.ok || !s.expect || s.depth !== 0 || this.used.some((u) => !u)) {
            A.sound.play('hit');
            ctx.showToast('请完整使用四张牌并保持括号配对');
            this.flashBad();
            return;
          }
          const value = this.evaluate();
          if (!value) {
            A.sound.play('hit');
            ctx.showToast('表达式无效或除数为零');
            this.flashBad();
            return;
          }
          if (value.n === 24 * value.d) {
            const remain = ctx.timeLimit > 0 ? Math.max(0, ctx.timeLimit - ctx.elapsed) : 0;
            const timeBonus = Math.round(remain * (0.4 + ctx.speed / 12));
            ctx.addScore(500 + timeBonus);
            this.correct++;
            A.sound.play('success');
            this.exprEl.classList.remove('p24-bad');
            this.exprEl.classList.add('p24-good');
            this.updateBar();
            if (this.level >= LEVEL_COUNT) {
              ctx.gameOver('速算达人', true);
              return;
            }
            this.level++;
            ctx.setLevel(this.level);
            ctx.showToast('答对！进入第 ' + this.level + ' 题  +' + (500 + timeBonus));
            this.newQuestion();
          } else {
            ctx.addScore(-50);
            A.sound.play('hit');
            this.flashBad();
            ctx.showToast('结果是 ' + (Math.round(value.n / value.d * 100) / 100) + '，不是 24');
            this.clearTokens();
          }
        },

        hint() {
          if (ctx.state !== 'playing') return;
          ctx.addScore(-100);
          A.sound.play('click');
          ctx.showToast('参考解法：' + this.solution);
        },

        onTimeUp() {
          this.clearTokens();
          A.sound.play('fail');
        },

        flashBad() {
          this.exprEl.classList.remove('p24-bad');
          void this.exprEl.offsetWidth;
          this.exprEl.classList.add('p24-bad');
        },

        paint() {
          let text = '';
          this.tokens.forEach((t) => {
            if (t.type === 'num') text += t.value;
            else if (t.type === 'op') text += ' ' + t.v + ' ';
            else if (t.type === 'lp') text += '(';
            else text += ')';
          });
          this.exprText.textContent = '= ' + text;
          this.cardEls.forEach((el, i) => el.classList.toggle('p24-used', !!this.used[i]));
        },

        updateBar() {
          if (this.levelEl) this.levelEl.textContent = this.level;
          if (this.correctEl) this.correctEl.textContent = this.correct;
        },

        render() {
          this.updateBar();
        },
      };
      return game;
    },
  });
})();
