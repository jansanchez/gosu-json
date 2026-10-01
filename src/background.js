const api = globalThis.browser ?? globalThis.chrome;
// Documents are kept only in this background process and consumed once.
// A worker restart discards pending documents rather than persisting responses.
const pending = new Map();
const firefox = Boolean(
  api.runtime.getManifest?.().browser_specific_settings?.gecko,
);
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
    if (message.type === "sync-opening" && firefox) {
      await syncFirefoxOpening();
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

// Firefox opens the workspace before requesting access; no page content is read here.
if (firefox) {
  api.action.onClicked.addListener((tab) => {
    const url = tab.url ?? "";
    if (/^https?:/.test(url))
      openDocument("", "Pending JSON", {
        requiresAccess: true,
        sourceTabId: tab.id,
        sourceURL: url,
        origin: new URL(url).origin,
      }).catch(console.error);
    else openDocument().catch(console.error);
  });
  api.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install")
      openDocument("", "Welcome", { welcome: true }).catch(console.error);
  });
}
const firefoxResponses = firefox
  ? createFirefoxResponseCapture(api, openDocument)
  : null;
let firefoxOpeningQueue = Promise.resolve();
function syncFirefoxOpening() {
  if (!firefox) return Promise.resolve();
  const run = async () => {
    const { openingModes = {} } = await api.storage.local.get("openingModes");
    const approvedOrigins = new Set();
    for (const [origin, mode] of Object.entries(openingModes)) {
      if (mode !== "always") continue;
      let url;
      try {
        url = new URL(origin);
      } catch {
        continue;
      }
      if (!/^https?:$/.test(url.protocol)) continue;
      const pattern = `${url.protocol}//${url.hostname}/*`;
      if (!(await api.permissions.contains({ origins: [pattern] }))) continue;
      approvedOrigins.add(origin);
    }
    firefoxResponses.setOrigins(approvedOrigins);
    const existing = await api.scripting.getRegisteredContentScripts();
    const obsolete = existing
      .filter((s) => s.id.startsWith("gosu-auto-"))
      .map((s) => s.id);
    if (obsolete.length)
      await api.scripting.unregisterContentScripts({ ids: obsolete });
  };
  firefoxOpeningQueue = firefoxOpeningQueue.catch(() => {}).then(run);
  firefoxResponses.setReady(firefoxOpeningQueue);
  return firefoxOpeningQueue;
}
if (firefox) {
  const reconcile = () => syncFirefoxOpening().catch(console.error);
  api.permissions.onAdded.addListener(reconcile);
  api.permissions.onRemoved.addListener(reconcile);
  api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.openingModes) reconcile();
  });
  api.runtime.onStartup.addListener(reconcile);
  api.runtime.onInstalled.addListener(reconcile);
  reconcile();
}
