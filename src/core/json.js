// Source spans preserve number lexemes, duplicate keys and original formatting.
export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_DEPTH = 128;
export const MAX_NODES = 100000;
export function parse(source) {
  if (new TextEncoder().encode(source).length > MAX_BYTES)
    throw new Error("Document exceeds the 10 MiB limit.");
  let i = 0,
    count = 0;
  const duplicates = [];
  function fail(message) {
    const before = source.slice(0, i),
      line = before.split("\n").length;
    const column = i - before.lastIndexOf("\n");
    throw new SyntaxError(`${message} — line ${line}, column ${column}`);
  }
  function ws() {
    while (/[\x20\t\r\n]/.test(source[i] ?? "") && i < source.length) i++;
  }
  function string() {
    const start = i++;
    while (i < source.length) {
      if (source[i] === '"') {
        i++;
        try {
          return JSON.parse(source.slice(start, i));
        } catch {
          fail("Invalid string");
        }
      }
      if (source[i] === "\\") i++;
      i++;
    }
    fail("Unterminated string");
  }
  function value(depth, path) {
    if (depth > MAX_DEPTH) fail("Maximum nesting depth exceeded");
    if (++count > MAX_NODES) fail("Maximum node count exceeded");
    ws();
    const start = i;
    let node;
    if (source[i] === "{" || source[i] === "[") {
      const object = source[i++] === "{",
        close = object ? "}" : "]";
      node = { type: object ? "object" : "array", start, children: [], path };
      const seen = new Set();
      ws();
      if (source[i] !== close) {
        while (true) {
          let key;
          if (object) {
            if (source[i] !== '"') fail("Expected a quoted property name");
            key = string();
            ws();
            if (source[i++] !== ":") fail("Expected colon");
            if (seen.has(key)) duplicates.push([...path, key]);
            seen.add(key);
          } else key = node.children.length;
          const child = value(depth + 1, [...path, key]);
          child.key = key;
          node.children.push(child);
          ws();
          if (source[i] === close) break;
          if (source[i++] !== ",") fail("Expected comma or closing bracket");
          ws();
        }
      }
      i++;
    } else if (source[i] === '"')
      node = { type: "string", value: string(), start, path };
    else {
      const rest = source.slice(i);
      const m =
        /^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(
          rest,
        );
      if (!m) fail("Expected a JSON value");
      i += m[0].length;
      node = {
        type:
          m[0] === "null"
            ? "null"
            : /^(true|false)$/.test(m[0])
              ? "boolean"
              : "number",
        start,
        path,
      };
    }
    node.end = i;
    return node;
  }
  const root = value(0, []);
  ws();
  if (i !== source.length) fail("Unexpected trailing content");
  return { root, duplicates, count };
}
export function pointer(path) {
  return path.length
    ? "/" +
        path
          .map((k) => String(k).replaceAll("~", "~0").replaceAll("/", "~1"))
          .join("/")
    : "";
}
export function jsonPath(path) {
  return (
    "$" +
    path
      .map((k) => (typeof k === "number" ? `[${k}]` : `[${JSON.stringify(k)}]`))
      .join("")
  );
}
export function raw(source, node) {
  return source.slice(node.start, node.end);
}
export function format(source, node, indent = 2, level = 0) {
  if (!node.children) return raw(source, node);
  const object = node.type === "object",
    open = object ? "{" : "[",
    close = object ? "}" : "]";
  if (!node.children.length) return open + close;
  const pad = (n) => " ".repeat(indent * n);
  const rows = node.children.map(
    (c) =>
      (object ? JSON.stringify(c.key) + (indent ? ": " : ":") : "") +
      format(source, c, indent, level + 1),
  );
  return indent
    ? open +
        "\n" +
        rows.map((r) => pad(level + 1) + r).join(",\n") +
        "\n" +
        pad(level) +
        close
    : open + rows.join(",") + close;
}
export function replace(source, node, replacement) {
  parse(replacement);
  return source.slice(0, node.start) + replacement + source.slice(node.end);
}
export function search(source, root, query, limit = 1000) {
  const found = [],
    q = query.toLocaleLowerCase();
  function visit(n) {
    if (found.length >= limit) return;
    if (
      String(n.key ?? "")
        .toLocaleLowerCase()
        .includes(q) ||
      (!n.children && raw(source, n).toLocaleLowerCase().includes(q))
    )
      found.push(n);
    n.children?.forEach(visit);
  }
  if (q) visit(root);
  return found;
}
export function diff(aSource, a, bSource, b, limit = 2000) {
  const changes = [];
  const add = (kind, n, path = n.path) => {
    if (changes.length < limit)
      changes.push({
        kind,
        path: pointer(path),
        before: kind === "removed" ? raw(aSource, n) : undefined,
        after: kind === "added" ? raw(bSource, n) : undefined,
      });
  };
  function visit(x, y) {
    if (changes.length >= limit) return;
    if (x.type !== y.type || !x.children) {
      if (raw(aSource, x) !== raw(bSource, y))
        changes.push({
          kind: "changed",
          path: pointer(y.path),
          before: raw(aSource, x),
          after: raw(bSource, y),
        });
      return;
    }
    // Duplicate-key documents are compared explicitly as whole subtrees.
    if (
      x.type === "object" &&
      (new Set(x.children.map((c) => c.key)).size !== x.children.length ||
        new Set(y.children.map((c) => c.key)).size !== y.children.length)
    ) {
      if (format(aSource, x, 0) !== format(bSource, y, 0))
        changes.push({
          kind: "changed",
          path: pointer(y.path),
          before: raw(aSource, x),
          after: raw(bSource, y),
        });
      return;
    }
    const xm = new Map(x.children.map((c) => [c.key, c])),
      ym = new Map(y.children.map((c) => [c.key, c]));
    for (const [key, n] of xm) {
      if (ym.has(key)) visit(n, ym.get(key));
      else add("removed", n);
    }
    for (const [key, n] of ym) if (!xm.has(key)) add("added", n);
  }
  visit(a, b);
  return changes;
}
