# Store submission status

Updated: 2026-09-20. Version: 0.2.0. Publisher requested by owner: LONGMIAO LTD.

## Prepared and verified

- Store-only build excludes localhost permissions and the local companion bridge.
- Deterministic store ZIP and AGPL source ZIP generated under `../output/`.
- Original icons (16/32/48/128), Edge logo (300), small promotional tile (440×280), three actual extension UI screenshots (1280×800).
- Bilingual privacy policy at repository `public/passkeys-privacy.html`, also bundled as `privacy.html`.
- Listing text, permissions explanations, data disclosures and reviewer instructions in `listing.md`.
- 8 extension unit tests passed; browser registration/assertion and encrypted export/delete/import/restore verified against @simplewebauthn/server with the store build on an intercepted HTTPS fixture.
- Root targeted Passkey installation tests and typecheck passed; Cloudflare production build passed. Test browser closed. No development server started.

## Chrome Web Store

- Developer registration/payment confirmed complete by the visible dashboard.
- Dashboard requires EEA trader/non-trader declaration before continuing.
- Company trader declaration awaiting owner's explicit confirmation following automatic approval review rejection. No declaration submitted by this task.
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

1. Publish and verify the public homepage and privacy URL using only the Passkey changes; unrelated workspace changes must not be deployed by this task.
2. Resolve account requirements above; upload store ZIP, assets, listing and accurate privacy declarations.
3. Submit for review and record the actual item ID and visible status. A saved draft is not a review submission.
4. Once each listing is approved and publicly accessible, populate that store's ID in `shared/passkeys.ts` and publish the install link. Installation still requires the user's browser confirmation.
