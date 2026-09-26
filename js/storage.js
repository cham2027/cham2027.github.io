const Save = {
  key: "plane-shooter-v1",
  data: null,
  load() {
    const base = {
      sound: true,
      shake: true,
      cleared: 0,
      lastShip: "falcon",
      scores: { campaign: [], endless: [] },
    };
    try {
      const raw = localStorage.getItem(this.key);
      this.data = raw ? Object.assign(base, JSON.parse(raw)) : base;
    } catch (e) {
      this.data = base;
    }
    if (!this.data.scores) this.data.scores = { campaign: [], endless: [] };
    if (!CFG.ships[this.data.lastShip]) this.data.lastShip = "falcon";
    return this.data;
  },
  store() {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.data));
    } catch (e) {}
  },
  unlocked() {
    return true;
  },
  best(mode) {
    const list = this.data.scores[mode] || [];
    return list.length ? list[0].score : 0;
  },
  submit(mode, score) {
    const prev = this.best(mode);
    const list = this.data.scores[mode] || [];
    const date = new Date().toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" });
    list.push({ score: Math.round(score), date: date });
    list.sort(function (a, b) { return b.score - a.score; });
    this.data.scores[mode] = list.slice(0, 5);
    this.store();
    return { record: score > prev, placed: score >= (this.data.scores[mode][this.data.scores[mode].length - 1] || {}).score };
  },
};
