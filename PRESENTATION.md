# GOSU JSON

## Beautiful JSON. Less friction.

An endless API response. A file without indentation. One value hidden among thousands of rows. GOSU JSON turns that text into a workspace where you can read, find, edit and compare data in your browser.

**Paste JSON, drop a file or open a URL. Start exploring.**

![The GOSU JSON workspace](docs/images/dark.png)

[Light theme](docs/images/light.png) · [Install and get started](README.md#install-without-a-terminal)

## Understand your data at a glance

Imported JSON opens formatted. Colors distinguish field names, strings, numbers and other values. Choose light, dark or system theme.

Edit on the left, explore on the right: a tree for opening branches, code for reading, a table for comparing rows and a diff view for reviewing document changes.

## Find what matters

Search keys or values with text or regular expressions. Click a result to open its branch and highlight the value. Copy the data or its path without getting lost in the document.

Tree rows and search results render the visible window, while tables use pagination. This reduces visual work for larger documents within the published limits; it does not promise unlimited performance.

## From response to workspace

When a site returns a document with a JSON content type, GOSU JSON can open the existing response in another tab without repeating the request. A visible question lets you choose automatic or manual opening for that site.

You can also load an endpoint inside the viewer, refresh it and save a direct viewer link as a bookmark. Changes stay in your local copy: download the result to keep it. Editing does not update the server.

## Built for a clear purpose

This version includes no advertising, affiliate scripts, trackers, analytics or geolocation services. No account is required. Document processing happens locally, and the MIT-licensed source is available for review and contributions.

Loading a URL connects to the chosen endpoint and may follow its redirects; that service can see your IP. Automatic JSON detection needs HTTP/HTTPS site access. We explain the permissions and how to inspect their implementation in [PRIVACY.md](PRIVACY.md).

## Your next JSON, made easier

- **Learn:** see how fields, objects and lists fit together using a small example.
- **Develop:** inspect a response, find a value and copy its path.
- **Review:** compare files and locate their differences.
- **Prepare:** edit a local copy and download readable JSON.

## Try it and help it improve

**Preview release.** See `package.json` for the current version. Packages are prepared for Chrome/Brave, Edge and Firefox. Safari resources and an Apple packaging workflow are included, with native packaging/signing and actual Safari validation still pending. Desktop support must be verified in each browser before a stable store release; mobile support is not claimed.

Documents are limited to 10 MiB and 100,000 nodes. Strict JSON is supported; JSON Schema and other formats remain future work. Viewer requests omit session cookies and authentication credentials.

[Read the quick-start guide](README.md), [review the publication steps](docs/PUBLISHING.md) or [contribute a focused improvement](CONTRIBUTING.md).

**Less time deciphering JSON. More time working with it.**
