import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = dir + "/" + item.name;
    if (item.isDirectory()) await walk(path);
    else if (/\.(js|mjs|cjs)$/.test(path)) {
      const result = spawnSync(process.execPath, ["--check", path], {
        encoding: "utf8",
      });
      if (result.status !== 0) throw new Error(result.stderr);
    }
  }
}
const { version } = JSON.parse(await readFile("package.json", "utf8"));
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
if (lock.version !== version || lock.packages[""].version !== version)
  throw new Error(
    "Run make all to synchronize package-lock.json with package.json",
  );
await walk("src");
await walk("scripts");
for (const browser of ["chromium", "edge", "firefox", "safari"]) {
  const m = JSON.parse(await readFile(`dist/${browser}/manifest.json`));
  if (m.version !== version)
    throw new Error(`Stale ${browser} manifest version`);
  if (
    browser === "firefox" &&
    (m.host_permissions?.length ||
      m.content_scripts?.length ||
      m.action.default_popup ||
      m.optional_host_permissions?.join() !== "http://*/*,https://*/*")
  )
    throw new Error("Invalid Firefox optional-access configuration");
  if (
    browser !== "firefox" &&
    (m.host_permissions?.join() !== "http://*/*,https://*/*" ||
      m.optional_host_permissions?.length)
  )
    throw new Error(
      "Required site access must remain unchanged for this browser",
    );
  if (browser !== "firefox" && m.content_scripts?.[0]?.js?.[0] !== "capture.js")
    throw new Error("Missing MIME detector");
  if (
    browser === "safari" &&
    (m.background.persistent !== false ||
      m.browser_specific_settings ||
      m.background.service_worker)
  )
    throw new Error("Invalid Safari background configuration");
  if (
    ["chromium", "edge"].includes(browser) &&
    (m.background.service_worker !== "background.js" ||
      m.background.scripts ||
      m.browser_specific_settings)
  )
    throw new Error("Invalid Chromium/Edge background configuration");
  if (
    browser === "firefox" &&
    (m.background.scripts?.join() !== "firefox-response.js,background.js" ||
      !["webRequest", "webRequestBlocking", "webRequestFilterResponse"].every(
        (p) => m.permissions.includes(p),
      ))
  )
    throw new Error("Missing native Firefox response capture");
  if (
    browser !== "firefox" &&
    m.permissions.some((p) => p.startsWith("webRequest"))
  )
    throw new Error(
      "Firefox response permissions must not affect other browsers",
    );
  if (m.permissions.includes("unlimitedStorage"))
    throw new Error("Unexpected storage permission");
}
console.log("Syntax and permission checks passed");
