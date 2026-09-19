const en = {
  title: 'Your passkeys, in your browser',
  description:
    'Create and use passkeys for other websites. Keep them encrypted in the 2fa.hot extension and take a backup when you move.',
  preview: 'Developer preview',
  connection: 'Browser extension',
  checking: 'Checking for the extension…',
  installed: 'Extension connected',
  missing: 'Extension not detected',
  unsupported: 'Use desktop Chrome or Edge',
  unsupportedHint:
    'This version supports desktop Chrome and Edge. Open this page there to install and manage passkeys.',
  installedHint:
    'Open the extension to create or unlock your vault. Enter your master password only in the extension window.',
  missingHint:
    'Install the extension, then refresh this page. Your existing TOTP accounts stay in the website.',
  open: 'Manage passkeys',
  recheck: 'Check again',
  opened: 'The extension manager is open. Continue in its tab.',
  failed:
    'Could not open the extension. Refresh this page or use the extension icon in your browser.',
  chrome: 'Install for Chrome',
  edge: 'Install for Edge',
  storeHint:
    'The store opens in a new tab. Review the permissions and confirm installation in your browser.',
  notPublished: 'Store installation is not available yet. You can try the developer version below.',
  developer: 'Install the developer version',
  developerIntro:
    'Build the extension from the project source on your computer. Developer mode is only needed until the store release.',
  source: 'Open source and build instructions',
  steps: [
    'Build the extension using the commands below.',
    'Open your browser’s extensions page, enable Developer mode, and choose Load unpacked.',
    'Select extensions/passkeys/dist. Then refresh this page and the websites where you want to use passkeys.'
  ],
  extensionsPage: 'Extensions page (copy into the address bar)',
  instructions: 'Start using passkeys',
  flows: [
    {
      title: 'Create a passkey for a website',
      text: 'Sign in to that website and choose Add passkey in its security settings. Check the domain and account in the extension, unlock your vault, and confirm. Registration is complete when the website accepts it.'
    },
    {
      title: 'Sign in with a saved passkey',
      text: 'Choose passkey sign-in on the website. Unlock the extension, select your account, and confirm. Use “System or another authenticator” if the passkey is stored elsewhere.'
    },
    {
      title: 'Move your existing passkeys',
      text: 'Open Import in the extension to restore its encrypted backup or import supported Bitwarden JSON. If the old provider cannot export, add a new passkey on the original website and save it here.'
    },
    {
      title: 'Take your passkeys with you',
      text: 'Select entries in the extension and export an encrypted backup with a separate password. Restore it on another copy of the extension. Bitwarden-format export contains plaintext private keys; compatibility with actual Bitwarden clients still needs verification.'
    }
  ],
  storage: 'Where your passkeys live',
  privacy:
    'The extension encrypts private keys and account metadata locally. This page can check its version and open its manager; it cannot read your vault. There is no cloud sync or password recovery. Keep an encrypted backup before uninstalling.',
  limits: 'Preview limitations',
  limitation:
    'The extension UI is currently in Chinese. This version supports common ES256 passkeys; features such as PRF and conditional autofill use the browser’s other authenticators. Broad website compatibility and independent security review are still pending.',
  migrationNote:
    'A cross-device sign-in QR code is not a passkey export. Deleting a local copy does not revoke the credential on the website.',
  protocol: 'Installation requires your confirmation',
  protocolText:
    'A website cannot silently add this extension to your browser. After the store release, the install buttons take you to the official listing, where you confirm installation.'
}

export type PasskeyCopy = typeof en

export const passkeyCopy: Record<'en' | 'zh-CN' | 'zh-TW', PasskeyCopy> = {
  en,
  'zh-CN': {
    title: '把通行密钥，保存在你的浏览器',
    description:
      '为其他网站创建和使用通行密钥，由 2fa.hot 扩展在本机加密保存。换设备时，用备份带走。',
    preview: '开发预览版',
    connection: '浏览器扩展',
    checking: '正在检测扩展…',
    installed: '扩展已连接',
    missing: '尚未检测到扩展',
    unsupported: '请使用电脑版 Chrome 或 Edge',
    unsupportedHint:
      '当前版本支持电脑版 Chrome 和 Edge。请在这些浏览器中打开此页，安装和管理通行密钥。',
    installedHint: '打开扩展，创建或解锁密钥库。主口令只在扩展窗口中输入。',
    missingHint: '安装扩展后，请刷新此页。原有 TOTP 账号仍保留在网站中。',
    open: '管理通行密钥',
    recheck: '重新检测',
    opened: '扩展管理页已打开，请在该标签页继续。',
    failed: '无法打开扩展。请刷新此页，或点击浏览器中的扩展图标。',
    chrome: '安装到 Chrome',
    edge: '安装到 Edge',
    storeHint: '将在新标签页打开商店。请核对权限，并在浏览器中确认安装。',
    notPublished: '暂未上架扩展商店。现在可以按下方步骤试用开发版。',
    developer: '安装开发版',
    developerIntro: '先在你的电脑上从项目源码构建扩展。开发者模式仅用于商店上架前的试用。',
    source: '查看源码和构建说明',
    steps: [
      '使用下方命令构建扩展。',
      '打开浏览器的扩展页面，开启“开发者模式”，选择“加载已解压的扩展程序”。',
      '选择 extensions/passkeys/dist 文件夹，然后刷新此页和需要使用通行密钥的网站。'
    ],
    extensionsPage: '扩展页面（复制到地址栏打开）',
    instructions: '开始使用通行密钥',
    flows: [
      {
        title: '为网站添加通行密钥',
        text: '先登录目标网站，在账号安全设置中选择“添加通行密钥”。核对扩展显示的域名和账号，解锁密钥库并确认保存。目标网站接受后，才算注册完成。'
      },
      {
        title: '使用已保存的通行密钥登录',
        text: '在目标网站选择通行密钥登录，解锁扩展、选择账号并确认。如果凭据保存在其他地方，选择“使用系统或其他验证器”。'
      },
      {
        title: '把现有通行密钥迁入',
        text: '在扩展中选择导入，恢复本扩展的加密备份，或导入支持的 Bitwarden JSON。如果原管理器无法导出，可回到原网站新增一把通行密钥，保存到这里。'
      },
      {
        title: '把通行密钥迁出',
        text: '在扩展中选中账号，用独立备份口令导出加密文件，在另一份扩展中恢复。也可导出 Bitwarden 格式，但文件含明文私钥，与真实 Bitwarden 客户端的兼容性仍待验证。'
      }
    ],
    storage: '通行密钥保存在哪里',
    privacy:
      '扩展在本机加密保存私钥和账号信息。此页面只能检测版本、打开管理页，无法读取密钥库。没有云同步或口令找回，卸载扩展前请先保留加密备份。',
    limits: '预览版范围',
    limitation:
      '扩展界面目前为简体中文。当前支持常见的 ES256 通行密钥；PRF、条件式自动填充等能力交给浏览器的其他验证器处理。广泛网站兼容验证和独立安全审查尚未完成。',
    migrationNote: '跨设备登录的二维码不是通行密钥导出码。删除本地副本，也不会撤销网站上的凭据。',
    protocol: '安装需要你确认',
    protocolText: '网页无法静默添加此扩展。商店上架后，安装按钮会带你前往官方商店，由你确认安装。'
  },
  'zh-TW': {
    title: '把通行密鑰，保存在你的瀏覽器',
    description:
      '為其他網站建立和使用通行密鑰，由 2fa.hot 擴充功能在本機加密保存。換裝置時，用備份帶走。',
    preview: '開發預覽版',
    connection: '瀏覽器擴充功能',
    checking: '正在偵測擴充功能…',
    installed: '擴充功能已連線',
    missing: '尚未偵測到擴充功能',
    unsupported: '請使用電腦版 Chrome 或 Edge',
    unsupportedHint:
      '目前版本支援電腦版 Chrome 和 Edge。請在這些瀏覽器中開啟此頁，安裝和管理通行密鑰。',
    installedHint: '開啟擴充功能，建立或解鎖密鑰庫。主密碼只在擴充功能視窗中輸入。',
    missingHint: '安裝擴充功能後，請重新整理此頁。原有 TOTP 帳號仍保留在網站中。',
    open: '管理通行密鑰',
    recheck: '重新偵測',
    opened: '擴充功能管理頁已開啟，請在該分頁繼續。',
    failed: '無法開啟擴充功能。請重新整理此頁，或點擊瀏覽器中的擴充功能圖示。',
    chrome: '安裝到 Chrome',
    edge: '安裝到 Edge',
    storeHint: '將在新分頁開啟商店。請核對權限，並在瀏覽器中確認安裝。',
    notPublished: '尚未上架擴充功能商店。現在可以按下方步驟試用開發版。',
    developer: '安裝開發版',
    developerIntro: '先在你的電腦上從專案原始碼建置擴充功能。開發人員模式僅用於商店上架前的試用。',
    source: '查看原始碼與建置說明',
    steps: [
      '使用下方指令建置擴充功能。',
      '開啟瀏覽器的擴充功能頁面，啟用「開發人員模式」，選擇「載入未封裝項目」。',
      '選擇 extensions/passkeys/dist 資料夾，然後重新整理此頁和需要使用通行密鑰的網站。'
    ],
    extensionsPage: '擴充功能頁面（複製到網址列開啟）',
    instructions: '開始使用通行密鑰',
    flows: [
      {
        title: '為網站新增通行密鑰',
        text: '先登入目標網站，在帳號安全設定中選擇「新增通行密鑰」。核對擴充功能顯示的網域和帳號，解鎖密鑰庫並確認保存。目標網站接受後，才算註冊完成。'
      },
      {
        title: '使用已保存的通行密鑰登入',
        text: '在目標網站選擇通行密鑰登入，解鎖擴充功能、選擇帳號並確認。如果憑證保存在其他地方，選擇「使用系統或其他驗證器」。'
      },
      {
        title: '把現有通行密鑰匯入',
        text: '在擴充功能中選擇匯入，還原本擴充功能的加密備份，或匯入支援的 Bitwarden JSON。如果原管理器無法匯出，可回到原網站新增一把通行密鑰，保存到這裡。'
      },
      {
        title: '把通行密鑰匯出',
        text: '在擴充功能中選取帳號，用獨立備份密碼匯出加密檔案，在另一份擴充功能中還原。也可匯出 Bitwarden 格式，但檔案含明文私鑰，與實際 Bitwarden 用戶端的相容性仍待驗證。'
      }
    ],
    storage: '通行密鑰保存在哪裡',
    privacy:
      '擴充功能在本機加密保存私鑰和帳號資訊。此頁面只能偵測版本、開啟管理頁，無法讀取密鑰庫。沒有雲端同步或密碼復原，解除安裝前請先保留加密備份。',
    limits: '預覽版範圍',
    limitation:
      '擴充功能介面目前為簡體中文。目前支援常見的 ES256 通行密鑰；PRF、條件式自動填入等功能交給瀏覽器的其他驗證器處理。廣泛網站相容性驗證和獨立安全審查尚未完成。',
    migrationNote: '跨裝置登入的 QR 碼不是通行密鑰匯出碼。刪除本機副本，也不會撤銷網站上的憑證。',
    protocol: '安裝需要你確認',
    protocolText:
      '網頁無法靜默新增此擴充功能。商店上架後，安裝按鈕會帶你前往官方商店，由你確認安裝。'
  }
}
