// MIME-only detection: never inspect ordinary HTML pages or fetch an endpoint.
(async () => {
  if (window.top !== window) return;
  const mime = document.contentType.toLowerCase().split(";")[0].trim();
  if (!(mime === "application/json" || mime.endsWith("+json"))) return;
  const api = globalThis.browser ?? globalThis.chrome;
  const origin = location.origin;
  const { openingModes = {} } = await api.storage.local.get("openingModes");
  // Manual injection is handled separately so a saved preference never blocks a click.
  if (openingModes[origin] !== "always") return;
  const text =
    document.querySelector("body > pre")?.textContent ??
    document.body?.textContent ??
    "";
  if (!text.trim() || new TextEncoder().encode(text).length > 10 * 1024 * 1024)
    return;
  await api.runtime.sendMessage({
    type: "open",
    text,
    origin,
    askOpening: false,
  });
})();
