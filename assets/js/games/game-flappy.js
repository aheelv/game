/* 小鸟飞行：重力与振翅物理、管道生成与碰撞、穿越计分与通关目标、视差滚动背景 */
(function () {
  const A = window.Arcade;

  A.registerRuntime('flappy', {
    create(ctx) {
      const W = 360;
      const H = 560;
      const GROUND = 64;
      const BIRD_X = 96;
      const BIRD_R = 13;
      const PIPE_W = 62;
      const GRAVITY = 1500;
      const FLAP_V = -430;

      const game = {
        init() {
          ctx.makeCanvas(W, H);
          this.canvas = ctx.canvas;
          this.g = ctx.g;

          document.addEventListener('keydown', (e) => {
            if (ctx.state !== 'playing') return;
            if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
              e.preventDefault();
              this.flap();
            }
          });
          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            e.preventDefault();
            this.flap();
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            if (dir === 'up') this.flap();
          });
        },

        config() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          const gap = A.util.clamp(178 * (ctx.difficulty === 'easy' ? 1.22 : ctx.difficulty === 'hard' ? 0.82 : 1) - ctx.speed * 3.5, 104, 230);
          return {
            gap,
            scroll: 150 * (0.6 + ctx.speed * 0.06) * d.speedFactor,
            countFactor: d.countFactor,
            target: Math.round((ctx.difficulty === 'easy' ? 8 : ctx.difficulty === 'hard' ? 16 : 12) * d.countFactor),
          };
        },

        onStart() {
          const c = this.config();
          this.gap = c.gap;
          this.scroll = c.scroll;
          this.target = c.target;
          this.level = 1;
          ctx.setLevel(1);
          this.bird = { y: H / 2 - 40, vy: 0, rot: 0 };
          this.pipes = [];
          this.particles = [];
          this.clouds = Array.from({ length: 5 }, (_, i) => ({
            x: A.util.rand(0, W), y: A.util.rand(60, 280), s: A.util.rand(0.6, 1.4),
          }));
          this.passed = 0;
          this.launched = false;
          this.wing = 0;
          this.dead = false;
          this.spawnPipe();
          this.render();
        },

        spawnPipe() {
          const cy = A.util.rand(this.gap / 2 + 46, H - GROUND - this.gap / 2 - 46);
          const last = this.pipes[this.pipes.length - 1];
          const spacing = 196 + (10 - ctx.speed) * 5;
          const x = last ? Math.max(W + 20, last.x + spacing) : W + 40;
          this.pipes.push({ x, cy, scored: false, edge: false });
        },

        flap() {
          if (this.dead) return;
          this.launched = true;
          this.bird.vy = FLAP_V;
          A.sound.play('click');
          for (let i = 0; i < 4; i++) {
            this.particles.push({
              x: BIRD_X - 8, y: this.bird.y + 8,
              vx: A.util.rand(-90, -20), vy: A.util.rand(-30, 40),
              life: 0.32, max: 0.32, color: '#fff3c4',
            });
          }
        },

        topPipe(p) { return p.cy - this.gap / 2; },
        bottomPipe(p) { return p.cy + this.gap / 2; },

        onTick(dt) {
          if (ctx.state !== 'playing' || this.dead) return;

          this.wing += dt;
          this.clouds.forEach((c) => {
            c.x -= this.scroll * 0.18 * c.s * dt;
            if (c.x < -60) { c.x = W + 60; c.y = A.util.rand(60, 280); }
          });

          if (this.launched) {
            this.bird.vy += GRAVITY * dt;
            this.bird.y += this.bird.vy * dt;
            this.bird.rot = A.util.clamp(this.bird.vy / 620, -0.5, 1.3);
          } else {
            this.bird.y = H / 2 - 40 + Math.sin(ctx.elapsed * 3) * 8;
            this.bird.vy = 0;
            this.bird.rot = 0;
          }

          this.pipes.forEach((p) => { p.x -= this.scroll * dt; });
          this.pipes = this.pipes.filter((p) => p.x + PIPE_W > -10);

          /* 穿越检测 */
          this.pipes.forEach((p) => {
            if (!p.scored && BIRD_X > p.x + PIPE_W) {
              p.scored = true;
              this.passed++;
              ctx.addScore(100);
              const top = this.topPipe(p);
              const bottom = this.bottomPipe(p);
              const near = Math.min(Math.abs(this.bird.y - top), Math.abs(this.bird.y - bottom));
              if (near < 26 && !p.edge) {
                p.edge = true;
                ctx.addScore(50);
              }
              A.sound.play('eat');
              if (this.passed >= this.target) {
                this.win();
              }
            }
          });
          if (ctx.state !== 'playing' || this.dead) return;
          if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < W - 120) this.spawnPipe();

          /* 碰撞检测 */
          if (this.launched) {
            if (this.bird.y + BIRD_R >= H - GROUND) {
              this.crash(H - GROUND - BIRD_R);
              return;
            }
            if (this.bird.y - BIRD_R < 0) { this.bird.y = BIRD_R; this.bird.vy = 0; }
            for (const p of this.pipes) {
              if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
                if (this.bird.y - BIRD_R < this.topPipe(p) || this.bird.y + BIRD_R > this.bottomPipe(p)) {
                  this.crash(this.bird.y);
                  return;
                }
              }
            }
          }

          this.particles.forEach((pt) => {
            pt.x += pt.vx * dt; pt.y += pt.vy * dt;
            pt.vy += 200 * dt; pt.life -= dt;
          });
          this.particles = this.particles.filter((pt) => pt.life > 0);
          this.render();
        },

        crash(y) {
          if (this.dead) return;
          this.dead = true;
          this.bird.y = y;
          A.sound.play('hit');
          for (let i = 0; i < 14; i++) {
            this.particles.push({
              x: BIRD_X, y, vx: A.util.rand(-160, 160), vy: A.util.rand(-180, 60),
              life: 0.5, max: 0.5, color: A.util.choice(['#ffe08a', '#ff8a5b', '#fff']),
            });
          }
          this.render();
          ctx.gameOver('撞上了管道', false);
        },

        win() {
          if (this.dead) return;
          this.dead = true;
          ctx.addScore(500);
          A.sound.play('level');
          ctx.showToast('穿越 ' + this.target + ' 组管道，通关！');
          this.render();
          ctx.gameOver('成功穿越云海', true);
        },

        onEnd() { this.dead = true; },

        render() {
          if (!this.g) return;
          const g = this.g;
          g.clearRect(0, 0, W, H);

          /* 夕阳天空 */
          const sky = g.createLinearGradient(0, 0, 0, H - GROUND);
          sky.addColorStop(0, '#3a3b7a');
          sky.addColorStop(0.45, '#8a5a97');
          sky.addColorStop(0.8, '#e8846a');
          sky.addColorStop(1, '#ffc178');
          g.fillStyle = sky;
          g.fillRect(0, 0, W, H - GROUND);

          /* 太阳 */
          const sunY = 220;
          const glow = g.createRadialGradient(W - 70, sunY, 8, W - 70, sunY, 90);
          glow.addColorStop(0, 'rgba(255,238,180,.9)');
          glow.addColorStop(1, 'rgba(255,180,120,0)');
          g.fillStyle = glow;
          g.beginPath(); g.arc(W - 70, sunY, 90, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffe9a8';
          g.beginPath(); g.arc(W - 70, sunY, 34, 0, Math.PI * 2); g.fill();

          /* 云层视差 */
          this.clouds.forEach((c) => {
            g.fillStyle = 'rgba(255,240,235,.32)';
            g.beginPath();
            g.arc(c.x, c.y, 14 * c.s, 0, Math.PI * 2);
            g.arc(c.x + 18 * c.s, c.y - 8 * c.s, 18 * c.s, 0, Math.PI * 2);
            g.arc(c.x + 40 * c.s, c.y, 13 * c.s, 0, Math.PI * 2);
            g.fill();
          });

          /* 远山 */
          g.fillStyle = 'rgba(70,58,110,.5)';
          g.beginPath();
          g.moveTo(0, H - GROUND);
          for (let x = 0; x <= W; x += 40) {
            g.lineTo(x, H - GROUND - 36 - Math.sin(x * 0.02 + 1) * 22);
          }
          g.lineTo(W, H - GROUND); g.closePath(); g.fill();

          /* 管道 */
          this.pipes.forEach((p) => {
            const top = this.topPipe(p);
            const bottom = this.bottomPipe(p);
            this.drawPipe(g, p.x, 0, PIPE_W, top);
            this.drawPipe(g, p.x, bottom, PIPE_W, H - GROUND - bottom, true);
          });

          /* 粒子 */
          this.particles.forEach((pt) => {
            g.globalAlpha = A.util.clamp(pt.life / pt.max, 0, 1);
            g.fillStyle = pt.color;
            g.beginPath(); g.arc(pt.x, pt.y, 3, 0, Math.PI * 2); g.fill();
          });
          g.globalAlpha = 1;

          /* 小鸟 */
          const bx = BIRD_X;
          const by = this.bird ? this.bird.y : H / 2 - 40;
          g.save();
          g.translate(bx, by);
          g.rotate(this.bird ? this.bird.rot : 0);
          g.fillStyle = '#ffd54a';
          g.beginPath(); g.arc(0, 0, BIRD_R + 1, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffb02e';
          const flap = Math.sin(this.wing * 16) * 4;
          g.beginPath();
          g.ellipse(-9, 2 + flap, 8, 5, -0.4 + flap * 0.04, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#fff';
          g.beginPath(); g.arc(5, -4, 4.2, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2b2140';
          g.beginPath(); g.arc(6.4, -4, 2, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ff8a3d';
          g.beginPath();
          g.moveTo(BIRD_R - 1, 1); g.lineTo(BIRD_R + 8, 4); g.lineTo(BIRD_R - 1, 6);
          g.closePath(); g.fill();
          g.restore();

          /* 地面 */
          g.fillStyle = '#7a5a3c';
          g.fillRect(0, H - GROUND, W, GROUND);
          g.fillStyle = '#9ccf6a';
          g.fillRect(0, H - GROUND, W, 10);
          g.fillStyle = 'rgba(0,0,0,.15)';
          const off = this.launched ? Math.floor(ctx.elapsed * this.scroll * 0.6) % 28 : 0;
          for (let x = -off; x < W; x += 28) g.fillRect(x, H - GROUND + 16, 14, 6);

          /* 进度 */
          g.fillStyle = 'rgba(20,16,40,.55)';
          g.beginPath(); g.arc(28, 28, 22, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#fff';
          g.font = 'bold 15px system-ui, sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(String(this.passed), 28, 24);
          g.font = 'bold 9px system-ui, sans-serif';
          g.fillStyle = 'rgba(255,255,255,.8)';
          g.fillText('/' + this.target, 28, 38);

          if (!this.launched) {
            g.fillStyle = 'rgba(255,255,255,.9)';
            g.font = 'bold 15px system-ui, sans-serif';
            g.textAlign = 'center';
            g.fillText('点击或按空格起飞', W / 2, H - GROUND - 70);
          }
        },

        drawPipe(g, x, y, w, h, capTop) {
          if (h <= 0) return;
          const grad = g.createLinearGradient(x, 0, x + w, 0);
          grad.addColorStop(0, '#2f8f5b');
          grad.addColorStop(0.25, '#5fd08a');
          grad.addColorStop(0.7, '#3ba86e');
          grad.addColorStop(1, '#236b47');
          g.fillStyle = grad;
          g.fillRect(x, y, w, h);
          g.fillStyle = 'rgba(255,255,255,.18)';
          g.fillRect(x + 5, y, 6, h);
          g.fillStyle = '#236b47';
          const capY = capTop ? y : y + h - 14;
          g.fillRect(x - 4, capY, w + 8, 14);
          g.fillStyle = '#5fd08a';
          g.fillRect(x - 4, capY, w + 8, 4);
        },
      };
      return game;
    },
  });
})();
