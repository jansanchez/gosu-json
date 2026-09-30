import test from "node:test";
import assert from "node:assert/strict";
import {
  endpointURL,
  endpointFromHash,
  endpointLink,
  readEndpoint,
} from "../src/core/endpoint.js";
test("URL links round-trip embedded query parameters and Unicode", () => {
  const endpoint =
    "https://api.example.org/query.json?accessType=DOWNLOAD&q=a%26b&name=Lima";
  const link = endpointLink(
    "chrome-extension://abc/workspace.html#old",
    endpoint,
  );
  assert.equal(endpointFromHash(new URL(link).hash), endpointURL(endpoint));
  assert.equal(endpointFromHash("#random-token"), null);
});
test("rejects scripts, local schemes, relative URLs and embedded credentials", () => {
  for (const input of [
    "javascript:alert(1)",
    "file:///tmp/a.json",
    "/api",
    "https://user:secret@example.com/a",
  ])
    assert.throws(() => endpointURL(input));
});
test("GET omits credentials and preserves number lexemes and HTTP errors", async () => {
  let options;
  const result = await readEndpoint("https://api.example.org/data", {
    fetchImpl: async (url, opts) => {
      options = opts;
      return new Response('{"id":9007199254740993123,"error":"invalid"}', {
        status: 400,
        headers: { "content-type": "application/problem+json" },
      });
    },
  });
  assert.equal(options.method, "GET");
  assert.equal(options.credentials, "omit");
  assert.equal(options.cache, "no-store");
  assert.equal(result.status, 400);
  assert(result.text.includes("9007199254740993123"));
});
test("bounded stream handles multibyte UTF-8 split across chunks", async () => {
  const bytes = new TextEncoder().encode('{"city":"Perú"}');
  const body = new ReadableStream({
    start(c) {
      for (const b of bytes) c.enqueue(Uint8Array.of(b));
      c.close();
    },
  });
  const result = await readEndpoint("https://api.example.org", {
    fetchImpl: async () => new Response(body),
  });
  assert.equal(result.text, '{"city":"Perú"}');
  assert.equal(result.bytes, bytes.length);
});
test("rejects streamed and declared oversized responses", async () => {
  await assert.rejects(
    readEndpoint("https://api.example.org", {
      maxBytes: 4,
      fetchImpl: async () => new Response("12345"),
    }),
    /exceeds/,
  );
  await assert.rejects(
    readEndpoint("https://api.example.org", {
      maxBytes: 4,
      fetchImpl: async () =>
        new Response("1", { headers: { "content-length": "5" } }),
    }),
    /exceeds/,
  );
});
test("aborted and empty responses leave caller in control", async () => {
  const c = new AbortController();
  c.abort();
  await assert.rejects(
    readEndpoint("https://api.example.org", {
      signal: c.signal,
      fetchImpl: async () => new Response("{}"),
    }),
    /abort/i,
  );
  await assert.rejects(
    readEndpoint("https://api.example.org", {
      fetchImpl: async () => new Response(" "),
    }),
    /empty/,
  );
});
