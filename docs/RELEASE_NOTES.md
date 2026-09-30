# GOSU JSON 0.4.2 — preview

Fixes in this release:

- Native browser selection rendering in the editable source and read-only Code preview, replacing the custom selection overlay.
- Drag/double-click selection and native keyboard copy regression checks in both panels.
- Native mouse selection and Ctrl/Cmd+C in tree values, table cells and search results.
- Clicking Table uses the selected array directly; no separate “Table from node” action is required.
- Node highlighting updates existing rows instead of replacing their text elements.

A local JSON workspace with formatted imports, syntax colors, tree/code/table/diff views, text and regex search, value/path copy, lossless edits and endpoint loading.

Included packages:

- Chromium: Chrome and Brave desktop resources.
- Edge: dedicated Microsoft Edge desktop resources.
- Firefox: unsigned resources; permanent installation requires Mozilla signing.
- Safari: web extension resources only; Apple app packaging/signing and actual Safari validation remain pending.
- Source: readable code, locked dependencies, MIT license, English documentation and all prebuilt resource folders.

`SHA256SUMS.txt` provides file integrity hashes; hashes are not publisher signatures. The Safari Actions workflow can generate and compile an unsigned macOS wrapper, but has not yet been run.

32 automated tests and build/manifest/format checks passed. Native installation, permissions and browser-specific flows must still be checked before a stable store release. See `docs/VALIDATION.md` and `docs/TESTING.md`.

Documents are not autosaved; download edits before closing. URL loading connects to the selected endpoint and its redirects. Read `PRIVACY.md` for permissions and network behavior.
