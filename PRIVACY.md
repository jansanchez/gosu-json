# Privacy

This describes version 0.4.2, not an independent audit or a guarantee about future releases.

GOSU JSON does not upload documents to its own services, collect analytics or use remote code. Explicit URL loading and direct viewer links make GET requests to the endpoint you specify. Documents stay in memory; theme and per-site opening preferences are stored locally. Clipboard reads happen only when you click Paste, and writes happen only when you click a copy action.

Opening an endpoint imports its displayed JSON/text into a separate extension tab. The original response is not fetched again. Pending imports live in background memory and are consumed once, with a 60-second expiry and an eight-document cap; a background restart may discard them. Open workspaces keep their contents in memory until closed/reloaded. Downloads go to your chosen browser download location.

Permissions:

- `activeTab`: user-triggered access to the active page.
- `scripting`: read a displayed response; import the active response when you click the toolbar action.
- `contextMenus`: open selected text as JSON.
- `storage`: save theme and per-site opening preferences.
- HTTP/HTTPS site access: required for automatic MIME detection. The content script exits immediately for ordinary HTML pages. Selecting manual opening stops automatic imports for that origin but does not revoke the installed site permission.

Auto-open considers only JSON and `+json` top-frame documents. User-triggered imports also support plain text. Until a per-site opening preference is chosen, detected JSON opens with a persistent choice banner. URL requests omit cookies/credentials and send no custom authentication headers. Endpoint URLs can themselves contain tokens in query parameters; direct viewer links include those parameters and browser bookmarks/history can retain them. The extension does not store endpoint history. No authentication headers or cookies are collected by the extension. JSON documents themselves may contain sensitive data: sanitize them before attaching them to a public issue.

Endpoint servers and redirects can observe your IP when you load a URL. Broad site permission is a capability beyond the current script behavior; choosing manual opening does not revoke it. Review updates and manage site permissions in your browser. Source availability alone does not prove that a distributed package matches that source.

## Inspect the implementation

| Behavior                          | Source                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Permissions and script policy     | [Build manifest](scripts/build.mjs)                                          |
| JSON detection and manual capture | [Automatic capture](src/capture.js), [manual capture](src/capture-manual.js) |
| Endpoint requests                 | [Endpoint implementation](src/core/endpoint.js)                              |
| One-use in-memory transfers       | [Background implementation](src/background.js)                               |

The extension does not request history, cookies or geolocation permissions. These are statements about this version, not assurances about third-party forks.
