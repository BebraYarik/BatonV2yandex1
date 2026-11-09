import { BUILDINGS, UPGRADES, PERMANENT, ACHIEVEMENTS, SKINS } from "./data.js";
export const LIMIT = 1e100,
  COUNT_LIMIT = 10000;
export const finite = (v, max = LIMIT) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
export const cap = (v) =>
  Number.isFinite(v) ? Math.min(LIMIT, Math.max(0, v)) : LIMIT;
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function fresh(now = Date.now()) {
  return {
    saveVersion: 2,
    profileId: uid(),
    ownerId: null,
    revision: 0,
    lastSavedAt: now,
    lastActiveAt: now,
    run: {
      id: uid(),
      batons: 0,
      runBaked: 0,
      clicksRun: 0,
      buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])),
      upgrades: [],
      goldenRun: 0,
      buffs: { frenzy: 0, click: 0, ad: 0, queue: 0 },
      discount: false,
    },
    permanent: {
      lifetimeBaked: 0,
      clicksLifetime: 0,
      goldenCaught: 0,
      bestBps: 0,
      crustBalance: 0,
      crustLifetime: 0,
      prestigeCount: 0,
      upgrades: Object.fromEntries(PERMANENT.map((u) => [u.id, 0])),
      skins: ["classic"],
      offlineBaked: 0,
      questsDone: 0,
      maxBuy: 0,
      eventsDone: 0,
      history: [],
    },
    achievements: [],
    settings: {
      lang: null,
      sound: true,
      volume: 0.5,
      reducedMotion: false,
      skin: "classic",
      buyAmount: 1,
    },
    quests: { sequence: [0, 0, 0], items: [] },
  };
}
const ids = (value, allowed) =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter((x) => typeof x === "string" && allowed.includes(x)),
        ),
      ]
    : [];
export function validate(raw, now = Date.now()) {
  if (
    !raw ||
    typeof raw !== "object" ||
    raw.saveVersion !== 2 ||
    !raw.run ||
    !raw.permanent ||
    !raw.settings
  )
    return null;
  const s = fresh(now),
    r = raw.run,
    p = raw.permanent;
  if (
    !finite(r.batons) ||
    !finite(r.runBaked) ||
    !finite(p.lifetimeBaked) ||
    !finite(raw.revision, Number.MAX_SAFE_INTEGER) ||
    !finite(raw.lastActiveAt, now + 300000)
  )
    return null;
  for (const k of ["lastSavedAt", "lastActiveAt", "revision"])
    if (finite(raw[k], Number.MAX_SAFE_INTEGER)) s[k] = raw[k];
  for (const k of ["profileId", "ownerId"])
    if (typeof raw[k] === "string" && raw[k].length < 160) s[k] = raw[k];
  if (typeof r.id === "string" && /^[a-zA-Z0-9:_-]{1,160}$/.test(r.id))
    s.run.id = r.id;
  for (const k of ["batons", "runBaked", "clicksRun", "goldenRun"])
    if (finite(r[k])) s.run[k] = r[k];
  s.run.runBaked = Math.max(s.run.runBaked, s.run.batons);
  for (const b of BUILDINGS)
    if (finite(r.buildings?.[b.id], COUNT_LIMIT))
      s.run.buildings[b.id] = Math.floor(r.buildings[b.id]);
  s.run.upgrades = ids(
    r.upgrades,
    UPGRADES.map((u) => u.id),
  );
  for (const k of Object.keys(s.run.buffs))
    if (finite(r.buffs?.[k], 180)) s.run.buffs[k] = r.buffs[k];
  s.run.discount = r.discount === true;
  for (const k of Object.keys(s.permanent))
    if (typeof s.permanent[k] === "number" && finite(p[k]))
      s.permanent[k] = p[k];
  s.permanent.crustBalance = Math.min(
    s.permanent.crustBalance,
    s.permanent.crustLifetime,
  );
  s.permanent.lifetimeBaked = Math.max(p.lifetimeBaked, s.run.runBaked);
  for (const u of PERMANENT)
    if (finite(p.upgrades?.[u.id], u.max))
      s.permanent.upgrades[u.id] = Math.floor(p.upgrades[u.id]);
  s.permanent.skins = [
    ...new Set([
      "classic",
      ...ids(
        p.skins,
        SKINS.map((x) => x.id),
      ),
    ]),
  ];
  s.permanent.history = Array.isArray(p.history)
    ? p.history
        .filter(
          (x) =>
            x &&
            finite(x.at, now + 300000) &&
            typeof x.kind === "string" &&
            ["prestige", "event"].includes(x.kind),
        )
        .slice(-30)
        .map((x) => ({
          kind: x.kind,
          at: x.at,
          value: finite(x.value) ? x.value : 0,
        }))
    : [];
  s.achievements = ids(
    raw.achievements,
    ACHIEVEMENTS.map((a) => a.id),
  );
  const settings = raw.settings;
  s.settings.lang = ["ru", "en"].includes(settings.lang) ? settings.lang : null;
  for (const k of ["sound", "reducedMotion"])
    if (typeof settings[k] === "boolean") s.settings[k] = settings[k];
  if (finite(settings.volume, 1)) s.settings.volume = settings.volume;
  s.settings.skin = s.permanent.skins.includes(settings.skin)
    ? settings.skin
    : "classic";
  s.settings.buyAmount = [1, 10, 100, "max"].includes(settings.buyAmount)
    ? settings.buyAmount
    : 1;
  if (Array.isArray(raw.quests?.sequence) && raw.quests.sequence.length === 3)
    s.quests.sequence = raw.quests.sequence.map((x) =>
      finite(x, 1e6) ? Math.floor(x) : 0,
    );
  if (Array.isArray(raw.quests?.items))
    s.quests.items = raw.quests.items
      .slice(0, 3)
      .filter(
        (q) =>
          q &&
          ["clicks", "baked", "buildings", "golden", "bps"].includes(q.type) &&
          finite(q.target) &&
          q.target > 0 &&
          finite(q.start) &&
          finite(q.reward) &&
          typeof q.id === "string" &&
          /^[a-zA-Z0-9:_-]{1,200}$/.test(q.id),
      )
      .map((q) => ({
        id: q.id,
        type: q.type,
        target: q.target,
        start: q.start,
        reward: q.reward,
      }));
  return s;
}
export function migrateLegacy(d, now = Date.now()) {
  if (!d || typeof d !== "object" || !finite(d.butter) || !finite(d.total))
    return null;
  const s = fresh(now);
  s.run.batons = d.butter;
  s.run.runBaked = Math.max(d.total, d.butter);
  s.permanent.lifetimeBaked = s.run.runBaked;
  s.run.clicksRun = finite(d.clicks) ? d.clicks : 0;
  s.permanent.clicksLifetime = s.run.clicksRun;
  s.run.goldenRun = finite(d.golden) ? d.golden : 0;
  s.permanent.goldenCaught = s.run.goldenRun;
  BUILDINGS.forEach((b, i) => {
    s.run.buildings[b.id] = finite(d.counts?.[i], COUNT_LIMIT)
      ? Math.floor(d.counts[i])
      : 0;
  });
  s.run.upgrades = ids(
    d.ups,
    UPGRADES.map((u) => u.id),
  );
  s.achievements = ids(
    d.ach,
    ACHIEVEMENTS.map((a) => a.id),
  );
  s.settings.sound = d.sound !== false;
  s.settings.buyAmount = [1, 10].includes(d.buyAmt) ? d.buyAmt : 1;
  if (finite(d.last, now)) s.lastActiveAt = d.last;
  return s;
}
export function checksum(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}
export function encode(s) {
  const data = JSON.stringify(s);
  return JSON.stringify({ data, checksum: checksum(data) });
}
export function decode(value, now = Date.now()) {
  try {
    if (typeof value !== "string" || value.length > 180000) return null;
    const e = JSON.parse(value);
    if (typeof e.data !== "string" || e.checksum !== checksum(e.data))
      return null;
    return validate(JSON.parse(e.data), now);
  } catch {
    return null;
  }
}
export function newer(a, b) {
  if (!a) return b;
  if (!b) return a;
  return b.revision > a.revision ||
    (b.revision === a.revision && b.lastSavedAt > a.lastSavedAt)
    ? b
    : a;
}
