import {
  pointer,
  jsonPath,
  raw,
  replace,
  parse,
  MAX_BYTES,
} from "./core/json.js";
import { createEditor } from "./editor.js";
import { virtualList } from "./virtual-list.js";
import { indexTree, ancestorIds, visibleRows } from "./core/tree.js";
import {
  endpointURL,
  endpointFromHash,
  endpointLink,
  readEndpoint,
} from "./core/endpoint.js";
import { tableColumns } from "./core/table-export.js";
import { api, send } from "./platform.js";
const $ = (s) => document.querySelector(s),
  view = $("#view"),
  status = $("#status");
const editor = createEditor($("#editor"), sourceChanged);
let source = "",
  original = "",
  baseline = "",
  parsed = null,
  selected = null,
  tableRoot = null,
  mode = "tree",
  page = 0,
  changes = [],
  revision = 0,
  timer,
  searchTimer;
let openingOrigin = null;
let requestController = null,
  requestVersion = 0,
  loadedURL = null;
let nodeIndex = new Map(),
  parents = new Map(),
  expanded = new Set(),
  treeRows = [],
  treeList = null,
  resultsList = null,
  codePreview = null,
  searchMatches = [],
  matchIndex = -1,
  searchGeneration = 0,
  searchWorker = null,
  searchReject = null,
  searchTimeout = null;
const highlightById = new Map();
let worker,
  sequence = 0,
  pending = new Map();
function startWorker() {
  worker = new Worker(new URL("worker.js", import.meta.url), {
    type: "module",
  });
  worker.onmessage = ({ data }) => {
    const task = pending.get(data.id);
    if (!task) return;
    pending.delete(data.id);
    data.error ? task.reject(new Error(data.error)) : task.resolve(data.result);
    $("#cancel").hidden = pending.size === 0;
  };
  worker.onerror = () => cancel();
}
function cancel() {
  worker?.terminate();
  for (const task of pending.values())
    task.reject(new Error("Operation cancelled."));
  pending.clear();
  startWorker();
  $("#cancel").hidden = true;
}
function task(op, extra = {}) {
  const id = ++sequence;
  $("#cancel").hidden = false;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, op, source, ...extra });
  });
}
startWorker();
function message(text, error = false) {
  status.textContent = text;
  status.classList.toggle("error", error);
}
function button(text, fn, cls = "") {
  const el = document.createElement("button");
  el.textContent = text;
  el.className = cls;
  el.onclick = fn;
  return el;
}
// Data text stays selectable with the mouse; controls remain keyboard accessible.
function selectable(fn, cls = "node-value") {
  const el = document.createElement("span");
  el.className = cls + " selectable-data";
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.onclick = () => {
    const selection = window.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      (el.contains(selection.anchorNode) || el.contains(selection.focusNode))
    )
      return;
    fn();
  };
  el.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fn();
    }
  };
  return el;
}
function text(tag, value, cls = "") {
  const el = document.createElement(tag);
  el.textContent = value;
  el.className = cls;
  return el;
}
function short(node) {
  return node.children
    ? `${node.type === "object" ? "{" : "["}${node.children.length} ${node.type === "object" ? "properties" : "items"}${node.type === "object" ? "}" : "]"}`
    : raw(source, node).slice(0, 180);
}
function select(node) {
  selected = node;
  $("#path").textContent = pointer(node.path) || "(root)";
  $("#path").title = jsonPath(node.path);
  editor.focus();
  editor.setSelectionRange(node.start, node.end);
  document.querySelectorAll("[data-node-id]").forEach((el) => {
    const same = Number(el.dataset.nodeId) === node.start;
    el.classList.toggle("selected", same);
    el.setAttribute("aria-current", String(same));
  });
  codePreview?.setSelectionRange(node.start, node.end);
}
function reveal(node) {
  if (!node || !parsed) return;
  if (mode === "table") {
    const root = tableRoot ?? parsed.root;
    if (root.type === "array") {
      const chain = [...ancestorIds(node.start, parents), node.start];
      const direct = chain.find((id) => parents.get(id) === root.start),
        row = nodeIndex.get(direct);
      if (row) {
        page = Math.floor(Number(row.key) / 100);
        renderView();
        select(node);
        document
          .querySelector(`[data-node-id="${node.start}"]`)
          ?.scrollIntoView({ block: "nearest" });
        return;
      }
    }
  }
  if (mode !== "tree" && mode !== "code") mode = "tree";
  if (mode === "tree") {
    for (const id of ancestorIds(node.start, parents)) expanded.add(id);
    renderView();
    const index = treeRows.findIndex((row) => row.node.start === node.start);
    if (index >= 0) treeList.reveal(index);
  }
  select(node);
}
function highlighted(value, range, className) {
  const span = document.createElement("span");
  span.className = className;
  if (value.length > 240) {
    const start = Math.max(0, (range?.from ?? 0) - 70),
      end = Math.min(value.length, start + 240);
    value =
      (start ? "…" : "") +
      value.slice(start, end) +
      (end < value.length ? "…" : "");
    if (range)
      range = {
        from: Math.max(0, range.from - start) + (start ? 1 : 0),
        to: Math.min(end, range.to) - start + (start ? 1 : 0),
      };
  }

  if (!range || range.to <= range.from) {
    span.textContent = value;
    return span;
  }
  span.append(document.createTextNode(value.slice(0, range.from)));
  const mark = document.createElement("mark");
  mark.textContent = value.slice(range.from, range.to);
  span.append(mark, document.createTextNode(value.slice(range.to)));
  return span;
}
function nodeContent(node) {
  const fragment = document.createDocumentFragment(),
    match = highlightById.get(node.start);
  if (node.key !== undefined) {
    fragment.append(
      text("span", typeof node.key === "number" ? "[" : '"', "tok-punctuation"),
      highlighted(String(node.key), match?.keyMatch, "tok-key"),
      text(
        "span",
        typeof node.key === "number" ? "] : " : '" : ',
        "tok-punctuation",
      ),
    );
  }
  if (node.children)
    fragment.append(text("span", short(node), "tok-punctuation"));
  else if (node.type === "string")
    fragment.append(
      text("span", '"', "tok-punctuation"),
      highlighted(node.value, match?.valueMatch, "tok-string"),
      text("span", '"', "tok-punctuation"),
    );
  else
    fragment.append(
      highlighted(raw(source, node), match?.valueMatch, "tok-" + node.type),
    );
  return fragment;
}
function paginate(container, items, render, size = 100) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  page = Math.min(page, pages - 1);
  const bar = document.createElement("div");
  bar.className = "pagination";
  const prev = button("Previous", () => {
    page--;
    renderView();
  });
  prev.disabled = page === 0;
  const next = button("Next", () => {
    page++;
    renderView();
  });
  next.disabled = page >= pages - 1;
  bar.append(
    prev,
    text("span", `${page + 1} / ${pages} · ${items.length} items`),
    next,
  );
  container.append(bar);
  items.slice(page * size, (page + 1) * size).forEach(render);
}
function treeRow({ node, depth }) {
  const row = document.createElement("div");
  row.className = "tree-row";
  row.dataset.nodeId = node.start;
  row.style.paddingLeft = depth * 18 + 6 + "px";
  row.classList.toggle("selected", selected?.start === node.start);
  row.setAttribute("role", "group");
  row.setAttribute("aria-current", String(selected?.start === node.start));
  const toggle = button(
    node.children ? (expanded.has(node.start) ? "-" : "+") : "·",
    () => {
      if (!node.children) return;
      const old = treeList?.element.scrollTop ?? 0;
      if (expanded.has(node.start)) expanded.delete(node.start);
      else expanded.add(node.start);
      renderView();
      treeList.element.scrollTop = old;
      treeList.refresh();
      select(node);
    },
    "tree-toggle",
  );
  toggle.setAttribute(
    "aria-label",
    node.children
      ? (expanded.has(node.start) ? "Collapse" : "Expand") +
          " " +
          (node.key ?? "root")
      : "Leaf value",
  );
  if (node.children)
    toggle.setAttribute("aria-expanded", String(expanded.has(node.start)));
  else toggle.disabled = true;
  const value = selectable(() => select(node));
  value.append(nodeContent(node));
  value.title = pointer(node.path) || "(root)";
  row.append(toggle, value);
  return row;
}
function renderTree() {
  treeRows = visibleRows(parsed.root, expanded);
  treeList = virtualList(view, treeRows, treeRow, {
    height: Math.max(240, $("#inspector").clientHeight - 36),
    label: "JSON tree",
  });
}
function table(node) {
  if (node.type !== "array") {
    view.append(
      text("p", "Select an array in Tree, then choose Table.", "muted"),
    );
    return;
  }
  const tableSource = source;
  const keys = tableColumns(node);
  view.append(
    text(
      "p",
      "100 rows per page · first 50 columns · click a cell to inspect its value",
      "muted",
    ),
  );
  const exports = document.createElement("div");
  exports.className = "table-exports";
  for (const [kind, label] of [
    ["csv", "Export CSV"],
    ["excel", "Excel (.xml)"],
  ]) {
    const control = button(label, async () => {
      control.disabled = true;
      try {
        const result = await task("export-table", {
          nodeId: node.start,
          source: tableSource,
          kind,
        });
        const name =
          ($("#name").value.replace(/\.json$/i, "") || "document") + "-table";
        downloadFile(result.text, result.mime, name + "." + result.extension);
        message(
          `Exported ${result.rows.toLocaleString()} rows · ${result.columns} data columns · ${kind === "csv" ? "CSV" : "Excel XML"}.`,
        );
      } catch (error) {
        message(error.message, true);
      } finally {
        control.disabled = false;
      }
    });
    control.dataset.export = kind;
    control.title =
      "Export all rows of this array, including other pages; same first 50 data columns as the table.";
    exports.append(control);
  }
  view.append(exports);
  const tbl = document.createElement("table"),
    head = document.createElement("tr");
  head.append(text("th", "#"));
  keys.forEach((k) => head.append(text("th", String(k))));
  tbl.append(head);
  paginate(view, node.children, (n) => {
    const row = document.createElement("tr");
    row.append(text("td", String(n.key)));
    for (const key of keys) {
      const cell = document.createElement("td"),
        child =
          n.type === "object"
            ? n.children.find((c) => c.key === key)
            : key === "value"
              ? n
              : null;
      if (child) {
        const b = selectable(() => select(child), "table-value");
        b.append(nodeContent({ ...child, key: undefined }));
        b.dataset.nodeId = child.start;
        b.classList.toggle("selected", selected?.start === child.start);
        cell.append(b);
      }
      row.append(cell);
    }
    tbl.append(row);
  });
  view.append(tbl);
}
function renderView() {
  treeList?.destroy();
  treeList = null;
  codePreview?.destroy();
  codePreview = null;
  view.replaceChildren();
  document
    .querySelectorAll("[data-view]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.view === mode)),
    );
  if (mode === "diff") {
    if (!changes.length)
      view.append(
        text(
          "p",
          "No differences, or no comparison loaded. Arrays compare by index; number representations are preserved.",
          "muted",
        ),
      );
    else
      paginate(view, changes, (c) => {
        const row = document.createElement("div");
        row.className = "diff-row";
        row.append(text("strong", `${c.kind} ${c.path || "(root)"}`, c.kind));
        if (c.before !== undefined) row.append(text("pre", "− " + c.before));
        if (c.after !== undefined) row.append(text("pre", "+ " + c.after));
        view.append(row);
      });
    return;
  }
  if (!parsed) {
    view.append(text("p", "Paste JSON or open a file to begin.", "muted"));
    return;
  }
  if (mode === "tree") renderTree();
  if (mode === "table") table(tableRoot ?? parsed.root);
  if (mode === "code") {
    const host = document.createElement("div");
    host.className = "code-preview";
    view.append(host);
    codePreview = createEditor(host, null, { readOnly: true });
    codePreview.value = source;
    if (selected) codePreview.setSelectionRange(selected.start, selected.end);
  }
}
async function validate() {
  const version = ++revision;
  source = editor.value;
  parsed = null;
  selected = null;
  tableRoot = null;
  changes = [];
  $("#results").replaceChildren();
  $("#dirty").textContent = source === baseline ? "" : "· modified";
  message("Validating…");
  try {
    const result = await task("parse");
    if (version !== revision) return;
    parsed = result;
    ({ nodes: nodeIndex, parents } = indexTree(result.root));
    expanded = new Set([result.root.start]);
    highlightById.clear();
    searchMatches = [];
    renderView();
    if ($("#search").value) scheduleSearch();
    message(
      `${new TextEncoder().encode(source).length.toLocaleString()} bytes · ${result.count.toLocaleString()} nodes${result.duplicates.length ? " · WARNING: " + result.duplicates.length + " duplicate keys" : ""} · Local processing`,
    );
  } catch (e) {
    if (version !== revision) return;
    renderView();
    message(e.message, true);
  }
}
async function setSource(value, asOriginal = false, preformatted = null) {
  editor.value = value;
  source = value;
  if (asOriginal) {
    original = value;
    baseline = value;
    const version = ++revision;
    try {
      const formatted = preformatted ?? (await task("format", { indent: 2 }));
      if (version !== revision) return;
      editor.value = formatted;
      source = formatted;
      baseline = formatted;
    } catch {
      /* Keep invalid imports untouched for diagnostics. */
    }
  }
  return validate();
}
function sourceChanged() {
  revision++;
  parsed = null;
  selected = null;
  tableRoot = null;
  highlightById.clear();
  searchMatches = [];
  stopSearch();
  clearTimeout(timer);
  $("#dirty").textContent = editor.value === baseline ? "" : "· modified";
  $("#results").replaceChildren();
  clearTimeout(searchTimer);
  renderView();
  timer = setTimeout(validate, 250);
}

async function readFile(file) {
  if (!file) return;
  if (file.size > MAX_BYTES) throw new Error("Document exceeds 10 MiB.");
  return file.text();
}
function action(id, fn) {
  $(id).onclick = async () => {
    try {
      await fn();
    } catch (e) {
      message(e.message, true);
    }
  };
}
action("#open", () => $("#file").click());
$("#file").onchange = async () => {
  try {
    const f = $("#file").files[0];
    if (!f) return;
    if (source !== baseline && !confirm("Discard local changes?")) return;
    $("#name").value = f.name;
    await setSource(await readFile(f), true);
  } catch (e) {
    message(e.message, true);
  } finally {
    $("#file").value = "";
  }
};
action("#paste", async () => {
  if (source !== baseline && !confirm("Replace local changes?")) return;
  await setSource(await navigator.clipboard.readText(), true);
});
for (const [id, indent] of [
  ["#format", 2],
  ["#compact", 0],
])
  action(id, async () => {
    const version = revision;
    const value = await task("format", { indent });
    if (version === revision) await setSource(value);
  });
action("#original", async () => {
  if (source !== baseline && !confirm("Restore original and discard changes?"))
    return;
  await setSource(original);
});
function downloadFile(content, mime, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
action("#download", () =>
  downloadFile(
    editor.value,
    "application/json",
    ($("#name").value.replace(/\.json$/i, "") || "document") + ".json",
  ),
);
action("#compare", () => $("#other").click());
$("#other").onchange = async () => {
  try {
    const f = $("#other").files[0];
    if (!f) return;
    const version = revision;
    const result = await task("diff", { other: await readFile(f) });
    if (version !== revision) return;
    changes = result;
    mode = "diff";
    page = 0;
    renderView();
    message(
      `${changes.length} differences${changes.length >= 2000 ? " · results capped at 2,000" : ""}`,
    );
  } catch (e) {
    message(e.message, true);
  } finally {
    $("#other").value = "";
  }
};
function needSelected() {
  if (!selected || !parsed)
    throw new Error("Select a node in the current valid document first.");
  return selected;
}
async function copy(value) {
  await navigator.clipboard.writeText(value);
  message("Copied.");
}
action("#copyValue", () => {
  const n = needSelected();
  return copy(n.type === "string" ? n.value : raw(source, n));
});
action("#copyJson", () => copy(raw(source, needSelected())));
action("#copyPath", () => copy(pointer(needSelected().path)));
action("#copyJsonPath", () => copy(jsonPath(needSelected().path)));
action("#editNode", () => {
  $("#replacement").value = raw(source, needSelected());
  $("#editError").textContent = "";
  $("#editDialog").showModal();
});
action("#apply", async () => {
  try {
    const updated = replace(source, needSelected(), $("#replacement").value);
    $("#editDialog").close();
    await setSource(updated);
  } catch (e) {
    $("#editError").textContent = e.message;
  }
});
action("#tableNode", () => {
  tableRoot = needSelected();
  mode = "table";
  page = 0;
  renderView();
});
action("#nested", async () => {
  const n = needSelected();
  if (n.type !== "string") throw new Error("Select a string containing JSON.");
  parse(n.value);
  if (api) await send({ type: "open", text: n.value });
  else await setSource(n.value, true);
});
action("#cancel", () => {
  cancel();
  stopSearch();
  message("Operation cancelled.");
});
document.querySelectorAll("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.view;
      if (mode === "table" && parsed) {
        const array =
          selected?.type === "array"
            ? selected
            : selected &&
              ancestorIds(selected.start, parents)
                .reverse()
                .map((id) => nodeIndex.get(id))
                .find((node) => node.type === "array");
        tableRoot = array || tableRoot || parsed.root;
      }
      page = 0;
      renderView();
    }),
);
function stopSearch() {
  searchGeneration++;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = null;
  searchWorker?.terminate();
  searchWorker = null;
  searchReject?.(new Error("Search cancelled."));
  searchReject = null;
}
function searchTask(query, options) {
  if (!searchWorker)
    searchWorker = new Worker(new URL("worker.js", import.meta.url), {
      type: "module",
    });
  return new Promise((resolve, reject) => {
    searchReject = reject;
    const generation = searchGeneration;
    searchTimeout = setTimeout(() => {
      if (generation !== searchGeneration) return;
      searchWorker?.terminate();
      searchWorker = null;
      searchReject = null;
      reject(
        new Error(
          "Search exceeded 2 seconds and was cancelled. Simplify the expression.",
        ),
      );
    }, 2000);
    searchWorker.onmessage = ({ data }) => {
      clearTimeout(searchTimeout);
      searchTimeout = null;
      searchReject = null;
      data.error ? reject(new Error(data.error)) : resolve(data.result);
    };
    searchWorker.onerror = () => {
      clearTimeout(searchTimeout);
      searchReject = null;
      searchWorker?.terminate();
      searchWorker = null;
      reject(new Error("Search worker failed."));
    };
    searchWorker.postMessage({ id: 1, op: "search", source, query, options });
  });
}
function showResults(result) {
  resultsList?.destroy();
  resultsList = null;
  $("#results").replaceChildren();
  searchMatches = result.matches;
  matchIndex = -1;
  highlightById.clear();
  searchMatches.forEach((m) => highlightById.set(m.id, m));
  const bar = document.createElement("div");
  bar.className = "result-controls";
  bar.append(
    text(
      "span",
      `${searchMatches.length} matches${result.truncated ? " · first 1,000" : ""}`,
    ),
  );
  const prev = button("Prev", () => nextMatch(-1)),
    next = button("Next", () => nextMatch(1));
  prev.setAttribute("aria-label", "Previous match");
  next.setAttribute("aria-label", "Next match");
  prev.disabled = next.disabled = !searchMatches.length;
  bar.append(prev, next);
  $("#results").append(bar);
  if (searchMatches.length)
    resultsList = virtualList(
      $("#results"),
      searchMatches,
      (match) => {
        const node = nodeIndex.get(match.id),
          b = selectable(() => {
            matchIndex = searchMatches.findIndex((m) => m.id === match.id);
            reveal(node);
          }, "search-result");
        b.dataset.nodeId = match.id;
        b.classList.toggle("selected", selected?.start === match.id);
        b.append(
          text("span", pointer(match.path) || "(root)", "result-path"),
          nodeContent(node),
        );
        return b;
      },
      {
        height: Math.min(180, searchMatches.length * 44),
        rowHeight: 44,
        label: "Search results",
      },
    );
  treeList?.refresh();
}
function nextMatch(direction) {
  if (!searchMatches.length) return;
  matchIndex =
    (matchIndex + direction + searchMatches.length) % searchMatches.length;
  const match = searchMatches[matchIndex];
  resultsList?.reveal(matchIndex);
  reveal(nodeIndex.get(match.id));
}
function scheduleSearch() {
  resultsList?.destroy();
  resultsList = null;
  $("#results").replaceChildren();
  highlightById.clear();
  treeList?.refresh();
  message($("#search").value ? "Searching…" : "Ready · Local processing");
  clearTimeout(searchTimer);
  searchGeneration++;
  const generation = searchGeneration;
  searchTimer = setTimeout(async () => {
    const query = $("#search").value,
      version = revision;
    const options = {
      regex: $("#searchMode").value === "regex",
      scope: $("#searchScope").value,
      caseSensitive: $("#searchCase").checked,
      exact: $("#searchExact").checked,
    };
    $("#exactLabel").hidden = options.regex;
    if (!query || !parsed) {
      highlightById.clear();
      showResults({ matches: [], truncated: false });
      if (!query) $("#results").replaceChildren();
      return;
    }
    // Terminate only an in-flight search, keeping the cached worker between completed queries.
    if (searchReject) {
      searchWorker?.terminate();
      searchWorker = null;
      searchReject(new Error("Search cancelled."));
      searchReject = null;
      if (searchTimeout) clearTimeout(searchTimeout);
    }
    try {
      message("Searching…");
      const result = await searchTask(query, options);
      if (version !== revision || generation !== searchGeneration) return;
      showResults(result);
      message(
        `${result.matches.length} search matches${result.truncated ? " · capped at 1,000" : ""}`,
      );
    } catch (e) {
      if (version === revision && generation === searchGeneration) {
        showResults({ matches: [], truncated: false });
        message(e.message, true);
      }
    }
  }, 180);
}
$("#search").oninput = scheduleSearch;
for (const id of ["#searchMode", "#searchScope", "#searchCase", "#searchExact"])
  $(id).onchange = scheduleSearch;

async function theme(value) {
  document.documentElement.dataset.theme = value;
  if (api) await api.storage.local.set({ theme: value });
}
$("#theme").onchange = () => theme($("#theme").value);
const commands = [
  ["Open file", "#open"],
  ["Paste JSON", "#paste"],
  ["Format", "#format"],
  ["Compact", "#compact"],
  ["Compare file", "#compare"],
  ["Download", "#download"],
  ["Restore original", "#original"],
];
commands.forEach(([name, id]) =>
  $("#commandList").append(
    button(name, () => {
      $("#palette").close();
      $(id).click();
    }),
  ),
);
action("#commands", () => $("#palette").showModal());
action("#closePalette", () => $("#palette").close());
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    $("#palette").showModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    $("#download").click();
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
    e.preventDefault();
    $("#format").click();
  }
});
window.addEventListener("beforeunload", (e) => {
  if (editor.value !== baseline) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", async (e) => {
  e.preventDefault();
  try {
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (source !== baseline && !confirm("Discard local changes?")) return;
    $("#name").value = f.name;
    await setSource(await readFile(f), true);
  } catch (err) {
    message(err.message, true);
  }
});
async function chooseOpening(value) {
  if (!openingOrigin || !api) return;
  const { openingModes = {} } = await api.storage.local.get("openingModes");
  openingModes[openingOrigin] = value;
  await api.storage.local.set({ openingModes });
  $("#openingPrompt").hidden = true;
  message(
    value === "always"
      ? "Automatic opening enabled for this site."
      : "Future JSON pages will open only when you choose.",
  );
}
action("#alwaysOpen", () => chooseOpening("always"));
action("#manualOpen", () => chooseOpening("manual"));
function requestStatus(text, error = false) {
  $("#requestStatus").textContent = text;
  $("#requestStatus").classList.toggle("error", error);
}
function cancelRequest() {
  requestVersion++;
  requestController?.abort();
  requestController = null;
  $("#cancelURL").hidden = true;
  requestStatus("Request cancelled. Previous document kept.");
}
async function openEndpoint(input, { updateLink = true } = {}) {
  let target;
  try {
    target = endpointURL(input);
  } catch (error) {
    requestStatus(error.message, true);
    return;
  }
  if (
    editor.value !== baseline &&
    !confirm("Replace local changes with a new endpoint response?")
  )
    return;
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  const version = ++requestVersion;
  $("#endpointURL").value = target;
  $("#cancelURL").hidden = false;
  requestStatus("Loading…");
  const documentVersion = revision;
  const started = performance.now();
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 30000);
  try {
    const result = await readEndpoint(target, { signal: controller.signal });
    if (version !== requestVersion) return;
    // Validate before replacing the current document, including JSON error responses.
    let formatted;
    try {
      formatted = await task("format", { source: result.text, indent: 2 });
    } catch (error) {
      throw new Error(
        `HTTP ${result.status}: response is not valid JSON. ${error.message}`,
      );
    }
    if (version !== requestVersion) return;
    controller.signal.throwIfAborted();
    // A user can edit while the network request is in flight.
    if (
      revision !== documentVersion &&
      !confirm("The response is ready. Replace your local changes?")
    ) {
      requestStatus("Response not applied. Local changes kept.");
      return;
    }
    $("#name").value =
      new URL(target).pathname.split("/").filter(Boolean).at(-1) ||
      "response.json";
    $("#openingPrompt").hidden = true;
    $("#cancelURL").hidden = true;
    await setSource(result.text, true, formatted);
    if (version !== requestVersion) return;
    loadedURL = target;
    $("#refreshURL").disabled = false;
    if (updateLink)
      history.replaceState(null, "", endpointLink(location.href, target));
    requestStatus(
      `HTTP ${result.status} · ${result.bytes.toLocaleString()} bytes · ${Math.round(performance.now() - started)} ms`,
      result.status >= 400,
    );
  } catch (error) {
    if (version !== requestVersion) return;
    requestStatus(
      timedOut
        ? "Request exceeded 30 seconds. Previous document kept."
        : controller.signal.aborted
          ? "Request cancelled. Previous document kept."
          : error.message,
      true,
    );
  } finally {
    clearTimeout(deadline);
    if (version === requestVersion) {
      requestController = null;
      $("#cancelURL").hidden = true;
    }
  }
}
$("#endpointForm").onsubmit = (event) => {
  event.preventDefault();
  openEndpoint($("#endpointURL").value);
};
action("#refreshURL", () => openEndpoint(loadedURL ?? $("#endpointURL").value));
action("#cancelURL", cancelRequest);
action("#copyLink", async () => {
  const target = endpointURL($("#endpointURL").value);
  const base = api ? api.runtime.getURL("workspace.html") : location.href;
  await copy(endpointLink(base, target));
  requestStatus(
    "Viewer link copied. It opens this endpoint in your installed extension.",
  );
});
window.addEventListener("hashchange", () => {
  try {
    const url = endpointFromHash(location.hash);
    if (url) openEndpoint(url, { updateLink: false });
  } catch (error) {
    requestStatus(error.message, true);
  }
});
async function init() {
  const linkedEndpoint = endpointFromHash(location.hash);
  if (api) {
    const prefs = await api.storage.local.get("theme");
    $("#theme").value = prefs.theme ?? "auto";
    document.documentElement.dataset.theme = $("#theme").value;
    const id = location.hash.slice(1);
    if (id && !linkedEndpoint) {
      const item = await send({ type: "take", id });
      history.replaceState(null, "", location.pathname);
      if (item?.text !== undefined) {
        $("#name").value = item.name;
        openingOrigin = item.origin ?? null;
        if (item.askOpening && openingOrigin) {
          $("#openingOrigin").textContent = openingOrigin;
          $("#openingPrompt").hidden = false;
        }
        await setSource(item.text, true);
        if (item.sourceURL) {
          loadedURL = endpointURL(item.sourceURL);
          $("#endpointURL").value = loadedURL;
          $("#refreshURL").disabled = false;
          requestStatus("Imported from the current page. No request repeated.");
        }
      } else
        message(
          "Import expired. Open the JSON page again; responses are never saved.",
        );
    }
  }
  renderView();
  if (linkedEndpoint) await openEndpoint(linkedEndpoint, { updateLink: false });
}
init().catch((e) => message(e.message, true));
