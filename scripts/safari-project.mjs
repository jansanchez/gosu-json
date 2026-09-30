import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const input = resolve("dist/safari");
const output = resolve("build/safari");
const bundleId =
  process.env.GOSU_SAFARI_BUNDLE_ID || "com.jansanchez.gosu-json";
if (!/^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/.test(bundleId)) {
  console.error("GOSU_SAFARI_BUNDLE_ID must be a reverse-DNS identifier.");
  process.exit(1);
}
const args = [
  input,
  "--project-location",
  output,
  "--app-name",
  "GOSU JSON",
  "--bundle-identifier",
  bundleId,
  "--swift",
  "--macos-only",
  "--copy-resources",
  "--no-open",
  "--no-prompt",
];
if (process.argv.includes("--dry-run")) {
  console.log(
    JSON.stringify(
      {
        executable: "xcrun",
        tool: "safari-web-extension-packager (or converter)",
        args,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (process.platform !== "darwin") {
  console.error(
    "Apple packaging requires macOS and Xcode. Use the Safari packaging GitHub Actions workflow or see docs/SAFARI.md.",
  );
  process.exit(1);
}
if (!existsSync(input + "/manifest.json")) {
  console.error("Run npm run build before creating the Safari project.");
  process.exit(1);
}
if (existsSync(output)) {
  console.error(
    "build/safari already exists. Move it aside before generating a fresh project; signing settings will not be overwritten.",
  );
  process.exit(1);
}
const tool = [
  "safari-web-extension-packager",
  "safari-web-extension-converter",
].find(
  (name) =>
    spawnSync("xcrun", ["--find", name], { stdio: "ignore" }).status === 0,
);
if (!tool) {
  console.error(
    "Install Xcode and select its command-line tools. No Safari packaging tool was found.",
  );
  process.exit(1);
}
const help = spawnSync("xcrun", [tool, "--help"], { encoding: "utf8" });
const helpText = (help.stdout || "") + (help.stderr || "");
for (const flag of args.filter((arg) => arg.startsWith("--"))) {
  if (!helpText.includes(flag)) {
    console.error(
      `Your Apple packaging tool does not advertise ${flag}. Update Xcode or follow Apple's manual packaging guide.`,
    );
    process.exit(1);
  }
}
const result = spawnSync("xcrun", [tool, ...args], { stdio: "inherit" });
if (result.error) console.error(result.error.message);
if (result.status === 0)
  console.log(
    "Safari project generated under build/safari. Inspect warnings, select your signing team and validate in actual Safari before distribution.",
  );
process.exit(result.status ?? 1);
