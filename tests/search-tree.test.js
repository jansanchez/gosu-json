import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/core/json.js";
import { searchNodes } from "../src/core/search.js";
import {
  indexTree,
  ancestorIds,
  visibleRows,
  windowRange,
} from "../src/core/tree.js";
test("regex filters decoded values without matching property names", () => {
  const s = '{"pending":"ok","data":["pending","failed","pending-review"]}';
  const r = searchNodes(s, parse(s).root, "^(pending|failed)$", {
    regex: true,
    scope: "values",
  });
  assert.deepEqual(
    r.matches.map((n) => n.path),
    [
      ["data", 0],
      ["data", 1],
    ],
  );
});
test("literal, exact and case-sensitive searches", () => {
  const s = '["Lima","lima","Lima centro"]',
    root = parse(s).root;
  assert.equal(
    searchNodes(s, root, "Lima", { scope: "values", exact: true }).matches
      .length,
    2,
  );
  assert.equal(
    searchNodes(s, root, "Lima", {
      scope: "values",
      exact: true,
      caseSensitive: true,
    }).matches.length,
    1,
  );
});
test("escaped strings search decoded text and return match ranges", () => {
  const s = '{"message":"line\\nnext"}';
  const r = searchNodes(s, parse(s).root, "line\nnext", { scope: "values" });
  assert.deepEqual(r.matches[0].valueMatch, { from: 0, to: 9 });
});
test("invalid and oversized expressions report useful errors", () => {
  const root = parse("null").root;
  assert.throws(
    () => searchNodes("null", root, "[", { regex: true }),
    /Invalid regular expression/,
  );
  assert.throws(() => searchNodes("null", root, "x".repeat(513)), /512/);
});
test("duplicate properties have different IDs and reveal the correct occurrence", () => {
  const s = '{"x":{"same":1},"x":{"same":2}}',
    root = parse(s).root,
    { nodes, parents } = indexTree(root);
  const hits = searchNodes(s, root, "same", { scope: "keys" }).matches;
  assert.notEqual(hits[0].id, hits[1].id);
  assert.equal(nodes.get(hits[1].id).key, "same");
  assert.deepEqual(ancestorIds(hits[1].id, parents), [
    root.start,
    root.children[1].start,
  ]);
});
test("far-away row reveals with bounded rendered window", () => {
  const s = JSON.stringify(
    Array.from({ length: 30000 }, (_, i) => ({
      id: i,
      value: i === 29999 ? "target" : "other",
    })),
  );
  const root = parse(s).root,
    { parents } = indexTree(root);
  const match = searchNodes(s, root, "target", { scope: "values" }).matches[0];
  const expanded = new Set(ancestorIds(match.id, parents));
  const rows = visibleRows(root, expanded),
    index = rows.findIndex((r) => r.node.start === match.id);
  assert(index > 29000);
  const range = windowRange(rows.length, index * 30 - 150, 400);
  assert(range.start <= index && range.end > index);
  assert(range.end - range.start <= 31);
});
test("search truncation is explicit and zero-width regex matches are safe", () => {
  const s = "[1,2,3]",
    root = parse(s).root;
  assert.equal(
    searchNodes(s, root, ".", { regex: true, scope: "values" }, 2).truncated,
    true,
  );
  assert.equal(
    searchNodes(s, root, "^", { regex: true, scope: "values" }).matches.length,
    3,
  );
});
