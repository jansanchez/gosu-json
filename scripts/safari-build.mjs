import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") {
  console.error("Building the Safari app requires macOS and Xcode.");
  process.exit(1);
}
function projects(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const path = dir + "/" + entry.name;
    return entry.name.endsWith(".xcodeproj") ? [path] : projects(path);
  });
}
let found;
try {
  found = projects(resolve("build/safari"));
} catch {
  console.error("Run npm run safari:project first.");
  process.exit(1);
}
if (found.length !== 1) {
  console.error("Expected one generated Safari Xcode project.");
  process.exit(1);
}
const project = found[0];
const listed = spawnSync(
  "xcodebuild",
  ["-list", "-json", "-project", project],
  { encoding: "utf8" },
);
if (listed.status !== 0) {
  console.error(listed.stderr || "Could not inspect the Xcode project.");
  process.exit(1);
}
let schemes;
try {
  schemes = JSON.parse(listed.stdout).project.schemes;
} catch {
  console.error("Xcode did not return a readable scheme list.");
  process.exit(1);
}
const candidates = schemes.filter((name) => !/extension/i.test(name));
const scheme =
  process.env.GOSU_SAFARI_SCHEME ||
  (candidates.length === 1 ? candidates[0] : null);
if (!scheme || !schemes.includes(scheme)) {
  console.error("Set GOSU_SAFARI_SCHEME to one of: " + schemes.join(", "));
  process.exit(1);
}
// This is a compile check, not a signed or App Store installable release.
const result = spawnSync(
  "xcodebuild",
  [
    "-project",
    project,
    "-scheme",
    scheme,
    "-configuration",
    "Debug",
    "-destination",
    "platform=macOS",
    "-derivedDataPath",
    resolve("build/safari-derived"),
    "CODE_SIGNING_ALLOWED=NO",
    "build",
  ],
  { stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
