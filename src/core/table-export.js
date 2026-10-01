import { raw, format } from "./json.js";

export function tableColumns(node, limit = 50) {
  const keys = new Set();
  for (const row of node.children) {
    for (const key of row.type === "object"
      ? row.children.map((c) => c.key)
      : ["value"]) {
      keys.add(key);
      if (keys.size >= limit) return [...keys];
    }
  }
  return [...keys];
}
function value(source, node) {
  if (!node) return "";
  if (node.type === "string") return node.value;
  return node.children ? format(source, node, 0) : raw(source, node);
}
function fields(source, row, keys) {
  const children = new Map();
  if (row.type === "object")
    for (const child of row.children)
      if (!children.has(child.key)) children.set(child.key, child);
  return [
    String(row.key),
    ...keys.map((key) =>
      value(
        source,
        row.type === "object"
          ? children.get(key)
          : key === "value"
            ? row
            : null,
      ),
    ),
  ];
}
// Spreadsheet programs may interpret string cells and headers as formulas.
function csvCell(value) {
  if (
    /^[\t\r\n]|^\s*[=+@-]/u.test(value) &&
    !/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)
  )
    value = "'" + value;
  return '"' + value.replaceAll('"', '""') + '"';
}
function xml(value) {
  if (value.length > 32767)
    throw new Error(
      "A cell exceeds Excel’s 32,767-character limit. Use CSV instead.",
    );
  // XML 1.0 does not support some characters that JSON strings may contain.
  if (
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]|[\uD800-\uDFFF]/u.test(
      value,
    )
  )
    throw new Error(
      "Excel XML cannot represent a character in this table. Use CSV instead.",
    );
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\r", "&#13;");
}
export function exportTable(source, node, kind = "csv") {
  if (node?.type !== "array") throw new Error("Select an array to export.");
  if (!["csv", "excel"].includes(kind))
    throw new Error("Unknown table format.");
  if (kind === "excel" && node.children.length > 65535)
    throw new Error(
      "Basic Excel XML supports 65,535 data rows. Use CSV for this table.",
    );
  const keys = tableColumns(node),
    chunks = [];
  const encoder = new TextEncoder();
  let bytes = 0;
  function append(chunk) {
    bytes += encoder.encode(chunk).length;
    if (bytes > 50 * 1024 * 1024)
      throw new Error("Table export exceeds the 50 MiB limit.");
    chunks.push(chunk);
  }
  const rows = function* () {
    yield ["#", ...keys];
    for (const row of node.children) yield fields(source, row, keys);
  };
  if (kind === "csv") {
    append("\uFEFF"); // UTF-8 signature improves Excel's Unicode detection.
    for (const row of rows()) append(row.map(csvCell).join(",") + "\r\n");
  } else {
    append(
      '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="JSON table"><Table>',
    );
    // Text cells preserve IDs, exact numeric spellings and literal formula-like data.
    for (const row of rows())
      append(
        "<Row>" +
          row
            .map(
              (cell) =>
                '<Cell><Data ss:Type="String">' + xml(cell) + "</Data></Cell>",
            )
            .join("") +
          "</Row>",
      );
    append("</Table></Worksheet></Workbook>");
  }
  return {
    text: chunks.join(""),
    rows: node.children.length,
    columns: keys.length,
    extension: kind === "csv" ? "csv" : "xml",
    mime:
      kind === "csv"
        ? "text/csv;charset=utf-8"
        : "application/xml;charset=utf-8",
  };
}
