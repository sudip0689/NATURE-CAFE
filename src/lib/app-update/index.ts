/**
 * Talking to the Android wrapper's updater from the web app.
 *
 * Two separate update paths meet here, and it is worth being clear which is
 * which. Everything this web app owns — the menu, the POS, billing, receipts,
 * styling — ships to Vercel and arrives in the installed app on the next page
 * load. Nothing below is involved in that.
 *
 * This is for the other kind: the printer driver, the file picker,
 * permissions, the wrapper itself. Those are compiled into an APK, and the
 * only way to change them is to install a new one.
 *
 * The download and the install are entirely native. A café tapping "Download
 * Update" must never be handed off to a browser — the whole point is that the
 * app fetches the release itself and hands it to Android's installer.
 */

export interface AppVersion {
  versionName: string;
  versionCode: number;
}

export interface AvailableUpdate {
  versionCode: number;
  versionName: string;
  releaseNotes: string[];
  mandatory: boolean;
  /** From a HEAD on the release, or null when the server would not say. */
  sizeBytes: number | null;
}

export type UpdateCheck =
  /** Not running inside the Android app — a browser has nothing to update. */
  | { state: "unsupported" }
  | { state: "up-to-date"; current: AppVersion }
  | { state: "available"; current: AppVersion; update: AvailableUpdate }
  | { state: "failed"; message: string };

export type UpdateProgress =
  | { state: "downloading"; percent: number }
  | { state: "installing" }
  | { state: "needs-permission"; message: string }
  | { state: "failed"; message: string };

interface UpdateBridge {
  appVersion(): string;
  checkForUpdate(requestId: string): string;
  downloadUpdate(requestId: string): string;
  openInstallSettings(): void;
}

type BridgeEvent =
  | { type: "up-to-date" }
  | {
      type: "available";
      versionCode: number;
      versionName: string;
      releaseNotes: string[];
      mandatory: boolean;
      sizeBytes: number;
    }
  | { type: "progress"; percent: number }
  | { type: "installing" }
  | { type: "permission"; message: string }
  | { type: "error"; message: string };

interface UpdateWindow extends Window {
  NatureCaffeAndroid?: Partial<UpdateBridge>;
  __natureCaffeUpdateEvent?: (requestId: string, payload: string) => void;
}

function updateWindow(): UpdateWindow | null {
  return typeof window === "undefined" ? null : (window as unknown as UpdateWindow);
}

function bridge(): UpdateBridge | null {
  const candidate = updateWindow()?.NatureCaffeAndroid;
  if (
    candidate &&
    typeof candidate.appVersion === "function" &&
    typeof candidate.checkForUpdate === "function" &&
    typeof candidate.downloadUpdate === "function"
  ) {
    return candidate as UpdateBridge;
  }
  return null;
}

/** True only inside an Android build new enough to carry the updater. */
export function updatesSupported(): boolean {
  return bridge() !== null;
}

export function installedVersion(): AppVersion | null {
  const android = bridge();
  if (!android) return null;
  try {
    const parsed = JSON.parse(android.appVersion()) as Partial<AppVersion>;
    if (typeof parsed.versionCode !== "number") return null;
    return {
      versionName: parsed.versionName ?? String(parsed.versionCode),
      versionCode: parsed.versionCode,
    };
  } catch {
    return null;
  }
}

export function openInstallSettings(): void {
  bridge()?.openInstallSettings?.();
}

const waiting = new Map<string, (event: BridgeEvent) => void>();
let nextRequestId = 0;

function installReceiver(w: UpdateWindow): void {
  if (w.__natureCaffeUpdateEvent) return;
  w.__natureCaffeUpdateEvent = (requestId, payload) => {
    const handler = waiting.get(requestId);
    if (!handler) return;
    try {
      handler(JSON.parse(payload) as BridgeEvent);
    } catch {
      handler({ type: "error", message: "The update service sent back something unreadable." });
    }
  };
}

/** Generous: a check is two network round trips on café wifi. */
const CHECK_TIMEOUT_MS = 30_000;

/**
 * Asks the app to check, and resolves once with the answer.
 *
 * Forced on the native side — the twelve-hour floor on background checks is
 * there to stop them hammering the server, not to tell somebody who
 * deliberately pressed a button to come back tomorrow.
 */
export function checkForUpdate(): Promise<UpdateCheck> {
  const w = updateWindow();
  const android = bridge();
  const current = installedVersion();
  if (!w || !android || !current) return Promise.resolve({ state: "unsupported" });

  installReceiver(w);
  const requestId = `check-${++nextRequestId}`;

  return new Promise<UpdateCheck>((resolve) => {
    let settled = false;
    const finish = (result: UpdateCheck) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      waiting.delete(requestId);
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ state: "failed", message: "Internet connection required." }),
      CHECK_TIMEOUT_MS,
    );

    waiting.set(requestId, (event) => {
      if (event.type === "up-to-date") {
        finish({ state: "up-to-date", current });
      } else if (event.type === "available") {
        finish({
          state: "available",
          current,
          update: {
            versionCode: event.versionCode,
            versionName: event.versionName || String(event.versionCode),
            releaseNotes: Array.isArray(event.releaseNotes) ? event.releaseNotes : [],
            mandatory: Boolean(event.mandatory),
            sizeBytes: event.sizeBytes > 0 ? event.sizeBytes : null,
          },
        });
      } else if (event.type === "error") {
        finish({ state: "failed", message: event.message });
      }
    });

    if (android.checkForUpdate(requestId) !== "queued") {
      finish({ state: "failed", message: "Update check could not be started." });
    }
  });
}

/**
 * Starts the download and reports as it goes.
 *
 * Returns a function that stops the reporting — the download itself is native
 * and carries on regardless, which is the point: it survives the café
 * navigating away from this screen.
 */
export function downloadUpdate(onProgress: (progress: UpdateProgress) => void): () => void {
  const w = updateWindow();
  const android = bridge();
  if (!w || !android) {
    onProgress({ state: "failed", message: "Updates are only available in the Nature Caffe app." });
    return () => {};
  }

  installReceiver(w);
  const requestId = `download-${++nextRequestId}`;

  waiting.set(requestId, (event) => {
    if (event.type === "progress") {
      onProgress({ state: "downloading", percent: event.percent });
    } else if (event.type === "installing") {
      onProgress({ state: "installing" });
    } else if (event.type === "permission") {
      onProgress({ state: "needs-permission", message: event.message });
    } else if (event.type === "error") {
      onProgress({ state: "failed", message: event.message });
    }
  });

  if (android.downloadUpdate(requestId) !== "queued") {
    waiting.delete(requestId);
    onProgress({ state: "failed", message: "Update download failed." });
    return () => {};
  }

  return () => waiting.delete(requestId);
}

/** "12.4 MB" — for showing what is about to come down café wifi. */
export function formatSize(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`;
}
