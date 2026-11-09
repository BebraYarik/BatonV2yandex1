import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { Game, production } from "../js/economy.js";
import { encode, decode } from "../js/state.js";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.TEST_URL || "http://127.0.0.1:5173";
try {
  for (const [roll, kind] of [
    [0.1, "gost"],
    [0.3, "queue"],
    [0.6, "rain"],
    [0.9, "grandma"],
  ]) {
    const ctx = await browser.newContext({ reducedMotion: "reduce" }),
      g = new Game();
    g.s.run.buildings.grandma = 10;
    g.s.settings.lang = "ru";
    await ctx.addInitScript(
      ({ data, roll }) => {
        localStorage.setItem("batonEmpireV2", data);
        Math.random = () => roll;
      },
      { data: encode(g.s), roll },
    );
    const p = await ctx.newPage();
    await p.clock.install({ time: Date.now() });
    await p.goto(base);
    await p.locator('[data-building="spoon"]').waitFor();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.clock.runFor((90 + roll * 60 + 1) * 1000);
    assert.ok(await p.locator("#event").isVisible(), kind);
    if (kind === "gost")
      for (let i = 0; i < 10; i++) await p.locator("#baton").click();
    else
      for (let i = 0; i < (kind === "rain" ? 3 : 1); i++)
        await p.locator("#event-action").click();
    const data = decode(
      await p.evaluate(() => localStorage.getItem("batonEmpireV2")),
    );
    assert.equal(data.permanent.eventsDone, 1, kind);
    assert.equal(await p.locator("#event").isVisible(), false);
    assert.deepEqual(errors, []);
    console.log("PASS event", kind);
    await ctx.close();
  }
  const ctx = await browser.newContext({ reducedMotion: "reduce" }),
    g = new Game();
  g.gain(1e12);
  g.s.run.buildings.grandma = 100;
  g.s.run.buildings.factory = 10;
  g.s.settings.lang = "ru";
  await ctx.addInitScript(
    (value) => localStorage.setItem("batonEmpireV2", value),
    encode(g.s),
  );
  const p = await ctx.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.clock.install({ time: Date.now() });
  await p.goto(base);
  await p.locator('[data-building="spoon"]').waitFor();
  const initial = decode(
    await p.evaluate(() => localStorage.getItem("batonEmpireV2")),
  );
  await p.clock.runFor(30 * 60 * 1000);
  const end = decode(
    await p.evaluate(() => localStorage.getItem("batonEmpireV2")),
    await p.evaluate(() => Date.now()),
  );
  assert.ok(
    end.run.runBaked >= initial.run.runBaked + production(initial).bps * 1790,
  );
  assert.ok(Number.isFinite(end.run.batons));
  assert.deepEqual(errors, []);
  assert.ok((await p.locator(".particle,.floater").count()) < 60);
  console.log(
    "PASS 30 minutes of active simulated browser time, finite economy, no uncaught errors",
  );
  await ctx.close();
  writeFileSync(
    "test-results/soak-results.json",
    JSON.stringify(
      {
        events: ["gost", "queue", "rain", "grandma"],
        simulatedMinutes: 30,
        uncaughtErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
