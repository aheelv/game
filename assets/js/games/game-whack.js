/* 打地鼠：DOM 九宫格反应游戏，普通/金色/陷阱目标与连击 */
(function () {
  const A = window.Arcade;
  A.registerRuntime('whack', {
    create(ctx) {
      const game = {
        init() {
          this.injectStyle();
          this.buildBoard();
          ctx.stage.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            const hole = e.target.closest('.whack-hole');
            if (!hole) return;
            e.preventDefault();
            this.hit(Number(hole.dataset.i));
          });
        },

        injectStyle() {
          if (document.getElementById('whack-style')) return;
          const s = document.createElement('style');
          s.id = 'whack-style';
          s.textContent = [
            '.whack-scene{display:flex;flex-direction:column;align-items:center;gap:12px;color:#eef3e6;}',
            '.whack-head{display:flex;align-items:center;justify-content:space-between;width:min(440px,100%);}',
            '.whack-head h3{margin:0;font-size:18px;letter-spacing:1px;color:#cde6a8;}',
            '.whack-combo{font-size:12px;font-weight:800;color:#9fb08e;padding:5px 12px;border-radius:999px;background:#24361f;border:1px solid #3b5232;transition:.2s;}',
            '.whack-combo.hot{color:#fff0a8;background:#6b4a1e;border-color:#c9972e;box-shadow:0 0 14px rgba(255,196,70,.35);}',
            '.whack-grid{display:grid;grid-template-columns:repeat(3,116px);grid-template-rows:repeat(3,104px);gap:12px;}',
            '.whack-hole{position:relative;width:116px;height:104px;cursor:pointer;touch-action:manipulation;}',
            '.whack-pit{position:absolute;left:4px;right:4px;bottom:2px;height:40px;border-radius:50%;',
            'background:radial-gradient(ellipse at 50% 30%,#241a12 0%,#3a2a1c 60%,#4a3722 100%);',
            'box-shadow:inset 0 8px 12px rgba(0,0,0,.65),0 2px 0 rgba(255,255,255,.04);transition:filter .15s;}',
            '.whack-hole:hover .whack-pit{filter:brightness(1.28);}',
            '.whack-hole:active .whack-pit{filter:brightness(.9);}',
            '.whack-guy{position:absolute;left:50%;bottom:14px;width:72px;height:78px;margin-left:-36px;',
            'transform:translateY(96%);opacity:0;transition:transform .16s cubic-bezier(.2,1.5,.4,1),opacity .12s;pointer-events:none;}',
            '.whack-hole.up .whack-guy{transform:translateY(0);opacity:1;}',
            '.whack-hole.hit .whack-guy{transform:translateY(0) scale(.72) rotate(-14deg);opacity:0;transition:transform .18s ease-in,opacity .18s;}',
            '.whack-body{position:absolute;left:6px;top:14px;width:60px;height:60px;border-radius:50% 50% 44% 44%;',
            'background:linear-gradient(160deg,#c99a6b,#8a5f38);box-shadow:inset -6px -8px 0 rgba(0,0,0,.12),0 4px 10px rgba(0,0,0,.3);}',
            '.whack-eye{position:absolute;top:32px;width:9px;height:11px;border-radius:50%;background:#1c140d;z-index:2;}',
            '.whack-eye.l{left:22px;} .whack-eye.r{right:22px;}',
            '.whack-eye:after{content:"";position:absolute;top:2px;left:2px;width:3px;height:3px;border-radius:50%;background:#fff;}',
            '.whack-nose{position:absolute;top:45px;left:50%;width:12px;height:9px;margin-left:-6px;border-radius:50%;background:#e88a92;z-index:2;}',
            '.whack-guy.gold .whack-body{background:linear-gradient(160deg,#ffe27a,#e0a328);box-shadow:inset -6px -8px 0 rgba(150,90,0,.18),0 0 16px rgba(255,205,80,.6);}',
            '.whack-guy.gold .whack-nose{background:#fff0b0;}',
            '.whack-guy.trap .whack-body{background:linear-gradient(160deg,#7fd07a,#3c8f52);}',
            '.whack-guy.trap .whack-eye{background:#16321f;}',
            '.whack-guy.trap .whack-nose{background:#b7e08a;}',
            '.whack-guy.trap:before{content:"";position:absolute;top:6px;left:50%;width:3px;height:14px;margin-left:-1px;background:#3c8f52;transform:rotate(-12deg);}',
            '.whack-guy.trap:after{content:"";position:absolute;top:6px;left:50%;width:3px;height:14px;margin-left:-1px;background:#3c8f52;transform:rotate(12deg);}',
            '.whack-float{position:absolute;left:50%;top:18px;transform:translateX(-50%);font-size:17px;font-weight:900;',
            'pointer-events:none;text-shadow:0 2px 4px rgba(0,0,0,.5);animation:whackFloat .75s ease-out forwards;z-index:5;white-space:nowrap;}',
            '@keyframes whackFloat{0%{opacity:0;transform:translate(-50%,8px) scale(.8);}20%{opacity:1;transform:translate(-50%,0) scale(1.1);}100%{opacity:0;transform:translate(-50%,-32px) scale(1);}}',
            '.whack-tip{font-size:11px;color:#8fa07c;letter-spacing:.5px;}',
            '@media(max-width:720px){.whack-grid{grid-template-columns:repeat(3,88px);grid-template-rows:repeat(3,80px);gap:8px;}',
            '.whack-hole{width:88px;height:80px;}.whack-pit{height:32px;}.whack-guy{width:60px;height:66px;margin-left:-30px;transform:translateY(88%);}',
            '.whack-body{width:50px;height:50px;left:5px;top:12px;}.whack-eye{top:28px;}.whack-eye.l{left:17px;}.whack-eye.r{right:17px;}.whack-nose{top:38px;}}',
          ].join('\n');
          document.head.appendChild(s);
        },

        buildBoard() {
          const holes = [];
          for (let i = 0; i < 9; i++) {
            holes.push(
              '<div class="whack-hole" data-i="' + i + '">' +
              '<div class="whack-pit"></div>' +
              '<div class="whack-guy"><div class="whack-body"></div>' +
              '<div class="whack-eye l"></div><div class="whack-eye r"></div><div class="whack-nose"></div></div>' +
              '</div>'
            );
          }
          ctx.stage.innerHTML =
            '<div class="whack-scene">' +
            '<div class="whack-head"><h3>敲冒头的家伙</h3><div class="whack-combo">命中目标得分</div></div>' +
            '<div class="whack-grid">' + holes.join('') + '</div>' +
            '<div class="whack-tip">普通 +100 · 金色 +300 · 误击伙伴 -50 · 连击有加成</div>' +
            '</div>';
          this.comboEl = ctx.stage.querySelector('.whack-combo');
          this.holes = Array.from(ctx.stage.querySelectorAll('.whack-hole')).map((el) => ({
            el: el,
            guy: el.querySelector('.whack-guy'),
            active: false,
            type: null,
            life: 0,
            hit: false,
          }));
        },

        onStart() {
          this.combo = 0;
          this.maxCombo = 0;
          this.spawnCd = 0.4;
          this.holes.forEach((h) => {
            h.active = false;
            h.type = null;
            h.life = 0;
            h.hit = false;
            h.guy.className = 'whack-guy';
            h.el.classList.remove('up', 'hit');
          });
          this.render();
        },

        showFx(h, text, color) {
          const el = document.createElement('div');
          el.className = 'whack-float';
          el.textContent = text;
          el.style.color = color;
          h.el.appendChild(el);
          setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 780);
        },

        hit(i) {
          const h = this.holes[i];
          if (!h || !h.active || h.hit) {
            this.combo = 0;
            if (h) this.showFx(h, '空击', '#c7cbe0');
            this.render();
            return;
          }
          h.hit = true;
          h.active = false;
          h.el.classList.remove('up');
          h.el.classList.add('hit');
          setTimeout(() => h.el.classList.remove('hit'), 220);

          if (h.type === 'trap') {
            ctx.addScore(-50);
            this.combo = 0;
            A.sound.play('hit');
            this.showFx(h, '-50', '#ff6b7a');
          } else {
            const baseScore = h.type === 'gold' ? 300 : 100;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            const pts = Math.round(baseScore * (1 + Math.min(this.combo - 1, 8) * 0.1));
            ctx.addScore(pts);
            A.sound.play(h.type === 'gold' ? 'success' : 'eat');
            this.showFx(h, '+' + pts, h.type === 'gold' ? '#ffd45e' : '#9ff0c0');
          }
          this.render();
        },

        onTick(dt) {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;

          for (const h of this.holes) {
            if (!h.active) continue;
            h.life -= dt;
            if (h.life <= 0) {
              h.active = false;
              h.el.classList.remove('up', 'hit');
              h.guy.className = 'whack-guy';
              if (h.type !== 'trap') {
                this.combo = 0;
                this.showFx(h, '跑了', '#aab0c8');
              }
            }
          }

          this.spawnCd -= dt;
          if (this.spawnCd <= 0) {
            const maxActive = Math.max(1, Math.round(2 * d.countFactor * (0.6 + ctx.speed / 12)));
            const activeCount = this.holes.filter((h) => h.active).length;
            const idle = this.holes.filter((h) => !h.active);
            if (idle.length && activeCount < maxActive) {
              const h = A.util.choice(idle);
              const r = Math.random();
              h.type = r < 0.16 ? 'trap' : (r < 0.34 ? 'gold' : 'normal');
              h.active = true;
              h.hit = false;
              h.life = Math.max(0.5, A.util.rand(0.95, 1.6) / d.speedFactor);
              h.guy.className = 'whack-guy ' + h.type;
              h.el.classList.add('up');
            }
            this.spawnCd = Math.max(0.28, A.util.rand(0.55, 1.0) / (d.speedFactor * (0.55 + ctx.speed / 12)));
          }
          this.render();
        },

        render() {
          if (!this.comboEl) return;
          if (this.combo > 1) {
            this.comboEl.textContent = '连击 x' + this.combo;
            this.comboEl.classList.toggle('hot', this.combo >= 4);
          } else {
            this.comboEl.textContent = '命中目标得分';
            this.comboEl.classList.remove('hot');
          }
        },

        onTimeUp() {
          // 时间到时按总分评级，并决定胜负
          const s = ctx.score;
          let title;
          let win;
          if (s >= 2200) { title = '地鼠克星'; win = true; }
          else if (s >= 1400) { title = '身手不凡'; win = true; }
          else if (s >= 700) { title = '渐入佳境'; win = false; }
          else { title = '再接再厉'; win = false; }
          ctx.gameOver(title, win);
        },

        onEnd() {
          this.holes.forEach((h) => {
            h.active = false;
            h.el.classList.remove('up', 'hit');
            h.guy.className = 'whack-guy';
          });
        },
      };
      return game;
    },
  });
})();
