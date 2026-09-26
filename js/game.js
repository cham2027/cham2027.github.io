const Game = {
  screen: "menu",
  mode: "campaign",
  chapter: 1,
  wave: 0,
  phase: "waves",
  time: 0,
  score: 0,
  combo: 0,
  comboT: 0,
  bestCombo: 0,
  kills: 0,
  shakeT: 0,
  shakeOn: true,
  banner: "",
  bannerT: 0,
  grace: 0,
  levelupAcc: 0,
  levelReason: "",
  cards: [],
  eliteMark: 0,
  miniMark: 0,
  bonusT: 0,
  coinT: 0,
  healT: 0,
  doPayout: false,
  payout: 0,
  deathT: 0,
  saved: false,
  record: false,
  shipPick: "falcon",
  hangarPlay: false,
  showcaseShip: "falcon",
  last: 0,

  hpMul() {
    if (this.mode === "endless") return Math.pow(1.06, Math.floor(this.time / 25));
    return CFG.chapters[this.chapter - 1].hp;
  },

  bulletMul() {
    if (this.mode === "endless") return 1;
    return CFG.chapters[this.chapter - 1].bullet;
  },

  shake(t) {
    if (this.shakeOn) this.shakeT = Math.max(this.shakeT, t);
  },

  addRawScore(n) {
    this.score += Math.round(n);
  },

  addKillScore(base, x, y) {
    this.kills += 1;
    this.combo += 1;
    this.comboT = CFG.combat.comboWindow;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    let mult = 1 + Math.min(this.combo, CFG.combat.comboCap) * 0.02;
    const p = World.player;
    if (p && p.focus) mult *= p.up.focus ? 2 : 1.5;
    const gain = Math.round(base * mult);
    this.score += gain;
    Player.gainPulse(CFG.combat.pulseKill);
    if (this.combo > 0 && this.combo % 10 === 0) Player.gainPulse(CFG.combat.pulseCombo);
    if (x != null) World.floatText(x, y, "+" + gain, "#FFD56A");
  },

  show(name) {
    this.screen = name;
    const map = {
      menu: "screen-menu",
      mode: "screen-mode",
      hangar: "screen-hangar",
      scores: "screen-scores",
      settings: "screen-settings",
      levelup: "screen-levelup",
      pause: "screen-pause",
      result: "screen-result",
    };
    Object.keys(map).forEach(function (k) {
      document.getElementById(map[k]).classList.add("hidden");
    });
    if (map[name]) document.getElementById(map[name]).classList.remove("hidden");
    if (name === "menu") {
      const side = document.getElementById("side-chapter");
      if (side) side.textContent = "竖版科幻空战";
    }
    const hud = name === "play" || name === "pause";
    document.getElementById("hud").classList.toggle("hidden", !hud);
  },

  boot() {
    Save.load();
    Sfx.on = Save.data.sound;
    this.shakeOn = Save.data.shake;
    this.shipPick = CFG.ships[Save.data.lastShip] ? Save.data.lastShip : "falcon";
    this.showcaseShip = this.shipPick;
    Render.init();
    Input.bind(document.getElementById("stage"));
    this.bindUI();
    this.layout();
    window.addEventListener("resize", function () { Game.layout(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && Game.screen === "play") Game.togglePause();
    });
    this.refreshMeta();
    this.show("menu");
    requestAnimationFrame(function (t) { Game.loop(t); });
  },

  layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wide = vw >= 540 + 440;
    const availW = wide ? vw - 480 : vw - 8;
    const scale = Math.min(availW / 540, (vh - 8) / 960);
    const frame = document.getElementById("frame");
    frame.style.width = 540 * scale + "px";
    frame.style.height = 960 * scale + "px";
    document.getElementById("stage").style.transform = "scale(" + scale + ")";
    document.getElementById("layout").classList.toggle("wide", wide);
    const cv = document.getElementById("cv");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (cv._dpr !== dpr) {
      cv._dpr = dpr;
      cv.width = 540 * dpr;
      cv.height = 960 * dpr;
    }
  },

  bindUI() {
    const q = function (id) { return document.getElementById(id); };
    const click = function (id, fn) {
      q(id).addEventListener("click", function (e) {
        e.currentTarget.blur();
        Sfx.arm();
        Sfx.ui();
        fn();
      });
    };
    click("go-start", function () { Game.openMode(); });
    click("go-hangar", function () { Game.openHangar(false); });
    click("go-scores", function () { Game.openScores(); });
    click("go-settings", function () { Game.openSettings(); });
    click("mode-campaign", function () { Game.mode = "campaign"; Game.openHangar(true); });
    click("mode-endless", function () { Game.mode = "endless"; Game.openHangar(true); });
    click("mode-back", function () { Game.show("menu"); });
    click("ship-prev", function () { Game.shiftShip(-1); });
    click("ship-next", function () { Game.shiftShip(1); });
    click("ship-go", function () { Game.confirmShip(); });
    click("hangar-back", function () { Game.show(Game.hangarPlay ? "mode" : "menu"); });
    click("scores-back", function () { Game.show("menu"); });
    click("settings-back", function () { Game.show("menu"); });
    click("toggle-sound", function () { Game.flipSound(); });
    click("toggle-shake", function () { Game.flipShake(); });
    click("resume", function () { Game.show("play"); });
    click("restart", function () { Game.startRun(); });
    click("pause-menu", function () { Game.show("menu"); Game.refreshMeta(); });
    click("btn-pause", function () { Game.togglePause(); });
    click("result-next", function () { Game.nextChapter(); });
    click("result-again", function () { Game.startRun(); });
    click("result-menu", function () {
      if (Game.levelReason === "chapter" || Game.screen === "result") Game.saveScore();
      Game.show("menu");
      Game.refreshMeta();
    });
    q("btn-bomb").addEventListener("click", function (e) {
      e.stopPropagation();
      e.currentTarget.blur();
      if (Game.screen === "play") Player.bomb();
    });
    q("btn-skill").addEventListener("click", function (e) {
      e.stopPropagation();
      e.currentTarget.blur();
      if (Game.screen === "play") Player.skill();
    });
    const focusBtn = q("btn-focus");
    focusBtn.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      e.preventDefault();
      Input.focusBtn = true;
      focusBtn.classList.add("held");
    });
    window.addEventListener("pointerup", function () {
      Input.focusBtn = false;
      focusBtn.classList.remove("held");
    });
  },

  loop(ts) {
    if (!this.last) this.last = ts;
    let dt = (ts - this.last) / 1000;
    this.last = ts;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    this.step(dt);
    Render.tick(dt);
    Render.draw();
    this.paintHud();
    requestAnimationFrame(function (t) { Game.loop(t); });
  },

  step(dt) {
    Sfx.tick(dt);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.bannerT = Math.max(0, this.bannerT - dt);
    const edge = Input.eatEdges();
    if (edge.pause) this.togglePause();
    if (this.screen !== "play") return;

    if (this.phase === "dying") {
      this.deathT -= dt;
      World.updateFx(dt);
      if (this.deathT <= 0) this.showResult("dead");
      return;
    }

    this.time += dt;
    if (this.grace > 0) this.grace -= dt;
    if (this.combo > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }

    Player.update(dt);
    if (edge.bomb) Player.bomb();
    if (edge.skill) Player.skill();
    if (!World.player.alive) return;

    if (this.phase === "waves") {
      if (this.mode === "campaign") Waves.update(dt);
      else Waves.updateEndless(dt);
    } else if (this.phase === "boss") {
      Bosses.update(dt);
    } else if (this.phase === "bonus") {
      this.updateBonus(dt);
    }

    World.updateEnemies(dt);
    World.updateBullets(dt);
    World.collide();
    Bosses.hazardHit();
    World.enemies = World.enemies.filter(function (e) { return e.alive; });
    World.updatePickups(dt);
    World.updateFx(dt);

    if (!World.player.alive) return;
    this.afterCombat(dt);
  },

  afterCombat(dt) {
    if (this.phase !== "waves" || this.screen !== "play") return;
    if (this.mode === "endless") {
      const miniDue = this.time < 120 ? 0 : 1 + Math.floor((this.time - 120) / 150);
      if (miniDue > this.miniMark && this.grace <= 0) {
        this.miniMark = miniDue;
        this.phase = "boss";
        Bosses.spawn("mini");
        this.banner = Bosses.current ? Bosses.current.name : "";
        this.bannerT = 1.3;
        return;
      }
      const eliteDue = this.time < 50 ? 0 : 1 + Math.floor((this.time - 50) / 70);
      if (eliteDue > this.eliteMark && this.grace <= 0) {
        this.eliteMark = eliteDue;
        World.spawnEnemy("EL", 200 + Math.random() * 140);
      }
      const pickGap = this.firstPick ? 35 : 25;
      this.levelupAcc += dt;
      if (this.levelupAcc >= pickGap && this.phase === "waves") {
        this.levelupAcc = 0;
        this.firstPick = true;
        this.openLevelup("endless");
      }
      return;
    }
    if (this.grace <= 0 && Waves.done && World.enemies.length === 0) {
      if (this.wave < 3) this.openLevelup("wave");
      else this.openLevelup("preboss");
    }
  },

  updateBonus(dt) {
    this.bonusT -= dt;
    this.coinT -= dt;
    this.healT -= dt;
    if (this.coinT <= 0) {
      this.coinT = 0.14;
      World.spawnPickup(rand(40, 500), -12, "coin", 100);
    }
    if (this.healT <= 0) {
      this.healT = 1.7;
      World.spawnPickup(rand(80, 460), -12, "heal");
    }
    if (this.bonusT <= 0) this.finishBonus();
  },

  finishBonus() {
    if (this.phase !== "bonus") return;
    if (this.doPayout) {
      const p = World.player;
      this.payout = Math.round(p.hp) * 10 + Math.round((p.pulse / 100) * 300);
      this.score += this.payout;
      const before = Save.data.cleared;
      Save.data.cleared = Math.max(before, this.chapter);
      Save.store();
      this.justUnlocked = "";
      if (this.chapter === 1 && before < 1) this.justUnlocked = "第 1 章已记入进度";
      if (this.chapter === 2 && before < 2) this.justUnlocked = "第 2 章已记入进度";
      if (this.chapter >= 3) this.showResult("victory");
      else this.showResult("chapter");
    } else {
      this.phase = "waves";
      this.grace = 0.5;
      this.banner = "继续突入";
      this.bannerT = 1;
    }
  },

  onBossDown(mini) {
    this.phase = "bonus";
    this.bonusT = 8;
    this.coinT = 0;
    this.healT = 1.2;
    this.doPayout = !mini;
    World.clearEnemyBullets();
    this.banner = "收分走廊";
    this.bannerT = 1.2;
  },

  killPlayer() {
    if (this.phase === "dying") return;
    this.where = this.phase;
    this.phase = "dying";
    this.deathT = 0.85;
    const p = World.player;
    if (p) World.burst(p.x, p.y, "#3DFFF2", 26);
    Sfx.explode();
  },

  startRun() {
    this.score = 0;
    this.combo = 0;
    this.comboT = 0;
    this.bestCombo = 0;
    this.kills = 0;
    this.time = 0;
    this.chapter = 1;
    this.wave = 0;
    this.phase = "waves";
    this.grace = 0.8;
    this.levelupAcc = 0;
    this.firstPick = false;
    this.eliteMark = 0;
    this.miniMark = 0;
    this.payout = 0;
    this.saved = false;
    this.record = false;
    this.justUnlocked = "";
    World.reset();
    World.player = Player.make(this.shipPick);
    Save.data.lastShip = this.shipPick;
    Save.store();
    if (this.mode === "campaign") Waves.start(1, 0);
    else Waves.resetEndless();
    this.banner = this.mode === "endless" ? "无尽突入" : CFG.chapters[0].name;
    this.bannerT = 1.6;
    this.show("play");
    this.paintSide();
  },

  nextChapter() {
    this.chapter += 1;
    this.wave = 0;
    this.phase = "waves";
    this.grace = 0.8;
    const p = World.player;
    p.hp = 100;
    p.pulse = Math.max(p.pulse, 40);
    p.iframe = 1.2;
    p.x = 270;
    p.y = 760;
    p.alive = true;
    World.reset();
    World.player = p;
    Waves.start(this.chapter, this.wave);
    this.banner = CFG.chapters[this.chapter - 1].name;
    this.bannerT = 1.5;
    this.show("play");
    this.paintSide();
  },

  beginBoss() {
    this.phase = "boss";
    Bosses.spawn(CFG.chapters[this.chapter - 1].boss);
    this.banner = Bosses.current.name;
    this.bannerT = 1.5;
    this.show("play");
  },

  openLevelup(reason) {
    this.levelReason = reason;
    this.cards = Upgrades.roll();
    const box = document.getElementById("cards");
    box.innerHTML = "";
    const self = this;
    this.cards.forEach(function (card, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card " + card.rarity;
      btn.innerHTML = "<div class='tag'>" + Upgrades.rarityName(card.rarity) + " · " + (i + 1) + "</div><h3>" + card.name + "</h3><p>" + card.desc + "</p>";
      btn.addEventListener("click", function () { self.chooseCard(i); });
      box.appendChild(btn);
    });
    this.show("levelup");
  },

  chooseCard(index) {
    if (this.screen !== "levelup") return;
    const card = this.cards[index];
    if (!card) return;
    Upgrades.apply(card);
    Sfx.ui();
    if (this.levelReason === "wave") {
      this.wave += 1;
      Waves.start(this.chapter, this.wave);
      this.phase = "waves";
      this.grace = 0.4;
      this.show("play");
    } else if (this.levelReason === "preboss") {
      this.beginBoss();
    } else {
      this.phase = "waves";
      this.show("play");
    }
  },

  togglePause() {
    if (this.screen === "play") this.show("pause");
    else if (this.screen === "pause") this.show("play");
  },

  showResult(kind) {
    if (kind === "chapter") {
      this.saved = false;
      this.record = this.score > Save.best("campaign");
      this.levelReason = "chapter";
    } else {
      this.saveScore();
    }
    const title = document.getElementById("result-title");
    const kicker = document.getElementById("result-kicker");
    const lines = document.getElementById("result-lines");
    const extra = document.getElementById("result-extra");
    document.getElementById("result-score").textContent = Math.round(this.score).toLocaleString("zh-CN");
    const again = document.getElementById("result-again");
    const next = document.getElementById("result-next");
    next.classList.add("hidden");
    again.classList.remove("hidden");
    if (kind === "victory") {
      kicker.textContent = "全通关";
      title.textContent = "深渊退散";
    } else if (kind === "chapter") {
      kicker.textContent = "第 " + this.chapter + " 章攻破";
      title.textContent = CFG.chapters[this.chapter - 1].name;
      next.classList.remove("hidden");
      again.classList.add("hidden");
    } else {
      kicker.textContent = this.mode === "endless" ? "无尽结束" : "战机坠毁";
      title.textContent = "本局结算";
    }
    const bits = [];
    bits.push("击破 " + this.kills);
    bits.push("最高连击 " + this.bestCombo);
    if (this.mode === "endless") bits.push("存活 " + this.formatTime(this.time));
    else if (this.where === "boss" || this.where === "bonus") bits.push("第 " + this.chapter + " 章 · Boss");
    else bits.push("第 " + this.chapter + " 章 · 波次 " + (this.wave + 1));
    if (this.payout) bits.push("耐久与脉冲结算 +" + this.payout);
    if (this.record) bits.push("刷新了本机纪录");
    lines.innerHTML = bits.map(function (t) { return "<li>" + t + "</li>"; }).join("");
    extra.textContent = this.justUnlocked || "";
    this.show("result");
  },

  saveScore() {
    if (this.saved) return null;
    this.saved = true;
    const mode = this.mode === "endless" ? "endless" : "campaign";
    const res = Save.submit(mode, this.score);
    this.record = res.record;
    return res;
  },

  formatTime(t) {
    const s = Math.max(0, Math.floor(t));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
  },

  paintHud() {
    const banner = document.getElementById("banner");
    if (this.bannerT > 0 && (this.screen === "play" || this.screen === "pause")) {
      banner.textContent = this.banner;
      banner.style.opacity = String(Math.min(1, this.bannerT));
    } else banner.style.opacity = "0";
    if (this.screen !== "play" && this.screen !== "pause") return;
    const p = World.player;
    if (!p) return;
    document.getElementById("score").textContent = Math.round(this.score).toLocaleString("zh-CN");
    document.getElementById("combo").textContent = this.combo >= 2 ? this.combo + " 连击" : "";
    document.getElementById("hpbar").style.width = clamp(p.hp, 0, 100) + "%";
    document.getElementById("stage").classList.toggle("danger", p.hp > 0 && p.hp <= 30);
    let shields = "";
    for (let i = 0; i < p.shields; i++) shields += "盾 ";
    document.getElementById("shields").textContent = shields;
    document.getElementById("lives").textContent = p.revives > 0 ? "复活 1" : "";
    const pulsePct = Math.floor(p.pulse);
    document.getElementById("bomb-count").textContent = pulsePct + "%";
    document.getElementById("pulse-fill").style.width = pulsePct + "%";
    document.getElementById("btn-bomb").classList.toggle("ready", p.pulse >= 100);
    const wingTxt = p.wings.length ? " · 僚机 " + p.wings.length + "/4" : "";
    document.getElementById("weapon-lv").textContent = "火力 Lv." + p.weapon + wingTxt;
    const ship = CFG.ships[p.ship];
    document.getElementById("skill-name").textContent = ship.skill;
    const cd = document.getElementById("skill-cd");
    const btn = document.getElementById("btn-skill");
    if (p.skillCd > 0) {
      cd.textContent = p.skillCd.toFixed(1) + "s";
      btn.classList.remove("ready");
    } else {
      cd.textContent = "就绪";
      btn.classList.add("ready");
    }
    const boss = Bosses.current;
    const box = document.getElementById("bossbox");
    const label = document.getElementById("chapter-label");
    if (boss) {
      box.classList.remove("hidden");
      label.classList.add("hidden");
      document.getElementById("bossname").textContent = boss.name;
      const ratio = boss.maxHp ? boss.hp / boss.maxHp : 0;
      const segs = document.querySelectorAll("#segs span");
      for (let i = 0; i < segs.length; i++) {
        const start = i / 3;
        const fill = clamp((ratio - start) * 3, 0, 1);
        let bar = segs[i].querySelector("i");
        if (!bar) {
          bar = document.createElement("i");
          segs[i].appendChild(bar);
        }
        bar.style.width = fill * 100 + "%";
      }
    } else {
      box.classList.add("hidden");
      label.classList.remove("hidden");
      if (this.mode === "endless") label.textContent = "无尽  " + this.formatTime(this.time);
      else label.textContent = "第 " + this.chapter + " 章 · " + CFG.chapters[this.chapter - 1].name;
    }
    document.getElementById("btn-focus").classList.toggle("held", !!p.focus);
  },

  paintSide() {
    const el = document.getElementById("side-chapter");
    if (this.mode === "endless") el.textContent = "无尽模式";
    else el.textContent = "第 " + this.chapter + " 章 · " + CFG.chapters[this.chapter - 1].name;
  },

  openMode() {
    document.getElementById("mode-clear").textContent = "进度 " + Save.data.cleared + "/3";
    document.getElementById("mode-best").textContent = "最高分 " + Save.best("endless").toLocaleString("zh-CN");
    this.show("mode");
  },

  openHangar(play) {
    this.hangarPlay = play;
    this.renderHangar();
    this.show("hangar");
  },

  shiftShip(dir) {
    const order = CFG.shipOrder;
    let i = order.indexOf(this.shipPick);
    i = (i + dir + order.length) % order.length;
    this.shipPick = order[i];
    this.showcaseShip = this.shipPick;
    this.renderHangar();
  },

  renderHangar() {
    const id = this.shipPick;
    const ship = CFG.ships[id];
    document.getElementById("ship-name").textContent = ship.name;
    document.getElementById("ship-blurb").textContent = ship.blurb;
    document.getElementById("ship-skill").textContent = ship.skill + "：" + ship.skillDesc;
    document.getElementById("ship-unlock").textContent = ship.unlockText;
    document.getElementById("ship-lock").classList.add("hidden");
    const go = document.getElementById("ship-go");
    if (!this.hangarPlay) {
      go.classList.add("hidden");
    } else {
      go.classList.remove("hidden");
      go.disabled = false;
      go.textContent = "出击";
    }
  },

  confirmShip() {
    if (!this.hangarPlay) return;
    this.startRun();
  },

  openScores() {
    this.fillList("list-campaign", Save.data.scores.campaign);
    this.fillList("list-endless", Save.data.scores.endless);
    this.show("scores");
  },

  fillList(id, list) {
    const el = document.getElementById(id);
    if (!list || !list.length) {
      el.innerHTML = "<li class='empty'>暂无纪录</li>";
      return;
    }
    el.innerHTML = list.map(function (row) {
      return "<li>" + row.score.toLocaleString("zh-CN") + " · " + row.date + "</li>";
    }).join("");
  },

  openSettings() {
    this.paintSettings();
    this.show("settings");
  },

  paintSettings() {
    document.getElementById("toggle-sound").textContent = "音效：" + (Sfx.on ? "开" : "关");
    document.getElementById("toggle-shake").textContent = "震动：" + (this.shakeOn ? "开" : "关");
  },

  flipSound() {
    Sfx.on = !Sfx.on;
    Save.data.sound = Sfx.on;
    Save.store();
    this.paintSettings();
  },

  flipShake() {
    this.shakeOn = !this.shakeOn;
    Save.data.shake = this.shakeOn;
    Save.store();
    this.paintSettings();
  },

  refreshMeta() {
    this.paintSide();
  },
};

Game.boot();
