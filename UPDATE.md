# GOSU JSON 0.4.8 update

## Update your existing repository

1. Copy the contents of `patch/` into the root of your gosu-json repository, replacing matching files. This patch is based on 0.4.7; a full source archive is also available in packages/.
2. Run `make all` (or `make all ENGINE=podman`). Node stays inside the project development container.
3. In Firefox, open about:debugging > This Firefox. Reload GOSU JSON. If changing the extension folder, remove the previous temporary installation and load dist/firefox/manifest.json from the rebuilt folder.
4. Close old GOSU JSON workspace tabs and reopen the endpoint. Click the toolbar icon, then **Allow and load JSON**, approve Firefox's site prompt and choose **Always on this site**. This first explicit button makes a fresh GET without cookies or authentication headers.
5. Navigate to the endpoint again. GOSU JSON now opens automatically in a separate tab from the original response, without repeating the endpoint request. The original native-viewer tab remains available. Existing approved Always preferences are reused after reload.

For authenticated endpoints, paste the original response or approve the site and opt into automatic opening before navigating again. A first credential-free GET may return a different response.

## Ready packages

`packages/gosu-json-firefox-0.4.8.zip` is the Firefox submission package; for temporary installation, extract it and choose its manifest.json in about:debugging. Chrome/Brave and Edge keep their required site-access behavior and have no new per-site prompt. Safari remains experimental.

The Firefox package has three additional permissions: webRequest, webRequestBlocking and webRequestFilterResponse. They avoid the isolated native viewer by reading only approved top-level JSON responses and passing every byte through unchanged. See PRIVACY.md and docs/STORE_LISTING.md in the source for reviewer explanations.

`packages/gosu-json-source-0.4.8.zip` contains the complete source and generated dist/ builds. Existing Git history is not included or replaced.

## Verification

48 unit tests passed. Installed Firefox 157 on Linux: native toolbar, empty panels, deny/allow, first fresh GET, automatic import without a duplicate request, Unicode, large IDs, duplicate keys, HTML/plain text/invalid JSON rejection, +json HTTP errors, manual mode and revoked permissions. Chromium workspace UI and mocked access UI passed. Build, syntax/permission and formatting checks passed. Restart, Windows/macOS and Safari are not claimed tested. See docs/VALIDATION.md and scripts/firefox-native-smoke.py.
