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
