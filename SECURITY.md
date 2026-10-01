# Security

Do not post secrets or exploit payloads containing private data in public issues. Use the repository's private vulnerability reporting when enabled. If unavailable, ask a maintainer for a private reporting channel before sharing sensitive details.

GOSU JSON is a preview. See `package.json` for the current version. Security-sensitive fixes should include a minimal regression test. The extension never uses `eval`, remote scripts or HTML rendering of document values. Parser limits bound common resource-exhaustion cases; workers keep costly operations off the UI thread.
