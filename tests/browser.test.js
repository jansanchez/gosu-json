import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
const code = await readFile(
  new URL("../src/background.js", import.meta.url),
  "utf8",
);
function setup() {
  const listeners = {},
    tabs = [];
  const api = {
    runtime: {
      id: "test",
      getURL: (p) => "chrome-extension://test/" + p,
      onMessage: { addListener: (f) => (listeners.message = f) },
      onInstalled: { addListener: (f) => (listeners.install = f) },
    },
    tabs: { create: async (value) => tabs.push(value) },
    contextMenus: {
      removeAll: async () => {},
      create: () => {},
      onClicked: { addListener: (f) => (listeners.menu = f) },
    },
  };
  vm.runInNewContext(code, {
    chrome: api,
    crypto: webcrypto,
    TextEncoder,
    console,
  });
  return {
    tabs,
    send: (message, sender = { id: "test" }) =>
      new Promise((resolve) => {
        const result = listeners.message(message, sender, resolve);
        if (result !== true) resolve(undefined);
      }),
  };
}
test("imports are one-use and restricted to extension workspace", async () => {
  const { tabs, send } = setup();
  assert.equal(
    (await send({ type: "open", text: '{"id":9007199254740993}' })).ok,
    true,
  );
  const id = tabs[0].url.split("#")[1];
  assert.equal(await send({ type: "take", id }, { id: "other" }), undefined);
  assert.equal(
    await send(
      { type: "take", id },
      { id: "test", url: "https://example.org" },
    ),
    undefined,
  );
  const sender = { id: "test", url: "chrome-extension://test/workspace.html" };
  assert.equal(
    (await send({ type: "take", id }, sender)).text,
    '{"id":9007199254740993}',
  );
  assert.equal(await send({ type: "take", id }, sender), null);
});
test("rejects oversized imports before opening tabs", async () => {
  const { tabs, send } = setup();
  assert.match(
    (await send({ type: "open", text: "x".repeat(10 * 1024 * 1024 + 1) }))
      .error,
    /10 MiB/,
  );
  assert.equal(tabs.length, 0);
});
test("capture reads existing JSON and never fetches", async () => {
  const capture = await readFile(
      new URL("../src/capture.js", import.meta.url),
      "utf8",
    ),
    messages = [];
  const window = {};
  window.top = window;
  vm.runInNewContext(capture, {
    window,
    document: {
      contentType: "application/problem+json",
      querySelector: () => ({ textContent: '{"error":"invalid"}' }),
    },
    TextEncoder,
    location: { origin: "https://example.org" },
    chrome: {
      storage: { local: { get: async () => ({}) } },
      runtime: { sendMessage: async (m) => messages.push(m) },
    },
  });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].text, '{"error":"invalid"}');
});
test("automatic detection respects per-site modes and ignores HTML", async () => {
  const code = await readFile(
    new URL("../src/capture.js", import.meta.url),
    "utf8",
  );
  for (const [mime, mode, count, ask] of [
    ["application/json", undefined, 1, true],
    ["application/problem+json", "always", 1, false],
    ["application/json", "manual", 0, false],
    ["text/html", undefined, 0, false],
  ]) {
    const messages = [],
      window = {};
    window.top = window;
    vm.runInNewContext(code, {
      window,
      document: {
        contentType: mime,
        querySelector: () => ({ textContent: '{"ok":true}' }),
      },
      TextEncoder,
      location: { origin: "https://example.org" },
      chrome: {
        storage: {
          local: {
            get: async () => ({
              openingModes: { "https://example.org": mode },
            }),
          },
        },
        runtime: { sendMessage: async (m) => messages.push(m) },
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(messages.length, count);
    if (count) assert.equal(messages[0].askOpening, ask);
  }
});
