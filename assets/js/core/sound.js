/* 轻量 WebAudio 音效，无外部资源依赖 */
(function () {
  const A = (window.Arcade = window.Arcade || {});

  const PRESETS = {
    click: { notes: [520], dur: 0.055, type: 'sine', vol: 0.06 },
    move: { notes: [360], dur: 0.045, type: 'triangle', vol: 0.045 },
    eat: { notes: [660, 880], dur: 0.09, type: 'sine', vol: 0.07 },
    hit: { notes: [180, 120], dur: 0.12, type: 'square', vol: 0.05 },
    place: { notes: [300], dur: 0.06, type: 'triangle', vol: 0.05 },
    success: { notes: [523, 659, 784], dur: 0.11, type: 'sine', vol: 0.07 },
    level: { notes: [523, 659, 784, 1047], dur: 0.13, type: 'sine', vol: 0.08 },
    fail: { notes: [300, 220, 160], dur: 0.16, type: 'sawtooth', vol: 0.05 },
    tick: { notes: [900], dur: 0.03, type: 'sine', vol: 0.035 },
  };

  const sound = {
    enabled: true,
    ctx: null,

    init() {
      if (this.ctx) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        this.ctx = new Ctx();
      } catch (e) {
        this.ctx = null;
      }
    },

    setEnabled(v) {
      this.enabled = !!v;
      A.store.set('sound', this.enabled);
    },

    play(name) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      const p = PRESETS[name] || PRESETS.click;
      const now = this.ctx.currentTime;
      p.notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + i * p.dur * 0.75;
        osc.type = p.type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(p.vol, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + p.dur + 0.02);
      });
    },
  };

  sound.enabled = A.store.get('sound', true);
  A.sound = sound;
})();
