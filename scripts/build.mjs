import { build } from "esbuild";
import { cp, mkdir, writeFile, rm, readdir, readFile } from "node:fs/promises";

const FIREFOX_MIN_VERSION = "142.0";

const { version } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const common = {
  manifest_version: 3,
  name: "GOSU JSON",
  version,
  description:
    "Format, explore, search and edit JSON in your browser. Compare files, inspect API responses and preserve large numbers.",
  permissions: ["activeTab", "scripting", "storage", "contextMenus"],
  host_permissions: ["http://*/*", "https://*/*"],
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      js: ["capture.js"],
      run_at: "document_idle",
    },
  ],
  action: { default_popup: "popup.html" },
  icons: { 16: "icons/16.png", 48: "icons/48.png", 128: "icons/128.png" },
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'none'",
  },
};
for (const browser of ["chromium", "edge", "firefox", "safari"]) {
  const dest = `dist/${browser}`;
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp("src", dest, { recursive: true });
  await build({
    entryPoints: ["src/workspace.js"],
    outfile: dest + "/workspace.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    target:
      browser === "safari"
        ? ["safari17.4"]
        : browser === "firefox"
          ? [`firefox${FIREFOX_MIN_VERSION}`]
          : ["chrome128"],

    minify: true,
    legalComments: "eof",
  });
  await cp("THIRD_PARTY_NOTICES.md", dest + "/THIRD_PARTY_NOTICES.md");
  await mkdir(dest + "/licenses", { recursive: true });
  const modules = [
    "@codemirror/state",
    "@codemirror/view",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lang-json",
    "@lezer/common",
    "@lezer/lr",
    "@lezer/json",
    "@lezer/highlight",
    "style-mod",
    "w3c-keyname",
    "crelt",
  ];
  for (const name of modules) {
    const entries = await readdir("node_modules/" + name);
    const license = entries.find((x) => /^license(\.|$)/i.test(x));
    if (!license) throw new Error("License missing: " + name);
    await cp(
      "node_modules/" + name + "/" + license,
      dest + "/licenses/" + name.replaceAll("/", "-") + ".txt",
    );
  }

  const manifest = structuredClone(common);
  manifest.background = ["chromium", "edge"].includes(browser)
    ? { service_worker: "background.js" }
    : { scripts: ["background.js"] };
  if (browser === "safari") manifest.background.persistent = false;
  if (browser === "firefox") {
    delete manifest.host_permissions;
    delete manifest.content_scripts;
    manifest.optional_host_permissions = ["http://*/*", "https://*/*"];
    manifest.action = { default_title: "Open in GOSU JSON" };
    manifest.permissions.push(
      "webRequest",
      "webRequestBlocking",
      "webRequestFilterResponse",
    );
    manifest.background.scripts = ["firefox-response.js", "background.js"];
  }
  if (browser === "firefox")
    manifest.browser_specific_settings = {
      gecko: {
        id: "json-atelier@local.invalid",
        strict_min_version: FIREFOX_MIN_VERSION,
        data_collection_permissions: { required: ["none"] },
      },
    };
  await writeFile(
    dest + "/manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
console.log(
  "Built dist/chromium, dist/edge, dist/firefox and dist/safari (experimental)",
);
