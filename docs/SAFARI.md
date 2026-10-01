# Safari for macOS: packaging and release preparation

GOSU JSON includes Safari web extension resources, deterministic Apple project generation and an unsigned native compile command. It shares the JSON implementation with the other browsers, with a nonpersistent background script and no Firefox metadata. No additional tracking, native messaging or runtime dependency is introduced.

**Status:** JavaScript resources and packaging-plan tests pass on Linux. Apple project generation, native compilation, signing and actual Safari behavior have not yet been verified. iPhone/iPad support is not claimed. The editor targets Safari 17.4 syntax; this is not a verified minimum runtime version.

## Option 1: use a Mac with Xcode

Install Node.js 24+, Xcode and its command-line tools. From the project root:

```sh
npm ci
npm run build
npm run check
npm run safari:project
npm run safari:build
```

The project generator:

- Uses Apple's `safari-web-extension-packager`, falling back to the older `safari-web-extension-converter`.
- Creates a macOS-only Swift container app and extension under `build/safari`.
- Uses the app name **GOSU JSON** and proposed bundle identifier **com.jansanchez.gosu-json**.
- Copies the current `dist/safari` resources into the generated project.
- Checks that the selected Apple tool advertises the required options.
- Refuses to overwrite an existing project and does not suppress compatibility warnings.

Confirm the identifier is available in your Apple developer account before registering it. To use another identifier, set `GOSU_SAFARI_BUNDLE_ID` before generation. Keep the published app and extension identifiers stable.

`npm run safari:build` discovers the generated app scheme and compiles an **unsigned Debug app** in `build/safari-derived/Build/Products/Debug`. If multiple schemes are available, specify `GOSU_SAFARI_SCHEME`. This is a compile check, not a signed public release.

Preview the project command on any OS without invoking Apple tooling:

```sh
npm run safari:project -- --dry-run
```

Before rebuilding, move the old `build/safari` folder aside rather than overwriting its signing settings. Rebuilding only `dist/safari` does not update the copied resources in an existing Apple project: generate a fresh project for each candidate and reapply the reviewed signing configuration.

## Option 2: generate and compile through GitHub Actions

After pushing this repository to GitHub:

1. Open **Actions → Safari packaging → Run workflow**.
2. The macOS job builds the extension resources, generates the Apple project and attempts an unsigned native compilation.
3. Inspect converter warnings and compilation logs.
4. Download the `gosu-json-safari-xcode-project` artifact if the job succeeds.

The workflow is manual, needs no signing secrets and does not submit to Apple. It has been prepared but not run yet. Apple tooling availability on the selected runner may require updating Xcode or the runner version.

## Test in actual Safari

Open the generated Xcode project, select the macOS app target, configure your development signing team and run it. Enable GOSU JSON in Safari's extension settings and grant website access. Follow Apple's current unsigned-extension testing instructions if using an unsigned local build.

Run the [manual checklist](TESTING.md), including:

- Workspace creation; paste/file import; clipboard and downloads.
- Both themes; tree/code/table/diff; edit and undo.
- Search result reveal; regex timeout and recovery.
- Automatic JSON detection with website access granted and denied; manual capture.
- Endpoint GET, cancellation, HTTP errors and redirects; viewer links.
- Background suspension during an import, reload and unsaved changes.

Pending imports are held only in memory and can be lost if the background unloads. Confirm that failure behavior is understandable and document any browser-native viewer limitations. Record Safari, macOS and Xcode versions and actual results in [VALIDATION.md](VALIDATION.md).

The Chromium workspace smoke test cannot establish Safari extension API compatibility.

## Produce a public installable release

1. Enroll in the Apple Developer Program and register the chosen app identity.
2. Configure the containing app and extension for your signing team. Check bundle identifiers, version/build numbers, app icons and copied resources against the intended release.
3. Build/archive the Release app in Xcode and validate signing. Test the signed installation in Safari.
4. Create the App Store Connect listing: description, screenshots, support details and accurate privacy disclosures. [STORE_LISTING.md](STORE_LISTING.md) contains starting copy.
5. Upload the archive and submit for Apple review. Publish only after the required review and native validation.

Apple also documents web-based packaging in App Store Connect without a local Mac/Xcode, requiring Developer Program membership. That route has not been executed here.

`gosu-json-safari-0.4.8.zip` contains web extension resources only. It is **not** an `.app`, signed installer or App Store release. No Apple account, signing credentials or review approval is included in this repository.

Official references:

- [Safari extensions overview](https://developer.apple.com/safari/extensions/)
- [Apple packaging tool and options](https://developer.apple.com/documentation/safariservices/packaging-a-web-extension-for-safari)
- [App Store Connect packaging](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)
- [Distribution and signing](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension)
