const World = {
  player: null,
  bullets: [],
  bulletPool: [],
  enemies: [],
  pickups: [],
  particles: [],
  particlePool: [],
  texts: [],
  beams: [],

  reset() {
    this.bullets.length = 0;
    this.enemies.length = 0;
    this.pickups.length = 0;
    this.particles.length = 0;
    this.texts.length = 0;
    this.beams.length = 0;
    Bosses.current = null;
  },

  fireBullet(spec) {
    if (this.bullets.length >= CFG.combat.bulletCap) {
      const idx = this.bullets.findIndex(function (b) { return !b.friendly; });
      if (idx >= 0) this.recycleBullet(idx);
    }
    const b = this.bulletPool.pop() || {};
    b.x = spec.x;
    b.y = spec.y;
    b.vx = spec.vx;
    b.vy = spec.vy;
    b.r = spec.r == null ? 4 : spec.r;
    b.dmg = spec.dmg || 0;
    b.friendly = !!spec.friendly;
    b.pierce = !!spec.pierce;
    b.homing = !!spec.homing;
    b.bounce = spec.bounce || 0;
    b.decay = spec.decay == null ? 1 : spec.decay;
    b.hits = spec.pierce ? new Set() : null;
    b.life = spec.life == null ? 5 : spec.life;
    b.color = spec.color || "#7AFFF6";
    b.hurt = spec.hurt == null ? 20 : spec.hurt;
    b.fromBoss = !!spec.fromBoss;
    b.vulnApply = !!spec.vulnApply;
    b.alive = true;
    this.bullets.push(b);
  },

  recycleBullet(i) {
    const b = this.bullets.splice(i, 1)[0];
    b.hits = null;
    if (this.bulletPool.length < 500) this.bulletPool.push(b);
  },

  spawnEnemy(type, x) {
    if (this.enemies.length >= 70) return;
    const def = CFG.enemies[type];
    const hp = def.hp * Game.hpMul();
    this.enemies.push({
      type: type,
      x: clamp(x, 36, 504),
      y: -36,
      baseX: clamp(x, 36, 504),
      hp: hp,
      maxHp: hp,
      r: def.r,
      vy: def.vy,
      vx: 0,
      age: 0,
      shootT: 0.45 + Math.random() * 0.4,
      mode: "enter",
      hoverY: 230 + Math.random() * 110,
      hoverT: 0,
      dashT: 1.6,
      wind: 0,
      alive: true,
      flash: 0,
      vuln: 0,
      touchCd: 0,
    });
  },

  spawnPickup(x, y, kind, value) {
    if (this.pickups.length > 36) return;
    this.pickups.push({
      x: x,
      y: y,
      kind: kind,
      value: value || 50,
      vy: kind === "coin" && value === 100 ? 150 : 86,
      alive: true,
    });
  },

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= CFG.combat.particleCap) return;
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 180;
      const p = this.particlePool.pop() || {};
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 0.25 + Math.random() * 0.35;
      p.max = p.life;
      p.color = color;
      p.size = 1.5 + Math.random() * 2.4;
      this.particles.push(p);
    }
  },

  floatText(x, y, text, color) {
    if (this.texts.length > 24) this.texts.shift();
    this.texts.push({ x: x, y: y, text: text, color: color || "#FFD56A", life: 0.7 });
  },

  clearEnemyBullets() {
    for (let i = 0; i < this.bullets.length; i++) {
      if (!this.bullets[i].friendly) this.bullets[i].alive = false;
    }
  },

  clearBossBullets() {
    for (let i = 0; i < this.bullets.length; i++) {
      if (this.bullets[i].fromBoss) this.bullets[i].alive = false;
    }
  },

  updateEnemies(dt) {
    const p = this.player;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.age += dt;
      e.flash = Math.max(0, e.flash - dt);
      e.vuln = Math.max(0, e.vuln - dt);
      e.touchCd = Math.max(0, e.touchCd - dt);
      this.moveEnemy(e, dt, p);
      this.shootEnemy(e, dt, p);
      if (e.y > 1040) e.alive = false;
      if (!e.alive) this.enemies.splice(i, 1);
    }
  },

  moveEnemy(e, dt, p) {
    if (e.type === "E4") {
      e.y += e.vy * dt;
      e.x = clamp(e.baseX + Math.sin(e.age * 2.3) * 78, 30, 510);
      return;
    }
    if (e.type === "E5") {
      if (e.mode === "enter") {
        e.y += e.vy * dt;
        if (e.y >= e.hoverY) {
          e.y = e.hoverY;
          e.mode = "hover";
        }
      } else if (e.mode === "hover") {
        e.hoverT += dt;
        e.x += Math.sin(e.age * 1.4) * 28 * dt;
        if (e.hoverT >= 8) {
          e.mode = "leave";
          e.vy = 260;
        }
      } else {
        e.y += e.vy * dt;
      }
      return;
    }
    if (e.type === "EL") {
      if (e.mode === "enter") {
        e.y += 180 * dt;
        if (e.y >= 150) {
          e.y = 150;
          e.mode = "idle";
        }
        return;
      }
      if (e.mode === "idle") {
        e.y += (155 - e.y) * Math.min(1, dt * 2);
        e.x = clamp(e.x + Math.sin(e.age * 1.3) * 70 * dt, 50, 490);
        e.dashT -= dt;
        if (e.dashT <= 0) {
          e.mode = "wind";
          e.wind = 0.32;
          e.tx = p.x;
          e.ty = clamp(p.y, 200, 760);
        }
      } else if (e.mode === "wind") {
        e.wind -= dt;
        if (e.wind <= 0) {
          e.mode = "dash";
          const a = Math.atan2(e.ty - e.y, e.tx - e.x);
          e.vx = Math.cos(a) * 540;
          e.vy = Math.sin(a) * 540;
          e.dashLen = 0.4;
        }
      } else if (e.mode === "dash") {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.dashLen -= dt;
        if (e.dashLen <= 0) e.mode = "back";
      } else if (e.mode === "back") {
        e.y += (155 - e.y) * Math.min(1, dt * 3);
        e.x += (270 - e.x) * Math.min(1, dt * 2);
        if (Math.abs(e.y - 155) < 10) {
          e.mode = "idle";
          e.dashT = 3;
        }
      }
      e.x = clamp(e.x, 28, 512);
      return;
    }
    e.y += e.vy * dt;
  },

  shootEnemy(e, dt, p) {
    const gap = CFG.enemies[e.type].shoot;
    if (!gap) return;
    if (e.type === "E5" && e.mode !== "hover") return;
    if (e.type === "EL" && (e.mode === "dash" || e.mode === "enter")) return;
    e.shootT -= dt;
    if (e.shootT > 0) return;
    e.shootT = gap;
    const mul = Game.bulletMul();
    const spd = CFG.combat.enemyBullet;
    if (e.type === "E3") {
      for (let i = -2; i <= 2; i++) {
        const a = Math.PI / 2 + i * 0.2;
        this.enemyShot(e.x, e.y + 8, a, 185 * mul * spd, 5, false);
      }
    } else if (e.type === "EL") {
      this.enemyShot(e.x - 12, e.y + 10, Math.PI / 2, 230 * mul * spd, 5, false);
      this.enemyShot(e.x + 12, e.y + 10, Math.PI / 2, 230 * mul * spd, 5, false);
    } else {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      this.enemyShot(e.x, e.y + 6, a, (e.type === "E5" ? 230 : 205) * mul * spd, 5, false);
    }
  },

  enemyShot(x, y, a, speed, r, fromBoss) {
    this.fireBullet({
      x: x,
      y: y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      r: r,
      friendly: false,
      fromBoss: fromBoss,
      color: fromBoss ? "#FFB15A" : "#FF4D8D",
      hurt: 20,
    });
  },

  updateBullets(dt) {
    const p = this.player;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (b.homing) this.homeBullet(b, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.friendly && b.bounce > 0 && (b.x < 10 || b.x > CFG.W - 10)) {
        b.vx *= -1;
        b.x = clamp(b.x, 12, CFG.W - 12);
        b.bounce -= 1;
      }
      if (b.life <= 0 || b.y < -40 || b.y > CFG.H + 40 || b.x < -40 || b.x > CFG.W + 40) b.alive = false;
      if (!b.alive) this.recycleBullet(i);
    }
    if (!p) return;
  },

  homeBullet(b, dt) {
    let best = null;
    let bestD = 1e9;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const d = dist(b.x, b.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    const boss = Bosses.current;
    if (boss && !boss.dead) {
      const d = dist(b.x, b.y, boss.x, boss.y);
      if (d < bestD) best = boss;
    }
    if (!best) return;
    const ang = Math.atan2(best.y - b.y, best.x - b.x);
    const cur = Math.atan2(b.vy, b.vx);
    const turn = clamp(angDiff(ang, cur), -5.2 * dt, 5.2 * dt);
    const sp = Math.hypot(b.vx, b.vy) || 380;
    const na = cur + turn;
    b.vx = Math.cos(na) * sp;
    b.vy = Math.sin(na) * sp;
  },

  collide() {
    const p = this.player;
    if (!p || !p.alive) return;
    const pr = p.focus ? CFG.player.hitFocus / 2 : CFG.player.hit / 2;

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.alive || !b.friendly) continue;
      let hit = false;
      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (!e.alive) continue;
        if (b.hits && b.hits.has(e)) continue;
        if (dist(b.x, b.y, e.x, e.y) <= b.r + e.r) {
          if (b.hits) b.hits.add(e);
          const n = b.hits ? b.hits.size - 1 : 0;
          let dmg = b.dmg * Math.pow(b.decay, n);
          this.damageEnemy(e, dmg);
          if (b.vulnApply) e.vuln = Math.max(e.vuln, 0.2);
          if (!b.pierce) {
            b.alive = false;
            hit = true;
            break;
          }
        }
      }
      if (b.alive && Bosses.current) {
        const hitBoss = Bosses.bulletHit(b);
        if (hitBoss && !b.pierce) b.alive = false;
      }
      if (!b.alive) this.recycleBullet(i);
    }

    const reflect = p.ship === "prism" && p.skillT > 0;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b || !b.alive || b.friendly) continue;
      if (dist(b.x, b.y, p.x, p.y) <= b.r + pr + (reflect ? 10 : 0)) {
        if (reflect) {
          b.friendly = true;
          b.fromBoss = false;
          b.vx *= -1;
          b.vy *= -1;
          b.dmg = 12 * Player.dmgMul();
          b.color = "#E8FFFF";
          b.hurt = 0;
          b.homing = false;
          Sfx.tone(740, 0.05, "square", 0.03, 1.5);
        } else {
          b.alive = false;
          Player.hurt(b.hurt || 15);
          this.recycleBullet(i);
        }
      }
    }

    for (let j = 0; j < this.enemies.length; j++) {
      const e = this.enemies[j];
      if (!e.alive || e.touchCd > 0) continue;
      if (dist(e.x, e.y, p.x, p.y) <= e.r + pr) {
        e.touchCd = 0.45;
        const small = e.type === "E1" || e.type === "E2" || e.type === "E3" || e.type === "E4";
        if (small) this.killEnemy(e);
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        p.x = clamp(p.x + Math.cos(ang) * 36, CFG.player.minX, CFG.player.maxX);
        p.y = clamp(p.y + Math.sin(ang) * 36, CFG.player.minY, CFG.player.maxY);
        Player.hurt(e.type === "E1" ? 35 : 30);
      }
    }

    if (Bosses.current) Bosses.touchPlayer(pr);
  },

  damageEnemy(e, dmg) {
    if (!e.alive) return;
    if (e.vuln > 0) dmg *= 1.2;
    e.hp -= dmg;
    e.flash = 0.08;
    if (e.hp <= 0) this.killEnemy(e);
  },

  killEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    e.hp = 0;
    Game.addKillScore(CFG.enemies[e.type].score, e.x, e.y);
    this.burst(e.x, e.y, e.type === "EL" ? "#FF5A36" : "#FF3D8A", e.type === "EL" ? 16 : 8);
    Sfx.explode();
    this.drop(e);
  },

  drop(e) {
    const r = Math.random();
    if (e.type === "E1") {
      if (r < 0.08) this.spawnPickup(e.x, e.y, "coin", 50);
    } else if (e.type === "E2" || e.type === "E3") {
      if (r < 0.12) this.spawnPickup(e.x, e.y, "coin", 50);
      else if (r < 0.18) this.spawnPickup(e.x, e.y, "power");
    } else if (e.type === "E4" || e.type === "E5") {
      if (r < 0.1) this.spawnPickup(e.x, e.y, "coin", 50);
      else if (r < 0.18) this.spawnPickup(e.x, e.y, Math.random() < 0.5 ? "heal" : "shield");
      if (e.type === "E5" && Math.random() < 0.12) this.spawnPickup(e.x, e.y + 12, "wing");
    } else if (e.type === "EL") {
      this.spawnPickup(e.x, e.y, Math.random() < 0.5 ? "power" : "shield");
      if (Math.random() < 0.55) this.spawnPickup(e.x + 16, e.y, "wing");
      if (Math.random() < 0.35) this.spawnPickup(e.x - 16, e.y + 8, "power");
    }
  },

  updatePickups(dt) {
    const p = this.player;
    if (!p) return;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const it = this.pickups[i];
      const d = dist(it.x, it.y, p.x, p.y);
      if (p.magnetT > 0 && d < CFG.combat.magnetRange && d > 1) {
        it.x += ((p.x - it.x) / d) * 340 * dt;
        it.y += ((p.y - it.y) / d) * 340 * dt;
      } else {
        it.y += it.vy * dt;
      }
      if (d < 34) {
        Player.collect(it);
        this.pickups.splice(i, 1);
        continue;
      }
      if (it.y > CFG.H + 30) this.pickups.splice(i, 1);
    }
  },

  updateFx(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life <= 0) {
        const old = this.particles.splice(i, 1)[0];
        if (this.particlePool.length < 240) this.particlePool.push(old);
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y -= 28 * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].t -= dt;
      if (this.beams[i].t <= 0) this.beams.splice(i, 1);
    }
  },
};
