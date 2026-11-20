/* 打砖块：挡板控制、小球物理反弹、砖块碰撞与连击、生命与多关卡、霓虹粒子特效 */
(function () {
  const A = window.Arcade;

  A.registerRuntime('breakout', {
    create(ctx) {
      const W = 460;
      const H = 600;
      const BALL_R = 7;
      const PADDLE_Y = H - 34;
      const PADDLE_H = 12;
      const COLS = 8;
      const MARGIN = 22;
      const GAP = 6;
      const ROW_COLORS = ['#ff6b81', '#ff9f43', '#ffd166', '#5ad19a', '#5bc8ff', '#a78bfa'];

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

      const game = {
        init() {
          ctx.makeCanvas(W, H);
          this.canvas = ctx.canvas;
          this.g = ctx.g;
          this.keys = { left: false, right: false };

          document.addEventListener('keydown', (e) => {
            if (ctx.state !== 'playing') return;
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') { this.keys.left = true; e.preventDefault(); }
            else if (k === 'arrowright' || k === 'd') { this.keys.right = true; e.preventDefault(); }
            else if (k === ' ' || k === 'spacebar') { e.preventDefault(); this.launch(); }
          });
          document.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') this.keys.left = false;
            else if (k === 'arrowright' || k === 'd') this.keys.right = false;
          });

          this.canvas.addEventListener('pointermove', (e) => {
            if (ctx.state !== 'playing') return;
            const p = ctx.pointerPos(e);
            this.paddle.x = A.util.clamp(p.x - this.paddle.w / 2, 0, W - this.paddle.w);
            if (this.serving) this.placeBall();
          });
          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            const p = ctx.pointerPos(e);
            this.paddle.x = A.util.clamp(p.x - this.paddle.w / 2, 0, W - this.paddle.w);
            if (this.serving) this.launch();
          });
        },

        config() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          return {
            rows: ctx.difficulty === 'easy' ? 4 : ctx.difficulty === 'hard' ? 6 : 5,
            speed: 230 * (0.6 + ctx.speed * 0.07) * d.speedFactor,
            paddleW: A.util.clamp(104 - ctx.speed * 4 + (ctx.difficulty === 'easy' ? 14 : ctx.difficulty === 'hard' ? -12 : 0), 54, 116),
            lives: ctx.difficulty === 'easy' ? 4 : ctx.difficulty === 'hard' ? 2 : 3,
            levels: ctx.difficulty === 'hard' ? 4 : 3,
          };
        },

        onStart() {
          const c = this.config();
          this.level = 1;
          ctx.setLevel(1);
          this.levelCount = c.levels;
          this.rows = c.rows;
          this.speedBase = c.speed;
          this.paddleW = c.paddleW;
          this.lives = c.lives;
          this.maxLives = c.lives;
          this.paddle = { x: (W - this.paddleW) / 2, y: PADDLE_Y, w: this.paddleW, h: PADDLE_H };
          this.ball = { x: W / 2, y: PADDLE_Y - BALL_R - 2, vx: 0, vy: 0, r: BALL_R };
          this.ballTrail = [];
          this.particles = [];
          this.combo = 0;
          this.buildBricks();
          this.serving = true;
          this.placeBall();
          this.render();
        },

        buildBricks() {
          const bw = (W - 2 * MARGIN - (COLS - 1) * GAP) / COLS;
          const bh = 18;
          const top = 62;
          this.bricks = [];
          for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < COLS; c++) {
              this.bricks.push({
                x: MARGIN + c * (bw + GAP),
                y: top + r * (bh + GAP),
                w: bw,
                h: bh,
                row: r,
                alive: true,
                color: ROW_COLORS[r % ROW_COLORS.length],
              });
            }
          }
          this.remaining = this.bricks.length;
        },

        placeBall() {
          this.ball.x = this.paddle.x + this.paddle.w / 2;
          this.ball.y = PADDLE_Y - BALL_R - 2;
          this.ball.vx = 0;
          this.ball.vy = 0;
          this.ballTrail = [];
        },

        launch() {
          if (!this.serving) return;
          this.serving = false;
          const angle = A.util.rand(-0.5, 0.5);
          const s = this.speedBase;
          this.ball.vx = s * Math.sin(angle);
          this.ball.vy = -s * Math.cos(angle);
          A.sound.play('click');
        },

        burst(x, y, color, count) {
          for (let i = 0; i < count; i++) {
            const a = A.util.rand(0, Math.PI * 2);
            const sp = A.util.rand(60, 200);
            this.particles.push({
              x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              life: A.util.rand(0.25, 0.6), max: 0.6, color,
            });
          }
        },

        onTick(dt) {
          if (ctx.state !== 'playing') return;
          const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
          if (dir) {
            this.paddle.x = A.util.clamp(this.paddle.x + dir * 420 * dt, 0, W - this.paddle.w);
          }
          if (this.serving) {
            this.placeBall();
          } else {
            const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
            const sdt = dt / steps;
            for (let i = 0; i < steps; i++) {
              if (!this.stepBall(sdt)) break;
              if (ctx.state !== 'playing') return;
            }
            this.ballTrail.push({ x: this.ball.x, y: this.ball.y, life: 1 });
            if (this.ballTrail.length > 12) this.ballTrail.shift();
          }
          this.particles.forEach((p) => {
            p.x += p.vx * dt; p.y += p.vy * dt;
            p.vy += 260 * dt; p.life -= dt;
          });
          this.particles = this.particles.filter((p) => p.life > 0);
          this.ballTrail.forEach((p) => { p.life -= dt * 2.6; });
          this.render();
        },

        /* 返回 false 表示本帧小球状态已结束（掉落或过关） */
        stepBall(dt) {
          const b = this.ball;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
          if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
          if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }

          if (b.vy > 0 && b.y + b.r >= this.paddle.y &&
              b.y <= this.paddle.y + this.paddle.h &&
              b.x >= this.paddle.x - b.r && b.x <= this.paddle.x + this.paddle.w + b.r) {
            b.y = this.paddle.y - b.r;
            const rel = A.util.clamp((b.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2), -1, 1);
            const angle = rel * 1.1;
            let speed = A.util.clamp(Math.hypot(b.vx, b.vy) * 1.01, this.speedBase, this.speedBase * 1.9);
            b.vx = speed * Math.sin(angle);
            b.vy = -Math.abs(speed * Math.cos(angle)) - 40;
            this.combo = 0;
            A.sound.play('place');
          }

          for (const brick of this.bricks) {
            if (!brick.alive) continue;
            const cx = brick.x + brick.w / 2;
            const cy = brick.y + brick.h / 2;
            const overlapX = (b.r + brick.w / 2) - Math.abs(b.x - cx);
            const overlapY = (b.r + brick.h / 2) - Math.abs(b.y - cy);
            if (overlapX <= 0 || overlapY <= 0) continue;
            if (overlapX < overlapY) b.vx *= -1;
            else b.vy *= -1;
            brick.alive = false;
            this.remaining--;
            this.combo++;
            ctx.addScore(50 + Math.min(this.combo, 10) * 5);
            A.sound.play('hit');
            this.burst(cx, cy, brick.color, 9);
            if (this.remaining <= 0) {
              this.levelClear();
              return false;
            }
            break;
          }

          if (b.y - b.r > H) {
            this.loseLife();
            return false;
          }
          return true;
        },

        loseLife() {
          this.lives--;
          A.sound.play('fail');
          this.combo = 0;
          if (this.lives <= 0) {
            ctx.gameOver('小球掉落', false);
            return;
          }
          this.serving = true;
          this.placeBall();
          ctx.showToast('损失一球，剩余 ' + this.lives + ' 条生命');
        },

        levelClear() {
          ctx.addScore(500);
          A.sound.play('level');
          if (this.level >= this.levelCount) {
            ctx.gameOver('全部砖块清空', true);
            return;
          }
          this.level++;
          ctx.setLevel(this.level);
          this.speedBase *= 1.08;
          this.rows = Math.min(this.rows + (this.level % 2 === 0 ? 1 : 0), 7);
          this.buildBricks();
          this.serving = true;
          this.placeBall();
          ctx.showToast('过关！进入第 ' + this.level + ' 关  +500');
        },

        render() {
          if (!this.g) return;
          const g = this.g;
          g.clearRect(0, 0, W, H);

          /* 背景与网格氛围 */
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#171a34');
          bg.addColorStop(1, '#0e1124');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);
          g.strokeStyle = 'rgba(255,255,255,.025)';
          g.lineWidth = 1;
          for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
          for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

          /* 砖块 */
          this.bricks.forEach((br) => {
            if (!br.alive) return;
            g.fillStyle = br.color;
            roundRect(g, br.x, br.y, br.w, br.h, 4);
            g.fill();
            g.fillStyle = 'rgba(255,255,255,.28)';
            roundRect(g, br.x + 2, br.y + 2, br.w - 4, 5, 2);
            g.fill();
            g.fillStyle = 'rgba(0,0,0,.18)';
            g.fillRect(br.x + 2, br.y + br.h - 4, br.w - 4, 2);
          });

          /* 粒子 */
          this.particles.forEach((p) => {
            g.globalAlpha = A.util.clamp(p.life / p.max, 0, 1);
            g.fillStyle = p.color;
            g.beginPath(); g.arc(p.x, p.y, 2.6, 0, Math.PI * 2); g.fill();
          });
          g.globalAlpha = 1;

          /* 小球轨迹 */
          this.ballTrail.forEach((p, i) => {
            g.fillStyle = `rgba(160,220,255,${Math.max(0, p.life) * 0.35})`;
            g.beginPath(); g.arc(p.x, p.y, bRadius(i), 0, Math.PI * 2); g.fill();
          });

          /* 挡板 */
          g.shadowColor = 'rgba(120,200,255,.55)';
          g.shadowBlur = 14;
          const pg = g.createLinearGradient(this.paddle.x, 0, this.paddle.x + this.paddle.w, 0);
          pg.addColorStop(0, '#5b8cff');
          pg.addColorStop(0.5, '#9be0ff');
          pg.addColorStop(1, '#5b8cff');
          g.fillStyle = pg;
          roundRect(g, this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, 6);
          g.fill();
          g.shadowBlur = 0;

          /* 小球 */
          g.fillStyle = '#ffffff';
          g.shadowColor = 'rgba(160,220,255,.8)';
          g.shadowBlur = 12;
          g.beginPath(); g.arc(this.ball.x, this.ball.y, BALL_R, 0, Math.PI * 2); g.fill();
          g.shadowBlur = 0;

          /* 顶部信息 */
          g.fillStyle = 'rgba(8,12,28,.72)';
          roundRect(g, 0, 0, W, 46, 0); g.fill();
          g.fillStyle = '#eaf0ff';
          g.font = 'bold 13px system-ui, sans-serif';
          g.textBaseline = 'middle';
          g.textAlign = 'left';
          g.fillText('关卡 ' + this.level + '/' + this.levelCount, 14, 23);
          g.textAlign = 'center';
          g.fillStyle = '#ffd166';
          g.fillText('连击 x' + this.combo, W / 2, 23);
          g.textAlign = 'right';
          g.fillStyle = '#ff8fa3';
          g.fillText('生命 ' + this.lives + '/' + this.maxLives + '  砖块 ' + this.remaining, W - 14, 23);

          if (this.serving) {
            g.fillStyle = 'rgba(234,240,255,.85)';
            g.font = 'bold 14px system-ui, sans-serif';
            g.textAlign = 'center';
            g.fillText('点击画面或按空格发球', W / 2, H - 70);
          }
        },
      };

      function bRadius(i) {
        return Math.max(1.5, BALL_R - i * 0.4);
      }

      return game;
    },
  });
})();
