import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { Game } from "../js/economy.js";
import { encode } from "../js/state.js";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
mkdirSync("media", { recursive: true });
const loaf = readFileSync("assets/baton.svg", "utf8");
// Render original vector artwork; these are illustrations, not screenshots of the UI.
for (const lang of ["ru", "en"])
  for (const kind of ["icon", "cover"]) {
    const width = kind === "icon" ? 512 : 800,
      height = kind === "icon" ? 512 : 470;
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const title =
      lang === "ru" ? ["БАТОН", "хлебная империя"] : ["BATON", "bread empire"];
    await page.setContent(
      `<html><body style="margin:0;width:${width}px;height:${height}px;overflow:hidden;background:radial-gradient(ellipse at 50% 45%,#69401e,#251207 85%);font-family:system-ui;color:#ffda86"><svg fill="#ffda86" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><radialGradient id="glow"><stop stop-color="#ffb837" stop-opacity=".25"/><stop offset="1" stop-color="#ffb837" stop-opacity="0"/></radialGradient></defs><circle cx="${width / 2}" cy="${height / 2}" r="240" fill="url(#glow)"/><circle cx="${width / 2}" cy="${height / 2}" r="${kind === "icon" ? 222 : 190}" fill="none" stroke="#b18440" stroke-opacity=".4"/><circle cx="${width / 2}" cy="${height / 2}" r="${kind === "icon" ? 205 : 170}" fill="none" stroke="#b18440" stroke-opacity=".2" stroke-dasharray="3 8"/><text x="${width * 0.14}" y="${height * 0.28}" fill="#f5b83d" font-size="25">✦</text><text x="${width * 0.82}" y="${height * 0.7}" fill="#f5b83d" font-size="38">✧</text>${kind === "cover" ? `<text x="400" y="91" text-anchor="middle" font-weight="900" font-size="58" letter-spacing="12">${title[0]}</text><text x="400" y="130" text-anchor="middle" font-size="23" letter-spacing="4">${title[1]}</text>` : ""}</svg><div style="position:absolute;left:50%;top:${kind === "icon" ? "50" : "59"}%;width:${kind === "icon" ? 430 : 470}px;transform:translate(-50%,-50%) rotate(-12deg);filter:drop-shadow(0 26px 20px #10090088)">${loaf}</div>${kind === "cover" ? `<div style="position:absolute;bottom:38px;left:0;right:0;text-align:center;font-size:17px;letter-spacing:2px;color:#dfbc82">${lang === "ru" ? "ПЕКИ · СТРОЙ · НАЧИНАЙ НОВЫЙ ЗАМЕС" : "BAKE · BUILD · START NEW DOUGH"}</div>` : ""}</body></html>`,
    );
    await page.screenshot({ path: `media/${lang}-${kind}.png` });
    await page.close();
  }
// Short, genuine interaction recording using a QA-only save. No cheat controls shipped.
for (const lang of ["ru", "en"]) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: lang === "ru" ? "ru-RU" : "en-US",
  });
  const game = new Game();
  game.gain(4e6);
  game.s.settings.lang = lang;
  game.s.run.buildings.spoon = 40;
  game.s.run.buildings.grandma = 20;
  game.s.run.buildings.oven = 10;
  game.s.run.buildings.kiosk = 3;
  game.s.run.upgrades = ["maslo", "crisp", "sourdough"];
  game.check();
  await context.addInitScript(
    (data) => localStorage.setItem("batonEmpireV2", data),
    encode(game.s),
  );
  const page = await context.newPage();
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  await page.locator("#baton").waitFor();
  const dir = `test-results/video/${lang}`;
  mkdirSync(dir, { recursive: true });
  let frames = 0,
    flight = null;
  const recorder = setInterval(() => {
    if (flight) return;
    flight = page
      .screenshot({
        path: `${dir}/${String(++frames).padStart(5, "0")}.jpg`,
        type: "jpeg",
        quality: 82,
      })
      .finally(() => (flight = null));
  }, 100);
  for (let i = 0; i < 12; i++) {
    await page.click("#baton");
    await page.waitForTimeout(180);
  }
  await page.click('[data-building="grandma"]');
  await page.waitForTimeout(1000);
  await page.click('[data-tab="upgrades"]');
  await page.waitForTimeout(1300);
  await page.locator("[data-upgrade]:not(:disabled)").first().click();
  await page.click('[data-tab="quests"]');
  await page.waitForTimeout(1300);
  await page.click('[data-tab="achievements"]');
  await page.waitForTimeout(1300);
  await page.click('[data-tab="prestige"]');
  await page.waitForTimeout(1800);
  await page.click("#prestige-start");
  await page.waitForTimeout(1400);
  await page.locator("#dialog-actions .primary").click();
  await page.waitForTimeout(1200);
  await page.click('[data-permanent="starter"]');
  await page.waitForTimeout(800);
  await page.click('[data-tab="production"]');
  await page.waitForTimeout(900);
  clearInterval(recorder);
  if (flight) await flight;
  await context.close();
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-framerate",
    "10",
    "-i",
    `${dir}/%05d.jpg`,
    "-t",
    "27",
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    `media/${lang}-gameplay.mp4`,
  ]);
}
await browser.close();
