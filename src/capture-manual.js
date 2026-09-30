(async () => {
  if (window.top !== window) return;
  const mime = document.contentType.toLowerCase().split(";")[0].trim();
  if (!(
    mime === "application/json" ||
    mime.endsWith("+json") ||
    mime === "text/plain"
  ))
    return;
  const text =
    document.querySelector("body > pre")?.textContent ??
    document.body?.textContent ??
    "";
  if (!text.trim() || new TextEncoder().encode(text).length > 10 * 1024 * 1024)
    return;
  await (globalThis.browser ?? globalThis.chrome).runtime.sendMessage({
    type: "open",
    text,
    origin: location.origin,
    askOpening: false,
  });
})();
