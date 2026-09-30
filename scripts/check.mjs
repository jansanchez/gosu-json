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
await walk("src");
await walk("scripts");
for (const browser of ["chromium", "edge", "firefox", "safari"]) {
  const m = JSON.parse(await readFile(`dist/${browser}/manifest.json`));
  if (m.content_scripts?.[0]?.js?.[0] !== "capture.js")
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
  if (m.permissions.includes("unlimitedStorage"))
    throw new Error("Unexpected storage permission");
}
console.log("Syntax and permission checks passed");
