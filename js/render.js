const Render = {
  stars: [],
  ctx: null,
  time: 0,

  init() {
    this.ctx = document.getElementById("cv").getContext("2d");
    this.stars = [];
    for (let i = 0; i < 110; i++) {
      this.stars.push({
        x: Math.random() * CFG.W,
        y: Math.random() * CFG.H,
        z: Math.random(),
        s: 0.6 + Math.random() * 1.6,
      });
    }
  },

  tick(dt) {
    this.time += dt;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += (18 + s.z * 70) * dt;
      if (s.y > CFG.H) {
        s.y = 0;
        s.x = Math.random() * CFG.W;
      }
    }
  },

  draw() {
    const ctx = this.ctx;
    const cv = document.getElementById("cv");
    const dpr = cv._dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CFG.W, CFG.H);
    ctx.save();
    if (Game.shakeOn && Game.shakeT > 0) {
      const m = 5 * (Game.shakeT / 0.16);
      ctx.translate((Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m);
    }
    this.background(ctx);
    const battle = !!World.player && (Game.screen === "play" || Game.screen === "pause" || Game.screen === "levelup" || Game.screen === "result");
    if (battle && World.player) {
      this.lanes(ctx);
      this.pickups(ctx);
      this.enemies(ctx);
      this.boss(ctx);
      this.hazards(ctx);
      this.bullets(ctx);
      this.beams(ctx);
      this.player(ctx);
      this.fx(ctx);
      if (World.player.focus && Game.screen === "play") this.vignette(ctx, "rgba(0,0,0,0.28)");
      if (World.player.hp > 0 && World.player.hp <= 30) this.vignette(ctx, "rgba(90,10,0,0.22)");
    } else {
      this.showcase(ctx);
    }
    ctx.restore();
  },

  tint() {
    if (Game.screen === "play" || Game.screen === "pause" || Game.screen === "levelup") {
      if (Game.mode === "endless") return "#0e2c32";
      return CFG.chapters[Game.chapter - 1].tint;
    }
    return "#121a2c";
  },

  background(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, CFG.H);
    g.addColorStop(0, "#070b14");
    g.addColorStop(1, this.tint());
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.save();
    ctx.strokeStyle = "rgba(61,255,242,0.06)";
    ctx.lineWidth = 1;
    const s = 26;
    const h = Math.sqrt(3) * s;
    const scroll = (this.time * 16) % h;
    for (let r = -1; r < 16; r++) {
      for (let c = -1; c < 9; c++) {
        const x = c * s * 1.5 + 20;
        const y = r * h + (c % 2 ? h / 2 : 0) + scroll - h;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          const px = x + Math.cos(a) * s * 0.46;
          const py = y + Math.sin(a) * s * 0.46;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i];
      ctx.globalAlpha = 0.35 + st.z * 0.65;
      ctx.fillStyle = st.z > 0.8 ? "#d7fff8" : "#9fb4d6";
      ctx.fillRect(st.x, st.y, st.s, st.s);
    }
    ctx.globalAlpha = 1;
  },

  vignette(ctx, color) {
    const g = ctx.createRadialGradient(270, 620, 80, 270, 620, 560);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  },

  lanes(ctx) {
    const b = Bosses.current;
    if (!b || b.id !== "B" || b.phase !== 2) return;
    for (let i = 0; i < 4; i++) {
      const safe = i === b.safe;
      ctx.fillStyle = safe ? "rgba(61,255,242,0.07)" : "rgba(255,90,54,0.05)";
      if (safe && b.blink > 0 && Math.sin(this.time * 28) > 0) ctx.fillStyle = "rgba(255,213,106,0.14)";
      ctx.fillRect(i * 135, 0, 135, CFG.H);
    }
  },

  showcase(ctx) {
    const id = Game.showcaseShip || "falcon";
    const y = 800 + Math.sin(this.time * 1.6) * 8;
    this.ship(ctx, id, 270, y, 1.6, false);
  },

  player(ctx) {
    const p = World.player;
    if (!p) return;
    if (p.iframe > 0 && Math.floor(p.iframe * 16) % 2 === 0 && p.alive) return;
    if (p.magnetT > 0) {
      ctx.strokeStyle = "rgba(255,213,106,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 36 + Math.sin(this.time * 6) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.shields > 0) {
      ctx.strokeStyle = "rgba(61,255,242,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.ship === "prism" && p.skillT > 0) {
      ctx.strokeStyle = "rgba(255,61,138,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 32, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < p.wingmen; i++) {
      const ox = i === 0 ? -34 : 34;
      this.ship(ctx, "falcon", p.x + ox, p.y + 16, 0.45, false, "#FF7AB6");
    }
    this.ship(ctx, p.ship, p.x, p.y, 1, !p.alive);
    const hr = p.focus ? 3 : 2;
    ctx.fillStyle = p.focus ? "#ffffff" : "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - hr - 2);
    ctx.lineTo(p.x + hr, p.y);
    ctx.lineTo(p.x, p.y + hr + 2);
    ctx.lineTo(p.x - hr, p.y);
    ctx.closePath();
    ctx.fill();
  },

  ship(ctx, id, x, y, scale, dead, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const c = color || (id === "prism" ? "#9AF7FF" : id === "rail" ? "#EFFFFD" : "#3DFFF2");
    ctx.shadowColor = c;
    ctx.shadowBlur = dead ? 0 : 16;
    ctx.fillStyle = dead ? "#445" : c;
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (id === "prism") {
      ctx.moveTo(0, -20);
      ctx.lineTo(22, 4);
      ctx.lineTo(12, 16);
      ctx.lineTo(0, 8);
      ctx.lineTo(-12, 16);
      ctx.lineTo(-22, 4);
    } else if (id === "rail") {
      ctx.moveTo(0, -26);
      ctx.lineTo(7, 16);
      ctx.lineTo(0, 10);
      ctx.lineTo(-7, 16);
    } else {
      ctx.moveTo(0, -22);
      ctx.lineTo(16, 14);
      ctx.lineTo(6, 8);
      ctx.lineTo(0, 16);
      ctx.lineTo(-6, 8);
      ctx.lineTo(-16, 14);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = dead ? "#223" : "#06221f";
    ctx.fillRect(-2, 6, 4, 8);
    const flame = 8 + Math.sin(this.time * 32) * 4;
    ctx.fillStyle = dead ? "transparent" : "#FFD56A";
    ctx.beginPath();
    ctx.moveTo(-3, 14);
    ctx.lineTo(0, 14 + flame);
    ctx.lineTo(3, 14);
    ctx.fill();
    ctx.restore();
  },

  enemies(ctx) {
    for (let i = 0; i < World.enemies.length; i++) {
      const e = World.enemies[i];
      if (!e.alive) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      const elite = e.type === "EL";
      ctx.fillStyle = e.flash > 0 ? "#fff" : elite ? "#FF5A36" : e.type === "E5" ? "#C9A2FF" : "#FF3D8A";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = elite ? 14 : 8;
      ctx.beginPath();
      if (e.type === "E5") {
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
      } else if (e.type === "E3") {
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k;
          const px = Math.cos(a) * e.r;
          const py = Math.sin(a) * e.r;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.moveTo(0, e.r);
        ctx.lineTo(e.r * 0.8, -e.r * 0.7);
        ctx.lineTo(0, -e.r * 0.2);
        ctx.lineTo(-e.r * 0.8, -e.r * 0.7);
        ctx.closePath();
      }
      ctx.fill();
      if (e.mode === "wind") {
        ctx.strokeStyle = "#FFD56A";
        ctx.strokeRect(-e.r, -e.r, e.r * 2, e.r * 2);
      }
      ctx.restore();
      if (e.hp < e.maxHp && (elite || e.type === "E5")) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(e.x - 16, e.y - e.r - 10, 32, 3);
        ctx.fillStyle = "#FF5A36";
        ctx.fillRect(e.x - 16, e.y - e.r - 10, 32 * clamp(e.hp / e.maxHp, 0, 1), 3);
      }
    }
  },

  boss(ctx) {
    const b = Bosses.current;
    if (!b) return;
    ctx.save();
    if (b.id === "B") this.bossB(ctx, b);
    else if (b.id === "C") this.bossC(ctx, b);
    else this.bossA(ctx, b);
    ctx.restore();
  },

  bossA(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.shadowColor = "#3DFFF2";
    ctx.shadowBlur = 18;
    ctx.fillStyle = b.invuln > 0 && Math.floor(this.time * 20) % 2 === 0 ? "#9AFFF8" : "#14343a";
    ctx.strokeStyle = "#3DFFF2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = Math.cos(a) * b.body;
      const py = Math.sin(a) * b.body;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#7AFFF6";
    ctx.beginPath();
    ctx.arc(0, 0, b.weak, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  bossB(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.strokeStyle = "#FFD56A";
    ctx.lineWidth = 18;
    ctx.shadowColor = "#FFD56A";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, (b.outer + b.inner) / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (b.phase < 3 && b.points) {
      for (let i = 0; i < b.points.length; i++) {
        if (b.points[i].dead) continue;
        const pos = Bosses.pointPos(b, i);
        ctx.fillStyle = "#FF5A36";
        ctx.shadowColor = "#FF5A36";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, b.points[i].r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    if (b.phase === 3) {
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#FF5A36";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(b.coreX, b.coreY, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  },

  bossC(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "#1a0e22";
    ctx.strokeStyle = "#FF3D8A";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#FF3D8A";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.body, b.body * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff7ab6";
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    const look = b.look || Math.PI / 2;
    const ox = Math.cos(look) * 10;
    const oy = Math.sin(look) * 8;
    ctx.fillStyle = "#14030c";
    ctx.beginPath();
    ctx.arc(ox, oy, b.weak * 0.55, 0, Math.PI * 2);
    ctx.fill();
    if (b.lid > 0) {
      ctx.fillStyle = "#2a1038";
      ctx.fillRect(-b.body, -b.body * b.lid, b.body * 2, b.body * b.lid);
      ctx.fillRect(-b.body, 0, b.body * 2, b.body * b.lid);
    }
    ctx.restore();
  },

  hazards(ctx) {
    const b = Bosses.current;
    if (!b || !b.hazards) return;
    for (let i = 0; i < b.hazards.length; i++) {
      const h = b.hazards[i];
      ctx.strokeStyle = h.color;
      ctx.lineWidth = h.width;
      ctx.globalAlpha = h.hot ? 0.9 : 0.75;
      ctx.beginPath();
      ctx.moveTo(h.x1, h.y1);
      ctx.lineTo(h.x2, h.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },

  bullets(ctx) {
    for (let i = 0; i < World.bullets.length; i++) {
      const b = World.bullets[i];
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      if (b.friendly) {
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  },

  beams(ctx) {
    for (let i = 0; i < World.beams.length; i++) {
      const b = World.beams[i];
      ctx.globalAlpha = Math.max(0.25, b.t / 0.07);
      const grd = ctx.createLinearGradient(b.x, b.y, b.x, 0);
      grd.addColorStop(0, "rgba(255,255,255,0.95)");
      grd.addColorStop(1, "rgba(61,255,242,0.05)");
      ctx.fillStyle = grd;
      ctx.fillRect(b.x - b.half, 0, b.half * 2, b.y);
      ctx.globalAlpha = 1;
    }
  },

  pickups(ctx) {
    for (let i = 0; i < World.pickups.length; i++) {
      const it = World.pickups[i];
      const colors = {
        coin: "#FFD56A",
        power: "#3DFFF2",
        shield: "#7AFFF6",
        bomb: "#FF5A36",
        heal: "#8DFFB0",
        magnet: "#FFD56A",
        wing: "#FF7AB6",
      };
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.strokeStyle = colors[it.kind] || "#fff";
      ctx.fillStyle = "rgba(7,11,20,0.7)";
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = "11px Bahnschrift, Microsoft YaHei, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = { coin: "¥", power: "P", shield: "盾", bomb: "弹", heal: "+", magnet: "吸", wing: "僚" };
      ctx.fillText(label[it.kind] || "?", 0, 1);
      ctx.restore();
    }
  },

  fx(ctx) {
    for (let i = 0; i < World.particles.length; i++) {
      const p = World.particles[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = "14px Bahnschrift, Microsoft YaHei, sans-serif";
    ctx.textAlign = "center";
    for (let i = 0; i < World.texts.length; i++) {
      const t = World.texts[i];
      ctx.globalAlpha = Math.max(0, t.life / 0.7);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },
};
