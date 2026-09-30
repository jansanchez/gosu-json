const api = globalThis.browser ?? globalThis.chrome;
// Documents are kept only in this background process and consumed once.
// A worker restart discards pending documents rather than persisting responses.
const pending = new Map();
async function openDocument(text = "", name = "Untitled", options = {}) {
  if (new TextEncoder().encode(text).length > 10 * 1024 * 1024)
    throw new Error("Document exceeds 10 MiB.");
  const id = crypto.randomUUID();
  const now = Date.now();
  for (const [key, item] of pending)
    if (now - item.created > 60000) pending.delete(key);
  if (pending.size >= 8) pending.delete(pending.keys().next().value);
  pending.set(id, { text, name, created: now, ...options });
  await api.tabs.create({
    url: api.runtime.getURL("workspace.html") + "#" + id,
  });
}
api.runtime.onMessage.addListener((message, sender, respond) => {
  const trusted = sender.id === api.runtime.id;
  if (!trusted) return;
  if (
    message.type === "take" &&
    !sender.tab?.url?.startsWith(api.runtime.getURL("workspace.html")) &&
    !sender.url?.startsWith(api.runtime.getURL("workspace.html"))
  )
    return;
  const run = async () => {
    if (message.type === "take") {
      const item = pending.get(message.id);
      pending.delete(message.id);
      return item ?? null;
    }
    if (message.type === "open" && typeof message.text === "string") {
      const origin = sender.tab?.url
        ? new URL(sender.tab.url).origin
        : undefined;
      await openDocument(message.text, "Imported JSON", {
        origin,
        sourceURL: /^https?:/.test(sender.tab?.url ?? "")
          ? sender.tab.url
          : null,
        askOpening: Boolean(origin && message.askOpening),
      });
      return { ok: true };
    }
    if (message.type === "empty") {
      await openDocument();
      return { ok: true };
    }
  };
  run().then(respond, (e) => respond({ error: e.message }));
  return true;
});
api.runtime.onInstalled.addListener(async () => {
  await api.contextMenus.removeAll();
  api.contextMenus.create({
    id: "open-json",
    title: "Open selection in GOSU JSON",
    contexts: ["selection"],
  });
});
api.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "open-json")
    openDocument(info.selectionText ?? "").catch(console.error);
});
