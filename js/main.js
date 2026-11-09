import {
  BUILDINGS,
  UPGRADES,
  PERMANENT,
  ACHIEVEMENTS,
  SKINS,
  STAGES,
} from "./data.js";
import {
  Game,
  production,
  bulkCost,
  maxAffordable,
  prestigeReward,
  permanentCost,
  metric,
  stage,
  unlocked,
} from "./economy.js";
import { fresh, decode, newer } from "./state.js";
import { SaveManager, SAVE_KEY } from "./save-manager.js";
import { Platform, AudioManager } from "./platform.js";
import { text, label, fmt, NEWS } from "./i18n.js";
const $ = (id) => document.getElementById(id);
const platform = new Platform();
let game,
  saveManager,
  audio,
  tab = "production",
  filter = "all",
  signature = "",
  lastLocal = 0,
  newsIndex = 0,
  newsClock = 0;
let goldenWait = 30 + Math.random() * 20,
  goldenLife = 0,
  eventWait = 90 + Math.random() * 60,
  event = null,
  erasing = false;
let hiddenSince = null,
  hiddenAd = false,
  lastTick = performance.now();
const s = () => game.s,
  L = () => s().settings.lang ?? "en",
  t = (k, v) => text(L(), k, v),
  f = (n, exact = false) => fmt(n, L(), exact);
function toast(message) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  $("toasts").append(el);
  while ($("toasts").childElementCount > 4)
    $("toasts").firstElementChild.remove();
  setTimeout(() => el.remove(), 4200);
}
function commit(critical = true) {
  game.check();
  saveManager.local(s(), critical);
  lastLocal = performance.now();
  game.changed = false;
  if (!erasing) void saveManager.cloud(s());
  update();
}
function localize() {
  document.documentElement.lang = L();
  document.title = t("title");
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
  for (const [id, key] of [
    ["baton", "bake"],
    ["sound", "sound"],
    ["settings", "settings"],
    ["achievement-shortcut", "achievements"],
    ["dialog-close", "close"],
    ["golden", "goldenCatch"],
  ])
    $(id).setAttribute("aria-label", t(key));
  document.querySelector(".bakery").setAttribute("aria-label", t("production"));
  document.querySelector(".tabs").setAttribute("aria-label", t("title"));
  document.documentElement.classList.toggle(
    "reduced-motion",
    s().settings.reducedMotion,
  );
  signature = "";
  updateNews();
  render();
}
const progress = (value, target) =>
  `<progress value="${Math.min(value, target)}" max="${target}"></progress>`;
function sectionTitle() {
  return t(tab === "production" ? "shopTitle" : tab);
}
function render() {
  $("section-title").textContent = sectionTitle();
  $("section-count").textContent =
    tab === "achievements"
      ? `${s().achievements.length} / ${ACHIEVEMENTS.length}`
      : tab === "upgrades"
        ? `${s().run.upgrades.length} / ${UPGRADES.length}`
        : "";
  document.querySelectorAll("[data-tab]").forEach((el) => {
    const active = el.dataset.tab === tab;
    el.classList.toggle("active", active);
    el.setAttribute("aria-current", active ? "page" : "false");
  });
  $("section-tools").innerHTML =
    tab === "production"
      ? `<div class="segments">${[1, 10, 100, "max"].map((n) => `<button data-amount="${n}" class="${s().settings.buyAmount === n ? "active" : ""}" aria-pressed="${s().settings.buyAmount === n}">${n === "max" ? "MAX" : "×" + n}</button>`).join("")}</div>`
      : tab === "achievements"
        ? `<div class="filters">${["all", "baking", "clicks", "prestige", "collection"].map((k) => `<button data-filter="${k}" class="${filter === k ? "active" : ""}">${t(k)}</button>`).join("")}</div>`
        : "";
  const c = $("content");
  if (tab === "production") {
    let locked = false;
    c.innerHTML = BUILDINGS.map((b, i) => {
      const visible =
        i === 0 ||
        s().run.buildings[b.id] > 0 ||
        s().run.runBaked >= b.cost * 0.3;
      if (!visible) {
        if (locked) return "";
        locked = true;
        return `<div class="card shop-item mystery"><span class="item-icon">🔒</span><span class="item-info"><span class="item-name">${t("secret")}</span><span class="item-detail">${t("next")}: ${f(b.cost * 0.3)} 🥖</span></span></div>`;
      }
      return `<button class="card shop-item" data-building="${b.id}"><span class="item-icon">${b.icon}</span><span class="item-info"><span class="item-name">${label(b, L())} <span class="item-owned"></span></span><span class="item-detail"></span></span><span class="item-price"></span></button>`;
    }).join("");
  } else if (tab === "upgrades") {
    const ups = UPGRADES.filter(
      (u) => !s().run.upgrades.includes(u.id) && unlocked(s(), u),
    );
    c.innerHTML =
      ups
        .map(
          (u) =>
            `<button class="card shop-item" data-upgrade="${u.id}"><span class="item-icon">${u.icon}</span><span class="item-info"><span class="item-name">${label(u, L())}</span><span class="item-detail">${effect(u)}</span></span><span class="item-price">${f(u.cost)} 🥖</span></button>`,
        )
        .join("") || `<p class="empty">${t("noUpgrades")}</p>`;
  } else if (tab === "prestige") {
    c.innerHTML =
      `<div class="card"><p class="intro">${t("crustHelp")}</p><div class="crust-total">✦ <span id="crust-total"></span></div><p class="intro" id="permanent-bonus"></p><div class="progress-label"><span>${t("runBaked")}</span><b id="run-baked"></b></div><progress id="prestige-progress" max="1000000"></progress><p class="intro" id="next-crust" style="margin-top:10px"></p><button id="prestige-start" class="primary"></button></div><h3 class="subheading">${t("permanentShop")}</h3>` +
      PERMANENT.map(
        (u) =>
          `<button class="card shop-item" data-permanent="${u.id}"><span class="item-icon">${u.icon}</span><span class="item-info"><span class="item-name">${label(u, L())}</span><span class="item-detail">${u[L() === "ru" ? "descRu" : "descEn"]}<br>${t("rank")} ${s().permanent.upgrades[u.id]} / ${u.max}<br><span class="preview"></span></span></span><span class="item-price"></span></button>`,
      ).join("");
  } else if (tab === "achievements") {
    c.innerHTML =
      '<div class="ach-grid">' +
      ACHIEVEMENTS.filter((a) => filter === "all" || a.category === filter)
        .map((a) => {
          const earned = s().achievements.includes(a.id),
            hidden = a.secret && !earned;
          return `<article class="card achievement ${earned ? "unlocked" : ""}" data-achievement="${a.id}"><div class="ach-icon">${hidden ? "❔" : a.icon}</div><h3>${hidden ? t("secret") : label(a, L())}</h3><p>${t("metric_" + a.metric, { n: f(a.target) })}</p>${progress(metric(s(), a.metric), a.target)}<small>${earned ? "✓ " + t("earned") : hidden ? "?" : `${f(metric(s(), a.metric))} / ${f(a.target)}`}</small></article>`;
        })
        .join("") +
      "</div>";
  } else if (tab === "quests") {
    c.innerHTML =
      `<p class="intro">${t("questHelp")}</p>` +
      s()
        .quests.items.map(
          (q) =>
            `<article class="card quest" data-quest="${q.id}"><h3>${t("quest_" + q.type, { n: f(q.target) })}</h3><p class="intro">${t("reward")}: ${f(q.reward)} 🥖</p><div class="progress-label"><span class="quest-value"></span></div>${progress(game.questProgress(q), q.target)}<button data-claim="${q.id}">${t("claim")}</button></article>`,
        )
        .join("");
  }
}
function effect(u) {
  return t(u.type + "Effect", {
    n: f(u.type === "percent" ? u.val * 100 : u.val),
    name: BUILDINGS.find((b) => b.id === u.building)?.[L()] ?? "",
  });
}
function currentSignature() {
  const v = s();
  return JSON.stringify([
    tab,
    L(),
    filter,
    v.settings.buyAmount,
    v.run.upgrades,
    v.permanent.upgrades,
    v.achievements,
    BUILDINGS.map(
      (b, i) =>
        i === 0 || v.run.buildings[b.id] > 0 || v.run.runBaked >= b.cost * 0.3,
    ),
    v.quests.items.map((q) => q.id),
  ]);
}
function update() {
  const p = production(s()),
    sig = currentSignature();
  if (sig !== signature) {
    signature = sig;
    render();
  }
  $("balance").textContent = f(s().run.batons);
  $("balance").title = f(s().run.batons, true);
  $("bps").textContent = f(p.bps);
  $("click-power").textContent = f(p.click);
  $("stage").textContent =
    `${STAGES[stage(s())][3]} ${STAGES[stage(s())][L() === "ru" ? 1 : 2]}`;
  document.querySelector(".bakery").dataset.stage = stage(s());
  $("first-hint").hidden = s().run.buildings.spoon > 0;
  $("achievement-count").textContent =
    `${s().achievements.length} / ${ACHIEVEMENTS.length}`;
  $("sound").textContent = s().settings.sound ? "🔊" : "🔇";
  $("sound").setAttribute("aria-pressed", String(s().settings.sound));
  if ($("baton").dataset.skin !== s().settings.skin) {
    $("baton").className = "loaf " + s().settings.skin;
    $("baton").dataset.skin = s().settings.skin;
  }
  const buffs = Object.entries(s().run.buffs)
    .filter(([, v]) => v > 0)
    .map(
      ([k, v]) =>
        `${t({ frenzy: "frenzy", click: "clickBuff", ad: "adBuff", queue: "queueBuff" }[k])} · ${Math.ceil(v)}${t("seconds")}`,
    );
  if (s().run.discount) buffs.push(t("discount"));
  const buffSig = buffs.join("|");
  if ($("buffs").dataset.sig !== buffSig) {
    $("buffs").dataset.sig = buffSig;
    $("buffs").replaceChildren(
      ...buffs.map((b) => {
        const e = document.createElement("span");
        e.className = "buff";
        e.textContent = b;
        return e;
      }),
    );
  }
  const saveKey = saveManager.localError
    ? "saveError"
    : platform.mode === "localOnly"
      ? "localOnly"
      : saveManager.status;
  $("save-status").textContent = t(saveKey);
  document.querySelectorAll("[data-building]").forEach((el) => {
    const id = el.dataset.building,
      b = BUILDINGS.find((x) => x.id === id),
      n =
        s().settings.buyAmount === "max"
          ? maxAffordable(s(), id)
          : s().settings.buyAmount,
      cost = bulkCost(s(), id, n),
      available = n > 0 && cost <= s().run.batons;
    el.disabled = !available;
    el.classList.toggle("available", available);
    el.querySelector(".item-owned").textContent = `×${s().run.buildings[id]}`;
    el.querySelector(".item-detail").textContent =
      `+${f(p.parts[id])} / ${t("seconds")} ${t("each")} · ${t("contribution")}: ${f(p.parts[id] * s().run.buildings[id])}`;
    el.querySelector(".item-price").textContent =
      (Number.isFinite(cost) ? f(cost) : "—") +
      " 🥖" +
      (s().settings.buyAmount === "max" ? ` (×${n})` : "");
    el.title = `${label(b, L())} · ${t("owned")}: ${s().run.buildings[id]} · ${Number.isFinite(cost) ? f(cost, true) : "—"} 🥖`;
  });
  document.querySelectorAll("[data-upgrade]").forEach((el) => {
    const u = UPGRADES.find((x) => x.id === el.dataset.upgrade);
    el.disabled = s().run.batons < u.cost;
    el.title = `${label(u, L())}: ${f(u.cost, true)} 🥖`;
    el.classList.toggle("available", !el.disabled);
  });
  if (tab === "prestige") {
    const n = prestigeReward(s());
    $("crust-total").textContent = f(s().permanent.crustBalance);
    $("run-baked").textContent = f(s().run.runBaked);
    $("prestige-progress").value = Math.min(1e6, s().run.runBaked);
    $("permanent-bonus").textContent =
      `${t("bonus")}: ×${f(1 + 0.15 * s().permanent.crustLifetime)}`;
    $("next-crust").textContent = t("nextCrust", { n: f((n + 1) ** 2 * 1e6) });
    $("prestige-start").disabled = n < 1;
    $("prestige-start").textContent =
      n < 1 ? t("prestigeLocked") : t("prestigeReward", { n: f(n) });
    document.querySelectorAll("[data-permanent]").forEach((el) => {
      const u = PERMANENT.find((x) => x.id === el.dataset.permanent),
        rank = s().permanent.upgrades[u.id],
        cost = permanentCost(s(), u);
      el.disabled = rank >= u.max || cost > s().permanent.crustBalance;
      el.querySelector(".item-price").textContent =
        rank >= u.max ? "✓" : `${f(cost)} ✦`;
      el.title = rank >= u.max ? t("maxRank") : `${f(cost, true)} ✦`;
      const copy = structuredClone(s());
      copy.permanent.upgrades[u.id] = Math.min(u.max, rank + 1);
      el.querySelector(".preview").textContent = t("productionPreview", {
        n: f(production(copy, false).bps),
      });
    });
  }
  if (tab === "quests")
    document.querySelectorAll("[data-quest]").forEach((el) => {
      const q = s().quests.items.find((q) => q.id === el.dataset.quest),
        n = game.questProgress(q);
      el.querySelector("progress").value = Math.min(q.target, n);
      el.querySelector(".quest-value").textContent = `${f(n)} / ${f(q.target)}`;
      el.querySelector("button").disabled = n < q.target;
    });
  if (tab === "achievements")
    document.querySelectorAll("[data-achievement]").forEach((el) => {
      const a = ACHIEVEMENTS.find((a) => a.id === el.dataset.achievement),
        v = metric(s(), a.metric);
      el.querySelector("progress").value = Math.min(v, a.target);
      if (!s().achievements.includes(a.id) && !a.secret)
        el.querySelector("small").textContent = `${f(v)} / ${f(a.target)}`;
    });
  $("reward-ad").disabled =
    !platform.sdk?.adv?.showRewardedVideo ||
    platform.adBusy ||
    s().run.buffs.ad > 0;
  while (game.notices.length) {
    const n = game.notices.shift(),
      obj = (n.type === "achievement" ? ACHIEVEMENTS : SKINS).find(
        (x) => x.id === n.id,
      );
    toast(
      `${n.type === "achievement" ? "🏆" : "🎨"} ${t(n.type === "achievement" ? "achievementToast" : "newSkin")}: ${label(obj, L())}`,
    );
  }
}
function chooseTab(next) {
  tab = next;
  signature = "";
  $("content").scrollTop = 0;
  update();
}
function updateNews() {
  const list = NEWS.filter((n) => n.stage <= stage(s()));
  $("news").textContent = label(list[newsIndex % list.length], L());
}
function particles(x, y, n) {
  if (
    s().settings.reducedMotion ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  if (document.querySelectorAll(".floater,.particle").length > 55) return;
  const el = document.createElement("span");
  el.className = "floater";
  el.textContent = "+" + f(n);
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.append(el);
  el.animate(
    [
      { transform: "translate(-50%,-50%)", opacity: 1 },
      { transform: "translate(-50%,-100px)", opacity: 0 },
    ],
    { duration: 700 },
  ).finished.finally(() => el.remove());
  for (let i = 0; i < 7; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    p.style.left = x + "px";
    p.style.top = y + "px";
    document.body.append(p);
    p.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        {
          transform: `translate(${(i - 3) * 12}px,-${35 + Math.random() * 45}px) rotate(${i * 25}deg)`,
          opacity: 1,
          offset: 0.4,
        },
        {
          transform: `translate(${(Math.random() - 0.5) * 140}px,${40 + Math.random() * 90}px) rotate(160deg)`,
          opacity: 0,
        },
      ],
      { duration: 750, easing: "cubic-bezier(.2,.6,.5,1)" },
    ).finished.finally(() => p.remove());
  }
}
function openDialog(title, body, actions = []) {
  $("dialog-title").textContent = title;
  $("dialog-body").replaceChildren();
  if (typeof body === "string") $("dialog-body").textContent = body;
  else $("dialog-body").append(body);
  $("dialog-actions").replaceChildren(
    ...actions.map((a) => {
      const b = document.createElement("button");
      b.textContent = a.label;
      b.className = a.className ?? "";
      b.onclick = a.action;
      return b;
    }),
  );
  if (!$("dialog").open) $("dialog").showModal();
  platform.setPause("dialog", true);
}
function closeDialog() {
  $("dialog").close();
  platform.setPause("dialog", false);
  lastTick = performance.now();
}
function settings() {
  const container = document.createElement("div");
  container.innerHTML = `
 <label class="setting-row"><span>${t("language")}</span><select id="language"><option value="ru">Русский</option><option value="en">English</option></select></label>
 <label class="setting-row"><span>${t("sound")}</span><input id="sound-setting" type="checkbox" ${s().settings.sound ? "checked" : ""}></label>
 <label class="setting-row"><span>${t("volume")}</span><input id="volume" type="range" min="0" max="1" step="0.05" value="${s().settings.volume}"></label>
 <label class="setting-row"><span>${t("motion")}</span><input id="motion" type="checkbox" ${s().settings.reducedMotion ? "checked" : ""}></label>
 <h3 class="subheading">${t("skins")}</h3><p>${t("skinHint")}</p><div class="skins">${SKINS.map((x) => `<button data-skin="${x.id}" ${s().permanent.skins.includes(x.id) ? "" : "disabled"} class="${s().settings.skin === x.id ? "active" : ""}">${s().permanent.skins.includes(x.id) ? "🥖" : "🔒"} ${label(x, L())}</button>`).join("")}</div>
 <h3 class="subheading">${t("stats")}</h3>${[
   ["lifetime", s().permanent.lifetimeBaked],
   ["runBaked", s().run.runBaked],
   ["clicks", s().permanent.clicksLifetime],
   ["golden", s().permanent.goldenCaught],
   ["bestBps", s().permanent.bestBps],
   ["prestiges", s().permanent.prestigeCount],
 ]
   .map(
     ([k, v]) =>
       `<div class="stat-row"><span>${t(k)}</span><b>${f(v)}</b></div>`,
   )
   .join("")}
 <h3 class="subheading">${t("tutorial")}</h3><p>${t("tutorialText")}</p><button id="wipe" class="danger" style="margin-top:20px;width:100%">${t("wipe")}</button>`;
  openDialog(t("settings"), container);
  $("language").value = L();
  $("language").onchange = (e) => {
    s().settings.lang = e.target.value;
    commit();
    localize();
    settings();
  };
  for (const [id, key] of [
    ["sound-setting", "sound"],
    ["motion", "reducedMotion"],
  ])
    $(id).onchange = (e) => {
      s().settings[key] = e.target.checked;
      commit();
      localize();
      audio.pause(platform.paused);
    };
  $("volume").oninput = (e) => {
    s().settings.volume = Number(e.target.value);
    commit();
  };
  container.querySelectorAll("[data-skin]").forEach(
    (b) =>
      (b.onclick = () => {
        if (s().permanent.skins.includes(b.dataset.skin)) {
          s().settings.skin = b.dataset.skin;
          commit();
          settings();
        }
      }),
  );
  $("wipe").onclick = () =>
    openDialog(t("wipe"), t("wipeFirst"), [
      { label: t("cancel"), action: settings },
      {
        label: t("wipe"),
        className: "danger",
        action: () =>
          openDialog(t("wipe"), t("wipeSecond"), [
            { label: t("cancel"), action: settings },
            { label: t("wipeConfirm"), className: "danger", action: erase },
          ]),
      },
    ]);
}
async function erase() {
  if (erasing || platform.adBusy) return;
  erasing = true;
  const old = s(),
    next = fresh();
  next.revision = old.revision + 1;
  next.settings = { ...old.settings, skin: "classic" };
  next.ownerId = old.ownerId;
  game = new Game(next);
  event = null;
  goldenLife = 0;
  $("golden").hidden = true;
  closeDialog();
  localize();
  const ok = await saveManager.erase(s());
  erasing = false;
  toast(
    t(
      saveManager.localError ? "saveError" : ok ? "wipeDone" : "wipeCloudError",
    ),
  );
  update();
}
function askPrestige() {
  if (platform.adBusy || erasing) return;
  const runId = s().run.id,
    n = prestigeReward(s());
  if (n < 1) return;
  openDialog(t("prestige"), t("prestigeConfirm", { n: f(n) }), [
    { label: t("cancel"), action: closeDialog },
    {
      label: t("prestige"),
      className: "primary",
      action: () => {
        const reward = game.prestige(runId);
        if (reward) {
          event = null;
          eventWait = 100;
          goldenLife = 0;
          goldenWait = 35;
          $("golden").hidden = true;
          commit(true);
          toast(t("prestigeDone", { n: f(reward) }));
          audio.play("buy");
        }
        closeDialog();
        updateEvent();
        update();
      },
    },
  ]);
}
function updateEvent() {
  const el = $("event");
  el.hidden = !event;
  if (!event) {
    delete el.dataset.kind;
    return;
  }
  const kind = event.kind + L();
  if (el.dataset.kind === kind) {
    el.querySelector("small").textContent =
      `${Math.ceil(event.life)}${t("seconds")} ${event.kind === "gost" || event.kind === "rain" ? `· ${event.progress} / ${event.kind === "gost" ? 10 : 3}` : ""}`;
    return;
  }
  el.dataset.kind = kind;
  el.innerHTML = `<div><b>${t("event_" + event.kind)}</b><p>${t("eventHelp_" + event.kind)}</p><small>${Math.ceil(event.life)}${t("seconds")} ${event.kind === "gost" || event.kind === "rain" ? `· ${event.progress} / ${event.kind === "gost" ? 10 : 3}` : ""}</small></div>${event.kind !== "gost" ? `<button id="event-action">${t(event.kind === "rain" ? "eventCatch" : "eventAction")}</button>` : ""}`;
  const btn = $("event-action");
  if (btn)
    btn.onclick = () => {
      if (platform.paused || !event) return;
      event.progress++;
      if (event.kind !== "rain" || event.progress >= 3) finishEvent();
      else updateEvent();
    };
}
function finishEvent() {
  if (!event) return;
  const kind = event.kind;
  event = null;
  game.completeEvent(kind);
  eventWait = 120 + Math.random() * 90;
  commit();
  toast(t("eventDone"));
  updateEvent();
}
function lifecycle() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      hiddenSince = Date.now();
      hiddenAd = platform.adBusy;
      commit();
      platform.setPause("hidden", true);
    } else {
      if (hiddenSince !== null) {
        if (!hiddenAd && !platform.adBusy) {
          const n = game.offline();
          if (n >= 1) toast(t("offlineGain", { n: f(n) }));
        } else s().lastActiveAt = Date.now();
        hiddenSince = null;
        commit();
      }
      lastTick = performance.now();
      platform.setPause("hidden", false);
    }
  });
  addEventListener("blur", () => {
    if (!game) return;
    commit();
    platform.setPause("blur", true);
  });
  addEventListener("focus", () => {
    lastTick = performance.now();
    platform.setPause("blur", false);
  });
  addEventListener("pagehide", () => commit());
  addEventListener("storage", (e) => {
    if (e.key !== SAVE_KEY || !e.newValue || erasing) return;
    const incoming = decode(e.newValue);
    if (
      !incoming ||
      incoming.ownerId !== s().ownerId ||
      newer(s(), incoming) !== incoming
    )
      return;
    game = new Game(incoming);
    event = null;
    goldenLife = 0;
    $("golden").hidden = true;
    localize();
    toast(t("otherTab"));
  });
}
async function boot() {
  await platform.init();
  saveManager = new SaveManager(platform);
  game = new Game(await saveManager.load());
  if (!s().settings.lang)
    s().settings.lang = platform.sdk
      ? platform.language()
      : navigator.language?.startsWith("ru")
        ? "ru"
        : "en";
  audio = new AudioManager(() => s().settings);
  const away = game.offline();
  commit();
  localize();
  if (away >= 1) toast(t("offlineGain", { n: f(away) }));
  if (saveManager.invalid) toast(t("badSave"));
  platform.onPause((paused) => {
    document.documentElement.classList.toggle("motion-paused", paused);
    audio.pause(paused);
    lastTick = performance.now();
    $("pause-overlay").hidden =
      !paused ||
      platform.pauses.has("dialog") ||
      platform.pauses.has("ad") ||
      document.hidden;
  });
  $("baton").onclick = (e) => {
    if (platform.paused || erasing) return;
    const n = game.click(),
      r = $("baton").getBoundingClientRect();
    particles(
      e.detail ? e.clientX : r.left + r.width / 2,
      e.detail ? e.clientY : r.top + r.height / 2,
      n,
    );
    audio.play();
    $("baton").classList.remove("pop");
    void $("baton").offsetWidth;
    $("baton").classList.add("pop");
    if (event?.kind === "gost") {
      event.progress++;
      if (event.progress >= 10) finishEvent();
      else updateEvent();
    }
    if (game.notices.length) commit(true);
    else update();
  };
  $("baton").addEventListener("animationend", () =>
    $("baton").classList.remove("pop"),
  );
  document.addEventListener("keydown", (e) => {
    if (
      (e.code === "Space" || e.code === "Enter") &&
      e.repeat &&
      e.target instanceof HTMLButtonElement
    )
      e.preventDefault();
  });
  document.addEventListener("contextmenu", (e) => {
    if (!e.target.closest("input,select,textarea")) e.preventDefault();
  });
  document
    .querySelectorAll("[data-tab]")
    .forEach((el) => (el.onclick = () => chooseTab(el.dataset.tab)));
  $("section-tools").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.amount) {
      s().settings.buyAmount =
        b.dataset.amount === "max" ? "max" : Number(b.dataset.amount);
      commit();
    }
    if (b.dataset.filter) {
      filter = b.dataset.filter;
      signature = "";
      update();
    }
  };
  $("content").onclick = (e) => {
    const b = e.target.closest("button");
    if (!b || b.disabled || erasing || platform.paused) return;
    if (b.id === "prestige-start") {
      askPrestige();
      return;
    }
    let ok = false;
    if (b.dataset.building) ok = game.buy(b.dataset.building);
    if (b.dataset.upgrade) ok = game.upgrade(b.dataset.upgrade);
    if (b.dataset.permanent) ok = game.permanent(b.dataset.permanent);
    if (b.dataset.claim) {
      const n = game.claimQuest(b.dataset.claim);
      if (n) {
        toast(t("orderDone", { n: f(n) }));
        ok = true;
      }
    }
    if (ok) {
      commit(true);
      audio.play("buy");
    }
  };
  $("golden").onclick = () => {
    if (platform.paused || !goldenLife) return;
    goldenLife = 0;
    $("golden").hidden = true;
    const kind = game.golden();
    toast(typeof kind === "string" ? t(kind) : t(kind.key, { n: f(kind.n) }));
    goldenWait = (30 + Math.random() * 30) / production(s()).golden;
    commit();
    audio.play("gold");
  };
  $("settings").onclick = settings;
  $("achievement-shortcut").onclick = () => chooseTab("achievements");
  $("sound").onclick = () => {
    s().settings.sound = !s().settings.sound;
    commit();
    audio.pause(platform.paused || !s().settings.sound);
  };
  $("manual-save").onclick = () => {
    commit(true);
    toast(t(saveManager.localError ? "saveError" : "local"));
  };
  $("dialog-close").onclick = closeDialog;
  $("dialog").addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog();
  });
  $("resume").onclick = () => {
    platform.setPause("blur", false);
    if (!document.hidden) platform.setPause("hidden", false);
  };
  $("reward-ad").onclick = async () => {
    if (erasing) return;
    const ok = await platform.reward(() => {
      s().run.buffs.ad = 180;
      game.touch();
      commit(true);
      toast(t("adReward"));
    });
    if (!ok) toast(t("adUnavailable"));
    update();
  };
  await Promise.all(
    [...document.images].map((img) => img.decode?.().catch(() => {})),
  );
  await document.fonts.ready;
  lifecycle();
  if (document.hidden) platform.setPause("hidden", true);
  platform.ready();
  updateNews();
  setInterval(() => {
    const now = performance.now(),
      dt = Math.min((now - lastTick) / 1000, 1);
    lastTick = now;
    if (!platform.paused && !erasing) {
      game.tick(dt);
      newsClock += dt;
      if (newsClock >= 8) {
        newsClock = 0;
        newsIndex++;
        updateNews();
      }
      if (goldenLife > 0) {
        goldenLife -= dt;
        if (goldenLife <= 0) {
          $("golden").hidden = true;
          goldenWait = (30 + Math.random() * 30) / production(s()).golden;
        }
      } else {
        goldenWait -= dt;
        if (goldenWait <= 0) {
          goldenLife = 13;
          $("golden").hidden = false;
        }
      }
      if (event) {
        event.life -= dt;
        if (event.life <= 0) {
          event = null;
          eventWait = 120;
        }
        updateEvent();
      } else {
        eventWait -= dt;
        if (eventWait <= 0) {
          const kind = ["gost", "queue", "rain", "grandma"][
            Math.floor(Math.random() * 4)
          ];
          event = { kind, life: 30, progress: 0 };
          updateEvent();
        }
      }
      if (game.notices.length) commit(true);
      else if (game.changed && now - lastLocal > 500) commit(false);
    }
    if (!erasing) void saveManager.cloud(s());
    update();
  }, 100);
}
boot().catch((error) => {
  console.error("[Baton] Startup failed", error);
  $("news").textContent =
    "Не удалось загрузить игру / Unable to load the game. Reload the page.";
});
