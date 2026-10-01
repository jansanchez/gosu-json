import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../src/firefox-response.js", import.meta.url),
  "utf8",
);
function setup() {
  let listener,
    filters = [],
    imports = [],
    scope;
  const event = {
    hasListener: () => Boolean(listener),
    removeListener: () => {
      listener = null;
    },
    addListener: (fn, filter) => {
      listener = fn;
      scope = filter;
    },
  };
  const api = {
    webRequest: {
      onHeadersReceived: event,
      filterResponseData: () => {
        const f = {
          writes: [],
          closed: false,
          disconnected: false,
          write(data) {
            this.writes.push(data);
          },
          close() {
            this.closed = true;
          },
          disconnect() {
            this.disconnected = true;
          },
        };
        filters.push(f);
        return f;
      },
    },
  };
  const ctx = { URL, TextDecoder, Uint8Array, console };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  const capture = ctx.createFirefoxResponseCapture(api, async (...args) =>
    imports.push(args),
  );
  return {
    capture,
    filters,
    imports,
    scope: () => scope,
    receive: (overrides = {}) =>
      listener?.({
        tabId: 7,
        url: "https://api.example.org/data",
        requestId: "1",
        statusCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        ...overrides,
      }),
  };
}
test("Firefox response capture is scoped to approved origins and main-frame JSON", async () => {
  const s = setup();
  s.capture.setOrigins(["https://api.example.org"]);
  assert.equal(s.scope().types[0], "main_frame");
  await s.receive({ url: "https://other.example/data" });
  await s.receive({
    responseHeaders: [{ name: "Content-Type", value: "text/html" }],
  });
  await s.receive({ tabId: -1 });
  await s.receive({ statusCode: 302 });
  assert.equal(s.filters.length, 0);
  await s.receive();
  assert.equal(s.filters.length, 1);
});
test("Firefox preserves response bytes and imports Unicode, duplicate keys and huge numbers without another request", async () => {
  const s = setup();
  s.capture.setOrigins(["https://api.example.org"]);
  await s.receive();
  const f = s.filters[0];
  const raw = '{"name":"日本語","id":9007199254740993,"x":1,"x":2}';
  const bytes = new TextEncoder().encode(raw);
  for (let offset = 0; offset < bytes.length; offset += 5) {
    const data = bytes.slice(offset, offset + 5).buffer;
    f.ondata({ data });
    assert.equal(f.writes.at(-1), data);
  }
  f.onstop();
  assert(f.closed);
  assert.equal(s.imports[0][0], raw);
  assert.equal(s.imports[0][2].sourceURL, "https://api.example.org/data");
});
test("Firefox rejects invalid JSON, oversized responses and revoked access while preserving browser data", async () => {
  for (const kind of ["invalid", "oversized", "revoked"]) {
    const s = setup();
    s.capture.setOrigins(["https://api.example.org"]);
    await s.receive();
    const f = s.filters[0];
    const data =
      kind === "oversized"
        ? new Uint8Array(10 * 1024 * 1024 + 1).buffer
        : new TextEncoder().encode(
            kind === "invalid" ? "not json" : '{"ok":true}',
          ).buffer;
    f.ondata({ data });
    assert.equal(f.writes[0], data);
    if (kind === "revoked") s.capture.setOrigins([]);
    if (!f.disconnected) f.onstop();
    assert.equal(s.imports.length, 0);
    if (kind !== "invalid") assert(f.disconnected);
  }
});

test("Firefox waits for site preferences after a background wake and bounds concurrent streams", async () => {
  const s = setup();
  let resolve;
  const ready = new Promise((r) => (resolve = r));
  s.capture.setReady(ready);
  const request = s.receive();
  await Promise.resolve();
  assert.equal(s.filters.length, 0);
  s.capture.setOrigins(["https://api.example.org"]);
  resolve();
  await request;
  assert.equal(s.filters.length, 1);
  for (let i = 0; i < 12; i++) await s.receive({ requestId: String(i + 2) });
  assert.equal(s.filters.length, 8);
  s.capture.setOrigins(["https://api.example.org"]);
  assert(s.filters.every((f) => !f.disconnected));
  s.capture.setOrigins([]);
  assert(s.filters.every((f) => f.disconnected));
});
