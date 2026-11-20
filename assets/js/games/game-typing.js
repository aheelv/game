/* 打字速战：Canvas 下落单词 + 输入框，前缀匹配消除，统计 WPM 与准确率 */
(function () {
  const A = window.Arcade;
  A.registerRuntime('typing', {
    create(ctx) {
      const W = 760, H = 540;
      const BANK = {
        short: ['cat', 'dog', 'sun', 'map', 'key', 'ice', 'joy', 'run', 'sky', 'pen', 'box', 'fox', 'gem', 'art', 'hit', 'lab', 'owl', 'cup', 'web', 'tip'],
        medium: ['apple', 'brave', 'cloud', 'dream', 'flame', 'harbor', 'island', 'jungle', 'lemon', 'metal', 'night', 'ocean', 'piano', 'river', 'stone', 'tiger', 'unity', 'vivid', 'water', 'youth'],
        long: ['adventure', 'balanced', 'challenge', 'dolphin', 'electrical', 'fantastic', 'gallery', 'harmony', 'inspire', 'journey', 'keyboard', 'landscape', 'mystery', 'notebook', 'overcome', 'puzzle', 'quality', 'rhythm', 'stadium', 'together'],
      };

      const game = {
        init() {
          ctx.makeCanvas(W, H);
          this.canvas = ctx.canvas;
          this.g = ctx.g;

          const wrap = document.createElement('div');
          wrap.className = 'typ-wrap';
          ctx.stage.appendChild(wrap);
          wrap.appendChild(this.canvas);

          const bar = document.createElement('div');
          bar.className = 'typ-bar';
          this.input = document.createElement('input');
          this.input.type = 'text';
          this.input.className = 'typ-input';
          this.input.autocomplete = 'off';
          this.input.autocapitalize = 'off';
          this.input.autocorrect = 'off';
          this.input.spellcheck = false;
          this.input.placeholder = '在此输入字母，回车可放弃当前单词';
          const hint = document.createElement('span');
          hint.className = 'typ-hint';
          hint.textContent = '移动端点输入框唤起键盘';
          bar.appendChild(this.input);
          bar.appendChild(hint);
          wrap.appendChild(bar);

          this.canvas.addEventListener('pointerdown', () => {
            if (ctx.state !== 'playing') return;
            this.focusInput();
          });
          this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              this.resetTarget();
              return;
            }
            if (e.key === 'Escape') return; // 交给基类处理暂停
            if (e.key.length === 1) e.stopPropagation(); // 防止字母 p 触发基类暂停
          });
          this.input.addEventListener('input', () => this.onInput());

          this.injectStyle();
        },

        injectStyle() {
          if (document.getElementById('typ-style')) return;
          const s = document.createElement('style');
          s.id = 'typ-style';
          s.textContent = [
            '.typ-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;width:100%;}',
            '.typ-bar{display:flex;align-items:center;gap:10px;width:100%;max-width:760px;}',
            '.typ-input{flex:1;min-width:0;border:2px solid #3a6a8f;background:#0f1a28;color:#eaf4ff;',
            'border-radius:11px;padding:11px 14px;font-size:16px;letter-spacing:2px;font-weight:700;',
            'outline:none;transition:border-color .15s,box-shadow .15s;}',
            '.typ-input:focus{border-color:#7fd4ff;box-shadow:0 0 0 3px rgba(127,212,255,.18);}',
            '.typ-input::placeholder{color:#5f788c;letter-spacing:0;font-weight:400;font-size:13px;}',
            '.typ-hint{font-size:11px;color:#8fa6b8;white-space:nowrap;}',
            '@media(max-width:720px){.typ-bar{flex-direction:column;align-items:stretch;}.typ-hint{text-align:center;}}',
          ].join('\n');
          document.head.appendChild(s);
        },

        focusInput() {
          try { this.input.focus(); } catch (e) { /* 忽略聚焦失败 */ }
        },

        onStart() {
          this.words = [];
          this.popups = [];
          this.buffer = '';
          this.target = null;
          this.combo = 0;
          this.lives = ctx.difficulty === 'easy' ? 4 : (ctx.difficulty === 'hard' ? 2 : 3);
          this.maxLives = this.lives;
          this.wordsDone = 0;
          this.correctChars = 0;
          this.typedTotal = 0;
          this.levelNow = 1;
          this.spawnCd = 0.6;
          this.shake = 0;
          this.flashRed = 0;
          this.ended = false;
          this.goal = Math.round(24 * (A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal).countFactor);
          this.input.value = '';
          this.focusInput();
          this.render();
        },

        onPause() {
          try { this.input.blur(); } catch (e) { /* 忽略 */ }
        },

        onResume() {
          this.focusInput();
        },

        resetTarget() {
          this.buffer = '';
          this.target = null;
          this.input.value = '';
        },

        registerError() {
          this.combo = 0;
          this.flashRed = 0.25;
          A.sound.play('hit');
        },

        onInput() {
          if (ctx.state !== 'playing') {
            this.input.value = '';
            return;
          }
          const v = this.input.value;
          if (v.length > this.buffer.length) {
            const added = v.slice(this.buffer.length).toUpperCase();
            for (const ch of added) {
              if (/^[A-Z]$/.test(ch)) this.typeChar(ch);
            }
          } else if (v.length < this.buffer.length) {
            const times = this.buffer.length - v.length;
            for (let i = 0; i < times; i++) this.backspace();
          }
          this.input.value = this.buffer;
          this.render();
        },

        typeChar(ch) {
          this.typedTotal++;
          if (!this.target) {
            const cands = this.words.filter((w) => !w.dead && w.text[0] === ch);
            if (!cands.length) {
              this.registerError();
              return;
            }
            cands.sort((a, b) => b.y - a.y); // 优先锁定最靠近底部的词
            this.target = cands[0];
            this.buffer = ch;
            this.correctChars++;
            if (this.buffer === this.target.text) this.completeWord();
            return;
          }
          const expected = this.target.text[this.buffer.length];
          if (ch === expected) {
            this.buffer += ch;
            this.correctChars++;
            if (this.buffer === this.target.text) this.completeWord();
          } else {
            this.registerError();
          }
        },

        backspace() {
          if (!this.buffer) return;
          this.buffer = this.buffer.slice(0, -1);
          if (!this.buffer) this.target = null;
        },

        completeWord() {
          const w = this.target;
          if (!w) return;
          w.dead = true;
          this.combo++;
          this.wordsDone++;
          const mult = Math.min(1 + Math.floor(this.combo / 3), 3);
          const pts = (w.text.length * 10 + (w.text.length - 3) * 5) * mult;
          ctx.addScore(pts);
          A.sound.play('success');
          this.popups.push({ x: w.x + w.width / 2, y: w.y, text: '+' + pts, life: 0.85 });
          this.resetTarget();
          const lv = Math.floor(this.wordsDone / 8) + 1;
          if (lv > this.levelNow) {
            this.levelNow = lv;
            ctx.setLevel(lv);
            ctx.showToast('词汇升级！');
            A.sound.play('level');
          }
        },

        wordSpeed() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          return (40 + ctx.speed * 6) * d.speedFactor * (1 + (this.levelNow - 1) * 0.08);
        },

        spawnWord() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          const longP = Math.min(0.15 + this.levelNow * 0.12 + ctx.speed * 0.02, 0.6) * d.countFactor;
          const roll = Math.random();
          let pool;
          if (roll < longP) pool = BANK.long;
          else if (roll < longP + 0.45) pool = BANK.medium;
          else pool = BANK.short;
          const text = A.util.choice(pool).toUpperCase();
          this.g.font = 'bold 22px system-ui, sans-serif';
          const tw = this.g.measureText(text).width;
          const w = {
            text: text,
            width: tw + 28,
            x: A.util.rand(20, Math.max(20, W - tw - 48)),
            y: -30,
            speed: this.wordSpeed() * A.util.rand(0.85, 1.15),
            dead: false,
          };
          this.words.push(w);
        },

        onTick(dt) {
          if (!this.words) return;
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;

          this.spawnCd -= dt;
          if (this.spawnCd <= 0) {
            this.spawnWord();
            this.spawnCd = Math.max(0.7, A.util.rand(1.5, 2.5) / (d.countFactor * (0.7 + ctx.speed / 12)));
          }

          for (let i = this.words.length - 1; i >= 0; i--) {
            const w = this.words[i];
            if (w.dead) {
              this.words.splice(i, 1);
              continue;
            }
            w.y += w.speed * dt;
            if (w.y >= H - 26) {
              this.words.splice(i, 1);
              if (this.target === w) this.resetTarget();
              this.lives--;
              this.combo = 0;
              this.shake = 0.3;
              A.sound.play('fail');
              ctx.showToast('单词漏掉了！剩余生命 ' + Math.max(0, this.lives));
              if (this.lives <= 0) {
                ctx.gameOver('生命耗尽', false);
                this.render();
                return;
              }
            }
          }

          for (let i = this.popups.length - 1; i >= 0; i--) {
            this.popups[i].life -= dt;
            this.popups[i].y -= 28 * dt;
            if (this.popups[i].life <= 0) this.popups.splice(i, 1);
          }
          if (this.shake > 0) this.shake -= dt;
          if (this.flashRed > 0) this.flashRed -= dt;

          if (!this.ended && this.wordsDone >= this.goal) {
            this.ended = true;
            ctx.gameOver('打字达人', true);
            this.render();
            return;
          }
          this.render();
        },

        onEnd() {
          try { this.input.blur(); } catch (e) { /* 忽略 */ }
        },

        render() {
          if (!this.g || !this.words) return;
          const g = this.g;
          g.save();
          if (this.shake > 0) g.translate(A.util.rand(-4, 4), A.util.rand(-3, 3));

          const grad = g.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#122034');
          grad.addColorStop(1, '#0a1420');
          g.fillStyle = grad;
          g.fillRect(0, 0, W, H);

          g.strokeStyle = 'rgba(120,180,220,.05)';
          g.lineWidth = 1;
          for (let x = 0; x < W; x += 40) {
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, H);
            g.stroke();
          }
          for (let y = 0; y < H; y += 40) {
            g.beginPath();
            g.moveTo(0, y);
            g.lineTo(W, y);
            g.stroke();
          }

          if (this.flashRed > 0) {
            g.fillStyle = 'rgba(255,80,100,' + (this.flashRed * 0.5) + ')';
            g.fillRect(0, 0, W, H);
          }

          g.fillStyle = 'rgba(255,90,110,.7)';
          g.fillRect(0, H - 24, W, 2);
          g.fillStyle = 'rgba(255,90,110,.08)';
          g.fillRect(0, H - 24, W, 24);

          g.font = 'bold 22px system-ui, sans-serif';
          g.textAlign = 'left';
          g.textBaseline = 'middle';
          for (const w of this.words) {
            if (w.dead) continue;
            const isTarget = w === this.target;
            g.fillStyle = isTarget ? 'rgba(45,92,124,.95)' : 'rgba(28,46,66,.92)';
            roundRect(g, w.x, w.y - 18, w.width, 36, 9);
            g.fill();
            g.strokeStyle = isTarget ? '#7fd4ff' : 'rgba(120,170,210,.35)';
            g.lineWidth = isTarget ? 2 : 1;
            g.stroke();
            const typed = isTarget ? this.buffer : '';
            if (typed) {
              g.fillStyle = '#8ef0c0';
              g.fillText(typed, w.x + 14, w.y);
              const tw = g.measureText(typed).width;
              g.fillStyle = '#eaf4ff';
              g.fillText(w.text.slice(typed.length), w.x + 14 + tw, w.y);
            } else {
              g.fillStyle = '#eaf4ff';
              g.fillText(w.text, w.x + 14, w.y);
            }
          }

          for (const p of this.popups) {
            g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
            g.fillStyle = '#8ef0c0';
            g.font = 'bold 18px system-ui, sans-serif';
            g.textAlign = 'center';
            g.fillText(p.text, p.x, p.y);
            g.globalAlpha = 1;
          }
          g.restore();

          const mins = Math.max(ctx.elapsed, 0.1) / 60;
          const wpm = Math.round((this.correctChars / 5) / mins);
          const acc = this.typedTotal ? Math.round((this.correctChars / this.typedTotal) * 100) : 100;
          g.fillStyle = 'rgba(255,255,255,.82)';
          g.font = 'bold 13px system-ui, sans-serif';
          g.textBaseline = 'top';
          g.textAlign = 'left';
          g.fillText('生命 ' + Math.max(0, this.lives) + '/' + this.maxLives + '   WPM ' + wpm + '   准确率 ' + acc + '%', 16, 14);
          g.textAlign = 'right';
          g.fillText('进度 ' + this.wordsDone + '/' + this.goal + '   连击 x' + Math.min(1 + Math.floor(this.combo / 3), 3), W - 16, 14);
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
