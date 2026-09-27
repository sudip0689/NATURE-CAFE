import { afterEach, describe, expect, it, vi } from "vitest";

import { formatSize } from "@/lib/app-update";

/**
 * The web half of the APK updater: what it does when there is no Android app
 * underneath it, and what it makes of what the native side sends back.
 *
 * Worth pinning down because the failure that matters is silent. If the bridge
 * check were too loose this section would render in a desktop browser with a
 * Check for Update button that could never do anything; if it were too tight
 * it would vanish on the one device it exists for.
 */

interface FakeBridge {
  appVersion(): string;
  checkForUpdate(requestId: string): string;
  downloadUpdate(requestId: string): string;
  openInstallSettings(): void;
}

/**
 * These run in the node environment, which has no `window` — and the bridge
 * lookup is guarded on exactly that, since it has to be safe during the server
 * render. Pointing `window` at globalThis is the smallest thing that lets the
 * real guard run rather than testing around it.
 */
function install(bridge: Partial<FakeBridge> | null): void {
  const w = globalThis as unknown as Record<string, unknown>;
  w.window = globalThis;
  if (bridge) w.NatureCaffeAndroid = bridge;
  else delete w.NatureCaffeAndroid;
}

/** Replies the way MainActivity does: through the global event receiver. */
function reply(requestId: string, payload: unknown): void {
  const w = globalThis as unknown as {
    __natureCaffeUpdateEvent?: (id: string, payload: string) => void;
  };
  w.__natureCaffeUpdateEvent?.(requestId, JSON.stringify(payload));
}

function workingBridge(onRequest: (id: string) => void): FakeBridge {
  return {
    appVersion: () => JSON.stringify({ versionName: "1.0.4", versionCode: 4 }),
    checkForUpdate: (id) => {
      onRequest(id);
      return "queued";
    },
    downloadUpdate: (id) => {
      onRequest(id);
      return "queued";
    },
    openInstallSettings: () => {},
  };
}

afterEach(() => {
  install(null);
  const w = globalThis as unknown as Record<string, unknown>;
  delete w.__natureCaffeUpdateEvent;
  vi.useRealTimers();
});

describe("updatesSupported", () => {
  it("is false in a plain browser, so Settings shows no dead section", async () => {
    vi.resetModules();
    install(null);
    const update = await import("@/lib/app-update");
    expect(update.updatesSupported()).toBe(false);
    expect(update.installedVersion()).toBeNull();
    await expect(update.checkForUpdate()).resolves.toEqual({ state: "unsupported" });
  });

  it("is false for an older wrapper that has printing but not updating", async () => {
    vi.resetModules();
    // 1.0.3 and earlier exposed printReceipt and nothing else. The section has
    // to stay hidden there rather than offering a button that does nothing.
    install({ appVersion: () => JSON.stringify({ versionName: "1.0.3", versionCode: 3 }) });
    const update = await import("@/lib/app-update");
    expect(update.updatesSupported()).toBe(false);
  });

  it("is true once the whole bridge is there", async () => {
    vi.resetModules();
    install(workingBridge(() => {}));
    const update = await import("@/lib/app-update");
    expect(update.updatesSupported()).toBe(true);
    expect(update.installedVersion()).toEqual({ versionName: "1.0.4", versionCode: 4 });
  });
});

describe("checkForUpdate", () => {
  it("reports the release the native side found", async () => {
    vi.resetModules();
    let requestId = "";
    install(workingBridge((id) => (requestId = id)));
    const update = await import("@/lib/app-update");

    const pending = update.checkForUpdate();
    await Promise.resolve();
    reply(requestId, {
      type: "available",
      versionCode: 5,
      versionName: "1.0.5",
      releaseNotes: ["Faster POS"],
      mandatory: false,
      sizeBytes: 2_593_266,
    });

    const result = await pending;
    expect(result.state).toBe("available");
    if (result.state === "available") {
      expect(result.current.versionCode).toBe(4);
      expect(result.update.versionName).toBe("1.0.5");
      expect(result.update.releaseNotes).toEqual(["Faster POS"]);
      expect(result.update.sizeBytes).toBe(2_593_266);
      expect(result.update.mandatory).toBe(false);
    }
  });

  it("says so plainly when there is nothing newer", async () => {
    vi.resetModules();
    let requestId = "";
    install(workingBridge((id) => (requestId = id)));
    const update = await import("@/lib/app-update");

    const pending = update.checkForUpdate();
    await Promise.resolve();
    reply(requestId, { type: "up-to-date" });

    await expect(pending).resolves.toMatchObject({ state: "up-to-date" });
  });

  it("gives up rather than hanging when nothing answers", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    install(workingBridge(() => {}));
    const update = await import("@/lib/app-update");

    const pending = update.checkForUpdate();
    await vi.advanceTimersByTimeAsync(31_000);

    // A spinner that never stops is the one outcome with no way out of it.
    const result = await pending;
    expect(result.state).toBe("failed");
    if (result.state === "failed") expect(result.message).toContain("Internet");
  });

  it("treats a refused queue as a failure rather than waiting on it", async () => {
    vi.resetModules();
    install({
      ...workingBridge(() => {}),
      checkForUpdate: () => "no",
    });
    const update = await import("@/lib/app-update");
    await expect(update.checkForUpdate()).resolves.toMatchObject({ state: "failed" });
  });
});

describe("downloadUpdate", () => {
  it("passes progress, the installer hand-off and permission through", async () => {
    vi.resetModules();
    let requestId = "";
    install(workingBridge((id) => (requestId = id)));
    const update = await import("@/lib/app-update");

    const seen: string[] = [];
    update.downloadUpdate((p) => seen.push(p.state));

    reply(requestId, { type: "progress", percent: 40 });
    reply(requestId, { type: "installing" });
    reply(requestId, { type: "permission", message: "Android requires permission." });

    expect(seen).toEqual(["downloading", "installing", "needs-permission"]);
  });

  it("stops reporting once the screen unsubscribes", async () => {
    vi.resetModules();
    let requestId = "";
    install(workingBridge((id) => (requestId = id)));
    const update = await import("@/lib/app-update");

    const seen: string[] = [];
    const stop = update.downloadUpdate((p) => seen.push(p.state));
    reply(requestId, { type: "progress", percent: 10 });
    stop();
    // The native download carries on; this screen just stops listening.
    reply(requestId, { type: "progress", percent: 90 });

    expect(seen).toEqual(["downloading"]);
  });

  it("fails loudly outside the app rather than silently doing nothing", async () => {
    vi.resetModules();
    install(null);
    const update = await import("@/lib/app-update");

    const seen: UpdateState[] = [];
    update.downloadUpdate((p) => seen.push(p));
    expect(seen).toHaveLength(1);
    expect(seen[0].state).toBe("failed");
  });
});

type UpdateState = { state: string };

describe("formatSize", () => {
  it("reads as a size a person would recognise", () => {
    expect(formatSize(2_593_266)).toBe("2.5 MB");
    expect(formatSize(400_000)).toBe("391 KB");
    // Unknown stays unknown rather than becoming a confident "0 MB".
    expect(formatSize(null)).toBeNull();
    expect(formatSize(0)).toBeNull();
    expect(formatSize(-1)).toBeNull();
  });
});
