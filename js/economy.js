import {
  BUILDINGS,
  UPGRADES,
  PERMANENT,
  ACHIEVEMENTS,
  SKINS,
  STAGES,
} from "./data.js";
import { fresh, cap, COUNT_LIMIT, LIMIT } from "./state.js";
export const countBuildings = (s) =>
  Object.values(s.run.buildings).reduce((a, b) => a + b, 0);
export const stage = (s) =>
  STAGES.reduce((n, x, i) => (s.run.runBaked >= x[0] ? i : n), 0);
export const unlocked = (s, u) =>
  s.run.runBaked >= u.need &&
  s.run.clicksRun >= u.clicks &&
  s.permanent.goldenCaught >= u.golden;
export const permanentCost = (s, u) =>
  Math.ceil(u.cost * 1.75 ** s.permanent.upgrades[u.id]);
export function production(s, temporary = true) {
  const p = s.permanent.upgrades;
  let g =
    (1 + 0.15 * s.permanent.crustLifetime) *
    (1 + 0.25 * p.oven) *
    (p.tycoon ? 2 : 1) *
    (p.cosmic ? 2 : 1);
  let click = 1.5 ** p.fingers * (p.cosmic ? 2 : 1),
    pct = 0,
    golden = 1 + 0.2 * p.nose;
  const building = {};
  for (const b of BUILDINGS) building[b.id] = 1;
  for (const u of UPGRADES) {
    if (!s.run.upgrades.includes(u.id)) continue;
    if (u.type === "global") g *= u.val;
    if (u.type === "click") click *= u.val;
    if (u.type === "percent") pct += u.val;
    if (u.type === "golden") golden *= u.val;
    if (u.type === "building") building[u.building] *= u.val;
  }
  if (temporary) {
    if (s.run.buffs.frenzy > 0) g *= 7;
    if (s.run.buffs.ad > 0) g *= 2;
    if (s.run.buffs.queue > 0) g *= 2;
  }
  const parts = Object.fromEntries(
    BUILDINGS.map((b) => [b.id, cap(b.prod * building[b.id] * g)]),
  );
  const bps = cap(
    BUILDINGS.reduce((a, b) => a + parts[b.id] * s.run.buildings[b.id], 0),
  );
  return {
    bps,
    click: cap(
      Math.max(1, click + bps * pct) *
        (temporary && s.run.buffs.click > 0 ? 15 : 1),
    ),
    golden,
    parts,
  };
}
// Sum individually rounded prices. A geometric sum rounded once is not equivalent.
export function bulkCost(s, id, n) {
  const b = BUILDINGS.find((x) => x.id === id);
  if (
    !b ||
    !Number.isInteger(n) ||
    n <= 0 ||
    n > COUNT_LIMIT - s.run.buildings[id]
  )
    return Infinity;
  let cost = 0;
  for (let i = 0; i < n; i++) {
    const v = Math.ceil(b.cost * 1.15 ** (s.run.buildings[id] + i));
    if (!Number.isFinite(v) || cost + v > LIMIT) return Infinity;
    cost += v;
  }
  return s.run.discount ? Math.ceil(cost * 0.75) : cost;
}
export function maxAffordable(s, id) {
  let lo = 0,
    hi = COUNT_LIMIT - s.run.buildings[id];
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bulkCost(s, id, mid) <= s.run.batons) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
export const prestigeReward = (s) =>
  Math.floor(Math.sqrt(s.run.runBaked / 1e6));
export function metric(s, key) {
  const p = s.permanent;
  return (
    {
      baked: p.lifetimeBaked,
      clicks: p.clicksLifetime,
      buildings: countBuildings(s),
      golden: p.goldenCaught,
      bps: p.bestBps,
      upgrades: s.run.upgrades.length,
      offline: p.offlineBaked,
      prestige: p.prestigeCount,
      crusts: p.crustLifetime,
      permanent: Object.values(p.upgrades).reduce((a, b) => a + b, 0),
      maxBuy: p.maxBuy,
      skins: p.skins.length,
      quests: p.questsDone,
      balance: s.run.batons,
      chef:
        s.run.buildings.grandma > 0 &&
        s.run.upgrades.includes("maslo") &&
        s.run.goldenRun > 0
          ? 1
          : 0,
      events: p.eventsDone,
    }[key] ?? 0
  );
}
export class Game {
  constructor(state = fresh()) {
    this.s = state;
    this.notices = [];
    this.changed = false;
    this.ensureQuests();
    this.check();
  }
  touch() {
    this.changed = true;
  }
  gain(n) {
    if (!Number.isFinite(n) || n <= 0) return 0;
    const s = this.s;
    s.run.batons = cap(s.run.batons + n);
    s.run.runBaked = cap(s.run.runBaked + n);
    s.permanent.lifetimeBaked = cap(s.permanent.lifetimeBaked + n);
    this.touch();
    return n;
  }
  click() {
    const n = this.gain(production(this.s).click);
    this.s.run.clicksRun++;
    this.s.permanent.clicksLifetime++;
    this.check();
    return n;
  }
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 1);
    this.gain(production(this.s).bps * dt);
    for (const k of Object.keys(this.s.run.buffs))
      this.s.run.buffs[k] = Math.max(0, this.s.run.buffs[k] - dt);
    this.check();
  }
  buy(id, amount = this.s.settings.buyAmount) {
    const s = this.s,
      n = amount === "max" ? maxAffordable(s, id) : amount,
      cost = bulkCost(s, id, n);
    if (n < 1 || !Number.isFinite(cost) || s.run.batons < cost) return false;
    s.run.batons = Math.max(0, s.run.batons - cost);
    s.run.buildings[id] += n;
    s.run.discount = false;
    if (amount === "max") s.permanent.maxBuy = Math.max(s.permanent.maxBuy, n);
    this.check();
    this.touch();
    return true;
  }
  upgrade(id) {
    const u = UPGRADES.find((x) => x.id === id),
      s = this.s;
    if (
      !u ||
      s.run.upgrades.includes(id) ||
      !unlocked(s, u) ||
      s.run.batons < u.cost
    )
      return false;
    s.run.batons -= u.cost;
    s.run.upgrades.push(id);
    this.check();
    this.touch();
    return true;
  }
  permanent(id) {
    const u = PERMANENT.find((x) => x.id === id),
      s = this.s;
    if (!u || s.permanent.upgrades[id] >= u.max) return false;
    const cost = permanentCost(s, u);
    if (s.permanent.crustBalance < cost) return false;
    s.permanent.crustBalance -= cost;
    s.permanent.upgrades[id]++;
    this.check();
    this.touch();
    return true;
  }
  prestige(expectedRunId) {
    const s = this.s,
      n = prestigeReward(s);
    if (n < 1 || expectedRunId !== s.run.id) return 0;
    const base = fresh();
    s.permanent.crustBalance = cap(s.permanent.crustBalance + n);
    s.permanent.crustLifetime = cap(s.permanent.crustLifetime + n);
    s.permanent.prestigeCount++;
    s.permanent.history.push({ kind: "prestige", at: Date.now(), value: n });
    s.permanent.history = s.permanent.history.slice(-30);
    s.run = base.run;
    s.quests = base.quests;
    if (s.permanent.upgrades.spoon) s.run.buildings.spoon = 1;
    this.ensureQuests();
    if (s.permanent.upgrades.starter) this.gain(100);
    this.check();
    this.touch();
    return n;
  }
  golden(roll = Math.random()) {
    const s = this.s;
    s.permanent.goldenCaught++;
    s.run.goldenRun++;
    let kind;
    if (roll < 0.45) {
      s.run.buffs.frenzy = 30;
      kind = "frenzy";
    } else if (roll < 0.75) {
      s.run.buffs.click = 15;
      kind = "clickBuff";
    } else {
      const p = production(s);
      const n = this.gain(Math.max(50, p.bps * 60, p.click * 25));
      kind = { key: "goldenGift", n };
    }
    this.check();
    this.touch();
    return kind;
  }
  offline(now = Date.now()) {
    const s = this.s,
      away = (now - s.lastActiveAt) / 1000;
    s.lastActiveAt = now;
    if (!Number.isFinite(away) || away <= 30) return 0;
    const gain =
      production(s, false).bps *
      Math.min(away, 28800) *
      (s.permanent.upgrades.night ? 0.8 : 0.6);
    this.gain(gain);
    s.permanent.offlineBaked = cap(s.permanent.offlineBaked + gain);
    this.check();
    this.touch();
    return gain;
  }
  check() {
    const s = this.s;
    s.permanent.bestBps = Math.max(
      s.permanent.bestBps,
      production(s, false).bps,
    );
    for (const skin of SKINS)
      if (!s.permanent.skins.includes(skin.id) && skin.test(s)) {
        s.permanent.skins.push(skin.id);
        this.notices.push({ type: "skin", id: skin.id });
        this.touch();
      }
    for (const a of ACHIEVEMENTS)
      if (!s.achievements.includes(a.id) && metric(s, a.metric) >= a.target) {
        s.achievements.push(a.id);
        this.notices.push({ type: "achievement", id: a.id });
        this.touch();
      }
  }
  questMetric(type) {
    return {
      baked: this.s.run.runBaked,
      clicks: this.s.run.clicksRun,
      buildings: countBuildings(this.s),
      golden: this.s.run.goldenRun,
      bps: production(this.s, false).bps,
    }[type];
  }
  makeQuest(lane) {
    const s = this.s,
      n = s.quests.sequence[lane],
      scale = 1.65 ** Math.min(n, 100);
    const types =
      lane === 0
        ? ["clicks"]
        : lane === 1
          ? ["baked"]
          : ["buildings", "bps", "golden"];
    const type = types[n % types.length];
    const target =
      type === "clicks"
        ? Math.ceil(30 * scale)
        : type === "baked"
          ? Math.ceil(500 * scale)
          : type === "buildings"
            ? Math.ceil(5 * scale)
            : type === "golden"
              ? 1 + Math.floor(n / 6)
              : Math.ceil(Math.max(10, production(s, false).bps * 1.4));
    return {
      id: `${s.run.id}:${lane}:${n}`,
      type,
      target,
      start: type === "bps" ? 0 : this.questMetric(type),
      reward: Math.ceil(
        Math.max(25, Math.min(1e12, 25 * scale), production(s, false).bps * 30),
      ),
    };
  }
  ensureQuests() {
    if (this.s.quests.items.length !== 3)
      this.s.quests.items = [0, 1, 2].map((i) => this.makeQuest(i));
  }
  questProgress(q) {
    return Math.max(0, this.questMetric(q.type) - q.start);
  }
  claimQuest(id) {
    const index = this.s.quests.items.findIndex((q) => q.id === id);
    if (index < 0) return 0;
    const q = this.s.quests.items[index];
    if (this.questProgress(q) < q.target) return 0;
    this.gain(q.reward);
    this.s.permanent.questsDone++;
    this.s.quests.sequence[index]++;
    this.s.quests.items[index] = this.makeQuest(index);
    this.check();
    this.touch();
    return q.reward;
  }
  completeEvent(kind) {
    const s = this.s;
    if (kind === "queue") s.run.buffs.queue = 30;
    else if (kind === "grandma") s.run.discount = true;
    else this.gain(Math.max(50, production(s, false).bps * 45));
    s.permanent.eventsDone++;
    s.permanent.history.push({ kind: "event", at: Date.now(), value: 1 });
    s.permanent.history = s.permanent.history.slice(-30);
    this.check();
    this.touch();
  }
}
