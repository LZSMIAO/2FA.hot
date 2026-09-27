# 2fa.hot Passkeys

Chrome / Edge Manifest V3 通行密钥管理扩展，开发预览版。它是其他网站的凭据提供方；不是“用 Passkey 登录 2fa.hot”。不需要本站账户，也没有云同步。现有 Nuxt 网站与扩展的数据独立。

## 安装

在项目根目录运行：

```sh
pnpm --dir extensions/passkeys install --frozen-lockfile
pnpm --dir extensions/passkeys build
```

1. Chrome 打开 `chrome://extensions`，Edge 打开 `edge://extensions`。
2. 开启“开发者模式”，选择“加载已解压的扩展程序”。
3. 选择本目录的 `dist` 文件夹。
4. 点击扩展图标，设置至少 12 个字符的主口令。
5. 已打开的网站需要刷新后，才会注入扩展。

没有自动安装到浏览器，也没有发布到商店。`dist` 是构建产物，不提交版本控制。

### 商店构建

```sh
pnpm --dir extensions/passkeys package:store
```

生成 `output/2fa-hot-passkeys-0.4.0-store.zip` 和对应源码包，同时将可直接下载的安装包、源码包写入网站 `public/downloads/passkeys/`，并生成 `shared/passkeys-release.json`。网站下载按钮读取该发布清单，无需用户自行构建；更新扩展后重新执行此命令，并一同发布生成文件。商店构建会移除 localhost 匹配规则及本站桥接的本机授权，保留 HTTPS 支持。打包命令同时生成 `-preview.zip` 本地测试包，为状态检测和经确认的网站管理保留 localhost 桥接；localhost 页面自动提供这个包，正式网站提供商店包，并附带隐私政策、图标和许可证。ZIP 根目录直接包含 manifest；不要上传源码包代替商店包。

`store/listing.md` 包含中英文描述、权限理由、隐私申报和审核说明；`store/assets` 包含原创图标、宣传图及真实扩展界面的测试账号截图。`store/submission-status.md` 记录提交进度。准备好 ZIP 不代表已提交或通过审核。

## 网站入口与商店安装

首页“粘贴 / 导入二维码”右侧的通行密钥按钮，在当前页弹窗提供安装检测、账号列表、搜索、选择和导入导出删除入口。操作所需的主口令、文件和最终确认在专用扩展小窗口中完成。旧版扩展会显示更新提示。`/?passkeys=1` 可直接打开弹窗，旧 `/passkeys`（含简繁中文版本）链接会重定向到首页弹窗，不再提供独立内容页。扩展升级后，在浏览器扩展页点击重新加载，再刷新网站。

网页不能静默安装扩展。商店审核通过后，将真实扩展 ID 写入项目 `shared/passkeys.ts` 的 `passkeyStoreIds`，网站会显示对应官方商店的安装按钮。未配置的商店不显示安装链接；两者均未配置时显示开发版安装指引。用户需要在商店点击添加并确认浏览器权限。

仅 `https://2fa.hot` 与本机 `localhost` 页面能通过专用桥接检测版本、发起管理请求。后台按浏览器提供的来源、顶层 frame 和当前 documentId 再次核验。默认只返回版本与管理协议能力。在扩展中解锁并确认后，账号摘要返回发起请求的同一文档；网站仅在内存中保留最多 5 分钟，关闭弹窗即清除。导入、导出、删除都在对应扩展窗口确认，备份文件、私钥和主口令不经过网页。请求绑定来源、标签页和文档，过期或导航后拒绝执行。网站检测仅用于界面提示，不作为身份认证依据。其他部署域名无法连接这一桥接。

## 添加和登录

在目标网站的账号安全设置中点击“创建通行密钥”。确认框默认在网页内弹出（位于浏览器顶层，网站读不到其中内容），显示由浏览器确认的来源域名和账号；解锁后明确确认保存。网站完成注册后才算创建成功。同一账号已保存过时，扩展告知网站 `InvalidStateError`，与其他验证器一致。

登录时点击网站的通行密钥登录入口，或在标有 `autocomplete="… webauthn"` 的登录框获得焦点时，点击下方出现的 2fa.hot 按钮（条件式自动填充）。浏览器自己的自动填充列表同时保留，选中任意一边都会结束另一边。

扩展只在这里可能保存了该网站的密钥时才弹出确认框；否则直接交给浏览器，锁定状态下也不打扰。判断依据是本机的站点索引（见下文），它只存键控哈希。

如果凭据在其他管理器，选择“使用系统或其他验证器”。可以在设置中暂停本扩展。取消与关闭确认框会终止此次请求。

### 解锁与设置

- **快速解锁：**用主口令或设备验证解锁一次后，解密密钥库的随机密钥只保留在 `chrome.storage.session`（浏览器内存，仅扩展可信页面可读，关闭浏览器即消失），闲置到设定时间后清除。可选“每次都要验证 / 5 分钟 / 15 分钟（默认）/ 1 小时 / 关闭浏览器时”。锁定电脑（`idle` 权限的 locked 状态）会立即锁定。导出、修改主口令、启用设备解锁始终要求重新输入主口令。
- **设备解锁（Touch ID / Windows Hello / 系统 PIN）：**扩展在本机平台验证器上注册一把自己的凭据，读取其 PRF 输出，用 HKDF 派生的密钥包裹密钥库的随机密钥。只有该验证器能给出这个值；修改主口令不影响设备解锁。验证器不支持 PRF 时会提示无法启用。
- **确认框位置：**网页内（默认）或独立小窗口。网页内确认框用 IntersectionObserver v2 检测遮挡、透明化和变形，确认按钮在完整可见前保持禁用，用于防范点击劫持。iframe 内发起的请求一律使用独立窗口。

## 转移

- **另一台电脑或另一份浏览器配置：**选中账号 → 导出与迁移 → 加密备份，设置独立备份口令；接收端安装扩展、创建自己的密钥库，再导入文件。导入时使用备份口令，与新设备的主口令无关。PRF 种子随加密备份迁移，迁移后 PRF 输出不变。
- **从 Bitwarden 迁入：**在原管理器导出未加密 JSON，本扩展导入并预览其中的 `login.fido2Credentials`。只适配 ECDSA / P-256 通行密钥；密码、TOTP 和删除的条目不导入。条目名称与域名不同时作为自定义名称导入。
- **迁往 Bitwarden：**导出 Bitwarden JSON，必须明确确认文件含明文私钥，在 Bitwarden 网页版“导入数据”中选择 Bitwarden (json)。凭据 ID 使用 `b64.` 前缀，按 Bitwarden 源码中的解析方式生成；已做格式往返与签名验证，尚未在真实 Bitwarden 客户端中导入测试。该格式没有 PRF 字段，迁出后 PRF 输出会改变。
- **迁往 1Password、Apple 密码：**截至 2026 年 9 月，它们只通过 FIDO 凭据交换（CXP）在 iOS 26 / iPadOS 26 与 Android 14 以上接收通行密钥，这是系统层的 App 间传输，浏览器扩展无法参与，也没有可导入的文件格式。可行路径：先迁入 Bitwarden，再在手机上的 Bitwarden App 中通过凭据交换导出给它们。计数器非零的凭据可能无法经 CXP 转移。
- **来源不允许导出：**回到目标网站新增一把由本扩展保存的通行密钥。硬件绑定且不可导出的私钥无法读取。

导出后，被导出的凭据标记为已备份（BS=1），下一次登录起网站会看到这个标志。登录时的跨设备二维码通常用于远程认证，不是通行密钥导出二维码。删除本地副本也不会撤销网站上的凭据。迁移后应先确认新位置能够登录。

本扩展不读取 iCloud、Google Password Manager 或 Microsoft Authenticator 的私有数据。

## 实现范围

- P-256 / ES256；attestation 为 `direct` / `indirect` 时按规范降级为 `none`，`enterprise` 交回原生。discoverable / allowCredentials、excludeCredentials（`InvalidStateError`）、credProps、PRF（含 `eval` 与 `evalByCredential`，按 CTAP2 hmac-secret 的“WebAuthn PRF”标签派生）。
- 条件式自动填充（conditional mediation）、跨源 iframe（`clientDataJSON` 带 `crossOrigin` 与 `topOrigin`，需要页面授予 `publickey-credentials-*` 权限）。`isUserVerifyingPlatformAuthenticatorAvailable`、`isConditionalMediationAvailable` 与 `getClientCapabilities` 按本扩展的能力回答；暂停扩展时这些回答仍为可用。
- silent mediation、largeBlob、硬件证明、跨平台验证器要求交回原生 WebAuthn。尚未完成广泛网站兼容性或独立安全审计，不能当作已认证的生产级密码管理器。
- 用户解锁（主口令或设备验证）并确认后声明 UP / UV；快速解锁有效期内视为已验证，与常见密码管理器一致。新软件凭据 BE=1、BS=0、计数器 0。
- 本地密钥库（格式版本 2）：随机 256 位密钥以 AES-256-GCM 加密全部凭据；主口令经 PBKDF2-SHA256（600,000 次）包裹该密钥，设备解锁另行包裹。0.3.0 的版本 1 密钥库在首次用主口令解锁时自动升级。备份文件仍为版本 1（直接由备份口令加密）。存储限制为 TRUSTED_CONTEXTS。
- 站点索引：`chrome.storage.local` 中保存每个网站及凭据的 HMAC-SHA256（截断为 16 字节）和随机索引密钥，不含明文域名。拿到本机浏览器配置文件的人仍可逐一猜测域名是否在其中；这是锁定时不打扰无关网站的代价。
- 条件式自动填充的按钮只在这里可能保存了该网站的通行密钥时出现，网站因此能判断本浏览器是否保存了它自己域名下的通行密钥（无法得知其他网站的情况）。浏览器自带的条件式自动填充不会透露这一点。
- 自定义名称、PRF 种子与计数器一起加密保存；PRF 种子和私钥从不离开后台脚本。
- 无远程依赖、遥测或业务网络请求。`webNavigation` 权限用于确认用户批准的请求仍属于同一个文档，`idle` 权限只用于锁屏时锁定；不收集浏览记录。网页内确认框 `prompt.html` 为 web accessible resource，网站因此可以探测到本扩展已安装；为让设备解锁在网页内可用，未使用动态 ID。
- 私钥需要可导出才能迁移，属于软件密钥库，不提供硬件不可导出的属性。主口令遗忘无法恢复；卸载扩展前需要备份。

### Firefox

`pnpm --dir extensions/passkeys build:firefox` 生成 `dist-firefox`：事件页后台、`browser_specific_settings`（Firefox 128+），去掉 Chrome 专用键。Firefox 不提供 `documentId`，请求改为绑定标签页、frame 与来源，并在该 frame 导航时终止；确认框始终使用独立窗口，因为 Firefox 没有网页内防遮挡检测所需的 IntersectionObserver v2。此构建只做了构建检查，尚未在真实 Firefox 中运行测试，网站下载入口不提供它。

## 验证

```sh
pnpm --dir extensions/passkeys test
pnpm --dir extensions/passkeys build
```

测试使用独立的 `@simplewebauthn/server` 验证注册及认证响应，而非仅检查本项目自己的编解码。覆盖域名边界、错误口令、密文篡改、导入恢复、计数器、后台消息授权、密钥库版本 2 与升级、设备解锁包裹、会话时限、站点索引、PRF、重复注册与 attestation 降级、iframe 的 `topOrigin`。

`tests/browser.mjs` 使用 Playwright 的隔离 Chromium 配置加载扩展，用真实页面验证：锁定时无关网站不弹窗、网页内注册（含 PRF）、重复注册的 `InvalidStateError`、锁定后登录、遮挡时拒绝确认、条件式自动填充登录、虚拟平台验证器的设备解锁（管理页与网页内确认框）、重命名、加密导出/删除/导入后仍能签名、独立窗口模式、跨源 iframe 登录，以及存储中没有明文口令、私钥、账号或域名。它用路由拦截提供 localhost 测试页面，不启动开发服务器，也不连接用户真实账号；结束时自动关闭浏览器并移除临时配置。运行时需安装 Playwright 与其 Chromium；可通过 `PLAYWRIGHT_MODULE` 指向已有 Playwright 的 `index.mjs`。

```sh
cd extensions/passkeys
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser.mjs
```

若网站开发环境已运行，可额外指定 `PASSKEY_COMPANION_URL=http://localhost:3001/zh-CN`，同时验证网站检测、内嵌列表、搜索、重命名、导出、删除、导入恢复、取消与列表清除，以及未安装状态与手机宽度布局；测试脚本不会启动服务器。

## 参考与许可

- [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)
- [Bitwarden 扩展凭据提供架构](https://contributing.bitwarden.com/architecture/deep-dives/passkeys/implementations/provider/browser-extension/)
- [Bitwarden JSON 通行密钥结构示例](https://github.com/bitwarden/clients/issues/6925)
- [Bitwarden 导出说明](https://bitwarden.com/help/export-your-data/)
- [Bitwarden 凭据 ID 解析（`b64.` 前缀）](https://github.com/bitwarden/clients/blob/main/libs/common/src/platform/services/fido2/credential-id-utils.ts)
- [1Password 导入说明（凭据交换仅限 iOS 26 / Android 14 以上）](https://support.1password.com/import/)
- [Switching Password Managers in 2026（凭据交换的平台现状）](https://rmondello.com/2026/09/07/switching-password-managers-2026/)

本扩展沿用项目 AGPL-3.0-only 许可。运行时依赖 tldts / tldts-core 使用 MIT 许可；原始依赖许可随构建保存在 `dist/licenses`，打包文件保留依赖版权注释。本实现参考公开协议与格式，没有复制 Bitwarden 实现源码。

### 更新本地测试扩展

下载新版本后，将文件解压覆盖到原来加载的扩展文件夹，在浏览器扩展管理页点击该扩展的重新加载按钮，再刷新网站。保留原扩展 ID 和数据：不要先卸载扩展或换一个文件夹重新安装，尤其是已保存通行密钥时。
