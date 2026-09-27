# Store listing — 0.4.0

Publisher: LONGMIAO LTD. Company number: 16596876 (United Kingdom).
Product: 2fa.hot Passkeys. UI language: Simplified Chinese.
Category: Productivity / Tools (choose the closest category offered by each store).
Homepage: https://2fa.hot/?passkeys=1
Privacy policy: https://2fa.hot/passkeys-privacy.html
Support: https://github.com/LZSMIAO/2FA.hot/issues

Do not submit until the homepage and privacy URLs are publicly reachable. Do not promise certification, broad website compatibility, cloud sync, or universal passkey migration.

## Short description

在本机加密保存通行密钥，在网站上创建和登录，并通过加密备份迁移。

## 中文详情

2fa.hot Passkeys 在浏览器本机加密保存其他网站的通行密钥。你可以在支持的网站上创建通行密钥、选择账号登录，并通过口令保护的备份文件迁移到另一份浏览器配置。

主要功能：
• 创建和使用 ES256 / P-256 通行密钥，支持 PRF 和登录框自动填充。每次请求都会显示网站来源，需要你明确确认；确认框在网页内弹出（也可设为独立窗口），被遮挡时拒绝确认。
• 解锁一次后在设定的闲置时间内保持解锁，锁定电脑即锁定；可用 Touch ID、Windows Hello 或系统 PIN 解锁。
• 这里没有该网站的通行密钥时，请求直接交给浏览器，不弹出确认框。
• 在独立管理页查看、搜索、重命名和删除本机保存的通行密钥。
• 导出加密备份，并在另一台安装本扩展的设备上恢复。
• 导入受支持的 Bitwarden 未加密 JSON 中的 P-256 通行密钥，并提供同结构的明文导出。目标客户端必须支持相应格式；尚未在真实 Bitwarden 客户端中导入测试，不保证所有版本兼容。
• 支持暂停扩展，或把当前请求交给系统或其他验证器。

密钥库使用随机密钥以 AES-256-GCM 在本机加密，该密钥由主口令经 PBKDF2-SHA256 派生的密钥包裹；账号元数据也包含在密文内。扩展没有云同步、遥测或广告，不向开发者上传密钥库。你需要保管主口令和备份，遗忘主口令无法恢复；卸载扩展前请先备份。

这是公开预览版本，界面为简体中文。它使用可导出的软件密钥，不是硬件安全密钥，尚未通过独立安全审计或 FIDO 认证。largeBlob、硬件证明等未支持请求会交回浏览器原生 WebAuthn。删除本机凭据不会撤销网站上的凭据。不要删除原有登录方式，直到你确认新保存或恢复的通行密钥能够登录。

扩展需要在 HTTPS 网站运行，才能响应用户在各网站发起的通行密钥创建和登录请求。它不会读取普通网页内容来构建浏览历史。2fa.hot 网站可检测扩展并发起管理请求。在扩展中解锁并确认后，账号摘要返回同一网页，在弹窗中显示最多 5 分钟。私钥、主口令和备份文件不会返回网页。导入、导出和删除仍在扩展窗口中确认。

## English description

2fa.hot Passkeys stores passkeys for other websites in an encrypted vault on your device. Create a passkey on a supported website, choose an account to sign in, and move your vault using a password-protected backup file.

Features:
• Create and use ES256 / P-256 passkeys, with PRF and sign-in autofill. Each request shows the website origin and needs your explicit approval; the prompt opens inside the page (or in a separate window if you prefer) and refuses to confirm while anything covers it.
• Stay unlocked for an idle period you choose, lock when the computer locks, and unlock with Touch ID, Windows Hello or your system PIN.
• Sites you hold no passkey for go straight to the browser, with no prompt.
• View, search, rename and delete saved passkeys.
• Export encrypted backups and restore them in another browser profile with this extension installed.
• Import supported P-256 passkeys from unencrypted Bitwarden JSON and export the same JSON structure. The destination must support passkeys in that format. Import into a real Bitwarden client has not been tested; compatibility with every version is not promised.
• Pause the extension or hand a request to the system or another authenticator.

The vault, including account metadata, is encrypted locally with AES-256-GCM under a random key, which is wrapped by a key derived from your master password with PBKDF2-SHA256. There is no cloud sync, telemetry or advertising, and the extension does not upload your vault to the developer. Keep your master password and backups safe: a forgotten master password cannot be recovered. Back up before uninstalling.

This is a public preview with a Simplified Chinese interface. It uses exportable software keys, not hardware-bound keys, and has not undergone an independent security audit or FIDO certification. Unsupported requests, such as largeBlob or hardware attestation, fall back to native WebAuthn. Deleting a local key does not revoke it at the website. Keep another sign-in method until you have verified that a newly created or restored passkey works.

The extension runs on HTTPS websites to respond to passkey creation and sign-in requests. It does not scrape ordinary page content or build a browsing history. The 2fa.hot website can detect the extension and initiate management. After unlocking and approval in the extension, account summaries are returned to the requesting document for display for up to five minutes. Private keys, passwords and backup files never pass to the page. Import, export and deletion still require confirmation in the extension window.

## Privacy dashboard declarations

Single purpose: Create, store, use and transfer website passkeys in a local encrypted vault, with user approval for each authentication request.

Data handled (declare even though processing is local):
• Personally identifiable information: account usernames, display names and user identifiers supplied by the relying party.
• Authentication information: master/backup passwords, generated/imported passkey key material, credential identifiers and authentication challenges.
• Web history: the requesting site's origin / RP domain is processed for security and stored with each saved credential; this is not a general browsing log.

No sale or advertising use; no transfer unrelated to the single purpose; no use for creditworthiness/lending decisions. No remote executable code. No financial/payment, health, communications, precise location or general page-content collection. Imported JSON may contain unrelated fields; these are not stored or used.

Permissions justification:
• storage: Persist the encrypted vault and preferences in chrome.storage.local; temporarily retain pending request metadata in chrome.storage.session so the user can approve a request in an extension window. Storage access is restricted to trusted extension contexts.
• alarms: Remove expired pending authentication requests from session storage after the service worker has suspended.
• webNavigation: Call getFrame when processing and approving a request to verify the current URL and document identity of the requesting frame (and, for iframes, the page around it), preventing approval for a navigated or replaced document. No navigation-history listener or browsing telemetry.
• idle: Listen only for the "locked" state so the vault locks when the computer locks. No activity times are read or stored.
• web_accessible_resources (prompt.html): The confirmation prompt is the extension's own page, shown in an iframe inside the requesting website so the user confirms in context. The website cannot read into it; the prompt disables confirmation while any content covers it (IntersectionObserver v2). Websites can detect that the extension is installed; this is disclosed in the privacy policy.
• https://_/_ content scripts (all frames): Users can create and use passkeys at arbitrary HTTPS relying parties, including inside iframes the page permits to use WebAuthn. The scripts bridge supported navigator.credentials requests to the isolated extension, while unsupported cases retain native WebAuthn. For autofill sign-in they read only whether the focused field is marked webauthn and its position. A fixed site allowlist would prevent this core purpose. No ordinary page content is scraped.

## Reviewer notes

No subscription, developer account, payment or developer-hosted login is required to use the extension. Open its toolbar icon or Options page and create a local vault with a master password of at least 12 characters. Use only disposable test credentials and your own test password; the developer cannot recover it.

For manual review, use a WebAuthn test site that supports ES256 over HTTPS. For example https://webauthn.io/ with a disposable username and compatible options. On Create, a prompt opens inside the page: approve saving. On Authenticate, the vault is still unlocked from creation, so select the saved account and approve; lock it from the Options page to see the master-password step. The extension UI is Simplified Chinese: 创建并保存 = Create and save; 确认登录 = Approve sign-in; 使用系统或其他验证器 = Use another authenticator; 锁定 = Lock.

The repository includes tests/browser.mjs, which installs the packaged extension in a disposable Chromium profile, serves an intercepted HTTPS fixture without an external account, and independently verifies registration and assertion signatures with @simplewebauthn/server. It covers encrypted backup export, local deletion, import restoration and login using the original registered public key. This is automated protocol validation, not a claim that every public website has been manually tested.

Store package is built with `pnpm package:store`. It excludes localhost access and all tests/development files. Runtime scripts and tldts suffix data are bundled; no remote code or business network requests. Source archive and AGPL/MIT licenses accompany the release. Icons are original geometric artwork. Store screenshots use disposable fixture data.
