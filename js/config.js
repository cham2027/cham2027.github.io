// 想调难度，优先改这个文件里的数字。
const CFG = {
  W: 540,
  H: 960,
  player: {
    speed: 340,
    focus: 0.55,
    hit: 18,
    hitFocus: 12,
    maxX: 516,
    minX: 24,
    maxY: 830,
    minY: 50,
    iframe: 0.65,
    reviveIframe: 2,
    shieldIframe: 0.4,
  },
  combat: {
    pulseDmg: 0,
    pulseBoss: 0,
    pulseIframe: 0,
    enemyBullet: 1.25,
    pulseFill: 100 / 28,
    pulseKill: 3,
    pulseCombo: 5,
    skillCd: 12,
    magnetTime: 12,
    magnetRange: 220,
    comboWindow: 2,
    comboCap: 50,
    bulletCap: 400,
    particleCap: 200,
  },
  ships: {
    falcon: {
      name: "游隼",
      blurb: "均衡连射。火力拉高后，弹道更密，还会追着敌人打。",
      skill: "导弹齐射",
      skillDesc: "向前发出 8 枚跟踪小导弹。冷却 12 秒。",
      unlockText: "随时可出击",
    },
    prism: {
      name: "棱镜",
      blurb: "扇形弹幕，覆盖宽，清小兵很顺手。",
      skill: "折光罩",
      skillDesc: "2 秒内免疫伤害，并反弹碰到的敌弹。冷却 12 秒。",
      unlockText: "随时可出击",
    },
    rail: {
      name: "磁轨",
      blurb: "细激光穿透一整列，适合打精英和 Boss。",
      skill: "超载轨道",
      skillDesc: "0.6 秒贯穿屏幕的粗激光。冷却 12 秒。",
      unlockText: "随时可出击",
    },
  },
  shipOrder: ["falcon", "prism", "rail"],
  enemies: {
    E1: { name: "侦察机", hp: 180, vy: 145, r: 14, score: 100, shoot: 0 },
    E2: { name: "枪手", hp: 320, vy: 58, r: 16, score: 200, shoot: 0.85 },
    E3: { name: "散射舰", hp: 400, vy: 70, r: 18, score: 260, shoot: 1.1 },
    E4: { name: "游走者", hp: 360, vy: 64, r: 16, score: 240, shoot: 1.0 },
    E5: { name: "浮游炮台", hp: 520, vy: 88, r: 20, score: 320, shoot: 0.55 },
    EL: { name: "精英·刺蜂", hp: 1500, vy: 0, r: 24, score: 800, shoot: 0.45 },
  },
  chapters: [
    {
      name: "近轨尘埃",
      hp: 1,
      bullet: 1,
      tint: "#10243a",
      boss: "A",
      waves: [
        [{ t: 0, type: "E1", n: 10, every: 0.45, x: "rand" }],
        [
          { t: 0, type: "E2", n: 5, every: 1.2, x: "spread" },
          { t: 0.3, type: "E1", n: 2, every: 0.45, x: "left" },
          { t: 0.3, type: "E1", n: 2, every: 0.45, x: "right" },
        ],
        [{ t: 0, type: "E3", n: 4, every: 1.2, x: "alt" }, { t: 0.6, type: "E4", n: 4, every: 1.2, x: "alt" }],
        [
          { t: 0, type: "E2", n: 5, every: 1.1, x: "spread" },
          { t: 1, type: "E4", n: 3, every: 1.4, x: "spread" },
          { t: 6, type: "EL", n: 1, every: 0, x: "mid" },
        ],
      ],
    },
    {
      name: "日冕轨道",
      hp: 1.45,
      bullet: 1.25,
      tint: "#3a2a12",
      boss: "B",
      waves: [
        [
          { t: 0, type: "E5", n: 2, every: 0.4, x: "spread" },
          { t: 1.2, type: "E1", n: 6, every: 0.45, x: "midband" },
        ],
        [{ t: 0, type: "E3", n: 4, every: 1.2, x: "alt" }],
        [
          { t: 0, type: "E4", n: 4, every: 1.15, x: "spread" },
          { t: 0.5, type: "E2", n: 3, every: 1.3, x: "spread" },
        ],
        [
          { t: 0, type: "E5", n: 2, every: 0.5, x: "spread" },
          { t: 0.8, type: "E3", n: 2, every: 1.4, x: "alt" },
          { t: 5, type: "EL", n: 1, every: 0, x: "mid" },
        ],
      ],
    },
    {
      name: "深渊入口",
      hp: 1.85,
      bullet: 1.4,
      tint: "#2a1038",
      boss: "C",
      waves: [
        [{ t: 0, type: "E4", n: 6, every: 0.85, x: "spread" }],
        [{ t: 0, type: "E5", n: 3, every: 0.7, x: "spread" }],
        [
          { t: 0, type: "E2", n: 3, every: 1.1, x: "spread" },
          { t: 0.4, type: "E3", n: 3, every: 1.15, x: "alt" },
          { t: 0.8, type: "E4", n: 2, every: 1.4, x: "spread" },
        ],
        [
          { t: 0, type: "EL", n: 2, every: 3, x: "alt" },
          { t: 0.4, type: "E1", n: 6, every: 0.4, x: "rand" },
        ],
      ],
    },
  ],
  bosses: {
    A: { name: "棱镜哨戒", hp: 9800, score: 5000, body: 86, weak: 24, homeY: 158 },
    B: { name: "日冕要塞", hp: 14000, score: 8000, outer: 126, inner: 84, pointHp: 480, pointR: 18 },
    C: { name: "深渊之眼", hp: 18000, score: 12000, body: 96, weak: 30, selfDps: 35 },
    mini: { name: "哨戒残响", hp: 4200, score: 4000, body: 78, weak: 22, homeY: 150 },
  },
  cards: [
    { id: "rapid", name: "急射", rarity: "common", desc: "射速 +15%", max: 3 },
    { id: "power", name: "穿甲", rarity: "common", desc: "子弹伤害 +15%", max: 3 },
    { id: "pulse", name: "脉冲过载", rarity: "common", desc: "立刻充满脉冲，之后充能加快 25%", max: 1 },
    { id: "armor", name: "装甲涂层", rarity: "common", desc: "受到的伤害减少 5 点", max: 2 },
    { id: "side", name: "侧翼导弹", rarity: "rare", desc: "每 2 秒自动发射 2 枚侧向导弹", max: 1 },
    { id: "bounce", name: "弹跳光弹", rarity: "rare", desc: "子弹碰到左右边缘会反弹 1 次", max: 1 },
    { id: "revive", name: "应急修复", rarity: "rare", desc: "获得 1 次复活；已有复活则改为治疗 50", max: 1 },
    { id: "focus", name: "焦点校准", rarity: "rare", desc: "集中模式下，击破得分加成提高到 100%", max: 1 },
    { id: "magnet", name: "吸积磁场", rarity: "rare", desc: "之后捡到的磁铁多持续 6 秒，并立刻获得磁铁", max: 1 },
    { id: "cd", name: "过载反应", rarity: "legend", desc: "主动技能冷却缩短 30%", max: 1 },
    { id: "protocol", name: "裂空协议", rarity: "legend", desc: "火力至少升到 3 级；已经达到则伤害再 +20%", max: 1 },
    { id: "combo", name: "连击共鸣", rarity: "legend", desc: "连击达到 20 后，伤害 +25%，断连则消失", max: 1 },
  ],
};

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function rand(a, b) {
  return a + Math.random() * (b - a);
}
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
