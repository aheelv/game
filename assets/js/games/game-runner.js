/* 无尽跑酷：Canvas 横版躲避，跳跃越过矮障碍、滑铲穿过高障碍 */
(function () {
  const A = window.Arcade;
  A.registerRuntime('runner', {
    create(ctx) {
      const W = 900, H = 420;
      const GROUND = 330;
      const PX = 140, PW = 38, PH = 52, PSH = 26;
      const LOW_H = 40, GAP = 36;
      const GRAVITY = 1900, JUMP_V = 820;

      const game = {
        init() {
          ctx.makeCanvas(W, H);
          this.canvas = ctx.canvas;
          this.g = ctx.g;

          ctx.onKey((e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            if (k === ' ' || k === 'arrowup' || k === 'w') {
              e.preventDefault();
              if (!e.repeat) this.jump();
            } else if (k === 'arrowdown' || k === 's') {
              e.preventDefault();
              this.slide();
            }
          });

          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            e.preventDefault();
            const p = ctx.pointerPos(e);
            if (p.y < H * 0.55) this.jump();
            else this.slide();
          });

          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            if (dir === 'up') this.jump();
            else if (dir === 'down') this.slide();
          });
        },

        onStart() {
          this.distance = 0;
          this.awarded = 0;
          this.speedNow = this.baseSpeed();
          this.obstacles = [];
          this.floaters = [];
          this.spawnTimer = 0.8;
          this.combo = 0;
          this.levelMark = 1;
          this.shake = 0;
          this.player = { y: GROUND - PH, vy: 0, onGround: true, sliding: false, slideT: 0, runT: 0 };
          this.render();
        },

        baseSpeed() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          return 230 * d.speedFactor * (0.5 + ctx.speed / 10);
        },

        jump() {
          const p = this.player;
          if (!p || !p.onGround) return;
          p.vy = -JUMP_V;
          p.onGround = false;
          p.sliding = false;
          p.slideT = 0;
          A.sound.play('move');
        },

        slide() {
          const p = this.player;
          if (!p || !p.onGround || p.sliding) return;
          p.sliding = true;
          p.slideT = 0.62;
          A.sound.play('place');
        },

        onTick(dt) {
          if (!this.player) return;
          const p = this.player;
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          const base = this.baseSpeed();
          this.speedNow = Math.min(base + this.distance * 0.06, base * 2.1);
          this.distance += this.speedNow * dt;

          // 距离计分：每 10 像素约 1 米
          const pts = Math.floor(this.distance / 10);
          if (pts > this.awarded) {
            ctx.addScore(pts - this.awarded);
            this.awarded = pts;
          }

          // 每 400 米提升关卡与速度感
          const lv = Math.floor(this.distance / 400) + 1;
          if (lv > this.levelMark) {
            this.levelMark = lv;
            ctx.setLevel(lv);
            ctx.showToast('速度提升！');
            A.sound.play('level');
          }

          if (!p.onGround) {
            p.vy += GRAVITY * dt;
            p.y += p.vy * dt;
            if (p.y >= GROUND - PH) {
              p.y = GROUND - PH;
              p.vy = 0;
              p.onGround = true;
            }
          }
          if (p.sliding) {
            p.slideT -= dt;
            if (p.slideT <= 0) p.sliding = false;
          }
          if (p.onGround) p.runT += dt * this.speedNow * 0.05;

          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            this.spawnObstacle();
            const gapSec = A.util.rand(1.05, 1.7) / d.countFactor;
            this.spawnTimer = Math.max(0.92, gapSec);
          }

          const curH = p.sliding ? PSH : PH;
          const pTop = p.y + PH - curH;
          const pBot = p.y + PH;
          for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.x -= this.speedNow * dt;

            if (!o.passed && o.x + o.w < PX) {
              o.passed = true;
              this.combo++;
              const bonus = 12 + Math.min(this.combo, 10) * 2;
              ctx.addScore(bonus);
              this.floaters.push({ x: PX + 30, y: GROUND - 74, text: '+' + bonus, life: 0.7, color: '#7ef7c8' });
            }

            if (!o.dead && o.x + o.w > PX && o.x < PX + PW) {
              let hit = false;
              if (o.type === 'low') hit = pBot > GROUND - LOW_H && pTop < GROUND;
              else hit = pTop < GROUND - GAP && pBot > 0;
              if (hit) {
                o.dead = true;
                A.sound.play('hit');
                this.shake = 0.35;
                this.floaters.push({ x: PX + PW / 2, y: pTop - 14, text: '撞到了', life: 0.8, color: '#ff6b7a' });
                ctx.gameOver('撞上障碍');
                this.render();
                return;
              }
            }
            if (o.x + o.w < -30) this.obstacles.splice(i, 1);
          }

          for (let i = this.floaters.length - 1; i >= 0; i--) {
            this.floaters[i].life -= dt;
            this.floaters[i].y -= 30 * dt;
            if (this.floaters[i].life <= 0) this.floaters.splice(i, 1);
          }
          if (this.shake > 0) this.shake -= dt;
          this.render();
        },

        spawnObstacle() {
          const type = Math.random() < 0.55 ? 'low' : 'high';
          const w = type === 'low' ? A.util.rand(24, 38) : A.util.rand(46, 70);
          this.obstacles.push({ x: W + 30, w: w, type: type, passed: false, dead: false });
        },

        onEnd() {
          this.floaters = [];
        },

        render() {
          if (!this.g || !this.player) return;
          const g = this.g;
          g.save();
          if (this.shake > 0) g.translate(A.util.rand(-4, 4), A.util.rand(-3, 3));

          const grad = g.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#191141');
          grad.addColorStop(0.6, '#2e1c5e');
          grad.addColorStop(1, '#4a2a6b');
          g.fillStyle = grad;
          g.fillRect(0, 0, W, H);

          g.fillStyle = 'rgba(255,255,255,.55)';
          const starOff = (this.distance * 0.03) % 180;
          for (let i = 0; i < 42; i++) {
            const sx = (((i * 173) % W) - starOff + W * 2) % W;
            const sy = (i * 67) % 180 + 18;
            g.fillRect(sx, sy, 2, 2);
          }

          this.drawSkyline(g, this.distance * 0.12, '#3b2b70', 60);
          this.drawSkyline(g, this.distance * 0.28, '#53388c', 82);

          g.fillStyle = '#141229';
          g.fillRect(0, GROUND, W, H - GROUND);
          g.fillStyle = '#8c6bd6';
          g.fillRect(0, GROUND, W, 3);
          g.fillStyle = 'rgba(140,107,214,.25)';
          const dashOff = (this.distance * 0.9) % 60;
          for (let x = -60 + dashOff; x < W; x += 60) g.fillRect(x, GROUND + 26, 30, 3);

          for (const o of this.obstacles) {
            if (o.type === 'low') {
              g.fillStyle = '#ff5c8a';
              roundRect(g, o.x, GROUND - LOW_H, o.w, LOW_H, 5);
              g.fill();
              g.fillStyle = 'rgba(255,255,255,.35)';
              g.fillRect(o.x + 4, GROUND - LOW_H + 6, 4, LOW_H - 15);
              g.strokeStyle = 'rgba(255,255,255,.22)';
              g.lineWidth = 2;
              for (let k = 0; k < 3; k++) {
                g.beginPath();
                g.moveTo(o.x + (o.w * k) / 3, GROUND);
                g.lineTo(o.x + (o.w * (k + 1)) / 3, GROUND - LOW_H);
                g.stroke();
              }
            } else {
              g.fillStyle = '#ffb347';
              roundRect(g, o.x, 10, o.w, GROUND - GAP - 10, 6);
              g.fill();
              g.fillStyle = 'rgba(255,255,255,.28)';
              g.fillRect(o.x + 5, 16, 4, GROUND - GAP - 30);
              g.fillStyle = 'rgba(255,179,71,.4)';
              g.fillRect(o.x, GROUND - GAP - 4, o.w, 4);
            }
          }

          this.drawPlayer(g);

          for (const f of this.floaters) {
            g.globalAlpha = Math.max(0, Math.min(1, f.life * 1.5));
            g.fillStyle = f.color;
            g.font = 'bold 18px system-ui, sans-serif';
            g.textAlign = 'center';
            g.fillText(f.text, f.x, f.y);
            g.globalAlpha = 1;
          }
          g.restore();
        },

        drawSkyline(g, scroll, color, maxH) {
          const off = scroll % 220;
          g.fillStyle = color;
          const start = Math.floor(scroll / 220);
          for (let i = -1; i < W / 55 + 2; i++) {
            const idx = start + i;
            const bw = 42;
            const bh = 34 + (Math.abs(idx * 37) % maxH);
            const x = i * 55 - off;
            g.fillRect(x, GROUND - bh, bw, bh);
            g.fillStyle = 'rgba(255,232,170,.16)';
            for (let r = 0; r < Math.floor(bh / 26); r++) {
              for (let c = 0; c < 2; c++) {
                if ((Math.abs(idx * 13 + r * 7 + c)) % 3 === 0) {
                  g.fillRect(x + 8 + c * 16, GROUND - bh + 10 + r * 26, 7, 9);
                }
              }
            }
            g.fillStyle = color;
          }
        },

        drawPlayer(g) {
          const p = this.player;
          const h = p.sliding ? PSH : PH;
          const top = p.y + PH - h;
          g.save();
          g.translate(PX, top);
          if (p.onGround) {
            g.fillStyle = 'rgba(0,0,0,.3)';
            g.beginPath();
            g.ellipse(PW / 2, h + 6, PW * 0.6, 5, 0, 0, Math.PI * 2);
            g.fill();
          }
          const grd = g.createLinearGradient(0, 0, 0, h);
          grd.addColorStop(0, '#a896ff');
          grd.addColorStop(1, '#5b4bd6');
          g.fillStyle = grd;
          roundRect(g, 4, p.sliding ? 2 : 14, PW - 8, p.sliding ? h - 4 : h - 18, 8);
          g.fill();
          if (p.sliding) {
            g.fillStyle = '#ffe0bd';
            g.beginPath();
            g.arc(PW - 7, h / 2, 9, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#2b2350';
            g.fillRect(PW - 13, h / 2 - 4, 7, 3);
          } else {
            g.fillStyle = '#ffe0bd';
            g.beginPath();
            g.arc(PW / 2, 9, 10, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#2b2350';
            g.fillRect(PW / 2 - 5, 6, 10, 4);
            g.strokeStyle = '#3a2f7a';
            g.lineWidth = 5;
            g.lineCap = 'round';
            const sw = p.onGround ? Math.sin(p.runT * 2) * 9 : -6;
            g.beginPath();
            g.moveTo(PW / 2 - 4, h - 6);
            g.lineTo(PW / 2 - 4 + sw, h);
            g.stroke();
            g.beginPath();
            g.moveTo(PW / 2 + 4, h - 6);
            g.lineTo(PW / 2 + 4 - sw, h);
            g.stroke();
          }
          g.restore();
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
