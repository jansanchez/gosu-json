import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function plan(env = {}) {
  return spawnSync(
    process.execPath,
    ["scripts/safari-project.mjs", "--dry-run"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GOSU_SAFARI_BUNDLE_ID: "com.jansanchez.gosu-json",
        ...env,
      },
    },
  );
}
test("Safari packaging plan handles app-name spaces and includes copied macOS resources", () => {
  const result = plan();
  assert.equal(result.status, 0, result.stderr);
  const { args } = JSON.parse(result.stdout);
  assert.equal(args[args.indexOf("--app-name") + 1], "GOSU JSON");
  assert.ok(args.includes("--macos-only"));
  assert.ok(args.includes("--copy-resources"));
  assert.ok(!args.includes("--force"));
  assert.ok(args[0].endsWith("dist/safari"));
});
test("Safari packaging accepts a publisher-owned identifier", () => {
  const result = plan({ GOSU_SAFARI_BUNDLE_ID: "org.example.gosu" });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).args.includes("org.example.gosu"));
});
test("Safari packaging rejects malformed bundle identifiers before invoking Apple tools", () => {
  const result = plan({ GOSU_SAFARI_BUNDLE_ID: "invalid id" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /reverse-DNS/);
});
