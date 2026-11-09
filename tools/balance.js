// Deterministic active-play model, not a claim about real-user retention.
import { writeFileSync, mkdirSync } from "node:fs";
import {
  Game,
  production,
  bulkCost,
  unlocked,
  permanentCost,
} from "../js/economy.js";
import { BUILDINGS, UPGRADES, PERMANENT } from "../js/data.js";
const g = new Game(),
  rows = [];
for (let run = 1; run <= 5; run++) {
  let time = 0;
  while (g.s.run.runBaked < 1e6 && time < 14400) {
    for (let i = 0; i < 3; i++) g.click();
    g.tick(1);
    time++;
    if (time % 45 === 0) g.golden(0.85); // Conservative fixed gift, no multiplicative frenzy.
    for (const q of [...g.s.quests.items]) g.claimQuest(q.id);
    const options = BUILDINGS.map((b) => ({
      b,
      cost: bulkCost(g.s, b.id, 1),
      eff: b.prod / bulkCost(g.s, b.id, 1),
    }))
      .filter((x) => x.cost <= g.s.run.batons)
      .sort((a, b) => b.eff - a.eff);
    if (options[0]) g.buy(options[0].b.id, 1);
    for (const u of UPGRADES)
      if (
        unlocked(g.s, u) &&
        g.s.run.batons >= u.cost &&
        u.cost <= Math.max(400, production(g.s).bps * 100)
      )
        g.upgrade(u.id);
  }
  rows.push({
    run,
    seconds: time,
    minutes: (time / 60).toFixed(1),
    baked: Math.floor(g.s.run.runBaked),
    bps: Math.round(production(g.s, false).bps),
    crusts: g.s.permanent.crustLifetime + 1,
  });
  if (time >= 14400) throw new Error("Progression stalled");
  g.prestige(g.s.run.id);
  for (const id of ["starter", "oven", "fingers", "spoon", "nose"]) {
    const u = PERMANENT.find((x) => x.id === id);
    if (g.s.permanent.crustBalance >= permanentCost(g.s, u)) g.permanent(id);
  }
}
console.table(rows);
mkdirSync("docs", { recursive: true });
writeFileSync(
  "docs/balance.md",
  `# Модель баланса\n\nАвтоматическая проверка пяти замесов. Стратегия: 3 клика/с, лучший доступный BPS/цену, доступные эффективные рецепты, получение заказов; золотой подарок раз в 45 с. Это модель, не плейтест на реальном устройстве. Порог сохранён из ТЗ: 1 млн; базовые цены исходника не изменены.\n\n| Цикл | Минут до замеса | BPS | Испечено | Всего корочек |\n|---|---:|---:|---:|---:|\n${rows.map((r) => `| ${r.run} | ${r.minutes} | ${r.bps} | ${r.baked} | ${r.crusts} |`).join("\n")}\n\nВремя зависит от стратегии и случайных бонусов; целевые 15–35 минут первого замеса требуют подтверждения пользователями. Формула награды: floor(sqrt(runBaked/1e6)); бонус: 1+0.15×crustLifetime.\n`,
);
