const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
(async () => {
  const dir = require("node:path").resolve(__dirname, "../dist/chromium");
  const output = require("node:path").resolve(__dirname, "../artifacts");
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.GOSU_CHROMIUM_EXECUTABLE || undefined,
    args: process.env.GOSU_CHROMIUM_ARGS
      ? JSON.parse(process.env.GOSU_CHROMIUM_ARGS)
      : [],
    env: process.env,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  await context.route("http://gosu.test/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    try {
      const body = await fs.readFile(dir + path);
      await route.fulfill({
        body,
        contentType: path.endsWith(".js")
          ? "text/javascript"
          : path.endsWith(".css")
            ? "text/css"
            : "text/html",
      });
    } catch {
      await route.fulfill({ status: 404, body: "Missing" });
    }
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://gosu.test/workspace.html");
  await page.locator("#file").setInputFiles({
    name: "example.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      '{"id":9007199254740993123,"data":[{"name":"Lima","price":1.00,"status":"pending"}],"html":"<img src=x onerror=alert(1)>"}',
    ),
  });
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("nodes"),
  );
  assert((await page.locator("#editor .tok-key").count()) > 0);
  assert((await page.locator("#editor .tok-string").count()) > 0);
  assert.equal(await page.locator("#dirty").textContent(), "");
  // Native mouse selection and keyboard copy in the editable left panel.
  await page.evaluate(() => {
    document.addEventListener("copy", (event) => {
      window.editorCopy =
        event.clipboardData.getData("text/plain") || getSelection().toString();
    });
  });
  const sourceToken = page
    .locator("#editor .tok-string")
    .filter({ hasText: "Lima" })
    .first();
  const sourceBox = await sourceToken.boundingBox();
  assert(sourceBox);
  await page.mouse.move(sourceBox.x + 1, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    sourceBox.x + sourceBox.width - 1,
    sourceBox.y + sourceBox.height / 2,
    { steps: 15 },
  );
  await page.mouse.up();
  assert(
    (await page.evaluate(() => getSelection().toString())).includes("Lima"),
  );
  await page.keyboard.press("Control+c");
  assert((await page.evaluate(() => window.editorCopy)).includes("Lima"));
  await sourceToken.dblclick();
  await page.keyboard.press("Control+c");
  assert.equal(await page.evaluate(() => window.editorCopy), "Lima");

  await page.locator("#search").fill("Lima");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("1 search matches"),
  );
  assert(
    (await page.locator("#results .virtual-viewport").boundingBox()).height <=
      48,
  );
  assert((await page.locator("#results").boundingBox()).height < 110);
  await page.locator(".search-result").click();
  assert.equal(await page.locator(".tree-row.selected").count(), 1);
  assert(
    await page
      .locator(".tree-row.selected")
      .textContent()
      .then((x) => x.includes("Lima")),
  );
  assert.equal(await page.evaluate(() => getSelection().toString()), '"Lima"');
  const result = page.locator(".search-result");
  assert.equal(
    await result.evaluate((el) => getComputedStyle(el).cursor),
    "pointer",
  );
  assert.equal(
    await result
      .locator(".result-path")
      .evaluate((el) => getComputedStyle(el).cursor),
    "pointer",
  );
  assert.equal(
    await result
      .locator(".tok-string")
      .evaluate((el) => getComputedStyle(el).cursor),
    "pointer",
  );
  // Pointer styling must still allow native selection and copy in search data.
  await result.locator(".tok-string").dblclick();
  assert(
    (await page.evaluate(() => getSelection().toString())).includes("Lima"),
  );
  await page.keyboard.press("Control+c");
  assert((await page.evaluate(() => window.editorCopy)).includes("Lima"));
  await page.evaluate(() => getSelection().removeAllRanges());
  const objectNode = page.locator('.node-value[title="/data/0"]');
  await objectNode.click();
  assert.deepEqual(
    JSON.parse(await page.evaluate(() => getSelection().toString())),
    { name: "Lima", price: 1, status: "pending" },
  );
  // Return to the string before editing it.
  await result.click();
  await page.locator("#editNode").click();
  await page.locator("#replacement").fill('"Cusco"');
  await page.locator("#apply").click();
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("0 search matches"),
  );
  await page.locator("#search").fill("data");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("1 search matches"),
  );
  await page.locator(".search-result").click();
  // A right-panel array click must create a real native selection in the source.
  const arraySelection = await page.evaluate(() => getSelection().toString());
  assert.deepEqual(JSON.parse(arraySelection), [
    { name: "Cusco", price: 1, status: "pending" },
  ]);
  assert.equal(
    await page
      .locator("#editor .cm-content")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Control+c");
  assert.equal(await page.evaluate(() => window.editorCopy), arraySelection);
  await page.locator("[data-view=table]").click();
  assert.equal(await page.locator("td").count(), 4);
  // Drag-select real text in the table, then use the normal browser copy command.
  const cell = page
    .locator(".table-value")
    .filter({ hasText: "Cusco" })
    .first();
  const rect = await cell.boundingBox();
  assert(rect);
  await page.mouse.move(rect.x + 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width - 2, rect.y + rect.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  assert(
    (await page.evaluate(() => getSelection().toString())).includes("Cusco"),
  );
  await page.evaluate(() => {
    window.nativeCopyEvents = 0;
    document.addEventListener("copy", () => {
      window.lastNativeCopy = getSelection().toString();
    });
    document.addEventListener("copy", (event) => {
      if (
        !event.defaultPrevented &&
        getSelection().toString().includes("Cusco")
      )
        window.nativeCopyEvents++;
    });
  });
  await page.keyboard.press("Control+c");
  assert.equal(await page.evaluate(() => window.nativeCopyEvents), 1);
  await page.evaluate(() => getSelection().removeAllRanges());

  await page.locator("#searchMode").selectOption("regex");
  await page.locator("#searchScope").selectOption("values");
  await page.locator("#search").fill("^(pending|failed)$");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("1 search matches"),
  );
  await page.locator(".search-result").click();
  assert.equal(await page.locator("#path").textContent(), "/data/0/status");
  await page.locator("[data-view=code]").click();
  assert((await page.locator("#view .tok-key").count()) > 0);
  // The right Code preview uses the same native editor selection behavior.
  const previewToken = page
    .locator("#view .tok-string")
    .filter({ hasText: "Cusco" })
    .first();
  await previewToken.dblclick();
  await page.keyboard.press("Control+c");
  assert.equal(await page.evaluate(() => window.editorCopy), "Cusco");

  await page.locator("[data-view=tree]").click();
  await page.locator(".search-result").click();
  // Double-click and drag in tree data must preserve a native text selection.
  const treeText = page.locator(".tree-row.selected .tok-string");
  await treeText.dblclick();
  assert(
    (await page.evaluate(() => getSelection().toString())).includes("pending"),
  );
  await page.keyboard.press("Control+c");
  assert(
    (await page.evaluate(() => window.lastNativeCopy)).includes("pending"),
  );
  await page.evaluate(() => getSelection().removeAllRanges());
  await page.locator("#theme").selectOption("dark");
  await page.screenshot({ path: output + "/dark.png", fullPage: true });
  await page.locator("#theme").selectOption("light");
  await page.screenshot({ path: output + "/light.png", fullPage: true });
  page.on("dialog", (d) => d.accept());
  const large = JSON.stringify(
    Array.from({ length: 30000 }, (_, i) => ({
      id: i,
      value:
        i === 29999 ? "TARGET-END" : i === 15000 ? "SCROLL-MARKER" : "other",
    })),
  );
  await page.locator("#file").setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.from(large),
  });
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("nodes"),
  );
  await page.locator("[data-view=tree]").click();
  await page.locator('.node-value[title="(root)"]').click();
  await page.keyboard.press("Control+c");
  const copiedLarge = JSON.parse(await page.evaluate(() => window.editorCopy));
  assert.equal(copiedLarge.length, 30000);
  assert.equal(copiedLarge[29999].value, "TARGET-END");
  await page.locator("#searchMode").selectOption("text");
  await page.locator("#search").fill("SCROLL-MARKER");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("1 search matches"),
  );
  await page.locator(".search-result").click();
  await page.waitForTimeout(100);
  const alignment = await page.evaluate(() => {
    const range = getSelection().getRangeAt(0);
    const top = range.getClientRects()[0].top;
    const scroller = document.querySelector("#editor .cm-scroller");
    return {
      gap: top - scroller.getBoundingClientRect().top,
      line: parseFloat(getComputedStyle(scroller).lineHeight),
    };
  });
  assert(
    alignment.gap >= alignment.line * 2.5 &&
      alignment.gap <= alignment.line * 3.7,
    JSON.stringify(alignment),
  );
  await page.locator("#search").fill("TARGET-END");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("1 search matches"),
  );
  await page.locator(".search-result").click();
  assert.equal(await page.locator("#path").textContent(), "/29999/value");
  assert(
    await page
      .locator(".tree-row.selected")
      .textContent()
      .then((x) => x.includes("TARGET-END")),
  );
  assert((await page.locator(".tree-row").count()) < 60);
  const count = await page.locator(".tree-row").count();
  await page.locator("#searchMode").selectOption("regex");
  await page.locator("#search").fill("[");
  await page.waitForFunction(() =>
    document
      .querySelector("#status")
      .textContent.includes("Invalid regular expression"),
  );
  await page.locator("#file").setInputFiles({
    name: "regex-timeout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(["a".repeat(32) + "!"])),
  });
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("nodes"),
  );
  await page.locator("#search").fill("^(a+)+$");
  await page.waitForFunction(
    () =>
      document
        .querySelector("#status")
        .textContent.includes("exceeded 2 seconds"),
    { timeout: 10000 },
  );
  await page.locator("#searchMode").selectOption("text");
  await page.locator("#search").fill("!");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("1 search matches"),
  );
  await page.locator(".search-result").click();
  assert.equal(await page.locator("#path").textContent(), "/0");
  await page.locator("#editNode").click();
  await page.locator("#replacement").fill('"done"');
  await page.locator("#apply").click();
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("0 search matches"),
  );
  await page.locator("#editor .cm-content").click();
  await page.keyboard.press("Control+z");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("1 search matches"),
  );
  assert((await page.locator("#editor").textContent()).includes("!"));
  assert.equal(await page.locator("img").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser UI, colored source/code/tree, format-on-open, edit, table, regex, invalid regex, themes, result reveal at row 29,999, pathological regex timeout and recovery. Rendered tree rows: " +
      count,
  );
  let requests = 0;
  await context.route("https://api.gosu.test/**", async (route) => {
    const url = new URL(route.request().url());
    requests++;
    const headers = { "access-control-allow-origin": "*" };
    if (url.pathname === "/slow") {
      await new Promise((r) => setTimeout(r, 700));
      await route
        .fulfill({
          body: '{"late":true}',
          contentType: "application/json",
          headers,
        })
        .catch(() => {});
      return;
    }
    if (url.pathname === "/html") {
      await route.fulfill({
        body: "<h1>Error</h1>",
        contentType: "text/html",
        headers,
      });
      return;
    }
    await route.fulfill({
      status: url.pathname === "/error" ? 422 : 200,
      body: JSON.stringify({ count: requests, status: "ready" }).replace(
        '"ready"',
        '"ready"',
      ),
      contentType: "application/json",
      headers,
    });
  });
  await page.locator("#search").fill("");
  const endpoint = "https://api.gosu.test/data?q=a%26b&accessType=DOWNLOAD";
  await page.locator("#endpointURL").fill(endpoint);
  await page.locator("#loadURL").click();
  await page.waitForFunction(() =>
    document.querySelector("#requestStatus").textContent.includes("HTTP 200"),
  );
  assert.equal(requests, 1);
  assert.equal(
    new URLSearchParams(new URL(page.url()).hash.slice(1)).get("url"),
    endpoint,
  );
  await page.locator("#refreshURL").click();
  await page.waitForFunction(() =>
    document.querySelector("#editor").textContent.includes('"count": 2'),
  );
  assert.equal(requests, 2);
  const directLink = page.url();
  const second = await context.newPage();
  second.on("pageerror", (e) => errors.push(e.message));
  await second.goto(directLink);
  await second.waitForFunction(() =>
    document.querySelector("#requestStatus").textContent.includes("HTTP 200"),
  );
  assert.equal(requests, 3);
  await second.close();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedLink = text;
        },
      },
    });
  });
  await page.locator("#copyLink").click();
  assert.equal(
    await page.evaluate(() =>
      new URLSearchParams(new URL(window.copiedLink).hash.slice(1)).get("url"),
    ),
    endpoint,
  );
  const previous = await page.locator("#editor").textContent();
  await page.locator("#endpointURL").fill("https://api.gosu.test/html");
  await page.locator("#loadURL").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#requestStatus")
      .textContent.includes("not valid JSON"),
  );
  assert.equal(await page.locator("#editor").textContent(), previous);
  await page.locator("#endpointURL").fill("https://api.gosu.test/slow");
  await page.locator("#loadURL").click();
  await page.locator("#cancelURL").click();
  assert(
    (await page.locator("#requestStatus").textContent()).includes("cancelled"),
  );
  assert.equal(await page.locator("#editor").textContent(), previous);
  await page.locator("#endpointURL").fill("https://api.gosu.test/error");
  await page.locator("#loadURL").click();
  await page.waitForFunction(() =>
    document.querySelector("#requestStatus").textContent.includes("HTTP 422"),
  );
  assert((await page.locator("#editor").textContent()).includes("ready"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: URL loading, refresh, direct links with query strings, copied link, invalid response preservation, request cancellation and JSON HTTP errors.",
  );
  // Table downloads include every page and retain text/Unicode in both formats.
  const exportRows = Array.from({ length: 120 }, (_, id) => ({
    id,
    name: id === 119 ? 'Ana, "Sánchez"' : "row-" + id,
    nested: { enabled: true },
  }));
  await page.locator("#file").setInputFiles({
    name: "export.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exportRows)),
  });
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("nodes"),
  );
  await page.locator("#search").fill("");
  await page.locator("[data-view=table]").click();
  const csvEvent = page.waitForEvent("download");
  await page.locator("[data-export=csv]").click();
  const csvDownload = await csvEvent;
  assert.equal(csvDownload.suggestedFilename(), "export-table.csv");
  const csv = await fs.readFile(await csvDownload.path(), "utf8");
  assert(csv.startsWith('\uFEFF"#","id","name","nested"\r\n'));
  assert(csv.includes('"119","119","Ana, ""Sánchez"""'));
  assert.equal(csv.split("\r\n").length, 122);
  const xmlEvent = page.waitForEvent("download");
  await page.locator("[data-export=excel]").click();
  const xmlDownload = await xmlEvent;
  assert.equal(xmlDownload.suggestedFilename(), "export-table.xml");
  const xml = await fs.readFile(await xmlDownload.path(), "utf8");
  const workbook = await page.evaluate((text) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return {
      errors: doc.querySelectorAll("parsererror").length,
      rows: doc.getElementsByTagName("Row").length,
      last: doc.getElementsByTagName("Row")[120].textContent,
    };
  }, xml);
  assert.equal(workbook.errors, 0);
  assert.equal(workbook.rows, 121);
  assert(workbook.last.includes('Ana, "Sánchez"'));
  await page.screenshot({ path: output + "/table-export.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: compact single result, source alignment with three context lines, full 120-row CSV/Excel XML downloads and valid XML structure.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
