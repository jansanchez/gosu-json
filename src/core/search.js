// Regex runs only in the search worker. The UI terminates that worker on timeout.
export function matcher(
  query,
  { regex = false, caseSensitive = false, exact = false } = {},
) {
  if (query.length > 512)
    throw new Error("Search expression is limited to 512 characters.");
  if (regex) {
    let re;
    try {
      re = new RegExp(query, caseSensitive ? "u" : "iu");
    } catch (e) {
      throw new Error("Invalid regular expression: " + e.message);
    }
    return (value) => {
      const match = re.exec(value);
      return match
        ? { from: match.index, to: match.index + match[0].length }
        : null;
    };
  }
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  return (value) => {
    const haystack = caseSensitive ? value : value.toLocaleLowerCase();
    const at = exact
      ? haystack === needle
        ? 0
        : -1
      : haystack.indexOf(needle);
    return at < 0 ? null : { from: at, to: at + query.length };
  };
}
export function searchNodes(source, root, query, options = {}, limit = 1000) {
  if (!query) return { matches: [], truncated: false };
  const match = matcher(query, options),
    scope = options.scope ?? "both",
    matches = [];
  let truncated = false;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    const key =
      scope !== "values" && node.key !== undefined
        ? match(String(node.key))
        : null;
    const value =
      scope !== "keys" && !node.children
        ? match(
            node.type === "string"
              ? node.value
              : source.slice(node.start, node.end),
          )
        : null;
    if (key || value) {
      if (matches.length >= limit) {
        truncated = true;
        break;
      }
      matches.push({
        id: node.start,
        start: node.start,
        end: node.end,
        path: node.path,
        keyMatch: key,
        valueMatch: value,
      });
    }
    if (node.children)
      for (let i = node.children.length - 1; i >= 0; i--)
        stack.push(node.children[i]);
  }
  return { matches, truncated };
}
