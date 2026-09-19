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

生成 `output/2fa-hot-passkeys-0.3.0-store.zip` 和对应源码包，同时将可直接下载的安装包、源码包写入网站 `public/downloads/passkeys/`，并生成 `shared/passkeys-release.json`。网站下载按钮读取该发布清单，无需用户自行构建；更新扩展后重新执行此命令，并一同发布生成文件。商店构建会移除 localhost 匹配规则及本站桥接的本机授权，保留 HTTPS 支持。打包命令同时生成 `-preview.zip` 本地测试包，为状态检测和经确认的网站管理保留 localhost 桥接；localhost 页面自动提供这个包，正式网站提供商店包，并附带隐私政策、图标和许可证。ZIP 根目录直接包含 manifest；不要上传源码包代替商店包。

`store/listing.md` 包含中英文描述、权限理由、隐私申报和审核说明；`store/assets` 包含原创图标、宣传图及真实扩展界面的测试账号截图。`store/submission-status.md` 记录提交进度。准备好 ZIP 不代表已提交或通过审核。

## 网站入口与商店安装

首页“粘贴 / 导入二维码”右侧的通行密钥按钮，在当前页弹窗提供安装检测、账号列表、搜索、选择和导入导出删除入口。操作所需的主口令、文件和最终确认在专用扩展小窗口中完成。旧版扩展会显示更新提示。`/?passkeys=1` 可直接打开弹窗，旧 `/passkeys`（含简繁中文版本）链接会重定向到首页弹窗，不再提供独立内容页。扩展升级后，在浏览器扩展页点击重新加载，再刷新网站。

网页不能静默安装扩展。商店审核通过后，将真实扩展 ID 写入项目 `shared/passkeys.ts` 的 `passkeyStoreIds`，网站会显示对应官方商店的安装按钮。未配置的商店不显示安装链接；两者均未配置时显示开发版安装指引。用户需要在商店点击添加并确认浏览器权限。

仅 `https://2fa.hot` 与本机 `localhost` 页面能通过专用桥接检测版本、发起管理请求。后台按浏览器提供的来源、顶层 frame 和当前 documentId 再次核验。默认只返回版本与管理协议能力。在扩展中解锁并确认后，账号摘要返回发起请求的同一文档；网站仅在内存中保留最多 5 分钟，关闭弹窗即清除。导入、导出、删除都在对应扩展窗口确认，备份文件、私钥和主口令不经过网页。请求绑定来源、标签页和文档，过期或导航后拒绝执行。网站检测仅用于界面提示，不作为身份认证依据。其他部署域名无法连接这一桥接。

## 添加和登录

在目标网站的账号安全设置中点击“创建通行密钥”。扩展显示由浏览器确认的来源域名和账号，输入主口令，再明确确认保存。网站完成注册后才算创建成功。

登录时点击网站的通行密钥登录入口，在扩展中解锁、选择账号、确认登录。每次网站请求都需要在独立扩展窗口内验证主口令和确认；私钥不会交给网页。

如果凭据在其他管理器，选择“使用系统或其他验证器”。可以在设置中暂停本扩展。取消与关闭窗口会终止此次请求。

## 转移

- **另一台设备或另一份浏览器配置：**选中账号 → 导出与迁移 → 加密备份，设置独立备份口令；接收端安装扩展、创建自己的密钥库，再导入文件。导入时使用备份口令，与新设备的主口令无关。
- **从 Bitwarden 迁入：**在原管理器导出未加密 JSON，本扩展导入并预览其中的 `login.fido2Credentials`。只适配 ECDSA / P-256 通行密钥；密码、TOTP 和删除的条目不导入。其他算法显示跳过数量，结构错误和凭据冲突阻止合并。
- **迁往其他管理器：**可导出 Bitwarden JSON 结构，必须明确确认文件含明文私钥。目标管理器必须实际支持该格式里的通行密钥；目前做过格式往返与签名验证，未做真实 Bitwarden 客户端互导验证，不承诺所有客户端版本兼容。
- **来源不允许导出：**回到目标网站新增一把由本扩展保存的通行密钥。硬件绑定且不可导出的私钥无法读取。

登录时的跨设备二维码通常用于远程认证，不是通行密钥导出二维码。删除本地副本也不会撤销网站上的凭据。迁移后应先确认新位置能够登录；使用非零签名计数器的旧凭据不适合长期保留并交替使用多个离线副本。

本版本没有实现系统 CXP 交换，也不读取 iCloud、Google Password Manager 或 Microsoft Authenticator 的私有数据。

## 实现范围

- P-256 / ES256、`none` attestation、discoverable / allowCredentials、excludeCredentials、credProps。
- 用户在扩展窗口内输入主口令并确认后，声明 UP / UV。新软件凭据 BE=1、BS=0、计数器 0。导入已有计数器的凭据保留并递增；重复导入不会回退计数器。
- 顶层 HTTPS 页面和 `http://localhost`。RP ID 使用 tldts 的公共及私有后缀规则校验，来源及 documentId 取自浏览器扩展 MessageSender，并在批准时重新确认文档。
- iframe、conditional / silent mediation、PRF、largeBlob、硬件证明、跨平台验证器要求及其他未支持能力交回原生 WebAuthn。尚未完成广泛网站兼容性或独立安全审计，不能当作已认证的生产级密码管理器。
- AES-256-GCM + PBKDF2-SHA256（600,000 次），随机盐和 IV。密钥、账号名和元数据加密后放入 `chrome.storage.local`；存储限制为 TRUSTED_CONTEXTS。
- 主口令只在扩展窗口内存中保存，关闭窗口或 5 分钟未操作后清除。后台不保存解锁密钥。修改主口令不改变旧备份的口令。
- 无远程依赖、遥测或业务网络请求。域名校验库打包到扩展。`webNavigation` 权限用于确认用户批准的请求仍属于同一个文档；不收集浏览记录。
- 私钥需要可导出才能迁移，属于软件密钥库，不提供硬件不可导出的属性。主口令遗忘无法恢复；卸载扩展前需要备份。

## 验证

```sh
pnpm --dir extensions/passkeys test
pnpm --dir extensions/passkeys build
```

测试使用独立的 `@simplewebauthn/server` 验证注册及认证响应，而非仅检查本项目自己的编解码。覆盖域名边界、错误口令、密文篡改、导入恢复、计数器和后台消息授权。

`tests/browser.mjs` 使用 Playwright 的隔离 Chromium 配置加载扩展，验证完整注册、登录、加密导出、删除和导入。它用路由拦截提供 localhost 测试页面，不启动开发服务器，也不连接用户真实账号；结束时自动关闭浏览器并移除临时配置。运行时需安装 Playwright 与其 Chromium；可通过 `PLAYWRIGHT_MODULE` 指向已有 Playwright 的 `index.mjs`。

```sh
cd extensions/passkeys
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser.mjs
```

若网站开发环境已运行，可额外指定 `PASSKEY_COMPANION_URL=http://localhost:3001/zh-CN`，同时验证网站检测、内嵌列表、搜索、导出、删除、导入恢复、取消与列表清除，以及未安装状态与手机宽度布局；测试脚本不会启动服务器。

## 参考与许可

- [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)
- [Bitwarden 扩展凭据提供架构](https://contributing.bitwarden.com/architecture/deep-dives/passkeys/implementations/provider/browser-extension/)
- [Bitwarden JSON 通行密钥结构示例](https://github.com/bitwarden/clients/issues/6925)
- [Bitwarden 导出说明](https://bitwarden.com/help/export-your-data/)

本扩展沿用项目 AGPL-3.0-only 许可。运行时依赖 tldts / tldts-core 使用 MIT 许可；原始依赖许可随构建保存在 `dist/licenses`，打包文件保留依赖版权注释。本实现参考公开协议与格式，没有复制 Bitwarden 实现源码。

### 更新本地测试扩展

下载新版本后，将文件解压覆盖到原来加载的扩展文件夹，在浏览器扩展管理页点击该扩展的重新加载按钮，再刷新网站。保留原扩展 ID 和数据：不要先卸载扩展或换一个文件夹重新安装，尤其是已保存通行密钥时。
