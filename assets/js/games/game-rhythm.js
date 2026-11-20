/* 节奏点击：四轨下落式节奏游戏，判定基于时间差而非帧数 */
(function () {
  const A = window.Arcade;
  A.registerRuntime('rhythm', {
    create(ctx) {
      const W = 640, H = 560;
      const LANES = 4, LW = 96;
      const LX = (W - LANES * LW) / 2;
      const JUDGE = H - 96;
      const FALL = 340; // 音符下落速度（像素/秒）
      const KEYS = ['d', 'f', 'j', 'k'];
      const COLORS = ['#5ad1ff', '#9d8bff', '#ff7ec1', '#ffcf5a'];

      const game = {
        init() {
          ctx.makeCanvas(W, H);
          this.canvas = ctx.canvas;
          this.g = ctx.g;

          // 把画布放进包装层，并在底部追加移动端四键
          const wrap = document.createElement('div');
          wrap.className = 'rhy-wrap';
          ctx.stage.appendChild(wrap);
          wrap.appendChild(this.canvas);
          const pad = document.createElement('div');
          pad.className = 'rhy-pad';
          this.padBtns = [];
          for (let i = 0; i < LANES; i++) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'rhy-key';
            b.style.setProperty('--kc', COLORS[i]);
            b.textContent = KEYS[i].toUpperCase();
            const fire = (e) => {
              if (ctx.state !== 'playing') return;
              e.preventDefault();
              this.judgeLane(i);
            };
            b.addEventListener('pointerdown', fire);
            pad.appendChild(b);
            this.padBtns.push(b);
          }
          wrap.appendChild(pad);

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            if (e.repeat) return;
            const idx = KEYS.indexOf(e.key.toLowerCase());
            if (idx >= 0) {
              e.preventDefault();
              this.judgeLane(idx);
            }
          });

          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            e.preventDefault();
            const p = ctx.pointerPos(e);
            const idx = Math.floor((p.x - LX) / LW);
            if (idx >= 0 && idx < LANES) this.judgeLane(idx);
          });

          this.injectStyle();
        },

        injectStyle() {
          if (document.getElementById('rhy-style')) return;
          const s = document.createElement('style');
          s.id = 'rhy-style';
          s.textContent = [
            '.rhy-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;}',
            '.rhy-pad{display:flex;gap:10px;justify-content:center;}',
            '.rhy-key{width:74px;height:46px;border-radius:11px;font-weight:900;font-size:16px;',
            'border:2px solid var(--kc,#9d8bff);background:#1d1733;color:var(--kc,#fff);',
            'box-shadow:0 4px 0 rgba(0,0,0,.38),inset 0 0 12px rgba(255,255,255,.05);',
            'touch-action:none;cursor:pointer;transition:transform .06s,background .12s,box-shadow .06s;}',
            '.rhy-key:hover{background:#2a2148;}',
            '.rhy-key:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.38);}',
            '@media(max-width:720px){.rhy-key{width:64px;height:44px;font-size:15px;}}',
          ].join('\n');
          document.head.appendChild(s);
        },

        onStart() {
          this.notes = this.buildChart();
          this.songT = 0;
          this.combo = 0;
          this.maxCombo = 0;
          this.perfect = 0;
          this.great = 0;
          this.good = 0;
          this.miss = 0;
          this.judgeFx = { text: '', color: '', life: 0 };
          this.flash = [0, 0, 0, 0];
          this.levelNow = 1;
          this.finished = false;
          this.pulse = 0;
          this.render();
        },

        buildChart() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          const baseBpm = 96 + ctx.speed * 7 + (d.speedFactor - 1) * 46;
          this.chartBpm = baseBpm;
          const notes = [];
          let t = 2.2;
          let lastLane = -1;
          const total = 60;
          for (let i = 0; i < total; i++) {
            const lv = Math.floor(i / 20) + 1;
            const beat = 60 / (baseBpm * (1 + (lv - 1) * 0.13));
            let lane = A.util.randInt(0, LANES - 1);
            if (lane === lastLane && Math.random() < 0.7) lane = (lane + 1 + A.util.randInt(0, 2)) % LANES;
            notes.push({ lane: lane, time: t, judged: false });
            lastLane = lane;
            let step = beat * A.util.choice([1, 1, 1, 1, 0.5, 2]);
            if (lv > 1 && Math.random() < 0.12) step = beat * 0.5;
            t += Math.max(0.16, step);
          }
          return notes;
        },

        windows() {
          const f = ctx.difficulty === 'easy' ? 1.35 : (ctx.difficulty === 'hard' ? 0.75 : 1);
          return { perfect: 0.055 * f, great: 0.11 * f, good: 0.18 * f };
        },

        setJudge(text, color) {
          this.judgeFx = { text: text, color: color, life: 0.65 };
        },

        judgedCount() {
          return (this.perfect || 0) + (this.great || 0) + (this.good || 0) + (this.miss || 0);
        },

        accuracy() {
          const total = this.judgedCount();
          if (!total) return 0;
          return Math.round(((this.perfect + this.great * 0.7 + this.good * 0.4) / total) * 100);
        },

        judgeLane(i) {
          if (ctx.state !== 'playing' || !this.notes) return;
          this.flash[i] = 0.16;
          const w = this.windows();
          let best = null;
          let bestDiff = Infinity;
          for (const n of this.notes) {
            if (n.judged || n.lane !== i) continue;
            const diff = Math.abs(n.time - this.songT);
            if (diff < bestDiff) {
              bestDiff = diff;
              best = n;
            }
          }
          if (!best || bestDiff > w.good) {
            this.setJudge('空击', '#8b90a8');
            return;
          }

          best.judged = true;
          let baseScore;
          let name;
          let color;
          if (bestDiff <= w.perfect) {
            baseScore = 300; name = 'PERFECT'; color = '#7df0ff'; this.perfect++;
          } else if (bestDiff <= w.great) {
            baseScore = 200; name = 'GREAT'; color = '#8ef0a0'; this.great++;
          } else {
            baseScore = 100; name = 'GOOD'; color = '#ffd45e'; this.good++;
          }
          this.combo++;
          if (this.combo > this.maxCombo) this.maxCombo = this.combo;
          const mult = Math.min(1 + Math.floor(this.combo / 8), 4);
          ctx.addScore(baseScore * mult);
          A.sound.play(name === 'PERFECT' ? 'success' : 'click');
          this.setJudge(name + (mult > 1 ? '  x' + mult : ''), color);
          this.render();
        },

        onTick(dt) {
          if (!this.notes) return;
          this.songT += dt;
          const w = this.windows();

          for (const n of this.notes) {
            if (!n.judged && this.songT - n.time > w.good) {
              n.judged = true;
              this.miss++;
              this.combo = 0;
              this.setJudge('MISS', '#ff6b7a');
              A.sound.play('hit');
            }
          }

          const lv = Math.min(3, Math.floor(this.judgedCount() / 20) + 1);
          if (lv > this.levelNow) {
            this.levelNow = lv;
            ctx.setLevel(lv);
            ctx.showToast('进入第 ' + lv + ' 段');
            A.sound.play('level');
          }

          if (this.judgeFx.life > 0) this.judgeFx.life -= dt;
          for (let i = 0; i < LANES; i++) {
            if (this.flash[i] > 0) this.flash[i] -= dt;
          }
          const beat = 60 / this.chartBpm;
          this.pulse = Math.max(0, 1 - ((this.songT % beat) / beat) * 3);

          const last = this.notes[this.notes.length - 1];
          if (!this.finished && this.judgedCount() === this.notes.length && this.songT > last.time + 1.4) {
            this.finished = true;
            const acc = this.accuracy();
            ctx.gameOver(acc >= 90 ? '节奏大师' : (acc >= 70 ? '表现出色' : '完成演奏'), acc >= 70);
            this.render();
            return;
          }
          this.render();
        },

        onEnd() {
          this.flash = [0, 0, 0, 0];
        },

        render() {
          if (!this.g || !this.notes) return;
          const g = this.g;
          g.fillStyle = '#120d24';
          g.fillRect(0, 0, W, H);

          const glow = this.pulse || 0;
          const bg = g.createRadialGradient(W / 2, JUDGE, 40, W / 2, JUDGE, W * 0.7);
          bg.addColorStop(0, 'rgba(216,86,155,' + (0.1 + glow * 0.16) + ')');
          bg.addColorStop(1, 'rgba(216,86,155,0)');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);

          for (let i = 0; i < LANES; i++) {
            const x = LX + i * LW;
            g.fillStyle = i % 2 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.045)';
            g.fillRect(x, 0, LW, JUDGE + 40);
            g.strokeStyle = 'rgba(255,255,255,.06)';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(x, 0);
            g.lineTo(x, JUDGE + 40);
            g.stroke();
            if (this.flash && this.flash[i] > 0) {
              g.fillStyle = hexA(COLORS[i], Math.min(0.35, this.flash[i] * 2));
              g.fillRect(x, 0, LW, JUDGE + 40);
            }
          }

          g.fillStyle = 'rgba(216,86,155,.55)';
          g.fillRect(LX, JUDGE - 2, LANES * LW, 4);
          g.strokeStyle = 'rgba(255,255,255,.75)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(LX, JUDGE);
          g.lineTo(LX + LANES * LW, JUDGE);
          g.stroke();

          for (let i = 0; i < LANES; i++) {
            const x = LX + i * LW;
            g.fillStyle = hexA(COLORS[i], (this.flash && this.flash[i] > 0) ? 0.5 : 0.18);
            roundRect(g, x + 6, JUDGE + 10, LW - 12, 44, 8);
            g.fill();
            g.fillStyle = '#fff';
            g.font = 'bold 16px system-ui, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'alphabetic';
            g.fillText(KEYS[i].toUpperCase(), x + LW / 2, JUDGE + 39);
          }

          for (const n of this.notes) {
            if (n.judged) continue;
            const y = JUDGE + (this.songT - n.time) * FALL;
            if (y < -40 || y > H + 40) continue;
            const x = LX + n.lane * LW + 8;
            const grd = g.createLinearGradient(0, y - 14, 0, y + 14);
            grd.addColorStop(0, '#ffffff');
            grd.addColorStop(1, COLORS[n.lane]);
            g.fillStyle = grd;
            roundRect(g, x, y - 12, LW - 16, 24, 7);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,.55)';
            g.fillRect(x + 6, y - 8, LW - 28, 3);
          }

          if (this.judgeFx && this.judgeFx.life > 0) {
            g.globalAlpha = Math.min(1, this.judgeFx.life * 2.2);
            g.fillStyle = this.judgeFx.color;
            g.font = 'bold 26px system-ui, sans-serif';
            g.textAlign = 'center';
            g.fillText(this.judgeFx.text, W / 2, JUDGE - 70);
            g.globalAlpha = 1;
          }

          if (this.combo > 1) {
            g.fillStyle = '#fff';
            g.font = 'bold 18px system-ui, sans-serif';
            g.textAlign = 'left';
            g.fillText('COMBO ' + this.combo, 20, 34);
          }
          g.fillStyle = 'rgba(255,255,255,.5)';
          g.font = '12px system-ui, sans-serif';
          g.textAlign = 'right';
          g.fillText(this.judgedCount() + ' / ' + this.notes.length, W - 20, 32);
        },
      };

      function hexA(hex, a) {
        const n = parseInt(hex.slice(1), 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
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
