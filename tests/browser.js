import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fresh, encode, decode } from "../js/state.js";
import { Game } from "../js/economy.js";
const base = process.env.TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
mkdirSync("test-results", { recursive: true });
mkdirSync("media", { recursive: true });
const results = [];
async function check(name, fn) {
  await fn();
  results.push(name);
  console.log("PASS", name);
}
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  locale: "ru-RU",
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(() => {
  const fixture = sessionStorage.getItem("qa-fixture");
  if (fixture) {
    sessionStorage.removeItem("qa-fixture");
    localStorage.clear();
    localStorage.setItem("batonEmpireV2", fixture);
  }
});
const load = async () => {
  await page.goto(base);
  await page.locator('[data-building="spoon"]').waitFor();
};
const saved = async () =>
  decode(await page.evaluate(() => localStorage.getItem("batonEmpireV2")));
const fixture = new Game();
fixture.gain(4e6);
fixture.s.run.buildings = {
  spoon: 40,
  grandma: 25,
  oven: 12,
  kiosk: 6,
  field: 2,
  factory: 0,
  train: 0,
  rocket: 0,
  portal: 0,
  cosmos: 0,
};
fixture.s.run.upgrades = ["maslo", "crisp", "sourdough", "gost", "family"];
fixture.s.permanent.goldenCaught = 3;
fixture.s.settings.lang = "ru";
fixture.s.settings.reducedMotion = true;
fixture.check();
async function seed(state = fixture.s) {
  await page.evaluate(
    (value) => sessionStorage.setItem("qa-fixture", value),
    encode(state),
  );
  await load();
}
try {
  await load();
  await check("mouse, Enter and Space each grant one loaf", async () => {
    await page.click("#baton");
    await page.focus("#baton");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await page.waitForTimeout(700);
    assert.equal((await saved()).permanent.clicksLifetime, 3);
    assert.equal((await saved()).run.batons, 3);
  });
  await check("first purchase and reload retain building", async () => {
    await page.evaluate(() => {
      for (let i = 0; i < 12; i++) document.getElementById("baton").click();
    });
    await page.click('[data-building="spoon"]');
    await page.reload();
    await page.locator('[data-building="spoon"]').waitFor();
    assert.equal((await saved()).run.buildings.spoon, 1);
    assert.equal((await saved()).permanent.clicksLifetime, 15);
  });
  await check(
    "1000 rapid clicks keep finite state and bounded particle DOM",
    async () => {
      await page.evaluate(() => {
        for (let i = 0; i < 1000; i++) document.getElementById("baton").click();
      });
      await page.waitForTimeout(700);
      assert.equal((await saved()).permanent.clicksLifetime, 1015);
      assert.ok(Number.isFinite((await saved()).run.batons));
      assert.ok((await page.locator(".particle,.floater").count()) <= 60);
    },
  );
  await check("all five sections and both locales render", async () => {
    await seed();
    for (const tab of [
      "production",
      "upgrades",
      "prestige",
      "achievements",
      "quests",
    ]) {
      await page.click(`[data-tab="${tab}"]`);
      assert.ok(await page.locator("#content").innerText());
    }
    await page.click("#settings");
    await page.selectOption("#language", "en");
    assert.equal(await page.title(), "Baton: Bread Empire");
    assert.match(await page.locator("#dialog-body").innerText(), /How to play/);
    await page.selectOption("#language", "ru");
    await page.click("#dialog-close");
  });
  await check(
    "prestige confirms, resets only run data and persists on immediate reload",
    async () => {
      await page.click('[data-tab="prestige"]');
      await page.click("#prestige-start");
      assert.equal(await page.locator("#dialog").isVisible(), true);
      await page.locator("#dialog-actions .primary").click();
      await page.reload();
      await page.locator('[data-building="spoon"]').waitFor();
      const s = await saved();
      assert.equal(s.permanent.prestigeCount, 1);
      assert.equal(s.permanent.crustBalance, 2);
      assert.equal(s.run.buildings.grandma, 0);
      assert.equal(s.run.batons, 0);
      assert.ok(s.achievements.includes("prestige1"));
      assert.ok(s.permanent.skins.includes("grandma"));
    },
  );
  await check("permanent purchase and new run starter persist", async () => {
    await page.click('[data-tab="prestige"]');
    await page.click('[data-permanent="starter"]');
    await page.reload();
    await page.locator('[data-building="spoon"]').waitFor();
    assert.equal((await saved()).permanent.upgrades.starter, 1);
    assert.equal((await saved()).permanent.crustBalance, 1);
  });
  await check("order claim is single use across reload", async () => {
    await seed();
    await page.evaluate(() => {
      for (let i = 0; i < 30; i++) document.getElementById("baton").click();
    });
    await page.click('[data-tab="quests"]');
    await page.locator("[data-claim]").first().click();
    await page.reload();
    await page.locator('[data-building="spoon"]').waitFor();
    assert.equal((await saved()).permanent.questsDone, 1);
  });
  await check(
    "delete requires two confirmations and removes both save copies",
    async () => {
      await page.click("#settings");
      await page.click("#wipe");
      assert.match(
        await page.locator("#dialog-body").innerText(),
        /необратимо/,
      );
      await page.locator("#dialog-actions .danger").click();
      assert.match(
        await page.locator("#dialog-body").innerText(),
        /Последнее подтверждение/,
      );
      await page.locator("#dialog-actions .danger").click();
      await page.waitForTimeout(200);
      await page.reload();
      await page.locator('[data-building="spoon"]').waitFor();
      assert.equal((await saved()).permanent.lifetimeBaked, 0);
      assert.equal((await saved()).permanent.crustLifetime, 0);
    },
  );
  await check(
    "offline income is paid once across repeated reloads",
    async () => {
      const s = fresh();
      s.run.buildings.grandma = 10;
      s.lastActiveAt = Date.now() - 3600000;
      s.settings.lang = "ru";
      await seed(s);
      const first = await saved();
      assert.ok(first.permanent.offlineBaked >= 21600);
      await page.reload();
      await page.locator('[data-building="spoon"]').waitFor();
      const second = await saved();
      assert.equal(second.permanent.offlineBaked, first.permanent.offlineBaked);
    },
  );
  await check(
    "desktop/mobile/landscape viewport matrix has no outer scroll or clipped navigation",
    async () => {
      for (const [width, height] of [
        [1280, 720],
        [1366, 768],
        [1920, 1080],
        [800, 600],
        [320, 568],
        [360, 640],
        [390, 844],
        [720, 1280],
        [844, 390],
      ]) {
        await page.setViewportSize({ width, height });
        await seed();
        for (const tab of [
          "production",
          "upgrades",
          "prestige",
          "achievements",
          "quests",
        ]) {
          await page.click(`[data-tab="${tab}"]`);
          const sizes = await page.evaluate(() => ({
            w: innerWidth,
            h: innerHeight,
            sw: document.documentElement.scrollWidth,
            sh: document.documentElement.scrollHeight,
            b: document.querySelector(".tabs").getBoundingClientRect().bottom,
            c: document.querySelector("#content").getBoundingClientRect()
              .height,
          }));
          assert.ok(
            sizes.sw <= sizes.w,
            `${width}x${height} ${tab} horizontal scroll`,
          );
          assert.ok(
            sizes.sh <= sizes.h,
            `${width}x${height} ${tab} vertical scroll`,
          );
          assert.ok(
            sizes.b <= sizes.h && sizes.c > 30,
            `${width}x${height} ${tab} clipped content`,
          );
        }
        await page.screenshot({ path: `test-results/${width}x${height}.png` });
      }
    },
  );
  await check("touch action grants one click on mobile", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      locale: "ru-RU",
    });
    const p = await ctx.newPage();
    await p.goto(base);
    await p.locator("#baton").waitFor();
    await p.tap("#baton");
    await p.waitForTimeout(700);
    const s = decode(
      await p.evaluate(() => localStorage.getItem("batonEmpireV2")),
    );
    assert.equal(s.permanent.clicksLifetime, 1);
    await ctx.close();
  });
  await check(
    "pause blocks input and production and resume restores gameplay",
    async () => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await seed();
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      const before = await saved();
      await page.evaluate(() => document.getElementById("baton").click());
      await page.waitForTimeout(600);
      assert.equal(
        (await saved()).permanent.clicksLifetime,
        before.permanent.clicksLifetime,
      );
      assert.equal((await saved()).run.batons, before.run.batons);
      await page.click("#resume");
      await page.click("#baton");
      await page.waitForTimeout(600);
      assert.equal(
        (await saved()).permanent.clicksLifetime,
        before.permanent.clicksLifetime + 1,
      );
    },
  );
  await check(
    "SDK auto locale, ready, gameplay, cloud and rewarded callbacks",
    async () => {
      const ctx = await browser.newContext();
      await ctx.addInitScript(() => {
        window.sdkCalls = {
          ready: 0,
          start: 0,
          stop: 0,
          writes: [],
          callbacks: null,
          events: {},
        };
        window.YaGames = {
          init: async () => ({
            environment: { i18n: { lang: "ru" } },
            features: {
              LoadingAPI: {
                ready() {
                  window.sdkCalls.ready++;
                },
              },
              GameplayAPI: {
                start() {
                  window.sdkCalls.start++;
                },
                stop() {
                  window.sdkCalls.stop++;
                },
              },
            },
            getPlayer: async () => ({
              getUniqueID: () => "test-owner",
              getData: async () => ({}),
              setData: async (data, flush) =>
                window.sdkCalls.writes.push({ data, flush }),
            }),
            on: (key, fn) => (window.sdkCalls.events[key] = fn),
            adv: {
              showRewardedVideo: ({ callbacks }) =>
                (window.sdkCalls.callbacks = callbacks),
            },
          }),
        };
      });
      const p = await ctx.newPage();
      await p.goto(base);
      await p.locator("#reward-ad:not(:disabled)").waitFor();
      assert.equal(await p.title(), "Батон: хлебная империя");
      assert.equal(await p.evaluate(() => sdkCalls.ready), 1);
      assert.ok((await p.evaluate(() => sdkCalls.writes.length)) > 0);
      await p.click("#reward-ad");
      await p.evaluate(() => {
        sdkCalls.callbacks.onRewarded();
        sdkCalls.callbacks.onRewarded();
        sdkCalls.callbacks.onClose();
      });
      await p.waitForTimeout(100);
      const d = decode(
        await p.evaluate(() => localStorage.getItem("batonEmpireV2")),
      );
      assert.ok(d.run.buffs.ad > 179);
      assert.equal(d.run.buffs.ad <= 180, true);
      const before = await p.evaluate(() => sdkCalls.start);
      await p.evaluate(() => sdkCalls.events.game_api_pause());
      await p.waitForTimeout(100);
      assert.ok((await p.evaluate(() => sdkCalls.stop)) >= 1);
      await p.evaluate(() => sdkCalls.events.game_api_resume());
      assert.ok((await p.evaluate(() => sdkCalls.start)) > before);
      await ctx.close();
    },
  );
  await check("no uncaught JavaScript errors", async () =>
    assert.deepEqual(errors, []),
  );
  // Screenshots are real UI at a deterministic QA save; never a production debug panel.
  for (const lang of ["ru", "en"]) {
    fixture.s.settings.lang = lang;
    await page.setViewportSize({ width: 1280, height: 720 });
    await seed();
    for (const tab of ["production", "prestige"]) {
      await page.click(`[data-tab="${tab}"]`);
      await page.screenshot({ path: `media/${lang}-desktop-${tab}.png` });
    }
    const ctx = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await ctx.addInitScript(
      (value) => localStorage.setItem("batonEmpireV2", value),
      encode(fixture.s),
    );
    const mobile = await ctx.newPage();
    await mobile.goto(base);
    await mobile.locator('[data-building="spoon"]').waitFor();
    for (const tab of ["production", "prestige"]) {
      await mobile.click(`[data-tab="${tab}"]`);
      await mobile.screenshot({ path: `media/${lang}-mobile-${tab}.png` });
    }
    await ctx.close();
  }
  writeFileSync(
    "test-results/browser-results.json",
    JSON.stringify({ passed: results, errors }, null, 2),
  );
} finally {
  await browser.close();
}
