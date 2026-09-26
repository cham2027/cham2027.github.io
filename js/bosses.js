function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

const Bosses = {
  current: null,

  spawn(id) {
    if (id === "mini") {
      const hp = Math.round(CFG.bosses.mini.hp * Game.hpMul());
      this.current = this.base("mini", "哨戒残响", hp, CFG.bosses.mini.score);
      const b = this.current;
      b.mini = true;
      b.homeY = CFG.bosses.mini.homeY;
      b.body = CFG.bosses.mini.body;
      b.weak = CFG.bosses.mini.weak;
      b.phase = 1;
      return;
    }
    const cfg = CFG.bosses[id];
    const b = this.base(id, cfg.name, cfg.hp, cfg.score);
    b.homeY = cfg.homeY || 170;
    b.body = cfg.body || 90;
    b.weak = cfg.weak || 30;
    b.outer = cfg.outer || 120;
    b.inner = cfg.inner || 80;
    if (id === "B") {
      b.points = [0, 1, 2].map(function () {
        return { hp: cfg.pointHp, r: cfg.pointR, dead: false };
      });
      b.orbit = 0;
      b.safe = 0;
      b.laneT = 0;
      b.blink = 0;
      b.laneShot = 0;
      b.coreX = 270;
      b.coreY = 360;
    }
    if (id === "C") {
      b.lid = 0;
      b.spin = 0;
      b.spiralAcc = 0;
      b.orbT = 1.2;
      b.blinkT = 2;
      b.blinkMode = "wait";
      b.safeLeft = true;
      b.blade = { mode: "wait", t: 0 };
      b.selfAcc = 0;
    }
    this.current = b;
    Sfx.boss();
  },

  base(id, name, hp, score) {
    return {
      id: id,
      name: name,
      x: 270,
      y: -120,
      hp: hp,
      maxHp: hp,
      score: score,
      phase: 0,
      introT: 1.2,
      invuln: 0,
      age: 0,
      dead: false,
      shootT: 0.4,
      aimT: 1,
      addT: 3,
      sweep: { mode: "tele", t: 0 },
      ram: { mode: "wait", t: 0, tx: 270, ty: 800 },
      hazards: [],
      mini: false,
      bannerT: 0,
    };
  },

  update(dt) {
    const b = this.current;
    if (!b || b.dead) return;
    b.age += dt;
    b.bannerT = Math.max(0, b.bannerT - dt);
    b.hazards = [];
    if (b.introT > 0) {
      b.introT -= dt;
      b.y += ((b.homeY || 160) - b.y) * Math.min(1, dt * 2.4);
      if (b.introT <= 0) {
        b.phase = 1;
        b.introT = 0;
      }
      return;
    }
    if (b.id === "C" && b.phase === 3 && b.invuln <= 0) {
      b.hp -= CFG.bosses.C.selfDps * dt;
      if (b.hp <= 0) {
        b.hp = 0;
        this.die();
        return;
      }
    }
    if (b.invuln > 0) {
      b.invuln -= dt;
      b.y += ((b.homeY || 160) - b.y) * Math.min(1, dt * 2);
      return;
    }
    if (b.mini) this.scriptMini(b, dt);
    else if (b.id === "A") this.scriptA(b, dt);
    else if (b.id === "B") this.scriptB(b, dt);
    else if (b.id === "C") this.scriptC(b, dt);
  },

  die() {
    const b = this.current;
    if (!b || b.dead) return;
    b.dead = true;
    World.burst(b.x, b.y, "#FFD56A", 36);
    Sfx.explode();
    Game.addKillScore(b.score, b.x, b.y);
    const mini = b.mini;
    this.current = null;
    World.clearBossBullets();
    World.enemies.length = 0;
    Game.onBossDown(mini);
  },

  hurt(amount) {
    const b = this.current;
    if (!b || b.dead || b.introT > 0 || b.invuln > 0) return false;
    b.hp -= amount;
    if (b.hp <= 0) {
      b.hp = 0;
      this.die();
      return true;
    }
    if (!b.mini) {
      const phase = b.hp > b.maxHp * (2 / 3) ? 1 : b.hp > b.maxHp / 3 ? 2 : 3;
      if (phase !== b.phase) this.enterPhase(phase);
    }
    return true;
  },

  enterPhase(phase) {
    const b = this.current;
    b.phase = phase;
    b.invuln = 0.8;
    b.shootT = 0.3;
    b.aimT = 0.6;
    b.addT = 1.5;
    b.sweep = { mode: "tele", t: 0 };
    b.ram = { mode: "wait", t: 0, tx: b.x, ty: 860 };
    b.hazards = [];
    if (b.id === "C") {
      b.blade = { mode: "wait", t: 0 };
      b.blinkMode = "wait";
      b.blinkT = 1.2;
      b.lid = 0;
    }
    World.clearBossBullets();
    Game.banner = "阶段 " + ["", "I", "II", "III"][phase];
    Game.bannerT = 1.1;
    Game.shake(0.16);
    Sfx.boss();
  },

  bulletHit(bullet) {
    const b = this.current;
    if (!b || b.dead || b.introT > 0 || b.invuln > 0) return false;
    if (b.id === "B" && !b.mini) return this.hitB(b, bullet);
    const d = dist(bullet.x, bullet.y, b.x, b.y);
    const body = b.body || 80;
    if (d <= body + bullet.r) {
      const weak = d <= (b.weak || 28) + bullet.r;
      this.hurt(bullet.dmg * (weak ? 1.5 : 1));
      return true;
    }
    return false;
  },

  hitB(b, bullet) {
    if (b.phase === 3) {
      if (dist(bullet.x, bullet.y, b.coreX, b.coreY) <= 34 + bullet.r) {
        this.hurt(bullet.dmg * 1.5);
        return true;
      }
      return false;
    }
    for (let i = 0; i < b.points.length; i++) {
      const wp = b.points[i];
      if (wp.dead) continue;
      const pos = this.pointPos(b, i);
      if (dist(bullet.x, bullet.y, pos.x, pos.y) <= wp.r + bullet.r) {
        wp.hp -= bullet.dmg;
        if (wp.hp <= 0) wp.dead = true;
        this.hurt(bullet.dmg * 1.5);
        return true;
      }
    }
    const d = dist(bullet.x, bullet.y, b.x, b.y);
    if (d <= b.outer + bullet.r && d >= b.inner - bullet.r) {
      this.hurt(bullet.dmg);
      return true;
    }
    return false;
  },

  beamHits(x, half) {
    const b = this.current;
    if (!b || b.dead || b.introT > 0 || b.invuln > 0) return false;
    if (b.id === "B" && b.phase === 3) return Math.abs(b.coreX - x) <= 34 + half && b.coreY < World.player.y;
    const r = b.id === "B" ? b.outer : b.body || 80;
    return Math.abs(b.x - x) <= r + half && b.y < World.player.y + 20;
  },

  hazardHit() {
    const b = this.current;
    const p = World.player;
    if (!b || !p || !p.alive || !b.hazards) return;
    const pr = p.focus ? CFG.player.hitFocus / 2 : CFG.player.hit / 2;
    for (let i = 0; i < b.hazards.length; i++) {
      const h = b.hazards[i];
      if (!h.hot) continue;
      if (distToSeg(p.x, p.y, h.x1, h.y1, h.x2, h.y2) <= h.width + pr * 0.35) {
        Player.hurt(28);
        return;
      }
    }
  },

  touchPlayer(pr) {
    const b = this.current;
    const p = World.player;
    if (!b || b.introT > 0) return;
    if (b.id === "B" && b.phase < 3) {
      const d = dist(p.x, p.y, b.x, b.y);
      if (d < b.outer + pr && d > b.inner - pr) Player.hurt(50);
      return;
    }
    if (b.id === "B" && b.phase === 3) {
      if (dist(p.x, p.y, b.coreX, b.coreY) < 34 + pr) Player.hurt(50);
      const d = dist(p.x, p.y, b.x, b.y);
      if (d < b.outer + pr && d > b.inner - pr) Player.hurt(50);
      return;
    }
    if (dist(p.x, p.y, b.x, b.y) < (b.body || 80) * 0.72 + pr) Player.hurt(50);
  },

  pointPos(b, i) {
    const a = b.orbit + (i * Math.PI * 2) / 3;
    const rad = (b.outer + b.inner) / 2;
    return { x: b.x + Math.cos(a) * rad, y: b.y + Math.sin(a) * rad };
  },

  shot(x, y, ang, speed, r) {
    const mul = Game.bulletMul() * (CFG.combat.enemyBullet || 1);
    World.fireBullet({
      x: x,
      y: y,
      vx: Math.cos(ang) * speed * mul,
      vy: Math.sin(ang) * speed * mul,
      r: r || 6,
      friendly: false,
      fromBoss: true,
      color: "#FFB15A",
      hurt: 28,
    });
  },

  fan(b, n, spread, speed) {
    for (let i = 0; i < n; i++) {
      const ang = Math.PI / 2 + (i - (n - 1) / 2) * spread;
      this.shot(b.x, b.y + 20, ang, speed, 6);
    }
  },

  aimed(b, speed) {
    const p = World.player;
    const ang = Math.atan2(p.y - b.y, p.x - b.x);
    this.shot(b.x, b.y + 10, ang, speed, 6);
  },

  scriptMini(b, dt) {
    b.x = 270 + Math.sin(b.age * 0.9) * 140;
    b.y += (b.homeY - b.y) * Math.min(1, dt * 2);
    b.shootT -= dt;
    if (b.shootT <= 0) {
      b.shootT = 0.7;
      this.fan(b, 5, 0.16, 240);
    }
    b.aimT -= dt;
    if (b.aimT <= 0) {
      b.aimT = 1.3;
      this.aimed(b, 280);
      this.aimed(b, 240);
    }
  },

  scriptA(b, dt) {
    const ramming = b.phase === 3 && b.ram.mode !== "wait" && b.ram.mode !== "rest";
    if (!ramming) {
      b.x = 270 + Math.sin(b.age * 0.85) * 150;
      b.y += (b.homeY - b.y) * Math.min(1, dt * 2);
    }
    if (b.phase === 1) {
      b.shootT -= dt;
      b.aimT -= dt;
      b.addT -= dt;
      if (b.shootT <= 0) { b.shootT = 0.65; this.fan(b, 5, 0.16, 250); }
      if (b.aimT <= 0) {
        b.aimT = 1.15;
        const p = World.player;
        const ang = Math.atan2(p.y - b.y, p.x - b.x);
        this.shot(b.x, b.y + 10, ang, 300, 6);
        this.shot(b.x, b.y + 10, ang - 0.2, 270, 6);
        this.shot(b.x, b.y + 10, ang + 0.2, 270, 6);
      }
      if (b.addT <= 0) {
        b.addT = 5;
        World.spawnEnemy("E2", 90);
        World.spawnEnemy("E2", 450);
      }
    } else if (b.phase === 2) {
      this.sweep(b, dt);
      if (b.sweep.mode === "rest") {
        b.shootT -= dt;
        if (b.shootT <= 0) { b.shootT = 0.5; this.fan(b, 5, 0.15, 230); }
      }
    } else {
      if (b.ram.mode === "wait") {
        b.shootT -= dt;
        if (b.shootT <= 0) { b.shootT = 0.42; this.fan(b, 7, 0.14, 260); }
      }
      this.ram(b, dt);
    }
  },

  sweep(b, dt) {
    const s = b.sweep;
    s.t += dt;
    const left0 = Math.PI / 2 + 1.05;
    const left1 = Math.PI / 2 + 0.28;
    const right0 = Math.PI / 2 - 1.05;
    const right1 = Math.PI / 2 - 0.28;
    if (s.mode === "tele") {
      this.ray(b, left0, false);
      this.ray(b, right0, false);
      if (s.t >= 0.6) { s.mode = "hot"; s.t = 0; }
    } else if (s.mode === "hot") {
      const u = clamp(s.t / 2.5, 0, 1);
      this.ray(b, left0 + (left1 - left0) * u, true);
      this.ray(b, right0 + (right1 - right0) * u, true);
      if (s.t >= 2.5) { s.mode = "rest"; s.t = 0; }
    } else if (s.t >= 1.2) {
      s.mode = "tele";
      s.t = 0;
    }
  },

  ray(b, ang, hot) {
    const len = 760;
    b.hazards.push({
      x1: b.x,
      y1: b.y,
      x2: b.x + Math.cos(ang) * len,
      y2: b.y + Math.sin(ang) * len,
      hot: hot,
      width: hot ? 22 : 2,
      color: hot ? "#FF5A36" : "#FFD56A",
    });
  },

  ram(b, dt) {
    const r = b.ram;
    if (r.mode === "wait") {
      r.t += dt;
      if (r.t >= 3.6) {
        r.mode = "tele";
        r.t = 0;
        r.tx = World.player.x;
        r.ty = 900;
      }
    } else if (r.mode === "tele") {
      r.t += dt;
      b.hazards.push({
        x1: b.x, y1: b.y, x2: r.tx, y2: r.ty,
        hot: false, width: 3, color: "#FF5A36",
      });
      if (r.t >= 0.5) {
        r.mode = "dash";
        const ang = Math.atan2(r.ty - b.y, r.tx - b.x);
        r.vx = Math.cos(ang) * 980;
        r.vy = Math.sin(ang) * 980;
      }
    } else if (r.mode === "dash") {
      b.x += r.vx * dt;
      b.y += r.vy * dt;
      if (b.y > 860 || b.x < -30 || b.x > 570) {
        r.mode = "return";
        b.x = 270;
        b.y = -90;
      }
    } else if (r.mode === "return") {
      b.y += 320 * dt;
      if (b.y >= b.homeY) {
        b.y = b.homeY;
        r.mode = "wait";
        r.t = 0;
      }
    }
  },

  scriptB(b, dt) {
    b.orbit += dt * 0.85;
    b.y += (150 - b.y) * Math.min(1, dt * 2);
    if (b.phase === 1) {
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = 0.85;
        let n = 16;
        b.points.forEach(function (p) { if (p.dead) n -= 3; });
        n = Math.max(8, n);
        for (let i = 0; i < n; i++) {
          const ang = b.orbit + (i / Math.max(1, n)) * Math.PI * 2;
          this.shot(b.x + Math.cos(ang) * b.outer, b.y + Math.sin(ang) * b.outer, ang, 200, 6);
        }
      }
    } else if (b.phase === 2) {
      b.laneT += dt;
      if (b.blink > 0) {
        b.blink -= dt;
        if (b.blink <= 0) b.safe = (b.safe + 1) % 4;
      } else if (b.laneT >= 2.1) {
        b.laneT = 0;
        b.blink = 0.4;
      }
      b.laneShot -= dt;
      if (b.laneShot <= 0) {
        b.laneShot = 0.2;
        for (let i = 0; i < 4; i++) {
          if (i === b.safe) continue;
          const x = i * 135 + 24 + Math.random() * 86;
          this.shot(x, -10, Math.PI / 2, 200, 7);
        }
      }
      b.aimT -= dt;
      if (b.aimT <= 0) {
        b.aimT = 1.15;
        for (let i = 0; i < 12; i++) {
          const ang = b.orbit + (i / 12) * Math.PI * 2;
          this.shot(b.x, b.y, ang, 170, 5);
        }
      }
    } else {
      const p = World.player;
      b.coreX += clamp(p.x - b.coreX, -80, 80) * dt * 1.3;
      b.coreY += clamp(p.y - 80 - b.coreY, -70, 70) * dt * 1.1;
      b.coreX = clamp(b.coreX, 80, 460);
      b.coreY = clamp(b.coreY, 280, 620);
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = 0.5;
        const mid = Math.atan2(p.y - b.coreY, p.x - b.coreX);
        this.shot(b.coreX, b.coreY, mid, 280, 6);
        this.shot(b.coreX, b.coreY, mid - 0.16, 260, 6);
        this.shot(b.coreX, b.coreY, mid + 0.16, 260, 6);
      }
      b.aimT -= dt;
      if (b.aimT <= 0) {
        b.aimT = 1.2;
        for (let i = 0; i < 14; i++) {
          const ang = b.orbit + (i / 14) * Math.PI * 2;
          if (i % 4 === 0) continue;
          this.shot(b.x, b.y, ang, 140, 11);
        }
      }
    }
  },

  scriptC(b, dt) {
    b.y += (180 - b.y) * Math.min(1, dt * 2);
    if (b.phase === 1) {
      const p = World.player;
      b.look = Math.atan2(p.y - b.y, p.x - b.x);
      b.shootT -= dt;
      if (b.shootT <= 0) {
        b.shootT = 0.48;
        const mid = Math.atan2(p.y - b.y, p.x - b.x);
        for (let i = -3; i <= 3; i++) this.shot(b.x, b.y, mid + i * 0.1, 270, 5);
      }
      this.blades(b, dt);
    } else if (b.phase === 2) {
      b.lid = 0;
      b.spiralAcc += dt;
      while (b.spiralAcc >= 0.07) {
        b.spiralAcc -= 0.07;
        b.spin += 0.32;
        this.shot(b.x, b.y, b.spin, 175, 5);
        this.shot(b.x, b.y, b.spin + Math.PI, 175, 5);
      }
      b.orbT -= dt;
      if (b.orbT <= 0) {
        b.orbT = 2.1;
        const base = 80 + Math.random() * 40;
        for (let i = 0; i < 3; i++) {
          this.shot(base + i * 155, b.y + 30, Math.PI / 2, 78, 26);
        }
      }
    } else {
      b.x = 270;
      b.lid = 0;
      if (b.blinkMode === "wait") {
        b.blinkT -= dt;
        if (b.blinkT <= 0) {
          b.blinkMode = "tele";
          b.blinkT = 0.7;
          b.safeLeft = Math.random() < 0.5;
        }
      } else if (b.blinkMode === "tele") {
        b.blinkT -= dt;
        this.radialPreview(b);
        if (b.blinkT <= 0) {
          this.radialFire(b);
          b.blinkMode = "wait";
          b.blinkT = 3.1;
        }
      }
    }
  },

  blades(b, dt) {
    const s = b.blade;
    if (s.mode === "wait") {
      s.t += dt;
      b.lid = 0;
      if (s.t >= 3.4) { s.mode = "close"; s.t = 0; }
    } else if (s.mode === "close") {
      s.t += dt;
      b.lid = clamp(s.t / 0.5, 0, 1);
      if (s.t >= 0.5) { s.mode = "sweep"; s.t = 0; }
    } else if (s.mode === "sweep") {
      s.t += dt;
      b.lid = 1;
      const u = clamp(s.t / 0.8, 0, 1);
      const spread = 0.95 - u * 0.62;
      this.ray(b, Math.PI / 2 + spread, u > 0.05);
      this.ray(b, Math.PI / 2 - spread, u > 0.05);
      if (s.t >= 0.8) { s.mode = "wait"; s.t = 0; b.lid = 0; }
    }
  },

  safeCenter(b) {
    return Math.PI / 2 + (b.safeLeft ? -0.42 : 0.42);
  },

  radialPreview(b) {
    const center = this.safeCenter(b);
    const half = (50 * Math.PI) / 180 / 2;
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      if (Math.abs(angDiff(ang, center)) < half) continue;
      const len = 680;
      b.hazards.push({
        x1: b.x,
        y1: b.y,
        x2: b.x + Math.cos(ang) * len,
        y2: b.y + Math.sin(ang) * len,
        hot: false,
        width: 1.5,
        color: "rgba(255,90,54,0.7)",
      });
    }
  },

  radialFire(b) {
    const center = this.safeCenter(b);
    const half = (50 * Math.PI) / 180 / 2;
    for (let ang = 0; ang < Math.PI * 2; ang += (6 * Math.PI) / 180) {
      if (Math.abs(angDiff(ang, center)) < half) continue;
      this.shot(b.x, b.y, ang, 210, 5);
    }
  },
};
