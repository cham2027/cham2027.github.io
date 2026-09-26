const Upgrades = {
  rarityName(r) {
    if (r === "rare") return "稀有";
    if (r === "legend") return "传说";
    return "普通";
  },

  stacks(id) {
    return World.player.up[id] || 0;
  },

  available(card) {
    return this.stacks(card.id) < card.max;
  },

  rollOne(used) {
    const weights = [
      { id: "common", w: 60 },
      { id: "rare", w: 30 },
      { id: "legend", w: 10 },
    ];
    for (let n = 0; n < 8; n++) {
      let total = 0;
      weights.forEach(function (x) { total += x.w; });
      let r = Math.random() * total;
      let rarity = "common";
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i].w;
        if (r <= 0) { rarity = weights[i].id; break; }
      }
      const pool = CFG.cards.filter(function (c) {
        return c.rarity === rarity && Upgrades.available(c) && !used.has(c.id);
      });
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
    return { id: "gold", name: "星币", rarity: "common", desc: "分数 +1000", max: 99 };
  },

  roll() {
    const used = new Set();
    const out = [];
    for (let i = 0; i < 3; i++) {
      const card = this.rollOne(used);
      if (card.id !== "gold") used.add(card.id);
      out.push(card);
    }
    return out;
  },

  apply(card) {
    const p = World.player;
    if (card.id === "gold") {
      Game.addRawScore(1000);
      return;
    }
    p.up[card.id] = (p.up[card.id] || 0) + 1;
    if (card.id === "pulse") {
      p.pulse = 100;
    } else if (card.id === "revive") {
      if (p.revives < 1) p.revives += 1;
      else p.hp = Math.min(100, p.hp + 50);
    } else if (card.id === "magnet") {
      p.magnetBonus += 6;
      p.magnetT = Math.max(p.magnetT, 12);
    } else if (card.id === "protocol") {
      if (p.weapon >= 3) p.up.protocol = 1;
      else {
        p.weapon = 3;
        p.up.protocol = 0;
      }
    }
  },
};
