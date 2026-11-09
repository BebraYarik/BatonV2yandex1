import { test } from "node:test";
import assert from "node:assert/strict";
import { SaveManager, SAVE_KEY, BACKUP_KEY } from "../js/save-manager.js";
import { Platform } from "../js/platform.js";
import { Game } from "../js/economy.js";
import { fresh, encode, decode } from "../js/state.js";
class Storage {
  constructor() {
    this.data = new Map();
  }
  getItem(k) {
    return this.data.get(k) ?? null;
  }
  setItem(k, v) {
    this.data.set(k, v);
  }
  removeItem(k) {
    this.data.delete(k);
  }
}
const platform = (player) => ({ player, ownerId: player ? "owner1" : null });
test("local writes survive purchases immediately; damaged primary restores backup", async () => {
  const store = new Storage(),
    m = new SaveManager(platform(null), store),
    g = new Game();
  g.gain(100);
  m.local(g.s);
  g.buy("spoon", 1);
  m.local(g.s, true);
  assert.equal(decode(store.getItem(SAVE_KEY)).run.buildings.spoon, 1);
  store.setItem(SAVE_KEY, "broken");
  assert.ok(m.readLocal());
  assert.equal(m.invalid, true);
  assert.ok(store.getItem(BACKUP_KEY));
});
test("cloud picks newer revision, never older cloud over newer local, binds owner", async () => {
  const a = fresh(),
    b = fresh();
  a.revision = 20;
  b.revision = 10;
  const store = new Storage();
  store.setItem(SAVE_KEY, encode(a));
  const m = new SaveManager(
    platform({ getData: async () => ({ batonEmpireV2: encode(b) }) }),
    store,
  );
  const loaded = await m.load();
  assert.equal(loaded.profileId, a.profileId);
  assert.equal(loaded.ownerId, "owner1");
  b.revision = 30;
  assert.equal((await m.load()).profileId, b.profileId);
});
test("wrong account data is excluded without overwriting it during read", async () => {
  const s = fresh();
  s.ownerId = "another-account";
  const store = new Storage();
  store.setItem(SAVE_KEY, encode(s));
  const m = new SaveManager(
    platform({ getData: async () => ({ batonEmpireV2: encode(s) }) }),
    store,
  );
  const loaded = await m.load();
  assert.notEqual(loaded.profileId, s.profileId);
  assert.equal(decode(store.getItem(SAVE_KEY)).profileId, s.profileId);
});
test("cloud queue throttles writes and uses flush only for important actions", async () => {
  const writes = [],
    m = new SaveManager(
      platform({
        setData: async (data, flush) => {
          writes.push({ data, flush });
        },
      }),
      new Storage(),
    ),
    s = fresh();
  m.local(s, true);
  assert.equal(await m.cloud(s), true);
  assert.equal(m.status, "cloud");
  assert.equal(writes[0].flush, true);
  for (let i = 0; i < 1000; i++) {
    m.local(s);
    await m.cloud(s);
  }
  assert.equal(writes.length, 1);
  assert.equal(m.status, "cloudPending");
  m.lastWrite = 0;
  await m.cloud(s);
  assert.equal(writes.length, 2);
  assert.equal(writes[1].flush, false);
});
test("cloud failures retain dirty queue, retry with backoff and do not claim success", async () => {
  let calls = 0;
  const m = new SaveManager(
      platform({
        setData: async () => {
          if (calls++ === 0) throw new Error("offline");
        },
      }),
      new Storage(),
    ),
    s = fresh();
  m.local(s, true);
  assert.equal(await m.cloud(s), false);
  assert.equal(m.status, "cloudError");
  assert.equal(m.dirty, true);
  assert.ok(m.retryAt > Date.now());
  assert.equal(await m.cloud(s), false);
  m.retryAt = 0;
  m.lastWrite = 0;
  assert.ok(await m.cloud(s));
  assert.equal(m.status, "cloud");
});
test("local storage denial does not crash play or prevent cloud save", async () => {
  const storage = {
      getItem() {
        throw Error("denied");
      },
      setItem() {
        throw Error("denied");
      },
    },
    m = new SaveManager(platform({ setData: async () => {} }), storage);
  assert.equal(m.readLocal(), null);
  const g = new Game();
  g.click();
  m.local(g.s);
  assert.equal(m.localError, true);
  assert.ok(await m.cloud(g.s));
});
test("full reset writes a higher-revision tombstone to local AND cloud", async () => {
  const store = new Storage(),
    writes = [],
    m = new SaveManager(
      platform({ setData: async (data) => writes.push(data) }),
      store,
    ),
    old = fresh();
  old.revision = 100;
  m.local(old);
  const s = fresh();
  s.revision = old.revision + 1;
  assert.ok(await m.erase(s));
  assert.equal(decode(store.getItem(SAVE_KEY)).run.batons, 0);
  assert.ok(decode(writes[0].batonEmpireV2).revision > old.revision);
  assert.equal(store.getItem(BACKUP_KEY), null);
});
test("reward only comes from onRewarded, exactly once; game paused until close", async () => {
  const p = new Platform();
  let callbacks,
    n = 0;
  p.sdk = {
    adv: { showRewardedVideo: (args) => (callbacks = args.callbacks) },
  };
  const pending = p.reward(() => n++);
  assert.equal(p.paused, true);
  assert.equal(n, 0);
  callbacks.onRewarded();
  callbacks.onRewarded();
  assert.equal(n, 1);
  callbacks.onClose();
  assert.equal(await pending, true);
  callbacks.onRewarded();
  assert.equal(n, 1);
  assert.equal(p.paused, false);
});
test("ad close, error, unavailable and thrown SDK never award or strand pause", async () => {
  for (const outcome of ["close", "error", "throw", "missing"]) {
    const p = new Platform();
    let n = 0;
    p.sdk = {
      adv: {
        showRewardedVideo: ({ callbacks: c }) => {
          if (outcome === "close") c.onClose();
          if (outcome === "error") c.onError();
          if (outcome === "throw") throw Error();
        },
      },
    };
    if (outcome === "missing") p.sdk = null;
    assert.equal(await p.reward(() => n++), false);
    assert.equal(n, 0);
    assert.equal(p.paused, false);
  }
});
test("ad request cannot re-enter; one close cannot clear another pause reason", async () => {
  const p = new Platform();
  let c;
  p.sdk = { adv: { showRewardedVideo: (args) => (c = args.callbacks) } };
  const a = p.reward(() => {});
  assert.equal(await p.reward(() => {}), false);
  p.setPause("hidden", true);
  c.onClose();
  await a;
  assert.equal(p.paused, true);
  p.setPause("hidden", false);
  assert.equal(p.paused, false);
});
test("LoadingAPI ready is called once and gameplay calls follow actual activity", () => {
  const p = new Platform(),
    calls = [];
  p.sdk = {
    features: {
      LoadingAPI: { ready: () => calls.push("ready") },
      GameplayAPI: {
        start: () => calls.push("start"),
        stop: () => calls.push("stop"),
      },
    },
  };
  p.ready();
  p.ready();
  p.setPause("hidden", true);
  p.setPause("ad", true);
  p.setPause("hidden", false);
  p.setPause("ad", false);
  assert.deepEqual(calls, ["ready", "start", "stop", "start"]);
});
