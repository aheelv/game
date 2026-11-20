/* 星际射击：纵向卷轴射击，自动开火、敌机波次、敌弹、护盾冲刺、Boss 与关卡提升 */
(function () {
  const A = window.Arcade;

  A.registerRuntime('shooter', {
    create(ctx) {
      const W = 420;
      const H = 600;
      const SHIP_W = 34;
      const SHIP_H = 40;

      function hit(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
            else if (k === ' ' || k === 'spacebar') { e.preventDefault(); this.dash(); }
          });
          document.addEventListener('keyup', (e) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') this.keys.left = false;
            else if (k === 'arrowright' || k === 'd') this.keys.right = false;
          });

          this.canvas.addEventListener('pointermove', (e) => {
            if (ctx.state !== 'playing') return;
            const p = ctx.pointerPos(e);
            this.targetX = A.util.clamp(p.x, SHIP_W / 2, W - SHIP_W / 2);
          });
          this.canvas.addEventListener('pointerdown', (e) => {
            if (ctx.state !== 'playing') return;
            const p = ctx.pointerPos(e);
            this.targetX = A.util.clamp(p.x, SHIP_W / 2, W - SHIP_W / 2);
            this.dash();
          });
          ctx.enableDpad((dir) => {
            if (ctx.state !== 'playing') return;
            if (dir === 'left' || dir === 'right') {
              const step = dir === 'left' ? -46 : 46;
              this.ship.x = A.util.clamp(this.ship.x + step, 0, W - SHIP_W);
            } else if (dir === 'up') this.dash();
          });
        },

        config() {
          const d = A.DIFFICULTY[ctx.difficulty] || A.DIFFICULTY.normal;
          return {
            diff: d,
            lives: ctx.difficulty === 'easy' ? 4 : ctx.difficulty === 'hard' ? 2 : 3,
            levels: ctx.difficulty === 'easy' ? 3 : ctx.difficulty === 'hard' ? 5 : 4,
            moveSpeed: 300 * (0.7 + ctx.speed * 0.05),
            fireInterval: 0.24 / (0.6 + ctx.speed * 0.06),
          };
        },

        onStart() {
          const c = this.config();
          this.diff = c.diff;
          this.lives = c.lives;
          this.maxLives = c.lives;
          this.levelCount = c.levels;
          this.moveSpeed = c.moveSpeed;
          this.fireInterval = c.fireInterval;
          this.level = 1;
          ctx.setLevel(1);
          this.nextLevelScore = 1200;
          this.ship = { x: (W - SHIP_W) / 2, y: H - 58, w: SHIP_W, h: SHIP_H };
          this.targetX = null;
          this.bullets = [];
          this.enemyBullets = [];
          this.enemies = [];
          this.particles = [];
          this.fireTimer = 0;
          this.spawnTimer = 0.6;
          this.bossTimer = 15;
          this.boss = null;
          this.invincible = 0;
          this.dashTime = 0;
          this.dashCooldown = 0;
          this.stars = Array.from({ length: 70 }, () => ({
            x: A.util.rand(0, W), y: A.util.rand(0, H),
            s: A.util.rand(0.6, 2.2), v: A.util.rand(0.5, 1.6),
          }));
          this.dead = false;
          this.render();
        },

        spawnInterval() {
          return 0.95 / (this.diff.speedFactor * this.diff.countFactor * (0.8 + ctx.speed * 0.035));
        },

        spawnEnemy() {
          const eliteChance = A.util.clamp(0.12 + this.level * 0.05, 0.12, 0.5);
          const elite = Math.random() < eliteChance;
          const w = elite ? 42 : 32;
          const h = elite ? 36 : 28;
          const hp = elite ? 3 + (ctx.difficulty === 'hard' ? 1 : 0) : 1 + (ctx.difficulty === 'hard' ? 1 : 0);
          this.enemies.push({
            x: A.util.rand(18, W - 18 - w), y: -h - 6, w, h,
            hp, maxHp: hp, elite,
            vy: (elite ? 96 : 128) * this.diff.speedFactor,
            phase: A.util.rand(0, Math.PI * 2),
            sway: elite ? A.util.rand(38, 70) : A.util.rand(8, 24),
            shootTimer: A.util.rand(0.6, 1.6),
            score: elite ? 300 : 100,
          });
        },

        spawnBoss() {
          const w = 96;
          const h = 54;
          const hp = 20 + this.level * 4;
          this.boss = {
            x: (W - w) / 2, y: -h - 10, w, h,
            hp, maxHp: hp, phase: 0, dir: 1,
            shootTimer: 1.2, score: 1000,
          };
          ctx.showToast('警告：Boss 来袭！');
          A.sound.play('fail');
        },

        dash() {
          if (this.dashCooldown > 0 || ctx.state !== 'playing') return;
          this.dashTime = 0.35;
          this.dashCooldown = 4.5;
          A.sound.play('move');
          for (let i = 0; i < 8; i++) {
            this.particles.push({
              x: this.ship.x + SHIP_W / 2, y: this.ship.y + SHIP_H,
              vx: A.util.rand(-50, 50), vy: A.util.rand(60, 180),
              life: 0.35, max: 0.35, color: '#8be9ff',
            });
          }
        },

        burst(x, y, color, count) {
          for (let i = 0; i < count; i++) {
            const a = A.util.rand(0, Math.PI * 2);
            const sp = A.util.rand(50, 210);
            this.particles.push({
              x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              life: A.util.rand(0.25, 0.6), max: 0.6, color,
            });
          }
        },

        onTick(dt) {
          if (ctx.state !== 'playing' || this.dead) return;

          /* 星空滚动 */
          this.stars.forEach((s) => {
            s.y += s.v * (60 + ctx.speed * 14) * dt;
            if (s.y > H) { s.y = -4; s.x = A.util.rand(0, W); }
          });

          /* 飞船移动 */
          this.invincible = Math.max(0, this.invincible - dt);
          this.dashCooldown = Math.max(0, this.dashCooldown - dt);
          this.dashTime = Math.max(0, this.dashTime - dt);
          const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
          const speed = this.moveSpeed * (this.dashTime > 0 ? 1.9 : 1);
          if (dir) {
            this.ship.x = A.util.clamp(this.ship.x + dir * speed * dt, 0, W - SHIP_W);
            this.targetX = null;
          } else if (this.targetX !== null) {
            const goal = A.util.clamp(this.targetX - SHIP_W / 2, 0, W - SHIP_W);
            const d = goal - this.ship.x;
            this.ship.x += A.util.clamp(d, -speed * 1.5 * dt, speed * 1.5 * dt);
          }

          /* 自动开火 */
          this.fireTimer -= dt;
          if (this.fireTimer <= 0) {
            this.fireTimer = this.fireInterval;
            this.bullets.push({ x: this.ship.x + SHIP_W / 2 - 3, y: this.ship.y - 6, w: 6, h: 14, vy: -560 });
            this.bullets.push({ x: this.ship.x + 6, y: this.ship.y - 2, w: 4, h: 12, vy: -500 });
            this.bullets.push({ x: this.ship.x + SHIP_W - 10, y: this.ship.y - 2, w: 4, h: 12, vy: -500 });
            A.sound.play('move');
          }
          this.bullets.forEach((b) => { b.y += b.vy * dt; });
          this.bullets = this.bullets.filter((b) => b.y > -20);

          /* 敌机生成 */
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            this.spawnTimer = this.spawnInterval();
            this.spawnEnemy();
            if (ctx.speed >= 8 && Math.random() < 0.35) this.spawnEnemy();
          }
          this.bossTimer -= dt;
          if (this.bossTimer <= 0 && !this.boss) {
            this.bossTimer = 22 + (ctx.difficulty === 'easy' ? 8 : 0);
            this.spawnBoss();
          }

          this.enemies.forEach((e) => {
            e.y += e.vy * dt;
            e.phase += dt * (e.elite ? 2.4 : 1.2);
            e.x += Math.cos(e.phase) * e.sway * dt;
            e.x = A.util.clamp(e.x, 4, W - e.w - 4);
            e.shootTimer -= dt;
            if (e.shootTimer <= 0 && e.y > 20) {
              e.shootTimer = (e.elite ? 1.1 : 2.0) / this.diff.speedFactor;
              this.enemyShoot(e.x + e.w / 2, e.y + e.h, 0, 1, 185 * this.diff.speedFactor);
            }
          });
          this.enemies = this.enemies.filter((e) => e.y < H + 40);

          if (this.boss) {
            const b = this.boss;
            b.phase += dt * 0.9;
            if (b.y < 60) b.y += 60 * dt;
            else {
              b.x += b.dir * 110 * dt;
              if (b.x < 10) { b.x = 10; b.dir = 1; }
              if (b.x > W - b.w - 10) { b.x = W - b.w - 10; b.dir = -1; }
            }
            b.shootTimer -= dt;
            if (b.shootTimer <= 0 && b.y > 40) {
              b.shootTimer = 1.5 / this.diff.speedFactor;
              const sp = 190 * this.diff.speedFactor;
              for (let i = -2; i <= 2; i++) {
                this.enemyShoot(b.x + b.w / 2, b.y + b.h, i * 0.32, 1, sp);
              }
            }
          }

          this.enemyBullets.forEach((b) => { b.x += b.vx * dt; b.y += b.vy * dt; });
          this.enemyBullets = this.enemyBullets.filter((b) => b.y < H + 20 && b.x > -20 && b.x < W + 20);

          /* 玩家子弹命中 */
          this.bullets.forEach((b) => {
            for (const e of this.enemies) {
              if (e.hp <= 0) continue;
              if (hit(b, e)) {
                e.hp--;
                b.hp = 0;
                A.sound.play('hit');
                this.burst(b.x, b.y, '#9be8ff', 4);
                if (e.hp <= 0) {
                  ctx.addScore(e.score);
                  A.sound.play('eat');
                  this.burst(e.x + e.w / 2, e.y + e.h / 2, e.elite ? '#ffd166' : '#ff8fa3', 14);
                }
                break;
              }
            }
            if (this.boss && this.boss.hp > 0 && hit(b, this.boss)) {
              this.boss.hp--;
              b.hp = 0;
              A.sound.play('hit');
              this.burst(b.x, b.y, '#ffd166', 4);
              if (this.boss.hp <= 0) {
                ctx.addScore(this.boss.score);
                A.sound.play('level');
                this.burst(this.boss.x + this.boss.w / 2, this.boss.y + this.boss.h / 2, '#ff7a59', 40);
                this.boss = null;
                ctx.showToast('Boss 击落！ +1000');
              }
            }
          });
          this.bullets = this.bullets.filter((b) => b.hp !== 0);
          this.enemies = this.enemies.filter((e) => e.hp > 0);

          /* 玩家受击 */
          if (this.invincible <= 0 && this.dashTime <= 0) {
            let hurt = false;
            for (const b of this.enemyBullets) {
              if (b.x > this.ship.x && b.x < this.ship.x + SHIP_W && b.y > this.ship.y && b.y < this.ship.y + SHIP_H) {
                hurt = true; b.hp = 0; break;
              }
            }
            if (!hurt) {
              for (const e of this.enemies) {
                if (hit(this.ship, e)) { hurt = true; e.hp = 0; break; }
              }
            }
            if (!hurt && this.boss && hit(this.ship, this.boss)) hurt = true;
            if (hurt) this.takeHit();
          }
          this.enemyBullets = this.enemyBullets.filter((b) => b.hp !== 0);

          /* 关卡提升 */
          if (ctx.score >= this.nextLevelScore && !this.dead) {
            this.nextLevelScore += 900 + this.level * 300;
            this.level++;
            ctx.setLevel(this.level);
            A.sound.play('level');
            ctx.showToast('进入第 ' + this.level + ' 关');
            if (this.level > this.levelCount) {
              ctx.addScore(1000);
              ctx.gameOver('银河恢复安宁', true);
              return;
            }
          }

          /* 粒子 */
          this.particles.forEach((p) => {
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          });
          this.particles = this.particles.filter((p) => p.life > 0);
          this.render();
        },

        enemyShoot(x, y, vx, vy, speed) {
          this.enemyBullets.push({
            x: x - 4, y, w: 8, h: 10,
            vx: vx * speed, vy: vy * speed, hp: 1,
          });
        },

        takeHit() {
          this.lives--;
          this.invincible = 1.3;
          A.sound.play('hit');
          this.burst(this.ship.x + SHIP_W / 2, this.ship.y + SHIP_H / 2, '#ff6b81', 16);
          if (this.lives <= 0) {
            this.dead = true;
            ctx.gameOver('护盾耗尽', false);
          } else {
            ctx.showToast('被击中，剩余护盾 ' + this.lives);
          }
        },

        onEnd() { this.dead = true; },

        render() {
          if (!this.g) return;
          const g = this.g;
          g.clearRect(0, 0, W, H);

          /* 深空背景 */
          const bg = g.createLinearGradient(0, 0, 0, H);
          bg.addColorStop(0, '#070b22');
          bg.addColorStop(0.6, '#0d1433');
          bg.addColorStop(1, '#131a42');
          g.fillStyle = bg;
          g.fillRect(0, 0, W, H);

          this.stars.forEach((s) => {
            g.fillStyle = `rgba(190,220,255,${0.35 + s.s * 0.2})`;
            g.fillRect(s.x, s.y, s.s, s.s * 2);
          });

          /* 粒子 */
          this.particles.forEach((p) => {
            g.globalAlpha = A.util.clamp(p.life / p.max, 0, 1);
            g.fillStyle = p.color;
            g.beginPath(); g.arc(p.x, p.y, 2.4, 0, Math.PI * 2); g.fill();
          });
          g.globalAlpha = 1;

          /* Boss */
          if (this.boss) {
            const b = this.boss;
            g.fillStyle = '#c2415e';
            this.roundRect(g, b.x, b.y, b.w, b.h, 10); g.fill();
            g.fillStyle = '#ff7a91';
            this.roundRect(g, b.x + 8, b.y + 8, b.w - 16, 12, 4); g.fill();
            g.fillStyle = '#8b2440';
            g.fillRect(b.x + 6, b.y + b.h - 12, b.w - 12, 8);
            g.fillStyle = '#fff';
            g.fillRect(b.x + 12, b.y + 30, 18, 8);
            g.fillRect(b.x + b.w - 30, b.y + 30, 18, 8);
            const ratio = A.util.clamp(b.hp / b.maxHp, 0, 1);
            g.fillStyle = 'rgba(0,0,0,.5)';
            g.fillRect(b.x, b.y - 12, b.w, 6);
            g.fillStyle = '#ff5d7a';
            g.fillRect(b.x, b.y - 12, b.w * ratio, 6);
          }

          /* 敌机 */
          this.enemies.forEach((e) => {
            g.fillStyle = e.elite ? '#ffb03a' : '#5be0c0';
            this.roundRect(g, e.x, e.y, e.w, e.h, 7); g.fill();
            g.fillStyle = e.elite ? '#fff0c2' : '#d8fff4';
            this.roundRect(g, e.x + 5, e.y + 5, e.w - 10, 7, 3); g.fill();
            g.fillStyle = 'rgba(10,20,40,.7)';
            g.fillRect(e.x + 7, e.y + e.h - 9, e.w - 14, 5);
          });

          /* 敌弹 */
          this.enemyBullets.forEach((b) => {
            g.fillStyle = '#ff6b81';
            g.shadowColor = 'rgba(255,107,129,.8)'; g.shadowBlur = 8;
            g.beginPath();
            g.arc(b.x + 4, b.y + 5, 4.5, 0, Math.PI * 2);
            g.fill();
            g.shadowBlur = 0;
          });

          /* 玩家子弹 */
          this.bullets.forEach((b) => {
            g.fillStyle = '#9be8ff';
            g.shadowColor = 'rgba(120,220,255,.9)'; g.shadowBlur = 8;
            g.fillRect(b.x, b.y, b.w, b.h);
            g.shadowBlur = 0;
          });

          /* 飞船 */
          const flashing = this.invincible > 0 && Math.floor(ctx.elapsed * 14) % 2 === 0;
          if (!flashing) {
            if (this.dashTime > 0) {
              g.fillStyle = 'rgba(120,230,255,.3)';
              g.beginPath();
              g.arc(this.ship.x + SHIP_W / 2, this.ship.y + SHIP_H / 2, 30, 0, Math.PI * 2);
              g.fill();
            }
            const sx = this.ship.x;
            const sy = this.ship.y;
            /* 尾焰 */
            g.fillStyle = '#ffb03a';
            const flame = 10 + Math.sin(ctx.elapsed * 24) * 4;
            g.beginPath();
            g.moveTo(sx + 8, sy + SHIP_H);
            g.lineTo(sx + SHIP_W / 2, sy + SHIP_H + flame);
            g.lineTo(sx + SHIP_W - 8, sy + SHIP_H);
            g.closePath(); g.fill();
            /* 机身 */
            g.fillStyle = '#dfeaff';
            g.beginPath();
            g.moveTo(sx + SHIP_W / 2, sy);
            g.lineTo(sx + SHIP_W - 4, sy + SHIP_H - 6);
            g.lineTo(sx + SHIP_W / 2, sy + SHIP_H - 12);
            g.lineTo(sx + 4, sy + SHIP_H - 6);
            g.closePath(); g.fill();
            g.fillStyle = '#4d8cff';
            g.beginPath();
            g.moveTo(sx + SHIP_W / 2, sy + 8);
            g.lineTo(sx + SHIP_W / 2 + 7, sy + SHIP_H - 8);
            g.lineTo(sx + SHIP_W / 2 - 7, sy + SHIP_H - 8);
            g.closePath(); g.fill();
          }

          /* 顶部 HUD */
          g.fillStyle = 'rgba(6,10,28,.72)';
          g.fillRect(0, 0, W, 40);
          g.font = 'bold 12px system-ui, sans-serif';
          g.textBaseline = 'middle';
          g.textAlign = 'left';
          g.fillStyle = '#cfe2ff';
          g.fillText('关卡 ' + this.level + '/' + this.levelCount, 12, 20);
          g.textAlign = 'center';
          g.fillStyle = '#ffd166';
          g.fillText('护盾 ' + this.lives + '/' + this.maxLives, W / 2, 20);
          g.textAlign = 'right';
          g.fillStyle = '#9be8ff';
          g.fillText(this.dashCooldown > 0 ? '冲刺 ' + this.dashCooldown.toFixed(1) + 's' : '冲刺就绪', W - 12, 20);
          g.fillStyle = 'rgba(120,220,255,.25)';
          g.fillRect(0, 38, W, 2);
          g.fillStyle = '#6fd0ff';
          g.fillRect(0, 38, W * (1 - this.dashCooldown / 4.5), 2);
        },

        roundRect(g, x, y, w, h, r) {
          r = Math.min(r, w / 2, h / 2);
          g.beginPath();
          g.moveTo(x + r, y);
          g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
          g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
          g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
          g.closePath();
        },
      };
      return game;
    },
  });
})();
