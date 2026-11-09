export class Platform {
  constructor() {
    this.sdk = null;
    this.player = null;
    this.ownerId = null;
    this.mode = "localOnly";
    this.pauses = new Set();
    this.listeners = [];
    this.adBusy = false;
    this.playing = false;
    this.readyCalled = false;
  }
  onPause(fn) {
    this.listeners.push(fn);
  }
  setPause(reason, on) {
    on ? this.pauses.add(reason) : this.pauses.delete(reason);
    this.syncGameplay();
    this.listeners.forEach((fn) => fn(this.pauses.size > 0));
  }
  get paused() {
    return this.pauses.size > 0;
  }
  async init() {
    try {
      const local = ["localhost", "127.0.0.1", ""].includes(location.hostname);
      if (
        !globalThis.YaGames &&
        (!local || new URLSearchParams(location.search).has("sdk"))
      ) {
        await new Promise((resolve, reject) => {
          const el = document.createElement("script");
          el.src = "/sdk.js";
          el.onload = resolve;
          el.onerror = () => reject(new Error("SDK load failed"));
          document.head.append(el);
          setTimeout(() => reject(new Error("SDK timeout")), 7000);
        });
      }
      if (!globalThis.YaGames) return;
      this.sdk = await Promise.race([
        YaGames.init(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SDK init timeout")), 8000),
        ),
      ]);
      this.mode = "local";
      this.sdk.on?.("game_api_pause", () => this.setPause("sdk", true));
      this.sdk.on?.("game_api_resume", () => this.setPause("sdk", false));
      try {
        this.player = await Promise.race([
          this.sdk.getPlayer({ scopes: false }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Player timeout")), 6000),
          ),
        ]);
        this.ownerId = String(this.player.getUniqueID());
      } catch {
        this.player = null;
      }
    } catch (error) {
      console.warn("[Baton] Yandex SDK unavailable:", error.message);
      this.mode = "localOnly";
    }
  }
  language() {
    return this.sdk?.environment?.i18n?.lang === "ru" ? "ru" : "en";
  }
  ready() {
    if (this.readyCalled) return;
    this.readyCalled = true;
    try {
      this.sdk?.features?.LoadingAPI?.ready();
    } catch {}
    this.syncGameplay();
  }
  syncGameplay() {
    const playing = this.readyCalled && !this.paused;
    if (playing === this.playing) return;
    this.playing = playing;
    try {
      this.sdk?.features?.GameplayAPI?.[playing ? "start" : "stop"]();
    } catch {}
  }
  async reward(onReward) {
    if (this.adBusy || this.paused || !this.sdk?.adv?.showRewardedVideo)
      return false;
    this.adBusy = true;
    this.setPause("ad", true);
    return new Promise((resolve) => {
      let rewarded = false,
        done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.adBusy = false;
        this.setPause("ad", false);
        resolve(rewarded);
      };
      try {
        this.sdk.adv.showRewardedVideo({
          callbacks: {
            onOpen: () => {
              if (!done) this.setPause("ad", true);
            },
            onRewarded: () => {
              if (done || rewarded) return;
              rewarded = true;
              onReward();
            },
            onClose: finish,
            onError: finish,
          },
        });
      } catch {
        finish();
      }
    });
  }
}
export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.paused = false;
  }
  pause(paused) {
    this.paused = paused;
    if (paused) this.context?.suspend().catch(() => {});
    else if (this.settings().sound) this.context?.resume().catch(() => {});
  }
  play(kind = "click") {
    const s = this.settings();
    if (!s.sound || this.paused || s.volume === 0) return;
    try {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      this.context.resume().catch(() => {});
      const frequencies =
        kind === "click"
          ? [300 + Math.random() * 120]
          : kind === "buy"
            ? [392, 523]
            : [523, 784, 1046];
      frequencies.forEach((frequency, i) => {
        const c = this.context,
          o = c.createOscillator(),
          g = c.createGain(),
          t = c.currentTime + i * 0.07;
        o.type = "triangle";
        o.frequency.value = frequency;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(s.volume * 0.12, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.connect(g).connect(c.destination);
        o.start(t);
        o.stop(t + 0.15);
      });
    } catch {}
  }
}
