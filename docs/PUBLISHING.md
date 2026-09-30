# Publish

## GitHub

The intended public repository is `jansanchez/gosu-json`. It has not yet been published from this workspace. Create the empty repository in your account, then push the prepared `main` branch. When starting from the source ZIP, initialize Git first:

```sh
git init -b main
git add .
git commit -m "Initial GOSU JSON preview"
git remote add origin https://github.com/jansanchez/gosu-json.git
git push -u origin main
```

If Git is already initialized or `origin` already exists, inspect `git status` and `git remote -v` instead of repeating those setup steps. Enable private vulnerability reporting in repository settings.

CI tests and builds pull requests. Generated `dist/`, `releases/` and native Apple `build/` folders are excluded from Git. The source release ZIP contains prebuilt web extension resources; GitHub's automatic source archives do not.

After the GitHub repository exists, tagging `v0.4.2` and pushing that tag runs **Draft release**. It checks the tag against `package.json`, builds the four browser resource packages, and creates a **draft prerelease** with ZIPs and SHA-256 checksums. Review it before making it public. This workflow does not submit to browser stores or create a signed Safari app.

Run **Safari packaging** manually to generate the Xcode project and attempt an unsigned native compile on macOS. Inspect warnings and follow [SAFARI.md](SAFARI.md) for signing and real-browser validation.

## Browser stores

Run the manual browser checks before submitting. Update version in `package.json` and `scripts/build.mjs` together. Run tests, build, check and package. Attach the generated ZIPs to a tagged GitHub release.

Chrome Web Store accepts the Chromium ZIP; Firefox requires Mozilla review/signing of the Firefox build. Provide screenshots, a privacy-policy URL pointing to this repository and a clear justification for scripting and HTTP/HTTPS host permissions used for MIME-only automatic detection. Check current store requirements before submission.

The preview is not store-published or signed. The Firefox ID is a project identifier; change it before the first permanent publication if needed, then keep it stable.

## Chrome Web Store: first publication

1. Register a developer account in the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole). Pay the one-time registration fee shown by Google and complete account verification.
2. Create a new item and upload `releases/gosu-json-chromium-0.4.2.zip`. Do not upload the source ZIP: `manifest.json` must be at the package root.
3. Add the name, short description, full description, icon, screenshots and support URL. Use the README and presentation as starting points; do not claim untested browser support.
4. Complete privacy disclosures and each permission justification. Explain the single purpose (JSON reading/editing), broad site access for MIME detection and endpoint loading, local preference storage, and explicit URL requests. Use a public privacy-policy URL once the GitHub repository exists.
5. Choose distribution countries/visibility and submit for review. Address any reviewer feedback before publishing. Once approved and published, users install from the store without Developer mode.

Brave desktop supports Chrome Web Store extensions: a separate Brave upload is not required. Validate the release in Brave before claiming full compatibility.

## Firefox Add-ons: first publication

1. Sign in with a Mozilla account at the [Add-ons Developer Hub](https://addons.mozilla.org/developers/).
2. Submit a new add-on and choose **On this site** for a public Firefox Add-ons listing.
3. Upload `releases/gosu-json-firefox-0.4.2.zip`, resolve validator errors and review warnings.
4. Provide the source ZIP and reproducible build instructions for the bundled/minified code: Node.js 24+, `npm ci`, `npm run build`; resulting extension resources are in `dist/firefox`. The lockfile fixes dependency versions. The source package includes dependency license notices.
5. Fill in description, screenshots, support details, MIT license and privacy/data declarations. The manifest declares no data collection by GOSU JSON; describe user-requested endpoint connections accurately.
6. Submit for signing/publication and respond to review requests. A permanent user installation requires the signed version, not the temporary debugging installation.

For a signed file distributed through GitHub instead, choose **On your own**. That is a separate distribution route; managing automatic updates requires additional configuration. Keep the published add-on ID stable across versions.

## Safari

The build now includes experimental Safari resources and a local Apple packaging helper. Follow [SAFARI.md](SAFARI.md). The Safari ZIP is not directly installable; Apple packaging, signing, actual-browser validation and review remain pending.

Official publication guides: [Chrome](https://developer.chrome.com/docs/webstore/publish), [Firefox](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/), [Firefox signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/), [Brave installation](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave).

## Microsoft Edge Add-ons

Use the dedicated `releases/gosu-json-edge-0.4.2.zip`. Register in Microsoft Partner Center, upload the package, complete the listing/privacy disclosures, and submit for certification. Native Edge testing remains pending. See [EDGE.md](EDGE.md) for local installation, validation and submission steps.
