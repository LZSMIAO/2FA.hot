import type { Guide } from './guides.ts'

// English and Simplified Chinese bodies of the focused guides. Traditional
// Chinese and Japanese live in i18n/content; no other language publishes them.
export const focusedGuides: Record<'en' | 'zh-CN', Guide[]> = {
  en: [
    {
      slug: 'google-authenticator-web',
      title: 'Google Authenticator on a computer',
      description:
        'Google Authenticator has no official web or PC version. Learn how to get the same codes on a computer from your setup key or export QR, and the trade-offs.',
      sections: [
        {
          id: 'no-web-version',
          title: 'Is there a Google Authenticator web or PC version?',
          paragraphs: [
            'Google’s help center describes Google Authenticator as an app for Android and for iPhone and iPad. At the time of writing, Google offers no official web version and no Windows or Mac app, and its help pages do not describe a website where you can sign in and view your codes. If you find a browser extension or desktop program with a similar name, check who publishes it; Google’s help center does not point to one.',
            'You can still get the same codes on a computer. An authenticator code is calculated from a setup secret and the current time using the standard TOTP method, so any TOTP generator holding the same secret and settings shows the same code in the same 30-second window. The real questions are how to get the secret onto the computer, and whether doing so suits your security needs.'
          ]
        },
        {
          id: 'account-sync',
          title: 'Google Account sync is not a web viewer',
          paragraphs: [
            'Current versions of Google Authenticator can save your codes to your Google Account. When you sign in to the app on another phone or tablet, the codes are synced to that device. This helps when you replace a phone, but it delivers codes to the Authenticator app only. Google’s help does not describe a way to open synced codes in a browser or on a computer.',
            'Sync is optional. You can use the app without an account, and the codes then stay on that device. With sync turned on, deleting a code on one device also removes it from every synced device. Treat sync as protection against losing a phone, not as a separate copy you can view somewhere else.'
          ]
        },
        {
          id: 'setup-key',
          title: 'Option 1: use the setup key you saved',
          paragraphs: [
            'If you kept the text setup key, an otpauth:// link or the QR image from when you turned on two-factor authentication, you can use it directly. Services often reveal the text key through an option to enter it manually instead of scanning. Nothing changes on your phone, and both devices will show matching codes.'
          ],
          steps: [
            'Open 2fa.hot on your computer and paste the Base32 setup key or otpauth:// link, or import the saved QR image.',
            'If the service uses settings other than SHA-1, six digits and 30 seconds, check that the imported values match.',
            'Compare the code with Google Authenticator on your phone in the same interval, then copy it into the sign-in page.'
          ]
        },
        {
          id: 'export-qr',
          title: 'Option 2: import Google Authenticator export QR codes',
          paragraphs: [
            'If you did not keep the original keys, Google Authenticator can export selected accounts as transfer QR codes, and 2fa.hot can read them on a computer. Menu names vary slightly between app versions and languages; the steps below follow Google’s current help page.',
            'The export contains your setup secrets. Scanning the phone screen with the computer’s camera avoids leaving an image behind. If you use a screenshot, keep it out of cloud folders and chats, and delete it after importing. Decoding happens in your browser and images are not uploaded. HOTP and MD5 entries can be decoded and exported, but 2fa.hot does not generate their codes.'
          ],
          steps: [
            'In Google Authenticator on your phone, open the menu, choose Transfer accounts, then Export accounts, and unlock the phone when asked.',
            'Select the accounts you need on the computer and tap Next. Several accounts may produce more than one QR code.',
            'On 2fa.hot, open Import QR code and choose the Google Authenticator option. Scan the phone screen with the camera, or choose a saved image.',
            'Import every part of the same export, select the accounts you want, then compare one code with the phone.'
          ]
        },
        {
          id: 'computer-risks',
          title: 'Trade-offs of keeping codes on a computer',
          paragraphs: [
            'Two-factor authentication works best when the second factor is separate from the place where you type your password. If one computer holds both your saved passwords and your authenticator secrets, anyone who takes over that computer may get both. Use a personal computer you trust and keep it updated, and avoid entering real secrets on shared or public machines.',
            '2fa.hot calculates codes in your browser and does not send secrets to the server. Local history is off by default. If you turn it on, set a password, and remember that it stays in that browser only and disappears when browser data is cleared. A fragment link such as /2fa#SECRET keeps the secret out of the page request, but the full link can remain in browser history, so do not bookmark or share it on a shared device.'
          ]
        },
        {
          id: 'keep-phone',
          title: 'Keep the phone app as your backup',
          paragraphs: [
            'Do not remove accounts from Google Authenticator after importing them on a computer. Browser data can be cleared, computers get replaced, and a forgotten local history password cannot be recovered. Keeping the phone app gives you a second working copy, and Google Account sync, if you use it, protects that copy when you change phones.',
            'For your Google Account itself, Google recommends enrolling more than one 2-Step Verification method so that you are not locked out. Keep the backup or recovery codes for other important services in a safe place too. 2fa.hot is not affiliated with Google. It does not sign in to your Google Account, cannot read synced codes and cannot recover a lost setup key.'
          ]
        }
      ],
      sources: [
        {
          title: 'Google: Get verification codes with Google Authenticator',
          url: 'https://support.google.com/accounts/answer/1066447?hl=en'
        },
        {
          title: 'RFC 6238: the TOTP algorithm',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: '2fa.hot project information and supported features',
          url: 'https://github.com/LZSMIAO/2FA.hot'
        }
      ]
    },
    {
      slug: 'find-2fa-secret-key',
      title: 'Where to find your 2FA secret key',
      description:
        'What a 2FA secret key looks like, where services show it during authenticator setup, how to get a new one if you did not save it, and how to store it safely.',
      sections: [
        {
          id: 'what-it-is',
          title: 'What a 2FA secret key is',
          paragraphs: [
            'A 2FA secret key, also called a setup key or authenticator key, is the shared secret a service creates when you turn on authenticator-based two-factor authentication. The service keeps one copy and your authenticator keeps the other. Each six-digit code is calculated from that key and the current time, as RFC 6238 describes.',
            'Most services show the key as Base32 text. Base32 uses only the letters A to Z and the digits 2 to 7, so a Base32 key never contains 0, 1, 8 or 9. Keys are often 16 or 32 characters long and are frequently shown in groups of four, such as JBSW Y3DP EHPK 3PXP.',
            'The spaces are only there to make the key easier to read, and authenticator apps generally treat lower case the same as upper case, so jbsw y3dp ehpk 3pxp is the same key. Some services also add = signs at the end as padding. None of this changes the key, but a missing or extra letter does.'
          ]
        },
        {
          id: 'where-to-find',
          title: 'Where services show the key',
          paragraphs: [
            'The key appears during authenticator setup, next to the QR code. Look for a link or button labelled Can’t scan it, Enter key manually, Setup key or Show secret key. GitHub, for example, calls it the setup key and describes it as the TOTP secret you can type into your app instead of scanning.',
            'The QR code holds the same key. It encodes an otpauth:// link whose secret parameter is the key, together with the account name and code settings, so scanning the QR code and typing the key set up the same account. If you save the setup QR code as an image, that image is as sensitive as the key.',
            'After setup is complete, many services never show the key again. It is not tucked away somewhere in the account settings, and it cannot be worked out from a six-digit code. Your authenticator app stores it, but many apps do not display it; some can export entries, such as the export QR codes in Google Authenticator.'
          ]
        },
        {
          id: 'get-it-again',
          title: 'How to get the key if you did not save it',
          paragraphs: [
            'If you no longer have the key, the dependable way to obtain one is to set up the authenticator again. The service then creates a new key and shows it with a new QR code. The old key usually stops working once the new setup is saved, so every device that used it needs the new key.',
            'Some services offer a change or reconfigure option for the authenticator app, which keeps two-factor authentication on the whole time. GitHub, for instance, notes that reconfiguring without disabling 2FA keeps your recovery codes. If the only choice is to turn authenticator 2FA off and on again, do it on a trusted device and turn it back on straight away.'
          ],
          steps: [
            'Sign in to the service and open its security or two-factor authentication settings.',
            'Choose the option to change or reconfigure the authenticator app. Turn 2FA off and on again only if no such option exists.',
            'When the QR code appears, select the manual entry option and copy the key shown there.',
            'Add the key to your authenticator, save a copy safely, and enter the current code to confirm the setup.',
            'Remove the old entry from your authenticator only after the service has accepted the new one.'
          ]
        },
        {
          id: 'codes-compared',
          title: 'Secret key, verification codes and recovery codes',
          paragraphs: [
            'The secret key is long-lived: it stays the same until you set up the authenticator again. The six-digit verification code is a short-lived result calculated from it, normally valid for about 30 seconds. You cannot rebuild the key from codes, and pasting a code where a key is expected will not work.',
            'Backup or recovery codes are a separate list of one-time codes a service gives you for emergencies, for example when you lose your phone. You type one in place of a verification code. They are not a secret key and cannot be added to an authenticator. SMS codes are sent to your phone by the service each time you sign in, so there is no key to save for them.'
          ]
        },
        {
          id: 'safe-storage',
          title: 'Store the key safely and share it with care',
          paragraphs: [
            'Save the key at the moment it is shown. A practical place is the entry for that account in a password manager you trust. An offline copy, such as a printed sheet kept with your recovery codes, also works. Screenshots in a photo library that syncs to many devices are easier to leak than they seem.',
            'Anyone who has the key can generate your codes on their own device for as long as it stays active, and you would not notice. Do not send it to anyone you do not trust, including people who contact you claiming to be support staff. The service already holds its own copy, so genuine support never needs you to send it. If a key has been shared, set up the authenticator again to replace it.',
            'To check a key, you can paste it into 2fa.hot with or without spaces and in either case, or use the full otpauth:// link or its QR image. The code is calculated in your browser and the key is not sent to the server. Local history is off by default; if you turn it on, it stays in that browser and can be protected with a password.'
          ]
        }
      ],
      sources: [
        {
          title: 'GitHub Docs: Configuring two-factor authentication',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication'
        },
        {
          title: 'GitHub Docs: Changing your two-factor authentication method',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/changing-two-factor-authentication-delivery-methods-for-your-mobile-device'
        },
        {
          title: 'RFC 4648: the Base32 alphabet',
          url: 'https://www.rfc-editor.org/rfc/rfc4648'
        }
      ]
    },
    {
      slug: 'batch-2fa-codes',
      title: 'Get 2FA codes in batches',
      description:
        'Paste up to 100 2FA secrets, spreadsheet rows or mixed text and get every current TOTP code at once in your browser, with safety tips for teams.',
      sections: [
        {
          id: 'when',
          title: 'Who the batch tab is for',
          paragraphs: [
            'If you look after many accounts, such as the stores, ad accounts and social profiles of a cross-border e-commerce team, opening each authenticator entry in turn is slow. The batch tab on 2fa.hot reads a list of secrets you already have and shows every account’s current code on one screen, each with its own countdown.',
            'It takes up to 100 entries and about 100 KB of text at a time. Every row is an ordinary TOTP configuration: SHA-1, SHA-256 or SHA-512, 6 or 8 digits, and the period set in an otpauth:// link. Codes are calculated in your browser, and the secrets are not sent to the 2fa.hot server.'
          ]
        },
        {
          id: 'paste',
          title: 'What you can paste',
          paragraphs: [
            'The simplest input is one Base32 secret per line. You can also paste otpauth:// links; the box shows each one as its bare key, but the account name, issuer and settings are kept. A line written as a name, a Tab character and a secret uses that name as its label. Secrets split into groups of four, the way many sites display them, are read as one key.',
            'Rows copied from Excel or Google Sheets arrive as tab-separated text, including quoted cells with line breaks inside. Smart recognition takes only complete secrets and never joins fragments, so passwords, phone numbers and notes in other columns are normally left out, and a notice says when surrounding text was ignored. Two keys on one line separated by a space are marked as needing correction rather than guessed. Still, glance over the results: a long password made only of letters and the digits 2 to 7 can look like a secret.',
            'You do not need to switch tabs first. Pasting several keys into the single code box, or anywhere on the page, moves them to the batch tab. QR code images can be pasted into the batch box too, up to 20 at a time.'
          ]
        },
        {
          id: 'names',
          title: 'Keep account names next to secrets',
          paragraphs: [
            'A code is only useful when you know which account it belongs to. The most reliable layout is a name column directly left of the secret column, with one account per row. Copied together, each row becomes name, Tab, secret, and the name appears above the key in the results.',
            'Email addresses are handled more carefully. An address beside a key might be the recovery email rather than the login, so 2fa.hot does not pair them automatically. When the pasted text contains addresses, the link icon under the box shows that names still need confirming; open it to match each address with its key yourself. Names from otpauth:// links are kept.'
          ]
        },
        {
          id: 'copy',
          title: 'Check and copy the codes',
          paragraphs: [
            'The Valid and Needs correction counts under the box show how the paste was read. Faulty rows are marked on their own and do not affect the others, and repeated secrets are labeled Duplicate entry. Copy all valid codes puts one line per valid row on the clipboard: name, Tab and code when the row has a name, otherwise the code alone. Secrets are never included, and the confirmation tells you how many rows were skipped.',
            'Ctrl+Z undoes a whole paste and Ctrl+Shift+Z undoes it one row at a time; on a Mac, use Command instead of Ctrl. The checkbox on each row lets you delete a selection, or save only the selected rows once local history is on and unlocked.'
          ],
          steps: [
            'Open 2fa.hot and choose the Batch codes tab, or simply paste several secrets onto the page.',
            'Paste your list or spreadsheet rows into the box.',
            'Fix or delete rows that need correction, and confirm account names if the link icon asks.',
            'Use a row’s copy button for one code, or Copy all valid codes for the whole list.',
            'If a countdown is about to run out, wait for the next code before you submit it.'
          ]
        },
        {
          id: 'links',
          title: 'Batch links and the standalone page',
          paragraphs: [
            'One fragment link can carry several keys, as in /2fa#SECRET1#SECRET2, and commas work as separators too. It opens a standalone page that lists every current code. Non-default settings follow their own key: in /2fa#SECRET1#SECRET2?digits=8, only the second key uses eight digits. The part after # is read inside your browser and is not sent with the page request.',
            'The expand icon in the batch tab opens the same page with a safe link, /2fa#~…, sealed in your browser so the address bar, history and screenshots do not show keys in plain text. The standalone page also shows only the first and last four characters of each key. Anyone holding the complete link can still open it, though. Links carry keys and settings but not account names, so keep your own record of which row is which.'
          ]
        },
        {
          id: 'team',
          title: 'Security for teams',
          paragraphs: [
            'A secret is a long-lived credential. Anyone who holds it, or a full link that contains it, can generate codes until the secret is reset at the original service. Keep secrets and links out of chat groups, shared documents and tickets, where they spread easily and cannot be taken back. Give each person only the accounts they need, through a channel your team trusts.',
            'A fragment link keeps the secret out of the HTTP request, but the full address still sits in browser history and may sync to other devices signed in to the same browser profile. On shared computers, clear the history after use, or use the safe link, which hides the keys but still opens for anyone who has it.',
            'By default, a batch is kept on the current page only and is cleared when you leave. Local history is off by default; if you turn it on and unlock it, valid rows are saved in this browser, optionally protected by a password, and nothing syncs between devices. When someone leaves the team, reset two-factor authentication on the accounts they could reach, because copies of a secret cannot be recalled.'
          ]
        }
      ],
      sources: [
        {
          title: '2fa.hot source code and feature overview',
          url: 'https://github.com/LZSMIAO/2FA.hot'
        },
        {
          title: 'RFC 6238: the TOTP algorithm',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: 'MDN: URI fragments are not sent to the server',
          url: 'https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment'
        }
      ]
    },
    {
      slug: 'otpauth-uri-format',
      title: 'The otpauth:// link format',
      description:
        'How the otpauth:// Key URI works: type, label, secret, issuer, algorithm, digits and period, what a 2FA QR code contains, and how to handle it safely.',
      sections: [
        {
          id: 'what-it-is',
          title: 'What an otpauth URI is',
          paragraphs: [
            'An otpauth URI is a single line of text that holds everything an authenticator app needs to add an account: the code type, a label, the Base32 secret and any non-default settings. Google documented the format as the Key URI Format in the google-authenticator project wiki, and most authenticator apps can read it.',
            'When a service shows a QR code during two-factor setup, that QR code usually contains exactly this text. Scanning it simply copies the link into your app without typing. A typical example reads otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example. The secret in that example is a well-known public test value and does not protect any real account.'
          ]
        },
        {
          id: 'structure',
          title: 'The parts of an otpauth:// link',
          paragraphs: [
            'The general shape is otpauth://TYPE/LABEL?PARAMETERS. The otpauth:// scheme marks the text as an authenticator configuration. TYPE is totp for codes that change with time, or hotp for codes that move forward with a counter.',
            'The label names the account. It is an account name, optionally preceded by an issuer and a colon, as in Example:alice@example.com. Neither part may contain a colon of its own, and spaces and other special characters are URL-encoded, so a space becomes %20. The label helps you recognize the entry; editing it does not change the codes.',
            'Parameters follow the question mark as name=value pairs joined by ampersands. Their order does not matter. Repeating a parameter makes the link ambiguous, so each one should appear only once.'
          ]
        },
        {
          id: 'parameters',
          title: 'Parameters and their defaults',
          paragraphs: [
            'secret is the only parameter every link must have. It is the shared key written in Base32, the alphabet of letters A to Z and digits 2 to 7 defined in RFC 4648. The Key URI Format says the trailing = padding of Base32 is not required and should be left out of the link.',
            'issuer names the provider or service. It is strongly recommended, and if the label also starts with an issuer prefix, the two should be the same. algorithm can be SHA1, SHA256 or SHA512, digits can be 6 or 8, and period sets how many seconds each TOTP code stays valid. A link of type hotp must also carry counter, which sets the starting counter value.',
            'When algorithm, digits or period is missing, the defaults apply: SHA1, 6 digits and 30 seconds, the usual TOTP settings described in RFC 6238. A service that uses other values has to write them into the link, for instance with a query that begins ?algorithm=SHA256&digits=8&period=30 and then continues with the secret and issuer.',
            'Support for these optional values varies between apps. The Key URI Format page itself notes that, at the time it was written, Google Authenticator ignored algorithm and period, and its Android and BlackBerry versions ignored digits. An app that quietly falls back to the defaults shows codes the service will reject, so check that non-default values survive the import.'
          ]
        },
        {
          id: 'security',
          title: 'Treat the link like the secret itself',
          paragraphs: [
            'A complete otpauth URI contains the secret in plain text. Anyone who has the link, a photo of the QR code or a screenshot of the setup page can generate the same codes you do, on any device, for as long as the secret stays active. Keep it out of chats, support tickets, shared folders and public screenshots.',
            'Changing the label or issuer in a copy of the link does not create a new secret. If you think a link or QR code has been exposed, set up the authenticator again at the original service so that it issues a new secret, confirm the new entry works, then delete the old one.'
          ]
        },
        {
          id: 'on-2fa-hot',
          title: 'Using an otpauth link with 2fa.hot',
          paragraphs: [
            'You can paste an otpauth:// link into the 2fa.hot input, or import its QR code from an image file, by drag and drop or with the camera. The link is decoded and the code is calculated in your browser; the secret is not sent to the server. No account is needed, and local history stays off unless you turn it on.',
            'Non-default settings in the link are kept rather than reset: SHA-1, SHA-256 or SHA-512, 6 or 8 digits, and a period from 15 to 120 seconds. If the issuer prefix and the issuer parameter disagree, or a parameter appears twice, the link is reported as invalid instead of being guessed. Links of type hotp are not accepted, because 2fa.hot does not generate counter-based codes.',
            'Google Authenticator exports use a different scheme, otpauth-migration://. Its data parameter packs one or more accounts into Base64-encoded binary data, so it cannot be read or edited like an ordinary otpauth link. Choose the Google Authenticator option when importing these QR codes. HOTP and MD5 entries inside them can be decoded and exported, but no codes are generated for them.'
          ],
          steps: [
            'On a device you trust, copy the complete otpauth:// link or save the setup QR code as an image.',
            'Paste the link into the generator, or open Import QR code and choose the image.',
            'Compare the current code with your existing authenticator or confirm it at the service, then delete copies of the link you no longer need.'
          ]
        }
      ],
      sources: [
        {
          title: 'Google Authenticator wiki: Key Uri Format',
          url: 'https://github.com/google/google-authenticator/wiki/Key-Uri-Format'
        },
        {
          title: 'RFC 4648: Base32 encoding',
          url: 'https://www.rfc-editor.org/rfc/rfc4648'
        },
        {
          title: 'RFC 6238: the TOTP algorithm',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        }
      ]
    },
    {
      slug: 'enable-authenticator-app-2fa',
      title: 'Turn on authenticator app 2FA',
      description:
        'How to enable 2FA with an authenticator app: scan the QR code, save the setup key and backup codes, with notes for GitHub, Discord and X.',
      sections: [
        {
          id: 'before-you-start',
          title: 'Before you start',
          paragraphs: [
            'Two-factor authentication with an authenticator app uses TOTP. During setup, the service shares a secret setup key with your authenticator, usually shown as a QR code. From then on, the app and the service both calculate a short code from that key and the current time. On most services the code changes every 30 seconds.',
            'You need your account password, an authenticator app and a safe place for the setup key and backup codes. Any standard TOTP app works, such as Google Authenticator, Microsoft Authenticator or a password manager with TOTP support. Set aside a few minutes on a device you trust, because some setup screens show the key only once.'
          ]
        },
        {
          id: 'general-flow',
          title: 'The general enrollment flow',
          paragraphs: [
            'Menu names differ between services, but the enrollment itself follows the same pattern almost everywhere.'
          ],
          steps: [
            'Sign in and open the account’s security settings, often called Security, Password and authentication or Two-factor authentication.',
            'Choose the authenticator app option. It may be labeled Authentication app, TOTP or Google Authenticator. Confirm your password or email address if asked.',
            'Scan the QR code with your authenticator. If you cannot scan it, reveal the setup key as text and enter it manually.',
            'Before continuing, save the setup key somewhere secure, as described in the next section.',
            'Type the current code from your authenticator to confirm. Two-factor authentication is usually switched on only after this step succeeds.',
            'Download, print or copy the backup codes the service offers, and store them away from your phone.'
          ]
        },
        {
          id: 'save-setup-key',
          title: 'Save the setup key while you enroll',
          paragraphs: [
            'The QR code and the text setup key contain the same secret. If you keep a copy, a lost or replaced phone does not have to mean a lockout. You can add the key to a new authenticator, or generate codes on a computer with 2fa.hot, which calculates them locally in your browser.',
            'Treat the key with the same care as a password. Anyone who has it can generate your codes, now and later. Keep it in a password manager or encrypted storage, not in email, chat, a synced screenshots folder or a shared document. If you think it has been exposed, reset two-factor authentication at the service to get a new key.',
            'The key follows an open standard, so the same key works in any standard TOTP app. You can add it to two apps during setup for redundancy. Most services use SHA-1, six digits and 30 seconds. If a service uses other settings, the QR code or otpauth link carries them.'
          ]
        },
        {
          id: 'service-notes',
          title: 'Notes for GitHub, Discord and X',
          paragraphs: [
            'The menu paths below follow each service’s official help pages at the time of writing. Services rename and move settings, so look for similar wording if yours differs.',
            'GitHub: click your profile picture → Settings → Password and authentication, then choose Enable two-factor authentication. Scan the QR code, or click the setup key link to see the secret as text. Enter the code from your app, then download your recovery codes and confirm that you saved them to finish. GitHub requires two-factor authentication for accounts that contribute code.',
            'Discord: on desktop, open User Settings with the gear icon next to your username, go to My Account and, under Password and Authentication, choose Enable Authenticator App. On mobile, tap your avatar, then the gear icon, then Account. Scan the QR code or copy the secret key, enter the six-digit code, then save the backup codes. Discord says it cannot help you back into the account if you lose them.',
            'X: go to More → Settings and privacy → Security and account access → Security → Two-factor authentication, then select Authentication app. X may ask for your password and a confirmed email address before showing the QR code, and it accepts any TOTP app. Text message two-factor authentication is limited to X Premium subscribers, so an authenticator app is the usual choice.'
          ]
        },
        {
          id: 'after-setup',
          title: 'After you turn it on',
          paragraphs: [
            'Test the setup before you rely on it. Keep your current session open, sign in from a private window with a fresh code, and make sure the device clock is set automatically. A code rejected right after setup usually points to a clock or entry mistake.',
            'Keep at least two ways back in, for example backup codes plus the saved setup key, or a security key where supported. When you change phones, move your authenticator entries before wiping the old one. If you reset two-factor authentication later, the old key stops working, so save the new one.',
            '2fa.hot accepts a Base32 key or an otpauth link, QR images from a file, drag and drop or the camera, and batches of up to 100 entries. It supports SHA-1, SHA-256 and SHA-512 with six or eight digits. It is free, needs no account, is open source under AGPL-3.0 and is not affiliated with any service named here. Local history is off by default.'
          ]
        }
      ],
      sources: [
        {
          title: 'GitHub Docs: Configuring two-factor authentication',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication'
        },
        {
          title: 'Discord: Using an Authenticator App on Discord',
          url: 'https://support.discord.com/hc/en-us/articles/26304482627095-Using-an-Authenticator-App-on-Discord'
        },
        {
          title: 'X Help Center: How to use two-factor authentication',
          url: 'https://help.x.com/en/managing-your-account/two-factor-authentication'
        }
      ]
    },
    {
      slug: 'lost-authenticator-recovery',
      title: 'Lost your 2FA phone?',
      description:
        'Lost the phone with your authenticator app? Look for a saved setup key, backup codes or another sign-in method, then use the service’s official recovery.',
      sections: [
        {
          id: 'check-setup-key',
          title: 'First, look for your setup key',
          paragraphs: [
            'Authenticator codes are not stored on your phone like messages. They are calculated from the setup key the service gave you when you turned on two-factor authentication, combined with the current time. If a copy of that key survived, only the phone is gone: any standard TOTP app or generator holding the same key produces the same codes.',
            'Before starting a long recovery process, search for anything that contains the key. If you find it, you can generate the current code again on a computer. In 2fa.hot, paste the Base32 key or otpauth link, or import the QR image, including Google Authenticator export QR codes. The calculation runs locally in your browser.'
          ],
          steps: [
            'Search your password manager, encrypted notes and printed records for the text setup key saved at enrollment.',
            'Look for an old screenshot or printout of the enrollment QR code, or export images from your previous authenticator.',
            'Check whether your authenticator app had cloud backup or sync turned on. If it did, sign in to the same backup account on the new phone to restore it.',
            'Generate a code from what you found and sign in promptly. If the service rejects it, two-factor authentication may have been reset after the key was saved.'
          ]
        },
        {
          id: 'backup-codes',
          title: 'Use backup codes or another sign-in method',
          paragraphs: [
            'Backup codes are one-time codes issued when you turned on two-factor authentication, and each one works only once. Google calls them backup codes and GitHub calls them recovery codes. Check your downloads folder, password manager, printed pages and old notes.',
            'Other registered methods can also get you in: a hardware security key or passkey, a backup phone number that receives SMS codes, or a device that is still signed in. Google notes that a device where you previously chose not to be asked again may let you sign in without the second step. GitHub accepts a passkey, a security key or a fallback SMS number.',
            'If a computer or tablet is still signed in, keep that session open. Use it to add a new authenticator, create fresh backup codes or register another method before you sign out anywhere.'
          ]
        },
        {
          id: 'account-recovery',
          title: 'Use the service’s official account recovery',
          paragraphs: [
            'When no key, backup code or other method is left, the remaining route is the service’s own recovery process. Start from the sign-in page or the official help center, not from a link in an unexpected message. Recovery forms usually ask for details only the owner would know, such as previous passwords, recovery email addresses, recent email subjects and the devices you normally use.',
            'Use a device and location the service has seen before, answer as accurately and completely as you can, and expect to wait. Microsoft reviews its recovery form and replies within about 24 hours. Google says its checks can take three to five business days. A GitHub recovery request asks you to prove ownership with a verified device, an SSH key or a personal access token, and GitHub replies by email within about three business days.',
            'Recovery is not guaranteed. Microsoft states that if two-step verification is on and you cannot use any alternate verification method, it cannot help. GitHub Support likewise cannot restore access to an account whose 2FA credentials and recovery methods are all lost. Be wary of anyone who offers paid recovery or asks for your codes.'
          ]
        },
        {
          id: 'limits',
          title: 'What cannot be recovered',
          paragraphs: [
            'A six-digit code cannot be turned back into the setup key. The code is a short one-way result of the key and the time, so screenshots of old codes, SMS history or a list of used codes will not rebuild the authenticator entry.',
            '2fa.hot cannot recover a lost key either. It has no account system, does not keep your keys on a server, cannot contact other services and cannot remove two-factor authentication from an account. If you once enabled its optional local history in a browser, those records exist only in that browser. Password-protected history needs its password, and a forgotten password cannot be recovered.'
          ]
        },
        {
          id: 'after-recovery',
          title: 'After you regain access, and next time',
          paragraphs: [
            'Once you are back in, remove the lost phone or old authenticator from the account and set up the authenticator again. Re-enrolling issues a new setup key, so the old key and any copies of it stop working. Create a new set of backup codes, review signed-in devices and change your password if the phone may be in someone else’s hands.',
            'Store the new setup key and backup codes as carefully as a password, and keep them separate from the phone that runs your authenticator.'
          ],
          steps: [
            'Save the setup key or enrollment QR code at setup time in a password manager or encrypted storage, not in a chat or shared folder.',
            'Download or print the backup codes and keep them away from the phone.',
            'Add a second method where the service allows it, such as a security key or a second authenticator holding the same key.',
            'Before resetting, trading in or replacing a phone, transfer your authenticator entries and check that they work on the new device.',
            'Keep your recovery email address and phone number up to date.',
            'Every few months, check that a saved key still produces the same code as your authenticator.'
          ]
        }
      ],
      sources: [
        {
          title: 'Google: Fix common issues with 2-Step Verification',
          url: 'https://support.google.com/accounts/answer/185834?hl=en'
        },
        {
          title: 'Microsoft: Help with the Microsoft account recovery form',
          url: 'https://support.microsoft.com/en-us/account-billing/help-with-the-microsoft-account-recovery-form-b19c02d1-a782-dee6-93c3-dc8113b20c42'
        },
        {
          title: 'GitHub Docs: Recovering your account if you lose your 2FA credentials',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/recovering-your-account-if-you-lose-your-2fa-credentials'
        }
      ]
    },
    {
      slug: 'microsoft-authenticator-backup',
      title: 'Back up Microsoft Authenticator',
      description:
        'Back up Microsoft Authenticator on iPhone or Android, see why accounts cannot be exported to another app, and re-enroll 2FA while keeping each new setup key.',
      sections: [
        {
          id: 'what-backup-covers',
          title: 'What Microsoft Authenticator backup covers',
          paragraphs: [
            'Microsoft Authenticator can back up your accounts to the cloud so that you can restore them after losing or replacing a phone. According to Microsoft, backup and restore only work on the same device type: a backup made on an iPhone cannot be restored on an Android phone, and the reverse is also true.',
            'Accounts do not all come back the same way. Third-party accounts that use a one-time password code refreshing every 30 seconds, such as Amazon, Facebook or Gmail, are restored with working codes, and so are Microsoft personal accounts that only use codes. For Microsoft accounts with passwordless sign-in and for work or school accounts, only the account name is kept, and you need to sign in again after restoring.'
          ]
        },
        {
          id: 'iphone',
          title: 'Back up and restore on iPhone',
          paragraphs: [
            'On iOS, Microsoft’s current instructions use iCloud for the backup, so the new iPhone needs to be signed in to the same iCloud account. Setting names differ between iOS and app versions; if yours are worded differently, look for the closest match.'
          ],
          steps: [
            'On the old iPhone, turn on iCloud Drive, iCloud Keychain and iCloud Backup.',
            'In your iCloud settings, open the list of apps saved to iCloud, find Authenticator and turn it on.',
            'Before you switch, update Authenticator to version 6.8.33 or later and open it at least once.',
            'On the new iPhone, turn on the same iCloud settings, install Authenticator and follow its prompts to sign in where needed.',
            'If your accounts do not appear, Microsoft suggests uninstalling and reinstalling Authenticator on the new iPhone.'
          ]
        },
        {
          id: 'android',
          title: 'Back up and restore on Android',
          paragraphs: [
            'On Android, the backup is currently stored with a personal Microsoft account that you choose as the recovery account. Microsoft’s help page says that from January 2027 you will turn on backup through Google One backup instead, so check the current page before you rely on either method.',
            'If Restore from backup does not appear when you open the app, Microsoft says you need to remove or sign out of all accounts in it first. If you lose access to the recovery account, Microsoft support cannot restore the backup for you.'
          ],
          steps: [
            'Open Authenticator, go to Settings and turn on Cloud Backup.',
            'Choose the personal Microsoft account that will hold the backup.',
            'On the new phone, install Authenticator and select Restore from backup before adding or signing in to any account.',
            'Sign in with the same personal Microsoft account, then complete the extra sign-in for any account marked Action required.'
          ]
        },
        {
          id: 'no-export',
          title: 'Moving to another app: there is no export',
          paragraphs: [
            'The backup restores only into Microsoft Authenticator. Microsoft’s help pages do not describe any way to export third-party accounts as QR codes, text keys or a file for another authenticator. Unless a future version adds such an option, you cannot move your accounts to Google Authenticator, another app or 2fa.hot in one step.',
            'Two routes still work. If you kept the original setup key or QR image for a service and have not reset its two-factor setup since, that key still produces valid codes in any TOTP generator. Otherwise, set up two-factor authentication again at each service, one account at a time, while the old app still works.'
          ]
        },
        {
          id: 're-enroll',
          title: 'Re-enroll each service and keep the new key',
          paragraphs: [
            'Re-enrolling creates a new setup secret at the service. Most services replace the old secret, so Microsoft Authenticator stops producing accepted codes for that account once you confirm; some let you keep several authenticators. Save each new key somewhere secure, such as a password manager or an offline note you keep safe.',
            'For a personal Microsoft account, the security settings include an option to set up a different authenticator app. Work or school accounts are managed by your organization, which decides the sign-in methods you may use. Some organizations require Microsoft Authenticator notifications, which a TOTP generator cannot approve, so check with your IT team first.'
          ],
          steps: [
            'While Microsoft Authenticator still works, sign in to the service and open its security or two-step verification settings.',
            'Choose to change or add an authenticator app. When the QR code appears, look for the option to enter a key manually and copy the text key.',
            'Save the key, add it to your new authenticator and enter a fresh code to confirm the setup.',
            'Store any new recovery codes, and remove the old entry from Microsoft Authenticator only after the new setup works.'
          ]
        },
        {
          id: 'use-2fa-hot',
          title: 'Generate codes from the new key in 2fa.hot',
          paragraphs: [
            'With a setup key in hand, paste the Base32 key or otpauth:// link into 2fa.hot, or import the QR image from a file, by drag and drop or with the camera. It supports TOTP with SHA-1, SHA-256 or SHA-512 and six or eight digits. Batch mode takes up to 100 entries and recognizes tables copied from Excel and mixed text. No account is needed.',
            'Codes are calculated in your browser, and secrets are not sent to the server. Local history is off by default and can be protected with a password, but it is not synchronized and does not replace a backup, so keep the setup keys themselves somewhere safe. 2fa.hot is open source under AGPL-3.0 and is not affiliated with Microsoft.'
          ]
        }
      ],
      sources: [
        {
          title: 'Microsoft: Back up your accounts in Microsoft Authenticator',
          url: 'https://support.microsoft.com/en-us/authenticator/back-up-your-accounts-in-microsoft-authenticator'
        },
        {
          title: 'Microsoft: Restore account credentials from Microsoft Authenticator',
          url: 'https://support.microsoft.com/en-us/authenticator/restore-account-credentials-from-microsoft-authenticator'
        },
        {
          title: 'Microsoft: How to add your accounts to Microsoft Authenticator',
          url: 'https://support.microsoft.com/en-us/authenticator/how-to-add-your-accounts-to-microsoft-authenticator'
        }
      ]
    }
  ],
  'zh-CN': [
    {
      slug: 'google-authenticator-web',
      title: '谷歌身份验证器网页版',
      description:
        '谷歌身份验证器（Google Authenticator）没有官方网页版或电脑版。本文介绍如何用已保存的密钥或导出二维码在电脑上获取相同验证码，以及相应的安全取舍。',
      sections: [
        {
          id: 'no-web-version',
          title: '谷歌身份验证器有网页版或电脑版吗',
          paragraphs: [
            '根据 Google 帮助中心的说明，Google 身份验证器是一款用于 Android 和 iPhone、iPad 的应用。截至本文撰写时，Google 没有提供官方网页版，也没有 Windows 或 Mac 客户端，帮助页面中也没有介绍可以登录后查看验证码的网站。如果看到名称相近的浏览器扩展或电脑软件，请先确认开发者是谁，Google 帮助中心并没有推荐这类程序。',
            '不过，你仍然可以在电脑上得到相同的验证码。验证器显示的动态码，是由配置密钥和当前时间按标准 TOTP 算法计算出来的；只要密钥和参数相同，任何 TOTP 工具在同一个 30 秒周期内都会显示相同的验证码。真正需要考虑的是：如何把密钥带到电脑上，以及这样做是否符合你的安全需求。'
          ]
        },
        {
          id: 'account-sync',
          title: 'Google 账号同步不是网页查看入口',
          paragraphs: [
            '新版 Google 身份验证器可以把验证码保存到 Google 账号。在另一部手机或平板上登录应用后，验证码会同步到那台设备。这在换手机时很有用，但同步的目标只是身份验证器应用本身，Google 帮助中心没有介绍在浏览器或电脑上查看已同步验证码的方法。',
            '同步是可选的，你也可以在不登录账号的情况下使用应用，此时验证码只保存在当前设备上。开启同步后，在一台设备上删除验证码，其他已同步的设备也会一并删除。因此，同步的作用是防止手机丢失后无法登录，而不是提供一份能在别处查看的独立副本。'
          ]
        },
        {
          id: 'setup-key',
          title: '方法一：使用已保存的密钥',
          paragraphs: [
            '如果你在开启双重验证时保存了文字密钥、otpauth:// 链接或二维码图片，可以直接使用。很多服务在显示二维码的同时，还提供“手动输入密钥”之类的选项来显示文字密钥。这样做不需要改动手机上的任何设置，两台设备会显示相同的验证码。'
          ],
          steps: [
            '在电脑上打开 2fa.hot，粘贴 Base32 密钥或 otpauth:// 链接，也可以导入保存的二维码图片。',
            '如果原服务使用的不是 SHA-1、6 位、30 秒的默认参数，请核对导入后的设置是否一致。',
            '在同一周期内与手机上的 Google 身份验证器核对验证码，确认一致后再复制到登录页面。'
          ]
        },
        {
          id: 'export-qr',
          title: '方法二：导入谷歌身份验证器的导出二维码',
          paragraphs: [
            '如果当初没有保存密钥，可以在 Google 身份验证器中把选中的账号导出为转移二维码，再在电脑上用 2fa.hot 读取。不同版本和语言的菜单名称可能略有差异，以下步骤参照 Google 帮助中心当前的说明。',
            '导出的二维码包含账号密钥。用电脑摄像头直接扫描手机屏幕，可以避免留下图片；如果使用截图，请不要存入网盘或发到聊天软件，导入后及时删除。二维码在浏览器中解析，图片不会上传。HOTP 和 MD5 类型的记录可以解析和导出，但 2fa.hot 不会为它们生成验证码。'
          ],
          steps: [
            '在手机上的 Google 身份验证器中打开菜单，依次选择“转移账号”“导出账号”，按提示解锁手机。',
            '勾选要在电脑上使用的账号，点按“下一步”。账号较多时可能会生成多张二维码。',
            '在 2fa.hot 中打开“导入二维码”，选择 Google Authenticator 选项，用摄像头扫描手机屏幕，或选择已保存的图片。',
            '导入同一次导出的全部二维码，勾选需要的账号，再挑一条与手机上的验证码核对。'
          ]
        },
        {
          id: 'computer-risks',
          title: '在电脑上取码的安全取舍',
          paragraphs: [
            '双重验证的意义之一，是让第二重验证与输入密码的地方分开。如果同一台电脑既保存了密码，又保存了验证器密钥，这台电脑一旦被他人控制，两重验证可能同时失守。请使用自己信任、及时更新的电脑，不要在公用或共享电脑上输入真实密钥。',
            '2fa.hot 在浏览器中计算验证码，不会把密钥发送到服务器。本地历史默认关闭；如果开启，建议设置密码。记录只保存在当前浏览器，清理浏览器数据后会丢失。/2fa#密钥 这类片段链接不会随页面请求发送密钥，但完整链接可能留在浏览器历史中，不要在共享设备上收藏或转发。'
          ]
        },
        {
          id: 'keep-phone',
          title: '保留手机上的验证器作为备用',
          paragraphs: [
            '在电脑上导入账号后，不要从 Google 身份验证器中删除它们。浏览器数据可能被清理，电脑也会更换，本地历史的密码一旦忘记也无法找回。保留手机应用，就多了一份可用的副本；如果开启了 Google 账号同步，换手机时这份副本也能得到保护。',
            '对于 Google 账号本身，Google 建议添加不止一种两步验证方式，避免被锁在账号之外。其他重要服务的备用码或恢复码也请妥善保存。2fa.hot 与 Google 没有关联，不会登录你的 Google 账号，无法读取已同步的验证码，也无法找回丢失的密钥。'
          ]
        }
      ],
      sources: [
        {
          title: 'Google：通过 Google 身份验证器获取验证码',
          url: 'https://support.google.com/accounts/answer/1066447?hl=en'
        },
        {
          title: 'RFC 6238：TOTP 算法说明',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: '2fa.hot 项目介绍与支持功能',
          url: 'https://github.com/LZSMIAO/2FA.hot'
        }
      ]
    },
    {
      slug: 'find-2fa-secret-key',
      title: '2FA 密钥在哪里找',
      description:
        '2FA 密钥是什么、长什么样？了解设置验证器时在哪里找到密钥，没保存时如何重新获取，以及如何安全保存、为什么不能随意发给别人。',
      sections: [
        {
          id: 'what-it-is',
          title: '2FA 密钥是什么',
          paragraphs: [
            '2FA 密钥也叫设置密钥或验证器密钥，是你开启验证器双重验证时由服务生成的共享密钥。服务保存一份，你的验证器保存另一份。按照 RFC 6238 的描述，每个六位验证码都由这把密钥和当前时间计算得出。',
            '大多数服务以 Base32 文本显示密钥。Base32 只使用字母 A–Z 和数字 2–7，所以 Base32 密钥里不会出现 0、1、8、9。密钥常见长度为 16 或 32 个字符，通常每四个字符一组显示，例如 JBSW Y3DP EHPK 3PXP。',
            '空格只是为了方便阅读，验证器一般也不区分大小写，所以 jbsw y3dp ehpk 3pxp 是同一把密钥。有些服务还会在末尾加上 = 作为填充。这些都不会改变密钥，但少一个或多一个字母，就是另一把密钥了。'
          ]
        },
        {
          id: 'where-to-find',
          title: '服务会在哪里显示密钥',
          paragraphs: [
            '密钥出现在设置验证器的页面上，就在二维码旁边。留意“无法扫描？”“手动输入密钥”“设置密钥”或“显示密钥”之类的链接或按钮。以 GitHub 为例，它称之为 setup key，并说明这就是可以代替扫码、手动输入到应用中的 TOTP 密钥。',
            '二维码里包含的是同一把密钥。它编码的是一条 otpauth:// 链接，其中 secret 参数就是密钥，另外还有账号名称和验证码参数。所以扫描二维码和手动输入密钥，设置的是同一个账号。如果你把设置二维码保存成图片，这张图片和密钥一样敏感。',
            '设置完成后，很多服务不会再次显示密钥。它并没有藏在账号设置的某个角落，也无法从六位验证码反推出来。你的验证器保存着它，但不少应用不会显示；有些应用可以导出条目，例如 Google Authenticator 的导出二维码。'
          ]
        },
        {
          id: 'get-it-again',
          title: '没有保存密钥时如何重新获取',
          paragraphs: [
            '如果密钥已经找不到，可靠的办法是重新设置验证器。服务会生成一把新密钥，并连同新的二维码一起显示。新设置保存后，旧密钥通常就会失效，所有使用旧密钥的设备都需要换成新密钥。',
            '有些服务提供“更换”或“重新配置”验证器的选项，整个过程中双重验证始终保持开启。例如 GitHub 说明，不关闭 2FA 而直接重新配置，可以保留你的恢复码。如果只能先关闭再重新开启验证器，请在可信设备上操作，并立即重新开启。'
          ],
          steps: [
            '登录原服务，打开安全或双重验证设置。',
            '选择更换或重新配置验证器的选项。只有在没有这类选项时，才关闭后重新开启 2FA。',
            '出现二维码时，选择手动输入的选项，复制页面上显示的密钥。',
            '把密钥添加到验证器并妥善保存一份副本，然后输入当前验证码完成确认。',
            '等服务接受新设置后，再从验证器中删除旧条目。'
          ]
        },
        {
          id: 'codes-compared',
          title: '密钥、验证码和恢复码的区别',
          paragraphs: [
            '密钥是长期有效的：在你重新设置验证器之前，它一直不变。六位验证码是由密钥计算出的短时结果，通常大约 30 秒有效。无法从验证码还原密钥，把验证码粘贴到需要密钥的地方也不会生效。',
            '备用码或恢复码是服务另外提供的一组一次性代码，用于紧急情况，例如手机丢失时。使用时，用它代替验证码输入。它们不是密钥，也不能添加到验证器中。短信验证码由服务在每次登录时发送到你的手机，所以没有需要保存的密钥。'
          ]
        },
        {
          id: 'safe-storage',
          title: '安全保存密钥，谨慎分享',
          paragraphs: [
            '在密钥显示时就把它保存下来。比较实用的做法是存进你信任的密码管理器中对应账号的条目，也可以做一份离线副本，例如打印出来和恢复码放在一起。相册里会同步到多台设备的截图，比想象中更容易泄露。',
            '拿到密钥的人可以在自己的设备上生成你的验证码，只要密钥有效就一直可以，而你不会察觉。不要把密钥发给任何你不信任的人，包括自称客服、主动联系你的人。原服务本身就保存着密钥，真正的客服从不需要你发送它。如果密钥已经发给别人，请重新设置验证器来更换它。',
            '想核对密钥时，可以把它粘贴到 2fa.hot，带不带空格、大写还是小写都可以；也可以使用完整的 otpauth:// 链接或二维码图片。验证码在浏览器中计算，密钥不会发送到服务器。本地历史默认关闭；开启后只保存在当前浏览器，并可设置密码保护。'
          ]
        }
      ],
      sources: [
        {
          title: 'GitHub 文档：配置双重身份验证',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication'
        },
        {
          title: 'GitHub 文档：更改双重身份验证方法',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/changing-two-factor-authentication-delivery-methods-for-your-mobile-device'
        },
        {
          title: 'RFC 4648：Base32 字母表',
          url: 'https://www.rfc-editor.org/rfc/rfc4648'
        }
      ]
    },
    {
      slug: 'batch-2fa-codes',
      title: '批量获取 2FA 验证码',
      description:
        '一次粘贴最多 100 个 2FA 密钥、Excel 表格行或混合文本，在浏览器中批量获取当前 TOTP 验证码，并了解团队使用时的安全建议。',
      sections: [
        {
          id: 'when',
          title: '谁需要批量取码',
          paragraphs: [
            '如果你要管理很多账号，比如跨境电商团队运营的店铺、广告账户和社交媒体主页，逐个打开验证器会很慢。2fa.hot 的批量取码可以读取一组已有密钥，在同一屏显示每个账号的当前验证码，每一条都有自己的倒计时。',
            '每次最多处理 100 条、约 100 KB 文本。每一行都是普通的 TOTP 配置：SHA-1、SHA-256 或 SHA-512，6 位或 8 位，以及 otpauth:// 链接中指定的周期。验证码在浏览器中计算，密钥不会发送到 2fa.hot 的服务器。'
          ]
        },
        {
          id: 'paste',
          title: '可以粘贴哪些内容',
          paragraphs: [
            '最简单的格式是每行一个 Base32 密钥。也可以粘贴 otpauth:// 链接：输入框只显示其中的密钥，但账号名、发行方和参数都会保留。写成“名称 + 制表符 + 密钥”的行，会把名称作为标签。很多网站按四个字符一组显示密钥，这种分组写法也会被识别为一个完整密钥。',
            '从 Excel 或 Google 表格复制的行是以制表符分隔的文本，单元格内带换行的引号内容也能处理。智能识别只提取完整的密钥，不会把片段拼接起来，因此其他列中的密码、电话和备注通常会被排除；忽略了周围文字时会给出提示。同一行用空格隔开两个密钥时，会标记为需修正，而不是去猜。不过仍建议看一眼结果：只由字母和数字 2–7 组成的长密码，看起来也可能像密钥。',
            '不必先切换标签页。把多个密钥粘贴到单条取码的输入框，或页面任意位置，都会自动转到批量取码。也可以把二维码图片直接粘贴到批量输入框，每次最多 20 张。'
          ]
        },
        {
          id: 'names',
          title: '让账号名称紧挨着密钥',
          paragraphs: [
            '验证码只有在知道属于哪个账号时才有用。最可靠的排法是：名称列紧挨在密钥列左边，每行一个账号。两列一起复制后，每行就是“名称 + 制表符 + 密钥”，结果中名称会显示在密钥上方。',
            '邮箱会被更谨慎地处理。密钥旁边的邮箱可能是辅助邮箱而不是登录账号，所以 2fa.hot 不会自动对应。粘贴内容包含邮箱时，输入框下方的链接图标会提示名称尚未全部对应；点开后可以自己把每个邮箱和密钥配对。来自 otpauth:// 链接的名称会原样保留。'
          ]
        },
        {
          id: 'copy',
          title: '核对并复制验证码',
          paragraphs: [
            '输入框下方的“有效”和“需修正”计数显示识别结果。格式有误的行会单独标记，不影响其他行；重复的密钥会标为“重复记录”。“复制全部有效验证码”会为每个有效行写入一行到剪贴板：有名称时为“名称 + 制表符 + 验证码”，否则只有验证码。复制内容从不包含密钥，跳过的行数会在提示中显示。',
            '按 Ctrl+Z 可撤回整次粘贴，按 Ctrl+Shift+Z 逐行撤回；Mac 上用 Command 代替 Ctrl。每行左侧的勾选框可用于删除所选行；开启并解锁本地历史后，也可以只保存所选行。'
          ],
          steps: [
            '打开 2fa.hot，选择“批量取码”，或直接在页面上粘贴多个密钥。',
            '把列表或表格行粘贴到输入框中。',
            '修正或删除标记为需修正的行；如果链接图标有提示，确认账号名称的对应关系。',
            '点击某一行的复制按钮复制单个验证码，或点击“复制全部有效验证码”复制整份列表。',
            '倒计时快结束时，等下一组验证码出现后再提交。'
          ]
        },
        {
          id: 'links',
          title: '批量链接与独立取码页',
          paragraphs: [
            '一个片段链接可以包含多个密钥，例如 /2fa#密钥1#密钥2，也可以用逗号分隔。打开后会进入独立取码页，列出所有当前验证码。非默认参数写在各自的密钥后面：在 /2fa#密钥1#密钥2?digits=8 中，只有第二个密钥使用 8 位验证码。# 后面的内容由页面在浏览器中读取，不会随页面请求发送。',
            '批量取码右上角的展开图标会用安全链接 /2fa#~… 打开同一页面。安全链接在浏览器中加密生成，地址栏、浏览器历史和截图里都不会出现明文密钥；独立取码页上的密钥也只显示前后各四个字符。但拿到完整链接的人仍然可以打开它。链接只包含密钥和参数，不包含账号名称，请自行记录每一行对应哪个账号。'
          ]
        },
        {
          id: 'team',
          title: '团队使用的安全建议',
          paragraphs: [
            '密钥是长期有效的凭据。拿到密钥或包含密钥的完整链接的人，在原服务重置之前都能持续生成验证码。不要把密钥或链接发到聊天群、共享文档或工单里，那里的内容容易被复制和转发，发出后也无法收回。只把每个人需要的账号交给他，并通过团队信任的渠道传递。',
            '片段链接能让密钥不进入 HTTP 请求，但完整地址仍会留在浏览器历史中，还可能随浏览器账号同步到其他设备。在公用电脑上用完后请清除历史记录，或使用安全链接：它隐藏了密钥，但任何拿到链接的人仍能打开。',
            '默认情况下，批量内容只保留在当前页面，离开页面即清空。本地历史默认关闭；开启并解锁后，有效行会保存在当前浏览器中，可设置密码保护，不会在设备之间同步。有成员离开团队时，请为他接触过的账号重新设置双重验证，因为已经复制出去的密钥无法收回。'
          ]
        }
      ],
      sources: [
        {
          title: '2fa.hot 源代码与功能介绍',
          url: 'https://github.com/LZSMIAO/2FA.hot'
        },
        {
          title: 'RFC 6238：TOTP 算法说明',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        },
        {
          title: 'MDN：URI 片段不会发送到服务器',
          url: 'https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment'
        }
      ]
    },
    {
      slug: 'otpauth-uri-format',
      title: 'otpauth 链接格式详解',
      description:
        '了解 otpauth:// 链接的结构，secret、issuer、algorithm、digits、period 等参数的含义与默认值，以及 2FA 二维码的内容与安全处理。',
      sections: [
        {
          id: 'what-it-is',
          title: 'otpauth 链接是什么',
          paragraphs: [
            'otpauth URI 是一行文本，包含验证器应用添加账号所需的全部信息：验证码类型、账号标签、Base32 密钥，以及非默认的参数。Google 在 google-authenticator 项目的 wiki 中以 Key URI Format 为名记录了这种格式，大多数验证器应用都能读取。',
            '服务在设置双重验证时显示的二维码，内容通常就是这样一条链接。扫码只是省去了手动输入。一个常见的示例是 otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example。其中的密钥是广为人知的公开测试值，不对应任何真实账号。'
          ]
        },
        {
          id: 'structure',
          title: 'otpauth:// 链接由哪些部分组成',
          paragraphs: [
            '整体格式为 otpauth://TYPE/LABEL?PARAMETERS。开头的 otpauth:// 表明这是一条验证器配置。TYPE 为 totp 时，验证码随时间变化；为 hotp 时，验证码随计数器递增而变化。',
            '标签（LABEL）用于标识账号，由账号名组成，前面可以加上服务名（issuer）和冒号，例如 Example:alice@example.com。两部分本身都不能包含冒号，空格等特殊字符需要进行 URL 编码，空格会写成 %20。标签只帮助你识别条目，修改它不会改变验证码。',
            '问号后面是参数，以 name=value 的形式出现，彼此用 & 连接。参数顺序不影响结果。重复的参数会让链接含义不明确，所以每个参数只应出现一次。'
          ]
        },
        {
          id: 'parameters',
          title: '各参数的含义与默认值',
          paragraphs: [
            'secret 是每条链接都必须包含的参数，即用 Base32 编码的共享密钥。Base32 由 RFC 4648 定义，只使用字母 A–Z 和数字 2–7。Key URI Format 指出，Base32 末尾的 = 填充字符并非必需，应在链接中省略。',
            'issuer 表示提供账号的服务，强烈建议填写；如果标签也带有服务名前缀，两者应当一致。algorithm 可为 SHA1、SHA256 或 SHA512，digits 可为 6 或 8，period 设定每个 TOTP 验证码的有效秒数。类型为 hotp 的链接还必须带有 counter，用来设定计数器的初始值。',
            '缺少 algorithm、digits 或 period 时，采用默认值：SHA1、6 位、30 秒，也就是 RFC 6238 中描述的常见 TOTP 设置。使用其他参数的服务必须把它们写进链接，例如查询部分以 ?algorithm=SHA256&digits=8&period=30 开头，再接上 secret 和 issuer。',
            '各应用对这些可选参数的支持并不一致。Key URI Format 页面本身就注明，在撰写时 Google Authenticator 会忽略 algorithm 和 period，其 Android 与 BlackBerry 版本还会忽略 digits。如果应用悄悄改用默认值，生成的验证码就会被服务拒绝，因此导入含非默认参数的链接后，请确认这些参数仍然保留。'
          ]
        },
        {
          id: 'security',
          title: '像保护密钥一样保护这条链接',
          paragraphs: [
            '完整的 otpauth 链接以明文形式包含密钥。只要密钥仍然有效，拿到链接、二维码照片或设置页面截图的人，都能在任何设备上生成与你相同的验证码。不要把它发到聊天、工单、共享文件夹或公开的截图中。',
            '在链接副本中修改标签或 issuer，并不会生成新密钥。如果你认为链接或二维码已经泄露，请到原服务重新设置验证器，让服务签发新密钥，确认新条目可用后再删除旧条目。'
          ]
        },
        {
          id: 'on-2fa-hot',
          title: '在 2fa.hot 中使用 otpauth 链接',
          paragraphs: [
            '你可以把 otpauth:// 链接粘贴到 2fa.hot 的输入框，也可以通过图片文件、拖放或摄像头导入二维码。链接的解析和验证码的计算都在浏览器中完成，密钥不会发送到服务器。无需注册账号，本地历史默认关闭，只有你主动开启才会保存。',
            '链接中的非默认参数会被保留，不会重置为默认值：支持 SHA-1、SHA-256、SHA-512，6 位或 8 位，以及 15 到 120 秒的周期。如果标签中的服务名与 issuer 参数不一致，或同一参数出现两次，工具会提示链接无效，而不是自行猜测。类型为 hotp 的链接不会被接受，因为 2fa.hot 不生成基于计数器的验证码。',
            'Google Authenticator 的导出使用另一种格式 otpauth-migration://。它的 data 参数把一个或多个账号打包成 Base64 编码的二进制数据，无法像普通 otpauth 链接那样直接阅读或修改。导入这类二维码时，请选择 Google Authenticator 选项。其中的 HOTP 和 MD5 条目可以解析和导出，但不会生成验证码。'
          ],
          steps: [
            '在可信设备上复制完整的 otpauth:// 链接，或把设置二维码保存为图片。',
            '把链接粘贴到取码工具中，或打开“导入二维码”并选择图片。',
            '将当前验证码与现有验证器核对，或在原服务中确认，然后删除不再需要的链接副本。'
          ]
        }
      ],
      sources: [
        {
          title: 'Google Authenticator wiki：Key Uri Format',
          url: 'https://github.com/google/google-authenticator/wiki/Key-Uri-Format'
        },
        {
          title: 'RFC 4648：Base32 编码',
          url: 'https://www.rfc-editor.org/rfc/rfc4648'
        },
        {
          title: 'RFC 6238：TOTP 算法',
          url: 'https://www.rfc-editor.org/rfc/rfc6238'
        }
      ]
    },
    {
      slug: 'enable-authenticator-app-2fa',
      title: '如何开启验证器两步验证',
      description:
        '用验证器 App 开启两步验证：扫描二维码、确认验证码、保存设置密钥和备用码，并附 GitHub、Discord 和 X 的设置说明。',
      sections: [
        {
          id: 'before-you-start',
          title: '开始之前',
          paragraphs: [
            '验证器 App 的两步验证使用 TOTP。设置时，服务会把一个设置密钥交给你的验证器，通常以二维码的形式显示。此后，App 和服务都会用这个密钥和当前时间计算出短验证码，大多数服务每 30 秒更新一次。',
            '你需要账号密码、一个验证器 App，以及一个保存设置密钥和备用码的安全位置。任何标准 TOTP 应用都可以，例如 Google Authenticator、Microsoft Authenticator，或支持 TOTP 的密码管理器。请在可信设备上预留几分钟，因为有些设置页面只显示一次密钥。'
          ]
        },
        {
          id: 'general-flow',
          title: '通用的设置流程',
          paragraphs: ['各服务的菜单名称不同，但绑定验证器的流程几乎都一样。'],
          steps: [
            '登录账号，打开安全设置，常见名称有“安全”“密码与身份验证”或“两步验证”。',
            '选择验证器 App 选项，可能叫作“身份验证应用”“TOTP”或“Google 身份验证器”。如有要求，确认密码或邮箱。',
            '用验证器扫描二维码。无法扫描时，显示文字形式的设置密钥并手动输入。',
            '继续之前，按下一节的方法把设置密钥保存到安全的地方。',
            '输入验证器当前显示的验证码完成确认。通常只有这一步成功后，两步验证才会开启。',
            '下载、打印或复制服务提供的备用码，与手机分开保存。'
          ]
        },
        {
          id: 'save-setup-key',
          title: '设置时就保存好密钥',
          paragraphs: [
            '二维码和文字设置密钥包含的是同一个密钥。只要留有副本，手机丢失或更换就不一定会被锁在账号外：可以把密钥添加到新的验证器，或在电脑上用 2fa.hot 生成验证码，计算在浏览器本地完成。',
            '密钥要像密码一样保管，拿到它的人现在和以后都能生成你的验证码。请保存在密码管理器或加密存储中，不要放在邮件、聊天记录、会自动同步的截图相册或共享文档里。如果怀疑已经泄露，请到原服务重置两步验证，获取新的密钥。',
            '密钥遵循公开标准，同一个密钥可以用在任何标准 TOTP 应用中，设置时也可以同时添加到两个 App 作为备份。多数服务使用 SHA-1、6 位、30 秒；如果服务使用其他参数，二维码或 otpauth 链接会包含这些设置。'
          ]
        },
        {
          id: 'service-notes',
          title: 'GitHub、Discord 和 X 的设置说明',
          paragraphs: [
            '以下菜单路径依据撰写本文时各服务的官方帮助页面。服务可能调整设置的名称和位置，如果界面不同，请寻找意思相近的选项。',
            'GitHub：点击头像 → Settings → Password and authentication，选择 Enable two-factor authentication。扫描二维码，或点击 setup key 链接查看文字密钥。输入 App 中的验证码后，下载恢复码并确认已保存，才算完成。GitHub 要求贡献代码的账号开启两步验证。',
            'Discord：电脑端点击用户名旁的齿轮图标打开用户设置，在我的账号页面的密码与验证部分选择启用验证器应用；手机端依次点击右下角头像、右上角齿轮图标和账号，即可找到同一选项。扫描二维码或复制密钥，输入 6 位验证码，然后保存备用码。Discord 表示，备用码丢失后它无法帮你找回账号。',
            'X：在侧边菜单的更多中打开设置和隐私，依次进入安全和账号访问 → 安全 → 双重验证，选择身份验证应用。X 可能先要求输入密码并确认邮箱，之后才显示二维码，任何 TOTP 应用都可以使用。短信双重验证仅向 X Premium 订阅用户提供，因此验证器 App 通常是更实际的选择。'
          ]
        },
        {
          id: 'after-setup',
          title: '开启之后',
          paragraphs: [
            '在依赖它之前先测试一次。保留当前的登录会话，用无痕窗口和新的验证码登录，并确认设备开启了自动设置时间。刚设置完就提示验证码错误，通常是时间或输入有误。',
            '至少保留两种找回方式，例如备用码加上保存的设置密钥，或在支持时绑定安全密钥。换手机时，先转移验证器里的账号，再清除旧手机。以后如果重置了两步验证，旧密钥会失效，请保存新的密钥。',
            '2fa.hot 支持粘贴 Base32 密钥或 otpauth 链接，通过图片、拖放或摄像头导入二维码，批量模式每次最多 100 条。支持 SHA-1、SHA-256、SHA-512 与 6 位或 8 位验证码。本站免费、无需注册，以 AGPL-3.0 开源，与文中提到的服务均无关联。本地历史默认关闭。'
          ]
        }
      ],
      sources: [
        {
          title: 'GitHub 文档：配置双重身份验证',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication'
        },
        {
          title: 'Discord：在 Discord 上使用验证器应用',
          url: 'https://support.discord.com/hc/en-us/articles/26304482627095-Using-an-Authenticator-App-on-Discord'
        },
        {
          title: 'X 帮助中心：如何使用双重验证',
          url: 'https://help.x.com/en/managing-your-account/two-factor-authentication'
        }
      ]
    },
    {
      slug: 'lost-authenticator-recovery',
      title: '2FA 手机丢了怎么办',
      description:
        '手机或验证器 App 丢了怎么办？先找设置密钥、备用码和其他已绑定的验证方式，再走原服务的官方账号恢复流程，恢复后重新绑定并做好备份。',
      sections: [
        {
          id: 'check-setup-key',
          title: '先找找设置密钥还在不在',
          paragraphs: [
            '验证器里的动态码并不是存在手机上的消息，而是用开启双重验证时服务提供的设置密钥和当前时间计算出来的。只要这个密钥还有副本，丢的就只是一部手机：任何标准 TOTP 应用或取码工具，只要用同一个密钥，都会算出相同的验证码。',
            '在走漫长的账号恢复流程之前，先找找有没有保存密钥的记录。找到后，就可以在电脑上重新获取当前验证码：在 2fa.hot 中粘贴 Base32 密钥或 otpauth 链接，或导入二维码图片，也支持 Google Authenticator 的导出二维码。计算全部在浏览器本地完成。'
          ],
          steps: [
            '在密码管理器、加密笔记和纸质记录中，查找开启双重验证时保存的文字密钥。',
            '找找以前设置二维码的截图或打印件，或旧验证器导出的二维码图片。',
            '确认验证器 App 是否开启过云备份或同步。如果开启过，在新手机上登录同一个备份账号即可恢复。',
            '用找到的密钥生成验证码并尽快登录。如果原服务提示错误，可能是保存密钥之后又重新设置过双重验证。'
          ]
        },
        {
          id: 'backup-codes',
          title: '使用备用码或其他验证方式',
          paragraphs: [
            '备用码是开启双重验证时服务发给你的一次性代码，每个只能用一次。Google 称之为备用码，GitHub 称之为恢复码。可以翻翻下载文件夹、密码管理器、打印的纸张和旧笔记。',
            '其他已绑定的方式也能帮你登录：硬件安全密钥或通行密钥、能接收短信验证码的备用手机号，或者仍处于登录状态的设备。Google 提到，如果以前在某台设备上选择过不再询问，这台设备可能无需第二步验证就能登录。GitHub 支持通行密钥、安全密钥或备用短信号码。',
            '如果还有电脑或平板保持着登录状态，先不要退出。趁这个会话添加新的验证器、重新生成备用码或绑定其他验证方式，之后再在其他地方退出登录。'
          ]
        },
        {
          id: 'account-recovery',
          title: '走原服务的官方账号恢复流程',
          paragraphs: [
            '如果密钥、备用码和其他验证方式都没有了，剩下的途径就是原服务自己的账号恢复流程。请从登录页面或官方帮助中心进入，不要点击来路不明的消息里的链接。恢复表单通常会询问只有账号主人才知道的信息，例如以前用过的密码、辅助邮箱、最近邮件的标题，以及常用的设备。',
            '尽量用服务见过的设备、在常用地点提交，如实并尽可能完整地作答，同时预留等待时间。Microsoft 会审核恢复表单，一般在 24 小时内回复；Google 表示核实身份可能需要 3 到 5 个工作日；GitHub 的恢复申请需要用已验证的设备、SSH 密钥或个人访问令牌证明身份，约 3 个工作日内通过邮件答复。',
            '账号恢复并不保证成功。Microsoft 明确表示，如果开启了两步验证却无法使用任何备用验证方式，它无法提供帮助；GitHub 支持团队同样无法为丢失全部 2FA 凭据和恢复方式的账号恢复访问。对声称可以付费找回账号或索要验证码的人要保持警惕。'
          ]
        },
        {
          id: 'limits',
          title: '哪些东西无法找回',
          paragraphs: [
            '六位验证码无法反推出设置密钥。验证码是由密钥和时间算出的单向短结果，所以旧验证码的截图、短信记录或用过的验证码列表，都不能重建验证器里的账号。',
            '2fa.hot 同样无法找回丢失的密钥。它没有账号体系，不在服务器上保存你的密钥，不能联系其他服务，也不能取消某个账号的双重验证。如果你曾在某个浏览器里开启本站的本地历史，记录只存在于那个浏览器中；设置了密码的历史需要原密码才能打开，忘记的密码无法找回。'
          ]
        },
        {
          id: 'after-recovery',
          title: '恢复登录之后，以及如何预防',
          paragraphs: [
            '重新登录后，先在账号中移除丢失的手机或旧验证器，再重新设置验证器。重新绑定会生成新的设置密钥，旧密钥及其所有副本都会失效。同时生成一组新的备用码并检查已登录的设备；如果手机可能落入他人之手，也请修改密码。',
            '新的设置密钥和备用码要像密码一样妥善保管，并与运行验证器的手机分开存放。'
          ],
          steps: [
            '设置时就把密钥或设置二维码保存到密码管理器或加密存储中，不要放在聊天记录或共享文件夹里。',
            '下载或打印备用码，与手机分开保存。',
            '在服务允许时再添加一种验证方式，例如安全密钥，或另一个保存了同一密钥的验证器。',
            '重置、以旧换新或更换手机之前，先转移验证器中的账号，并确认在新设备上可以正常使用。',
            '及时更新辅助邮箱和手机号。',
            '每隔几个月，确认保存的密钥生成的验证码仍与验证器一致。'
          ]
        }
      ],
      sources: [
        {
          title: 'Google：解决两步验证的常见问题',
          url: 'https://support.google.com/accounts/answer/185834?hl=en'
        },
        {
          title: 'Microsoft：Microsoft 账户恢复表单帮助',
          url: 'https://support.microsoft.com/en-us/account-billing/help-with-the-microsoft-account-recovery-form-b19c02d1-a782-dee6-93c3-dc8113b20c42'
        },
        {
          title: 'GitHub 文档：丢失 2FA 凭据时如何恢复账号',
          url: 'https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/recovering-your-account-if-you-lose-your-2fa-credentials'
        }
      ]
    },
    {
      slug: 'microsoft-authenticator-backup',
      title: 'Microsoft Authenticator 备份',
      description:
        'Microsoft Authenticator（微软身份验证器）如何在 iPhone 和安卓手机上备份、换手机后恢复，为什么不能导出到其他应用，以及怎样重新绑定并保存新密钥。',
      sections: [
        {
          id: 'what-backup-covers',
          title: 'Microsoft Authenticator 备份能恢复什么',
          paragraphs: [
            'Microsoft Authenticator 可以把账号信息备份到云端，手机丢失或更换后再恢复。根据微软的说明，备份和恢复只能在同类设备之间进行：在 iPhone 上做的备份无法恢复到安卓手机，反过来也一样。',
            '不同账号的恢复效果并不相同。使用每 30 秒刷新一次动态验证码的第三方账号，例如 Amazon、Facebook 或 Gmail，恢复后可以直接取码；只使用验证码的微软个人账号也是如此。开启了无密码登录的微软账号，以及工作或学校账号，只会备份账号名称，恢复后需要重新登录。'
          ]
        },
        {
          id: 'iphone',
          title: '在 iPhone 上备份和恢复',
          paragraphs: [
            '在 iOS 上，微软目前的说明依靠 iCloud 完成备份，因此新 iPhone 需要登录同一个 iCloud 账号。不同 iOS 和应用版本的设置名称可能不同，找不到时请寻找功能相近的选项。'
          ],
          steps: [
            '在旧 iPhone 上开启 iCloud 云盘、iCloud 钥匙串和 iCloud 云备份。',
            '在 iCloud 设置中打开已存储到 iCloud 的应用列表，找到 Authenticator 并打开开关。',
            '换机前把 Authenticator 更新到 6.8.33 或更高版本，并至少打开一次。',
            '在新 iPhone 上开启同样的 iCloud 设置，安装 Authenticator，并按提示在需要时重新登录。',
            '如果账号没有出现，按照微软的建议，在新 iPhone 上卸载并重新安装 Authenticator。'
          ]
        },
        {
          id: 'android',
          title: '在安卓手机上备份和恢复',
          paragraphs: [
            '在安卓手机上，备份目前保存在你指定为恢复账号的微软个人账号中。微软帮助页面提到，从 2027 年 1 月起将改为通过 Google One 备份来开启，依赖任何一种方式之前，请先查看当前的官方说明。',
            '如果打开应用后看不到从备份恢复的选项，微软表示需要先移除或退出应用中的所有账号。如果无法访问恢复账号，微软客服也无法帮你恢复备份。'
          ],
          steps: [
            '打开 Authenticator，进入设置，开启云备份。',
            '选择用来保存备份的微软个人账号。',
            '在新手机上安装 Authenticator，在添加或登录任何账号之前，先选择从备份恢复。',
            '登录同一个微软个人账号，再按提示为需要进一步验证的账号重新登录。'
          ]
        },
        {
          id: 'no-export',
          title: '换到其他应用：没有导出功能',
          paragraphs: [
            '备份只能恢复到 Microsoft Authenticator。微软的帮助页面没有介绍任何把第三方账号导出为二维码、文字密钥或文件，再导入其他验证器的方法。除非今后的版本加入这样的功能，否则无法一次性把账号迁移到 Google 身份验证器、其他应用或 2fa.hot。',
            '仍然有两条路可走。如果你保存过某个服务的原始密钥或二维码，并且之后没有重置过双重验证，这个密钥在任何 TOTP 工具中都能生成有效验证码。否则，就需要趁旧应用还能用，逐个到各服务重新设置双重验证。'
          ]
        },
        {
          id: 're-enroll',
          title: '逐个重新绑定服务，并保存新密钥',
          paragraphs: [
            '重新绑定会在服务端生成新的配置密钥。大多数服务会用它替换旧密钥，确认后 Microsoft Authenticator 中对应账号的验证码就不再被接受；也有服务允许同时绑定多个验证器。请把每个新密钥保存在安全的地方，例如密码管理器，或妥善保管的离线记录。',
            '对于微软个人账号，账号安全设置中有设置其他验证器应用的选项。工作或学校账号由所在组织管理，可用的登录方式由组织决定。有些组织要求使用 Microsoft Authenticator 的通知批准，而 TOTP 工具无法完成这种批准，操作前请先咨询 IT 部门。'
          ],
          steps: [
            '趁 Microsoft Authenticator 还能正常取码，登录服务并打开安全或两步验证设置。',
            '选择更换或添加验证器应用。显示二维码时，找到手动输入密钥之类的选项，复制文字密钥。',
            '保存密钥，添加到新的验证器，再输入一组新验证码完成确认。',
            '保存新的恢复码；确认新设置可用后，再从 Microsoft Authenticator 删除旧记录。'
          ]
        },
        {
          id: 'use-2fa-hot',
          title: '用 2fa.hot 根据新密钥取码',
          paragraphs: [
            '拿到密钥后，可以把 Base32 密钥或 otpauth:// 链接粘贴到 2fa.hot，也可以通过选择文件、拖放或摄像头导入二维码图片。支持 SHA-1、SHA-256、SHA-512 算法，以及 6 位或 8 位的 TOTP 验证码。批量模式一次最多处理 100 条，能识别从 Excel 复制的表格和混杂的文本，无需注册账号。',
            '验证码在浏览器中计算，密钥不会发送到服务器。本地历史默认关闭，可以设置密码加密，但它不会同步，也不能代替备份，所以请把密钥本身保存在安全的地方。2fa.hot 以 AGPL-3.0 协议开源，与微软没有关联。'
          ]
        }
      ],
      sources: [
        {
          title: '微软：在 Microsoft Authenticator 中备份账号',
          url: 'https://support.microsoft.com/en-us/authenticator/back-up-your-accounts-in-microsoft-authenticator'
        },
        {
          title: '微软：从 Microsoft Authenticator 恢复账号凭据',
          url: 'https://support.microsoft.com/en-us/authenticator/restore-account-credentials-from-microsoft-authenticator'
        },
        {
          title: '微软：如何将账号添加到 Microsoft Authenticator',
          url: 'https://support.microsoft.com/en-us/authenticator/how-to-add-your-accounts-to-microsoft-authenticator'
        }
      ]
    }
  ]
}
