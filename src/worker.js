import { parse, format, diff } from "./core/json.js";
import { searchNodes } from "./core/search.js";
let cachedSource = null,
  cachedParsed = null;
function document(source) {
  if (source !== cachedSource) {
    const parsed = parse(source);
    cachedParsed = parsed;
    cachedSource = source;
  }
  return cachedParsed;
}
self.onmessage = ({ data }) => {
  try {
    const parsed = document(data.source);
    let result;
    if (data.op === "parse") result = parsed;
    else if (data.op === "format")
      result = format(data.source, parsed.root, data.indent);
    else if (data.op === "search")
      result = searchNodes(data.source, parsed.root, data.query, data.options);
    else if (data.op === "diff")
      result = diff(
        data.source,
        parsed.root,
        data.other,
        parse(data.other).root,
      );
    else throw new Error("Unknown operation");
    self.postMessage({ id: data.id, result });
  } catch (e) {
    self.postMessage({ id: data.id, error: e.message });
  }
};
