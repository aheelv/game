/* 猜数字 Mastermind：四位不重复密码、A/B 反馈、历史记录、次数限制、键盘与面板输入 */
(function () {
  const A = window.Arcade;
  let cssAdded = false;

  function ensureCss() {
    if (cssAdded) return;
    cssAdded = true;
    const style = document.createElement('style');
    style.textContent = [
      '.mmd-wrap{width:100%;max-width:520px;margin:0 auto;user-select:none;-webkit-user-select:none}',
      '.mmd-bar{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;color:#9aa4d6;font-weight:700}',
      '.mmd-bar b{color:#eef1ff;font-variant-numeric:tabular-nums}',
      '.mmd-slots{display:flex;gap:10px;justify-content:center;margin:6px 0 14px}',
      '.mmd-slot{width:52px;height:60px;border-radius:10px;background:#1b2140;border:2px solid #3b4268;display:grid;place-items:center;font-size:30px;font-weight:900;color:#eef1ff;box-shadow:inset 0 2px 8px rgba(0,0,0,.25)}',
      '.mmd-slot.mmd-on{border-color:#6d9bff;color:#a8ccff}',
      '.mmd-keys{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}',
      '.mmd-keys button{padding:11px 0;border:1px solid #3b4268;border-radius:10px;background:#2a3157;color:#eef1ff;font-size:18px;font-weight:800;cursor:pointer;transition:transform .1s ease,filter .15s ease,background .15s ease}',
      '.mmd-keys button:hover{filter:brightness(1.25);background:#343d6b}',
      '.mmd-keys button:active{transform:translateY(2px)}',
      '.mmd-keys button.mmd-ok{background:#2f7d5b;border-color:#54c98c}',
      '.mmd-keys button.mmd-del{background:#5a3550;border-color:#b06a92}',
      '.mmd-history{max-height:250px;overflow:auto;background:#151a31;border:1px solid #2f3659;border-radius:12px;padding:8px}',
      '.mmd-empty{text-align:center;color:#66709f;font-size:12px;padding:18px 0}',
      '.mmd-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 9px;border-bottom:1px solid #262d4d;animation:mmd-in .25s ease-out}',
      '.mmd-row:last-child{border-bottom:0}',
      '.mmd-guess{font-family:ui-monospace,Consolas,monospace;font-size:20px;font-weight:800;letter-spacing:6px;color:#eef1ff}',
      '.mmd-fb{display:flex;gap:5px;align-items:center}',
      '.mmd-dot{width:13px;height:13px;border-radius:50%;border:2px solid #4a527f;background:transparent}',
      '.mmd-dot.mmd-a{background:#ffb454;border-color:#ffb454;box-shadow:0 0 8px rgba(255,180,84,.5)}',
      '.mmd-dot.mmd-b{background:transparent;border-color:#7fc4ff;box-shadow:0 0 6px rgba(127,196,255,.4)}',
      '.mmd-fbtext{font-size:12px;color:#9aa4d6;font-weight:800;margin-left:6px;min-width:42px;text-align:right}',
      '.mmd-row.mmd-win{background:#1f4034;border-radius:8px}',
      '.mmd-row.mmd-lose{background:#452634;border-radius:8px}',
      '@keyframes mmd-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}',
      '.mmd-head{display:flex;justify-content:space-between;font-size:11px;color:#7f89bd;font-weight:700;padding:2px 9px 6px}',
    ].join('\n');
    document.head.appendChild(style);
  }

  A.registerRuntime('mastermind', {
    create(ctx) {
      const LEVEL_COUNT = (ctx.meta && ctx.meta.defaultParams && ctx.meta.defaultParams.levelCount) || 3;

      const game = {
        init() {
          ensureCss();
          ctx.stage.innerHTML = [
            '<div class="mmd-wrap">',
            '  <div class="mmd-bar"><span>关卡 <b class="mmd-level">1</b></span><span>剩余次数 <b class="mmd-left">0</b></span><span>已猜 <b class="mmd-count">0</b></span></div>',
            '  <div class="mmd-slots"></div>',
            '  <div class="mmd-keys"></div>',
            '  <div class="mmd-history"><div class="mmd-head"><span>猜测</span><span>反馈（橙=位置对，蓝=数字对位置错）</span></div><div class="mmd-list"></div></div>',
            '</div>',
          ].join('');
          this.slotsEl = ctx.stage.querySelector('.mmd-slots');
          this.keysEl = ctx.stage.querySelector('.mmd-keys');
          this.listEl = ctx.stage.querySelector('.mmd-list');
          this.levelEl = ctx.stage.querySelector('.mmd-level');
          this.leftEl = ctx.stage.querySelector('.mmd-left');
          this.countEl = ctx.stage.querySelector('.mmd-count');

          this.keysEl.addEventListener('click', (e) => {
            if (ctx.state !== 'playing') return;
            const btn = e.target.closest('button');
            if (!btn) return;
            const a = btn.dataset.act;
            if (/^[0-9]$/.test(a)) this.pushDigit(Number(a));
            else if (a === 'back') this.backspace();
            else if (a === 'submit') this.submit();
          });

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            if (/^[0-9]$/.test(k)) { e.preventDefault(); this.pushDigit(Number(k)); }
            else if (k === 'backspace') { e.preventDefault(); this.backspace(); }
            else if (k === 'enter') { e.preventDefault(); this.submit(); }
          });
        },

        config() {
          let base = 10;
          if (ctx.difficulty === 'easy') base = 12;
          else if (ctx.difficulty === 'hard') base = 8;
          const attempts = Math.max(5, base - Math.floor((ctx.speed - 5) / 3));
          return { attempts };
        },

        onStart() {
          this.level = 1;
          ctx.setLevel(1);
          this.setupLevel();
        },

        setupLevel() {
          const cfg = this.config();
          this.maxAttempts = cfg.attempts;
          this.attemptsLeft = cfg.attempts;
          this.guessCount = 0;
          this.input = [];
          this.history = [];
          this.secret = this.makeSecret();
          this.buildKeys();
          this.renderSlots();
          this.renderHistory();
          this.updateBar();
        },

        makeSecret() {
          const digits = A.util.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
          if (digits[0] === 0) {
            const i = digits.findIndex((d) => d !== 0);
            const t = digits[0]; digits[0] = digits[i]; digits[i] = t;
          }
          return digits.slice(0, 4);
        },

        buildKeys() {
          let html = '';
          for (let d = 0; d <= 9; d++) html += '<button data-act="' + d + '">' + d + '</button>';
          html += '<button class="mmd-del" data-act="back">退格</button>';
          html += '<button class="mmd-ok" data-act="submit">提交</button>';
          this.keysEl.innerHTML = html;
        },

        pushDigit(d) {
          if (this.input.length >= 4) return;
          this.input.push(d);
          A.sound.play('click');
          this.renderSlots();
        },

        backspace() {
          if (!this.input.length) return;
          this.input.pop();
          A.sound.play('move');
          this.renderSlots();
        },

        /* 计算 A（数字与位置都对）与 B（数字对但位置错） */
        feedback(guess) {
          let a = 0;
          const cntG = {}, cntS = {};
          for (let i = 0; i < 4; i++) {
            if (guess[i] === this.secret[i]) a++;
            cntG[guess[i]] = (cntG[guess[i]] || 0) + 1;
            cntS[this.secret[i]] = (cntS[this.secret[i]] || 0) + 1;
          }
          let common = 0;
          Object.keys(cntG).forEach((k) => { common += Math.min(cntG[k], cntS[k] || 0); });
          return { a, b: common - a };
        },

        submit() {
          if (ctx.state !== 'playing' || this.input.length !== 4) {
            ctx.showToast('请输入 4 位数字');
            A.sound.play('hit');
            return;
          }
          const guess = this.input.slice();
          const fb = this.feedback(guess);
          this.guessCount++;
          this.attemptsLeft--;
          ctx.addScore(-50);
          this.history.push({ guess, a: fb.a, b: fb.b });

          if (fb.a === 4) {
            this.history[this.history.length - 1].win = true;
            this.renderHistory();
            this.renderSlots();
            const bonus = 1000 + this.attemptsLeft * 100;
            ctx.addScore(bonus);
            A.sound.play('success');
            this.updateBar();
            ctx.showToast('破解成功  +' + bonus);
            if (this.level >= LEVEL_COUNT) {
              ctx.gameOver('密码破解大师', true);
              return;
            }
            this.level++;
            ctx.setLevel(this.level);
            this.setupLevel();
            return;
          }

          A.sound.play('place');
          this.input = [];
          this.renderSlots();
          this.renderHistory();
          this.updateBar();
          if (this.attemptsLeft <= 0) {
            this.history.push({ guess: this.secret.slice(), reveal: true });
            this.renderHistory();
            A.sound.play('fail');
            ctx.gameOver('次数用尽，答案是 ' + this.secret.join(''), false);
          }
        },

        renderSlots() {
          let html = '';
          for (let i = 0; i < 4; i++) {
            const v = this.input[i];
            html += '<div class="mmd-slot' + (v !== undefined ? ' mmd-on' : '') + '">' + (v !== undefined ? v : '') + '</div>';
          }
          this.slotsEl.innerHTML = html;
        },

        renderHistory() {
          if (!this.history.length) {
            this.listEl.innerHTML = '<div class="mmd-empty">还没有猜测记录，输入四位数字开始推理</div>';
            return;
          }
          this.listEl.innerHTML = this.history.map((h) => {
            if (h.reveal) {
              return '<div class="mmd-row mmd-lose"><span class="mmd-guess">' + h.guess.join('') + '</span>' +
                '<span class="mmd-fbtext">正确答案</span></div>';
            }
            let dots = '';
            for (let i = 0; i < h.a; i++) dots += '<span class="mmd-dot mmd-a"></span>';
            for (let i = 0; i < h.b; i++) dots += '<span class="mmd-dot mmd-b"></span>';
            for (let i = 0; i < 4 - h.a - h.b; i++) dots += '<span class="mmd-dot"></span>';
            const cls = h.win ? ' mmd-win' : '';
            return '<div class="mmd-row' + cls + '"><span class="mmd-guess">' + h.guess.join('') + '</span>' +
              '<span class="mmd-fb">' + dots + '<span class="mmd-fbtext">' + h.a + 'A' + h.b + 'B</span></span></div>';
          }).join('');
          this.listEl.scrollTop = this.listEl.scrollHeight;
        },

        updateBar() {
          if (this.levelEl) this.levelEl.textContent = this.level + ' / ' + LEVEL_COUNT;
          if (this.leftEl) this.leftEl.textContent = this.attemptsLeft;
          if (this.countEl) this.countEl.textContent = this.guessCount;
        },

        render() {
          this.updateBar();
        },
      };
      return game;
    },
  });
})();
