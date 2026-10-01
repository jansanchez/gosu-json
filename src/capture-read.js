// Return only the existing response; never fetch or modify the endpoint.
(() => {
  const mime = document.contentType.toLowerCase().split(";")[0].trim();
  if (!(
    mime === "application/json" ||
    mime.endsWith("+json") ||
    mime === "text/plain" ||
    mime === "application/vnd.mozilla.json.view"
  ))
    return {
      error:
        "This page is not a readable JSON/text response. Firefox's native viewer may prevent access. Paste JSON, or use Open URL to request a fresh response.",
    };
  const text =
    document.querySelector("body > pre")?.textContent ??
    document.body?.textContent ??
    "";
  if (!text.trim()) return { error: "The response is empty." };
  if (new TextEncoder().encode(text).length > 10 * 1024 * 1024)
    return { error: "Document exceeds 10 MiB." };
  try {
    JSON.parse(text);
  } catch {
    return {
      error:
        "The displayed response is not valid JSON. Use its raw data, paste JSON, or explicitly load the URL.",
    };
  }
  return { text };
})();
