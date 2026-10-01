// Firefox's built-in JSON viewer uses an isolated document that content scripts
// cannot reliably read. Observe approved top-level JSON responses instead.
function createFirefoxResponseCapture(api, openDocument) {
  let origins = new Set();
  const active = new Map();
  let ready = Promise.resolve();
  const limit = 10 * 1024 * 1024;
  async function receive(details) {
    // Blocking response events wait for preferences after an event-page wake.
    await ready;
    if (
      details.tabId < 0 ||
      active.size >= 8 ||
      !origins.has(new URL(details.url).origin)
    )
      return;
    const header = details.responseHeaders?.find(
      (h) => h.name.toLowerCase() === "content-type",
    );
    const mime = (header?.value ?? "").split(";")[0].trim().toLowerCase();
    if (!(mime === "application/json" || /^application\/.+\+json$/.test(mime)))
      return;
    if (
      details.statusCode < 200 ||
      (details.statusCode >= 300 && details.statusCode < 400)
    )
      return;
    if (
      details.responseHeaders?.some(
        (h) =>
          h.name.toLowerCase() === "content-disposition" &&
          /^attachment(?:;|$)/i.test(h.value ?? ""),
      )
    )
      return;
    let filter;
    try {
      filter = api.webRequest.filterResponseData(details.requestId);
    } catch (error) {
      console.error(error);
      return;
    }
    active.set(filter, new URL(details.url).origin);
    const chunks = [];
    let size = 0;
    filter.ondata = (event) => {
      // Pass each byte through unchanged, including when the import is too big.
      filter.write(event.data);
      size += event.data.byteLength;
      if (size > limit || !origins.has(new URL(details.url).origin)) {
        chunks.length = 0;
        active.delete(filter);
        filter.disconnect();
        return;
      }
      chunks.push(new Uint8Array(event.data));
    };
    filter.onerror = () => {
      chunks.length = 0;
      active.delete(filter);
    };
    filter.onstop = () => {
      active.delete(filter);
      filter.close();
      if (!size || !origins.has(new URL(details.url).origin)) return;
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      chunks.length = 0;
      let text;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        JSON.parse(text);
      } catch {
        return;
      }
      openDocument(text, "Imported JSON", {
        origin: new URL(details.url).origin,
        sourceURL: details.url,
        askOpening: false,
      }).catch(console.error);
    };
  }
  // Register synchronously so Firefox can wake the MV3 event page. Firefox
  // delivers only URLs covered by granted host permissions; origin preferences
  // are checked before a stream is attached or response bytes are read.
  api.webRequest.onHeadersReceived.addListener(
    receive,
    { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] },
    ["blocking", "responseHeaders"],
  );
  return {
    setReady(promise) {
      ready = promise;
    },
    setOrigins(next) {
      origins = new Set(next);
      // Revocation stops collecting any response currently in progress.
      for (const [filter, origin] of active) {
        if (origins.has(origin)) continue;
        try {
          filter.disconnect();
        } catch {}
        active.delete(filter);
      }
    },
  };
}
