import test from "node:test";
import assert from "node:assert/strict";
import {
  parse,
  format,
  replace,
  pointer,
  jsonPath,
  diff,
  search,
  MAX_DEPTH,
} from "../src/core/json.js";
test("preserves huge IDs, decimals, exponent, duplicate keys and order", () => {
  const s = '{"id":9007199254740993123,"n":1.00,"e":1e+09,"id":2}';
  const p = parse(s);
  assert.equal(format(s, p.root, 0), s);
  assert.equal(p.duplicates.length, 1);
});
test("accepts every JSON root value", () => {
  for (const s of [
    "null",
    "true",
    "false",
    "0",
    "-1.20e-3",
    '"hello"',
    "[]",
    "{}",
  ])
    assert.equal(format(s, parse(s).root, 0), s);
});
test("rejects malformed JSON with location", () => {
  for (const s of [
    '{"x":}',
    "[1,]",
    "01",
    "NaN",
    '"a\n"',
    "true false",
    '{"a" 1}',
    "[",
    '"\\x"',
  ])
    assert.throws(() => parse(s), /line \d+, column \d+/);
});
test("handles escaped strings, Unicode, adversarial property names", () => {
  const s = '{"__proto__":1,"constructor":2,"a/b~c":"á \\" 🙂"}';
  const p = parse(s);
  assert.equal(p.root.children.length, 3);
  assert.equal(pointer(p.root.children[2].path), "/a~1b~0c");
  assert.equal(jsonPath(["a.b", 2]), '$["a.b"][2]');
});
test("editing preserves surrounding source and large number", () => {
  const s = '{ "id": 9007199254740993123, "name": "old" }';
  const n = parse(s).root.children[1];
  assert.equal(
    replace(s, n, '"new"'),
    '{ "id": 9007199254740993123, "name": "new" }',
  );
  assert.throws(() => replace(s, n, "no"));
});
test("diff ignores object property order and tracks additions", () => {
  const a = '{"a":1,"b":2}',
    b = '{"b":2,"a":1,"c":3}';
  assert.deepEqual(diff(a, parse(a).root, b, parse(b).root), [
    { kind: "added", path: "/c", before: undefined, after: "3" },
  ]);
});
test("diff distinguishes precision and duplicate-key changes", () => {
  for (const [a, b] of [
    ["9007199254740993123", "9007199254740993124"],
    ['{"a":1,"a":2}', '{"a":1,"a":3}'],
  ])
    assert.equal(diff(a, parse(a).root, b, parse(b).root).length, 1);
});
test("search finds keys and values with source spans", () => {
  const s = '{"data":[{"name":"Lima"}]}';
  const found = search(s, parse(s).root, "lima");
  assert.equal(pointer(found[0].path), "/data/0/name");
});
test("depth limit prevents stack exhaustion", () => {
  assert.throws(
    () => parse("[".repeat(MAX_DEPTH + 2) + "0" + "]".repeat(MAX_DEPTH + 2)),
    /nesting/,
  );
});
test("formatting round-trips representative documents", () => {
  for (let i = 0; i < 100; i++) {
    const value = {
      i,
      name: 'text " \\ ' + i,
      array: [null, true, i / 10, { nested: "🙂" }],
    };
    const s = JSON.stringify(value),
      formatted = format(s, parse(s).root);
    assert.deepEqual(JSON.parse(formatted), value);
    assert.equal(format(formatted, parse(formatted).root, 0), s);
  }
});
