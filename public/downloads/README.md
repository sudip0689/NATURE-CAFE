# Android releases

The APKs the installed Nature Caffe app updates itself from, and the manifest
that points at them (`/app-update.json`).

## The two update paths

Most changes never come through here. The app is a WebView onto this
deployment, so anything the web app owns — the menu, the POS, billing,
receipts, styling — ships with an ordinary `git push` and appears on the next
page load with no reinstall.

An APK release is only needed for what is compiled into the wrapper: the
Bluetooth printer driver, the file picker, permissions, the updater itself.

## Cutting a release

1. In `nature-caffe-android/app/build.gradle`, raise **both**:
   - `versionCode` — the number the updater compares. It only ever goes up,
     and a number is never reused. Android refuses to install an APK whose
     versionCode is not higher than the installed one.
   - `versionName` — what the café reads on the update card.

2. Build the signed release. Not the debug build: that one carries the
   `.debug` application id suffix, so Android treats it as a different app and
   it can never update this one.

   ```
   gradle assembleRelease
   ```

3. Copy `app/build/outputs/apk/release/app-release.apk` here as
   `nature-caffe-<versionName>.apk`.

4. Update `public/app-update.json` to match: `latestVersionCode`,
   `latestVersionName`, `apkUrl`, and release notes written for a cashier
   rather than for a changelog.

5. Push. Vercel serves both files, and installed apps pick the release up at
   their next check.

## mandatory

Leave it `false` unless carrying on with the old version would be worse than
interrupting service. `true` dims the till and removes the dismiss button, so
the café cannot take another order until the update is installed.

## The signing key

`nature-caffe-android/keystore/` — deliberately outside this repository and
outside version control. Android only installs an update over an app signed
with the same key, so losing that file means no future APK can update an
installed Nature Caffe: the café would have to uninstall and reinstall. Back
it up somewhere other than the build machine.
