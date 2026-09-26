const Waves = {
  events: [],
  spawned: [],
  time: 0,
  done: false,
  acc: 0,
  burstN: 0,

  start(chapter, wave) {
    const ch = CFG.chapters[chapter - 1];
    this.events = ch.waves[wave];
    this.spawned = this.events.map(function () { return 0; });
    this.time = 0;
    this.done = false;
  },

  update(dt) {
    if (Game.grace > 0) return;
    this.time += dt;
    let all = true;
    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      if (this.spawned[i] >= ev.n) continue;
      all = false;
      let guard = 0;
      while (this.spawned[i] < ev.n && this.time >= ev.t + this.spawned[i] * ev.every && guard < 6) {
        World.spawnEnemy(ev.type, this.pickX(ev, this.spawned[i]));
        this.spawned[i] += 1;
        guard += 1;
      }
    }
    this.done = all;
  },

  pickX(ev, i) {
    if (ev.x === "left") return 64 + i * 34;
    if (ev.x === "right") return 476 - i * 34;
    if (ev.x === "mid") return 270;
    if (ev.x === "midband") return 180 + Math.random() * 180;
    if (ev.x === "alt") return i % 2 === 0 ? 130 : 410;
    if (ev.x === "spread") {
      if (ev.n <= 1) return 270;
      return 70 + ((CFG.W - 140) * i) / (ev.n - 1);
    }
    return 48 + Math.random() * (CFG.W - 96);
  },

  resetEndless() {
    this.acc = 0;
    this.burstN = 0;
    this.time = 0;
  },

  updateEndless(dt) {
    if (Game.grace > 0) return;
    this.time += dt;
    if (this.burstN < 8) {
      this.acc += dt;
      if (this.acc >= 0.28) {
        this.acc = 0;
        World.spawnEnemy(this.burstN < 5 ? "E1" : "E2", 48 + Math.random() * (CFG.W - 96));
        this.burstN += 1;
      }
      return;
    }
    let interval = 0.5 + Math.min(0.1, Game.time / 180);
    let n = 1;
    if (Game.time >= 60) {
      interval = Game.time >= 90 ? 0.22 : 0.3;
      n = Game.time >= 90 ? 3 : 2;
    }
    this.acc += dt;
    if (this.acc < interval) return;
    this.acc = 0;
    for (let i = 0; i < n; i++) {
      World.spawnEnemy(this.endlessType(), 40 + Math.random() * (CFG.W - 80));
    }
  },

  endlessType() {
    const t = Game.time;
    let types = ["E1", "E1", "E2", "E2"];
    if (t > 15) types = ["E1", "E2", "E2", "E3"];
    if (t > 35) types = ["E2", "E3", "E3", "E4"];
    if (t > 55) types = ["E3", "E4", "E5", "E2"];
    return types[Math.floor(Math.random() * types.length)];
  },
};
