import { guideMetadata } from './guide-meta.ts'
import { focusedGuides } from './focused-guides.ts'
export interface GuideSection {
  id: string
  title: string
  paragraphs: string[]
  steps?: string[]
}
export interface Guide {
  slug: string
  title: string
  description: string
  sections: GuideSection[]
  sources: { title: string; url: string }[]
}
export const guides: Record<'en' | 'zh-CN', Guide[]> = {
  en: [
    {
      ...guideMetadata['en']['what-is-2fa'],
      sections: [
        {
          id: 'meaning',
          title: 'What two-factor authentication means',
          paragraphs: [
            'Two-factor authentication (2FA) combines two different kinds of proof when you sign in. A password is something you know. An authenticator holding a setup secret can provide a possession factor. The service checks both before letting you into your account.',
            '2FA is a category, not a single code format. A text message, an authenticator code and a hardware security key can all appear in a sign-in flow, but they work differently. This tool generates time-based one-time passwords (TOTP) from a secret you already have. It cannot receive SMS messages or approve push notifications.'
          ]
        },
        {
          id: 'secret-and-code',
          title: 'A setup secret is different from a verification code',
          paragraphs: [
            'When a service offers authenticator setup, it usually shows a QR code and sometimes a text setup key. That key is the long-lived secret. A typical Base32 representation uses letters A–Z and numbers 2–7. An otpauth URI packages the secret with settings such as the account label and code length.',
            'The short code you type at sign-in is an output calculated from that secret and the current time. Copying a six-digit code into the secret field does not recreate the account. If you lost the setup secret and access to your authenticator, use the original service’s recovery process or saved recovery codes.'
          ]
        },
        {
          id: 'using-totp',
          title: 'Generate a TOTP code from an existing secret',
          paragraphs: [
            'For the same time interval, matching secrets and matching TOTP settings produce matching codes. In 2fa.hot, the default settings are SHA-1, six digits and a 30-second period. Some services use different settings; retain the parameters in an imported configuration.'
          ],
          steps: [
            'Open the generator and paste your existing setup key or otpauth URI, or import its QR image.',
            'Check the algorithm, digits and period against the original service when they differ from the defaults.',
            'Copy the current code into the service asking for verification. If the countdown is nearly finished, wait for the next code.'
          ]
        },
        {
          id: 'limits',
          title: 'Choose where you keep your second factor',
          paragraphs: [
            'Use a trusted device and review the site before entering a real setup secret. Homepage generation and QR decoding happen in the browser. Optional history stays in that browser, and can be protected with a password. A direct /2fa/SECRET link is different: its path reaches the hosting service and can remain in browser history.',
            'An online generator does not make the device or the account immune to phishing. Someone who obtains your secret can generate codes too. For a compromised secret, replace the authenticator setup at the original service. Keep recovery options available and consider a separate authenticator or a phishing-resistant security key where supported.'
          ]
        }
      ]
    },
    {
      ...guideMetadata['en']['totp-code-not-working'],
      sections: [
        {
          id: 'clock',
          title: 'Start with the device clock',
          paragraphs: [
            'If the generator displays a code but the service rejects it, first check the time on the device running the generator. TOTP uses the current time, so a clock that is ahead or behind can produce a different code from the one the server expects.',
            'Enable automatic date and time in your operating system, let it synchronize, then wait for a fresh code. Changing the displayed time zone alone is not a fix if the underlying clock is wrong. Modern Google Authenticator also uses the operating system’s time; its older in-app time-correction setting is no longer available in version 7.0 and later.'
          ]
        },
        {
          id: 'expiry',
          title: 'Use a fresh code for the correct account',
          paragraphs: [
            'A code copied near the end of its countdown may expire before you submit it. Wait for the next interval, copy once and submit promptly. Do not keep retrying an old clipboard value. The original service decides how much clock difference it tolerates and may also limit repeated attempts.',
            'Check the account you are signing into. Two accounts on the same service normally have different secrets. An account label is only a reminder; changing that label does not change which account the secret belongs to.'
          ]
        },
        {
          id: 'settings',
          title: 'Compare the secret and configuration',
          paragraphs: [
            '2fa.hot supports TOTP with SHA-1, SHA-256 or SHA-512, six or eight digits and the configured period. The defaults are SHA-1, six digits and 30 seconds. An imported otpauth URI can carry different values. Keep those values instead of forcing every account to the defaults.',
            'A missing character in the secret, a newly reset authenticator enrollment, or a different code type can explain repeated failures. HOTP counter-based codes are not generated here. A valid-looking result is not proof that the original service will accept it.'
          ],
          steps: [
            'Compare the saved setup key with the original enrollment details on your trusted device.',
            'Check whether the account’s two-factor setup has been reset since that key was saved.',
            'Confirm that the account uses TOTP and that algorithm, digits and period match.',
            'Retry once with a fresh code after correcting the cause; respect the service’s retry limits.'
          ]
        },
        {
          id: 'recovery',
          title: 'When to use account recovery',
          paragraphs: [
            'If you no longer have the current secret or an enrolled authenticator, generating more codes from an old key will not restore access. Try a saved recovery code or another enrolled sign-in method, or contact the original service through its official recovery page.',
            '2fa.hot does not manage your account at that service, cannot remove its second-factor requirement, and cannot recover a lost setup key from a temporary code. When asking for help, describe the error and settings without posting your secret, QR image, direct link or recovery codes.'
          ]
        }
      ]
    },
    {
      ...guideMetadata['en']['google-authenticator-import'],
      sections: [
        {
          id: 'before',
          title: 'What you need before importing',
          paragraphs: [
            'You need access to the Google Authenticator entries you want to export. A screenshot of a changing six-digit code is not an export QR code. Export images contain account setup secrets, so use a device you trust and keep those images out of shared folders and public support requests.',
            'Importing reads the configuration you provide. It does not sign into Google, connect to your Google account or recover entries that are no longer available to export. You do not need an account on 2fa.hot.'
          ]
        },
        {
          id: 'transfer',
          title: 'Export, import and review the accounts',
          paragraphs: [
            'Google Authenticator can transfer selected entries using export QR codes. The exact menu placement can vary between app versions. In 2fa.hot, choose the Google Authenticator import option for these migration exports; a normal service enrollment QR can use the standard QR import flow.'
          ],
          steps: [
            'In Google Authenticator, open Transfer accounts, then Export accounts, and complete the app’s device verification if requested.',
            'Select the accounts to export and show the QR code. If there are multiple parts, keep every part available.',
            'On the generator, open Import QR, then Google Authenticator. Scan the export or select its saved image.',
            'Import all parts from the same export. Review the decoded accounts and select the entries you need before applying the import.',
            'Check one selected TOTP entry against the original authenticator during the same time interval.'
          ]
        },
        {
          id: 'multiple-parts',
          title: 'Multiple QR codes and unsupported entries',
          paragraphs: [
            'A large export can span several QR codes. Import the complete set from that export rather than mixing screenshots from separate exports. The importer tracks parts and detects repeated scans. If a part is missing, go back to the original export and capture that part clearly.',
            'Google Authenticator migration data can include entries whose format is not supported for code generation here. 2fa.hot generates TOTP with SHA-1, SHA-256 or SHA-512 and six or eight digits. It can decode and export HOTP or MD5 migration entries, but does not generate their codes. Review the result instead of assuming every imported entry is usable.'
          ]
        },
        {
          id: 'storage',
          title: 'What happens after import',
          paragraphs: [
            'QR decoding takes place in your browser. Importing does not automatically enable local history. If you want the entries available later, explicitly enable history and choose whether to protect it with a password. Browser storage is local to this browser and is not automatic device synchronization.',
            'Keep the original authenticator available until you have verified your entries and recovery options. Clearing browser data can remove locally saved records. Password-protected history requires its password; a lost password cannot be recovered by the site. A direct access link exposes the secret in its URL, so it should not be used as a public account reference.'
          ]
        }
      ]
    },
    ...focusedGuides.en
  ],
  'zh-CN': [
    {
      ...guideMetadata['zh-CN']['what-is-2fa'],
      sections: [
        {
          id: 'meaning',
          title: '双重验证验证的是什么',
          paragraphs: [
            '双重验证（2FA）是在登录时结合两类不同的证明。密码属于“你知道的内容”，保存了配置密钥的验证器可以提供“你持有的东西”这一因素。原服务会检查这些证明，决定是否允许登录。',
            '2FA 是一类验证方式，并不代表某一种验证码格式。短信验证码、验证器动态码和硬件安全密钥的工作方式不同。2fa.hot 根据你已有的密钥计算基于时间的一次性密码（TOTP），不能接收短信或批准手机推送。'
          ]
        },
        {
          id: 'secret-and-code',
          title: '密钥与六位验证码有什么区别',
          paragraphs: [
            '服务在设置验证器时通常会显示二维码，有时也提供文字形式的设置密钥。密钥是长期使用的配置数据，常见的 Base32 写法由 A–Z 和 2–7 组成。otpauth 配置链接会把密钥、账号标签和验证码位数等参数放在一起。',
            '登录时输入的短验证码是计算结果，会随时间变化。把六位验证码粘贴到密钥输入框，不能还原账号配置。如果密钥和验证器都已丢失，需要使用原服务的恢复流程或以前保存的恢复码。'
          ]
        },
        {
          id: 'using-totp',
          title: '如何用已有密钥获取 TOTP 验证码',
          paragraphs: [
            '在同一时间段内，相同的密钥和 TOTP 参数会得到相同的验证码。本站默认使用 SHA-1、6 位、30 秒；如果原服务使用其他参数，应保留导入配置中的设置。'
          ],
          steps: [
            '打开取码工具，粘贴已有密钥或 otpauth 配置链接，也可以导入二维码图片。',
            '如果原服务使用非默认参数，核对算法、位数和更新周期。',
            '复制当前验证码，在要求验证的原服务中提交。倒计时接近结束时，可以等待下一组再复制。'
          ]
        },
        {
          id: 'limits',
          title: '如何保管你的第二重验证',
          paragraphs: [
            '输入真实密钥前，请确认设备和网站可信。首页取码与二维码解码在浏览器中完成；可选历史保存在当前浏览器，可设置密码保护。通过 /2fa/密钥 链接访问则不同：路径会到达托管服务，也可能保留在浏览器历史中。',
            '在线取码不能消除钓鱼风险，也不能保护已被控制的设备。拿到密钥的人同样能计算验证码。密钥泄漏后，应到原服务重新设置验证器。保留可用的账号恢复方式，并在服务支持时考虑独立验证器或能抵御钓鱼的安全密钥。'
          ]
        }
      ]
    },
    {
      ...guideMetadata['zh-CN']['totp-code-not-working'],
      sections: [
        {
          id: 'clock',
          title: '先检查设备时间',
          paragraphs: [
            '如果工具能生成验证码，但原服务提示错误，先检查运行工具的设备时间。TOTP 使用当前时间参与计算，时钟过快或过慢都可能让客户端与服务端得到不同结果。',
            '在操作系统中开启自动设置日期和时间，等待同步后使用下一组验证码。只修改显示时区，无法修正底层时钟偏差。Google Authenticator 7.0 及之后的版本也使用操作系统时间，旧版应用内的时间校正设置已不再提供。'
          ]
        },
        {
          id: 'expiry',
          title: '使用正确账号的最新验证码',
          paragraphs: [
            '临近倒计时结束时复制的验证码，可能在提交前已经过期。等待下一周期，重新复制并及时提交，不要反复粘贴剪贴板里的旧值。接受多大的时钟偏差、允许重试多少次，由原服务决定。',
            '确认正在登录的是对应账号。同一服务的不同账号通常使用不同密钥。标签只用于帮助识别，修改标签不会改变密钥所属的账号。'
          ]
        },
        {
          id: 'settings',
          title: '核对密钥和验证参数',
          paragraphs: [
            '本站支持 SHA-1、SHA-256、SHA-512，6 位或 8 位验证码，以及配置中指定的周期。默认值是 SHA-1、6 位、30 秒。otpauth 链接可能包含非默认设置，不要把所有导入账号都强制改成默认参数。',
            '密钥缺少字符、账号重新设置过验证器，或原服务使用其他验证码类型，都可能造成持续失败。本站不生成 HOTP 计数型验证码。能显示验证码，不代表原服务一定会接受。'
          ],
          steps: [
            '在可信设备上核对保存的密钥与原始配置。',
            '确认保存密钥之后，是否重新设置过账号的双重验证。',
            '确认验证码类型为 TOTP，并核对算法、位数和周期。',
            '修正问题后用新验证码重试，遵守原服务的尝试次数限制。'
          ]
        },
        {
          id: 'recovery',
          title: '什么时候应使用账号恢复',
          paragraphs: [
            '如果当前密钥与已绑定验证器都不可用，继续用旧密钥生成验证码无法恢复登录。请使用已保存的恢复码、其他已绑定的登录方式，或前往原服务的官方账号恢复页面。',
            '2fa.hot 不管理你在其他网站上的账号，不能取消其双重验证要求，也不能从临时验证码找回密钥。反馈问题时可描述错误和参数，但不要公开密钥、二维码、取码链接或恢复码。'
          ]
        }
      ]
    },
    {
      ...guideMetadata['zh-CN']['google-authenticator-import'],
      sections: [
        {
          id: 'before',
          title: '导入前需要准备什么',
          paragraphs: [
            '你需要能够访问 Google Authenticator 中要导出的账号。六位动态验证码的截图不是导出二维码。导出图片包含账号密钥，请在可信设备上处理，避免放入共享文件夹或公开反馈中。',
            '导入只读取你提供的配置，不会登录 Google、连接 Google 账号，也无法找回已无法导出的记录。使用 2fa.hot 无需注册网站账户。'
          ]
        },
        {
          id: 'transfer',
          title: '导出、导入并核对账号',
          paragraphs: [
            'Google Authenticator 支持把选中的账号转换为迁移二维码，不同版本的菜单位置可能不同。处理这种导出时，请使用本站的 Google Authenticator 导入选项；原服务提供的普通设置二维码则可使用常规二维码导入。'
          ],
          steps: [
            '在 Google Authenticator 中打开“转移账号 → 导出账号”，按提示完成设备验证。',
            '选择需要导出的账号并显示二维码。如有多张，请保留同一导出的所有部分。',
            '在本站打开“导入二维码 → Google Authenticator”，扫描二维码或选择已保存的图片。',
            '导入完整的一组二维码，核对解析出的账号，并选择要使用的记录。',
            '在同一时间周期内，选一条 TOTP 记录与原验证器显示的验证码核对。'
          ]
        },
        {
          id: 'multiple-parts',
          title: '多张二维码与不支持的账号',
          paragraphs: [
            '账号较多时，一次导出可能拆成多张二维码。请导入同一次导出的完整集合，不要混用不同次导出的截图。导入器会记录已收到的部分并识别重复扫描；缺少部分时，回到原导出补齐清晰的二维码。',
            '迁移数据可能包含本站无法生成验证码的类型。本站可生成 SHA-1、SHA-256、SHA-512，6 位或 8 位的 TOTP 验证码；HOTP 或 MD5 迁移项可以解析与导出，但不能在这里取码。请核对导入结果，不要假设每条解析成功的记录都能生成验证码。'
          ]
        },
        {
          id: 'storage',
          title: '导入后如何保存',
          paragraphs: [
            '二维码解码在浏览器中完成，导入不会自动开启本地历史。需要下次继续使用时，请主动开启历史，并选择是否设置密码保护。记录只保存在当前浏览器，不会自动同步到其他设备。',
            '在确认账号可用、恢复方式完备之前，请保留原验证器。清理浏览器数据可能删除本地记录；密码保护的历史需要原密码，网站无法找回遗失的密码。取码链接在 URL 中包含完整密钥，不适合作为公开的账号引用。'
          ]
        }
      ]
    },
    ...focusedGuides['zh-CN']
  ]
}
