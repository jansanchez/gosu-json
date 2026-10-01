# Privacy

This policy describes the source in this repository. It is not an independent audit or a guarantee about future releases. See `package.json` for the current version.

GOSU JSON does not upload documents to its own services, collect analytics or use remote code. Explicit URL loading and direct viewer links make GET requests to the endpoint you specify. Documents stay in memory; theme and per-site opening preferences are stored locally. Clipboard reads happen only when you click Paste, and writes happen only when you click a copy action.

Automatic opening imports the original JSON response into a separate extension tab without another endpoint request. Chrome uses the displayed response; Firefox uses a bounded response stream and passes all bytes unchanged to the original tab. Explicit URL loading, including Firefox’s **Allow and load JSON** button, makes a new credential-free GET request. Pending imports live in background memory and are consumed once, with a 60-second expiry and an eight-document cap; a background restart may discard them. Open workspaces keep their contents in memory until closed/reloaded. Downloads go to your chosen browser download location.

Permissions:

Chrome/Brave, Edge and Safari resources retain required HTTP/HTTPS site access for automatic JSON detection. Firefox instead declares optional host access. Its response listener can receive events only for granted hosts and reads JSON bodies only when the exact origin has an automatic-opening preference. Its toolbar action opens an empty workspace using the original tab URL; it does not read the response. The **Allow and load JSON** button requests permission and then explicitly fetches a fresh response without cookies or authentication headers. URL metadata may contain sensitive query parameters and is kept only in the short-lived pending import and current workspace. The Firefox welcome uses fictional example data. No endpoint request is made by that welcome or by displaying the permission banner.

- `activeTab`: user-triggered access to the active page.
- `scripting`: read a displayed response; import the active response when you click the toolbar action.
- `contextMenus`: open selected text as JSON.
- `storage`: save theme and per-site opening preferences.
- Firefox only: `webRequest`, `webRequestBlocking` and `webRequestFilterResponse` attach a bounded stream to approved top-level JSON responses. This avoids native-viewer isolation, leaves response bytes and headers unchanged, and avoids a second request during automatic opening.
- HTTP/HTTPS site access: required for automatic MIME detection. The content script exits immediately for ordinary HTML pages. Selecting manual opening stops automatic imports for that origin but does not revoke the installed site permission.

Auto-open considers only JSON and `+json` top-frame documents. User-triggered imports also support plain text. In Chrome/Edge, detected JSON opens with a persistent choice banner until a per-site opening preference is chosen. Firefox requires site approval and an automatic-opening preference before automatic response capture. URL requests omit cookies/credentials and send no custom authentication headers. Endpoint URLs can themselves contain tokens in query parameters; direct viewer links include those parameters and browser bookmarks/history can retain them. The extension does not store endpoint history. The extension does not inspect request cookies or authentication headers. JSON documents themselves may contain sensitive data: sanitize them before attaching them to a public issue.

Endpoint servers and redirects can observe your IP when you load a URL. Broad site permission is a capability beyond the current script behavior; choosing manual opening does not revoke it. Review updates and manage site permissions in your browser. Source availability alone does not prove that a distributed package matches that source.

## Inspect the implementation

| Behavior                          | Source                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------- |
| Permissions and script policy     | [Build manifest](scripts/build.mjs)                                          |
| JSON detection and manual capture | [Automatic capture](src/capture.js), [manual capture](src/capture-manual.js) |
| Endpoint requests                 | [Endpoint implementation](src/core/endpoint.js)                              |
| One-use in-memory transfers       | [Background implementation](src/background.js)                               |

The extension does not request history, cookies or geolocation permissions. These are statements about this version, not assurances about third-party forks.
