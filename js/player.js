const Player = {
  make(ship) {
    return {
      ship: ship,
      x: 270,
      y: 760,
      hp: 100,
      iframe: 0,
      weapon: 1,
      pulse: 35,
      shields: 0,
      wings: [],
      wingCd: [0, 0, 0, 0],
      revives: 0,
      skillCd: 0,
      skillT: 0,
      fireT: 0,
      missileT: 0,
      sideT: 0,
      wingT: 0,
      magnetT: 0,
      magnetBonus: 0,
      beamT: 0,
      beamTick: 0,
      flash: 0,
      focus: false,
      up: {},
      alive: true,
    };
  },

  dmgMul() {
    const p = World.player;
    let m = 1;
    m *= Math.pow(1.15, p.up.power || 0);
    if (p.up.protocol) m *= 1.2;
    if (p.up.combo && Game.combo >= 20) m *= 1.25;
    return m;
  },

  rateMul() {
    const p = World.player;
    let m = Math.pow(1.15, p.up.rapid || 0);
    if (p.ship === "falcon" && p.weapon >= 4) m *= 1.25;
    return m;
  },

  skillMax() {
    const p = World.player;
    return CFG.combat.skillCd * (p.up.cd ? 0.7 : 1);
  },

  update(dt) {
    const p = World.player;
    if (!p || !p.alive) return;
    p.iframe = Math.max(0, p.iframe - dt);
    p.skillCd = Math.max(0, p.skillCd - dt);
    p.skillT = Math.max(0, p.skillT - dt);
    p.magnetT = Math.max(0, p.magnetT - dt);
    p.flash = Math.max(0, p.flash - dt);
    p.focus = Input.focusDown();
    this.gainPulse(CFG.combat.pulseFill * dt * (p.up.pulse ? 1.25 : 1));
    this.move(dt);
    this.shoot(dt);
    if (p.beamT > 0) this.beam(dt);
  },

  gainPulse(n) {
    const p = World.player;
    if (!p) return;
    p.pulse = clamp(p.pulse + n, 0, 100);
  },

  addWing() {
    const p = World.player;
    const n = p.wings.length;
    if (n >= 4) return false;
    let kind = "strike";
    if (n === 1) kind = "spray";
    else if (n === 2) kind = Math.random() < 0.5 ? "spray" : "homing";
    else if (n === 3) kind = ["strike", "spray", "homing"][Math.floor(Math.random() * 3)];
    p.wings.push(kind);
    return kind;
  },

  wingName(kind) {
    if (kind === "spray") return "散射";
    if (kind === "homing") return "追踪";
    return "突击";
  },

  wingPos(i) {
    const slots = [
      { x: -34, y: 16 },
      { x: 34, y: 16 },
      { x: -56, y: 4 },
      { x: 56, y: 4 },
    ];
    return slots[i] || slots[0];
  },

  move(dt) {
    const p = World.player;
    const speed = CFG.player.speed * (p.focus ? CFG.player.focus : 1);
    let dx = 0;
    let dy = 0;
    if (!Input.dragging) {
      if (Input.keys.a || Input.keys.arrowleft) dx -= 1;
      if (Input.keys.d || Input.keys.arrowright) dx += 1;
      if (Input.keys.w || Input.keys.arrowup) dy -= 1;
      if (Input.keys.s || Input.keys.arrowdown) dy += 1;
      if (dx || dy) {
        const len = Math.hypot(dx, dy) || 1;
        p.x += (dx / len) * speed * dt;
        p.y += (dy / len) * speed * dt;
      }
    } else {
      const mx = Input.aimX - p.x;
      const my = Input.aimY - p.y;
      const d = Math.hypot(mx, my);
      if (d > 1) {
        const step = Math.min(d, speed * dt);
        p.x += (mx / d) * step;
        p.y += (my / d) * step;
      }
    }
    p.x = clamp(p.x, CFG.player.minX, CFG.player.maxX);
    p.y = clamp(p.y, CFG.player.minY, CFG.player.maxY);
  },

  shoot(dt) {
    const p = World.player;
    const mul = this.dmgMul();
    if (p.ship === "rail") {
      const interval = 1 / (6 * this.rateMul());
      p.fireT -= dt;
      if (p.fireT <= 0) {
        p.fireT = interval;
        const dmg = (p.weapon >= 2 ? 22 : 16) * mul;
        this.railLine(p.x, dmg, p.weapon >= 2 ? 10 : 6, p.weapon >= 4 ? 1 : 0.7, p.weapon >= 5);
        if (p.weapon >= 3) {
          this.railLine(p.x - 20, dmg * 0.4, 4, 0.7, false);
          this.railLine(p.x + 20, dmg * 0.4, 4, 0.7, false);
        }
        p.flash = 0.04;
        Sfx.shoot();
      }
    } else if (p.ship === "prism") {
      const interval = 0.25 / this.rateMul();
      p.fireT -= dt;
      if (p.fireT <= 0) {
        p.fireT = interval;
        let n = p.weapon === 1 ? 3 : 5;
        if (p.weapon >= 4) n = 6;
        let dmg = 8 * mul;
        let r = 4;
        if (p.weapon >= 5) {
          dmg *= 1.3;
          r = 6;
        }
        for (let i = 0; i < n; i++) {
          const ang = (i - (n - 1) / 2) * 0.16;
          this.shot(p, ang, 640, dmg, r, false);
        }
        if (p.weapon >= 3) this.shot(p, 0, 700, dmg * 1.55, r + 2, false);
        p.flash = 0.04;
        Sfx.shoot();
      }
    } else {
      const interval = 0.125 / this.rateMul();
      p.fireT -= dt;
      let guard = 0;
      while (p.fireT <= 0 && guard < 3) {
        p.fireT += interval;
        guard++;
        const dmg = 10 * mul;
        if (p.weapon === 1) this.shot(p, 0, 720, dmg, 4, false);
        else {
          this.shot(p, 0, 720, dmg, 4, false, -8);
          this.shot(p, 0, 720, dmg, 4, false, 8);
        }
        if (p.weapon >= 3) {
          this.shot(p, -0.22, 700, dmg, 4, false);
          this.shot(p, 0.22, 700, dmg, 4, false);
        }
        p.flash = 0.04;
        Sfx.shoot();
      }
      if (p.weapon >= 5) {
        p.missileT -= dt;
        if (p.missileT <= 0) {
          p.missileT = 0.5;
          this.shot(p, 0, 420, 18 * mul, 5, true);
        }
      }
    }

    this.fireWings(dt, mul, p);

    if (p.up.side) {
      p.sideT -= dt;
      if (p.sideT <= 0) {
        p.sideT = 2;
        this.shot(p, -0.55, 480, 20 * mul, 4, false);
        this.shot(p, 0.55, 480, 20 * mul, 4, false);
      }
    }
  },

  fireWings(dt, mul, p) {
    const bounce = p.up.bounce ? 1 : 0;
    for (let i = 0; i < p.wings.length; i++) {
      p.wingCd[i] = (p.wingCd[i] || 0) - dt;
      if (p.wingCd[i] > 0) continue;
      const pos = this.wingPos(i);
      const kind = p.wings[i];
      const x = p.x + pos.x;
      const y = p.y + pos.y;
      if (kind === "spray") {
        p.wingCd[i] = 0.34;
        for (let k = -1; k <= 1; k++) {
          const a = -Math.PI / 2 + k * 0.22;
          World.fireBullet({
            x: x, y: y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620,
            r: 3, dmg: 4 * mul, friendly: true, color: "#7AFFF6", bounce: bounce,
          });
        }
      } else if (kind === "homing") {
        p.wingCd[i] = 0.46;
        World.fireBullet({
          x: x, y: y, vx: 0, vy: -420,
          r: 4, dmg: 8 * mul, friendly: true, homing: true, color: "#FFE08A", bounce: bounce,
        });
      } else {
        p.wingCd[i] = 0.22;
        World.fireBullet({
          x: x, y: y, vx: 0, vy: -680,
          r: 3, dmg: 5 * mul, friendly: true, color: "#FF7AB6", bounce: bounce,
        });
      }
    }
  },

  shot(p, ang, speed, dmg, r, homing, ox) {
    const a = -Math.PI / 2 + ang;
    World.fireBullet({
      x: p.x + (ox || 0),
      y: p.y - 18,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: r,
      dmg: dmg,
      friendly: true,
      homing: homing,
      color: homing ? "#FFE08A" : "#7AFFF6",
      bounce: p.up.bounce ? 1 : 0,
    });
  },

  railLine(x, dmg, half, decay, vuln) {
    const p = World.player;
    const hits = [];
    for (let i = 0; i < World.enemies.length; i++) {
      const e = World.enemies[i];
      if (Math.abs(e.x - x) <= half + e.r && e.y < p.y + 10) hits.push(e);
    }
    const boss = Bosses.current;
    let bossHit = false;
    if (boss && !boss.dead && Bosses.beamHits(x, half)) {
      bossHit = true;
      hits.push(boss);
    }
    hits.sort(function (a, b) { return b.y - a.y; });
    for (let i = 0; i < hits.length; i++) {
      const amount = dmg * Math.pow(decay, i);
      if (hits[i] === boss) Bosses.hurt(amount);
      else {
        World.damageEnemy(hits[i], amount);
        if (vuln) hits[i].vuln = Math.max(hits[i].vuln, 0.2);
      }
    }
    World.beams.push({ x: x, y: p.y, half: half, t: 0.07 });
  },

  beam(dt) {
    const p = World.player;
    p.beamT -= dt;
    p.beamTick -= dt;
    if (p.beamTick <= 0) {
      p.beamTick += 0.1;
      this.railLine(p.x, 36 * this.dmgMul(), 26, 1, true);
    }
  },

  bomb() {
    this.pulse();
  },

  pulse() {
    const p = World.player;
    if (!p || p.pulse < 100) return;
    if (Game.screen !== "play") return;
    if (Game.phase === "bonus" || Game.phase === "dying") return;
    p.pulse = 0;
    World.clearEnemyBullets();
    World.burst(p.x, p.y, "#7AFFF6", 18);
    Sfx.skill();
  },

  skill() {
    const p = World.player;
    if (!p || p.skillCd > 0) return;
    if (Game.screen !== "play") return;
    if (Game.phase === "bonus" || Game.phase === "dying") return;
    p.skillCd = this.skillMax();
    Sfx.skill();
    if (p.ship === "falcon") {
      const dmg = 16 * this.dmgMul();
      for (let i = 0; i < 8; i++) {
        const ang = -0.55 + (1.1 * i) / 7;
        this.shot(p, ang, 400, dmg, 5, true);
      }
    } else if (p.ship === "prism") {
      p.skillT = 2;
    } else {
      p.beamT = 0.6;
      p.beamTick = 0;
    }
  },

  hurt(raw) {
    const p = World.player;
    if (!p || !p.alive || p.iframe > 0) return;
    if (p.ship === "prism" && p.skillT > 0) return;
    if (p.shields > 0) {
      p.shields -= 1;
      p.iframe = CFG.player.shieldIframe;
      World.burst(p.x, p.y, "#3DFFF2", 10);
      Sfx.tone(500, 0.08, "triangle", 0.04, 0.7);
      return;
    }
    let dmg = raw;
    if (p.up.armor) dmg = Math.max(5, raw - 5 * p.up.armor);
    p.hp -= dmg;
    p.iframe = CFG.player.iframe;
    Game.shake(0.12);
    Sfx.hurt();
    World.burst(p.x, p.y, "#FF5A36", 8);
    if (p.hp <= 0) {
      if (p.revives > 0) {
        p.revives -= 1;
        p.hp = 100;
        p.iframe = CFG.player.reviveIframe;
        World.clearEnemyBullets();
        World.burst(p.x, p.y, "#7AFFF6", 20);
        Game.banner = "紧急重启";
        Game.bannerT = 1;
      } else {
        p.hp = 0;
        p.alive = false;
        Game.killPlayer();
      }
    }
  },

  collect(it) {
    const p = World.player;
    Sfx.pickup();
    if (it.kind === "coin") {
      Game.addRawScore(it.value);
      World.floatText(it.x, it.y, "+" + it.value, "#FFD56A");
      return;
    }
    if (it.kind === "power") {
      if (p.weapon >= 5) {
        Game.addRawScore(500);
        World.floatText(p.x, p.y - 20, "+500", "#FFD56A");
      } else {
        p.weapon += 1;
        World.floatText(p.x, p.y - 20, "火力 " + p.weapon, "#3DFFF2");
      }
    } else if (it.kind === "shield") {
      if (p.shields >= 2) {
        Game.addRawScore(200);
        World.floatText(p.x, p.y - 20, "+200", "#FFD56A");
      } else {
        p.shields += 1;
        World.floatText(p.x, p.y - 20, "护盾", "#3DFFF2");
      }
    } else if (it.kind === "heal") {
      p.hp = Math.min(100, p.hp + 30);
      World.floatText(p.x, p.y - 20, "+30", "#8DFFB0");
    } else if (it.kind === "magnet") {
      p.magnetT = CFG.combat.magnetTime + p.magnetBonus;
      World.floatText(p.x, p.y - 20, "磁铁", "#FFD56A");
    } else if (it.kind === "wing") {
      const kind = this.addWing();
      if (!kind) {
        Game.addRawScore(800);
        World.floatText(p.x, p.y - 20, "+800", "#FFD56A");
      } else {
        World.floatText(p.x, p.y - 20, this.wingName(kind) + "僚", "#FF3D8A");
      }
    }
  },
};
