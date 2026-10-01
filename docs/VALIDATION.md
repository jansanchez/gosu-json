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

## 0.4.2 container tooling (2026-10-01)

The extension remains at 0.4.2. Added Makefile, a Node 24.21.0 development Dockerfile with Python, a minimal Docker build context, and a version-scoped esbuild install-script approval.

- All 32 unit tests passed; all browser resources built; syntax/permission and formatting checks passed; release ZIPs generated.
- `make help`, Docker/Podman command dry runs, and the missing-engine failure message were checked.
- Docker and Podman are unavailable in the validation environment. The container image was not built and `make all` was not executed inside a real container. Verify it on a machine with either engine installed.

## 0.4.2 node selection and search cursor correction (2026-10-01)

Compared the supplied source archive with this version: the src/ files matched.

- Reproduced the selection defect with a regression test: without the focus correction, a selected search value produced an empty native selection instead of its complete JSON source.
- Selecting a tree node now focuses the source editor before applying its full parsed range. Expanding/collapsing an object or array also selects its range. Search results use a pointer cursor across the path, value and highlighted match while retaining native text selection.
- Chromium UI tests verify full object/array selection, keyboard copying of an entire 30,000-element array despite editor virtualization, result cursors, double-click/copy in search results and both panels, Table and reveal at index 29,999.
- All 32 unit tests passed. Browser packages built; syntax/permission checks passed. These tests use a served workspace in headless Chromium on Linux; native Windows/macOS extension execution was not exercised.

## 0.4.2 table export and compact navigation (2026-10-01)

- Added worker-based CSV and basic Excel XML export for the full displayed array, not only the current page. Both share the table's first 50 data columns plus row index. No new dependencies or permissions.
- 38 unit tests passed: CSV quoting/Unicode, exact numeric spellings, nested values, heterogeneous rows, duplicate columns, formula-like text, Excel XML encoding and practical limits, and selected-array worker dispatch.
- Chromium UI tests passed: download and inspect all 120 rows as CSV and Excel XML, parse downloaded XML without errors, verify source selection at approximately three line heights below the scroller top, and verify a one-result viewport stays under 48 pixels. Existing native copy (including a 30,000-item array), table navigation, search/regex/virtual reveal, editing, themes and endpoint checks also passed.
- XML is Spreadsheet 2003 format, not XLSX. All cells are text; native Excel import/opening was not tested. CSV stores exact text but spreadsheet applications may auto-convert numeric columns. Export caps: 50 MiB total; Excel XML 65,535 data rows and 32,767 characters per cell.
- CodeMirror scroll requests use top alignment with a three-line margin. Near the start or end of the document the available scroll range may limit context. Headless Chromium/Linux was used; other native browsers/platforms were not exercised here.

## 0.4.5 centralized version (2026-10-01)

Build manifests and release filenames read the version from package.json. Make synchronizes the npm lockfile inside the container before installing. All 38 unit tests, build, syntax/permission checks and formatting checks passed. The four packaged manifests were verified as 0.4.5; an isolated stale-build fixture was rejected before archives were written. Docker/Podman are unavailable in the validation environment, so make all itself was not executed here. make help was checked.
