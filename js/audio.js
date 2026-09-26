const Sfx = {
  ctx: null,
  on: true,
  shootT: 0,
  boomT: 0,
  arm() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  tone(freq, dur, type, vol, slide) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(50, freq * slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur, vol) {
    if (!this.on || !this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.ctx.destination);
    src.start();
  },
  ui() { this.arm(); this.tone(620, 0.06, "square", 0.04, 1.4); },
  shoot() {
    if (this.shootT > 0) return;
    this.shootT = 0.09;
    this.tone(880, 0.03, "square", 0.018, 0.6);
  },
  explode() {
    if (this.boomT > 0) return;
    this.boomT = 0.05;
    this.noise(0.12, 0.08);
    this.tone(180, 0.1, "sawtooth", 0.03, 0.4);
  },
  hurt() { this.tone(140, 0.12, "sawtooth", 0.05, 0.5); },
  pickup() { this.tone(520, 0.08, "triangle", 0.04, 1.8); },
  skill() { this.tone(240, 0.18, "sawtooth", 0.05, 2.2); },
  boss() { this.tone(110, 0.35, "sawtooth", 0.05, 0.55); },
  tick(dt) {
    this.shootT = Math.max(0, this.shootT - dt);
    this.boomT = Math.max(0, this.boomT - dt);
  },
};
