"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorNote, SuccessNote } from "@/components/ui/states";
import {
  checkForUpdate,
  downloadUpdate,
  formatSize,
  installedVersion,
  openInstallSettings,
  updatesSupported,
  type AppVersion,
  type AvailableUpdate,
  type UpdateProgress,
} from "@/lib/app-update";

interface BridgeState {
  supported: boolean;
  current: AppVersion | null;
}

/**
 * Whether there is an app to update, read through useSyncExternalStore.
 *
 * It has to be read after mount — `window` does not exist during the server
 * render and the bridge only exists inside the wrapper — but it never changes
 * afterwards, so there is nothing to subscribe to. Cached because the
 * snapshot has to be referentially stable or React re-renders for ever.
 */
let cached: BridgeState | null = null;

function bridgeSnapshot(): BridgeState {
  if (!cached) {
    cached = { supported: updatesSupported(), current: installedVersion() };
  }
  return cached;
}

const SERVER_STATE: BridgeState = { supported: false, current: null };
const serverSnapshot = () => SERVER_STATE;
const subscribeToNothing = () => () => {};

/**
 * The App Update section of Settings.
 *
 * Only appears inside the Android app. On a desktop or mobile browser there
 * is no APK to update — the web app is already whatever Vercel last deployed,
 * which is the other half of how this app updates and needs no section at all.
 */
export function AppUpdateSection() {
  const { supported, current } = useSyncExternalStore(
    subscribeToNothing,
    bridgeSnapshot,
    serverSnapshot,
  );

  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<AvailableUpdate | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [screenOpen, setScreenOpen] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setProblem(null);
    setStatus(null);

    const result = await checkForUpdate();
    setChecking(false);

    if (result.state === "available") {
      setAvailable(result.update);
      setStatus(null);
    } else if (result.state === "up-to-date") {
      setAvailable(null);
      setStatus("You're using the latest version.");
    } else if (result.state === "failed") {
      setProblem(result.message);
    }
  }, []);

  if (!supported || !current) return null;

  return (
    <>
      <Card className="p-5">
        <h2 className="font-display text-lg font-semibold text-brandink">App Update</h2>

        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-brandmuted">Current Version</dt>
            <dd className="font-medium text-brandink">{current.versionName}</dd>
          </div>

          {available ? (
            <div>
              <dt className="text-brandmuted">New Version Available</dt>
              <dd className="font-medium text-forest">{available.versionName}</dd>
            </div>
          ) : (
            <div>
              <dt className="text-brandmuted">Status</dt>
              <dd className="font-medium text-brandink">
                {status ?? "Tap Check for Update to see if a newer app is available."}
              </dd>
            </div>
          )}
        </dl>

        {available?.releaseNotes.length ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-brandink">What&apos;s New</p>
            <ul className="mt-1.5 space-y-1 text-sm text-brandink">
              {available.releaseNotes.map((note) => (
                <li key={note} className="flex gap-2">
                  <span aria-hidden="true" className="text-leaf">
                    •
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {status && !available ? (
          <div className="mt-4">
            <SuccessNote>{status}</SuccessNote>
          </div>
        ) : null}
        {problem ? (
          <div className="mt-4">
            <ErrorNote>{problem}</ErrorNote>
          </div>
        ) : null}

        <div className="mt-5">
          {available ? (
            <Button fullWidth onClick={() => setScreenOpen(true)}>
              Download Update
            </Button>
          ) : (
            <Button
              fullWidth
              variant="secondary"
              onClick={check}
              pending={checking}
              pendingLabel="Checking…"
            >
              Check for Update
            </Button>
          )}
        </div>
      </Card>

      {screenOpen && available ? (
        <UpdateScreen
          current={current}
          update={available}
          onClose={() => setScreenOpen(false)}
        />
      ) : null}
    </>
  );
}

/**
 * The full-screen update flow: offer, download, hand to Android's installer.
 *
 * Nothing here opens a browser. `downloadUpdate` reaches the native side,
 * which fetches the release itself and passes it to the package installer
 * through a content:// URI — the café sees Android's own "do you want to
 * install this update?" and never a download page.
 */
function UpdateScreen({
  current,
  update,
  onClose,
}: {
  current: AppVersion;
  update: AvailableUpdate;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [started, setStarted] = useState(false);
  const unsubscribe = useRef<(() => void) | null>(null);

  // Stop listening when the screen closes. The download itself is native and
  // carries on, which is deliberate: closing this must not abandon a
  // half-finished APK.
  useEffect(() => () => unsubscribe.current?.(), []);

  const start = useCallback(() => {
    setStarted(true);
    setProgress({ state: "downloading", percent: 0 });
    unsubscribe.current?.();
    unsubscribe.current = downloadUpdate(setProgress);
  }, []);

  const size = formatSize(update.sizeBytes);
  const downloading = progress?.state === "downloading";
  const failed = progress?.state === "failed";
  const needsPermission = progress?.state === "needs-permission";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App update"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brandink/60 p-4"
    >
      <Card className="w-full max-w-sm p-6 text-center">
        <p className="font-display text-sm text-brandmuted">Nature Caffe</p>
        <h2 className="font-display text-xl font-semibold text-brandink">App Update</h2>

        {downloading || progress?.state === "installing" ? (
          <Downloading progress={progress} />
        ) : (
          <>
            <div className="mt-5 space-y-3 text-left text-sm">
              <div>
                <p className="text-brandmuted">Current Version</p>
                <p className="font-medium text-brandink">{current.versionName}</p>
              </div>
              <hr className="border-brandline" />
              <div>
                <p className="text-brandmuted">New version available</p>
                <p className="font-display text-lg font-semibold text-forest">
                  {update.versionName}
                </p>
              </div>

              {update.releaseNotes.length ? (
                <div>
                  <p className="font-semibold text-brandink">What&apos;s New</p>
                  <ul className="mt-1.5 space-y-1 text-brandink">
                    {update.releaseNotes.map((note) => (
                      <li key={note} className="flex gap-2">
                        <span aria-hidden="true" className="text-leaf">
                          ✓
                        </span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {size ? (
                <div>
                  <p className="text-brandmuted">Update Size</p>
                  <p className="font-medium text-brandink">{size}</p>
                </div>
              ) : null}
            </div>

            {failed ? (
              <div className="mt-4 text-left">
                <ErrorNote>{progress.message}</ErrorNote>
              </div>
            ) : null}

            {needsPermission ? (
              <div className="mt-4 space-y-3 text-left">
                <ErrorNote>{progress.message}</ErrorNote>
                <Button fullWidth variant="secondary" onClick={openInstallSettings}>
                  Open Settings
                </Button>
              </div>
            ) : null}

            <div className="mt-6 space-y-2">
              <Button fullWidth onClick={start}>
                {failed ? "Try Again" : started ? "Install Update" : "Update Now"}
              </Button>
              {/* A mandatory release has no way out of this screen. */}
              {update.mandatory ? (
                <p className="text-sm text-brandmuted">
                  A new version of Nature Caffe is required.
                </p>
              ) : (
                <Button fullWidth variant="ghost" onClick={onClose}>
                  Later
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function Downloading({ progress }: { progress: UpdateProgress }) {
  const percent = progress.state === "downloading" ? progress.percent : 100;
  const indeterminate = percent < 0;

  return (
    <div className="mt-6">
      <p className="font-display text-lg font-semibold text-brandink">
        {progress.state === "installing" ? "Update Ready" : "Downloading Update"}
      </p>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-brandline">
        <div
          className={
            indeterminate
              ? "h-full w-1/3 animate-pulse rounded-full bg-leaf"
              : "h-full rounded-full bg-leaf transition-[width] duration-200"
          }
          style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>

      <p className="mt-3 font-medium text-brandink">
        {progress.state === "installing"
          ? "Opening the installer…"
          : indeterminate
            ? "Downloading…"
            : `${percent}%`}
      </p>
      <p className="mt-1 text-sm text-brandmuted">
        {progress.state === "installing"
          ? "Tap Install when Android asks."
          : "Please keep the app open."}
      </p>
    </div>
  );
}
