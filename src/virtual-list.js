import { windowRange } from "./core/tree.js";
// Fixed-height rows make jumping to far-away IDs independent of DOM row count.
export function virtualList(
  parent,
  rows,
  render,
  { height = 400, rowHeight = 30, label = "JSON tree" } = {},
) {
  const viewport = document.createElement("div");
  viewport.className = "virtual-viewport";
  viewport.style.height = height + "px";
  viewport.tabIndex = 0;
  viewport.setAttribute("role", "region");
  viewport.setAttribute("aria-label", label);
  const spacer = document.createElement("div");
  spacer.className = "virtual-spacer";
  spacer.style.height = rows.length * rowHeight + "px";
  viewport.append(spacer);
  parent.append(viewport);
  let scheduled = false,
    from = -1,
    to = -1;
  function draw(force = false) {
    const range = windowRange(
      rows.length,
      viewport.scrollTop,
      viewport.clientHeight || height,
      rowHeight,
    );
    if (!force && range.start === from && range.end === to) return;
    from = range.start;
    to = range.end;
    const fragment = document.createDocumentFragment();
    for (let i = from; i < to; i++) {
      const row = render(rows[i], i);
      row.classList.add("virtual-row");
      row.style.top = i * rowHeight + "px";
      row.style.height = rowHeight + "px";
      fragment.append(row);
    }
    spacer.replaceChildren(fragment);
  }
  viewport.onscroll = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      draw();
    });
  };
  draw(true);
  return {
    element: viewport,
    refresh: () => draw(true),
    reveal(index) {
      viewport.scrollTop = Math.max(
        0,
        index * rowHeight - viewport.clientHeight / 2,
      );
      draw(true);
    },
    destroy() {
      viewport.remove();
    },
  };
}
