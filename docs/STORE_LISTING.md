# Store listing draft

Use this English copy as a starting point for Chrome Web Store, Microsoft Edge Add-ons, Firefox Add-ons and the Safari App Store listing. Do not advertise a platform until its submitted package has been tested there. Check each store's current field and asset requirements.

## Name

GOSU JSON

## Short description

Format, explore, search and edit JSON in your browser. Compare files, inspect API responses and preserve large numbers.

This is the manifest summary as well as the store summary. Keep it within Google's 132-character limit.

## Full description

Turn hard-to-read JSON into a clear workspace. GOSU JSON formats imported responses and files automatically, highlights keys and values, and helps you find, edit and compare data in your browser.

- Read JSON with indentation, syntax colors and light, dark or system themes.
- Explore objects in a collapsible tree and lists of objects in a paginated table.
- Search keys or values with text or regular expressions. Click a result to reveal and highlight its location.
- Edit your local copy, undo changes and download the result.
- Format JSON while preserving large numbers, duplicate keys and property order.
- Compare two documents and inspect their differences.
- Paste JSON, drop a file or load an endpoint URL. Save a viewer link to reopen the endpoint later.

When a site returns a JSON document, the extension can open its existing response without requesting it again. Choose automatic or manual opening for each site. Website access is required for this feature.

Document processing happens locally. This version includes no advertising, affiliate scripts, telemetry or geolocation requests. Loading or refreshing a URL connects to the selected endpoint and its redirects; that service can see your IP. The source is available under the MIT license.

Edits do not update the server. Documents are not autosaved: download changes before closing. URL requests omit session cookies and authentication credentials. Documents are limited to 10 MiB and 100,000 nodes.

## Permission explanations

| Permission       | Explanation                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`      | User-triggered capture of the active JSON/text response.                                                                                                  |
| `scripting`      | Run the manual capture script when the user requests an import.                                                                                           |
| `contextMenus`   | Open selected text as JSON from the context menu.                                                                                                         |
| `storage`        | Save theme and per-site opening preferences locally.                                                                                                      |
| HTTP/HTTPS hosts | Detect JSON documents by their content type and load user-selected endpoint URLs across sites. Non-JSON pages are not captured by the automatic detector. |

## Publisher details to complete

After GitHub publication, use the actual repository and policy URLs. The intended repository is `https://github.com/jansanchez/gosu-json`, but it is not yet confirmed published. Do not submit nonexistent links.

Use inspected screenshots from `docs/images`, adapting their dimensions to the store requirements. Do not include private response data. Configure support contact and distribution countries in the publisher account. Disclose network requests and the limits of local data processing accurately in each store's forms.

The optional PayPal link belongs in the README. No donation popup or payment requirement is implemented in the extension.

## Chrome listing assets and review

The text was reviewed against [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing). Asset production is still pending; existing README screenshots are not the final store assets.

| Asset               | Preparation                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title               | Keep GOSU JSON: short, memorable, with the data format clearly named. Do not add a string of keywords.                                                                   |
| Summary             | State useful actions in plain English, within 132 characters. Avoid rankings, speed claims and competitor comparisons.                                                   |
| Description         | Lead with the user's task, followed by a concise feature list and accurate network/permission limitations.                                                               |
| Store icon          | Use the existing 128 × 128 brand icon; inspect readability at small sizes before submission.                                                                             |
| Screenshot 1        | 1280 × 800: formatted JSON, source editor and tree in dark mode.                                                                                                         |
| Screenshot 2        | 1280 × 800: light mode with clearly distinguishable keys and values.                                                                                                     |
| Screenshot 3        | 1280 × 800: a real search result revealed and highlighted.                                                                                                               |
| Screenshot 4        | 1280 × 800: an array displayed as a table.                                                                                                                               |
| Screenshot 5        | 1280 × 800: a comparison with additions, removals and changes.                                                                                                           |
| Small promo tile    | 440 × 280: matching brand colors, icon and a short benefit such as “Beautiful JSON. Powerful tools.” Create an actual promotional composition, not a resized screenshot. |
| Marquee image       | Optional 1400 × 560 composition with matching branding.                                                                                                                  |
| Support and privacy | Use accessible, published URLs. The intended GitHub repository is still pending.                                                                                         |

Screenshots must show the current working UI with synthetic data. Capture at the target viewport instead of stretching the existing images. Use square corners, full bleed, little added text and no misleading badges. Inspect clarity at reduced size. A video can be added later; no video has been produced.
