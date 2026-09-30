import { MAX_BYTES } from "./json.js";
export function endpointURL(input) {
  let url;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a complete HTTP or HTTPS URL.");
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("Only HTTP and HTTPS endpoints are supported.");
  if (url.username || url.password)
    throw new Error("Credentials in the URL are not supported.");
  url.hash = "";
  return url.href;
}
export function endpointFromHash(hash) {
  if (!hash.startsWith("#url=")) return null;
  const value = new URLSearchParams(hash.slice(1)).get("url");
  return endpointURL(value ?? "");
}
export function endpointLink(workspace, input) {
  const url = new URL(workspace);
  url.search = "";
  url.hash = "url=" + encodeURIComponent(endpointURL(input));
  return url.href;
}
// Streams are bounded by decoded response bytes, not just the Content-Length header.
export async function readEndpoint(
  input,
  { signal, fetchImpl = fetch, maxBytes = MAX_BYTES } = {},
) {
  const url = endpointURL(input);
  const response = await fetchImpl(url, {
    method: "GET",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    headers: {
      Accept: "application/json, application/*+json;q=0.9, */*;q=0.1",
    },
    signal,
    cache: "no-store",
  });
  const size = Number(response.headers.get("content-length"));
  if (Number.isFinite(size) && size > maxBytes) {
    await response.body?.cancel();
    throw new Error("Response exceeds the 10 MiB limit.");
  }
  if (!response.body)
    throw new Error("The endpoint returned an empty response.");
  const reader = response.body.getReader(),
    decoder = new TextDecoder("utf-8", { fatal: true });
  let length = 0;
  const chunks = [];
  try {
    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes)
        throw new Error("Response exceeds the 10 MiB limit.");
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const text = chunks.join("");
  if (!text.trim()) throw new Error("The endpoint returned an empty response.");
  return {
    text,
    url,
    finalURL: response.url || url,
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type") ?? "",
    bytes: length,
  };
}
