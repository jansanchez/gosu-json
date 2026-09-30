# Contributing

1. Open an issue describing the task or bug. Include a minimal, sanitized JSON sample.
2. Make one focused change. Preserve number lexemes, duplicate keys and the original document.
3. Run `npm test`, `npm run build` and `npm run check`.
4. For UI/browser changes, run the relevant checks in [TESTING](docs/TESTING.md).
5. Submit a PR with the problem, resulting behavior and validation performed.

Run `npm ci` once. Use native modules and DOM APIs outside the locally bundled editor. Add a dependency only when its value outweighs size and maintenance. Never render JSON as HTML, execute supplied expressions, persist documents implicitly or expand page access beyond the MIME detector.

Add tests for meaningful parser, edit or diff behavior. UI copy and low-impact styling changes do not need artificial tests. Mention browser coverage honestly.
