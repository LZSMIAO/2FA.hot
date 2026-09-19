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
    'Manage your account list here. Unlock and confirm sensitive operations in the extension window.',
  missingHint:
    'Install the extension, then refresh this page. Your existing TOTP accounts stay in the website.',
  manager: {
    unlock: 'Show my passkeys',
    locked: 'View your passkeys here',
    lockedHint: 'Unlock and approve in the extension window. Your account list will appear here.',
    search: 'Search websites or accounts',
    selectAll: 'Select visible accounts',
    empty: 'Add your first passkey',
    emptyHint:
      'Open a website’s security settings and choose Add passkey, then save it in this extension. You can also import a backup.',
    noMatches: 'No matching accounts.',
    unnamed: 'Unnamed account',
    count: 'passkeys',
    selected: 'selected',
    import: 'Import',
    export: 'Export selected',
    remove: 'Delete selected',
    lock: 'Hide list',
    refresh: 'Refresh list',
    pending: 'Confirm in the extension window. This list updates when you finish.',
    cancel: 'Cancel',
    cancelled: 'Operation cancelled.',
    completed: 'List updated.',
    failed: 'Could not complete the request. Close any earlier confirmation window and try again.',
    privacy:
      'Your password, private keys and backup files stay in the extension. The list is cleared when you close this dialog or after 5 minutes.',
    update:
      'Update the extension to manage passkeys here. Replace files in the original folder, reload the extension, then refresh this page. Do not uninstall your vault.',
    updateButton: 'Download extension update',
    lastUsed: 'Last used',
    neverUsed: 'Not used yet'
  },
  open: 'Manage passkeys',
  recheck: 'Check again',
  opened: 'The extension manager is open. Continue in its tab.',
  failed:
    'Could not open the extension. Refresh this page or use the extension icon in your browser.',
  chrome: 'Install for Chrome',
  edge: 'Install for Edge',
  storeHint:
    'The store opens in a new tab. Review the permissions and confirm installation in your browser.',
  notPublished:
    'Preview version · Chrome / Edge on desktop. Download the ZIP, then follow these steps to install.',
  download: 'Download extension',
  copyAddress: 'Copy address',
  copiedAddress: 'Address copied',
  addressAlternative: 'Or open it using the address',
  addressHelp:
    'Browsers block websites from opening this settings page directly. Copy the address and paste it into the address bar.',
  developer: 'Install in 3 steps',
  developerIntro: 'The download is ready to use. No coding or build tools needed.',
  source: 'Source code (for developers)',
  steps: [
    'Download the ZIP and extract it to a folder you will keep on your computer.',
    'Open the browser’s top-right menu (⋮ or ⋯) → Extensions → Manage extensions, then turn on Developer mode.',
    'Click Load unpacked and select the extracted folder containing manifest.json. Then refresh this page. Keep the folder after installation.'
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
    'The extension encrypts private keys and account metadata locally. After approval in the extension, this page displays account metadata in memory for up to 5 minutes. Passwords, private keys and backup files are never sent to this page. There is no cloud sync or password recovery. Keep an encrypted backup before uninstalling.',
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
    installedHint: '在这里管理账号列表，解锁和敏感操作在扩展小窗口中确认。',
    missingHint: '安装扩展后，请刷新此页。原有 TOTP 账号仍保留在网站中。',
    manager: {
      unlock: '查看我的通行密钥',
      locked: '在这里管理通行密钥',
      lockedHint: '在扩展小窗口中解锁并确认，账号列表就会显示在这里。',
      search: '搜索网站或账号',
      selectAll: '选择当前列表',
      empty: '添加第一把通行密钥',
      emptyHint: '前往目标网站的安全设置，选择“添加通行密钥”，再保存到本扩展。也可以导入已有备份。',
      noMatches: '没有匹配的网站或账号。',
      unnamed: '未命名账号',
      count: '条通行密钥',
      selected: '条已选',
      import: '导入',
      export: '导出所选',
      remove: '删除所选',
      lock: '隐藏列表',
      refresh: '刷新列表',
      pending: '请在扩展小窗口中确认，完成后这里会自动更新。',
      cancel: '取消',
      cancelled: '已取消操作。',
      completed: '列表已更新。',
      failed: '未能完成请求。请先关闭之前的确认窗口，再重试。',
      privacy: '主口令、私钥和备份文件留在扩展中。关闭此弹窗或 5 分钟后，页面会清除账号列表。',
      update:
        '更新扩展后即可在这里管理。请覆盖原文件夹中的扩展文件，重新加载扩展并刷新网页；不要卸载密钥库。',
      updateButton: '下载扩展更新',
      lastUsed: '最近使用',
      neverUsed: '尚未使用'
    },
    open: '管理通行密钥',
    recheck: '重新检测',
    opened: '扩展管理页已打开，请在该标签页继续。',
    failed: '无法打开扩展。请刷新此页，或点击浏览器中的扩展图标。',
    chrome: '安装到 Chrome',
    edge: '安装到 Edge',
    storeHint: '将在新标签页打开商店。请核对权限，并在浏览器中确认安装。',
    notPublished: '预览版 · 适用于电脑版 Chrome / Edge。下载后，按下面 3 步安装。',
    download: '下载扩展',
    copyAddress: '复制地址',
    copiedAddress: '地址已复制',
    addressAlternative: '找不到菜单？用地址打开',
    addressHelp: '浏览器不允许网页直接打开这个设置页。复制地址后，粘贴到浏览器地址栏即可。',
    developer: '3 步完成安装',
    developerIntro: '已为你打包好，不需要编程或运行命令。',
    source: '扩展源码（供开发者使用）',
    steps: [
      '点击“下载扩展”，把下载的 ZIP 解压到电脑上一个固定文件夹。',
      '点击浏览器右上角 ⋮ 或 ⋯ → 扩展 → 管理扩展，再开启“开发者模式”。',
      '点击“加载已解压的扩展程序”（Edge 中为“加载解压缩的扩展”），选择刚解压、包含 manifest.json 的文件夹。完成后刷新此页，保留该文件夹不要删除。'
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
      '扩展在本机加密保存私钥和账号信息。在扩展中确认后，此页面可临时显示账号信息，最多保留 5 分钟；主口令、私钥和备份文件不会传给网页。没有云同步或口令找回，卸载扩展前请先保留加密备份。',
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
    installedHint: '在這裡管理帳號清單，解鎖和敏感操作在擴充功能小視窗中確認。',
    missingHint: '安裝擴充功能後，請重新整理此頁。原有 TOTP 帳號仍保留在網站中。',
    manager: {
      unlock: '查看我的通行密鑰',
      locked: '在這裡管理通行密鑰',
      lockedHint: '在擴充功能小視窗中解鎖並確認，帳號清單就會顯示在這裡。',
      search: '搜尋網站或帳號',
      selectAll: '選取目前清單',
      empty: '新增第一把通行密鑰',
      emptyHint:
        '前往目標網站的安全設定，選擇「新增通行密鑰」，再儲存到本擴充功能。也可以匯入已有備份。',
      noMatches: '沒有符合的網站或帳號。',
      unnamed: '未命名帳號',
      count: '筆通行密鑰',
      selected: '筆已選',
      import: '匯入',
      export: '匯出所選',
      remove: '刪除所選',
      lock: '隱藏清單',
      refresh: '重新整理清單',
      pending: '請在擴充功能小視窗中確認，完成後這裡會自動更新。',
      cancel: '取消',
      cancelled: '已取消操作。',
      completed: '清單已更新。',
      failed: '未能完成請求。請先關閉先前的確認視窗，再重試。',
      privacy: '主密碼、私鑰和備份檔案留在擴充功能中。關閉此彈窗或 5 分鐘後，頁面會清除帳號清單。',
      update:
        '更新擴充功能後即可在這裡管理。請覆蓋原資料夾中的檔案，重新載入擴充功能並重新整理網頁；不要解除安裝密鑰庫。',
      updateButton: '下載擴充功能更新',
      lastUsed: '最近使用',
      neverUsed: '尚未使用'
    },
    open: '管理通行密鑰',
    recheck: '重新偵測',
    opened: '擴充功能管理頁已開啟，請在該分頁繼續。',
    failed: '無法開啟擴充功能。請重新整理此頁，或點擊瀏覽器中的擴充功能圖示。',
    chrome: '安裝到 Chrome',
    edge: '安裝到 Edge',
    storeHint: '將在新分頁開啟商店。請核對權限，並在瀏覽器中確認安裝。',
    notPublished: '預覽版 · 適用於電腦版 Chrome / Edge。下載後，依照下面 3 步安裝。',
    download: '下載擴充功能',
    copyAddress: '複製網址',
    copiedAddress: '網址已複製',
    addressAlternative: '找不到選單？使用網址開啟',
    addressHelp: '瀏覽器不允許網頁直接開啟這個設定頁。複製網址後，貼到瀏覽器網址列即可。',
    developer: '3 步完成安裝',
    developerIntro: '已為你打包好，不需要寫程式或執行指令。',
    source: '擴充功能原始碼（供開發者使用）',
    steps: [
      '點擊「下載擴充功能」，將下載的 ZIP 解壓縮到電腦上的固定資料夾。',
      '點擊瀏覽器右上角 ⋮ 或 ⋯ → 擴充功能 → 管理擴充功能，再啟用「開發人員模式」。',
      '點擊「載入未封裝項目」，選擇剛解壓縮、包含 manifest.json 的資料夾。完成後重新整理此頁，請保留該資料夾不要刪除。'
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
      '擴充功能在本機加密保存私鑰和帳號資訊。在擴充功能中確認後，此頁面可暫時顯示帳號資訊，最多保留 5 分鐘；主密碼、私鑰和備份檔案不會傳給網頁。沒有雲端同步或密碼復原，解除安裝前請先保留加密備份。',
    limits: '預覽版範圍',
    limitation:
      '擴充功能介面目前為簡體中文。目前支援常見的 ES256 通行密鑰；PRF、條件式自動填入等功能交給瀏覽器的其他驗證器處理。廣泛網站相容性驗證和獨立安全審查尚未完成。',
    migrationNote: '跨裝置登入的 QR 碼不是通行密鑰匯出碼。刪除本機副本，也不會撤銷網站上的憑證。',
    protocol: '安裝需要你確認',
    protocolText:
      '網頁無法靜默新增此擴充功能。商店上架後，安裝按鈕會帶你前往官方商店，由你確認安裝。'
  }
}
