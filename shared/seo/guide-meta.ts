// Metadata stays lightweight so the tool homepage does not download article bodies.
export const guideMetadata = {
  en: {
    'what-is-2fa': {
      slug: 'what-is-2fa',
      title: 'What is 2FA? How TOTP authenticator codes work',
      description:
        'Understand two-factor authentication, the difference between a secret and a code, and how to use a TOTP generator with your existing setup key.',
      sources: [
        {
          title: 'RFC 6238: the TOTP algorithm',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: 'Google: Get verification codes with Google Authenticator',
          url: 'https://support.google.com/accounts/answer/1066447?hl=en'
        }
      ]
    },
    'totp-code-not-working': {
      slug: 'totp-code-not-working',
      title: '2FA code not working? Troubleshoot invalid TOTP codes',
      description:
        'Check device time, expired codes, the setup secret and TOTP parameters when a service rejects your authenticator code.',
      sources: [
        {
          title: 'RFC 6238: validation and clock synchronization',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: 'Google Authenticator: troubleshooting and device time',
          url: 'https://support.google.com/accounts/answer/1066447?hl=en'
        }
      ]
    },
    'google-authenticator-import': {
      slug: 'google-authenticator-import',
      title: 'Import Google Authenticator QR exports into 2fa.hot',
      description:
        'Import Google Authenticator export QR codes, handle multiple QR parts, review accounts and understand what is stored in your browser.',
      sources: [
        {
          title: 'Google: Transfer your Authenticator codes',
          url: 'https://support.google.com/accounts/answer/1066447?hl=en'
        },
        {
          title: '2fa.hot project information and supported features',
          url: 'https://github.com/LZSMIAO/2FA.hot'
        }
      ]
    }
  },
  'zh-CN': {
    'what-is-2fa': {
      slug: 'what-is-2fa',
      title: '2FA 是什么？TOTP 验证码与双重验证入门',
      description:
        '了解 2FA 双重验证、TOTP 动态验证码、密钥和验证码的区别，以及如何用已有密钥在线取码。',
      sources: [
        {
          title: 'RFC 6238：TOTP 算法说明',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: 'Google：通过 Google 身份验证器获取验证码',
          url: 'https://support.google.com/accounts/answer/1066447?hl=zh-Hans'
        }
      ]
    },
    'totp-code-not-working': {
      slug: 'totp-code-not-working',
      title: '2FA 验证码不正确？TOTP 无效问题排查',
      description:
        '从设备时间、验证码过期、账号密钥和算法参数排查 2FA 验证失败，并了解何时需要使用账号恢复流程。',
      sources: [
        {
          title: 'RFC 6238：验证与时钟同步',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: 'Google 身份验证器：故障排查与设备时间',
          url: 'https://support.google.com/accounts/answer/1066447?hl=zh-Hans'
        }
      ]
    },
    'google-authenticator-import': {
      slug: 'google-authenticator-import',
      title: '如何导入 Google Authenticator 导出二维码',
      description:
        '将 Google Authenticator 导出二维码导入 2fa.hot，处理多张二维码、选择账号，并了解导入后的本地保存方式。',
      sources: [
        {
          title: 'Google：转移 Google 身份验证器验证码',
          url: 'https://support.google.com/accounts/answer/1066447?hl=zh-Hans'
        },
        {
          title: '2fa.hot 项目介绍与支持功能',
          url: 'https://github.com/LZSMIAO/2FA.hot'
        }
      ]
    }
  }
}
