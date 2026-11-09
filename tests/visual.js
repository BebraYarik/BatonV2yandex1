import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1366, height: 768 },
    reducedMotion: "no-preference",
  });
  const external = [];
  page.on("request", (r) => {
    if (!r.url().startsWith(base + "/")) external.push(r.url());
  });
  await page.goto(base);
  await page.locator('[data-building="spoon"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert.ok(
    await page.evaluate(
      () =>
        document.fonts.check("700 20px Unbounded") &&
        document.fonts.check("400 16px Nunito"),
    ),
  );
  assert.match(
    await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily),
    /Unbounded/,
  );
  await page.evaluate(() => (document.getElementById("golden").hidden = false));
  const box = await page.locator("#golden").boundingBox(),
    before = await page
      .locator(".golden-art")
      .evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(650);
  assert.notEqual(
    await page
      .locator(".golden-art")
      .evaluate((el) => getComputedStyle(el).transform),
    before,
  );
  assert.deepEqual(await page.locator("#golden").boundingBox(), box);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(
    await page
      .locator(".golden-art")
      .evaluate((el) => getComputedStyle(el).animationPlayState),
    "paused",
  );
  await page.click("#resume");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".golden-art")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  assert.equal(
    await page
      .locator("#golden")
      .evaluate((el) => getComputedStyle(el, "::before").animationName),
    "none",
  );
  assert.deepEqual(external, []);
  console.log(
    "PASS local fonts, zero external requests, croissant levitation, stable hit area, pause and reduced motion",
  );
} finally {
  await browser.close();
}
