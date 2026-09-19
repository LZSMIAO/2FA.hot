# Store submission status

Updated: 2026-09-20. Version: 0.3.0. Publisher requested by owner: LONGMIAO LTD.

## Prepared and verified

- Store-only build excludes localhost permissions and the local companion bridge.
- Deterministic store ZIP and AGPL source ZIP generated under `../output/`.
- Original icons (16/32/48/128), Edge logo (300), small promotional tile (440×280), three actual extension UI screenshots (1280×800).
- Bilingual privacy policy at repository `public/passkeys-privacy.html`, also bundled as `privacy.html`.
- Listing text, permissions explanations, data disclosures and reviewer instructions in `listing.md`.
- 8 extension unit tests passed; browser registration/assertion and encrypted export/delete/import/restore verified against @simplewebauthn/server with the store build on an intercepted HTTPS fixture.
- Root targeted Passkey installation tests and typecheck passed; Cloudflare production build passed. Test browser closed. No development server started.
- Release preparation committed and pushed to `main` as `94d4887`, followed by formatting-only fix `5352996`. GitHub CI for `5352996` passed formatting, full root tests, typecheck and production build.
- Public homepage https://2fa.hot/passkeys and privacy URL https://2fa.hot/passkeys-privacy.html verified HTTP 200 with expected content (privacy URL redirects to `/passkeys-privacy`).
- Current local store ZIP SHA-256: `fd1d43fdf8e3435081cee128ef38ca032f8061426607f7b0749f3d11d6a7c936`.
- Owner subsequently requested moving the Passkey entry out of the header into the home-page input actions, after Paste / Import QR. Local implementation now opens a dialog; legacy `/passkeys` links redirect to the localized homepage with `?passkeys=1`. Manifest/listing homepage now points to `https://2fa.hot/?passkeys=1`. This follow-up UI change has not been deployed yet. Typecheck, targeted installation test and live desktop/mobile dialog checks passed.
- Follow-up local UX now offers a ready-built ZIP download and three installation steps, with browser menu navigation first and an optional copy-address fallback. There are no user-facing build commands. `package:store` generates `public/downloads/passkeys/` binaries/source and `shared/passkeys-release.json`; these must ship together with the UI. The HTTP-served ZIP was downloaded from the running localhost site and verified against its SHA-256, ZIP integrity and root manifest. No development server was started or restarted.
- Downloads use Workers Static Assets under the existing asset-first Wrangler configuration (no dynamic download handler, no `run_worker_first`). Cloudflare currently documents static-asset requests as free/unlimited with no additional asset storage charge: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ . This does not cover abuse of SSR or missing paths that invoke the Worker.

## Chrome Web Store

- Developer registration/payment confirmed complete by the visible dashboard.
- Dashboard requires EEA trader/non-trader declaration. Owner reports accidentally selecting non-trader; exact saved state has not yet been verified.
- Owner explicitly confirmed: company/business publishing; change to trader and continue corporate verification. This resolves the earlier automatic approval rejection for missing trader authorization; do not ask for this authorization again.
- Native Chrome actions currently fail because the foreground page changes between observation and action. Owner has been asked to leave the developer dashboard Settings tab selected briefly. The extension connector cannot script Chrome Web Store pages. No trader change has been successfully performed or verified by this task yet.
- Owner deferred supplying account details and asked to finish the home-page entry adjustment first. Resume account enrollment/submission after those details arrive; trader authorization remains valid.
- Extension ZIP has NOT been uploaded. No extension ID, review submission or public store link exists yet.

## Microsoft Edge Add-ons

- Microsoft account signed in. Edge developer program not yet enrolled.
- Enrollment draft set to United Kingdom / Company, publisher LONGMIAO LTD, website https://2fa.hot, email language Simplified Chinese.
- Awaiting actual company contact address, contact person's name/phone/company-domain email, and company approver's name/phone/email. Form rejects consumer email services including Outlook and Gmail.
- The developer agreement has NOT been accepted. Ask for confirmation at the final agreement action after fields are complete.
- No extension uploaded or submitted for certification.

## Public company verification

Official Companies House record: https://find-and-update.company-information.service.gov.uk/company/16596876

Confirmed in the visible official registry: LONGMIAO LTD; company number 16596876; Active; incorporated 21 July 2025. Current registered office shown as `PO Box 4385, 16596876 - COMPANIES HOUSE DEFAULT ADDRESS, Cardiff, CF14 8LH`.

Third-party sources show an older Shelton Street address. Do not reuse that address, or use the Companies House default address as the company's contact location, without the owner supplying the correct current contact details. Personal details are not recorded in this repository.

## Remaining release steps

1. Public homepage and privacy URL are published and verified. Unrelated workspace changes were excluded from this task's commits.
2. Resolve account requirements above; upload store ZIP, assets, listing and accurate privacy declarations.
3. Submit for review and record the actual item ID and visible status. A saved draft is not a review submission.
4. Once each listing is approved and publicly accessible, populate that store's ID in `shared/passkeys.ts` and publish the install link. Installation still requires the user's browser confirmation.

## Localhost detection fix — 0.2.1

The website previously offered the store ZIP on localhost, but the store build intentionally excludes localhost. Packaging now generates a separate preview ZIP; only its status/open-manager companion script is enabled for localhost. It does not add localhost credential interception. The website selects this ZIP only when served from localhost, while production continues to use the store ZIP.

Verified the exact preview ZIP downloaded over HTTP from the running localhost site in a disposable Chromium profile: extension connected with version 0.2.1, manager opened, independent registration/assertion verification passed, encrypted export/delete/import/restore passed, and the missing-extension view links to the correct local ZIP. Eight extension unit tests and root typecheck passed. Test browser and profile were closed/removed. Existing users should overwrite the files in their original unpacked-extension directory, reload the same extension, then refresh the website; do not uninstall a vault-containing extension.

## Website management integration - 0.3.0

Prepared locally; not submitted or published. The website modal now lists and searches passkeys after explicit approval in an extension popup. Import, export and deletion start from the website and complete in operation-specific extension windows. Only whitelisted account summaries return to the originating document; passwords, private keys and backup payloads remain in the extension. Results are document-bound, expire, and are consumed once. The page clears its list when the modal closes or after five minutes. Older extensions show an update download instead of a nonfunctional management button.

Validation: root typecheck, nine extension tests and two website boundary/link tests passed. Disposable Chromium integration verified approval, search, encrypted export, deletion, import restoration, cancellation and clearing; the restored key passed independent signature verification. The current connected Chrome with 0.2.1 displays the 0.3.0-preview update link. No real user vault was modified.
