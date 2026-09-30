export function indexTree(root) {
  const nodes = new Map(),
    parents = new Map();
  const stack = [[root, null]];
  while (stack.length) {
    const [node, parent] = stack.pop();
    nodes.set(node.start, node);
    if (parent !== null) parents.set(node.start, parent);
    if (node.children)
      for (let i = node.children.length - 1; i >= 0; i--)
        stack.push([node.children[i], node.start]);
  }
  return { nodes, parents };
}
export function ancestorIds(id, parents) {
  const result = [];
  let parent = parents.get(id);
  while (parent !== undefined) {
    result.push(parent);
    parent = parents.get(parent);
  }
  return result.reverse();
}
export function visibleRows(root, expanded) {
  const rows = [],
    stack = [[root, 0]];
  while (stack.length) {
    const [node, depth] = stack.pop();
    rows.push({ node, depth });
    if (node.children && expanded.has(node.start))
      for (let i = node.children.length - 1; i >= 0; i--)
        stack.push([node.children[i], depth + 1]);
  }
  return rows;
}
export function windowRange(
  total,
  scrollTop,
  height,
  rowHeight = 30,
  overscan = 8,
) {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
    end = Math.min(
      total,
      Math.ceil((scrollTop + height) / rowHeight) + overscan,
    );
  return { start, end };
}
