# GOSU JSON 0.4.8 — preview

- Fix Firefox automatic JSON opening with a bounded, permission-scoped response stream instead of injecting into the isolated native JSON viewer.
- After approval and **Always on this site**, automatic opening imports the original response without another endpoint request. Response bytes and headers stay unchanged; the original tab remains available.
- Replace the broken first-time import with **Allow and load JSON**, explicitly described as a fresh GET without cookies or authentication headers. It also works when the original tab is closed. Denial keeps both panels empty.
- Clear the access banner after successful URL loading and offer the automatic-opening choice.
- Document Firefox-only stream permissions; preserve Chrome/Brave/Edge automatic opening.
- Add native Firefox integration coverage and stream regression tests. See [validation](VALIDATION.md) for results and limits.

## Previous release: GOSU JSON 0.4.7 — preview

- Preserve Chrome/Brave and Edge automatic JSON opening from 0.4.5.
- Open the Firefox workspace from the toolbar before asking for site access; both panels remain empty until approval.
- Add a Firefox welcome with fictional example JSON on first installation.
- Import the response from the original tab after approval without repeating the request. Refuse capture if the tab changed.
- Offer Firefox automatic opening after import and unregister detectors when access is revoked.
- Keep all table exports, selection and navigation improvements from 0.4.5.

Firefox native permission dialogs and native JSON-viewer interoperability require manual validation before store submission. Safari resources remain experimental.
