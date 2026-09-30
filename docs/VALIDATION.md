# Validation for 0.4.0

Passed with Node.js 24.19.0 and headless Chromium 153:

- 29 automated tests: lossless JSON parsing/formatting/editing, capture adapters, regex and text search, duplicate-key IDs, virtual row windows and worker cache behavior.
- Browser UI smoke test: formatted imports, distinct syntax token classes, node editing and undo, table view, code view, both themes, regex filters, malformed expressions and safe text rendering.
- Result reveal at array index 29,999: the selected value was shown with 21 tree DOM rows in a 1440 × 950 viewport. This is a bounded-rendering check, not a general latency guarantee.
- A pathological regex was terminated after the 2-second deadline. A subsequent normal search succeeded.
- Light and dark screenshots were inspected; a large-document grid expansion bug found during testing was fixed.
- Endpoint helpers: URL scheme/credential rejection, query-string link round-trips, streamed byte bounds, UTF-8 chunk boundaries, aborts and inspectable HTTP errors.
- Browser URL workflow: open, refresh, direct-link reload, copied link, invalid-response preservation, cancellation and JSON HTTP errors.
- Source syntax checks, manifest checks and Chromium/Firefox builds at the time of the original UI validation.

The UI test serves the packaged workspace through Playwright routes. It does not install the extension into a normal browser session. Native installation, endpoint MIME capture, clipboard permissions, browser-native JSON viewers, restart behavior and Firefox compatibility still require manual checks.

To reproduce browser checks:

```sh
npm ci
npm run build
npx playwright install chromium
npm run test:ui
```

An existing compatible Chromium executable can be selected with `GOSU_CHROMIUM_EXECUTABLE`. Extra arguments can be supplied as a JSON array in `GOSU_CHROMIUM_ARGS`. Screenshots are written to ignored `artifacts/`.

Run the checklist in TESTING.md before a stable store release.

## Publication preparation updates

The build now generates Chromium, Edge, Firefox and Safari resources. Edge uses the same Manifest V3 service-worker configuration as Chromium. Safari uses a nonpersistent background script. Build and manifest checks cover all four targets; Edge package-root and manifest parity checks were performed.

Three Safari packaging-plan tests cover app-name argument handling, copied macOS resources, publisher bundle identifiers and rejection of malformed identifiers. They do not invoke Apple's tools. The macOS generation/unsigned compilation workflow is prepared but not executed; signing and actual Safari tests remain pending.

The current preparation run passed all 32 automated tests, four resource builds, source/manifest checks and formatting checks. Documentation links and ZIP contents were also checked. No store submission, GitHub workflow execution or native Apple build is recorded as passed.

## 0.4.1 regression fixes

32 automated tests and all four browser resource builds passed. The Chromium workspace UI smoke test passed with actual mouse drag-selection in table cells and native Ctrl+C copy-event verification. It uses the Table view button directly after selecting a nested array, rather than the separate Table from node action. Tree double-click selection/copy is also covered. The large-array reveal still uses 21 rendered rows.

These checks run the workspace in headless Linux Chromium, not an installed Windows extension. Windows manual confirmation and browser store review remain external validation steps.

## 0.4.2 editor selection

The source editor and right Code preview now use the browser's native selection rendering rather than CodeMirror's custom drawSelection overlay. Syntax highlighting, editing and undo are retained. Chromium UI checks passed for actual mouse-drag selection of a source value, Ctrl+C clipboard-event text, double-click selection/copy in the source editor and double-click/copy in the read-only Code preview. Existing tree/table selection, selected-array Table navigation and other smoke checks also passed.

Windows itself has not been tested in this Linux execution environment. The clipboard checks inspect text delivered through the native copy event; they do not verify pasting into a Windows application.
