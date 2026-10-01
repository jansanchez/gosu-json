# Microsoft Edge desktop

GOSU JSON now generates a dedicated `dist/edge` folder and `releases/gosu-json-edge-0.4.8.zip`. Edge uses Chromium extension APIs, so this target shares the Chrome implementation: Manifest V3, a background service worker, the same editor and the same permissions. It adds no tracking, dependencies or native components.

Build and manifest checks pass. **Installation, permission prompts and runtime behavior in actual Edge have not yet been validated.** The Chromium UI smoke test is not an Edge installation test. Mobile Edge support is not claimed.

## Install locally

1. Extract the source ZIP and keep the folder in place.
2. Open `edge://extensions` in Microsoft Edge.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select `dist/edge`, which must contain `manifest.json`.
5. Open GOSU JSON from the extensions menu and choose **New workspace**.

If you downloaded the Edge-only ZIP, extract it and select the extracted folder itself: `manifest.json` is at its root. If you downloaded source without prebuilt folders, run `npm ci` and `npm run build` first.

Keep the installation folder path unchanged when updating, replace its files and reload the existing extension. Extension identifiers and direct viewer links can differ between a local installation and a store installation.

## Verify in Edge before publication

Use the checks in [TESTING.md](TESTING.md): paste/file import, formatting, editing and undo, clipboard/download, themes, tree/search result navigation, regex cancellation, table/diff, JSON-page capture, opening preferences, endpoint requests and viewer links. Check denied website permissions and restricted browser pages too. Record the Edge and operating-system versions in [VALIDATION.md](VALIDATION.md).

## Publish in Microsoft Edge Add-ons

1. Register as an Edge extension developer in [Microsoft Partner Center](https://partner.microsoft.com/dashboard). Complete the account/enrollment verification required by Microsoft.
2. Build, check and package the release. Upload `gosu-json-edge-0.4.8.zip`, not the source ZIP. The package must have `manifest.json` at its root.
3. Create the extension listing: name, description, supported language(s), icon, screenshots, support and website details.
4. Complete privacy disclosures and provide a public privacy-policy URL once the repository is published. Explain broad HTTP/HTTPS access for JSON detection and user-requested endpoint loading, local preferences and the single purpose of the extension.
5. Submit for certification and address feedback. After approval/publication, users install from Microsoft Edge Add-ons without Developer mode.

Uploading a ZIP does not itself mean approval or publication. Existing compatibility with Chromium is not a substitute for testing the submitted release in Edge.

Official Microsoft guides:

- [Port a Chrome extension to Edge](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/port-chrome-extension)
- [Install locally](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)
- [Publish an extension](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension)
