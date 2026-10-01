# Testing

Automated: `npm test` covers parser errors, all root types, Unicode/escaping, duplicate keys, large numbers, lossless formatting, source-preserving edits, structural diff, search and depth bounds. `npm run check` checks source syntax and manifest permissions. The reproducible browser test is described in [VALIDATION](VALIDATION.md).

Before a release, test both Chromium and Firefox:

- Install the unpacked/temporary extension; verify popup and workspace load without console errors.
- Open a real JSON endpoint, import it and confirm only the original request reached the server.
- Test `application/json`, `application/problem+json`, plain text, invalid JSON and browser-native viewers.
- Detect a JSON page, leave the choice banner unanswered, then test Always and Manual choices across navigation and browser restart. Verify non-JSON pages never open and manual toolbar import still works.
- Open a selection via the context menu; try a restricted browser page.
- Paste and drop files; cancel clipboard permission; check files over the size limit.
- Edit a node containing a huge ID; verify exported bytes preserve other values.
- Compare added/removed/changed fields, duplicate keys and arrays.
- Test empty arrays, mixed arrays, deep branches and a 10 MiB document; cancel an operation.
- Switch themes, test keyboard focus, source undo/redo and command shortcuts.
- Search, then edit while search/format/diff is running; stale results must not replace new text.
- Modify, refresh and close; verify the warning and that no document persists.

Record browser versions and actual results in the release PR. Do not label these manual checks passed unless performed.

Version 0.3 checks: verify distinct key/value colors in both themes and Code view; test regex scopes, case/exact options, invalid regex, timeout recovery; find the final row in a 30,000-element array and confirm few tree DOM rows; inspect duplicate keys independently and undo node edits.

Version 0.4: load a public endpoint in the URL bar, refresh, bookmark/reopen its viewer link and modify the encoded endpoint in the address bar. Test 4xx JSON, non-JSON, redirects, cancellation, network failure and oversized/chunked responses. Native host permissions and cross-origin behavior must also be verified inside installed Chromium/Firefox extensions.

## Firefox 0.4.8 native integration

Install the Firefox build and verify the first-install welcome. Open a JSON endpoint and click the toolbar icon: both panels stay empty until approval. Test Not now and denial. Accept **Allow and load JSON**: expect one fresh credential-free GET and a formatted document. The original tab may be closed; loading should still work. If the endpoint needs authentication, paste the original response or opt into automatic opening and navigate to it again.

Choose **Always on this site** and navigate again: exactly one request should produce one automatic workspace with the original response. The native viewer remains in the original tab. Verify huge numbers, Unicode and duplicate keys; HTML, plain text, invalid JSON, downloads and subframes must not trigger it. Test +json error responses, the 10 MiB limit, overlapping responses, permission revocation, manual opening and a browser restart. Check Chrome separately: first JSON navigation still opens automatically without a new per-site prompt.

An optional Selenium integration check installs the packaged extension in real Firefox, exercises the native toolbar and permission dialog, and uses a local HTTP server:

```sh
python3 -m venv .venv
.venv/bin/pip install selenium
GOSU_FIREFOX_EXECUTABLE=/absolute/path/to/firefox \
GOSU_GECKODRIVER_EXECUTABLE=/absolute/path/to/geckodriver \
.venv/bin/python scripts/firefox-native-smoke.py
```

Run `make all` first to build the package. Firefox and geckodriver are external test tools, not runtime dependencies of the extension. The script tests permission denial/approval, empty panels, explicit first GET, automatic import without a second GET, exact large numbers, duplicate keys, Unicode, non-JSON rejection, +json HTTP errors and revocation. It does not cover browser restart, Windows/macOS or store signing. In containers that prevent Firefox sandbox creation, run this test in a normal desktop environment.
