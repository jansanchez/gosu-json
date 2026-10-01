# Try GOSU JSON

You do not need an API or an account. All data is fictional. The URLs are examples; do not use them as working endpoints.

Download these files or find them in your project’s `examples/` directory:

- **[playground.json](playground.json)** — start here: 6 users, 120 orders, nested objects, all JSON value types, Unicode and exact number spellings.
- **[playground-updated.json](playground-updated.json)** — the same document with five deliberate changes for Diff.
- **[duplicate-keys.json](duplicate-keys.json)** — a small, separate example with an intentional duplicate property.

## A five-minute tour

1. Click the extension icon, choose **New workspace**, then drag `playground.json` into the workspace. It opens formatted automatically. Check the colors for keys, strings, numbers, booleans and `null`.
2. In **Tree**, expand `users`, then the first user and `profile`. Explore `deeplyNested` too. Select a value and try copying its value, JSON Pointer or JSONPath. Paths identify locations; they are not executable queries in this version.
3. Select the **`orders` array itself**, then choose **Table**. Compare status and totals across rows. There are 120 orders and 100 rows per page, so use the pagination controls to inspect the last 20. Objects such as `items` are better explored in Tree. Try **Export CSV** and **Excel (.xml)**: both files include all 120 orders, even when you are viewing only the first page.
4. Search **Values** for `final-page-demo`. Click the result: the tree should expand to `orders[119].note` and highlight it. Try ordinary searches for `Lima`, `pending` and `900719925474099312345`.
5. Turn on **Regex** and search **Values** using one of the expressions below. Turn Regex off when returning to ordinary searches.
6. Switch to **Code**, select some text and copy it with Ctrl+C (Cmd+C on macOS). Try selecting and copying text from the left editor too. Make edits in the left panel; Code on the right is a reading view.
7. Open `strings.nestedJson`, select its string value and choose **Open nested JSON**. The string contains another JSON document with its own objects and array.
8. Reload the original `playground.json`, choose **Compare file**, select `playground-updated.json`, then choose **Diff**. Use the checklist below to inspect the changes. Comparing does not merge documents or change an API.
9. Change the first order’s status in the left editor. Try undo/redo, **Format** and **Download**. Changes affect your local document only. Keep your downloaded file before closing the workspace.
10. Switch between system, light and dark themes and inspect the same data in each.

## Useful regex searches

Choose **Values** and enable **Regex**. Each expression below is written exactly as you should type it, without surrounding quotes or `/` delimiters.

| Expression               | What to look for                                                     |
| ------------------------ | -------------------------------------------------------------------- |
| `@example\.com$`         | Three demo email addresses ending in `@example.com`                  |
| `^ORD-01[01][0-9]$`      | Orders 0100 through 0119, including rows beyond the first table page |
| `^(pending\|cancelled)$` | Pending or cancelled order statuses                                  |
| `^TRK-\d{6}$`            | Example tracking codes                                               |
| `^final-page-demo$`      | The marker in the final order                                        |

The status expression uses an ordinary `|` between alternatives: type `^(pending|cancelled)$` into the search box. The table escapes that character only for Markdown display.

## Five intentional Diff changes

In `playground-updated.json`, compared with `playground.json`:

| Location                         | Original    | Updated         |
| -------------------------------- | ----------- | --------------- |
| `/users/0/active`                | `true`      | `false`         |
| `/orders/0/status`               | `"pending"` | `"paid"`        |
| `/settings/limits/maxRetries`    | `3`         | `5`             |
| `/settings/features/offlineDemo` | Absent      | Added as `true` |
| `/settings/optionalMessage`      | `null`      | Removed         |

## Numbers and unusual content

In `precision`, look for the exact integer `900719925474099312345`, decimal `0.12345678901234567890123456789`, trailing zeros `19.9500`, exponent `6.022e23` and negative zero `-0`. Formatting should preserve those spellings. Avoid opening and saving these files with tools that convert every number into a JavaScript Number: they may round the values or normalize their spelling.

`strings` demonstrates escaped quotes, backslashes, newlines, Unicode and HTML stored as plain text. `specialKeys` demonstrates spaces, dots, slashes, tildes and an empty key; copying a path is useful when a key is unusual.

Finally, open `duplicate-keys.json`. Both `status` properties are intentional. Look for the duplicate-key warning and inspect both occurrences. This is an edge-case demonstration, not a pattern to use in API responses.

This sample demonstrates behavior; it is not a performance benchmark. URL loading and automatic MIME detection require a real HTTP/HTTPS response, which a local file cannot demonstrate.
