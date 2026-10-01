import test from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/core/json.js";
import { exportTable, tableColumns } from "../src/core/table-export.js";
function exported(source, kind = "csv") {
  return exportTable(source, parse(source).root, kind);
}
// Read quoted CSV including embedded commas, quotes and line breaks.
function readCSV(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && c === "\r" && text[i + 1] === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      i++;
    } else value += c;
  }
  return rows;
}
test("CSV round-trips Unicode, quotes, commas, newlines, nulls and precise numbers", () => {
  const source =
    '[{"name":"Ana, Sánchez","note":"She said: \\"Hi\\"\\nBye","id":900719925474099312345,"n":-1.2500,"empty":null,"nested":{"x":1.00}},{"name":"日本語"}]'.replaceAll(
      '\\\\"',
      '\\"',
    );
  const result = exported(source),
    rows = readCSV(result.text);
  assert.deepEqual(rows[0], [
    "#",
    "name",
    "note",
    "id",
    "n",
    "empty",
    "nested",
  ]);
  assert.deepEqual(rows[1], [
    "0",
    "Ana, Sánchez",
    'She said: "Hi"\nBye',
    "900719925474099312345",
    "-1.2500",
    "null",
    '{"x":1.00}',
  ]);
  assert.equal(rows[2][1], "日本語");
  assert.equal(rows[2][3], "");
});
test("CSV neutralizes formula-like headers and values; XML treats them as text", () => {
  const source = JSON.stringify([
    {
      "=column": '=HYPERLINK("https://example.invalid")',
      plus: "+1+2",
      minus: "-1+2",
      at: "@SUM(1)",
      whitespace: " \t=1+1",
    },
  ]);
  const rows = readCSV(exported(source).text);
  assert.equal(rows[0][1], "'=column");
  for (const cell of rows[1].slice(1)) assert(cell.startsWith("'"));
  const result = exported(source, "excel");
  assert.equal(result.extension, "xml");
  assert(!result.text.includes("ss:Formula="));
  assert(result.text.includes('ss:Type="String"'));
  assert(result.text.includes("&quot;"));
});
test("exports all pages and matches the table's first 50 columns", () => {
  const source = JSON.stringify(
    Array.from({ length: 120 }, (_, i) => ({ id: i, name: "row-" + i })),
  );
  const result = exported(source);
  assert.equal(readCSV(result.text).length, 121);
  assert.equal(result.rows, 120);
  const wide = JSON.stringify([
    Object.fromEntries(Array.from({ length: 70 }, (_, i) => ["col" + i, i])),
  ]);
  assert.equal(tableColumns(parse(wide).root).length, 50);
  assert.equal(readCSV(exported(wide).text)[0].length, 51);
});
test("handles mixed arrays, empty arrays, duplicate columns and hostile names", () => {
  const source = '[1,{"value":2,"__proto__":"safe","value":3},null,[1,2]]';
  const rows = readCSV(exported(source).text);
  assert.deepEqual(rows[0], ["#", "value", "__proto__"]);
  assert.deepEqual(rows[2], ["1", "2", "safe"]);
  assert.equal(rows[4][1], "[1,2]");
  assert.equal(exported("[]").rows, 0);
  assert.deepEqual(readCSV(exported("[]").text), [["#"]]);
});
test("Excel XML escapes content and rejects unrepresentable strings or excessive rows", () => {
  const result = exported(
    '[{"s":"<&> \\"quoted\\" 😀"}]'.replaceAll('\\\\"', '\\"'),
    "excel",
  );
  assert(result.text.includes("&lt;&amp;&gt; &quot;quoted&quot; 😀"));
  assert.throws(() => exported('["\\u0000"]', "excel"), /Use CSV/);
  assert.throws(() => exported('["\\ud800"]', "excel"), /Use CSV/);
  assert.throws(
    () => exported(JSON.stringify(["x".repeat(32768)]), "excel"),
    /Use CSV/,
  );
  assert.throws(() => exported("null"), /Select an array/);
  const source = "[" + Array(65536).fill("0").join(",") + "]";
  assert.throws(() => exported(source, "excel"), /65,535/);
});
