import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import { allowSite } from "../src/core/site-access.js";
const responseSource = await readFile(
  new URL("../src/firefox-response.js", import.meta.url),
  "utf8",
);
const source =
  responseSource +
  "\n" +
  (await readFile(new URL("../src/background.js", import.meta.url), "utf8"));
function setup() {
  const events = {},
    tabs = [];
  let granted = false,
    reads = 0,
    modes = {},
    scripts = [];
  const event = (name) => ({
    addListener(fn) {
      (events[name] ??= []).push(fn);
    },
  });
  const original = { id: 7, url: "https://api.example.org/data" };
  let responseListener;
  const api = {
    webRequest: {
      filterResponseData() {
        reads++;
        return { disconnect() {} };
      },
      onHeadersReceived: {
        hasListener: () => Boolean(responseListener),
        addListener(fn) {
          responseListener = fn;
        },
        removeListener() {
          responseListener = null;
        },
      },
    },
    runtime: {
      id: "test",
      getURL: (p) => "moz-extension://test/" + p,
      getManifest: () => ({ browser_specific_settings: { gecko: {} } }),
      onMessage: event("message"),
      onInstalled: event("install"),
      onStartup: event("startup"),
    },
    action: { onClicked: event("click") },
    tabs: { create: async (t) => tabs.push(t), get: async () => original },
    contextMenus: {
      removeAll: async () => {},
      create() {},
      onClicked: event("menu"),
    },
    storage: {
      local: { get: async () => ({ openingModes: modes }) },
      onChanged: event("storage"),
    },
    permissions: {
      contains: async () => granted,
      onAdded: event("added"),
      onRemoved: event("removed"),
    },
    scripting: {
      executeScript: async () => {
        reads++;
        return [{ frameId: 0, result: { text: '{"ok":true}' } }];
      },
      getRegisteredContentScripts: async () => scripts,
      registerContentScripts: async (list) => scripts.push(...list),
      unregisterContentScripts: async ({ ids }) => {
        scripts = scripts.filter((s) => !ids.includes(s.id));
      },
    },
  };
  vm.runInNewContext(source, {
    browser: api,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    crypto: webcrypto,
    console,
  });
  const send = (
    message,
    sender = { id: "test", url: "moz-extension://test/workspace.html" },
  ) =>
    new Promise((resolve) => {
      if (events.message[0](message, sender, resolve) !== true)
        resolve(undefined);
    });
  return {
    events,
    tabs,
    send,
    original,
    close: () => {
      api.tabs.get = async () => {
        throw new Error("Invalid tab ID: 19");
      };
    },
    reads: () => reads,
    grant: (value) => {
      granted = value;
    },
    modes: (value) => {
      modes = value;
    },
    scripts: () => scripts,
    listening: async () => {
      const before = reads;
      await responseListener({
        tabId: 7,
        url: "https://api.example.org/data",
        requestId: "1",
        statusCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      });
      return reads > before;
    },
  };
}
test("Firefox toolbar opens an empty permission workspace without reading the page", async () => {
  const s = setup();
  s.events.click[0](s.original);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(s.reads(), 0);
  assert.equal(s.tabs.length, 1);
  const item = await s.send({ type: "take", id: s.tabs[0].url.split("#")[1] });
  assert.equal(item.text, "");
  assert.equal(item.requiresAccess, true);
  assert.equal(item.sourceTabId, 7);
});
test("Firefox installation opens a welcome workspace only on first install", async () => {
  const s = setup();
  await Promise.all(s.events.install.map((fn) => fn({ reason: "install" })));
  const item = await s.send({ type: "take", id: s.tabs[0].url.split("#")[1] });
  assert.equal(item.welcome, true);
  assert.equal(s.reads(), 0);
  await Promise.all(s.events.install.map((fn) => fn({ reason: "update" })));
  assert.equal(s.tabs.length, 1);
});
test("Firefox auto-open requires preference and permission; disable and revocation remove detectors", async () => {
  const s = setup();
  s.modes({ "https://api.example.org": "always" });
  await s.send({ type: "sync-opening" });
  assert.equal(await s.listening(), false);
  s.grant(true);
  await s.send({ type: "sync-opening" });
  assert.equal(await s.listening(), true);
  await s.send({ type: "sync-opening" });
  assert.equal(await s.listening(), true);
  s.grant(false);
  await s.send({ type: "sync-opening" });
  assert.equal(await s.listening(), false);
  s.grant(true);
  s.modes({ "https://api.example.org": "manual" });
  await s.send({ type: "sync-opening" });
  assert.equal(await s.listening(), false);
});
test("permission request retains the click gesture and requests only one host", async () => {
  let called = false;
  const result = allowSite(
    {
      permissions: {
        request(access) {
          called = true;
          assert.deepEqual(access, { origins: ["https://api.example.org/*"] });
          return Promise.resolve(false);
        },
      },
    },
    "https://api.example.org/data",
    true,
  );
  assert.equal(called, true);
  assert.equal(await result, false);
});
test("read-only capture preserves precise raw JSON and rejects HTML, invalid and oversized responses", async () => {
  const code = await readFile(
    new URL("../src/capture-read.js", import.meta.url),
    "utf8",
  );
  const run = (mime, text) =>
    vm.runInNewContext(code, {
      document: {
        contentType: mime,
        querySelector: () => ({ textContent: text }),
      },
      TextEncoder,
    });
  assert.equal(
    run("application/json", '{"id":9007199254740993}').text,
    '{"id":9007199254740993}',
  );
  assert.match(run("text/html", "<html/>").error, /not a readable/);
  assert.match(run("application/json", "oops").error, /not valid/);
  assert.match(
    run("application/json", " ".repeat(10 * 1024 * 1024) + "{}").error,
    /10 MiB/,
  );
});

test("Firefox detector reads only origins explicitly set to always", async () => {
  const code = await readFile(
    new URL("../src/capture-firefox.js", import.meta.url),
    "utf8",
  );
  for (const mode of [undefined, "manual", "always"]) {
    let reads = 0;
    const messages = [],
      window = {};
    window.top = window;
    vm.runInNewContext(code, {
      window,
      document: {
        contentType: "application/json",
        querySelector: () => {
          reads++;
          return { textContent: '{"ok":true}' };
        },
      },
      TextEncoder,
      location: { origin: "https://api.example.org" },
      browser: {
        storage: {
          local: {
            get: async () => ({
              openingModes: { "https://api.example.org": mode },
            }),
          },
        },
        runtime: { sendMessage: async (m) => messages.push(m) },
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(reads, mode === "always" ? 1 : 0);
    assert.equal(messages.length, mode === "always" ? 1 : 0);
  }
});
