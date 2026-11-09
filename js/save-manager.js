import { fresh, decode, encode, migrateLegacy, newer } from "./state.js";
export const SAVE_KEY = "batonEmpireV2",
  BACKUP_KEY = "batonEmpireV2Backup";
export class SaveManager {
  constructor(platform, storage) {
    if (!storage) {
      try {
        storage = globalThis.localStorage;
      } catch {}
    }
    this.platform = platform;
    this.storage = storage ?? {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage unavailable");
      },
      removeItem: () => {},
    };
    this.status = "local";
    this.lastWrite = 0;
    this.inFlight = false;
    this.dirty = false;
    this.flush = false;
    this.retryAt = 0;
    this.failures = 0;
    this.generation = 0;
    this.invalid = false;
    this.localError = false;
  }
  readLocal() {
    try {
      const raw = this.storage.getItem(SAVE_KEY),
        backup = this.storage.getItem(BACKUP_KEY);
      const a = decode(raw),
        b = decode(backup);
      if (raw && !a) this.invalid = true;
      const saved = newer(a, b);
      if (saved) return saved;
      const legacy = this.storage.getItem("batonKlickerV1");
      if (legacy) return migrateLegacy(JSON.parse(legacy));
    } catch {
      this.localError = true;
    }
    return null;
  }
  async load() {
    let local = this.readLocal(),
      cloud = null;
    const { player, ownerId } = this.platform;
    if (player) {
      try {
        const result = await Promise.race([
          player.getData(["batonEmpireV2"]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Cloud timeout")), 6000),
          ),
        ]);
        cloud = decode(result.batonEmpireV2);
        if (cloud?.ownerId && cloud.ownerId !== ownerId) cloud = null;
      } catch {
        this.status = "cloudError";
      }
    }
    // Never upload another signed-in player's local profile into this account.
    if (local?.ownerId && ownerId && local.ownerId !== ownerId) local = null;
    const s = newer(local, cloud) ?? fresh();
    if (ownerId) s.ownerId = ownerId;
    return s;
  }
  local(s, critical = false) {
    s.lastActiveAt = Date.now();
    s.lastSavedAt = s.lastActiveAt;
    s.revision = Math.min(Number.MAX_SAFE_INTEGER, s.revision + 1);
    try {
      const old = this.storage.getItem(SAVE_KEY);
      if (decode(old)) this.storage.setItem(BACKUP_KEY, old);
      this.storage.setItem(SAVE_KEY, encode(s));
      this.localError = false;
    } catch {
      this.localError = true;
    }
    this.dirty = true;
    this.flush ||= critical;
    this.status = this.platform.player ? "cloudPending" : "local";
  }
  async cloud(s, force = false) {
    const player = this.platform.player,
      now = Date.now();
    if (
      !player ||
      this.inFlight ||
      !this.dirty ||
      now < this.retryAt ||
      (!force && now - this.lastWrite < 15000)
    )
      return false;
    // Even manual actions are rate limited. At most 20 writes / 5 min.
    if (now - this.lastWrite < 15000) return false;
    this.inFlight = true;
    this.lastWrite = now;
    const revision = s.revision,
      generation = this.generation,
      flush = this.flush;
    try {
      await player.setData({ batonEmpireV2: encode(s) }, flush);
      if (generation === this.generation) {
        this.dirty = s.revision !== revision;
        this.flush = this.dirty ? this.flush : false;
        this.status = this.dirty ? "cloudPending" : "cloud";
        this.failures = 0;
      }
      return true;
    } catch {
      this.failures++;
      this.retryAt =
        now + Math.min(120000, 15000 * 2 ** Math.min(3, this.failures));
      this.status = "cloudError";
      return false;
    } finally {
      this.inFlight = false;
    }
  }
  async erase(s) {
    // Keep a fresh tombstone with a higher revision, so older cloud/backup data cannot resurrect a deleted profile.
    this.generation++;
    this.local(s, true);
    try {
      this.storage.removeItem(BACKUP_KEY);
      this.storage.removeItem("batonKlickerV1");
    } catch {}
    if (!this.platform.player) return true;
    // Wait for a prior snapshot to finish; the new profile is queued afterwards.
    while (this.inFlight)
      await new Promise((resolve) => setTimeout(resolve, 50));
    const wait = Math.max(0, 15000 - (Date.now() - this.lastWrite));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    this.retryAt = 0;
    return this.cloud(s, true);
  }
}
