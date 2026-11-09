import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Game,
  production,
  bulkCost,
  maxAffordable,
  prestigeReward,
  permanentCost,
} from "../js/economy.js";
import {
  fresh,
  validate,
  encode,
  decode,
  migrateLegacy,
  LIMIT,
} from "../js/state.js";
import { BUILDINGS, PERMANENT, ACHIEVEMENTS, UPGRADES } from "../js/data.js";
import { MESSAGES, NEWS } from "../js/i18n.js";
const rich = () => {
  const g = new Game();
  g.gain(1e16);
  return g;
};
test("first click gives exactly one loaf and lifetime/run counters", () => {
  const g = new Game();
  assert.equal(g.click(), 1);
  assert.equal(g.s.run.batons, 1);
  assert.equal(g.s.permanent.clicksLifetime, 1);
});
for (const amount of [1, 10, 100])
  test(`bulk ×${amount} equals sum of individually rounded prices for all buildings`, () => {
    const g = rich();
    for (const b of BUILDINGS) {
      g.s.run.buildings[b.id] = 7;
      const expected = Array.from({ length: amount }, (_, i) =>
        Math.ceil(b.cost * 1.15 ** (7 + i)),
      ).reduce((a, b) => a + b, 0);
      assert.equal(bulkCost(g.s, b.id, amount), expected);
      g.s.run.batons = expected * 2;
      const balance = g.s.run.batons;
      assert.ok(g.buy(b.id, amount));
      assert.equal(g.s.run.buildings[b.id], 7 + amount);
      assert.equal(g.s.run.batons, balance - expected);
    }
  });
test("MAX is maximal, refuses zero, records largest batch and cannot overspend", () => {
  const g = new Game();
  assert.equal(maxAffordable(g.s, "spoon"), 0);
  assert.equal(g.buy("spoon", "max"), false);
  g.gain(1e12);
  const n = maxAffordable(g.s, "spoon");
  assert.ok(n >= 100);
  assert.ok(bulkCost(g.s, "spoon", n) <= g.s.run.batons);
  assert.ok(bulkCost(g.s, "spoon", n + 1) > g.s.run.batons);
  assert.ok(g.buy("spoon", "max"));
  assert.equal(g.s.permanent.maxBuy, n);
  assert.ok(g.s.run.batons >= 0);
});
test("discount applies to exactly one successful purchase, MAX includes discount", () => {
  const g = new Game();
  g.s.run.discount = true;
  assert.equal(g.buy("spoon"), false);
  assert.equal(g.s.run.discount, true);
  g.gain(12);
  assert.equal(bulkCost(g.s, "spoon", 1), 12);
  assert.equal(maxAffordable(g.s, "spoon"), 1);
  assert.ok(g.buy("spoon"));
  assert.equal(g.s.run.discount, false);
});
test("invalid bulk arguments cannot mutate economy", () => {
  const g = rich(),
    before = structuredClone(g.s);
  for (const n of [-1, 0, NaN, Infinity, 1.2, 10001])
    assert.equal(g.buy("spoon", n), false);
  assert.equal(g.buy("missing", 1), false);
  assert.deepEqual(g.s, before);
});
for (const [baked, n] of [
  [999999, 0],
  [1e6, 1],
  [4e6, 2],
  [9e6, 3],
  [16e6, 4],
])
  test(`prestige ${baked} -> ${n}`, () => {
    const g = new Game();
    g.gain(baked);
    assert.equal(prestigeReward(g.s), n);
  });
test("prestige is one transaction; only run data resets, stale confirmation cannot reward twice", () => {
  const g = rich();
  g.s.permanent.upgrades.starter = 1;
  g.s.permanent.upgrades.spoon = 1;
  g.s.settings.lang = "en";
  g.s.run.buffs.frenzy = 20;
  g.s.run.upgrades.push("maslo");
  g.s.run.buildings.grandma = 20;
  g.s.permanent.goldenCaught = 10;
  g.check();
  const original = structuredClone(g.s),
    id = g.s.run.id,
    n = prestigeReward(g.s);
  assert.equal(g.prestige(id), n);
  assert.equal(g.prestige(id), 0);
  assert.equal(g.s.permanent.prestigeCount, 1);
  assert.equal(g.s.permanent.crustLifetime, n);
  assert.equal(g.s.run.batons, 100);
  assert.equal(g.s.run.buildings.spoon, 1);
  assert.equal(g.s.run.buildings.grandma, 0);
  assert.deepEqual(g.s.run.upgrades, []);
  assert.equal(g.s.run.buffs.frenzy, 0);
  assert.ok(original.achievements.every((id) => g.s.achievements.includes(id)));
  assert.equal(g.s.settings.lang, "en");
  assert.ok(g.s.permanent.skins.includes("golden"));
  assert.notEqual(g.s.quests.items[0].id, original.quests.items[0].id);
});
test("five prestige cycles retain exact crust bonus and remain finite", () => {
  const g = new Game();
  for (let i = 0; i < 5; i++) {
    g.gain(4e6);
    assert.equal(g.prestige(g.s.run.id), 2);
    g.s.run.buildings.grandma = 1;
    assert.equal(production(g.s, false).bps, 1 + 0.15 * (i + 1) * 2);
  }
  assert.equal(g.s.permanent.prestigeCount, 5);
  assert.ok(g.s.achievements.includes("prestige5"));
});
test("permanent ranks cost more, respect caps and cannot be bought twice for free", () => {
  const g = new Game();
  g.s.permanent.crustBalance = 1000;
  g.s.permanent.crustLifetime = 1000;
  for (const u of PERMANENT) {
    let previous = 0;
    for (let i = 0; i < u.max; i++) {
      const price = permanentCost(g.s, u);
      assert.ok(price > previous);
      previous = price;
      assert.ok(g.permanent(u.id));
    }
    assert.equal(g.permanent(u.id), false);
  }
});
test("all 21 upgrades are reachable, apply effects once and increase useful outputs", () => {
  const g = rich();
  g.s.run.clicksRun = 100;
  g.s.permanent.goldenCaught = 1;
  g.s.run.buildings.grandma = 10;
  g.s.run.buildings.oven = 10;
  const initial = production(g.s);
  for (const u of UPGRADES) {
    assert.ok(g.upgrade(u.id), u.id);
    assert.equal(g.upgrade(u.id), false);
  }
  const p = production(g.s);
  assert.ok(p.bps > initial.bps);
  assert.ok(p.click > initial.click);
  assert.ok(p.golden > initial.golden);
});
test("golden effects do not stack duration; gift contributes to all totals", () => {
  const g = new Game();
  g.golden(0.1);
  assert.equal(g.s.run.buffs.frenzy, 30);
  g.tick(1);
  g.golden(0.1);
  assert.equal(g.s.run.buffs.frenzy, 30);
  g.golden(0.6);
  assert.equal(g.s.run.buffs.click, 15);
  const before = g.s.run.batons;
  g.golden(0.9);
  assert.ok(g.s.run.batons >= before + 50);
  assert.equal(g.s.permanent.goldenCaught, 4);
});
test("offline excludes temporary multipliers, caps 8h, pays once and rejects clock rollback", () => {
  const g = new Game();
  g.s.run.buildings.grandma = 10;
  g.s.run.buffs.frenzy = 30;
  g.s.run.buffs.ad = 180;
  const now = Date.now();
  g.s.lastActiveAt = now - 24 * 3600000;
  assert.equal(g.offline(now), 10 * 28800 * 0.6);
  assert.equal(g.offline(now), 0);
  assert.equal(g.offline(now - 1000), 0);
  g.s.lastActiveAt = now - 3600000;
  g.s.permanent.upgrades.night = 1;
  assert.equal(g.offline(now), 10 * 3600 * 0.8);
});
test("quests rotate and persist, stale claim cannot grant twice", () => {
  const g = new Game(),
    q = g.s.quests.items[0];
  for (let i = 0; i < 30; i++) g.click();
  assert.equal(g.claimQuest(q.id), q.reward);
  assert.equal(g.claimQuest(q.id), 0);
  assert.equal(g.s.permanent.questsDone, 1);
  const loaded = new Game(decode(encode(g.s)));
  assert.notEqual(loaded.s.quests.items[0].id, q.id);
  assert.equal(loaded.s.quests.items.length, 3);
});
test("achievements and skins are awarded once", () => {
  const g = rich();
  g.check();
  const before = [...g.s.achievements];
  g.check();
  assert.deepEqual(g.s.achievements, before);
  assert.equal(new Set(before).size, before.length);
  assert.equal(ACHIEVEMENTS.length, 42);
});
test("large numbers stay finite and overflow is capped", () => {
  const g = new Game();
  g.gain(1e100);
  g.gain(1e100);
  assert.equal(g.s.run.batons, LIMIT);
  g.gain(NaN);
  g.tick(Infinity);
  assert.ok(Number.isFinite(g.s.run.batons));
  g.s.run.buildings.cosmos = 10000;
  assert.ok(Number.isFinite(production(g.s).bps));
  assert.equal(g.buy("cosmos", "max"), false);
});
test("legacy migration preserves all building IDs, settings, achievements and offline timestamp", () => {
  const old = {
    butter: 42,
    total: 1000,
    clicks: 100,
    golden: 3,
    counts: BUILDINGS.map((_, i) => i),
    ups: ["maslo", "bad"],
    ach: ["a1", "a2"],
    sound: false,
    last: Date.now() - 100000,
  };
  const s = migrateLegacy(old);
  assert.equal(s.run.buildings.cosmos, 9);
  assert.deepEqual(s.run.upgrades, ["maslo"]);
  assert.equal(s.permanent.lifetimeBaked, 1000);
  assert.equal(s.lastActiveAt, old.last);
  assert.equal(s.settings.sound, false);
});
test("checksum detects corruption; validation rejects invalid balances and hostile quest IDs", () => {
  const s = fresh();
  assert.ok(decode(encode(s)));
  const envelope = JSON.parse(encode(s));
  envelope.data += " ";
  assert.equal(decode(JSON.stringify(envelope)), null);
  for (const n of [NaN, Infinity, -1, "100"]) {
    const bad = structuredClone(s);
    bad.run.batons = n;
    assert.equal(validate(bad), null);
  }
  const bad = structuredClone(s);
  bad.run.id = '\" onmouseover=\"alert(1)';
  bad.quests.items = [
    {
      id: '\"><img src=x onerror=alert(1)>',
      type: "clicks",
      target: 1,
      start: 0,
      reward: 1,
    },
  ];
  const safe = validate(bad);
  assert.equal(safe.quests.items.length, 0);
  assert.notEqual(safe.run.id, bad.run.id);
});
test("locale catalogs have equal keys; 48 bilingual news items and unique IDs", () => {
  assert.deepEqual(Object.keys(MESSAGES.ru), Object.keys(MESSAGES.en));
  for (const list of [BUILDINGS, UPGRADES, PERMANENT, ACHIEVEMENTS]) {
    assert.equal(new Set(list.map((x) => x.id)).size, list.length);
    assert.ok(list.every((x) => x.ru && x.en));
  }
  assert.equal(NEWS.length, 48);
  assert.ok(NEWS.every((n) => n.ru && n.en));
});
