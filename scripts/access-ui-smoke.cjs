const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.GOSU_CHROMIUM_EXECUTABLE || undefined,
    args: process.env.GOSU_CHROMIUM_ARGS
      ? JSON.parse(process.env.GOSU_CHROMIUM_ARGS)
      : [],
  });
  try {
    const context = await browser.newContext();
    await context.route("http://gosu.test/**", async (route) => {
      const p = new URL(route.request().url()).pathname;
      const body = await fs.readFile(
        path.resolve(__dirname, "../dist/firefox") + p,
      );
      await route.fulfill({
        body,
        contentType: p.endsWith(".js")
          ? "text/javascript"
          : p.endsWith(".css")
            ? "text/css"
            : "text/html",
      });
    });
    await context.addInitScript(() => {
      window.testAccess = {
        accept: false,
        reads: 0,
        requests: 0,
        modes: {},
        sync: 0,
      };
      window.browser = {
        runtime: {
          getManifest: () => ({ browser_specific_settings: { gecko: {} } }),
          sendMessage: async (m) => {
            if (m.type === "take")
              return {
                requiresAccess: true,
                text: "",
                sourceTabId: 7,
                sourceURL: "https://api.example.org/data",
                origin: "https://api.example.org",
              };
            if (m.type === "sync-opening") {
              window.testAccess.sync++;
              return { ok: true };
            }
          },
        },
        permissions: {
          request: async () => {
            window.testAccess.requests++;
            return window.testAccess.accept;
          },
          contains: async () => window.testAccess.accept,
        },
        storage: {
          local: {
            get: async () => ({}),
            set: async (v) => {
              window.testAccess.modes = v.openingModes;
            },
          },
        },
      };
    });
    let requests = 0;
    await context.route("https://api.example.org/data", async (route) => {
      requests++;
      await route.fulfill({
        body: '{"data":[{"id":1,"name":"Alex"}]}',
        contentType: "application/json",
      });
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://gosu.test/workspace.html#pending");
    await page.locator("#accessPrompt").waitFor({ state: "visible" });
    assert.equal(await page.locator("#editor .cm-content").textContent(), "");
    assert.equal(await page.locator(".tree-row").count(), 0);
    assert.equal(await page.evaluate(() => window.testAccess.reads), 0);
    await page.locator("#declineAccess").click();
    assert.equal(await page.evaluate(() => window.testAccess.requests), 0);
    await page.locator("#allowAccess").click();
    await page.waitForFunction(() =>
      document.querySelector("#accessStatus").textContent.includes("declined"),
    );
    assert.equal(await page.evaluate(() => window.testAccess.reads), 0);
    assert.equal(await page.locator("#editor .cm-content").textContent(), "");
    await page.evaluate(() => (window.testAccess.accept = true));
    await page.locator("#allowAccess").click();
    await page.locator("#openingPrompt").waitFor({ state: "visible" });
    assert.equal(requests, 1);
    assert.equal(await page.evaluate(() => window.testAccess.reads), 0);
    assert(
      (await page.locator("#editor .cm-content").textContent()).includes(
        "Alex",
      ),
    );
    await page.locator("#alwaysOpen").click();
    await page.waitForFunction(
      () => document.querySelector("#openingPrompt").hidden,
    );
    assert.equal(
      await page.evaluate(
        () => window.testAccess.modes["https://api.example.org"],
      ),
      "always",
    );
    assert.equal(await page.evaluate(() => window.testAccess.sync), 1);
    const recovery = await context.newPage();
    await recovery.goto("http://gosu.test/workspace.html#pending");
    await recovery.locator("#accessPrompt").waitFor({ state: "visible" });
    await recovery.evaluate(() => {
      window.testAccess.accept = true;
      window.testAccess.closed = true;
    });
    await recovery.locator("#allowAccess").click();
    await recovery.waitForFunction(() =>
      document.querySelector("#requestStatus").textContent.includes("HTTP 200"),
    );
    assert.equal(requests, 2);
    assert.equal(await recovery.locator("#accessPrompt").isVisible(), false);
    assert.equal(await recovery.locator("#openingPrompt").isVisible(), true);
    assert(
      (await recovery.locator("#editor .cm-content").textContent()).includes(
        "Alex",
      ),
    );
    console.log(
      "PASS: closed-tab approval uses an explicit fresh request, clears the stale access banner and offers auto-open.",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Firefox workflow with mocked APIs: empty panels, defer, deny, approve, explicit URL loading and opt-in auto-open.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
