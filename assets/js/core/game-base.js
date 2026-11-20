/* 所有小游戏共用的生命周期、HUD、遮罩、输入与渲染基础设施 */
(function () {
  const A = (window.Arcade = window.Arcade || {});
  const $ = (id) => document.getElementById(id);

  class GameBase {
    constructor(meta, runtime) {
      this.meta = meta;
      this.runtime = runtime;
      this.state = 'idle'; // idle | playing | paused | over
      this.score = 0;
      this.level = 1;
      this.elapsed = 0;
      this.last = 0;
      this.raf = 0;
      this.dpadHandler = null;
      this.keyHandlers = [];
      this.resizeHandlers = [];
      this.game = null;
      this.canvas = null;
      this.g = null;
      this.logicW = 0;
      this.logicH = 0;

      const defaults = meta.defaultParams || {};
      this.difficulty = defaults.difficulty || 'normal';
      this.speed = Number(defaults.speed) || 5;
      this.timeLimit = Number(defaults.timeLimit) || 0;
      this.best = Number(A.store.get('best:' + meta.id, 0)) || 0;

      this.cacheEls();
      this.bindBaseEvents();
      this.buildDpad();
      this.updateHud();
      this.showStart();

      this.game = runtime.create(this);
      if (this.game.init) this.game.init(this);
    }

    /* ---------- DOM ---------- */
    cacheEls() {
      this.stage = $('stage');
      this.shell = $('gameShell');
      this.overlay = $('overlay');
      this.overlayKicker = $('overlayKicker');
      this.overlayTitle = $('overlayTitle');
      this.overlayBody = $('overlayBody');
      this.overlayStats = $('overlayStats');
      this.overlayActions = $('overlayActions');
      this.hudScore = $('hudScore');
      this.hudBest = $('hudBest');
      this.hudTime = $('hudTime');
      this.hudLevel = $('hudLevel');
      this.hudStatus = $('hudStatus');
      this.btnPause = $('btnPause');
      this.btnStart = $('btnStart');
      this.btnSound = $('btnSound');
      this.dpad = $('dpad');
      this.toastEl = $('toast');
    }

    bindBaseEvents() {
      $('btnStart').addEventListener('click', () => {
        A.sound.play('click');
        if (this.state === 'idle' || this.state === 'over') this.start();
        else if (this.state === 'paused') this.resume();
      });
      $('btnPause').addEventListener('click', () => {
        A.sound.play('click');
        this.togglePause();
      });
      $('btnRestart').addEventListener('click', () => {
        A.sound.play('click');
        this.restart();
      });
      $('btnRules').addEventListener('click', () => {
        A.sound.play('click');
        if (this.state === 'playing') this.pause();
        this.showStart(true);
      });
      this.btnSound.addEventListener('click', () => {
        A.sound.setEnabled(!A.sound.enabled);
        this.btnSound.textContent = A.sound.enabled ? '音效 开' : '音效 关';
        if (A.sound.enabled) A.sound.play('click');
      });
      this.btnSound.textContent = A.sound.enabled ? '音效 开' : '音效 关';

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          if (this.state === 'playing' || this.state === 'paused') {
            e.preventDefault();
            this.togglePause();
          }
        }
        this.keyHandlers.forEach((fn) => fn(e, this));
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'playing') this.pause();
      });
      window.addEventListener('blur', () => {
        if (this.state === 'playing') this.pause();
      });
      window.addEventListener('resize', () => {
        this.resizeHandlers.forEach((fn) => fn());
      });
    }

    buildDpad() {
      if (!this.dpad) return;
      this.dpad.innerHTML = [
        '<button type="button" data-dir="up" aria-label="上">↑</button>',
        '<button type="button" data-dir="left" aria-label="左">←</button>',
        '<button type="button" data-dir="down" aria-label="下">↓</button>',
        '<button type="button" data-dir="right" aria-label="右">→</button>',
      ].join('');
      this.dpad.querySelectorAll('button').forEach((btn) => {
        const fire = (e) => {
          e.preventDefault();
          A.sound.init();
          if (this.state === 'playing' && this.dpadHandler) this.dpadHandler(btn.dataset.dir);
        };
        btn.addEventListener('pointerdown', fire);
      });
    }

    enableDpad(fn) {
      this.dpadHandler = fn;
      if (this.shell) this.shell.classList.add('has-dpad');
    }

    /* ---------- 遮罩 ---------- */
    showOverlay({ kicker, title, body, stats, actions }) {
      this.overlayKicker.textContent = kicker || '';
      this.overlayTitle.textContent = title || '';
      this.overlayBody.innerHTML = body || '';
      this.overlayStats.innerHTML = stats || '';
      this.overlayStats.hidden = !stats;
      this.overlayActions.innerHTML = '';
      (actions || []).forEach((a) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ' + (a.kind === 'primary' ? 'btn-primary' : 'btn-ghost');
        btn.textContent = a.label;
        btn.addEventListener('click', () => {
          A.sound.play('click');
          a.onClick();
        });
        this.overlayActions.appendChild(btn);
      });
      this.overlay.hidden = false;
      this.overlay.classList.add('is-visible');
    }

    hideOverlay() {
      this.overlay.hidden = true;
      this.overlay.classList.remove('is-visible');
    }

    showStart(fromRules = false) {
      const d = this.meta.defaultParams || {};
      const levels = A.DIFFICULTY;
      const options = Object.keys(levels)
        .map((key) => `<option value="${key}" ${key === this.difficulty ? 'selected' : ''}>${levels[key].label}</option>`)
        .join('');
      const body = `
        <p class="overlay-lead">${this.meta.tagline || ''}</p>
        <div class="rules-grid">
          <div class="rules-box">
            <h4>玩法说明</h4>
            <p>${(this.meta.rules || '').replace(/\n/g, '<br>')}</p>
          </div>
          <div class="rules-box">
            <h4>操作方式</h4>
            <p>${(this.meta.controls || '').replace(/\n/g, '<br>')}</p>
          </div>
        </div>
        <div class="option-row">
          <label>难度
            <select id="optDifficulty">${options}</select>
          </label>
          <label>速度 <span id="speedValue">${this.speed}</span>
            <input id="optSpeed" type="range" min="1" max="10" value="${this.speed}">
          </label>
          <label>主题
            <input id="optTheme" type="text" value="${d.theme || '经典'}" maxlength="16">
          </label>
        </div>
        <p class="option-hint">时间限制：${this.timeLimit > 0 ? this.timeLimit + ' 秒' : '不限时'} · 关卡数：${d.levelCount || 1} · 移动端：${d.mobile ? '已适配' : '键鼠优先'}</p>
      `;
      const speedInput = () => document.getElementById('optSpeed');
      const start = () => {
        const sel = document.getElementById('optDifficulty');
        if (sel) this.difficulty = sel.value;
        const sp = speedInput();
        if (sp) this.speed = Number(sp.value);
        const th = document.getElementById('optTheme');
        if (th && th.value.trim()) this.meta = Object.assign({}, this.meta, {
          defaultParams: Object.assign({}, d, { theme: th.value.trim() }),
        });
        this.start();
      };
      this.showOverlay({
        kicker: fromRules ? '规则回顾' : '准备就绪',
        title: fromRules ? '玩法说明' : this.meta.name,
        body,
        actions: [
          { label: fromRules && this.state === 'paused' ? '继续游戏' : '开始游戏', kind: 'primary', onClick: () => {
            if (fromRules && this.state === 'paused') this.resume();
            else start();
          } },
          { label: '返回首页', kind: 'ghost', onClick: () => { location.href = 'index.html'; } },
        ],
      });
      const sp = speedInput();
      if (sp) {
        const update = () => {
          const out = document.getElementById('speedValue');
          if (out) out.textContent = sp.value;
        };
        sp.addEventListener('input', update);
      }
    }

    showPause() {
      this.showOverlay({
        kicker: '游戏已暂停',
        title: '休息一下',
        body: '<p class="overlay-lead">当前进度已保留，随时可以继续。</p>',
        stats: `<span>得分 <b>${this.score}</b></span><span>用时 <b>${A.util.formatTime(this.elapsed)}</b></span>`,
        actions: [
          { label: '继续游戏', kind: 'primary', onClick: () => this.resume() },
          { label: '重新开始', kind: 'ghost', onClick: () => this.restart() },
          { label: '返回首页', kind: 'ghost', onClick: () => { location.href = 'index.html'; } },
        ],
      });
    }

    gameOver(title = '本局结束', win = false) {
      if (this.state === 'over') return;
      this.state = 'over';
      cancelAnimationFrame(this.raf);
      if (this.game.onEnd) this.game.onEnd(win);
      A.sound.play(win ? 'level' : 'fail');
      if (this.score > this.best) {
        this.best = this.score;
        A.store.set('best:' + this.meta.id, this.best);
      }
      this.updateHud();
      this.showOverlay({
        kicker: win ? '挑战成功' : '挑战结束',
        title,
        body: `<p class="overlay-lead">${win ? '漂亮！这一局完成得不错。' : '再来一次，成绩一定会更好。'}</p>`,
        stats: `<span>本局得分 <b>${this.score}</b></span><span>历史最佳 <b>${this.best}</b></span><span>用时 <b>${A.util.formatTime(this.elapsed)}</b></span>`,
        actions: [
          { label: '再来一局', kind: 'primary', onClick: () => this.restart() },
          { label: '玩法说明', kind: 'ghost', onClick: () => this.showStart(true) },
          { label: '返回首页', kind: 'ghost', onClick: () => { location.href = 'index.html'; } },
        ],
      });
    }

    /* ---------- 生命周期 ---------- */
    start() {
      cancelAnimationFrame(this.raf);
      this.state = 'playing';
      this.score = 0;
      this.level = 1;
      this.elapsed = 0;
      this.hideOverlay();
      A.sound.init();
      if (this.game && this.game.onStart) this.game.onStart();
      this.updateHud();
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }

    restart() {
      this.start();
    }

    pause() {
      if (this.state !== 'playing') return;
      this.state = 'paused';
      cancelAnimationFrame(this.raf);
      if (this.game.onPause) this.game.onPause();
      this.updateHud();
      this.showPause();
    }

    resume() {
      if (this.state !== 'paused') return;
      this.state = 'playing';
      this.hideOverlay();
      if (this.game.onResume) this.game.onResume();
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.loop(t));
      this.updateHud();
    }

    togglePause() {
      if (this.state === 'playing') this.pause();
      else if (this.state === 'paused') this.resume();
    }

    loop(now) {
      if (this.state !== 'playing') return;
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.elapsed += dt;
      if (this.timeLimit > 0 && this.elapsed >= this.timeLimit) {
        if (this.game.onTimeUp) this.game.onTimeUp();
        this.gameOver('时间到');
        return;
      }
      if (this.game.onTick) this.game.onTick(dt, this);
      this.updateHud();
      this.raf = requestAnimationFrame((t) => this.loop(t));
    }

    /* ---------- 计分与状态 ---------- */
    addScore(n) {
      this.score = Math.max(0, this.score + Math.round(n));
      if (this.score > this.best) this.best = this.score;
      this.updateHud();
    }

    setLevel(n) {
      this.level = Math.max(1, Math.round(n));
      this.updateHud();
    }

    updateHud() {
      if (this.hudScore) this.hudScore.textContent = this.score;
      if (this.hudBest) this.hudBest.textContent = this.best;
      if (this.hudLevel) this.hudLevel.textContent = this.level;
      if (this.hudTime) {
        this.hudTime.textContent = this.timeLimit > 0
          ? A.util.formatTime(this.timeLimit - this.elapsed)
          : A.util.formatTime(this.elapsed);
      }
      if (this.hudStatus) {
        const map = { idle: '待开始', playing: '进行中', paused: '已暂停', over: '已结束' };
        this.hudStatus.textContent = map[this.state] || this.state;
      }
      if (this.btnPause) this.btnPause.disabled = this.state === 'idle' || this.state === 'over';
    }

    /* ---------- 画布与输入 ---------- */
    clearStage() {
      if (this.stage) this.stage.innerHTML = '';
      this.canvas = null;
      this.g = null;
    }

    makeCanvas(w, h) {
      this.clearStage();
      const canvas = document.createElement('canvas');
      canvas.className = 'game-canvas';
      this.stage.appendChild(canvas);
      const apply = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.aspectRatio = `${w} / ${h}`;
        const g = canvas.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.canvas = canvas;
        this.g = g;
        this.logicW = w;
        this.logicH = h;
        if (this.game && this.game.render) this.game.render();
      };
      apply();
      this.onResize(apply);
      return canvas;
    }

    onKey(fn) {
      this.keyHandlers.push(fn);
    }

    onResize(fn) {
      this.resizeHandlers.push(fn);
      fn();
    }

    pointerPos(e) {
      if (!this.canvas) return { x: 0, y: 0 };
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * this.logicW,
        y: ((e.clientY - r.top) / r.height) * this.logicH,
      };
    }

    showToast(msg, ms = 1400) {
      if (!this.toastEl) return;
      this.toastEl.textContent = msg;
      this.toastEl.classList.add('is-visible');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => this.toastEl.classList.remove('is-visible'), ms);
    }
  }

  A.GameBase = GameBase;
})();
