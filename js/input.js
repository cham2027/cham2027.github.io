const Input = {
  keys: {},
  dragging: false,
  dragId: null,
  pointers: new Set(),
  aimX: 270,
  aimY: 760,
  focusBtn: false,
  focusKey: false,
  bombEdge: false,
  skillEdge: false,
  pauseEdge: false,
  focusDown() {
    return this.focusKey || this.focusBtn || this.pointers.size >= 2;
  },
  pointerPos(e) {
    const rect = document.getElementById("cv").getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CFG.W,
      y: ((e.clientY - rect.top) / rect.height) * CFG.H,
    };
  },
  bind(stage) {
    const self = this;
    stage.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button, .card, .screen")) return;
      if (Game.screen !== "play") return;
      self.pointers.add(e.pointerId);
      const p = self.pointerPos(e);
      if (self.dragId == null) {
        self.dragId = e.pointerId;
        self.dragging = true;
        self.aimX = p.x;
        self.aimY = p.y;
      }
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    });
    stage.addEventListener("pointermove", function (e) {
      if (e.pointerId !== self.dragId) return;
      const p = self.pointerPos(e);
      self.aimX = p.x;
      self.aimY = p.y;
    });
    function up(e) {
      self.pointers.delete(e.pointerId);
      if (e.pointerId === self.dragId) {
        self.dragId = null;
        self.dragging = false;
      }
    }
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);

    window.addEventListener("keydown", function (e) {
      const k = e.key.toLowerCase();
      self.keys[k] = true;
      if (e.key === "Shift") self.focusKey = true;
      if (e.key === " " || k === "j") {
        e.preventDefault();
        self.bombEdge = true;
      }
      if (k === "k") self.skillEdge = true;
      if (e.key === "Escape" || k === "p") self.pauseEdge = true;
      if (Game.screen === "levelup" && (k === "1" || k === "2" || k === "3")) {
        Game.chooseCard(Number(k) - 1);
      }
    });
    window.addEventListener("keyup", function (e) {
      self.keys[e.key.toLowerCase()] = false;
      if (e.key === "Shift") self.focusKey = false;
    });
    window.addEventListener("blur", function () {
      self.keys = {};
      self.focusKey = false;
      self.dragging = false;
      self.dragId = null;
      self.pointers.clear();
    });
  },
  eatEdges() {
    const b = this.bombEdge;
    const s = this.skillEdge;
    const p = this.pauseEdge;
    this.bombEdge = false;
    this.skillEdge = false;
    this.pauseEdge = false;
    return { bomb: b, skill: s, pause: p };
  },
};
