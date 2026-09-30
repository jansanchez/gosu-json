import test from "node:test";
import assert from "node:assert/strict";
const outputs = [];
globalThis.self = { postMessage: (value) => outputs.push(value) };
await import("../src/worker.js");
test("worker reuses parsed document and returns compact search matches", () => {
  const source = '{"x":"Lima"}';
  self.onmessage({ data: { id: 1, op: "parse", source } });
  const first = outputs.pop().result;
  self.onmessage({ data: { id: 2, op: "parse", source } });
  assert.equal(outputs.pop().result, first);
  self.onmessage({
    data: {
      id: 3,
      op: "search",
      source,
      query: "lima",
      options: { scope: "values" },
    },
  });
  const match = outputs.pop().result.matches[0];
  assert.equal(match.id, first.root.children[0].start);
  assert.equal(match.children, undefined);
});
test("worker invalidates the cache on changed source and reports regex errors", () => {
  self.onmessage({ data: { id: 4, op: "parse", source: "[1]" } });
  assert.equal(outputs.pop().result.root.type, "array");
  self.onmessage({
    data: {
      id: 5,
      op: "search",
      source: "[1]",
      query: "[",
      options: { regex: true },
    },
  });
  assert.match(outputs.pop().error, /Invalid regular expression/);
});
