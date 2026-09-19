# Store listing — 0.2.0

Publisher: LONGMIAO LTD. Company number: 16596876 (United Kingdom).
Product: 2fa.hot Passkeys. UI language: Simplified Chinese.
Category: Productivity / Tools (choose the closest category offered by each store).
Homepage: https://2fa.hot/passkeys
Privacy policy: https://2fa.hot/passkeys-privacy.html
Support: https://github.com/LZSMIAO/2fa-hot/issues

Do not submit until the homepage and privacy URLs are publicly reachable. Do not promise certification, broad website compatibility, cloud sync, or universal passkey migration.

## Short description

在本机加密保存通行密钥，在网站上创建和登录，并通过加密备份迁移。

## 中文详情

2fa.hot Passkeys 在浏览器本机加密保存其他网站的通行密钥。你可以在支持的网站上创建通行密钥、选择账号登录，并通过口令保护的备份文件迁移到另一份浏览器配置。

主要功能：
• 创建和使用 ES256 / P-256 通行密钥。每次请求都会显示网站来源，需要在扩展窗口输入主口令并明确确认。
• 在独立管理页查看、搜索和删除本机保存的通行密钥。
• 导出加密备份，并在另一台安装本扩展的设备上恢复。
• 导入受支持的 Bitwarden 未加密 JSON 中的 P-256 通行密钥，并提供同结构的明文导出。目标客户端必须支持相应格式；尚未验证真实 Bitwarden 客户端互导，不保证所有版本兼容。
• 支持暂停扩展，或把当前请求交给系统或其他验证器。

密钥库使用 AES-256-GCM 和 PBKDF2-SHA256 在本机加密，账号元数据也包含在密文内。扩展没有云同步、遥测或广告，不向开发者上传密钥库。你需要保管主口令和备份，遗忘主口令无法恢复；卸载扩展前请先备份。

这是首个公开预览版本，界面为简体中文。它使用可导出的软件密钥，不是硬件安全密钥，尚未通过独立安全审计或 FIDO 认证。iframe、条件式自动填充、PRF 等未支持请求会交回浏览器原生 WebAuthn。删除本机凭据不会撤销网站上的凭据。不要删除原有登录方式，直到你确认新保存或恢复的通行密钥能够登录。

扩展需要在 HTTPS 网站运行，才能响应用户在各网站发起的通行密钥创建和登录请求。它不会读取普通网页内容来构建浏览历史。2fa.hot 网站只可以检测扩展版本并打开管理页，不能读取密钥库或账号列表。

## English description

2fa.hot Passkeys stores passkeys for other websites in an encrypted vault on your device. Create a passkey on a supported website, choose an account to sign in, and move your vault using a password-protected backup file.

Features:
• Create and use ES256 / P-256 passkeys. Each request shows the website origin and requires your master password and explicit approval in a separate extension window.
• View, search and delete saved passkeys.
• Export encrypted backups and restore them in another browser profile with this extension installed.
• Import supported P-256 passkeys from unencrypted Bitwarden JSON and export the same JSON structure. The destination must support passkeys in that format. Interoperability with a real Bitwarden client has not been verified; compatibility with every version is not promised.
• Pause the extension or hand a request to the system or another authenticator.

The vault, including account metadata, is encrypted locally using AES-256-GCM and PBKDF2-SHA256. There is no cloud sync, telemetry or advertising, and the extension does not upload your vault to the developer. Keep your master password and backups safe: a forgotten master password cannot be recovered. Back up before uninstalling.

This is an initial public preview with a Simplified Chinese interface. It uses exportable software keys, not hardware-bound keys, and has not undergone an independent security audit or FIDO certification. Unsupported requests, including iframe requests, conditional autofill and PRF, fall back to native WebAuthn. Deleting a local key does not revoke it at the website. Keep another sign-in method until you have verified that a newly created or restored passkey works.

The extension runs on HTTPS websites to respond to passkey creation and sign-in requests. It does not scrape ordinary page content or build a browsing history. The 2fa.hot companion website can detect the extension version and open its management page; it cannot access vault contents or your account list.

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
• webNavigation: Call getFrame when processing and approving a request to verify the current top-level URL and document identity, preventing approval for a navigated or replaced document. No navigation-history listener or browsing telemetry.
• https://*/* content scripts: Users can create and use passkeys at arbitrary HTTPS relying parties. The scripts bridge supported navigator.credentials requests to the isolated extension, while unsupported cases retain native WebAuthn. A fixed site allowlist would prevent this core purpose. No ordinary page content is scraped.

## Reviewer notes

No subscription, developer account, payment or developer-hosted login is required to use the extension. Open its toolbar icon or Options page and create a local vault with a master password of at least 12 characters. Use only disposable test credentials and your own test password; the developer cannot recover it.

For manual review, use a WebAuthn test site that supports ES256, top-level HTTPS, none attestation and ordinary (not conditional) create/get requests. For example https://webauthn.io/ with a disposable username and compatible options. On Create, approve saving in the extension. On Authenticate, enter the master password, select the saved account and approve. The extension UI is Simplified Chinese: 保存通行密钥 = Save passkey; 确认登录 = Approve sign-in; 使用系统或其他验证器 = Use another authenticator.

The repository includes tests/browser.mjs, which installs the packaged extension in a disposable Chromium profile, serves an intercepted HTTPS fixture without an external account, and independently verifies registration and assertion signatures with @simplewebauthn/server. It covers encrypted backup export, local deletion, import restoration and login using the original registered public key. This is automated protocol validation, not a claim that every public website has been manually tested.

Store package is built with `pnpm package:store`. It excludes localhost access and all tests/development files. Runtime scripts and tldts suffix data are bundled; no remote code or business network requests. Source archive and AGPL/MIT licenses accompany the release. Icons are original geometric artwork. Store screenshots use disposable fixture data.
